import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '../../../../../worker-service/src/services/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/voice-learning/data
 * Retrieve voice learning data with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const contentType = searchParams.get('content_type') || 'post' // post, comment, article
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeAnalysis = searchParams.get('include_analysis') !== 'false'
    const sortBy = searchParams.get('sort_by') || 'created_at' // created_at, authenticity_score, authority_score, etc.
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const minScore = searchParams.get('min_authenticity_score') ? parseInt(searchParams.get('min_authenticity_score')!) : null

    console.log('📊 Fetching voice learning data:', {
      contentType,
      limit,
      includeAnalysis,
      sortBy,
      sortOrder,
      minScore
    })

    // Get voice learning data from database
    const voiceData = await supabaseService.getVoiceLearningData(contentType, limit)

    if (!voiceData || voiceData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        stats: {
          total_records: 0,
          content_types: {},
          date_range: null
        },
        meta: {
          query: { contentType, limit, sortBy, sortOrder },
          message: 'No voice learning data found'
        }
      })
    }

    // Filter by minimum score if specified
    let filteredData = voiceData
    if (minScore !== null) {
      filteredData = voiceData.filter(d => (d.authenticity_score || 0) >= minScore)
    }

    // Sort data (basic sorting since Supabase query is limited)
    if (sortBy !== 'created_at') {
      filteredData.sort((a, b) => {
        const aVal = a[sortBy as keyof typeof a] || 0
        const bVal = b[sortBy as keyof typeof b] || 0
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
        }
        
        const aStr = String(aVal)
        const bStr = String(bVal)
        return sortOrder === 'desc' ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr)
      })
    }

    // Transform data for API response
    const transformedData = filteredData.map(item => {
      const baseData = {
        id: item.id,
        content_id: item.content_id,
        content_type: item.content_type,
        content_preview: item.content_text ? item.content_text.substring(0, 150) + '...' : '',
        content_date: item.content_date,
        analyzed_at: item.analyzed_at,
        authenticity_score: item.authenticity_score,
        authority_score: item.authority_score,
        vulnerability_score: item.vulnerability_score,
        engagement_potential: item.engagement_potential,
        confidence_score: item.confidence_score,
        training_weight: item.training_weight
      }

      if (includeAnalysis) {
        return {
          ...baseData,
          full_content: item.content_text,
          content_context: item.content_context,
          tone_analysis: item.tone_analysis,
          writing_style: item.writing_style,
          vocabulary_patterns: item.vocabulary_patterns,
          structural_patterns: item.structural_patterns
        }
      }

      return baseData
    })

    // Calculate statistics
    const stats = {
      total_records: filteredData.length,
      original_total: voiceData.length,
      content_types: voiceData.reduce((acc, item) => {
        acc[item.content_type] = (acc[item.content_type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      date_range: {
        earliest: voiceData.reduce((earliest, item) => {
          const date = item.content_date || item.analyzed_at
          return !earliest || (date && date < earliest) ? date : earliest
        }, null as string | null),
        latest: voiceData.reduce((latest, item) => {
          const date = item.content_date || item.analyzed_at
          return !latest || (date && date > latest) ? date : latest
        }, null as string | null)
      },
      score_averages: {
        authenticity: Math.round(filteredData.reduce((sum, d) => sum + (d.authenticity_score || 0), 0) / filteredData.length),
        authority: Math.round(filteredData.reduce((sum, d) => sum + (d.authority_score || 0), 0) / filteredData.length),
        vulnerability: Math.round(filteredData.reduce((sum, d) => sum + (d.vulnerability_score || 0), 0) / filteredData.length),
        engagement: Math.round(filteredData.reduce((sum, d) => sum + (d.engagement_potential || 0), 0) / filteredData.length)
      },
      tone_distribution: filteredData.reduce((acc, item) => {
        const tone = item.tone_analysis?.primary_tone || 'unknown'
        acc[tone] = (acc[tone] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    console.log('✅ Voice learning data retrieved:', {
      total: stats.total_records,
      contentTypes: Object.keys(stats.content_types),
      avgScores: stats.score_averages
    })

    return NextResponse.json({
      success: true,
      data: transformedData,
      stats,
      meta: {
        query: {
          content_type: contentType,
          limit,
          include_analysis: includeAnalysis,
          sort_by: sortBy,
          sort_order: sortOrder,
          min_authenticity_score: minScore
        },
        pagination: {
          returned: transformedData.length,
          available: voiceData.length,
          filtered: filteredData.length
        },
        generated_at: new Date().toISOString()
      },
      actions: {
        filter_by_score: '/api/voice-learning/data?min_authenticity_score=80',
        get_analysis: '/api/voice-learning/data?include_analysis=true',
        sort_by_authority: '/api/voice-learning/data?sort_by=authority_score&sort_order=desc',
        get_insights: '/api/voice-learning/insights'
      }
    })

  } catch (error: any) {
    console.error('❌ Error retrieving voice learning data:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve voice learning data',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * DELETE /api/voice-learning/data
 * Clean up old or low-quality voice learning data
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const olderThanDays = parseInt(searchParams.get('older_than_days') || '365')
    const minConfidence = parseFloat(searchParams.get('min_confidence') || '0.3')
    const dryRun = searchParams.get('dry_run') !== 'false'

    console.log('🗑️ Voice learning data cleanup request:', {
      olderThanDays,
      minConfidence,
      dryRun
    })

    if (dryRun) {
      // Just return what would be deleted without actually deleting
      return NextResponse.json({
        success: true,
        dry_run: true,
        message: 'Dry run completed - no data was deleted',
        would_delete: {
          criteria: {
            older_than_days: olderThanDays,
            min_confidence: minConfidence
          },
          note: 'Actual deletion requires dry_run=false parameter'
        },
        cleanup_url: `/api/voice-learning/data?older_than_days=${olderThanDays}&min_confidence=${minConfidence}&dry_run=false`
      })
    }

    // Note: Actual cleanup implementation would go here
    // This would require additional Supabase methods for deletion
    console.log('⚠️ Cleanup not implemented yet - would clean up data older than', olderThanDays, 'days with confidence <', minConfidence)

    return NextResponse.json({
      success: true,
      message: 'Cleanup functionality not yet implemented',
      requested_criteria: {
        older_than_days: olderThanDays,
        min_confidence: minConfidence
      },
      note: 'This feature requires additional database methods for safe deletion'
    })

  } catch (error: any) {
    console.error('❌ Error in voice learning data cleanup:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup voice learning data',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}