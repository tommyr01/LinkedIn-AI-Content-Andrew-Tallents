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
    lazyConnect: true,
    maxRetriesPerRequest: null, // Required by BullMQ
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
  logger.info({
    environment: isRailway ? 'Railway' : 'Default',
    commandTimeout: finalConfig.commandTimeout,
    connectTimeout: finalConfig.connectTimeout
  }, 'Redis connection configuration')
  
  if (parsed) {
    return new Redis({
      host: parsed.host,
      port: parsed.port,
      password: parsed.password,
      ...finalConfig
    })
  }
  
  // Fallback to URL format
  return new Redis(appConfig.redis.url, finalConfig)
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
export const checkQueueHealth = async () => {
  try {
    await redis.ping()
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
    logger.error({ error }, 'Queue health check failed')
    return {
      redis: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
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

redis.on('reconnecting', (delay) => {
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