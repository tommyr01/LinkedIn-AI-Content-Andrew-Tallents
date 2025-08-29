import { scheduledSyncQueue } from '../queue/setup'
import logger from '../lib/logger'
import type { SyncJobData, ScheduledSyncJob } from '../types'

export class SchedulerService {
  private jobs = new Map<string, ScheduledSyncJob>()
  private isInitialized = false

  constructor() {
    logger.info('Scheduler service initialized')
  }

  /**
   * Initialize the scheduler with default jobs
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Scheduler already initialized')
      return
    }

    try {
      logger.info('Initializing scheduler service...')

      // Clear any existing repeatable jobs to avoid duplicates
      await this.clearExistingJobs()

      // Set up the main LinkedIn posts sync job (twice daily)
      await this.scheduleLinkedInSync()

      // Set up voice learning analysis job (runs after sync)
      await this.scheduleVoiceLearningAnalysis()

      this.isInitialized = true
      logger.info('Scheduler service initialized successfully')

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to initialize scheduler service')
      throw error
    }
  }

  /**
   * Schedule LinkedIn posts sync to run twice daily
   */
  private async scheduleLinkedInSync() {
    const jobName = 'linkedin-posts-sync-twice-daily'
    const schedulePattern = '0 5,12 * * *' // 6 AM and 1 PM UK time (5 AM and 12 PM UTC during GMT)

    try {
      const jobData: SyncJobData = {
        type: 'linkedin_posts_sync',
        username: 'andrewtallents',
        options: {
          maxPages: 3,
          pageNumber: 1,
          triggerVoiceAnalysis: true
        }
      }

      // Add the repeatable job
      await scheduledSyncQueue.add(
        jobName,
        jobData,
        {
          repeat: {
            pattern: schedulePattern,
            tz: 'UTC' // Use UTC to avoid timezone issues
          },
          // Override default job options for sync jobs
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 30000 // 30 seconds initial delay
          },
          // Remove completed/failed jobs after some time to prevent memory bloat
          removeOnComplete: 50,
          removeOnFail: 25
        }
      )

      const scheduledJob: ScheduledSyncJob = {
        id: jobName,
        jobName,
        jobType: 'linkedin_posts_sync',
        schedulePattern,
        username: 'andrewtallents',
        isActive: true,
        runCount: 0,
        successCount: 0,
        errorCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      this.jobs.set(jobName, scheduledJob)

      logger.info({
        jobName,
        schedulePattern,
        nextRuns: 'Daily at 6:00 AM and 1:00 PM UK time (5:00 AM and 12:00 PM UTC during GMT)'
      }, 'LinkedIn posts sync scheduled successfully')

    } catch (error) {
      logger.error({
        jobName,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to schedule LinkedIn posts sync')
      throw error
    }
  }

  /**
   * Schedule voice learning analysis (runs periodically)
   */
  private async scheduleVoiceLearningAnalysis() {
    const jobName = 'voice-learning-analysis-weekly'
    const schedulePattern = '0 10 * * 0' // Sundays at 10 AM UTC (weekly analysis)

    try {
      const jobData: SyncJobData = {
        type: 'voice_learning_analysis',
        username: 'andrewtallents',
        options: {
          // Analyze last week's posts for patterns
        }
      }

      await scheduledSyncQueue.add(
        jobName,
        jobData,
        {
          repeat: {
            pattern: schedulePattern,
            tz: 'UTC'
          },
          attempts: 2, // Fewer retries for analysis jobs
          backoff: {
            type: 'exponential',
            delay: 60000 // 1 minute initial delay
          },
          removeOnComplete: 10,
          removeOnFail: 10
        }
      )

      const scheduledJob: ScheduledSyncJob = {
        id: jobName,
        jobName,
        jobType: 'voice_learning_analysis',
        schedulePattern,
        username: 'andrewtallents',
        isActive: true,
        runCount: 0,
        successCount: 0,
        errorCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      this.jobs.set(jobName, scheduledJob)

      logger.info({
        jobName,
        schedulePattern,
        nextRuns: 'Weekly on Sundays at 10:00 AM UTC'
      }, 'Voice learning analysis scheduled successfully')

    } catch (error) {
      logger.error({
        jobName,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to schedule voice learning analysis')
      throw error
    }
  }

  /**
   * Clear existing repeatable jobs to avoid duplicates
   */
  private async clearExistingJobs() {
    try {
      const repeatableJobs = await scheduledSyncQueue.getRepeatableJobs()
      
      logger.info({
        count: repeatableJobs.length
      }, 'Clearing existing repeatable jobs')

      for (const job of repeatableJobs) {
        try {
          // Try multiple methods to ensure job removal
          if (job.opts && job.opts.repeat) {
            await scheduledSyncQueue.removeRepeatable(job.name, job.opts.repeat)
          } else {
            await scheduledSyncQueue.removeRepeatable(job.name, job.opts)
          }
          logger.info({
            jobName: job.name,
            pattern: job.cron
          }, 'Removed existing repeatable job')
        } catch (removeError) {
          logger.warn({
            jobName: job.name,
            pattern: job.cron,
            error: removeError instanceof Error ? removeError.message : String(removeError)
          }, 'Failed to remove repeatable job, trying alternative method')
          
          // Alternative method: try with just the name and cron pattern
          try {
            await scheduledSyncQueue.removeRepeatable(job.name, {
              pattern: job.cron,
              tz: job.tz || 'UTC'
            })
            logger.info({
              jobName: job.name,
              pattern: job.cron
            }, 'Removed repeatable job using alternative method')
          } catch (altError) {
            logger.error({
              jobName: job.name,
              pattern: job.cron,
              error: altError instanceof Error ? altError.message : String(altError)
            }, 'Failed to remove repeatable job with all methods')
          }
        }
      }

    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : String(error)
      }, 'Error clearing existing jobs, continuing...')
    }
  }

  /**
   * Get all scheduled jobs status
   */
  async getScheduledJobs(): Promise<ScheduledSyncJob[]> {
    try {
      const repeatableJobs = await scheduledSyncQueue.getRepeatableJobs()
      
      // Update job information with actual queue data
      for (const queueJob of repeatableJobs) {
        const scheduledJob = this.jobs.get(queueJob.name)
        if (scheduledJob) {
          scheduledJob.nextRun = new Date(queueJob.next).toISOString()
          scheduledJob.updatedAt = new Date().toISOString()
        }
      }

      return Array.from(this.jobs.values())

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to get scheduled jobs')
      return []
    }
  }

  /**
   * Get scheduler statistics
   */
  async getStats() {
    try {
      const waiting = await scheduledSyncQueue.getWaiting()
      const active = await scheduledSyncQueue.getActive()
      const completed = await scheduledSyncQueue.getCompleted()
      const failed = await scheduledSyncQueue.getFailed()
      const repeatableJobs = await scheduledSyncQueue.getRepeatableJobs()

      return {
        queues: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length
        },
        scheduledJobs: {
          total: this.jobs.size,
          repeatable: repeatableJobs.length,
          active: Array.from(this.jobs.values()).filter(job => job.isActive).length
        },
        nextRuns: repeatableJobs.map(job => ({
          name: job.name,
          nextRun: new Date(job.next).toISOString(),
          pattern: job.cron
        }))
      }

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to get scheduler stats')
      
      return {
        queues: { waiting: 0, active: 0, completed: 0, failed: 0 },
        scheduledJobs: { total: 0, repeatable: 0, active: 0 },
        nextRuns: [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Manually trigger a sync job (for testing/debugging)
   */
  async triggerManualSync(username = 'andrewtallents', type: 'linkedin_posts_sync' | 'voice_learning_analysis' = 'linkedin_posts_sync') {
    try {
      const jobData: SyncJobData = {
        type,
        username,
        options: {
          maxPages: 2, // Smaller for manual triggers
          pageNumber: 1,
          triggerVoiceAnalysis: type === 'linkedin_posts_sync'
        }
      }

      const job = await scheduledSyncQueue.add(
        `manual-${type}-${Date.now()}`,
        jobData,
        {
          attempts: 2,
          removeOnComplete: 10,
          removeOnFail: 10
        }
      )

      logger.info({
        jobId: job.id,
        type,
        username
      }, 'Manual sync job triggered')

      return { jobId: job.id, type, username }

    } catch (error) {
      logger.error({
        type,
        username,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to trigger manual sync')
      
      throw error
    }
  }

  /**
   * Update job statistics (called by worker when jobs complete)
   */
  updateJobStats(jobName: string, success: boolean, error?: string) {
    const job = this.jobs.get(jobName)
    if (job) {
      job.runCount++
      job.updatedAt = new Date().toISOString()
      
      if (success) {
        job.successCount++
        job.lastSuccess = new Date().toISOString()
        // Clear last error on success
        delete job.lastError
      } else {
        job.errorCount++
        job.lastError = error || 'Unknown error'
      }

      this.jobs.set(jobName, job)
    }
  }

  /**
   * Pause/resume a scheduled job
   */
  async pauseJob(jobName: string, pause: boolean) {
    try {
      const job = this.jobs.get(jobName)
      if (!job) {
        throw new Error(`Job ${jobName} not found`)
      }

      job.isActive = !pause
      job.updatedAt = new Date().toISOString()
      this.jobs.set(jobName, job)

      if (pause) {
        // Remove the repeatable job
        const repeatableJobs = await scheduledSyncQueue.getRepeatableJobs()
        const targetJob = repeatableJobs.find(rJob => rJob.name === jobName)
        if (targetJob) {
          await scheduledSyncQueue.removeRepeatable(targetJob.name, targetJob.opts)
        }
      } else {
        // Re-add the repeatable job
        // This would require storing the original job options
        logger.warn({
          jobName
        }, 'Resume functionality needs to re-implement job scheduling')
      }

      logger.info({
        jobName,
        paused: pause
      }, pause ? 'Job paused' : 'Job resumed')

    } catch (error) {
      logger.error({
        jobName,
        pause,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to pause/resume job')
      
      throw error
    }
  }

  /**
   * Shutdown the scheduler
   */
  async shutdown() {
    try {
      logger.info('Shutting down scheduler service...')
      
      // Clear all repeatable jobs
      await this.clearExistingJobs()
      
      this.jobs.clear()
      this.isInitialized = false
      
      logger.info('Scheduler service shut down successfully')

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Error during scheduler shutdown')
    }
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService()