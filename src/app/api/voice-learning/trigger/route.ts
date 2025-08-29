import { NextRequest, NextResponse } from 'next/server'
import { voiceLearningMonitorService } from '../../../../../worker-service/src/services/voice-learning-monitor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/voice-learning/trigger
 * Manually trigger voice analysis for specific posts or historical analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { 
      post_ids, 
      analyze_historical, 
      days_since = 30, 
      limit = 50 
    } = body

    console.log('🎯 Voice learning trigger request:', { 
      post_ids, 
      analyze_historical, 
      days_since, 
      limit 
    })

    let result

    if (analyze_historical) {
      // Trigger historical analysis
      console.log(`📊 Starting historical voice analysis for last ${days_since} days (limit: ${limit})`)
      
      result = await voiceLearningMonitorService.analyzeHistoricalPosts(
        parseInt(days_since),
        parseInt(limit)
      )

      console.log('✅ Historical analysis completed:', {
        processed: result.processed,
        failed: result.failed,
        insights: result.insights
      })

      return NextResponse.json({
        success: true,
        type: 'historical_analysis',
        data: {
          processed: result.processed,
          failed: result.failed,
          insights: result.insights,
          summary: {
            avgAuthenticity: result.insights.avgAuthenticity,
            avgAuthority: result.insights.avgAuthority,
            avgVulnerability: result.insights.avgVulnerability,
            dominantTone: result.insights.dominantTone,
            keyPatterns: result.insights.keyPatterns
          }
        },
        meta: {
          timeframe_days: days_since,
          posts_limit: limit,
          completion_time: new Date().toISOString()
        }
      })

    } else if (post_ids && Array.isArray(post_ids) && post_ids.length > 0) {
      // Trigger manual analysis for specific posts
      console.log(`🎯 Starting manual voice analysis for ${post_ids.length} posts`)
      
      result = await voiceLearningMonitorService.triggerManualAnalysis(post_ids)

      console.log('✅ Manual analysis completed:', {
        processed: result.processed,
        failed: result.failed
      })

      return NextResponse.json({
        success: true,
        type: 'manual_analysis',
        data: {
          processed: result.processed,
          failed: result.failed,
          results: result.results,
          summary: {
            success_rate: result.processed / (result.processed + result.failed),
            total_posts: post_ids.length
          }
        },
        meta: {
          post_ids,
          completion_time: new Date().toISOString()
        }
      })

    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid request. Provide either post_ids array or set analyze_historical to true',
        example: {
          manual: { post_ids: ['post1', 'post2'] },
          historical: { analyze_historical: true, days_since: 30, limit: 50 }
        }
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('❌ Voice learning trigger error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Voice learning trigger failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * GET /api/voice-learning/trigger
 * Get information about available triggers and status
 */
export async function GET(request: NextRequest) {
  try {
    const status = voiceLearningMonitorService.getMonitoringStatus()
    
    return NextResponse.json({
      success: true,
      monitoring_status: status,
      available_triggers: {
        manual_analysis: {
          description: 'Analyze specific posts by ID',
          method: 'POST',
          body: { post_ids: ['string[]'] }
        },
        historical_analysis: {
          description: 'Analyze recent historical posts',
          method: 'POST',
          body: { analyze_historical: true, days_since: 30, limit: 50 }
        }
      },
      endpoints: {
        status: '/api/voice-learning/status',
        data: '/api/voice-learning/data',
        insights: '/api/voice-learning/insights'
      }
    })

  } catch (error: any) {
    console.error('❌ Error getting voice learning trigger info:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get trigger information',
      details: error.message
    }, { status: 500 })
  }
}