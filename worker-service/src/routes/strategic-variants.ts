import express from 'express'
import { Request, Response } from 'express'
import logger from '../lib/logger'
import { 
  validateBody, 
  validateQuery, 
  strategicContentSchema,
  analyticsQuerySchema,
  insightsQuerySchema,
  voiceEvolutionQuerySchema,
  rateLimitMiddleware,
  requestIdMiddleware,
  requestLoggingMiddleware,
  errorHandlerMiddleware,
  ValidatedRequest
} from '../middleware/validation'
import { historicalAnalysisEnhancedService } from '../services/historical-analysis-enhanced'
import { voiceLearningEnhancedService } from '../services/voice-learning-enhanced'
import { performanceInsightsService } from '../services/performance-insights'
import { supabaseService } from '../services/supabase'
import { contentGenerationQueue } from '../queue/setup'
import { JobData } from '../types'

const router = express.Router()

// Apply middleware to all routes
router.use(requestIdMiddleware)
router.use(requestLoggingMiddleware)
router.use(rateLimitMiddleware(50, 60000)) // 50 requests per minute

/**
 * Generate strategic content with enhanced intelligence
 * POST /api/content/generate-strategic
 */
router.post('/generate-strategic', async (req: Request, res: Response) => {
  try {
    const { topic, platform = 'linkedin', voiceGuidelines, postType, tone, userId } = req.body
    
    // Basic validation
    if (!topic || typeof topic !== 'string' || topic.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required and must be at least 5 characters',
        error_type: 'validation_error'
      })
    }

    logger.info({ 
      topic, 
      platform, 
      postType,
      userProvided: { voiceGuidelines: !!voiceGuidelines, tone: !!tone }
    }, 'Starting strategic content generation')

    // Generate comprehensive insights for the topic
    const insights = await historicalAnalysisEnhancedService.generateComprehensiveInsights(
      topic,
      {
        maxPosts: 30,
        timeframeDays: 365,
        includeComments: true,
        forceRefresh: false
      }
    )

    // Get enhanced voice model
    const voiceModel = await voiceLearningEnhancedService.generateEnhancedVoiceModel()

    // Create job data with strategic intelligence
    const jobData: JobData & {
      strategicIntelligence: {
        insights: typeof insights
        voiceModel: typeof voiceModel
        generationType: 'strategic'
        performanceTarget: number
      }
    } = {
      topic,
      platform,
      voiceGuidelines: voiceGuidelines || voiceModel.generationGuidelines,
      postType,
      tone,
      userId,
      strategicIntelligence: {
        insights,
        voiceModel,
        generationType: 'strategic',
        performanceTarget: Math.round(insights.performance_context.avg_engagement * 1.2) // Target 20% above average
      }
    }

    // Add job to queue with strategic enhancement
    const job = await contentGenerationQueue.add('content-generation-strategic', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    })

    // Store job in database with strategic metadata
    const contentJob = await supabaseService.createContentJob({
      id: job.id || 'unknown',
      queue_job_id: job.id?.toString(),
      status: 'pending',
      topic,
      platform,
      voice_guide_id: voiceGuidelines ? 'user-provided' : 'enhanced-voice-model',
      research_data: {
        historical_insights: {
          confidence_level: insights.confidence_level,
          performance_benchmark: insights.performance_context.performance_benchmark,
          top_performers_count: insights.top_performers.length
        },
        voice_model: {
          authenticity_avg: voiceModel.voiceProfile.authenticity_score_avg,
          authority_avg: voiceModel.voiceProfile.authority_score_avg,
          generation_strategy: 'strategic_variants'
        }
      },
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (!contentJob) {
      throw new Error('Failed to create strategic job in database')
    }

    logger.info({ 
      jobId: job.id, 
      contentJobId: contentJob.id,
      performanceTarget: jobData.strategicIntelligence.performanceTarget,
      insightsConfidence: insights.confidence_level
    }, 'Strategic content generation job created')

    res.json({
      success: true,
      data: {
        job_id: job.id,
        content_job_id: contentJob.id,
        status: 'queued',
        estimated_completion: '3-5 minutes',
        strategic_intelligence: {
          performance_target: jobData.strategicIntelligence.performanceTarget,
          insights_confidence: insights.confidence_level,
          voice_authenticity_score: voiceModel.voiceProfile.authenticity_score_avg,
          historical_context_posts: insights.related_posts.length,
          top_performers_analyzed: insights.top_performers.length
        },
        queue_position: await job.getState(),
        preview: {
          expected_variants: 3,
          generation_approach: 'Performance-driven with historical intelligence',
          voice_strategy: voiceModel.strengthFactors.slice(0, 3)
        }
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    logger.error({ 
      topic: req.body.topic,
      platform: req.body.platform,
      userId: req.body.userId,
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    }, 'Failed to generate strategic content')
    
    // Determine appropriate error response based on error type
    let statusCode = 500
    let errorType = 'internal_error'
    
    if (errorMessage.includes('insights')) {
      statusCode = 503
      errorType = 'insights_service_error'
    } else if (errorMessage.includes('voice')) {
      statusCode = 503
      errorType = 'voice_service_error'
    } else if (errorMessage.includes('database') || errorMessage.includes('supabase')) {
      statusCode = 503
      errorType = 'database_error'
    } else if (errorMessage.includes('queue') || errorMessage.includes('redis')) {
      statusCode = 503
      errorType = 'queue_error'
    }
    
    res.status(statusCode).json({
      success: false,
      error: 'Failed to start strategic content generation',
      error_type: errorType,
      message: process.env.NODE_ENV === 'development' ? errorMessage : 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'unknown'
    })
  }
})

/**
 * Get performance analytics dashboard data
 * GET /api/performance/analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { timeframe = '30', metric = 'viral_score' } = req.query
    const timeframeDays = parseInt(timeframe as string)

    logger.info({ timeframeDays, metric }, 'Fetching performance analytics dashboard data')

    // Get top performing posts for the timeframe
    const topPosts = await supabaseService.getTopPerformingPosts(50, timeframeDays)
    
    // Get voice learning progress data
    const voiceData = await supabaseService.getVoiceLearningData('post', 100)
    
    // Get content variants tracking data
    const variantsData = await supabaseService.getContentVariantsTracking(timeframeDays)
    
    // Calculate performance trends
    const performanceTrends = await calculatePerformanceTrends(topPosts, timeframeDays)
    
    // Calculate voice evolution
    const voiceEvolution = await calculateVoiceEvolution(voiceData)
    
    // Calculate prediction accuracy
    const predictionAccuracy = await calculatePredictionAccuracy(variantsData)

    const analytics = {
      overview: {
        timeframe_days: timeframeDays,
        total_posts_analyzed: topPosts.length,
        total_voice_analyses: voiceData.length,
        total_variants_generated: variantsData.length,
        data_freshness_score: 95
      },
      performance_metrics: {
        avg_viral_score: topPosts.length > 0 ? 
          Math.round(topPosts.reduce((sum, p) => sum + (p.viral_score || 0), 0) / topPosts.length) : 0,
        top_viral_score: topPosts.length > 0 ? 
          Math.max(...topPosts.map(p => p.viral_score || 0)) : 0,
        engagement_rate_avg: topPosts.length > 0 ? 
          (topPosts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / topPosts.length).toFixed(2) : '0.00',
        performance_distribution: {
          top_10_percent: topPosts.filter(p => p.performance_tier === 'top_10_percent').length,
          top_25_percent: topPosts.filter(p => p.performance_tier === 'top_25_percent').length,
          average: topPosts.filter(p => p.performance_tier === 'average').length,
          below_average: topPosts.filter(p => p.performance_tier === 'below_average').length
        }
      },
      voice_analytics: {
        authenticity_avg: voiceData.length > 0 ?
          Math.round(voiceData.reduce((sum, v) => sum + (v.authenticity_score || 0), 0) / voiceData.length) : 0,
        authority_avg: voiceData.length > 0 ?
          Math.round(voiceData.reduce((sum, v) => sum + (v.authority_score || 0), 0) / voiceData.length) : 0,
        vulnerability_avg: voiceData.length > 0 ?
          Math.round(voiceData.reduce((sum, v) => sum + (v.vulnerability_score || 0), 0) / voiceData.length) : 0,
        engagement_potential_avg: voiceData.length > 0 ?
          Math.round(voiceData.reduce((sum, v) => sum + (v.engagement_potential || 0), 0) / voiceData.length) : 0,
        evolution_trend: voiceEvolution
      },
      performance_trends: performanceTrends,
      strategic_generation_stats: {
        variants_generated: variantsData.length,
        posted_variants: variantsData.filter(v => v.was_posted).length,
        avg_prediction_accuracy: predictionAccuracy.avgAccuracy,
        best_performing_agent: predictionAccuracy.bestAgent,
        success_rate: predictionAccuracy.successRate
      },
      top_performers: topPosts.slice(0, 5).map(post => ({
        post_id: post.post_id,
        content_preview: post.content_text.slice(0, 150) + '...',
        viral_score: post.viral_score,
        engagement_rate: post.engagement_rate,
        performance_tier: post.performance_tier,
        posted_at: post.posted_at
      })),
      generated_at: new Date().toISOString()
    }

    res.json({
      success: true,
      data: analytics
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    logger.error({ 
      timeframe: req.query.timeframe,
      metric: req.query.metric,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    }, 'Failed to fetch analytics dashboard data')
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics dashboard data',
      error_type: 'analytics_error',
      message: process.env.NODE_ENV === 'development' ? errorMessage : 'Analytics service temporarily unavailable',
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || 'unknown'
    })
  }
})

/**
 * Get AI-generated insights for dashboard
 * GET /api/performance/insights
 */
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const { topic, timeframe = '90' } = req.query
    const timeframeDays = parseInt(timeframe as string)

    logger.info({ topic, timeframeDays }, 'Generating AI insights for dashboard')

    // Generate insights using performance insights service
    const insights = await performanceInsightsService.generatePerformanceInsights(
      topic ? topic as string : 'general performance',
      {
        timeframeDays,
        includeVoiceAnalysis: true,
        includeContentPatterns: true,
        includePredictions: true
      }
    )

    res.json({
      success: true,
      data: {
        insights: insights.insights,
        recommendations: insights.recommendations,
        voice_guidance: insights.voiceGuidance,
        content_strategy: insights.contentStrategy,
        performance_predictions: insights.performancePredictions,
        confidence_score: insights.confidenceScore,
        generated_at: insights.generatedAt
      }
    })

  } catch (error) {
    logger.error({ 
      topic: req.query.topic,
      error: error instanceof Error ? error.message : String(error) 
    }, 'Failed to generate AI insights')
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI insights',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
})

/**
 * Get voice learning progression data
 * GET /api/performance/voice-evolution
 */
router.get('/voice-evolution', async (req: Request, res: Response) => {
  try {
    const { period = '12', metric = 'authenticity' } = req.query
    const periodMonths = parseInt(period as string)

    logger.info({ periodMonths, metric }, 'Fetching voice evolution data')

    // Get voice learning data for the period
    const voiceData = await supabaseService.getVoiceLearningData('post', 200)
    
    // Group by month and calculate evolution
    const evolution = await calculateVoiceEvolutionDetail(voiceData, periodMonths, metric as string)
    
    res.json({
      success: true,
      data: {
        metric_tracked: metric,
        period_months: periodMonths,
        data_points: evolution.dataPoints.length,
        evolution_trend: evolution.trend,
        improvement_rate: evolution.improvementRate,
        current_score: evolution.currentScore,
        peak_score: evolution.peakScore,
        monthly_progress: evolution.monthlyProgress,
        insights: evolution.insights,
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    logger.error({ 
      metric: req.query.metric,
      error: error instanceof Error ? error.message : String(error) 
    }, 'Failed to fetch voice evolution data')
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voice evolution data',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
})

// Helper functions
async function calculatePerformanceTrends(posts: any[], timeframeDays: number) {
  // Group posts by week/month and calculate trends
  const intervals = Math.min(timeframeDays / 7, 12) // Weekly intervals, max 12 points
  const intervalDays = Math.floor(timeframeDays / intervals)
  
  const trends = []
  const now = new Date()
  
  for (let i = 0; i < intervals; i++) {
    const endDate = new Date(now.getTime() - (i * intervalDays * 24 * 60 * 60 * 1000))
    const startDate = new Date(endDate.getTime() - (intervalDays * 24 * 60 * 60 * 1000))
    
    const intervalPosts = posts.filter(p => {
      const postedAt = new Date(p.posted_at)
      return postedAt >= startDate && postedAt <= endDate
    })
    
    const avgViralScore = intervalPosts.length > 0 ? 
      intervalPosts.reduce((sum, p) => sum + (p.viral_score || 0), 0) / intervalPosts.length : 0
    
    trends.unshift({
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      avg_viral_score: Math.round(avgViralScore),
      post_count: intervalPosts.length,
      top_score: intervalPosts.length > 0 ? Math.max(...intervalPosts.map(p => p.viral_score || 0)) : 0
    })
  }
  
  return trends
}

async function calculateVoiceEvolution(voiceData: any[]) {
  if (voiceData.length === 0) return { trend: 'no_data', improvement: 0 }
  
  const sortedData = voiceData.sort((a, b) => 
    new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime()
  )
  
  const first = sortedData.slice(0, Math.floor(sortedData.length / 3))
  const last = sortedData.slice(-Math.floor(sortedData.length / 3))
  
  const firstAvgAuth = first.reduce((sum, v) => sum + (v.authenticity_score || 0), 0) / first.length
  const lastAvgAuth = last.reduce((sum, v) => sum + (v.authenticity_score || 0), 0) / last.length
  
  const improvement = ((lastAvgAuth - firstAvgAuth) / firstAvgAuth) * 100
  
  return {
    trend: improvement > 5 ? 'improving' : improvement < -5 ? 'declining' : 'stable',
    improvement_percentage: Math.round(improvement)
  }
}

async function calculatePredictionAccuracy(variantsData: any[]) {
  const postedVariants = variantsData.filter(v => v.was_posted && v.prediction_accuracy !== null)
  
  if (postedVariants.length === 0) {
    return {
      avgAccuracy: 0,
      bestAgent: 'none',
      successRate: 0
    }
  }
  
  const avgAccuracy = postedVariants.reduce((sum, v) => sum + (v.prediction_accuracy || 0), 0) / postedVariants.length
  
  // Find best performing agent
  const agentStats = postedVariants.reduce((acc: Record<string, { total: number, count: number }>, v: any) => {
    const agent = v.agent_name
    if (!acc[agent]) acc[agent] = { total: 0, count: 0 }
    acc[agent].total += v.prediction_accuracy || 0
    acc[agent].count += 1
    return acc
  }, {})
  
  const bestAgent = Object.entries(agentStats).reduce((best, [agent, stats]) => {
    const avgForAgent = stats.total / stats.count
    return avgForAgent > best.avg ? { agent, avg: avgForAgent } : best
  }, { agent: 'none', avg: 0 }).agent
  
  const successRate = (postedVariants.filter(v => (v.prediction_accuracy || 0) > 0.7).length / postedVariants.length) * 100
  
  return {
    avgAccuracy: Math.round(avgAccuracy * 100) / 100,
    bestAgent,
    successRate: Math.round(successRate)
  }
}

async function calculateVoiceEvolutionDetail(voiceData: any[], periodMonths: number, metric: string): Promise<any> {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - periodMonths, 1)
  
  // Filter data within period
  const relevantData = voiceData.filter(v => new Date(v.analyzed_at) >= startDate)
  
  // Group by month
  const monthlyData = relevantData.reduce((acc, v) => {
    const date = new Date(v.analyzed_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!acc[monthKey]) acc[monthKey] = []
    acc[monthKey].push(v)
    
    return acc
  }, {} as Record<string, any[]>)
  
  // Calculate monthly averages
  const monthlyProgress = Object.entries(monthlyData).map(([month, data]: [string, any[]]) => {
    const avgScore = data.reduce((sum: number, v: any) => sum + (v[`${metric}_score`] || 0), 0) / data.length
    return {
      month,
      score: Math.round(avgScore),
      count: data.length
    }
  }).sort((a, b) => a.month.localeCompare(b.month))
  
  const scores = monthlyProgress.map(m => m.score).filter(s => s > 0)
  const currentScore = scores.length > 0 ? scores[scores.length - 1] : 0
  const peakScore = scores.length > 0 ? Math.max(...scores) : 0
  
  // Calculate improvement rate
  const firstScore = scores.length > 0 ? scores[0] : 0
  const improvementRate = firstScore > 0 ? 
    Math.round(((currentScore - firstScore) / firstScore) * 100) : 0
  
  const trend = improvementRate > 10 ? 'strong_improvement' : 
                improvementRate > 2 ? 'improving' :
                improvementRate < -10 ? 'declining' : 'stable'
  
  return {
    dataPoints: monthlyProgress,
    trend,
    improvementRate,
    currentScore,
    peakScore,
    monthlyProgress,
    insights: generateEvolutionInsights(trend, improvementRate, currentScore, peakScore)
  }
}

function generateEvolutionInsights(trend: string, improvementRate: number, currentScore: number, peakScore: number) {
  const insights = []
  
  if (trend === 'strong_improvement') {
    insights.push(`Voice authenticity shows strong improvement (+${improvementRate}%)`)
  } else if (trend === 'improving') {
    insights.push(`Voice authenticity is gradually improving (+${improvementRate}%)`)
  } else if (trend === 'declining') {
    insights.push(`Voice authenticity needs attention (${improvementRate}% decline)`)
  } else {
    insights.push('Voice authenticity remains stable')
  }
  
  if (currentScore >= 80) {
    insights.push('Current authenticity score is excellent')
  } else if (currentScore >= 60) {
    insights.push('Current authenticity score is good with room for improvement')
  } else {
    insights.push('Current authenticity score needs significant improvement')
  }
  
  if (currentScore === peakScore) {
    insights.push('Currently at peak performance level')
  } else if (peakScore - currentScore <= 5) {
    insights.push('Very close to peak performance level')
  }
  
  return insights
}

// Apply error handling middleware last
router.use(errorHandlerMiddleware)

export default router