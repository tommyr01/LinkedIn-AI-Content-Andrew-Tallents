import express from 'express'
import { appConfig } from './config'
import logger from './lib/logger'
import { checkQueueHealth, closeQueue } from './queue/setup'
import ContentGenerationWorker from './workers/content-generation'
import { supabaseService } from './services/supabase'
import { debugHandler, testJobHandler } from './api/debug'
import debugRouter from './routes/debug'

class WorkerService {
  private contentWorker: ContentGenerationWorker | null = null
  private isShuttingDown = false
  private app: express.Application
  private server: any

  constructor() {
    // Setup Express server for debugging
    this.app = express()
    this.app.use(express.json())
    
    // Debug endpoints
    this.app.get('/debug', debugHandler)
    this.app.post('/debug/test-job', testJobHandler)
    this.app.use('/debug', debugRouter)
    this.app.get('/health', async (req, res) => {
      const health = await this.getStatus()
      res.json(health)
    })
  }

  async start() {
    try {
      logger.info({
        environment: appConfig.environment,
        concurrency: appConfig.worker.concurrency,
        logLevel: appConfig.logging.level
      }, 'Starting LinkedIn AI Content Worker Service')

      // Health checks
      await this.performHealthChecks()

      // Start content generation worker
      this.contentWorker = new ContentGenerationWorker()
      await this.contentWorker.start()

      // Set up graceful shutdown
      this.setupGracefulShutdown()

      // Start periodic cleanup
      this.startPeriodicCleanup()

      // Start debug server
      const port = process.env.PORT || 3001
      this.server = this.app.listen(port, () => {
        logger.info({ port }, 'Debug server started')
      })

      logger.info('Worker service started successfully')

    } catch (error) {
      logger.error({ error }, 'Failed to start worker service')
      process.exit(1)
    }
  }

  private async performHealthChecks() {
    logger.info('Performing health checks...')

    // Check Redis/Queue health
    const queueHealth = await checkQueueHealth()
    if (queueHealth.redis !== 'connected') {
      throw new Error(`Queue health check failed: ${queueHealth.error}`)
    }
    logger.info({ queueHealth }, 'Queue health check passed')

    // Check Supabase connection
    try {
      const cacheStats = await supabaseService.getCacheStats()
      logger.info({ cacheStats }, 'Supabase connection healthy')
    } catch (error) {
      logger.warn({ error }, 'Supabase health check failed, but continuing')
    }

    logger.info('All health checks completed')
  }

  private setupGracefulShutdown() {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        logger.warn('Shutdown already in progress, forcing exit')
        process.exit(1)
      }

      this.isShuttingDown = true
      logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown')

      try {
        // Stop accepting new jobs
        if (this.contentWorker) {
          await this.contentWorker.pause()
          logger.info('Worker paused, waiting for active jobs to complete')
          
          // Give active jobs time to complete (max 30 seconds)
          await new Promise(resolve => setTimeout(resolve, 30000))
          
          await this.contentWorker.stop()
          logger.info('Worker stopped')
        }

        // Close debug server
        if (this.server) {
          this.server.close()
          logger.info('Debug server closed')
        }

        // Close queue connections
        await closeQueue()
        logger.info('Queue connections closed')

        // Cleanup expired cache
        await supabaseService.cleanupExpiredCache()
        logger.info('Cache cleanup completed')

        logger.info('Graceful shutdown completed')
        process.exit(0)

      } catch (error) {
        logger.error({ error }, 'Error during shutdown')
        process.exit(1)
      }
    }

    // Listen for shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.fatal({ error }, 'Uncaught exception')
      process.exit(1)
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal({ reason, promise }, 'Unhandled promise rejection')
      process.exit(1)
    })
  }

  private startPeriodicCleanup() {
    // Run cleanup every hour
    const cleanupInterval = setInterval(async () => {
      try {
        logger.debug('Running periodic cleanup')
        
        // Cleanup expired cache
        const deletedCount = await supabaseService.cleanupExpiredCache()
        if (deletedCount > 0) {
          logger.info({ deletedCount }, 'Periodic cache cleanup completed')
        }

        // Get and log queue stats
        const queueHealth = await checkQueueHealth()
        logger.debug({ queueHealth }, 'Queue health status')

      } catch (error) {
        logger.error({ error }, 'Error during periodic cleanup')
      }
    }, 60 * 60 * 1000) // 1 hour

    // Clear interval on shutdown
    process.on('SIGTERM', () => clearInterval(cleanupInterval))
    process.on('SIGINT', () => clearInterval(cleanupInterval))
  }

  async getStatus() {
    try {
      const queueHealth = await checkQueueHealth()
      const cacheStats = await supabaseService.getCacheStats()
      const workerState = this.contentWorker?.getWorkerState() || null

      return {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        queue: queueHealth,
        cache: cacheStats,
        worker: workerState,
        environment: appConfig.environment,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      logger.error({ error }, 'Error getting service status')
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  }
}

// Create and start the service
const workerService = new WorkerService()
workerService.start().catch((error) => {
  logger.fatal({ error }, 'Failed to start worker service')
  process.exit(1)
})

export default workerService