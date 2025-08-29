import { NextRequest, NextResponse } from 'next/server'
import { voiceLearningMonitorService } from '../../../../../worker-service/src/services/voice-learning-monitor'
import { supabaseService } from '../../../../../worker-service/src/services/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/voice-learning/status
 * Get comprehensive status of the voice learning system
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Getting voice learning system status...')

    // Get monitoring service status
    const monitoringStatus = voiceLearningMonitorService.getMonitoringStatus()

    // Get database statistics
    const voiceLearningData = await supabaseService.getVoiceLearningData('post', 10)
    const recentAnalyses = voiceLearningData.slice(0, 5)

    // Calculate basic statistics
    const totalAnalyses = voiceLearningData.length
    const avgAuthenticity = totalAnalyses > 0 
      ? Math.round(voiceLearningData.reduce((sum, d) => sum + (d.authenticity_score || 0), 0) / totalAnalyses)
      : 0
    const avgAuthority = totalAnalyses > 0
      ? Math.round(voiceLearningData.reduce((sum, d) => sum + (d.authority_score || 0), 0) / totalAnalyses)
      : 0
    const avgVulnerability = totalAnalyses > 0
      ? Math.round(voiceLearningData.reduce((sum, d) => sum + (d.vulnerability_score || 0), 0) / totalAnalyses)
      : 0

    // Get tone distribution
    const toneDistribution: { [key: string]: number } = {}
    voiceLearningData.forEach(d => {
      const tone = d.tone_analysis?.primary_tone || 'unknown'
      toneDistribution[tone] = (toneDistribution[tone] || 0) + 1
    })

    // Get recent activity timestamp
    const lastAnalysis = recentAnalyses.length > 0 ? recentAnalyses[0].analyzed_at : null

    const status = {
      monitoring: {
        is_running: monitoringStatus.isRunning,
        last_checked: monitoringStatus.lastCheckedTimestamp,
        check_interval_seconds: Math.round(monitoringStatus.checkInterval / 1000),
        uptime_hours: monitoringStatus.uptime 
          ? Math.round(monitoringStatus.uptime / (1000 * 60 * 60) * 100) / 100
          : null
      },
      database: {
        total_analyses: totalAnalyses,
        last_analysis: lastAnalysis,
        data_available: totalAnalyses > 0
      },
      voice_insights: {
        avg_authenticity_score: avgAuthenticity,
        avg_authority_score: avgAuthority,
        avg_vulnerability_score: avgVulnerability,
        tone_distribution: toneDistribution,
        most_common_tone: Object.keys(toneDistribution).reduce((a, b) => 
          toneDistribution[a] > toneDistribution[b] ? a : b, 'conversational'
        )
      },
      recent_activity: recentAnalyses.map(analysis => ({
        content_id: analysis.content_id,
        analyzed_at: analysis.analyzed_at,
        authenticity_score: analysis.authenticity_score,
        authority_score: analysis.authority_score,
        vulnerability_score: analysis.vulnerability_score,
        primary_tone: analysis.tone_analysis?.primary_tone,
        engagement_potential: analysis.engagement_potential
      })),
      system_health: {
        status: monitoringStatus.isRunning ? 'healthy' : 'stopped',
        last_error: null, // Could be enhanced to track errors
        data_freshness: lastAnalysis 
          ? Math.round((Date.now() - Date.parse(lastAnalysis)) / (1000 * 60 * 60)) // Hours since last analysis
          : null
      }
    }

    console.log('✅ Voice learning status compiled:', {
      monitoring_running: status.monitoring.is_running,
      total_analyses: status.database.total_analyses,
      avg_scores: {
        authenticity: status.voice_insights.avg_authenticity_score,
        authority: status.voice_insights.avg_authority_score,
        vulnerability: status.voice_insights.avg_vulnerability_score
      }
    })

    return NextResponse.json({
      success: true,
      status,
      meta: {
        generated_at: new Date().toISOString(),
        api_version: '1.0',
        system: 'voice_learning'
      },
      actions: {
        start_monitoring: monitoringStatus.isRunning ? null : 'POST /api/voice-learning/monitor',
        stop_monitoring: monitoringStatus.isRunning ? 'DELETE /api/voice-learning/monitor' : null,
        trigger_analysis: 'POST /api/voice-learning/trigger',
        view_data: 'GET /api/voice-learning/data',
        get_insights: 'GET /api/voice-learning/insights'
      }
    })

  } catch (error: any) {
    console.error('❌ Error getting voice learning status:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get voice learning status',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * POST /api/voice-learning/status
 * Update voice learning system status (start/stop monitoring)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action } = body

    if (!action || !['start', 'stop'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use "start" or "stop"',
        available_actions: ['start', 'stop']
      }, { status: 400 })
    }

    console.log(`🎯 ${action.toUpperCase()} voice learning monitoring...`)

    if (action === 'start') {
      await voiceLearningMonitorService.startMonitoring()
      console.log('✅ Voice learning monitoring started')
      
      return NextResponse.json({
        success: true,
        action: 'started',
        message: 'Voice learning monitoring has been started',
        status: voiceLearningMonitorService.getMonitoringStatus(),
        timestamp: new Date().toISOString()
      })
      
    } else if (action === 'stop') {
      voiceLearningMonitorService.stopMonitoring()
      console.log('⏹️ Voice learning monitoring stopped')
      
      return NextResponse.json({
        success: true,
        action: 'stopped',
        message: 'Voice learning monitoring has been stopped',
        status: voiceLearningMonitorService.getMonitoringStatus(),
        timestamp: new Date().toISOString()
      })
    }

  } catch (error: any) {
    console.error('❌ Error updating voice learning status:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update voice learning status',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}