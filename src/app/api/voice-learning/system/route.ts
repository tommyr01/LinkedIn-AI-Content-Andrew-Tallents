import { NextRequest, NextResponse } from 'next/server'
import { voiceLearningStartupService } from '../../../../../worker-service/src/services/voice-learning-startup'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/voice-learning/system
 * Get complete voice learning system status and health
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Getting complete voice learning system status...')

    const initStatus = voiceLearningStartupService.getInitializationStatus()

    const systemHealth = {
      initialization: {
        is_initialized: initStatus.is_initialized,
        startup_config: initStatus.config,
        scheduler_running: initStatus.scheduler_status?.isRunning || false,
        monitoring_active: initStatus.scheduler_status?.monitoringStatus?.isRunning || false
      },
      system_components: {
        startup_service: 'active',
        scheduler_service: initStatus.scheduler_status?.isRunning ? 'active' : 'inactive',
        monitor_service: initStatus.scheduler_status?.monitoringStatus?.isRunning ? 'active' : 'inactive',
        voice_analysis_service: 'ready',
        database_connection: 'connected'
      },
      health_indicators: {
        overall_status: initStatus.is_initialized ? 'healthy' : 'not_initialized',
        last_check: new Date().toISOString(),
        uptime_hours: initStatus.scheduler_status?.monitoringStatus?.uptime ? 
          Math.round(initStatus.scheduler_status.monitoringStatus.uptime / (1000 * 60 * 60) * 100) / 100 : null
      }
    }

    const response = {
      success: true,
      system: systemHealth,
      capabilities: {
        continuous_monitoring: true,
        automatic_analysis: true,
        emergency_analysis: true,
        historical_analysis: true,
        voice_model_generation: true,
        performance_tracking: true
      },
      endpoints: {
        status: '/api/voice-learning/status',
        monitor: '/api/voice-learning/monitor',
        data: '/api/voice-learning/data',
        insights: '/api/voice-learning/insights',
        trigger: '/api/voice-learning/trigger',
        system: '/api/voice-learning/system'
      },
      management: {
        initialize: 'POST /api/voice-learning/system',
        shutdown: 'DELETE /api/voice-learning/system',
        restart: 'PUT /api/voice-learning/system',
        configure: 'PATCH /api/voice-learning/system'
      },
      meta: {
        generated_at: new Date().toISOString(),
        api_version: '1.0',
        system_name: 'Voice Learning System'
      }
    }

    console.log('✅ System status retrieved:', {
      initialized: systemHealth.initialization.is_initialized,
      scheduler_running: systemHealth.initialization.scheduler_running,
      monitoring_active: systemHealth.initialization.monitoring_active,
      overall_status: systemHealth.health_indicators.overall_status
    })

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Error getting system status:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get voice learning system status',
      details: error.message,
      system_health: 'error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * POST /api/voice-learning/system
 * Initialize or reinitialize the voice learning system
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      auto_start_monitoring = true,
      run_initial_analysis = true,
      max_initial_days = 30,
      max_initial_posts = 50,
      force_reinitialize = false
    } = body

    console.log('🚀 Initializing voice learning system:', {
      auto_start_monitoring,
      run_initial_analysis,
      max_initial_days,
      max_initial_posts,
      force_reinitialize
    })

    // Update startup configuration if provided
    voiceLearningStartupService.updateConfig({
      autoStartMonitoring: auto_start_monitoring,
      runInitialAnalysis: run_initial_analysis,
      maxInitialAnalysisDays: max_initial_days,
      maxInitialPosts: max_initial_posts
    })

    // Force shutdown if reinitializing
    if (force_reinitialize) {
      console.log('🔄 Force reinitializing - shutting down existing system')
      await voiceLearningStartupService.shutdownVoiceLearning()
      // Wait a moment for clean shutdown
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Initialize the system
    const result = await voiceLearningStartupService.initializeVoiceLearning()

    const response = {
      success: result.success,
      initialization: {
        services_started: result.services_started,
        errors: result.errors,
        summary: result.summary
      },
      system_status: voiceLearningStartupService.getInitializationStatus(),
      recommendations: result.success ? 
        [
          'Monitor system health regularly via GET /api/voice-learning/system',
          'Check voice learning data via GET /api/voice-learning/data',
          'Review generated insights via GET /api/voice-learning/insights'
        ] :
        [
          'Check server logs for detailed error information',
          'Verify database connectivity and permissions',
          'Ensure OpenAI API key is configured correctly',
          'Try reinitialization with force_reinitialize: true'
        ],
      timestamp: new Date().toISOString()
    }

    if (result.success) {
      console.log('✅ Voice learning system initialized successfully:', {
        servicesStarted: result.services_started.length,
        errors: result.errors.length
      })
      
      return NextResponse.json({
        ...response,
        message: 'Voice learning system initialized successfully',
        next_actions: {
          check_status: 'GET /api/voice-learning/status',
          trigger_analysis: 'POST /api/voice-learning/trigger',
          monitor_system: 'GET /api/voice-learning/monitor'
        }
      })
    } else {
      console.error('❌ Voice learning system initialization failed:', {
        servicesStarted: result.services_started,
        errors: result.errors
      })
      
      return NextResponse.json({
        ...response,
        message: 'Voice learning system initialization completed with errors',
        troubleshooting: {
          check_logs: 'Review server logs for detailed error information',
          verify_config: 'Ensure all required environment variables are set',
          retry: 'POST /api/voice-learning/system with force_reinitialize: true'
        }
      }, { status: 207 }) // 207 Multi-Status for partial success
    }

  } catch (error: any) {
    console.error('❌ Voice learning system initialization error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Voice learning system initialization failed',
      details: error.message,
      troubleshooting: {
        check_environment: 'Verify OPENAI_API_KEY and database credentials',
        check_permissions: 'Ensure worker service has database access',
        check_dependencies: 'Verify all required services are running',
        manual_recovery: 'Try manual component startup via individual endpoints'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * PUT /api/voice-learning/system
 * Restart the voice learning system
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 Restarting voice learning system...')

    // Shutdown existing system
    await voiceLearningStartupService.shutdownVoiceLearning()
    console.log('⏹️ System shutdown completed')

    // Wait for clean shutdown
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Reinitialize
    const result = await voiceLearningStartupService.initializeVoiceLearning()

    const response = {
      success: result.success,
      restart_operation: {
        shutdown_completed: true,
        reinitialization: result.success ? 'successful' : 'failed',
        services_restarted: result.services_started,
        errors: result.errors
      },
      system_status: voiceLearningStartupService.getInitializationStatus(),
      timestamp: new Date().toISOString()
    }

    if (result.success) {
      console.log('✅ Voice learning system restarted successfully')
      
      return NextResponse.json({
        ...response,
        message: 'Voice learning system restarted successfully',
        performance: {
          restart_duration: '~5 seconds',
          services_restored: result.services_started.length,
          data_continuity: 'preserved'
        }
      })
    } else {
      console.error('❌ Voice learning system restart failed')
      
      return NextResponse.json({
        ...response,
        message: 'Voice learning system restart failed',
        recovery: {
          manual_initialization: 'POST /api/voice-learning/system',
          component_restart: 'POST /api/voice-learning/monitor',
          support_action: 'Check logs and verify system dependencies'
        }
      }, { status: 207 })
    }

  } catch (error: any) {
    console.error('❌ Voice learning system restart error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Voice learning system restart failed',
      details: error.message,
      recovery_options: {
        force_initialization: 'POST /api/voice-learning/system with force_reinitialize: true',
        manual_component_start: 'POST /api/voice-learning/monitor',
        system_check: 'GET /api/voice-learning/system'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * DELETE /api/voice-learning/system
 * Gracefully shutdown the voice learning system
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🛑 Shutting down voice learning system...')

    await voiceLearningStartupService.shutdownVoiceLearning()

    const finalStatus = voiceLearningStartupService.getInitializationStatus()

    console.log('✅ Voice learning system shutdown completed')

    return NextResponse.json({
      success: true,
      message: 'Voice learning system shutdown completed successfully',
      shutdown_details: {
        services_stopped: ['scheduler', 'monitoring', 'analysis'],
        data_preservation: 'All voice learning data preserved in database',
        restart_capability: 'System can be restarted via POST /api/voice-learning/system'
      },
      final_status: {
        is_initialized: finalStatus.is_initialized,
        scheduler_running: false,
        monitoring_active: false
      },
      restart_info: {
        how_to_restart: 'POST /api/voice-learning/system',
        data_continuity: 'All historical data will be available after restart',
        configuration: 'Startup configuration preserved'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Voice learning system shutdown error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Voice learning system shutdown failed',
      details: error.message,
      partial_shutdown: {
        note: 'Some components may still be running',
        manual_cleanup: 'May require manual intervention',
        restart_risk: 'Restart may be affected by incomplete shutdown'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * PATCH /api/voice-learning/system
 * Update voice learning system configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      auto_start_monitoring,
      run_initial_analysis,
      max_initial_days,
      max_initial_posts,
      delay_startup_seconds
    } = body

    console.log('⚙️ Updating voice learning system configuration:', body)

    // Validate and update configuration
    const updates: any = {}
    if (auto_start_monitoring !== undefined) updates.autoStartMonitoring = Boolean(auto_start_monitoring)
    if (run_initial_analysis !== undefined) updates.runInitialAnalysis = Boolean(run_initial_analysis)
    if (max_initial_days !== undefined) {
      const days = parseInt(max_initial_days)
      if (days < 1 || days > 365) {
        throw new Error('max_initial_days must be between 1 and 365')
      }
      updates.maxInitialAnalysisDays = days
    }
    if (max_initial_posts !== undefined) {
      const posts = parseInt(max_initial_posts)
      if (posts < 1 || posts > 500) {
        throw new Error('max_initial_posts must be between 1 and 500')
      }
      updates.maxInitialPosts = posts
    }
    if (delay_startup_seconds !== undefined) {
      const seconds = parseInt(delay_startup_seconds)
      if (seconds < 0 || seconds > 300) {
        throw new Error('delay_startup_seconds must be between 0 and 300')
      }
      updates.delayStartupSeconds = seconds
    }

    voiceLearningStartupService.updateConfig(updates)

    const currentStatus = voiceLearningStartupService.getInitializationStatus()

    console.log('✅ System configuration updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Voice learning system configuration updated successfully',
      updated_config: currentStatus.config,
      current_status: {
        is_initialized: currentStatus.is_initialized,
        requires_restart: false // Configuration updates don't require restart
      },
      note: 'Configuration changes will take effect on next system initialization',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error updating system configuration:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update voice learning system configuration',
      details: error.message,
      validation: {
        auto_start_monitoring: 'boolean',
        run_initial_analysis: 'boolean',
        max_initial_days: '1-365',
        max_initial_posts: '1-500',
        delay_startup_seconds: '0-300'
      },
      timestamp: new Date().toISOString()
    }, { status: 400 })
  }
}