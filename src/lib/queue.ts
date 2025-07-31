import { Queue } from 'bullmq'
import Redis from 'ioredis'

// Create Redis connection optimized for serverless/Vercel
const redis = new Redis(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || `redis://default:${process.env.UPSTASH_REDIS_REST_TOKEN}@solid-bobcat-5524.upstash.io:6379`, {
  enableReadyCheck: false,
  lazyConnect: true,
  connectTimeout: 5000,
  commandTimeout: 5000,
  family: 4, // Force IPv4
  maxRetriesPerRequest: null, // Required by BullMQ
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