import { OpenAI } from 'openai'
import { appConfig } from '../config'
import logger from '../lib/logger'
import { supabaseService } from './supabase'
import { voiceLearningEnhancedService } from './voice-learning-enhanced'
import { authenticityValidator } from './authenticity-validator'

export interface FeedbackData {
  contentId: string
  feedback: {
    authenticity_score: number
    user_rating: number
    specific_issues: string[]
    what_worked_well: string[]
    suggestions: string[]
  }
  timestamp: Date
  source: 'user' | 'automated' | 'performance'
}

export interface LearningInsight {
  pattern: string
  confidence: number
  impact: 'positive' | 'negative' | 'neutral'
  frequency: number
  examples: string[]
  recommendation: string
}

export interface AdaptationResult {
  insights: LearningInsight[]
  updatedGuidelines: string[]
  voiceModelUpdates: any
  confidenceImpact: number
  nextLearningPriorities: string[]
}

/**
 * Real-Time Learning System
 * Continuously learns from feedback and performance to improve voice authenticity
 */
export class RealTimeLearningSystem {
  private openai: OpenAI
  private learningBuffer: FeedbackData[] = []
  private lastLearningUpdate: Date = new Date()
  private readonly LEARNING_BATCH_SIZE = 10
  private readonly LEARNING_INTERVAL_HOURS = 24

  constructor() {
    this.openai = new OpenAI({
      apiKey: appConfig.openai.apiKey
    })
  }

  /**
   * Process new feedback and trigger learning if thresholds are met
   */
  async processFeedback(
    contentId: string,
    userRating: number,
    specificFeedback?: {
      issues?: string[]
      positives?: string[]
      suggestions?: string[]
    }
  ): Promise<{ processed: boolean; triggearedLearning: boolean }> {
    logger.info({ contentId, userRating, hasSpecificFeedback: !!specificFeedback }, 'Processing new feedback')

    // Get content for analysis
    const content = await this.getContentById(contentId)
    if (!content) {
      logger.warn({ contentId }, 'Could not retrieve content for feedback processing')
      return { processed: false, triggearedLearning: false }
    }

    // Analyze content authenticity
    const authenticityAnalysis = await authenticityValidator.validateAuthenticity(content.body)

    // Create feedback data
    const feedbackData: FeedbackData = {
      contentId,
      feedback: {
        authenticity_score: authenticityAnalysis.overall_authenticity_score,
        user_rating: userRating,
        specific_issues: specificFeedback?.issues || [],
        what_worked_well: specificFeedback?.positives || [],
        suggestions: specificFeedback?.suggestions || []
      },
      timestamp: new Date(),
      source: 'user'
    }

    // Add to learning buffer
    this.learningBuffer.push(feedbackData)

    // Store in database for persistence
    await this.storeFeedbackData(feedbackData)

    // Check if we should trigger learning update
    const shouldLearn = await this.shouldTriggerLearning()
    
    let triggearedLearning = false
    if (shouldLearn) {
      triggearedLearning = await this.executeLearningCycle()
    }

    logger.info({ 
      contentId, 
      bufferSize: this.learningBuffer.length,
      triggearedLearning 
    }, 'Feedback processed')

    return { processed: true, triggearedLearning }
  }

  /**
   * Process automated feedback from performance metrics
   */
  async processPerformanceFeedback(
    contentId: string,
    performanceMetrics: {
      engagement_rate: number
      viral_score: number
      comments_sentiment: number
      share_rate: number
    }
  ): Promise<void> {
    logger.info({ contentId, performanceMetrics }, 'Processing performance feedback')

    const content = await this.getContentById(contentId)
    if (!content) return

    // Convert performance metrics to feedback score (0-100)
    const performanceScore = Math.round(
      (performanceMetrics.engagement_rate * 0.3 +
       performanceMetrics.viral_score * 0.3 +
       performanceMetrics.comments_sentiment * 0.2 +
       performanceMetrics.share_rate * 0.2)
    )

    // Generate insights from high/low performance
    const performanceInsights = await this.generatePerformanceInsights(content.body, performanceMetrics)

    const feedbackData: FeedbackData = {
      contentId,
      feedback: {
        authenticity_score: performanceScore,
        user_rating: performanceScore,
        specific_issues: performanceInsights.issues,
        what_worked_well: performanceInsights.successes,
        suggestions: performanceInsights.suggestions
      },
      timestamp: new Date(),
      source: 'performance'
    }

    this.learningBuffer.push(feedbackData)
    await this.storeFeedbackData(feedbackData)

    logger.info({ contentId, performanceScore, insightCount: performanceInsights.issues.length + performanceInsights.successes.length }, 'Performance feedback processed')
  }

  /**
   * Execute a learning cycle to update voice authenticity
   */
  async executeLearningCycle(): Promise<boolean> {
    logger.info({ 
      bufferSize: this.learningBuffer.length,
      lastUpdate: this.lastLearningUpdate 
    }, 'Starting learning cycle execution')

    try {
      // Get all recent feedback for analysis
      const recentFeedback = await this.getRecentFeedback()
      const allFeedback = [...this.learningBuffer, ...recentFeedback]

      if (allFeedback.length < 5) {
        logger.info({ feedbackCount: allFeedback.length }, 'Insufficient feedback for meaningful learning')
        return false
      }

      // Analyze patterns in feedback
      const insights = await this.analyzeFeedbackPatterns(allFeedback)

      // Generate adaptations based on insights
      const adaptations = await this.generateAdaptations(insights)

      // Apply adaptations to voice learning system
      await this.applyAdaptations(adaptations)

      // Update learning timestamp
      this.lastLearningUpdate = new Date()
      this.learningBuffer = [] // Clear buffer after successful learning

      logger.info({
        insights: insights.length,
        adaptations: adaptations.updatedGuidelines.length,
        confidenceImpact: adaptations.confidenceImpact
      }, 'Learning cycle completed successfully')

      return true
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Learning cycle execution failed')
      return false
    }
  }

  /**
   * Analyze patterns in feedback to generate learning insights
   */
  private async analyzeFeedbackPatterns(feedbackData: FeedbackData[]): Promise<LearningInsight[]> {
    const analysisPrompt = `Analyze this feedback data to identify patterns for improving Andrew Tallents' voice authenticity:

FEEDBACK DATA:
${feedbackData.map((f, i) => `
Entry ${i + 1}:
- Authenticity Score: ${f.feedback.authenticity_score}
- User Rating: ${f.feedback.user_rating}
- Issues: ${f.feedback.specific_issues.join(', ')}
- What Worked: ${f.feedback.what_worked_well.join(', ')}
- Suggestions: ${f.feedback.suggestions.join(', ')}
`).join('')}

ANALYZE FOR PATTERNS:
1. What authenticity issues appear most frequently?
2. What elements consistently work well?
3. What patterns correlate with higher ratings?
4. What specific improvements are repeatedly suggested?
5. Are there emerging trends in feedback?

Return JSON array of insights:
[
  {
    "pattern": "description of pattern",
    "confidence": 0.0-1.0,
    "impact": "positive|negative|neutral", 
    "frequency": number,
    "examples": ["example1", "example2"],
    "recommendation": "specific actionable recommendation"
  }
]`

    try {
      const response = await this.openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.3,
        max_tokens: 800
      })

      const insights = JSON.parse(response.choices[0]?.message?.content || '[]')
      return Array.isArray(insights) ? insights : []
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to analyze feedback patterns')
      return []
    }
  }

  /**
   * Generate adaptations based on learning insights
   */
  private async generateAdaptations(insights: LearningInsight[]): Promise<AdaptationResult> {
    const adaptationPrompt = `Based on these learning insights, generate specific adaptations to improve Andrew Tallents' voice authenticity:

INSIGHTS:
${insights.map((insight, i) => `
${i + 1}. PATTERN: ${insight.pattern}
   IMPACT: ${insight.impact} (confidence: ${insight.confidence})
   RECOMMENDATION: ${insight.recommendation}
`).join('')}

GENERATE ADAPTATIONS:

1. UPDATED VOICE GUIDELINES: Specific guidelines that address the negative patterns and reinforce positive ones

2. VOICE MODEL UPDATES: How should the voice learning model be adjusted?

3. NEXT LEARNING PRIORITIES: What should we focus on learning about next?

Return JSON:
{
  "updatedGuidelines": ["guideline 1", "guideline 2", ...],
  "voiceModelUpdates": {
    "emphasize": ["element to emphasize more"],
    "reduce": ["element to reduce"], 
    "new_patterns": ["new patterns to learn"]
  },
  "confidenceImpact": 0.0-1.0,
  "nextLearningPriorities": ["priority 1", "priority 2", ...]
}`

    try {
      const response = await this.openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [{ role: 'user', content: adaptationPrompt }],
        temperature: 0.4,
        max_tokens: 600
      })

      const adaptations = JSON.parse(response.choices[0]?.message?.content || '{}')
      
      return {
        insights,
        updatedGuidelines: adaptations.updatedGuidelines || [],
        voiceModelUpdates: adaptations.voiceModelUpdates || {},
        confidenceImpact: adaptations.confidenceImpact || 0.5,
        nextLearningPriorities: adaptations.nextLearningPriorities || []
      }
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to generate adaptations')
      return {
        insights,
        updatedGuidelines: [],
        voiceModelUpdates: {},
        confidenceImpact: 0,
        nextLearningPriorities: []
      }
    }
  }

  /**
   * Apply adaptations to the voice learning system
   */
  private async applyAdaptations(adaptations: AdaptationResult): Promise<void> {
    logger.info({ 
      guidelineUpdates: adaptations.updatedGuidelines.length,
      voiceModelUpdates: Object.keys(adaptations.voiceModelUpdates).length
    }, 'Applying learning adaptations')

    try {
      // Store updated guidelines in database
      if (adaptations.updatedGuidelines.length > 0) {
        await supabaseService.storeUpdatedVoiceGuidelines({
          guidelines: adaptations.updatedGuidelines,
          source: 'real_time_learning',
          confidence_impact: adaptations.confidenceImpact,
          learning_insights: adaptations.insights,
          timestamp: new Date().toISOString()
        })
      }

      // Update voice learning model emphasis
      if (Object.keys(adaptations.voiceModelUpdates).length > 0) {
        await this.updateVoiceModelEmphasis(adaptations.voiceModelUpdates)
      }

      // Store learning priorities for future focus
      if (adaptations.nextLearningPriorities.length > 0) {
        await supabaseService.storeLearningPriorities({
          priorities: adaptations.nextLearningPriorities,
          generated_from: 'feedback_analysis',
          timestamp: new Date().toISOString()
        })
      }

      logger.info('Learning adaptations applied successfully')
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to apply learning adaptations')
    }
  }

  /**
   * Update voice model emphasis based on learning
   */
  private async updateVoiceModelEmphasis(updates: any): Promise<void> {
    // This would integrate with the voice learning enhanced service
    // to update model weights and emphasis areas
    
    logger.info({ updates }, 'Updating voice model emphasis')
    
    // Store the updates for next voice model generation
    await supabaseService.storeVoiceModelUpdates({
      emphasize: updates.emphasize || [],
      reduce: updates.reduce || [],
      new_patterns: updates.new_patterns || [],
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Generate performance insights from metrics
   */
  private async generatePerformanceInsights(
    content: string,
    metrics: any
  ): Promise<{ issues: string[]; successes: string[]; suggestions: string[] }> {
    const insightPrompt = `Analyze this content's performance to identify what worked and what didn't for Andrew Tallents' voice:

CONTENT:
${content.slice(0, 400)}...

PERFORMANCE METRICS:
- Engagement Rate: ${metrics.engagement_rate}%
- Viral Score: ${metrics.viral_score}
- Comments Sentiment: ${metrics.comments_sentiment}
- Share Rate: ${metrics.share_rate}%

Identify:
1. ISSUES: What voice/content elements may have limited performance?
2. SUCCESSES: What elements likely contributed to good performance?
3. SUGGESTIONS: Specific voice improvements for better performance

Return JSON:
{
  "issues": ["issue 1", "issue 2"],
  "successes": ["success 1", "success 2"], 
  "suggestions": ["suggestion 1", "suggestion 2"]
}`

    try {
      const response = await this.openai.chat.completions.create({
        model: appConfig.openai.model,
        messages: [{ role: 'user', content: insightPrompt }],
        temperature: 0.3,
        max_tokens: 400
      })

      const insights = JSON.parse(response.choices[0]?.message?.content || '{}')
      
      return {
        issues: insights.issues || [],
        successes: insights.successes || [],
        suggestions: insights.suggestions || []
      }
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to generate performance insights')
      return { issues: [], successes: [], suggestions: [] }
    }
  }

  /**
   * Check if learning cycle should be triggered
   */
  private async shouldTriggerLearning(): Promise<boolean> {
    // Check buffer size
    if (this.learningBuffer.length >= this.LEARNING_BATCH_SIZE) {
      return true
    }

    // Check time since last learning
    const hoursSinceLastUpdate = (Date.now() - this.lastLearningUpdate.getTime()) / (1000 * 60 * 60)
    if (hoursSinceLastUpdate >= this.LEARNING_INTERVAL_HOURS && this.learningBuffer.length >= 5) {
      return true
    }

    // Check for critical feedback patterns
    const criticalFeedback = this.learningBuffer.filter(f => f.feedback.user_rating < 30 || f.feedback.authenticity_score < 40)
    if (criticalFeedback.length >= 3) {
      logger.info({ criticalFeedbackCount: criticalFeedback.length }, 'Triggering learning due to critical feedback')
      return true
    }

    return false
  }

  /**
   * Get recent feedback from database
   */
  private async getRecentFeedback(): Promise<FeedbackData[]> {
    try {
      // Get feedback from last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentFeedback = await supabaseService.getRecentFeedback(sevenDaysAgo)
      
      return recentFeedback.map(f => ({
        contentId: f.content_id,
        feedback: {
          authenticity_score: f.authenticity_score,
          user_rating: f.user_rating,
          specific_issues: f.specific_issues || [],
          what_worked_well: f.what_worked_well || [],
          suggestions: f.suggestions || []
        },
        timestamp: new Date(f.timestamp),
        source: f.source as 'user' | 'automated' | 'performance'
      }))
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to get recent feedback')
      return []
    }
  }

  /**
   * Store feedback data in database
   */
  private async storeFeedbackData(feedback: FeedbackData): Promise<void> {
    try {
      await supabaseService.storeFeedbackData({
        content_id: feedback.contentId,
        authenticity_score: feedback.feedback.authenticity_score,
        user_rating: feedback.feedback.user_rating,
        specific_issues: feedback.feedback.specific_issues,
        what_worked_well: feedback.feedback.what_worked_well,
        suggestions: feedback.feedback.suggestions,
        source: feedback.source,
        timestamp: feedback.timestamp.toISOString()
      })
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to store feedback data')
    }
  }

  /**
   * Get content by ID for analysis
   */
  private async getContentById(contentId: string): Promise<{ body: string; title?: string } | null> {
    try {
      // This would retrieve content from your content storage system
      const content = await supabaseService.getContentById(contentId)
      return content ? { body: content.body, title: content.title } : null
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error), contentId }, 'Failed to get content by ID')
      return null
    }
  }

  /**
   * Get current learning metrics
   */
  async getLearningMetrics(): Promise<{
    bufferSize: number
    lastUpdate: Date
    totalFeedbackProcessed: number
    avgAuthenticityImprovement: number
    learningCyclesCompleted: number
  }> {
    try {
      const metrics = await supabaseService.getLearningMetrics()
      
      return {
        bufferSize: this.learningBuffer.length,
        lastUpdate: this.lastLearningUpdate,
        totalFeedbackProcessed: metrics.total_feedback_processed || 0,
        avgAuthenticityImprovement: metrics.avg_authenticity_improvement || 0,
        learningCyclesCompleted: metrics.learning_cycles_completed || 0
      }
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to get learning metrics')
      return {
        bufferSize: this.learningBuffer.length,
        lastUpdate: this.lastLearningUpdate,
        totalFeedbackProcessed: 0,
        avgAuthenticityImprovement: 0,
        learningCyclesCompleted: 0
      }
    }
  }

  /**
   * Manual trigger for learning cycle (for testing/admin use)
   */
  async triggerManualLearning(): Promise<boolean> {
    logger.info('Manual learning cycle triggered')
    return await this.executeLearningCycle()
  }
}

export const realTimeLearningSystem = new RealTimeLearningSystem()