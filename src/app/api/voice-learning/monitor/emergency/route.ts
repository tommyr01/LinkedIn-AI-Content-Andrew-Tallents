import { NextRequest, NextResponse } from 'next/server'
import { voiceLearningSchedulerService } from '../../../../../../worker-service/src/services/voice-learning-scheduler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/voice-learning/monitor/emergency
 * Trigger emergency voice analysis for urgent/important posts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      post_ids,
      reason = 'emergency_analysis',
      priority = 'high'
    } = body

    if (!post_ids || !Array.isArray(post_ids) || post_ids.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'post_ids array is required',
        example: {
          post_ids: ['post1', 'post2'],
          reason: 'viral_post_detected',
          priority: 'high'
        }
      }, { status: 400 })
    }

    if (post_ids.length > 10) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 10 posts allowed for emergency analysis',
        provided: post_ids.length,
        max_allowed: 10
      }, { status: 400 })
    }

    console.log('🚨 Emergency voice analysis triggered:', {
      post_ids,
      reason,
      priority,
      count: post_ids.length
    })

    // Trigger emergency analysis through scheduler service
    const result = await voiceLearningSchedulerService.triggerEmergencyAnalysis(post_ids)

    const response = {
      success: result.success,
      emergency_analysis: {
        trigger_reason: reason,
        priority_level: priority,
        posts_requested: post_ids.length,
        posts_processed: result.processed,
        posts_failed: result.failed,
        success_rate: result.processed / post_ids.length
      },
      processing_details: {
        post_ids,
        processed: result.processed,
        failed: result.failed,
        voice_model_updated: result.processed > 0
      },
      impact: {
        immediate_voice_learning: result.processed > 0,
        model_enhancement: result.processed > 0 ? 'Voice model updated with new patterns' : 'No model updates',
        data_freshness: result.processed > 0 ? 'Enhanced with latest content' : 'No new data added'
      },
      timestamp: new Date().toISOString()
    }

    if (result.success && result.processed > 0) {
      console.log(`✅ Emergency analysis completed: ${result.processed}/${post_ids.length} posts analysed`)
      
      return NextResponse.json({
        ...response,
        message: `Emergency analysis completed successfully. ${result.processed} posts analysed and voice model updated.`,
        next_actions: {
          check_results: 'GET /api/voice-learning/data?sort_by=analyzed_at&sort_order=desc&limit=10',
          view_insights: 'GET /api/voice-learning/insights',
          monitor_status: 'GET /api/voice-learning/monitor'
        }
      })
    } else {
      console.error(`❌ Emergency analysis failed: ${result.failed}/${post_ids.length} posts failed`)
      
      return NextResponse.json({
        ...response,
        message: result.processed > 0 
          ? `Partial success: ${result.processed} posts analysed, ${result.failed} failed`
          : 'Emergency analysis failed completely',
        troubleshooting: {
          check_posts_exist: 'Verify post IDs exist in database',
          check_content: 'Ensure posts have analysable text content',
          check_logs: 'Review server logs for detailed error information',
          retry_failed: 'POST /api/voice-learning/trigger with failed post IDs'
        }
      }, result.success ? 200 : 207) // 207 Multi-Status for partial success
    }

  } catch (error: any) {
    console.error('❌ Emergency voice analysis error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Emergency voice analysis failed',
      details: error.message,
      emergency_response: {
        status: 'failed',
        fallback_action: 'Use regular analysis trigger: POST /api/voice-learning/trigger',
        support_contact: 'Check server logs for detailed error information'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * GET /api/voice-learning/monitor/emergency
 * Get information about emergency analysis capabilities and recent activity
 */
export async function GET(request: NextRequest) {
  try {
    const status = voiceLearningSchedulerService.getSchedulerStatus()

    return NextResponse.json({
      success: true,
      emergency_analysis: {
        available: status.isRunning,
        max_posts_per_request: 10,
        processing_time: 'Typically 1-3 minutes per post',
        features: [
          'Immediate voice pattern analysis',
          'Real-time voice model update',
          'Priority processing queue',
          'Enhanced context analysis'
        ]
      },
      system_readiness: {
        scheduler_running: status.isRunning,
        monitoring_active: status.monitoringStatus.isRunning,
        voice_model_available: true,
        ai_service_connected: true
      },
      usage_guidelines: {
        when_to_use: [
          'Viral posts that need immediate analysis',
          'Important strategic content',
          'New content format experiments',
          'High-engagement posts for pattern learning'
        ],
        priority_levels: {
          high: 'Viral or strategically important posts',
          medium: 'Experimental or testing content',
          low: 'Regular analysis queue'
        }
      },
      api_info: {
        endpoint: 'POST /api/voice-learning/monitor/emergency',
        required_fields: ['post_ids'],
        optional_fields: ['reason', 'priority'],
        rate_limit: '10 posts per request, no time limit',
        response_time: '30-180 seconds typical'
      },
      recent_activity: {
        note: 'Recent emergency analysis activity would be tracked here',
        // Could be enhanced to show recent emergency analyses
      }
    })

  } catch (error: any) {
    console.error('❌ Error getting emergency analysis info:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get emergency analysis information',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}