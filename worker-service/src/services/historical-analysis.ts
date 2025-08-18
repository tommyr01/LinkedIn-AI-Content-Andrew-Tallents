import { SupabaseService } from './supabase'
import { OpenAI } from 'openai'
import logger from '../lib/logger'

export interface HistoricalPost {
  id: string
  text: string
  posted_at: string
  total_reactions: number
  like_count: number
  comments_count: number
  reposts_count: number
  support_count: number
  love_count: number
  insight_count: number
  celebrate_count: number
  author_first_name: string
  author_last_name: string
  post_type: string
  document_title?: string
  embedding?: number[]
  similarity_score?: number
}

export interface PerformanceMetrics {
  engagementScore: number
  reactionRate: number
  commentRate: number
  shareRate: number
  overallScore: number
}

export interface HistoricalInsight {
  relatedPosts: HistoricalPost[]
  topPerformers: HistoricalPost[]
  patterns: {
    avgWordCount: number
    commonOpenings: string[]
    commonStructures: string[]
    bestPerformingFormats: string[]
    engagementTriggers: string[]
  }
  performanceContext: {
    avgEngagement: number
    topPerformingScore: number
    suggestionScore: number
  }
}

export class HistoricalAnalysisService {
  private supabaseService: SupabaseService
  private openai: OpenAI

  constructor() {
    this.supabaseService = new SupabaseService()
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  /**
   * Find historically similar posts for a given topic using semantic similarity
   */
  async findSimilarHistoricalPosts(topic: string, limit: number = 10): Promise<HistoricalPost[]> {
    try {
      logger.info({ topic, limit }, 'Finding similar historical posts')

      // Generate embedding for the topic
      const topicEmbedding = await this.generateEmbedding(topic)
      
      // Get Andrew's posts from Supabase (assuming username is 'andrewtallents')
      const historicalPosts = await this.getAndrewsPosts()
      
      if (historicalPosts.length === 0) {
        logger.warn('No historical posts found for Andrew')
        return []
      }

      // Calculate similarity scores for each post
      const postsWithSimilarity = await this.calculateSimilarityScores(
        historicalPosts, 
        topicEmbedding
      )

      // Sort by similarity and return top matches
      const similarPosts = postsWithSimilarity
        .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0))
        .slice(0, limit)

      logger.info({ 
        topic, 
        foundPosts: similarPosts.length,
        topSimilarity: similarPosts[0]?.similarity_score 
      }, 'Found similar historical posts')

      return similarPosts
    } catch (error) {
      logger.error({ topic, error: error instanceof Error ? error.message : String(error) }, 'Failed to find similar historical posts')
      throw error
    }
  }

  /**
   * Analyze top-performing posts to extract patterns and insights
   */
  async analyzeTopPerformingPosts(relatedPosts: HistoricalPost[]): Promise<HistoricalInsight> {
    try {
      logger.info({ postsCount: relatedPosts.length }, 'Analyzing top performing posts')

      // Calculate performance scores for all posts
      const postsWithPerformance = relatedPosts.map(post => ({
        ...post,
        performanceMetrics: this.calculatePerformanceMetrics(post)
      }))

      // Sort by performance and get top performers
      const topPerformers = postsWithPerformance
        .sort((a, b) => b.performanceMetrics.overallScore - a.performanceMetrics.overallScore)
        .slice(0, 5)

      // Extract patterns from top performers
      const patterns = await this.extractContentPatterns(topPerformers)

      // Calculate performance context
      const performanceContext = this.calculatePerformanceContext(postsWithPerformance)

      const insight: HistoricalInsight = {
        relatedPosts: relatedPosts,
        topPerformers: topPerformers,
        patterns,
        performanceContext
      }

      logger.info({
        topPerformersCount: topPerformers.length,
        avgEngagement: performanceContext.avgEngagement,
        topScore: performanceContext.topPerformingScore
      }, 'Historical analysis completed')

      return insight
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to analyze top performing posts')
      throw error
    }
  }

  /**
   * Generate comprehensive insights for content generation
   */
  async generateHistoricalInsights(topic: string): Promise<HistoricalInsight> {
    try {
      logger.info({ topic }, 'Generating comprehensive historical insights')

      // Find similar posts
      const similarPosts = await this.findSimilarHistoricalPosts(topic, 20)

      if (similarPosts.length === 0) {
        // Return empty insight if no similar posts found
        return {
          relatedPosts: [],
          topPerformers: [],
          patterns: {
            avgWordCount: 0,
            commonOpenings: [],
            commonStructures: [],
            bestPerformingFormats: [],
            engagementTriggers: []
          },
          performanceContext: {
            avgEngagement: 0,
            topPerformingScore: 0,
            suggestionScore: 0
          }
        }
      }

      // Analyze the similar posts for patterns and performance
      const insights = await this.analyzeTopPerformingPosts(similarPosts)

      return insights
    } catch (error) {
      logger.error({ topic, error: error instanceof Error ? error.message : String(error) }, 'Failed to generate historical insights')
      throw error
    }
  }

  /**
   * Generate embedding for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
              model: 'text-embedding-ada-002',
      input: text.slice(0, 8000) // Limit input length
    })

    return response.data[0].embedding
  }

  /**
   * Get Andrew's historical posts from Supabase
   */
  private async getAndrewsPosts(): Promise<HistoricalPost[]> {
    try {
      // Use the existing supabase service to get posts
      // This assumes you have a method to get posts by username
      const supabase = this.supabaseService['client']
      
      const { data: posts, error } = await supabase
        .from('linkedin_posts')
        .select(`
          id,
          post_text,
          posted_date,
          total_reactions,
          like_count,
          comments_count,
          reposts,
          shares,
          author_first_name,
          author_last_name,
          post_type
        `)
        .eq('author_username', 'andrewtallents')
        .not('post_text', 'is', null)
        .order('posted_date', { ascending: false })
        .limit(100)

      if (error) {
        throw error
      }

      return (posts || []).map((post: any) => ({
        id: post.id,
        text: post.post_text || '',
        posted_at: post.posted_date,
        total_reactions: post.total_reactions || 0,
        like_count: post.like_count || 0,
        comments_count: post.comments_count || 0,
        reposts_count: post.reposts || 0,
        support_count: 0, // Not available in linkedin_posts
        love_count: 0, // Not available in linkedin_posts  
        insight_count: 0, // Not available in linkedin_posts
        celebrate_count: 0, // Not available in linkedin_posts
        author_first_name: post.author_first_name || 'Andrew',
        author_last_name: post.author_last_name || 'Tallents',
        post_type: post.post_type || 'regular'
      }))
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch Andrew\'s historical posts')
      throw error
    }
  }

  /**
   * Calculate similarity scores between posts and topic embedding
   */
  private async calculateSimilarityScores(
    posts: HistoricalPost[], 
    topicEmbedding: number[]
  ): Promise<HistoricalPost[]> {
    const postsWithSimilarity = []

    for (const post of posts) {
      try {
        // Generate embedding for the post
        const postEmbedding = await this.generateEmbedding(post.text)
        
        // Calculate cosine similarity
        const similarity = this.cosineSimilarity(topicEmbedding, postEmbedding)
        
        postsWithSimilarity.push({
          ...post,
          embedding: postEmbedding,
          similarity_score: similarity
        })

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        logger.warn({ postId: post.id, error: error instanceof Error ? error.message : String(error) }, 'Failed to calculate similarity for post')
        // Include post with 0 similarity if embedding fails
        postsWithSimilarity.push({
          ...post,
          similarity_score: 0
        })
      }
    }

    return postsWithSimilarity
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

  /**
   * Calculate performance metrics for a post
   */
  private calculatePerformanceMetrics(post: HistoricalPost): PerformanceMetrics {
    const totalReactions = post.total_reactions || 0
    const comments = post.comments_count || 0
    const reposts = post.reposts_count || 0
    
    // Weighted scoring - comments and reposts are more valuable than likes
    const engagementScore = (totalReactions * 1) + (comments * 3) + (reposts * 5)
    
    // Calculate rates (normalized metrics)
    const reactionRate = totalReactions
    const commentRate = comments
    const shareRate = reposts
    
    // Overall performance score (weighted)
    const overallScore = engagementScore + (commentRate * 10) + (shareRate * 20)
    
    return {
      engagementScore,
      reactionRate,
      commentRate,
      shareRate,
      overallScore
    }
  }

  /**
   * Extract content patterns from top performing posts
   */
  private async extractContentPatterns(topPerformers: Array<HistoricalPost & { performanceMetrics: PerformanceMetrics }>): Promise<{
    avgWordCount: number
    commonOpenings: string[]
    commonStructures: string[]
    bestPerformingFormats: string[]
    engagementTriggers: string[]
  }> {
    if (topPerformers.length === 0) {
      return {
        avgWordCount: 0,
        commonOpenings: [],
        commonStructures: [],
        bestPerformingFormats: [],
        engagementTriggers: []
      }
    }

    // Calculate average word count
    const avgWordCount = Math.round(
      topPerformers.reduce((sum, post) => sum + post.text.split(' ').length, 0) / topPerformers.length
    )

    // Extract opening patterns (first 10-15 words)
    const openings = topPerformers.map(post => {
      const words = post.text.split(' ')
      return words.slice(0, Math.min(15, words.length)).join(' ')
    })

    // Use AI to analyze patterns
    const patterns = await this.analyzeContentPatterns(topPerformers.map(p => p.text))

    return {
      avgWordCount,
      commonOpenings: openings.slice(0, 3), // Top 3 openings
      commonStructures: patterns.structures,
      bestPerformingFormats: patterns.formats,
      engagementTriggers: patterns.triggers
    }
  }

  /**
   * Use AI to analyze content patterns
   */
  private async analyzeContentPatterns(texts: string[]): Promise<{
    structures: string[]
    formats: string[]
    triggers: string[]
  }> {
    try {
      const analysisPrompt = `Analyze these top-performing LinkedIn posts and identify patterns:

Posts:
${texts.map((text, i) => `${i + 1}. ${text.slice(0, 500)}`).join('\n\n')}

Please identify:
1. Common content structures (e.g., "hook + story + lesson", "question + explanation + CTA")
2. Effective formats (e.g., "bullet points", "numbered lists", "storytelling")
3. Engagement triggers (e.g., "personal vulnerability", "contrarian takes", "actionable advice")

Return as JSON:
{
  "structures": ["structure1", "structure2", "structure3"],
  "formats": ["format1", "format2", "format3"],
  "triggers": ["trigger1", "trigger2", "trigger3"]
}`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.3,
        max_tokens: 500
      })

      const result = JSON.parse(response.choices[0]?.message?.content || '{}')
      
      return {
        structures: result.structures || [],
        formats: result.formats || [],
        triggers: result.triggers || []
      }
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Failed to analyze content patterns with AI')
      return {
        structures: ['Story-driven narrative', 'Problem-solution format', 'Question-based engagement'],
        formats: ['Paragraph format', 'Bullet points', 'Numbered insights'],
        triggers: ['Personal experience', 'Industry insights', 'Actionable advice']
      }
    }
  }

  /**
   * Calculate performance context for the analysis
   */
  private calculatePerformanceContext(posts: Array<HistoricalPost & { performanceMetrics: PerformanceMetrics }>): {
    avgEngagement: number
    topPerformingScore: number
    suggestionScore: number
  } {
    if (posts.length === 0) {
      return { avgEngagement: 0, topPerformingScore: 0, suggestionScore: 0 }
    }

    const avgEngagement = Math.round(
      posts.reduce((sum, post) => sum + post.performanceMetrics.overallScore, 0) / posts.length
    )

    const topPerformingScore = Math.max(...posts.map(p => p.performanceMetrics.overallScore))
    const suggestionScore = Math.round(topPerformingScore * 0.8) // Target 80% of best performance

    return {
      avgEngagement,
      topPerformingScore,
      suggestionScore
    }
  }
}

export const historicalAnalysisService = new HistoricalAnalysisService()