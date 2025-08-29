import { NextRequest, NextResponse } from 'next/server'
import { voiceLearningSchedulerService } from '../../../../../worker-service/src/services/voice-learning-scheduler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/voice-learning/monitor
 * Get voice learning monitoring and scheduler status
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Getting voice learning monitor status...')

    const status = voiceLearningSchedulerService.getSchedulerStatus()

    return NextResponse.json({
      success: true,
      scheduler: {
        is_running: status.isRunning,
        configuration: status.config,
        monitoring: status.monitoringStatus,
        scheduled_tasks: {
          next_batch_analysis: status.nextBatchAnalysis,
          next_performance_update: status.nextPerformanceUpdate
        }
      },
      system_health: {
        continuous_monitoring: status.monitoringStatus.isRunning,
        last_check: status.monitoringStatus.lastCheckedTimestamp,
        uptime_hours: status.monitoringStatus.uptime ? 
          Math.round(status.monitoringStatus.uptime / (1000 * 60 * 60) * 100) / 100 : null
      },
      controls: {
        start_scheduler: status.isRunning ? null : 'POST /api/voice-learning/monitor',
        stop_scheduler: status.isRunning ? 'DELETE /api/voice-learning/monitor' : null,
        update_config: 'PUT /api/voice-learning/monitor',
        emergency_analysis: 'POST /api/voice-learning/monitor/emergency'
      },
      meta: {
        generated_at: new Date().toISOString(),
        api_version: '1.0'
      }
    })

  } catch (error: any) {
    console.error('❌ Error getting monitor status:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get monitor status',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * POST /api/voice-learning/monitor
 * Start the voice learning scheduler and monitoring system
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { 
      monitoring_enabled = true,
      monitoring_interval = 30,
      batch_analysis_interval = 6,
      performance_update_interval = 24
    } = body

    console.log('🚀 Starting voice learning scheduler with config:', {
      monitoring_enabled,
      monitoring_interval,
      batch_analysis_interval,
      performance_update_interval
    })

    // Update configuration if provided
    if (body.monitoring_enabled !== undefined || 
        body.monitoring_interval !== undefined ||
        body.batch_analysis_interval !== undefined ||
        body.performance_update_interval !== undefined) {
      
      voiceLearningSchedulerService.updateConfig({
        monitoringEnabled: monitoring_enabled,
        monitoringInterval: monitoring_interval,
        batchAnalysisInterval: batch_analysis_interval,
        performanceTierUpdateInterval: performance_update_interval
      })
    }

    // Start the scheduler
    await voiceLearningSchedulerService.startScheduler()

    const status = voiceLearningSchedulerService.getSchedulerStatus()

    console.log('✅ Voice learning scheduler started successfully')

    return NextResponse.json({
      success: true,
      message: 'Voice learning scheduler started successfully',
      scheduler: {
        is_running: status.isRunning,
        configuration: status.config,
        monitoring: status.monitoringStatus
      },
      services_started: {
        continuous_monitoring: status.monitoringStatus.isRunning,
        batch_analysis_scheduled: !!status.nextBatchAnalysis,
        performance_updates_scheduled: !!status.nextPerformanceUpdate
      },
      next_actions: {
        check_status: 'GET /api/voice-learning/monitor',
        view_data: 'GET /api/voice-learning/data',
        trigger_analysis: 'POST /api/voice-learning/trigger'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error starting voice learning scheduler:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to start voice learning scheduler',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * PUT /api/voice-learning/monitor
 * Update voice learning scheduler configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      monitoring_enabled,
      monitoring_interval,
      batch_analysis_interval,
      performance_update_interval,
      max_retries
    } = body

    console.log('⚙️ Updating voice learning scheduler configuration:', body)

    // Validate configuration
    const config: any = {}
    if (monitoring_enabled !== undefined) config.monitoringEnabled = Boolean(monitoring_enabled)
    if (monitoring_interval !== undefined) {
      const interval = parseInt(monitoring_interval)
      if (interval < 10 || interval > 300) {
        throw new Error('monitoring_interval must be between 10 and 300 seconds')
      }
      config.monitoringInterval = interval
    }
    if (batch_analysis_interval !== undefined) {
      const interval = parseInt(batch_analysis_interval)
      if (interval < 1 || interval > 72) {
        throw new Error('batch_analysis_interval must be between 1 and 72 hours')
      }
      config.batchAnalysisInterval = interval
    }
    if (performance_update_interval !== undefined) {
      const interval = parseInt(performance_update_interval)
      if (interval < 6 || interval > 168) {
        throw new Error('performance_update_interval must be between 6 and 168 hours')
      }
      config.performanceTierUpdateInterval = interval
    }
    if (max_retries !== undefined) {
      const retries = parseInt(max_retries)
      if (retries < 0 || retries > 10) {
        throw new Error('max_retries must be between 0 and 10')
      }
      config.maxRetries = retries
    }

    // Update configuration
    voiceLearningSchedulerService.updateConfig(config)

    const status = voiceLearningSchedulerService.getSchedulerStatus()

    console.log('✅ Scheduler configuration updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Scheduler configuration updated successfully',
      updated_config: status.config,
      current_status: {
        is_running: status.isRunning,
        monitoring_active: status.monitoringStatus.isRunning
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error updating scheduler configuration:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update scheduler configuration',
      details: error.message,
      validation: {
        monitoring_enabled: 'boolean',
        monitoring_interval: '10-300 seconds',
        batch_analysis_interval: '1-72 hours',
        performance_update_interval: '6-168 hours',
        max_retries: '0-10'
      },
      timestamp: new Date().toISOString()
    }, { status: 400 })
  }
}

/**
 * DELETE /api/voice-learning/monitor
 * Stop the voice learning scheduler and monitoring system
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('⏹️ Stopping voice learning scheduler...')

    voiceLearningSchedulerService.stopScheduler()

    const status = voiceLearningSchedulerService.getSchedulerStatus()

    console.log('✅ Voice learning scheduler stopped successfully')

    return NextResponse.json({
      success: true,
      message: 'Voice learning scheduler stopped successfully',
      scheduler: {
        is_running: status.isRunning,
        monitoring: status.monitoringStatus
      },
      services_stopped: {
        continuous_monitoring: !status.monitoringStatus.isRunning,
        batch_analysis: !status.nextBatchAnalysis,
        performance_updates: !status.nextPerformanceUpdate
      },
      restart_info: {
        how_to_restart: 'POST /api/voice-learning/monitor',
        note: 'Configuration will be preserved when restarted'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error stopping voice learning scheduler:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to stop voice learning scheduler',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}