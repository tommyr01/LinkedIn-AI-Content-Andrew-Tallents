import logger from '../lib/logger'
import type { SyncJobResult } from '../types'

interface SyncMetrics {
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  averageDuration: number
  lastRunTime?: string
  lastSuccessTime?: string
  lastErrorTime?: string
  lastError?: string
  consecutiveFailures: number
}

interface AlertRule {
  type: 'consecutive_failures' | 'success_rate' | 'duration' | 'no_runs'
  threshold: number
  timeWindow?: number // minutes
  enabled: boolean
}

export class SyncMonitoringService {
  private metrics = new Map<string, SyncMetrics>()
  private alerts: AlertRule[] = []
  private isInitialized = false

  constructor() {
    this.setupDefaultAlerts()
    logger.info('Sync monitoring service initialized')
  }

  private setupDefaultAlerts() {
    this.alerts = [
      {
        type: 'consecutive_failures',
        threshold: 3,
        enabled: true
      },
      {
        type: 'success_rate',
        threshold: 80, // Alert if success rate drops below 80%
        timeWindow: 24 * 60, // Over 24 hours
        enabled: true
      },
      {
        type: 'duration',
        threshold: 300000, // Alert if job takes longer than 5 minutes
        enabled: true
      },
      {
        type: 'no_runs',
        threshold: 24 * 60, // Alert if no runs for 24 hours
        timeWindow: 24 * 60,
        enabled: true
      }
    ]
  }

  /**
   * Record sync job result for monitoring
   */
  recordSyncResult(jobName: string, result: SyncJobResult) {
    const metrics = this.metrics.get(jobName) || {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      averageDuration: 0,
      consecutiveFailures: 0
    }

    // Update run counts
    metrics.totalRuns++
    const wasSuccessful = result.status === 'success'

    if (wasSuccessful) {
      metrics.successfulRuns++
      metrics.consecutiveFailures = 0
      metrics.lastSuccessTime = result.completedAt
    } else {
      metrics.failedRuns++
      metrics.consecutiveFailures++
      metrics.lastErrorTime = result.completedAt
      metrics.lastError = result.error
    }

    // Update average duration
    const currentAvg = metrics.averageDuration || 0
    metrics.averageDuration = ((currentAvg * (metrics.totalRuns - 1)) + result.duration) / metrics.totalRuns

    metrics.lastRunTime = result.completedAt

    this.metrics.set(jobName, metrics)

    logger.info({
      jobName,
      result: {
        status: result.status,
        duration: result.duration,
        summary: result.summary
      },
      metrics: {
        totalRuns: metrics.totalRuns,
        successRate: Math.round((metrics.successfulRuns / metrics.totalRuns) * 100),
        consecutiveFailures: metrics.consecutiveFailures,
        averageDuration: Math.round(metrics.averageDuration)
      }
    }, 'Sync job result recorded')

    // Check for alerts
    this.checkAlerts(jobName, metrics, result)
  }

  /**
   * Check if any alert rules are triggered
   */
  private checkAlerts(jobName: string, metrics: SyncMetrics, result: SyncJobResult) {
    for (const alert of this.alerts) {
      if (!alert.enabled) continue

      let shouldAlert = false
      let alertMessage = ''

      switch (alert.type) {
        case 'consecutive_failures':
          if (metrics.consecutiveFailures >= alert.threshold) {
            shouldAlert = true
            alertMessage = `${alert.threshold} consecutive sync failures for ${jobName}`
          }
          break

        case 'success_rate':
          if (metrics.totalRuns >= 5) { // Only check after minimum runs
            const successRate = (metrics.successfulRuns / metrics.totalRuns) * 100
            if (successRate < alert.threshold) {
              shouldAlert = true
              alertMessage = `Sync success rate for ${jobName} dropped to ${Math.round(successRate)}% (threshold: ${alert.threshold}%)`
            }
          }
          break

        case 'duration':
          if (result.duration > alert.threshold) {
            shouldAlert = true
            alertMessage = `Sync job ${jobName} took ${Math.round(result.duration / 1000)}s (threshold: ${Math.round(alert.threshold / 1000)}s)`
          }
          break

        case 'no_runs':
          // This would be checked separately with a periodic task
          break
      }

      if (shouldAlert) {
        this.triggerAlert(jobName, alert.type, alertMessage, metrics)
      }
    }
  }

  /**
   * Trigger an alert (log and potentially send notifications)
   */
  private triggerAlert(jobName: string, alertType: string, message: string, metrics: SyncMetrics) {
    logger.warn({
      alertType,
      jobName,
      message,
      metrics: {
        totalRuns: metrics.totalRuns,
        successfulRuns: metrics.successfulRuns,
        failedRuns: metrics.failedRuns,
        consecutiveFailures: metrics.consecutiveFailures,
        lastError: metrics.lastError
      }
    }, 'SYNC ALERT TRIGGERED')

    // Here you could add integrations to send notifications:
    // - Email alerts
    // - Slack notifications
    // - Discord webhooks
    // - Error tracking services (Sentry, etc.)
    
    // For now, we'll just log prominently
    console.warn(`🚨 SYNC ALERT: ${message}`)
  }

  /**
   * Get metrics for a specific job
   */
  getJobMetrics(jobName: string): SyncMetrics | null {
    return this.metrics.get(jobName) || null
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, SyncMetrics> {
    const result: Record<string, SyncMetrics> = {}
    for (const [jobName, metrics] of this.metrics.entries()) {
      result[jobName] = { ...metrics }
    }
    return result
  }

  /**
   * Get health summary
   */
  getHealthSummary() {
    const allMetrics = Array.from(this.metrics.values())
    
    if (allMetrics.length === 0) {
      return {
        status: 'no_data',
        message: 'No sync jobs have run yet'
      }
    }

    // Calculate overall health
    const totalRuns = allMetrics.reduce((sum, m) => sum + m.totalRuns, 0)
    const totalSuccessful = allMetrics.reduce((sum, m) => sum + m.successfulRuns, 0)
    const overallSuccessRate = totalRuns > 0 ? (totalSuccessful / totalRuns) * 100 : 0

    // Check for any jobs with consecutive failures
    const maxConsecutiveFailures = Math.max(...allMetrics.map(m => m.consecutiveFailures))
    
    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    let issues: string[] = []

    if (maxConsecutiveFailures >= 3) {
      status = 'critical'
      issues.push(`${maxConsecutiveFailures} consecutive failures detected`)
    } else if (maxConsecutiveFailures >= 2) {
      status = 'warning'
      issues.push(`${maxConsecutiveFailures} consecutive failures detected`)
    }

    if (overallSuccessRate < 80 && totalRuns >= 5) {
      status = status === 'healthy' ? 'warning' : 'critical'
      issues.push(`Low success rate: ${Math.round(overallSuccessRate)}%`)
    }

    return {
      status,
      overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
      totalJobs: this.metrics.size,
      totalRuns,
      issues: issues.length > 0 ? issues : undefined
    }
  }

  /**
   * Reset metrics for a job (useful for testing or after fixing issues)
   */
  resetJobMetrics(jobName: string) {
    this.metrics.delete(jobName)
    logger.info({ jobName }, 'Reset sync job metrics')
  }

  /**
   * Configure alert rules
   */
  configureAlert(alertType: AlertRule['type'], enabled: boolean, threshold?: number) {
    const alert = this.alerts.find(a => a.type === alertType)
    if (alert) {
      alert.enabled = enabled
      if (threshold !== undefined) {
        alert.threshold = threshold
      }
      logger.info({
        alertType,
        enabled,
        threshold: alert.threshold
      }, 'Updated alert configuration')
    }
  }

  /**
   * Start periodic health checks (call this from main service)
   */
  startPeriodicHealthChecks() {
    // Check for stale jobs every hour
    const healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, 60 * 60 * 1000) // 1 hour

    // Cleanup interval on shutdown
    process.on('SIGTERM', () => clearInterval(healthCheckInterval))
    process.on('SIGINT', () => clearInterval(healthCheckInterval))

    logger.info('Started periodic sync health checks')
  }

  private performHealthCheck() {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000))

    for (const [jobName, metrics] of this.metrics.entries()) {
      // Check for jobs that haven't run recently
      if (metrics.lastRunTime) {
        const lastRun = new Date(metrics.lastRunTime)
        if (lastRun < twentyFourHoursAgo) {
          this.triggerAlert(
            jobName,
            'no_runs',
            `No sync runs for ${jobName} in the last 24 hours`,
            metrics
          )
        }
      }
    }
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.getAllMetrics(),
      health: this.getHealthSummary(),
      alerts: this.alerts.map(alert => ({
        type: alert.type,
        threshold: alert.threshold,
        enabled: alert.enabled
      }))
    }
  }
}

// Export singleton instance
export const syncMonitoringService = new SyncMonitoringService()