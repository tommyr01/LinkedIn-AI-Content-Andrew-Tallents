import { Queue, Worker, QueueEvents } from 'bullmq'
import Redis from 'ioredis'
import { appConfig } from '../config'
import logger from '../lib/logger'
import type { JobData } from '../types'

// Parse Redis URL to extract components
function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url)
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || parsed.username,
    }
  } catch {
    return null
  }
}

// Detect deployment environment
const isRailway = process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_NAME
const isProduction = appConfig.environment === 'production'

// Create Redis connection optimized for deployment environment
function createRedisConnection() {
  const parsed = parseRedisUrl(appConfig.redis.url)
  
  // Base configuration for Upstash Redis
  const baseConfig = {
    tls: {}, // Enable TLS for Upstash
    enableReadyCheck: false,
    lazyConnect: false, // Connect immediately for health checks
    maxRetriesPerRequest: 10, // Reduce from default 20 to avoid debug test failures
    keyPrefix: '',
    db: 0
  }
  
  // Environment-specific optimizations
  const envConfig = isRailway ? {
    // Railway-specific optimizations for their network
    connectTimeout: 45000, // Longer timeout for Railway
    commandTimeout: 90000, // Very long timeout for Railway network conditions
    retryStrategy: (times: number) => {
      if (times > 6) return null // More retries for Railway
      return Math.min(times * 3000, 15000) // Progressive delays
    },
    keepAlive: 60000, // Longer keepalive
    family: 4, // Force IPv4
    maxMemoryPolicy: 'allkeys-lru',
    enableOfflineQueue: false,
    retryDelayOnFailover: 3000,
    // Additional Railway stability settings
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true
  } : {
    // Default/Vercel optimizations
    connectTimeout: 15000,
    commandTimeout: 30000,
    retryStrategy: (times: number) => {
      if (times > 3) return null
      return Math.min(times * 1000, 3000)
    },
    keepAlive: 30000,
    family: 4
  }
  
  const finalConfig = { ...baseConfig, ...envConfig }
  
  // Log environment-specific configuration
  const sanitizedUrl = appConfig.redis.url.replace(/:\/\/.*@/, '://***:***@')
  logger.info({
    environment: isRailway ? 'Railway' : 'Default',
    url: sanitizedUrl,
    host: parsed?.host,
    port: parsed?.port,
    hasPassword: !!parsed?.password,
    commandTimeout: finalConfig.commandTimeout,
    connectTimeout: finalConfig.connectTimeout,
    lazyConnect: finalConfig.lazyConnect,
    tls: !!finalConfig.tls
  }, 'Redis connection configuration')
  
  let redisInstance: Redis
  
  if (parsed) {
    redisInstance = new Redis({
      host: parsed.host,
      port: parsed.port,
      password: parsed.password,
      ...finalConfig
    })
  } else {
    // Fallback to URL format
    redisInstance = new Redis(appConfig.redis.url, finalConfig)
  }
  
  // Add detailed connection event logging
  redisInstance.on('connect', () => {
    logger.info('Redis connecting...')
  })
  
  redisInstance.on('ready', () => {
    logger.info('Redis connection ready')
  })
  
  redisInstance.on('error', (error) => {
    logger.error({ 
      error: error.message, 
      code: (error as any).code,
      errno: (error as any).errno 
    }, 'Redis connection error')
  })
  
  redisInstance.on('close', () => {
    logger.warn('Redis connection closed')
  })
  
  redisInstance.on('reconnecting', (delay: number) => {
    logger.warn({ delay }, 'Redis reconnecting after delay')
  })
  
  redisInstance.on('end', () => {
    logger.warn('Redis connection ended')
  })
  
  return redisInstance
}

export const redis = createRedisConnection()

// Queue names
export const QUEUE_NAMES = {
  CONTENT_GENERATION: 'content-generation'
} as const

// Create content generation queue
export const contentGenerationQueue = new Queue<JobData>(
  QUEUE_NAMES.CONTENT_GENERATION,
  {
    connection: redis,
    defaultJobOptions: {
      attempts: appConfig.worker.maxJobAttempts,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: { count: 50 }, // Keep last 50 completed jobs
      removeOnFail: { count: 20 } // Keep last 20 failed jobs
    }
  }
)

// Queue events for monitoring
export const queueEvents = new QueueEvents(QUEUE_NAMES.CONTENT_GENERATION, {
  connection: redis
})

// Set up queue event listeners
queueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info({ jobId, returnvalue }, 'Job completed successfully')
})

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, failedReason }, 'Job failed')
})

queueEvents.on('progress', ({ jobId, data }) => {
  logger.debug({ jobId, data }, 'Job progress update')
})

// Health check function
export const checkQueueHealth = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Wait for Redis connection to be ready
      if (redis.status !== 'ready') {
        logger.info({ status: redis.status, attempt }, 'Waiting for Redis connection...')
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
      }
      
      // Test Redis connection
      const pingResult = await redis.ping()
      logger.info({ pingResult, attempt }, 'Redis ping successful')
      
      // Test queue operations
      const waiting = await contentGenerationQueue.getWaiting()
      const active = await contentGenerationQueue.getActive()
      const completed = await contentGenerationQueue.getCompleted()
      const failed = await contentGenerationQueue.getFailed()
      
      return {
        redis: 'connected',
        queues: {
          [QUEUE_NAMES.CONTENT_GENERATION]: {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length
          }
        }
      }
    } catch (error) {
      logger.warn({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt,
        maxRetries: retries,
        redisStatus: redis.status 
      }, `Queue health check failed (attempt ${attempt}/${retries})`)
      
      // If this is the last attempt, return the error
      if (attempt === retries) {
        return {
          redis: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 3000 * attempt))
    }
  }
  
  // This should never be reached, but just in case
  return {
    redis: 'disconnected',
    error: 'Max retries exceeded'
  }
}

// Graceful shutdown
export const closeQueue = async () => {
  try {
    await queueEvents.close()
    await contentGenerationQueue.close()
    await redis.quit()
    logger.info('Queue connections closed successfully')
  } catch (error) {
    logger.error({ error }, 'Error closing queue connections')
  }
}

// Initialize queue on module load with enhanced error handling
redis.on('connect', () => {
  logger.info('Redis connected successfully')
})

redis.on('ready', () => {
  logger.info('Redis connection ready for commands')
})

redis.on('error', (error) => {
  logger.error({ error }, 'Redis connection error')
})

redis.on('reconnecting', (delay: number) => {
  logger.warn({ delay }, 'Redis reconnecting after delay')
})

redis.on('end', () => {
  logger.warn('Redis connection ended')
})

// Add connection timeout monitoring
redis.on('connecting', () => {
  logger.info('Redis connecting...')
})

// Monitor for specific timeout errors
redis.on('node error', (error, node) => {
  logger.error({ error, node }, 'Redis node error')
})

export default {
  contentGenerationQueue,
  queueEvents,
  checkQueueHealth,
  closeQueue
}