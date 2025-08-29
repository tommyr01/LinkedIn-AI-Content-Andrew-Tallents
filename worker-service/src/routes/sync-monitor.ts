import express from 'express'
import { schedulerService } from '../services/scheduler'
import { linkedInSyncService } from '../services/linkedin-sync'
import { syncMonitoringService } from '../services/sync-monitor'
import { scheduledSyncQueue } from '../queue/setup'
import logger from '../lib/logger'

const router = express.Router()

/**
 * GET /api/sync/status - Get sync system status
 */
router.get('/status', async (req, res) => {
  try {
    const schedulerStats = await schedulerService.getStats()
    const scheduledJobs = await schedulerService.getScheduledJobs()
    
    const response = {
      status: 'operational',
      scheduler: schedulerStats,
      scheduledJobs,
      timestamp: new Date().toISOString()
    }

    res.json(response)

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Error getting sync status')
    
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /api/sync/jobs - Get sync job history
 */
router.get('/jobs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20
    const status = req.query.status as string // 'completed', 'failed', 'waiting', 'active'

    let jobs: any[] = []

    switch (status) {
      case 'completed':
        jobs = await scheduledSyncQueue.getCompleted(0, limit - 1)
        break
      case 'failed':
        jobs = await scheduledSyncQueue.getFailed(0, limit - 1)
        break
      case 'waiting':
        jobs = await scheduledSyncQueue.getWaiting(0, limit - 1)
        break
      case 'active':
        jobs = await scheduledSyncQueue.getActive(0, limit - 1)
        break
      default:
        // Get all job types
        const [completed, failed, waiting, active] = await Promise.all([
          scheduledSyncQueue.getCompleted(0, 4),
          scheduledSyncQueue.getFailed(0, 4),
          scheduledSyncQueue.getWaiting(0, 4),
          scheduledSyncQueue.getActive(0, 4)
        ])
        jobs = [
          ...completed.map(job => ({ ...job, status: 'completed' })),
          ...failed.map(job => ({ ...job, status: 'failed' })),
          ...waiting.map(job => ({ ...job, status: 'waiting' })),
          ...active.map(job => ({ ...job, status: 'active' }))
        ]
        break
    }

    const formattedJobs = jobs.map(job => ({
      id: job.id,
      name: job.name,
      data: job.data,
      status: status || 'completed',
      progress: job.progress || 0,
      attempts: job.attemptsMade || 0,
      maxAttempts: job.opts?.attempts || 0,
      createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : null,
      processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      failedReason: job.failedReason || null,
      returnValue: job.returnvalue || null
    }))

    res.json({
      jobs: formattedJobs,
      total: jobs.length,
      filter: { status, limit },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Error getting sync jobs')
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * POST /api/sync/trigger - Manually trigger a sync job
 */
router.post('/trigger', async (req, res) => {
  try {
    const { type = 'linkedin_posts_sync', username = 'andrewtallents' } = req.body

    if (!['linkedin_posts_sync', 'voice_learning_analysis'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid sync type. Must be "linkedin_posts_sync" or "voice_learning_analysis"',
        validTypes: ['linkedin_posts_sync', 'voice_learning_analysis']
      })
    }

    const result = await schedulerService.triggerManualSync(username, type as any)

    logger.info({
      ...result,
      triggeredBy: 'manual_request'
    }, 'Manual sync job triggered')

    res.json({
      success: true,
      message: `${type} job triggered successfully`,
      job: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      body: req.body
    }, 'Error triggering manual sync')
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /api/sync/health - Health check for sync services
 */
router.get('/health', async (req, res) => {
  try {
    const linkedInHealthy = await linkedInSyncService.healthCheck()
    const schedulerStats = await schedulerService.getStats()
    
    // Check if scheduler has any errors
    const schedulerHealthy = !schedulerStats.error

    // Get queue health
    const waiting = await scheduledSyncQueue.getWaiting()
    const active = await scheduledSyncQueue.getActive()
    const failed = await scheduledSyncQueue.getFailed()

    const overallHealth = linkedInHealthy && schedulerHealthy

    const healthCheck = {
      status: overallHealth ? 'healthy' : 'unhealthy',
      services: {
        linkedin: {
          status: linkedInHealthy ? 'healthy' : 'unhealthy'
        },
        scheduler: {
          status: schedulerHealthy ? 'healthy' : 'unhealthy',
          error: schedulerStats.error
        }
      },
      queues: {
        waiting: waiting.length,
        active: active.length,
        failed: failed.length
      },
      timestamp: new Date().toISOString()
    }

    const statusCode = overallHealth ? 200 : 503
    res.status(statusCode).json(healthCheck)

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Error checking sync health')
    
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /api/sync/stats - Get detailed sync statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const timeframe = req.query.timeframe as string || '24h'
    
    // Get basic queue stats
    const [waiting, active, completed, failed] = await Promise.all([
      scheduledSyncQueue.getWaiting(),
      scheduledSyncQueue.getActive(),
      scheduledSyncQueue.getCompleted(0, 100), // Last 100 completed
      scheduledSyncQueue.getFailed(0, 50) // Last 50 failed
    ])

    // Calculate success rate from recent jobs
    const totalRecent = completed.length + failed.length
    const successRate = totalRecent > 0 ? (completed.length / totalRecent) * 100 : 0

    // Get scheduler information
    const schedulerStats = await schedulerService.getStats()
    const scheduledJobs = await schedulerService.getScheduledJobs()

    // Calculate average job duration from completed jobs
    const durations = completed
      .filter((job: any) => job.returnvalue?.duration)
      .map((job: any) => job.returnvalue.duration)
    
    const avgDuration = durations.length > 0 
      ? durations.reduce((sum: number, duration: number) => sum + duration, 0) / durations.length 
      : 0

    // Group failed jobs by error type
    const failureReasons = failed.reduce((acc: any, job: any) => {
      const reason = job.failedReason || 'Unknown error'
      acc[reason] = (acc[reason] || 0) + 1
      return acc
    }, {})

    const stats = {
      overview: {
        successRate: Math.round(successRate * 100) / 100,
        avgJobDuration: Math.round(avgDuration),
        totalJobsProcessed: totalRecent
      },
      queues: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      },
      scheduler: schedulerStats,
      scheduledJobs: scheduledJobs.map(job => ({
        name: job.jobName,
        type: job.jobType,
        isActive: job.isActive,
        runCount: job.runCount,
        successCount: job.successCount,
        errorCount: job.errorCount,
        lastRun: job.lastRun,
        nextRun: job.nextRun
      })),
      recentFailures: {
        total: failed.length,
        reasons: failureReasons
      },
      timeframe,
      generatedAt: new Date().toISOString()
    }

    res.json(stats)

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Error getting sync stats')
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /api/sync/next-runs - Get upcoming scheduled job runs
 */
router.get('/next-runs', async (req, res) => {
  try {
    const repeatableJobs = await scheduledSyncQueue.getRepeatableJobs()
    
    const nextRuns = repeatableJobs.map(job => ({
      name: job.name,
      pattern: job.cron,
      nextRun: new Date(job.next).toISOString(),
      timezone: job.tz || 'UTC'
    })).sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime())

    res.json({
      nextRuns,
      count: nextRuns.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Error getting next runs')
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /api/sync/metrics - Get detailed sync metrics and monitoring data
 */
router.get('/metrics', async (req, res) => {
  try {
    const jobName = req.query.job as string
    
    if (jobName) {
      // Get metrics for specific job
      const metrics = syncMonitoringService.getJobMetrics(jobName)
      if (!metrics) {
        return res.status(404).json({
          error: `No metrics found for job: ${jobName}`,
          timestamp: new Date().toISOString()
        })
      }
      
      res.json({
        jobName,
        metrics,
        timestamp: new Date().toISOString()
      })
    } else {
      // Get all metrics
      const allMetrics = syncMonitoringService.getAllMetrics()
      const healthSummary = syncMonitoringService.getHealthSummary()
      
      res.json({
        health: healthSummary,
        jobMetrics: allMetrics,
        exportData: syncMonitoringService.exportMetrics(),
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Error getting sync metrics')
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /api/sync/alerts - Get alert configuration and history
 */
router.get('/alerts', async (req, res) => {
  try {
    const exportData = syncMonitoringService.exportMetrics()
    
    res.json({
      alerts: exportData.alerts,
      health: exportData.health,
      recommendedActions: generateRecommendedActions(exportData.health),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Error getting sync alerts')
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * POST /api/sync/alerts/config - Configure alert rules
 */
router.post('/alerts/config', async (req, res) => {
  try {
    const { alertType, enabled, threshold } = req.body

    const validTypes = ['consecutive_failures', 'success_rate', 'duration', 'no_runs']
    if (!validTypes.includes(alertType)) {
      return res.status(400).json({
        error: `Invalid alert type. Must be one of: ${validTypes.join(', ')}`,
        validTypes
      })
    }

    syncMonitoringService.configureAlert(alertType, enabled, threshold)

    res.json({
      success: true,
      message: `Alert configuration updated for ${alertType}`,
      config: { alertType, enabled, threshold },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      body: req.body
    }, 'Error configuring alerts')
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * POST /api/sync/scheduler/restart - Restart the scheduler service with updated configuration
 */
router.post('/scheduler/restart', async (req, res) => {
  try {
    logger.info('Restarting scheduler service to apply configuration changes')
    
    // Shutdown existing scheduler
    await schedulerService.shutdown()
    logger.info('Scheduler shutdown completed')
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Reinitialize with new configuration
    await schedulerService.initialize()
    logger.info('Scheduler reinitialized successfully')
    
    // Get updated stats
    const schedulerStats = await schedulerService.getStats()
    const scheduledJobs = await schedulerService.getScheduledJobs()

    res.json({
      success: true,
      message: 'Scheduler service restarted successfully',
      scheduler: schedulerStats,
      scheduledJobs,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Error restarting scheduler service')
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * POST /api/sync/metrics/reset - Reset metrics for a specific job
 */
router.post('/metrics/reset', async (req, res) => {
  try {
    const { jobName } = req.body

    if (!jobName) {
      return res.status(400).json({
        error: 'jobName is required',
        timestamp: new Date().toISOString()
      })
    }

    syncMonitoringService.resetJobMetrics(jobName)

    logger.info({
      jobName,
      resetBy: 'api_request'
    }, 'Reset sync job metrics')

    res.json({
      success: true,
      message: `Metrics reset for job: ${jobName}`,
      jobName,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      body: req.body
    }, 'Error resetting metrics')
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * Generate recommended actions based on health status
 */
function generateRecommendedActions(health: any): string[] {
  const actions: string[] = []

  if (health.status === 'critical') {
    actions.push('🚨 Immediate attention required')
    if (health.issues?.some((issue: string) => issue.includes('consecutive failures'))) {
      actions.push('Check LinkedIn API credentials and rate limits')
      actions.push('Review recent error logs for sync failures')
      actions.push('Consider temporarily disabling automatic sync')
    }
    if (health.issues?.some((issue: string) => issue.includes('success rate'))) {
      actions.push('Investigate root cause of sync failures')
      actions.push('Check network connectivity and API availability')
    }
  } else if (health.status === 'warning') {
    actions.push('⚠️ Monitor closely')
    actions.push('Review recent sync job logs')
    actions.push('Check API rate limits and quotas')
  } else if (health.status === 'healthy') {
    actions.push('✅ System operating normally')
    actions.push('Continue monitoring sync performance')
  } else if (health.status === 'no_data') {
    actions.push('ℹ️ No sync jobs have run yet')
    actions.push('Trigger a manual sync to test the system')
    actions.push('Verify scheduler is running correctly')
  }

  return actions
}

export default router