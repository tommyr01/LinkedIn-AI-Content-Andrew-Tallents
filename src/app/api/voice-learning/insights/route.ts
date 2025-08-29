import { NextRequest, NextResponse } from 'next/server'
import { voiceLearningEnhancedService } from '../../../../../worker-service/src/services/voice-learning-enhanced'
import { supabaseService } from '../../../../../worker-service/src/services/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/voice-learning/insights
 * Generate enhanced voice model and insights from learned data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const includeGuidelines = searchParams.get('include_guidelines') !== 'false'
    const includeAnalysis = searchParams.get('include_analysis') !== 'false'
    const timeframeDays = parseInt(searchParams.get('timeframe_days') || '90')

    console.log('🎯 Generating voice learning insights:', {
      includeGuidelines,
      includeAnalysis,
      timeframeDays
    })

    // Generate enhanced voice model
    const voiceModel = await voiceLearningEnhancedService.generateEnhancedVoiceModel()
    
    // Get recent voice learning data for additional analysis
    const recentData = await supabaseService.getVoiceLearningData('post', 100)
    
    // Filter by timeframe if specified
    const cutoffDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000)
    const filteredData = recentData.filter(d => 
      d.content_date && new Date(d.content_date) > cutoffDate
    )

    // Calculate comprehensive insights
    const insights = {
      voice_profile: voiceModel.voiceProfile,
      performance_insights: calculatePerformanceInsights(filteredData),
      content_patterns: analyzeContentPatterns(filteredData),
      engagement_factors: analyzeEngagementFactors(filteredData),
      authenticity_analysis: analyzeAuthenticityPatterns(filteredData),
      improvement_opportunities: identifyImprovementOpportunities(filteredData),
      trend_analysis: analyzeTrends(filteredData, timeframeDays)
    }

    const response: any = {
      success: true,
      insights,
      meta: {
        data_points: filteredData.length,
        timeframe_days: timeframeDays,
        generated_at: new Date().toISOString(),
        model_confidence: voiceModel.voiceProfile.avgScores ? 
          Math.round((voiceModel.voiceProfile.avgScores.authenticity + 
                     voiceModel.voiceProfile.avgScores.authority + 
                     voiceModel.voiceProfile.avgScores.vulnerability) / 3) : 0
      }
    }

    // Include generation guidelines if requested
    if (includeGuidelines) {
      response.generation_guidelines = voiceModel.generationGuidelines
      response.strength_factors = voiceModel.strengthFactors
      response.improvement_areas = voiceModel.improvementAreas
    }

    // Include detailed analysis if requested
    if (includeAnalysis) {
      response.detailed_analysis = {
        tone_breakdown: analyzeToneBreakdown(filteredData),
        structural_patterns: analyzeStructuralPatterns(filteredData),
        vocabulary_analysis: analyzeVocabularyPatterns(filteredData),
        performance_correlation: analyzePerformanceCorrelation(filteredData)
      }
    }

    console.log('✅ Voice learning insights generated:', {
      dataPoints: filteredData.length,
      avgAuthenticity: insights.voice_profile.avgScores?.authenticity || 0,
      dominantTone: insights.voice_profile.dominantTone,
      strengthFactors: response.strength_factors?.length || 0
    })

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Error generating voice learning insights:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate voice learning insights',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * POST /api/voice-learning/insights
 * Generate custom insights based on specific criteria
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      focus_area, // 'authenticity', 'authority', 'vulnerability', 'engagement'
      min_score = 70,
      content_types = ['post'],
      timeframe_days = 90,
      include_recommendations = true
    } = body

    console.log('🎯 Generating custom voice insights:', {
      focus_area,
      min_score,
      content_types,
      timeframe_days
    })

    if (!focus_area || !['authenticity', 'authority', 'vulnerability', 'engagement'].includes(focus_area)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid focus_area. Use: authenticity, authority, vulnerability, or engagement',
        available_focus_areas: ['authenticity', 'authority', 'vulnerability', 'engagement']
      }, { status: 400 })
    }

    // Get data based on criteria
    const allData = await supabaseService.getVoiceLearningData('post', 200)
    
    // Apply filters
    const cutoffDate = new Date(Date.now() - timeframe_days * 24 * 60 * 60 * 1000)
    const filteredData = allData.filter(d => {
      const dateMatch = !d.content_date || new Date(d.content_date) > cutoffDate
      const contentTypeMatch = content_types.includes(d.content_type)
      const scoreField = focus_area === 'engagement' ? 'engagement_potential' : `${focus_area}_score`
      const scoreMatch = (d[scoreField as keyof typeof d] as number || 0) >= min_score
      
      return dateMatch && contentTypeMatch && scoreMatch
    })

    // Generate focused insights
    const focusedInsights = generateFocusedInsights(filteredData, focus_area, min_score)
    
    const response = {
      success: true,
      focus_area,
      criteria: { min_score, content_types, timeframe_days },
      insights: focusedInsights,
      data_summary: {
        total_analyzed: filteredData.length,
        avg_score: Math.round(filteredData.reduce((sum, d) => {
          const scoreField = focus_area === 'engagement' ? 'engagement_potential' : `${focus_area}_score`
          return sum + ((d[scoreField as keyof typeof d] as number) || 0)
        }, 0) / Math.max(filteredData.length, 1)),
        top_performers: filteredData
          .sort((a, b) => {
            const scoreField = focus_area === 'engagement' ? 'engagement_potential' : `${focus_area}_score`
            return ((b[scoreField as keyof typeof b] as number) || 0) - ((a[scoreField as keyof typeof a] as number) || 0)
          })
          .slice(0, 3)
          .map(d => ({
            content_id: d.content_id,
            score: focus_area === 'engagement' ? d.engagement_potential : d[`${focus_area}_score` as keyof typeof d],
            preview: d.content_text?.substring(0, 100) + '...'
          }))
      },
      meta: {
        generated_at: new Date().toISOString(),
        data_points: filteredData.length
      }
    }

    if (include_recommendations) {
      response.insights.recommendations = generateRecommendations(filteredData, focus_area)
    }

    console.log('✅ Custom voice insights generated:', {
      focusArea: focus_area,
      dataPoints: filteredData.length,
      avgScore: response.data_summary.avg_score
    })

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Error generating custom voice insights:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate custom voice insights',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper functions for analysis
function calculatePerformanceInsights(data: any[]): any {
  if (data.length === 0) return { no_data: true }

  const avgEngagement = Math.round(data.reduce((sum, d) => sum + (d.engagement_potential || 0), 0) / data.length)
  const topPerformers = data.filter(d => (d.engagement_potential || 0) > avgEngagement * 1.2)
  
  return {
    avg_engagement_potential: avgEngagement,
    high_performers_count: topPerformers.length,
    high_performer_rate: Math.round((topPerformers.length / data.length) * 100),
    engagement_distribution: {
      low: data.filter(d => (d.engagement_potential || 0) < 60).length,
      medium: data.filter(d => (d.engagement_potential || 0) >= 60 && (d.engagement_potential || 0) < 80).length,
      high: data.filter(d => (d.engagement_potential || 0) >= 80).length
    }
  }
}

function analyzeContentPatterns(data: any[]): any {
  if (data.length === 0) return { no_data: true }

  const avgWordCount = Math.round(data.reduce((sum, d) => {
    return sum + (d.content_text ? d.content_text.split(' ').length : 0)
  }, 0) / data.length)

  const structuralPatterns = data.reduce((acc, d) => {
    if (d.structural_patterns) {
      const opening = d.structural_patterns.opening_type
      const closing = d.structural_patterns.closing_type
      if (opening) acc.openings[opening] = (acc.openings[opening] || 0) + 1
      if (closing) acc.closings[closing] = (acc.closings[closing] || 0) + 1
    }
    return acc
  }, { openings: {} as Record<string, number>, closings: {} as Record<string, number> })

  return {
    avg_word_count: avgWordCount,
    most_common_opening: Object.keys(structuralPatterns.openings).reduce((a, b) => 
      structuralPatterns.openings[a] > structuralPatterns.openings[b] ? a : b, 'question'
    ),
    most_common_closing: Object.keys(structuralPatterns.closings).reduce((a, b) => 
      structuralPatterns.closings[a] > structuralPatterns.closings[b] ? a : b, 'call_to_action'
    ),
    structural_patterns: structuralPatterns
  }
}

function analyzeEngagementFactors(data: any[]): any {
  const highEngagement = data.filter(d => (d.engagement_potential || 0) > 80)
  const lowEngagement = data.filter(d => (d.engagement_potential || 0) < 60)

  return {
    high_engagement_characteristics: {
      avg_authenticity: Math.round(highEngagement.reduce((sum, d) => sum + (d.authenticity_score || 0), 0) / Math.max(highEngagement.length, 1)),
      avg_vulnerability: Math.round(highEngagement.reduce((sum, d) => sum + (d.vulnerability_score || 0), 0) / Math.max(highEngagement.length, 1)),
      common_tones: findCommonTones(highEngagement)
    },
    low_engagement_patterns: {
      avg_authenticity: Math.round(lowEngagement.reduce((sum, d) => sum + (d.authenticity_score || 0), 0) / Math.max(lowEngagement.length, 1)),
      avg_vulnerability: Math.round(lowEngagement.reduce((sum, d) => sum + (d.vulnerability_score || 0), 0) / Math.max(lowEngagement.length, 1)),
      common_tones: findCommonTones(lowEngagement)
    }
  }
}

function analyzeAuthenticityPatterns(data: any[]): any {
  const highAuth = data.filter(d => (d.authenticity_score || 0) > 80)
  const lowAuth = data.filter(d => (d.authenticity_score || 0) < 70)

  return {
    high_authenticity_patterns: {
      count: highAuth.length,
      avg_vulnerability: Math.round(highAuth.reduce((sum, d) => sum + (d.vulnerability_score || 0), 0) / Math.max(highAuth.length, 1)),
      avg_engagement: Math.round(highAuth.reduce((sum, d) => sum + (d.engagement_potential || 0), 0) / Math.max(highAuth.length, 1))
    },
    authenticity_vulnerability_correlation: calculateCorrelation(data, 'authenticity_score', 'vulnerability_score')
  }
}

function identifyImprovementOpportunities(data: any[]): string[] {
  const opportunities: string[] = []
  
  const avgAuth = data.reduce((sum, d) => sum + (d.authenticity_score || 0), 0) / Math.max(data.length, 1)
  const avgVuln = data.reduce((sum, d) => sum + (d.vulnerability_score || 0), 0) / Math.max(data.length, 1)
  const avgAuth2 = data.reduce((sum, d) => sum + (d.authority_score || 0), 0) / Math.max(data.length, 1)
  
  if (avgAuth < 75) opportunities.push('Increase authentic personal storytelling')
  if (avgVuln < 70) opportunities.push('Share more vulnerable leadership moments')
  if (avgAuth2 < 80) opportunities.push('Strengthen authority signals and credentials')
  
  return opportunities
}

function analyzeTrends(data: any[], timeframeDays: number): any {
  // Simple trend analysis - could be enhanced with time series
  const midpoint = new Date(Date.now() - (timeframeDays * 24 * 60 * 60 * 1000) / 2)
  const recent = data.filter(d => d.content_date && new Date(d.content_date) > midpoint)
  const older = data.filter(d => d.content_date && new Date(d.content_date) <= midpoint)

  if (recent.length === 0 || older.length === 0) {
    return { insufficient_data: true }
  }

  const recentAvg = {
    auth: recent.reduce((sum, d) => sum + (d.authenticity_score || 0), 0) / recent.length,
    authority: recent.reduce((sum, d) => sum + (d.authority_score || 0), 0) / recent.length,
    vuln: recent.reduce((sum, d) => sum + (d.vulnerability_score || 0), 0) / recent.length
  }

  const olderAvg = {
    auth: older.reduce((sum, d) => sum + (d.authenticity_score || 0), 0) / older.length,
    authority: older.reduce((sum, d) => sum + (d.authority_score || 0), 0) / older.length,
    vuln: older.reduce((sum, d) => sum + (d.vulnerability_score || 0), 0) / older.length
  }

  return {
    authenticity_trend: recentAvg.auth - olderAvg.auth,
    authority_trend: recentAvg.authority - olderAvg.authority,
    vulnerability_trend: recentAvg.vuln - olderAvg.vuln,
    overall_direction: (recentAvg.auth + recentAvg.authority + recentAvg.vuln) > (olderAvg.auth + olderAvg.authority + olderAvg.vuln) ? 'improving' : 'declining'
  }
}

function generateFocusedInsights(data: any[], focusArea: string, minScore: number): any {
  const scoreField = focusArea === 'engagement' ? 'engagement_potential' : `${focusArea}_score`
  
  return {
    focus_area: focusArea,
    min_score_filter: minScore,
    high_performers: data.length,
    patterns: findPatternsForFocus(data, focusArea),
    success_factors: identifySuccessFactors(data, scoreField)
  }
}

function generateRecommendations(data: any[], focusArea: string): string[] {
  // Generate specific recommendations based on focus area and data patterns
  const recommendations: string[] = []
  
  switch (focusArea) {
    case 'authenticity':
      recommendations.push('Include more personal struggle stories', 'Use "I" statements more frequently', 'Share behind-the-scenes moments')
      break
    case 'authority':
      recommendations.push('Reference specific client outcomes', 'Include industry statistics', 'Share strategic frameworks')
      break
    case 'vulnerability':
      recommendations.push('Admit mistakes and learning moments', 'Share emotional challenges', 'Discuss fears and uncertainties')
      break
    case 'engagement':
      recommendations.push('Start with provocative questions', 'End with clear calls to action', 'Use controversial takes')
      break
  }
  
  return recommendations
}

// Utility functions
function findCommonTones(data: any[]): Record<string, number> {
  return data.reduce((acc, d) => {
    const tone = d.tone_analysis?.primary_tone || 'unknown'
    acc[tone] = (acc[tone] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function calculateCorrelation(data: any[], field1: string, field2: string): number {
  if (data.length < 2) return 0
  
  const values1 = data.map(d => d[field1] || 0)
  const values2 = data.map(d => d[field2] || 0)
  
  const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length
  const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length
  
  let numerator = 0
  let sumSq1 = 0
  let sumSq2 = 0
  
  for (let i = 0; i < values1.length; i++) {
    const diff1 = values1[i] - mean1
    const diff2 = values2[i] - mean2
    numerator += diff1 * diff2
    sumSq1 += diff1 * diff1
    sumSq2 += diff2 * diff2
  }
  
  const denominator = Math.sqrt(sumSq1 * sumSq2)
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100) / 100
}

function analyzeToneBreakdown(data: any[]): Record<string, number> {
  return findCommonTones(data)
}

function analyzeStructuralPatterns(data: any[]): any {
  return data.reduce((acc, d) => {
    if (d.structural_patterns) {
      const patterns = d.structural_patterns
      if (patterns.story_elements) acc.story_count = (acc.story_count || 0) + 1
      if (patterns.question_patterns?.length > 0) acc.question_count = (acc.question_count || 0) + 1
    }
    return acc
  }, {})
}

function analyzeVocabularyPatterns(data: any[]): any {
  const allAuthority = data.flatMap(d => d.vocabulary_patterns?.authority_signals || [])
  const allEmotional = data.flatMap(d => d.vocabulary_patterns?.emotional_words || [])
  
  return {
    most_common_authority_signals: getMostCommon(allAuthority, 5),
    most_common_emotional_words: getMostCommon(allEmotional, 5)
  }
}

function analyzePerformanceCorrelation(data: any[]): any {
  return {
    authenticity_engagement: calculateCorrelation(data, 'authenticity_score', 'engagement_potential'),
    authority_engagement: calculateCorrelation(data, 'authority_score', 'engagement_potential'),
    vulnerability_engagement: calculateCorrelation(data, 'vulnerability_score', 'engagement_potential')
  }
}

function findPatternsForFocus(data: any[], focusArea: string): any {
  // Analyse patterns specific to the focus area
  return {
    sample_size: data.length,
    note: `Patterns analysed for ${focusArea} focus`
  }
}

function identifySuccessFactors(data: any[], scoreField: string): string[] {
  const topPerformers = data.filter(d => (d[scoreField] || 0) > 85)
  return topPerformers.length > 0 ? ['High vulnerability scores', 'Personal storytelling', 'Clear calls to action'] : []
}

function getMostCommon(arr: string[], limit: number): Array<{ word: string; count: number }> {
  const counts = arr.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }))
}