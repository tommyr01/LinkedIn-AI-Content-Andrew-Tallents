import { Job } from 'bullmq'
import { contentGenerationQueue } from './setup'
import logger from '../lib/logger'
import type { JobData } from '../types'

export class ContentGenerationJobs {
  static async addJob(data: JobData, options?: {
    priority?: number
    delay?: number
    jobId?: string
  }) {
    try {
      const job = await contentGenerationQueue.add(
        'generate-content',
        data,
        {
          priority: options?.priority || 0,
          delay: options?.delay || 0,
          jobId: options?.jobId
        }
      )
      
      logger.info({ 
        jobId: job.id, 
        topic: data.topic, 
        platform: data.platform 
      }, 'Content generation job added to queue')
      
      return job
    } catch (error) {
      logger.error({ error, data }, 'Failed to add job to queue')
      throw error
    }
  }

  static async getJob(jobId: string) {
    try {
      return await Job.fromId(contentGenerationQueue, jobId)
    } catch (error) {
      logger.error({ error, jobId }, 'Failed to retrieve job')
      return null
    }
  }

  static async getJobStatus(jobId: string) {
    try {
      const job = await this.getJob(jobId)
      if (!job) return null

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
      logger.error({ error, jobId }, 'Failed to get job status')
      return null
    }
  }

  static async removeJob(jobId: string) {
    try {
      const job = await this.getJob(jobId)
      if (job) {
        await job.remove()
        logger.info({ jobId }, 'Job removed from queue')
        return true
      }
      return false
    } catch (error) {
      logger.error({ error, jobId }, 'Failed to remove job')
      return false
    }
  }

  static async retryJob(jobId: string) {
    try {
      const job = await this.getJob(jobId)
      if (job) {
        await job.retry()
        logger.info({ jobId }, 'Job retry initiated')
        return true
      }
      return false
    } catch (error) {
      logger.error({ error, jobId }, 'Failed to retry job')
      return false
    }
  }

  static async getQueueStats() {
    try {
      const waiting = await contentGenerationQueue.getWaiting()
      const active = await contentGenerationQueue.getActive()
      const completed = await contentGenerationQueue.getCompleted()
      const failed = await contentGenerationQueue.getFailed()
      const delayed = await contentGenerationQueue.getDelayed()

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      }
    } catch (error) {
      logger.error({ error }, 'Failed to get queue stats')
      return null
    }
  }

  static async cleanQueue(options?: {
    grace?: number
    limit?: number
  }) {
    try {
      await contentGenerationQueue.clean(
        options?.grace || 24 * 60 * 60 * 1000, // 24 hours
        options?.limit || 100,
        'completed'
      )
      
      await contentGenerationQueue.clean(
        options?.grace || 24 * 60 * 60 * 1000, // 24 hours  
        options?.limit || 50,
        'failed'
      )
      
      logger.info('Queue cleanup completed')
    } catch (error) {
      logger.error({ error }, 'Failed to clean queue')
    }
  }
}

export default ContentGenerationJobs