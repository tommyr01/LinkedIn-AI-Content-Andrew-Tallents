import { OpenAI } from 'openai'
import { appConfig } from '../config'
import { supabaseService } from './supabase'
import logger from '../lib/logger'

export interface SimilarPost {
  post_id: string
  content: string
  similarity_score: number
  engagement_score: number
  total_reactions: number
  comments_count: number
  performance_tier: string
  posted_date: string
  combined_score: number
}

export interface PerformanceInsight {
  topic: string
  similar_posts: SimilarPost[]
  performance_summary: {
    avg_engagement: number
    top_engagement: number
    success_patterns: string[]
    common_elements: string[]
  }
  optimization_suggestions: string[]
  predicted_performance: {
    estimated_reactions: number
    confidence_score: number
    success_factors: string[]
  }
}

export class VectorSimilarityService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: appConfig.openai.apiKey
    })
  }

  /**
   * Generate embedding for a given text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.slice(0, 8192) // Limit to 8K chars for embedding
      })

      return response.data[0].embedding
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to generate embedding')
      throw error
    }
  }

  /**
   * Find high-performing posts similar to the given topic
   */
  async findSimilarHighPerformingPosts(
    topic: string,
    options: {
      similarity_threshold?: number
      match_count?: number
      min_performance_tier?: string
      recency_months?: number
    } = {}
  ): Promise<SimilarPost[]> {
    try {
      const {
        similarity_threshold = 0.3,
        match_count = 5,
        min_performance_tier = 'top_25_percent',
        recency_months = 24
      } = options

      logger.info({ topic, options }, 'Finding similar high-performing posts')

      // Generate embedding for the topic
      const embedding = await this.generateEmbedding(topic)

      // Query Supabase for similar high-performing posts
      const { data: posts, error } = await supabaseService['client']
        .rpc('match_posts_with_performance', {
          query_embedding: embedding,
          similarity_threshold,
          match_count,
          min_performance_tier,
          recency_months
        })

      if (error) {
        logger.error({ error }, 'Failed to query similar posts')
        throw error
      }

      logger.info({ 
        topic, 
        found_posts: posts?.length || 0,
        avg_similarity: posts?.length ? (posts.reduce((sum: number, p: any) => sum + p.similarity_score, 0) / posts.length).toFixed(3) : 0
      }, 'Found similar high-performing posts')

      return posts || []
    } catch (error) {
      logger.error({ topic, error: error instanceof Error ? error.message : String(error) }, 'Failed to find similar posts')
      throw error
    }
  }

  /**
   * Generate analytics-driven performance insights for a topic
   */
  async generatePerformanceInsights(topic: string): Promise<PerformanceInsight> {
    try {
      logger.info({ topic }, 'Generating analytics-driven performance insights')

      // Find similar high-performing posts
      const similar_posts = await this.findSimilarHighPerformingPosts(topic, {
        match_count: 10, // Get more for analysis
        similarity_threshold: 0.25 // Slightly broader search
      })

      if (similar_posts.length === 0) {
        logger.warn({ topic }, 'No similar high-performing posts found')
        return this.createEmptyInsight(topic)
      }

      // Analyze performance patterns
      const performance_summary = this.analyzePerformancePatterns(similar_posts)
      const optimization_suggestions = this.generateOptimizationSuggestions(similar_posts)
      const predicted_performance = this.predictPerformance(similar_posts)

      const insight: PerformanceInsight = {
        topic,
        similar_posts: similar_posts.slice(0, 5), // Return top 5 for context
        performance_summary,
        optimization_suggestions,
        predicted_performance
      }

      logger.info({ 
        topic,
        similar_posts_count: similar_posts.length,
        avg_performance: performance_summary.avg_engagement,
        prediction_confidence: predicted_performance.confidence_score
      }, 'Generated performance insights')

      return insight
    } catch (error) {
      logger.error({ topic, error: error instanceof Error ? error.message : String(error) }, 'Failed to generate performance insights')
      throw error
    }
  }

  /**
   * Analyze patterns from high-performing similar posts
   */
  private analyzePerformancePatterns(posts: SimilarPost[]) {
    const engagements = posts.map(p => p.engagement_score)
    const reactions = posts.map(p => p.total_reactions)

    // Extract common elements from successful posts
    const success_patterns = []
    const common_elements = []

    // Analyze content patterns
    const question_posts = posts.filter(p => p.content.includes('?'))
    if (question_posts.length > posts.length * 0.6) {
      success_patterns.push('Question-based openings drive engagement')
      common_elements.push('Provocative questions')
    }

    const story_posts = posts.filter(p => 
      p.content.toLowerCase().includes('story') || 
      p.content.toLowerCase().includes('client') ||
      p.content.toLowerCase().includes('experience')
    )
    if (story_posts.length > posts.length * 0.4) {
      success_patterns.push('Personal stories and client examples resonate well')
      common_elements.push('Narrative elements')
    }

    const vulnerability_posts = posts.filter(p =>
      p.content.toLowerCase().includes('admit') ||
      p.content.toLowerCase().includes('struggle') ||
      p.content.toLowerCase().includes('challenge')
    )
    if (vulnerability_posts.length > posts.length * 0.5) {
      success_patterns.push('Vulnerability and authenticity build connection')
      common_elements.push('Authentic vulnerability')
    }

    return {
      avg_engagement: Math.round(engagements.reduce((a, b) => a + b, 0) / engagements.length),
      top_engagement: Math.max(...engagements),
      success_patterns,
      common_elements
    }
  }

  /**
   * Generate optimization suggestions based on top performers
   */
  private generateOptimizationSuggestions(posts: SimilarPost[]): string[] {
    const suggestions = []

    // Analyze top performer characteristics
    const top_performer = posts.reduce((prev, current) => 
      prev.engagement_score > current.engagement_score ? prev : current
    )

    const avg_length = posts.reduce((sum, p) => sum + p.content.length, 0) / posts.length

    suggestions.push(`Optimal content length appears to be around ${Math.round(avg_length)} characters`)
    
    if (top_performer.content.includes('?')) {
      suggestions.push('Include thought-provoking questions to boost engagement')
    }

    if (posts.filter(p => p.content.toLowerCase().includes('data') || p.content.toLowerCase().includes('stat')).length > 2) {
      suggestions.push('Include relevant data points or statistics for credibility')
    }

    suggestions.push('Follow proven patterns from similar high-performing content')
    suggestions.push('Maintain authentic voice while incorporating successful elements')

    return suggestions
  }

  /**
   * Predict performance based on similar posts
   */
  private predictPerformance(posts: SimilarPost[]) {
    const engagements = posts.map(p => p.engagement_score)
    const reactions = posts.map(p => p.total_reactions)

    const avg_engagement = engagements.reduce((a, b) => a + b, 0) / engagements.length
    const avg_reactions = reactions.reduce((a, b) => a + b, 0) / reactions.length

    // Confidence based on number of similar posts and similarity scores
    const avg_similarity = posts.reduce((sum, p) => sum + p.similarity_score, 0) / posts.length
    const confidence_score = Math.min(90, Math.round((posts.length * 10) + (avg_similarity * 50)))

    // Extract success factors
    const success_factors = []
    if (posts.some(p => p.performance_tier === 'top_10_percent')) {
      success_factors.push('Topic has proven high-performance potential')
    }
    success_factors.push('Similar content has consistent engagement')
    success_factors.push('Audience responds well to this topic area')

    return {
      estimated_reactions: Math.round(avg_reactions),
      confidence_score,
      success_factors
    }
  }

  /**
   * Create empty insight when no similar posts found
   */
  private createEmptyInsight(topic: string): PerformanceInsight {
    return {
      topic,
      similar_posts: [],
      performance_summary: {
        avg_engagement: 0,
        top_engagement: 0,
        success_patterns: ['No historical data available for this topic'],
        common_elements: []
      },
      optimization_suggestions: [
        'This appears to be a new topic area',
        'Focus on authentic voice and clear value proposition',
        'Consider including relevant data or personal experience',
        'Use proven structural elements like questions or stories'
      ],
      predicted_performance: {
        estimated_reactions: 50, // Conservative estimate
        confidence_score: 30, // Low confidence without data
        success_factors: ['Fresh topic with potential for discovery']
      }
    }
  }

  /**
   * Store embedding for a post (for populating the database)
   */
  async storePostEmbedding(postId: string, content: string, performanceMetrics: any): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(content)

      const { error } = await supabaseService['client']
        .from('post_embeddings')
        .upsert({
          post_id: postId,
          content: content.slice(0, 2000), // Store first 2K chars
          embedding,
          word_count: content.split(' ').length,
          total_reactions: performanceMetrics.total_reactions || 0,
          like_count: performanceMetrics.like_count || 0,
          comments_count: performanceMetrics.comments_count || 0,
          reposts_count: performanceMetrics.reposts_count || 0,
          shares_count: performanceMetrics.shares_count || 0,
          has_question: content.includes('?'),
          has_story: content.toLowerCase().includes('story') || content.toLowerCase().includes('experience'),
          has_call_to_action: content.toLowerCase().includes('comment') || content.toLowerCase().includes('share'),
          posted_date: performanceMetrics.posted_date || new Date()
        })

      if (error) {
        throw error
      }

      logger.debug({ postId }, 'Stored post embedding')
    } catch (error) {
      logger.error({ postId, error: error instanceof Error ? error.message : String(error) }, 'Failed to store post embedding')
      throw error
    }
  }
}

export const vectorSimilarityService = new VectorSimilarityService()