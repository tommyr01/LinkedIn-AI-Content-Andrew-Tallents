import { OpenAI } from 'openai'
import { appConfig } from '../config'
import logger from '../lib/logger'
import { supabaseService } from './supabase'
import { historicalAnalysisEnhancedService } from './historical-analysis-enhanced'
import { voiceLearningEnhancedService } from './voice-learning-enhanced'

const openai = new OpenAI({
  apiKey: appConfig.openai.apiKey,
})

export interface PerformanceInsightsOptions {
  timeframeDays?: number
  includeVoiceAnalysis?: boolean
  includeContentPatterns?: boolean
  includePredictions?: boolean
  analysisDepth?: 'basic' | 'comprehensive' | 'strategic'
}

export interface PerformanceInsights {
  insights: string[]
  recommendations: string[]
  voiceGuidance: string[]
  contentStrategy: string[]
  performancePredictions: {
    expectedEngagement: number
    confidenceLevel: number
    successFactors: string[]
    riskFactors: string[]
  }
  confidenceScore: number
  generatedAt: string
}

class PerformanceInsightsService {
  /**
   * Generate AI-powered performance insights for content strategy
   */
  async generatePerformanceInsights(
    topic: string,
    options: PerformanceInsightsOptions = {}
  ): Promise<PerformanceInsights> {
    const {
      timeframeDays = 90,
      includeVoiceAnalysis = true,
      includeContentPatterns = true,
      includePredictions = true,
      analysisDepth = 'comprehensive'
    } = options

    logger.info({
      topic,
      timeframeDays,
      analysisDepth,
      includeVoiceAnalysis,
      includeContentPatterns,
      includePredictions
    }, 'Generating performance insights')

    try {
      // Gather data for analysis
      const [performanceData, voiceData, variantsData] = await Promise.all([
        this.gatherPerformanceData(topic, timeframeDays),
        includeVoiceAnalysis ? this.gatherVoiceData() : null,
        includeContentPatterns ? this.gatherVariantsData(timeframeDays) : null
      ])

      // Generate comprehensive insights using AI
      const insights = await this.generateAIInsights(
        topic,
        performanceData,
        voiceData,
        variantsData,
        analysisDepth
      )

      logger.info({
        topic,
        insightCount: insights.insights.length,
        recommendationCount: insights.recommendations.length,
        confidenceScore: insights.confidenceScore
      }, 'Performance insights generated successfully')

      return insights
    } catch (error) {
      logger.error({
        topic,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to generate performance insights')
      throw error
    }
  }

  /**
   * Generate strategic insights for specific performance targets
   */
  async generateStrategicInsights(
    topic: string,
    performanceTarget: number,
    currentPerformance: number
  ): Promise<{
    strategicRecommendations: string[]
    tacticalActions: string[]
    riskAssessment: string[]
    confidenceLevel: number
  }> {
    logger.info({
      topic,
      performanceTarget,
      currentPerformance,
      gapPercentage: Math.round(((performanceTarget - currentPerformance) / currentPerformance) * 100)
    }, 'Generating strategic insights for performance target')

    try {
      const historicalInsights = await historicalAnalysisEnhancedService.generateComprehensiveInsights(
        topic,
        { maxPosts: 50, timeframeDays: 180, includeComments: true, forceRefresh: false }
      )

      const voiceModel = await voiceLearningEnhancedService.generateEnhancedVoiceModel()

      const prompt = `As Andrew Tallents' strategic content advisor, analyze the performance gap and provide strategic guidance.

PERFORMANCE ANALYSIS:
- Topic: ${topic}
- Current Average Performance: ${currentPerformance} engagement score
- Target Performance: ${performanceTarget} engagement score
- Performance Gap: ${Math.round(((performanceTarget - currentPerformance) / currentPerformance) * 100)}%

HISTORICAL CONTEXT:
- Historical Average: ${historicalInsights.performance_context.avg_engagement_score}
- Top Performance: ${historicalInsights.performance_context.top_performing_score}
- Confidence Level: ${historicalInsights.confidence_level}%

CURRENT VOICE PROFILE:
- Authenticity Score: ${voiceModel.voiceProfile.authenticity_score_avg}/100
- Authority Score: ${voiceModel.voiceProfile.authority_score_avg}/100
- Key Strengths: ${voiceModel.strengthFactors.slice(0, 3).join(', ')}
- Improvement Areas: ${voiceModel.improvementAreas.slice(0, 2).join(', ')}

TOP PERFORMING PATTERNS:
${historicalInsights.content_patterns.engagement_triggers.slice(0, 5).map((trigger, i) => `${i + 1}. ${trigger}`).join('\\n')}

Provide strategic guidance in exactly this JSON format:
{
  "strategicRecommendations": ["3-4 high-level strategic recommendations"],
  "tacticalActions": ["4-5 specific tactical actions to implement"],
  "riskAssessment": ["2-3 potential risks and mitigation strategies"],
  "confidenceLevel": 0.85
}`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      })

      const result = JSON.parse(response.choices[0].message.content || '{}')

      logger.info({
        topic,
        strategicRecommendations: result.strategicRecommendations?.length || 0,
        tacticalActions: result.tacticalActions?.length || 0,
        confidenceLevel: result.confidenceLevel
      }, 'Strategic insights generated successfully')

      return result
    } catch (error) {
      logger.error({
        topic,
        performanceTarget,
        currentPerformance,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to generate strategic insights')
      throw error
    }
  }

  /**
   * Predict content performance based on historical data and patterns
   */
  async predictContentPerformance(
    content: string,
    historicalInsights?: any
  ): Promise<{
    predictedEngagement: number
    confidenceScore: number
    strengthFactors: string[]
    improvementSuggestions: string[]
    similarPostPerformance: {
      avgEngagement: number
      topPerformance: number
      similarityScore: number
    }
  }> {
    logger.info({
      contentLength: content.length,
      hasHistoricalInsights: !!historicalInsights
    }, 'Predicting content performance')

    try {
      // Base prediction without historical data
      let predictedEngagement = 50
      let confidenceScore = 0.6
      let strengthFactors = ['Well-structured content', 'Clear messaging']
      let improvementSuggestions = ['Add personal story elements', 'Include call-to-action']

      if (historicalInsights && historicalInsights.performanceContext) {
        // Use historical performance data to improve predictions
        const avgPerformance = historicalInsights.performanceContext.avgEngagement || 50
        const topPerformance = historicalInsights.performanceContext.topPerformingScore || 100
        
        // Analyze content characteristics
        const wordCount = content.split(/\s+/).length
        const hasQuestion = content.includes('?')
        const hasPersonalStory = /\b(I|my|our|we|me)\b/i.test(content)
        const hasEmotionalWords = /\b(struggle|challenge|journey|realize|discover|breakthrough)\b/i.test(content)
        
        // Calculate similarity to top performers
        let similarityScore = 0.5
        if (historicalInsights.patterns) {
          const optimalWordCount = historicalInsights.patterns.avgWordCount
          const wordCountScore = Math.max(0, 1 - Math.abs(wordCount - optimalWordCount) / optimalWordCount)
          
          const engagementTriggers = historicalInsights.patterns.engagementTriggers || []
          const triggerMatches = engagementTriggers.filter((trigger: string) => 
            content.toLowerCase().includes(trigger.toLowerCase())
          ).length
          
          similarityScore = (wordCountScore + (triggerMatches / Math.max(1, engagementTriggers.length))) / 2
        }
        
        // Adjust prediction based on patterns
        let performanceMultiplier = 1.0
        
        if (hasPersonalStory) performanceMultiplier += 0.2
        if (hasQuestion) performanceMultiplier += 0.1
        if (hasEmotionalWords) performanceMultiplier += 0.15
        if (similarityScore > 0.7) performanceMultiplier += 0.25
        
        predictedEngagement = Math.round(avgPerformance * performanceMultiplier)
        confidenceScore = Math.min(0.95, 0.7 + (similarityScore * 0.3))
        
        // Generate specific strength factors
        strengthFactors = []
        if (hasPersonalStory) strengthFactors.push('Contains personal story elements')
        if (hasQuestion) strengthFactors.push('Uses engaging questions')
        if (hasEmotionalWords) strengthFactors.push('Incorporates emotional triggers')
        if (similarityScore > 0.6) strengthFactors.push('Similar to high-performing content')
        if (wordCount >= 120 && wordCount <= 250) strengthFactors.push('Optimal content length')
        
        if (strengthFactors.length === 0) {
          strengthFactors = ['Professional tone', 'Clear messaging']
        }
        
        // Generate improvement suggestions
        improvementSuggestions = []
        if (!hasPersonalStory) improvementSuggestions.push('Add personal experience or story')
        if (!hasQuestion) improvementSuggestions.push('Include thought-provoking questions')
        if (wordCount < 100) improvementSuggestions.push('Expand content with more details')
        if (wordCount > 300) improvementSuggestions.push('Consider shortening for better engagement')
        if (!hasEmotionalWords) improvementSuggestions.push('Add emotional connection words')
        
        if (improvementSuggestions.length === 0) {
          improvementSuggestions = ['Consider adding call-to-action', 'Test different opening hooks']
        }
      }
      
      const result = {
        predictedEngagement,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        strengthFactors,
        improvementSuggestions,
        similarPostPerformance: {
          avgEngagement: historicalInsights?.performanceContext?.avgEngagement || 50,
          topPerformance: historicalInsights?.performanceContext?.topPerformingScore || 100,
          similarityScore: Math.round((historicalInsights ? 0.7 : 0.5) * 100) / 100
        }
      }

      logger.info({
        predictedEngagement: result.predictedEngagement,
        confidenceScore: result.confidenceScore,
        strengthFactorsCount: result.strengthFactors.length,
        improvementsCount: result.improvementSuggestions.length
      }, 'Content performance prediction completed')

      return result
    } catch (error) {
      logger.error({
        contentLength: content.length,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to predict content performance')
      
      // Return fallback prediction
      return {
        predictedEngagement: 50,
        confidenceScore: 0.5,
        strengthFactors: ['Content structure'],
        improvementSuggestions: ['Review and optimize'],
        similarPostPerformance: {
          avgEngagement: 50,
          topPerformance: 100,
          similarityScore: 0.5
        }
      }
    }
  }

  /**
   * Analyze content variant performance predictions
   */
  async analyzeVariantPerformance(
    variants: Array<{
      content: string
      agent: string
      predictedScore: number
    }>
  ): Promise<{
    bestVariant: number
    performanceAnalysis: Array<{
      variant: number
      strengths: string[]
      improvements: string[]
      score: number
    }>
    recommendation: string
  }> {
    logger.info({
      variantCount: variants.length
    }, 'Analyzing content variant performance')

    try {
      const prompt = `As Andrew Tallents' content performance analyst, evaluate these 3 content variants for LinkedIn.

${variants.map((v, i) => `
VARIANT ${i + 1} (${v.agent}):
Predicted Score: ${v.predictedScore}
Content: "${v.content.slice(0, 300)}..."
`).join('\\n')}

Analyze each variant and provide recommendations in this JSON format:
{
  "bestVariant": 1,
  "performanceAnalysis": [
    {
      "variant": 1,
      "strengths": ["specific strength 1", "specific strength 2"],
      "improvements": ["specific improvement 1", "specific improvement 2"],
      "score": 85
    }
  ],
  "recommendation": "Overall strategic recommendation for content selection and optimization"
}`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800
      })

      const result = JSON.parse(response.choices[0].message.content || '{}')

      logger.info({
        bestVariant: result.bestVariant,
        analysisCount: result.performanceAnalysis?.length || 0
      }, 'Variant performance analysis completed')

      return result
    } catch (error) {
      logger.error({
        variantCount: variants.length,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to analyze variant performance')
      throw error
    }
  }

  private async gatherPerformanceData(topic: string, timeframeDays: number) {
    try {
      const posts = await supabaseService.getTopPerformingPosts(100, timeframeDays)
      
      // Filter posts related to the topic
      const relatedPosts = posts.filter(post => 
        post.content_text.toLowerCase().includes(topic.toLowerCase()) ||
        this.isTopicRelated(post.content_text, topic)
      )

      return {
        totalPosts: posts.length,
        relatedPosts: relatedPosts.length,
        avgViralScore: posts.length > 0 ? posts.reduce((sum, p) => sum + (p.viral_score || 0), 0) / posts.length : 0,
        topViralScore: posts.length > 0 ? Math.max(...posts.map(p => p.viral_score || 0)) : 0,
        avgEngagementRate: posts.length > 0 ? posts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / posts.length : 0,
        performanceDistribution: {
          top_10_percent: posts.filter(p => p.performance_tier === 'top_10_percent').length,
          top_25_percent: posts.filter(p => p.performance_tier === 'top_25_percent').length,
          average: posts.filter(p => p.performance_tier === 'average').length,
          below_average: posts.filter(p => p.performance_tier === 'below_average').length
        },
        topicSpecific: relatedPosts.length > 0 ? {
          avgViralScore: relatedPosts.reduce((sum, p) => sum + (p.viral_score || 0), 0) / relatedPosts.length,
          topViralScore: Math.max(...relatedPosts.map(p => p.viral_score || 0)),
          avgEngagementRate: relatedPosts.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) / relatedPosts.length
        } : null
      }
    } catch (error) {
      logger.warn({
        topic,
        timeframeDays,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to gather performance data')
      return null
    }
  }

  private async gatherVoiceData() {
    try {
      const voiceData = await supabaseService.getVoiceLearningData('post', 100)
      
      return {
        totalAnalyses: voiceData.length,
        avgAuthenticity: voiceData.length > 0 ? voiceData.reduce((sum, v) => sum + (v.authenticity_score || 0), 0) / voiceData.length : 0,
        avgAuthority: voiceData.length > 0 ? voiceData.reduce((sum, v) => sum + (v.authority_score || 0), 0) / voiceData.length : 0,
        avgVulnerability: voiceData.length > 0 ? voiceData.reduce((sum, v) => sum + (v.vulnerability_score || 0), 0) / voiceData.length : 0,
        avgEngagementPotential: voiceData.length > 0 ? voiceData.reduce((sum, v) => sum + (v.engagement_potential || 0), 0) / voiceData.length : 0,
        recentTrend: this.calculateVoiceTrend(voiceData)
      }
    } catch (error) {
      logger.warn({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to gather voice data')
      return null
    }
  }

  private async gatherVariantsData(timeframeDays: number) {
    try {
      const variantsData = await supabaseService.getContentVariantsTracking(timeframeDays)
      const postedVariants = variantsData.filter(v => v.was_posted && v.prediction_accuracy !== null)
      
      return {
        totalVariants: variantsData.length,
        postedVariants: postedVariants.length,
        avgPredictionAccuracy: postedVariants.length > 0 ? postedVariants.reduce((sum, v) => sum + (v.prediction_accuracy || 0), 0) / postedVariants.length : 0,
        bestPerformingAgent: this.findBestPerformingAgent(postedVariants),
        successRate: postedVariants.length > 0 ? (postedVariants.filter(v => (v.prediction_accuracy || 0) > 0.7).length / postedVariants.length) * 100 : 0
      }
    } catch (error) {
      logger.warn({
        timeframeDays,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to gather variants data')
      return null
    }
  }

  private async generateAIInsights(
    topic: string,
    performanceData: any,
    voiceData: any,
    variantsData: any,
    analysisDepth: string
  ): Promise<PerformanceInsights> {
    const prompt = `As Andrew Tallents' content performance advisor, analyze the data and provide strategic insights for "${topic}".

PERFORMANCE DATA:
${performanceData ? `
- Total Posts Analyzed: ${performanceData.totalPosts}
- Average Viral Score: ${Math.round(performanceData.avgViralScore)}
- Top Performance: ${Math.round(performanceData.topViralScore)}
- Topic-Specific Performance: ${performanceData.topicSpecific ? `${Math.round(performanceData.topicSpecific.avgViralScore)} avg viral score` : 'No topic-specific data'}
- Performance Distribution: ${performanceData.performanceDistribution.top_10_percent} top 10%, ${performanceData.performanceDistribution.top_25_percent} top 25%
` : 'Performance data unavailable'}

VOICE ANALYSIS DATA:
${voiceData ? `
- Total Voice Analyses: ${voiceData.totalAnalyses}
- Average Authenticity: ${Math.round(voiceData.avgAuthenticity)}/100
- Average Authority: ${Math.round(voiceData.avgAuthority)}/100
- Average Vulnerability: ${Math.round(voiceData.avgVulnerability)}/100
- Engagement Potential: ${Math.round(voiceData.avgEngagementPotential)}/100
- Recent Trend: ${voiceData.recentTrend}
` : 'Voice analysis data unavailable'}

VARIANT GENERATION DATA:
${variantsData ? `
- Total Variants Generated: ${variantsData.totalVariants}
- Posted Variants: ${variantsData.postedVariants}
- Prediction Accuracy: ${Math.round(variantsData.avgPredictionAccuracy * 100)}%
- Best Performing Agent: ${variantsData.bestPerformingAgent}
- Success Rate: ${Math.round(variantsData.successRate)}%
` : 'Variant data unavailable'}

Analysis Depth: ${analysisDepth}

Provide insights in exactly this JSON format:
{
  "insights": [
    "Key insight about current performance patterns",
    "Key insight about voice effectiveness", 
    "Key insight about content strategy",
    "Key insight about audience engagement"
  ],
  "recommendations": [
    "Strategic recommendation for improving performance",
    "Tactical recommendation for voice optimization",
    "Content format recommendation",
    "Timing and engagement recommendation"
  ],
  "voiceGuidance": [
    "Voice tone guidance based on data",
    "Authenticity enhancement suggestion",
    "Authority building recommendation"
  ],
  "contentStrategy": [
    "Topic approach strategy",
    "Format optimization strategy", 
    "Engagement optimization strategy"
  ],
  "performancePredictions": {
    "expectedEngagement": 150,
    "confidenceLevel": 0.85,
    "successFactors": ["factor 1", "factor 2", "factor 3"],
    "riskFactors": ["risk 1", "risk 2"]
  },
  "confidenceScore": 0.87
}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1500
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    result.generatedAt = new Date().toISOString()

    return result
  }

  private isTopicRelated(content: string, topic: string): boolean {
    const topicWords = topic.toLowerCase().split(' ')
    const contentLower = content.toLowerCase()
    
    // Check if at least 50% of topic words appear in content
    const matchingWords = topicWords.filter(word => contentLower.includes(word))
    return matchingWords.length >= Math.ceil(topicWords.length * 0.5)
  }

  private calculateVoiceTrend(voiceData: any[]): string {
    if (voiceData.length < 10) return 'insufficient_data'
    
    const sortedData = voiceData.sort((a, b) => 
      new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime()
    )
    
    const first = sortedData.slice(0, Math.floor(sortedData.length / 3))
    const last = sortedData.slice(-Math.floor(sortedData.length / 3))
    
    const firstAvg = first.reduce((sum, v) => sum + (v.authenticity_score || 0), 0) / first.length
    const lastAvg = last.reduce((sum, v) => sum + (v.authenticity_score || 0), 0) / last.length
    
    const improvement = ((lastAvg - firstAvg) / firstAvg) * 100
    
    if (improvement > 10) return 'strong_improvement'
    if (improvement > 3) return 'improving'
    if (improvement < -10) return 'declining'
    if (improvement < -3) return 'slight_decline'
    return 'stable'
  }

  private findBestPerformingAgent(postedVariants: any[]): string {
    if (postedVariants.length === 0) return 'none'
    
    const agentStats = postedVariants.reduce((acc, v) => {
      const agent = v.agent_name
      if (!acc[agent]) acc[agent] = { total: 0, count: 0 }
      acc[agent].total += v.prediction_accuracy || 0
      acc[agent].count += 1
      return acc
    }, {} as Record<string, { total: number, count: number }>)
    
    return Object.entries(agentStats).reduce((best, [agent, stats]) => {
      const avgForAgent = stats.total / stats.count
      return avgForAgent > best.avg ? { agent, avg: avgForAgent } : best
    }, { agent: 'none', avg: 0 }).agent
  }
}

export const performanceInsightsService = new PerformanceInsightsService()