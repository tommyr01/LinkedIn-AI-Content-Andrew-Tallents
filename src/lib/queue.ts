import { Queue } from 'bullmq'
import Redis from 'ioredis'

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

// Create Redis connection optimized for Upstash/serverless
function createRedisConnection() {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL
  
  if (redisUrl) {
    const parsed = parseRedisUrl(redisUrl)
    if (parsed) {
      return new Redis({
        host: parsed.host,
        port: parsed.port,
        password: parsed.password,
        tls: {}, // Enable TLS for Upstash
        enableReadyCheck: false,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 10000,
        maxRetriesPerRequest: null, // Required by BullMQ
        retryStrategy: (times: number) => {
          if (times > 3) return null
          return Math.min(times * 1000, 3000)
        }
      })
    }
  }
  
  // Fallback for legacy format
  return new Redis({
    host: 'solid-bobcat-5524.upstash.io',
    port: 6379,
    password: process.env.UPSTASH_REDIS_REST_TOKEN,
    tls: {}, // Enable TLS for Upstash
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 10000,
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => {
      if (times > 3) return null
      return Math.min(times * 1000, 3000)
    }
  })
}

const redis = createRedisConnection()

// Handle connection errors
redis.on('error', (err) => {
  console.error('Redis connection error:', err)
})

redis.on('connect', () => {
  console.log('Redis connected successfully')
})

// Content generation queue optimized for serverless
export const contentGenerationQueue = new Queue(
  'content-generation',
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 10, // Reduced for serverless
      removeOnFail: 5, // Reduced for serverless
    },
    settings: {
      stalledInterval: 30000,
      maxStalledCount: 1
    }
  }
)

export interface JobData {
  topic: string
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram'
  voiceGuidelines?: string
  postType?: string
  tone?: string
  userId?: string
}

export class QueueService {
  static async addContentGenerationJob(data: JobData) {
    let retries = 3
    
    while (retries > 0) {
      try {
        const job = await contentGenerationQueue.add('generate-content', data, {
          priority: 0,
          attempts: 3,
          delay: retries < 3 ? 1000 * (4 - retries) : 0 // Progressive delay on retries
        })
        
        return {
          success: true,
          jobId: job.id,
          data: job.data
        }
      } catch (error) {
        retries--
        console.error(`Failed to add job to queue (${retries} retries left):`, error)
        
        if (retries === 0) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return {
      success: false,
      error: 'Max retries exceeded'
    }
  }

  static async getJobStatus(jobId: string) {
    let retries = 2
    
    while (retries > 0) {
      try {
        const job = await contentGenerationQueue.getJob(jobId)
        if (!job) {
          return null
        }

        const state = await job.getState()
        const progress = job.progress as number || 0
        
        return {
          id: job.id,
          state,
          progress,
          data: job.data,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
          returnvalue: job.returnvalue
        }
      } catch (error) {
        retries--
        console.error(`Failed to get job status (${retries} retries left):`, error)
        
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }
    
    return null
  }

  static async getQueueStats() {
    let retries = 2
    
    while (retries > 0) {
      try {
        const waiting = await contentGenerationQueue.getWaiting()
        const active = await contentGenerationQueue.getActive()
        const completed = await contentGenerationQueue.getCompleted()
        const failed = await contentGenerationQueue.getFailed()

        return {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          total: waiting.length + active.length + completed.length + failed.length
        }
      } catch (error) {
        retries--
        console.error(`Failed to get queue stats (${retries} retries left):`, error)
        
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }
    
    return null
  }
}

export default QueueService