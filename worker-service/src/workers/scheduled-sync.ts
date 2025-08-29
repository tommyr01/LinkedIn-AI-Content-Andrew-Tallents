import { Worker, Job } from 'bullmq'
import { scheduledSyncQueue, syncQueueEvents, redis } from '../queue/setup'
import { linkedInSyncService } from '../services/linkedin-sync'
import { schedulerService } from '../services/scheduler'
import { syncMonitoringService } from '../services/sync-monitor'
import logger from '../lib/logger'
import type { SyncJobData, SyncJobResult } from '../types'

export default class ScheduledSyncWorker {
  private worker: Worker | null = null
  private isRunning = false

  constructor() {
    logger.info('Scheduled sync worker initialized')
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Scheduled sync worker is already running')
      return
    }

    try {
      logger.info('Starting scheduled sync worker...')

      this.worker = new Worker(
        'scheduled-sync',
        this.processJob.bind(this),
        {
          connection: redis,
          concurrency: 1, // Process sync jobs one at a time to avoid overwhelming APIs
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
          // Handle stalled jobs (jobs that don't report progress for too long)
          stalledInterval: 30 * 1000, // 30 seconds
          maxStalledCount: 1
        }
      )

      this.setupEventListeners()
      this.isRunning = true

      logger.info('Scheduled sync worker started successfully')

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to start scheduled sync worker')
      throw error
    }
  }

  private setupEventListeners() {
    if (!this.worker) return

    this.worker.on('ready', () => {
      logger.info('Scheduled sync worker ready to process jobs')
    })

    this.worker.on('error', (error) => {
      logger.error({
        error: error.message
      }, 'Scheduled sync worker error')
    })

    this.worker.on('stalled', (jobId, prev) => {
      logger.warn({
        jobId,
        prev
      }, 'Scheduled sync job stalled')
    })

    this.worker.on('completed', (job, result: SyncJobResult) => {
      logger.info({
        jobId: job.id,
        jobName: job.name,
        duration: result.duration,
        summary: result.summary
      }, 'Scheduled sync job completed')

      // Update job statistics
      if (job.name && !job.name.startsWith('manual-')) {
        schedulerService.updateJobStats(job.name, true)
      }

      // Record metrics for monitoring
      if (job.name) {
        syncMonitoringService.recordSyncResult(job.name, result)
      }
    })

    this.worker.on('failed', (job, error) => {
      logger.error({
        jobId: job?.id,
        jobName: job?.name,
        error: error.message,
        attempts: job?.attemptsMade,
        maxAttempts: job?.opts.attempts
      }, 'Scheduled sync job failed')

      // Update job statistics
      if (job?.name && !job.name.startsWith('manual-')) {
        schedulerService.updateJobStats(job.name, false, error.message)
      }

      // Record failed result for monitoring
      if (job?.name) {
        const failedResult: SyncJobResult = {
          jobId: job.id || `failed_${Date.now()}`,
          type: job.data?.type || 'unknown',
          status: 'error',
          startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : new Date().toISOString(),
          completedAt: new Date().toISOString(),
          duration: job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : 0,
          summary: {
            totalFetched: 0,
            newPosts: 0,
            updatedPosts: 0,
            errors: 1,
            pagesProcessed: 0
          },
          error: error.message
        }
        syncMonitoringService.recordSyncResult(job.name, failedResult)
      }
    })
  }

  private async processJob(job: Job<SyncJobData>): Promise<SyncJobResult> {
    const { type, username, options } = job.data
    const startTime = Date.now()

    logger.info({
      jobId: job.id,
      jobName: job.name,
      type,
      username,
      options,
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts
    }, 'Processing scheduled sync job')

    try {
      // Update job progress
      await job.updateProgress(10)

      let result: SyncJobResult

      switch (type) {
        case 'linkedin_posts_sync':
          result = await this.processLinkedInSync(job, username || 'andrewtallents', options)
          break
          
        case 'voice_learning_analysis':
          result = await this.processVoiceLearningAnalysis(job, username || 'andrewtallents', options)
          break
          
        default:
          throw new Error(`Unknown sync job type: ${type}`)
      }

      // Final progress update
      await job.updateProgress(100)

      logger.info({
        jobId: job.id,
        jobName: job.name,
        type,
        duration: Date.now() - startTime,
        status: result.status
      }, 'Scheduled sync job processed successfully')

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      logger.error({
        jobId: job.id,
        jobName: job.name,
        type,
        username,
        duration: Date.now() - startTime,
        error: errorMessage,
        attempt: job.attemptsMade + 1
      }, 'Scheduled sync job failed')

      // Create error result
      const errorResult: SyncJobResult = {
        jobId: job.id || `error_${Date.now()}`,
        type,
        status: 'error',
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        summary: {
          totalFetched: 0,
          newPosts: 0,
          updatedPosts: 0,
          errors: 1,
          pagesProcessed: 0
        },
        error: errorMessage
      }

      throw new Error(errorMessage) // Re-throw to trigger BullMQ retry logic
    }
  }

  private async processLinkedInSync(
    job: Job<SyncJobData>, 
    username: string, 
    options?: SyncJobData['options']
  ): Promise<SyncJobResult> {
    
    logger.info({
      jobId: job.id,
      username,
      options
    }, 'Starting LinkedIn posts sync')

    // Update progress
    await job.updateProgress(25)

    // Check service health first
    const isHealthy = await linkedInSyncService.healthCheck()
    if (!isHealthy) {
      logger.warn({
        jobId: job.id,
        username
      }, 'LinkedIn sync service health check failed, proceeding anyway')
    }

    await job.updateProgress(50)

    // Perform the actual sync
    const result = await linkedInSyncService.syncPosts(username, {
      maxPages: options?.maxPages || 3,
      pageNumber: options?.pageNumber || 1,
      triggerVoiceAnalysis: options?.triggerVoiceAnalysis ?? true
    })

    await job.updateProgress(90)

    logger.info({
      jobId: job.id,
      username,
      result: {
        status: result.status,
        summary: result.summary
      }
    }, 'LinkedIn posts sync completed')

    return result
  }

  private async processVoiceLearningAnalysis(
    job: Job<SyncJobData>, 
    username: string, 
    options?: SyncJobData['options']
  ): Promise<SyncJobResult> {
    
    logger.info({
      jobId: job.id,
      username,
      options
    }, 'Starting voice learning analysis')

    const startTime = Date.now()
    await job.updateProgress(25)

    try {
      // This would call the voice learning analysis endpoint
      // For now, we'll simulate the analysis
      logger.info({
        jobId: job.id,
        username
      }, 'Voice learning analysis would run here')

      await job.updateProgress(75)

      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 2000))

      await job.updateProgress(90)

      const result: SyncJobResult = {
        jobId: job.id || `voice_analysis_${Date.now()}`,
        type: 'voice_learning_analysis',
        status: 'success',
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        summary: {
          // Voice analysis specific metrics could go here
        },
        details: {
          analysisType: 'voice_learning',
          username,
          processed: true
        }
      }

      logger.info({
        jobId: job.id,
        username,
        duration: result.duration
      }, 'Voice learning analysis completed')

      return result

    } catch (error) {
      logger.error({
        jobId: job.id,
        username,
        error: error instanceof Error ? error.message : String(error)
      }, 'Voice learning analysis failed')
      
      throw error
    }
  }

  async pause() {
    if (this.worker) {
      await this.worker.pause()
      logger.info('Scheduled sync worker paused')
    }
  }

  async resume() {
    if (this.worker) {
      await this.worker.resume()
      logger.info('Scheduled sync worker resumed')
    }
  }

  async stop() {
    if (!this.isRunning || !this.worker) {
      return
    }

    try {
      logger.info('Stopping scheduled sync worker...')

      await this.worker.close()
      this.worker = null
      this.isRunning = false

      logger.info('Scheduled sync worker stopped')

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Error stopping scheduled sync worker')
      throw error
    }
  }

  getWorkerState() {
    if (!this.worker) {
      return {
        isRunning: false,
        status: 'stopped'
      }
    }

    return {
      isRunning: this.isRunning,
      status: this.worker.isRunning() ? 'running' : 'paused',
      concurrency: 1
    }
  }
}