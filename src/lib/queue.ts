import { Queue } from 'bullmq'
import Redis from 'ioredis'

// Create Redis connection for the main app
const redis = new Redis(
  `redis://default:${process.env.UPSTASH_REDIS_REST_TOKEN}@solid-bobcat-5524.upstash.io:6379`,
  {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true
  }
)

// Content generation queue (matches worker queue name)
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
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 }
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
    try {
      const job = await contentGenerationQueue.add('generate-content', data, {
        priority: 0,
        attempts: 3
      })
      
      return {
        success: true,
        jobId: job.id,
        data: job.data
      }
    } catch (error) {
      console.error('Failed to add job to queue:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async getJobStatus(jobId: string) {
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
      console.error('Failed to get job status:', error)
      return null
    }
  }

  static async getQueueStats() {
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
      console.error('Failed to get queue stats:', error)
      return null
    }
  }
}

export default QueueService