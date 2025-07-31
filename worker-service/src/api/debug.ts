import { Request, Response } from 'express'
import { redis, contentGenerationQueue, checkQueueHealth } from '../queue/setup'
import logger from '../lib/logger'

export const debugHandler = async (req: Request, res: Response) => {
  try {
    // Test Redis connection
    const pingResult = await redis.ping()
    logger.info('Redis ping successful')

    // Get queue statistics
    const queueHealth = await checkQueueHealth()
    logger.info({ queueHealth }, 'Queue health check completed')

    // Get detailed queue info
    const waiting = await contentGenerationQueue.getWaiting()
    const active = await contentGenerationQueue.getActive()
    const completed = await contentGenerationQueue.getCompleted(0, 5)
    const failed = await contentGenerationQueue.getFailed(0, 5)

    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      redis: {
        ping: pingResult,
        connected: true
      },
      queue: {
        name: 'content-generation',
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        waitingJobs: waiting.slice(0, 3).map(job => ({
          id: job.id,
          data: job.data,
          timestamp: job.timestamp
        })),
        activeJobs: active.slice(0, 3).map(job => ({
          id: job.id,
          data: job.data,
          progress: job.progress
        }))
      },
      environment: {
        isRailway: !!(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_NAME),
        nodeVersion: process.version,
        uptime: process.uptime()
      }
    }

    res.json(response)
  } catch (error) {
    logger.error({ error }, 'Debug endpoint failed')
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}

export const testJobHandler = async (req: Request, res: Response) => {
  try {
    // Add a test job to the queue
    const testJob = await contentGenerationQueue.add('generate-content', {
      topic: 'Test topic from debug endpoint',
      platform: 'linkedin',
      postType: 'Test',
      voiceGuidelines: undefined
    })

    logger.info({ jobId: testJob.id }, 'Test job added to queue')

    res.json({
      status: 'success',
      message: 'Test job added to queue',
      jobId: testJob.id,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error({ error }, 'Failed to add test job')
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
}