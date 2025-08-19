import { OpenAI } from 'openai'
import { appConfig } from '../config'
import logger from '../lib/logger'
import { supabaseService } from './supabase'
import { voiceLearningEnhancedService } from './voice-learning-enhanced'
import { performanceInsightsService } from './performance-insights'
import { createHash } from 'crypto'

export interface EnhancedHistoricalPost {
  id: string
  post_id: string
  content_text: string
  posted_at: string
  total_reactions: number
  like_count: number
  love_count: number
  support_count: number
  celebrate_count: number
  insight_count: number
  funny_count: number
  comments_count: number
  reposts_count: number
  shares_count: number
  viral_score: number
  performance_tier: string
  word_count: number
  character_count: number
  hashtags: string[]
  mentions: string[]
  post_type: string
}

export interface ComprehensiveHistoricalInsight {
  query_topic: string
  query_hash: string
  
  // Post analysis
  related_posts: EnhancedHistoricalPost[]
  top_performers: EnhancedHistoricalPost[]
  
  // Performance patterns
  performance_context: {
    avg_engagement: number
    top_performing_score: number
    performance_benchmark: number
    total_posts_analyzed: number
    timeframe_days: number
  }
  
  // Content patterns
  content_patterns: {
    avg_word_count: number
    optimal_word_count_range: [number, number]
    common_openings: string[]
    common_structures: string[]
    best_performing_formats: string[]
    engagement_triggers: string[]
    optimal_hashtag_count: number
    story_vs_advice_ratio: number
  }
  
  // Voice patterns (enhanced)
  voice_patterns: {
    dominant_tone: string
    authenticity_score_avg: number
    authority_score_avg: number
    vulnerability_score_avg: number
    key_authority_signals: string[]
    emotional_triggers: string[]
    personal_story_frequency: number
    question_usage_frequency: number
  }
  
  // Performance recommendations
  performance_recommendations: {
    content_structure_advice: string[]
    voice_tone_guidance: string[]
    engagement_optimization: string[]
    timing_suggestions: string[]
    format_recommendations: string[]
  }
  
  // Metadata
  confidence_level: number
  analysis_freshness: number
  similar_posts_count: number
  cache_expires_at: string
}

export class HistoricalAnalysisEnhancedService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: appConfig.openai.apiKey
    })
  }

  /**
   * Generate comprehensive historical insights with performance optimization
   */
  async generateComprehensiveInsights(
    topic: string,
    options: {
      maxPosts?: number
      timeframeDays?: number
      includeComments?: boolean
      forceRefresh?: boolean
    } = {}
  ): Promise<ComprehensiveHistoricalInsight> {
    const {
      maxPosts = 50,
      timeframeDays = 365,
      includeComments = false,
      forceRefresh = false
    } = options

    const queryHash = this.generateQueryHash(topic, maxPosts, timeframeDays)

    logger.info({ 
      topic, 
      queryHash, 
      maxPosts, 
      timeframeDays,
      forceRefresh
    }, 'Generating comprehensive historical insights')

    try {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedInsight = await supabaseService.getHistoricalInsight(queryHash)
        if (cachedInsight) {
          logger.info({ topic, queryHash }, 'Returning cached historical insight')
          return this.convertCachedInsightToComprehensive(cachedInsight)
        }
      }

      // Step 1: Get Andrew's historical posts from new performance analytics table
      const historicalPosts = await this.getHistoricalPerformanceData(timeframeDays, maxPosts)
      
      if (historicalPosts.length === 0) {
        logger.warn({ topic }, 'No historical performance data found')
        return this.createEmptyInsight(topic, queryHash)
      }

      logger.info({ 
        topic, 
        totalPosts: historicalPosts.length,
        avgViralScore: Math.round(historicalPosts.reduce((sum, p) => sum + p.viral_score, 0) / historicalPosts.length)
      }, 'Historical posts loaded from performance analytics')

      // Step 2: Find topic-relevant posts using semantic similarity
      const relevantPosts = await this.findTopicRelevantPosts(topic, historicalPosts)
      
      if (relevantPosts.length === 0) {
        logger.warn({ topic }, 'No topic-relevant posts found')
        return this.createEmptyInsight(topic, queryHash)
      }

      // Step 3: Identify top performers from relevant posts
      const topPerformers = relevantPosts
        .sort((a, b) => b.viral_score - a.viral_score)
        .slice(0, Math.min(10, Math.ceil(relevantPosts.length * 0.3)))

      logger.info({
        topic,
        relevantPosts: relevantPosts.length,
        topPerformers: topPerformers.length,
        topScore: topPerformers[0]?.viral_score || 0
      }, 'Topic analysis completed')

      // Step 4: Analyze content patterns
      const contentPatterns = await this.analyzeContentPatterns(topPerformers)

      // Step 5: Analyze voice patterns using enhanced voice learning
      const voicePatterns = await this.analyzeVoicePatterns(topPerformers, includeComments)

      // Step 6: Generate performance recommendations
      const performanceRecommendations = await this.generatePerformanceRecommendations(
        topic,
        topPerformers,
        contentPatterns,
        voicePatterns
      )

      // Step 7: Calculate performance context
      const performanceContext = this.calculatePerformanceContext(relevantPosts, topPerformers)

      // Step 8: Build comprehensive insight
      const insight: ComprehensiveHistoricalInsight = {
        query_topic: topic,
        query_hash: queryHash,
        related_posts: relevantPosts,
        top_performers: topPerformers,
        performance_context: {
          ...performanceContext,
          timeframe_days: timeframeDays,
          total_posts_analyzed: historicalPosts.length
        },
        content_patterns: contentPatterns,
        voice_patterns: voicePatterns,
        performance_recommendations: performanceRecommendations,
        confidence_level: this.calculateConfidenceLevel(relevantPosts.length, topPerformers.length),
        analysis_freshness: 100,
        similar_posts_count: relevantPosts.length,
        cache_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }

      // Step 9: Cache the insight
      await this.cacheInsight(insight)

      logger.info({
        topic,
        confidenceLevel: insight.confidence_level,
        performanceBenchmark: insight.performance_context.performance_benchmark,
        recommendationsCount: insight.performance_recommendations.content_structure_advice.length
      }, 'Comprehensive historical insights generated successfully')

      return insight
    } catch (error) {
      logger.error({ 
        topic, 
        error: error instanceof Error ? error.message : String(error) 
      }, 'Failed to generate comprehensive historical insights')
      throw error
    }
  }

  /**
   * Analyze Andrew's last 100+ posts and populate performance analytics
   */
  async populateHistoricalPerformanceData(): Promise<{
    postsProcessed: number
    voiceAnalysisCompleted: number
    errors: number
  }> {
    logger.info('Starting historical performance data population')

    try {
      // Get Andrew's posts from the connections table
      const posts = await this.getAndrewsPostsFromConnections()
      
      if (posts.length === 0) {
        throw new Error('No posts found for Andrew in connections data')
      }

      logger.info({ totalPosts: posts.length }, 'Found Andrew\'s posts for analysis')

      let postsProcessed = 0
      let voiceAnalysisCompleted = 0
      let errors = 0

      // Process in batches to avoid overwhelming the system
      const batchSize = 10
      for (let i = 0; i < posts.length; i += batchSize) {
        const batch = posts.slice(i, i + batchSize)
        
        logger.info({ 
          batchStart: i + 1, 
          batchEnd: Math.min(i + batchSize, posts.length),
          totalPosts: posts.length
        }, 'Processing historical data batch')

        for (const post of batch) {
          try {
            // Save to performance analytics table
            const saved = await supabaseService.savePostPerformance({
              post_id: post.post_urn,
              platform: 'linkedin',
              post_url: post.post_url,
              content_text: post.post_text || '',
              total_reactions: post.total_reactions || 0,
              like_count: post.likes || 0,
              love_count: post.love || 0,
              support_count: post.support || 0,
              celebrate_count: post.celebrate || 0,
              insight_count: post.insight || 0,
              funny_count: 0, // Not available in current schema
              comments_count: post.comments_count || 0,
              reposts_count: post.reposts || 0,
              shares_count: 0, // Not available in current schema
              posted_at: post.posted_date ? new Date(post.posted_date) : undefined,
              post_type: post.post_type || 'regular'
            })

            if (saved) {
              postsProcessed++

              // Analyze voice patterns if content is substantial
              if (post.post_text && post.post_text.length > 50) {
                try {
                  const voiceAnalysis = await voiceLearningEnhancedService.analyzeVoicePatterns(
                    post.post_text,
                    {
                      content_type: 'post',
                      context: `Historical post analysis - ${post.post_type || 'regular'} post`,
                      performance_data: {
                        engagement_score: (post.total_reactions || 0) + (post.comments_count || 0) * 3 + (post.reposts || 0) * 5,
                        viral_score: (post.total_reactions || 0) + (post.comments_count || 0) * 3 + (post.reposts || 0) * 5,
                        performance_tier: 'unknown' // Will be calculated later
                      }
                    }
                  )

                  // Save voice learning data
                  await supabaseService.saveVoiceLearningData({
                    content_id: post.post_urn,
                    content_type: 'post',
                    content_text: post.post_text,
                    content_context: `Historical LinkedIn post - ${post.post_type || 'regular'}`,
                    tone_analysis: voiceAnalysis.tone_analysis,
                    writing_style: voiceAnalysis.writing_style,
                    vocabulary_patterns: voiceAnalysis.vocabulary_patterns,
                    structural_patterns: voiceAnalysis.structural_patterns,
                    authenticity_score: voiceAnalysis.authenticity_score,
                    authority_score: voiceAnalysis.authority_score,
                    vulnerability_score: voiceAnalysis.vulnerability_score,
                    engagement_potential: voiceAnalysis.engagement_potential,
                    confidence_score: voiceAnalysis.confidence_score,
                    content_date: post.posted_date ? new Date(post.posted_date) : undefined
                  })

                  voiceAnalysisCompleted++
                } catch (voiceError) {
                  logger.warn({ 
                    postId: post.post_urn, 
                    error: voiceError instanceof Error ? voiceError.message : String(voiceError)
                  }, 'Failed voice analysis for historical post')
                }
              }

              // Rate limiting delay
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          } catch (error) {
            logger.error({ 
              postId: post.post_urn, 
              error: error instanceof Error ? error.message : String(error)
            }, 'Failed to process historical post')
            errors++
          }
        }

        // Longer delay between batches
        if (i + batchSize < posts.length) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // Update performance tiers after processing
      await supabaseService.updatePerformanceTiers()

      logger.info({
        postsProcessed,
        voiceAnalysisCompleted,
        errors,
        totalAttempted: posts.length
      }, 'Historical performance data population completed')

      return {
        postsProcessed,
        voiceAnalysisCompleted,
        errors
      }
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error) 
      }, 'Failed to populate historical performance data')
      throw error
    }
  }

  /**
   * Get historical performance data from the new analytics table
   */
  private async getHistoricalPerformanceData(
    timeframeDays: number, 
    maxPosts: number
  ): Promise<EnhancedHistoricalPost[]> {
    try {
      const posts = await supabaseService.getTopPerformingPosts(maxPosts, timeframeDays)
      
      return posts.map(post => ({
        id: post.id.toString(),
        post_id: post.post_id,
        content_text: post.content_text || '',
        posted_at: post.posted_at,
        total_reactions: post.total_reactions || 0,
        like_count: post.like_count || 0,
        love_count: post.love_count || 0,
        support_count: post.support_count || 0,
        celebrate_count: post.celebrate_count || 0,
        insight_count: post.insight_count || 0,
        funny_count: post.funny_count || 0,
        comments_count: post.comments_count || 0,
        reposts_count: post.reposts_count || 0,
        shares_count: post.shares_count || 0,
        viral_score: post.viral_score || 0,
        performance_tier: post.performance_tier || 'unknown',
        word_count: post.word_count || 0,
        character_count: post.character_count || 0,
        hashtags: post.hashtags || [],
        mentions: post.mentions || [],
        post_type: post.post_type || 'regular'
      }))
    } catch (error) {
      logger.error({ error }, 'Failed to get historical performance data')
      return []
    }
  }

  /**
   * Get Andrew's posts from the connections table
   */
  private async getAndrewsPostsFromConnections(): Promise<any[]> {
    // This will use the existing supabase service to get Andrew's posts
    // Implementation depends on the specific table structure
    const supabase = supabaseService['client']
    
    const { data: posts, error } = await supabase
      .from('connection_posts')
      .select(`
        post_urn,
        post_text,
        posted_date,
        total_reactions,
        likes,
        support,
        love,
        insight,
        celebrate,
        comments_count,
        reposts,
        post_type,
        post_url,
        author_first_name,
        author_last_name
      `)
      .eq('author_first_name', 'Andrew')
      .eq('author_last_name', 'Tallents')
      .not('post_text', 'is', null)
      .order('posted_date', { ascending: false })
      .limit(150)

    if (error) {
      throw error
    }

    return posts || []
  }

  /**
   * Find topic-relevant posts using semantic similarity
   */
  private async findTopicRelevantPosts(
    topic: string,
    historicalPosts: EnhancedHistoricalPost[]
  ): Promise<EnhancedHistoricalPost[]> {
    try {
      // Generate embedding for the topic
      const topicEmbedding = await this.generateEmbedding(topic)
      
      // Calculate similarity for each post
      const postsWithSimilarity = []
      
      for (const post of historicalPosts) {
        try {
          const postEmbedding = await this.generateEmbedding(post.content_text.slice(0, 1500))
          const similarity = this.cosineSimilarity(topicEmbedding, postEmbedding)
          
          if (similarity > 0.7) { // Only include posts with reasonable similarity
            postsWithSimilarity.push({
              ...post,
              similarity_score: similarity
            })
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (embeddingError) {
          logger.warn({ postId: post.post_id }, 'Failed to generate embedding for post')
        }
      }

      // Sort by combination of similarity and performance
      return postsWithSimilarity
        .sort((a, b) => {
          const scoreA = (a.similarity_score || 0) * 0.7 + (a.viral_score / 1000) * 0.3
          const scoreB = (b.similarity_score || 0) * 0.7 + (b.viral_score / 1000) * 0.3
          return scoreB - scoreA
        })
        .slice(0, 20) // Limit to top 20 most relevant posts
    } catch (error) {
      logger.error({ topic, error }, 'Failed to find topic-relevant posts')
      return historicalPosts.slice(0, 10) // Fallback to top performing posts
    }
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.slice(0, 8000)
    })

    return response.data[0].embedding
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, a_i, i) => sum + a_i * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, a_i) => sum + a_i * a_i, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, b_i) => sum + b_i * b_i, 0))
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0
    
    return dotProduct / (magnitudeA * magnitudeB)
  }

  // Additional methods for content analysis, voice patterns, recommendations, etc.
  // [Implementation continues with specific pattern analysis methods...]

  /**
   * Generate a hash for caching queries
   */
  private generateQueryHash(topic: string, maxPosts: number, timeframeDays: number): string {
    const normalizedTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const hashInput = `${normalizedTopic}_${maxPosts}_${timeframeDays}`
    return createHash('md5').update(hashInput).digest('hex')
  }

  /**
   * Cache insight in the database
   */
  private async cacheInsight(insight: ComprehensiveHistoricalInsight): Promise<void> {
    await supabaseService.saveHistoricalInsight({
      query_topic: insight.query_topic,
      query_hash: insight.query_hash,
      related_posts_count: insight.related_posts.length,
      top_performers_count: insight.top_performers.length,
      analysis_timeframe_days: insight.performance_context.timeframe_days,
      content_patterns: insight.content_patterns,
      voice_patterns: insight.voice_patterns,
      performance_patterns: insight.performance_recommendations,
      avg_engagement_score: insight.performance_context.avg_engagement,
      top_performing_score: insight.performance_context.top_performing_score,
      performance_benchmark: insight.performance_context.performance_benchmark,
      related_post_ids: insight.related_posts.map(p => p.post_id),
      top_performer_ids: insight.top_performers.map(p => p.post_id),
      confidence_level: insight.confidence_level,
      expires_at: new Date(insight.cache_expires_at)
    })
  }

  /**
   * Create empty insight structure
   */
  private createEmptyInsight(topic: string, queryHash: string): ComprehensiveHistoricalInsight {
    return {
      query_topic: topic,
      query_hash: queryHash,
      related_posts: [],
      top_performers: [],
      performance_context: {
        avg_engagement: 0,
        top_performing_score: 0,
        performance_benchmark: 0,
        total_posts_analyzed: 0,
        timeframe_days: 365
      },
      content_patterns: {
        avg_word_count: 180,
        optimal_word_count_range: [120, 250],
        common_openings: [],
        common_structures: [],
        best_performing_formats: [],
        engagement_triggers: [],
        optimal_hashtag_count: 0,
        story_vs_advice_ratio: 0.5
      },
      voice_patterns: {
        dominant_tone: 'conversational',
        authenticity_score_avg: 70,
        authority_score_avg: 80,
        vulnerability_score_avg: 75,
        key_authority_signals: [],
        emotional_triggers: [],
        personal_story_frequency: 0.6,
        question_usage_frequency: 0.4
      },
      performance_recommendations: {
        content_structure_advice: [],
        voice_tone_guidance: [],
        engagement_optimization: [],
        timing_suggestions: [],
        format_recommendations: []
      },
      confidence_level: 0.1,
      analysis_freshness: 100,
      similar_posts_count: 0,
      cache_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  /**
   * Convert cached insight to comprehensive format
   */
  private convertCachedInsightToComprehensive(cachedInsight: any): ComprehensiveHistoricalInsight {
    // Implementation to convert database format back to comprehensive insight
    // This would map the cached JSON fields back to the full structure
    return cachedInsight as ComprehensiveHistoricalInsight
  }

  // Placeholder methods for pattern analysis (to be implemented)
  private async analyzeContentPatterns(posts: EnhancedHistoricalPost[]): Promise<any> {
    // Implementation for content pattern analysis
    return {
      avg_word_count: 180,
      optimal_word_count_range: [120, 250] as [number, number],
      common_openings: [],
      common_structures: [],
      best_performing_formats: [],
      engagement_triggers: [],
      optimal_hashtag_count: 0,
      story_vs_advice_ratio: 0.5
    }
  }

  private async analyzeVoicePatterns(posts: EnhancedHistoricalPost[], includeComments: boolean): Promise<any> {
    // Implementation for voice pattern analysis
    return {
      dominant_tone: 'conversational',
      authenticity_score_avg: 75,
      authority_score_avg: 80,
      vulnerability_score_avg: 70,
      key_authority_signals: [],
      emotional_triggers: [],
      personal_story_frequency: 0.6,
      question_usage_frequency: 0.4
    }
  }

  private async generatePerformanceRecommendations(
    topic: string,
    topPerformers: EnhancedHistoricalPost[],
    contentPatterns: any,
    voicePatterns: any
  ): Promise<any> {
    // Implementation for performance recommendations
    return {
      content_structure_advice: [],
      voice_tone_guidance: [],
      engagement_optimization: [],
      timing_suggestions: [],
      format_recommendations: []
    }
  }

  private calculatePerformanceContext(relevantPosts: EnhancedHistoricalPost[], topPerformers: EnhancedHistoricalPost[]): any {
    const avgEngagement = relevantPosts.length > 0 
      ? Math.round(relevantPosts.reduce((sum, p) => sum + p.viral_score, 0) / relevantPosts.length)
      : 0

    const topPerformingScore = topPerformers.length > 0
      ? Math.max(...topPerformers.map(p => p.viral_score))
      : 0

    return {
      avg_engagement: avgEngagement,
      top_performing_score: topPerformingScore,
      performance_benchmark: Math.round(topPerformingScore * 0.8)
    }
  }

  private calculateConfidenceLevel(relevantPostsCount: number, topPerformersCount: number): number {
    let confidence = 0.3 // Base confidence

    if (relevantPostsCount >= 10) confidence += 0.3
    if (topPerformersCount >= 5) confidence += 0.2
    if (relevantPostsCount >= 20) confidence += 0.2

    return Math.min(1.0, confidence)
  }
}

export const historicalAnalysisEnhancedService = new HistoricalAnalysisEnhancedService()