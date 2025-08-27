/**
 * LinkedIn Post Processing Service for RAG Integration
 * 
 * This service extracts LinkedIn posts from the database and processes them into
 * semantic chunks for voice pattern extraction and authenticity analysis.
 * 
 * Key Features:
 * - Semantic chunking that preserves Andrew's thought patterns
 * - Voice pattern identification (philosophical questions, research citations, stories)
 * - Authenticity scoring based on Andrew's writing style
 * - Embedding generation for RAG retrieval
 * - Performance tracking for optimization
 */

import { OpenAI } from 'openai'
import { createHash } from 'crypto'
import { supabaseService } from './supabase'
import logger from '../lib/logger'
import { appConfig } from '../config'

interface LinkedInPost {
  id: string
  text: string
  posted_at: string
  total_reactions: number
  like_count: number
  comments_count: number
  reposts_count: number
  author_first_name: string
  author_last_name: string
}

interface PostChunk {
  text: string
  order: number
  type: 'opening' | 'body' | 'insight' | 'cta' | 'story' | 'research_citation'
  tokenCount: number
  wordCount: number
  sentenceCount: number
  patternTypes: string[]
  voiceMarkers: string[]
  authenticityScore: number
  qualityScore: number
  topicCategories: string[]
  intentCategory: 'educational' | 'motivational' | 'challenging' | 'personal'
  semanticDensity: number
  contextRelevance: number
}

interface ProcessingResult {
  postId: string
  chunksCreated: number
  totalTokens: number
  avgAuthenticityScore: number
  patternTypesFound: string[]
  processingTime: number
  success: boolean
  error?: string
}

export class LinkedInPostProcessor {
  private openai: OpenAI
  private andrewVoicePatterns: Map<string, RegExp> = new Map()
  private authenticityMarkers: string[] = []

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: appConfig.openai.apiKey 
    })
    this.initializeVoicePatterns()
  }

  /**
   * Initialize Andrew's voice patterns and authenticity markers
   */
  private initializeVoicePatterns(): void {
    this.andrewVoicePatterns = new Map([
      // Philosophical questions and challenges
      ['confrontational', /^(What if|Stop|Here's the thing|The truth is|Let me be clear)/i],
      ['question', /(What if|Why do|How many|When will|What would happen if)/i],
      ['challenge', /(Stop [a-z]+ing|Don't|Never|Quit|Enough)/i],
      
      // Research and authority patterns
      ['research_citation', /(Research shows|Studies reveal|According to|Data indicates|Evidence suggests)/i],
      ['authority', /(In my experience|After \d+ years|I've seen|Working with)/i],
      ['data_presentation', /(\d+%|\d+ out of \d+|statistics show|research finds)/i],
      
      // Storytelling and personal patterns
      ['storytelling', /(Let me tell you|I remember|Recently|Last week|Story time)/i],
      ['vulnerability', /(I used to|I struggle|I failed|I was wrong|I learned)/i],
      ['personal_experience', /(When I|In my|My team|My client|My experience)/i],
      
      // Teaching and insight patterns
      ['teaching', /(Here's how|The key is|Remember this|Think about it|Consider this)/i],
      ['insight', /(The reality is|What I've learned|The difference|The secret)/i],
      ['analogy', /(It's like|Think of it as|Imagine|Picture this|Just like)/i],
      
      // Engagement and CTA patterns
      ['cta', /(What's your|Share your|Tell me|Comment below|What do you think)/i],
      ['engagement', /(Agree\?|Thoughts\?|Sound familiar\?|Am I right\?)/i],
      ['empathy', /(You know this|You've been there|We've all|You feel)/i]
    ])

    this.authenticityMarkers = [
      'direct confrontational language',
      'personal vulnerability admission',
      'specific research citations',
      'concrete experience examples',
      'philosophical questioning',
      'practical action steps',
      'empathetic understanding',
      'authoritative expertise',
      'story-driven insights',
      'data-backed arguments'
    ]
  }

  /**
   * Process all LinkedIn posts that haven't been chunked yet
   */
  async processAllPosts(): Promise<ProcessingResult[]> {
    logger.info('Starting LinkedIn posts processing for RAG integration')

    try {
      // Get all posts that haven't been processed yet
      const unprocessedPosts = await this.getUnprocessedPosts()
      logger.info({ postsFound: unprocessedPosts.length }, 'Found unprocessed LinkedIn posts')

      if (unprocessedPosts.length === 0) {
        return []
      }

      const results: ProcessingResult[] = []

      // Process posts in batches to avoid overwhelming the API
      const batchSize = 5
      for (let i = 0; i < unprocessedPosts.length; i += batchSize) {
        const batch = unprocessedPosts.slice(i, i + batchSize)
        logger.info({ batchStart: i, batchSize: batch.length }, 'Processing batch of posts')

        const batchResults = await Promise.all(
          batch.map(post => this.processPost(post))
        )

        results.push(...batchResults)

        // Brief pause between batches to respect rate limits
        if (i + batchSize < unprocessedPosts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // Log summary statistics
      const successful = results.filter(r => r.success)
      const totalChunks = successful.reduce((sum, r) => sum + r.chunksCreated, 0)
      const avgAuthenticity = successful.reduce((sum, r) => sum + r.avgAuthenticityScore, 0) / successful.length

      logger.info({
        totalPosts: results.length,
        successfulPosts: successful.length,
        totalChunks,
        avgAuthenticity: Math.round(avgAuthenticity),
        processingTime: results.reduce((sum, r) => sum + r.processingTime, 0)
      }, 'LinkedIn posts processing completed')

      return results

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to process LinkedIn posts')
      throw error
    }
  }

  /**
   * Process a specific LinkedIn post by ID
   */
  async processSpecificPost(postId: string): Promise<ProcessingResult> {
    logger.info({ postId }, 'Processing specific LinkedIn post')

    try {
      const { data: post, error } = await supabaseService.client
        .from('linkedin_posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch post: ${error.message}`)
      }

      if (!post) {
        throw new Error('Post not found')
      }

      return await this.processPost(post)

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        postId
      }, 'Failed to process specific LinkedIn post')

      return {
        postId,
        chunksCreated: 0,
        totalTokens: 0,
        avgAuthenticityScore: 0,
        patternTypesFound: [],
        processingTime: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Get LinkedIn posts that haven't been processed into chunks yet
   */
  private async getUnprocessedPosts(): Promise<LinkedInPost[]> {
    const { data: posts, error } = await supabaseService.client
      .from('linkedin_posts')
      .select(`
        id,
        text,
        posted_at,
        total_reactions,
        like_count,
        comments_count,
        reposts_count,
        author_first_name,
        author_last_name
      `)
      .not('text', 'is', null)
      .gte('total_reactions', 5) // Focus on posts with some engagement
      .order('posted_at', { ascending: false })
      .limit(100) // Process recent posts first

    if (error) {
      logger.error({ error }, 'Failed to fetch unprocessed posts')
      throw new Error(`Failed to fetch posts: ${error.message}`)
    }

    // Filter out posts that have already been processed
    const processedPostIds = await this.getProcessedPostIds()
    const unprocessedPosts = posts?.filter(post => 
      !processedPostIds.has(post.id) && 
      post.text && 
      post.text.length > 50 // Minimum content length
    ) || []

    return unprocessedPosts
  }

  /**
   * Get IDs of posts that have already been processed
   */
  private async getProcessedPostIds(): Promise<Set<string>> {
    const { data: processedChunks, error } = await supabaseService.client
      .from('linkedin_post_chunks')
      .select('post_id')

    if (error) {
      logger.warn({ error }, 'Failed to fetch processed post IDs, proceeding with empty set')
      return new Set()
    }

    return new Set(processedChunks?.map(chunk => chunk.post_id) || [])
  }

  /**
   * Process a single LinkedIn post into semantic chunks
   */
  private async processPost(post: LinkedInPost): Promise<ProcessingResult> {
    const startTime = Date.now()
    logger.info({ postId: post.id, textLength: post.text?.length }, 'Processing LinkedIn post')

    try {
      if (!post.text || post.text.length < 50) {
        throw new Error('Post text too short or empty')
      }

      // Create semantic chunks from the post
      const chunks = await this.createSemanticChunks(post)
      
      if (chunks.length === 0) {
        throw new Error('No valid chunks created from post')
      }

      // Generate embeddings for all chunks
      const chunksWithEmbeddings = await Promise.all(
        chunks.map(async (chunk, index) => {
          const embedding = await this.generateEmbedding(chunk.text)
          return {
            ...chunk,
            embedding,
            order: index
          }
        })
      )

      // Store chunks in database
      const insertData = chunksWithEmbeddings.map(chunk => ({
        post_id: post.id,
        chunk_text: chunk.text,
        chunk_order: chunk.order,
        chunk_type: chunk.type,
        embedding: JSON.stringify(chunk.embedding),
        authenticity_score: chunk.authenticityScore,
        quality_score: chunk.qualityScore,
        pattern_types: chunk.patternTypes,
        voice_markers: chunk.voiceMarkers,
        token_count: chunk.tokenCount,
        word_count: chunk.wordCount,
        sentence_count: chunk.sentenceCount,
        primary_topic: this.extractPrimaryTopic(chunk.text),
        topic_categories: chunk.topicCategories,
        intent_category: chunk.intentCategory,
        original_post_date: post.posted_at,
        post_performance: {
          total_reactions: post.total_reactions,
          like_count: post.like_count,
          comments_count: post.comments_count,
          reposts_count: post.reposts_count
        },
        semantic_density: chunk.semanticDensity,
        context_relevance: chunk.contextRelevance,
        engagement_indicators: {
          reactions_per_sentence: post.total_reactions / Math.max(chunk.sentenceCount, 1),
          engagement_ratio: (post.like_count + post.comments_count) / Math.max(post.total_reactions, 1)
        }
      }))

      const { error: insertError } = await supabaseService.client
        .from('linkedin_post_chunks')
        .insert(insertData)

      if (insertError) {
        throw new Error(`Failed to insert chunks: ${insertError.message}`)
      }

      const processingTime = Date.now() - startTime
      const avgAuthenticityScore = chunks.reduce((sum, chunk) => sum + chunk.authenticityScore, 0) / chunks.length
      const patternTypesFound = [...new Set(chunks.flatMap(chunk => chunk.patternTypes))]

      logger.info({
        postId: post.id,
        chunksCreated: chunks.length,
        avgAuthenticityScore: Math.round(avgAuthenticityScore),
        patternTypesFound,
        processingTime
      }, 'Successfully processed LinkedIn post')

      return {
        postId: post.id,
        chunksCreated: chunks.length,
        totalTokens: chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
        avgAuthenticityScore,
        patternTypesFound,
        processingTime,
        success: true
      }

    } catch (error) {
      const processingTime = Date.now() - startTime
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        postId: post.id,
        processingTime
      }, 'Failed to process LinkedIn post')

      return {
        postId: post.id,
        chunksCreated: 0,
        totalTokens: 0,
        avgAuthenticityScore: 0,
        patternTypesFound: [],
        processingTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Create semantic chunks from LinkedIn post text
   */
  private async createSemanticChunks(post: LinkedInPost): Promise<PostChunk[]> {
    const text = post.text.trim()
    const chunks: PostChunk[] = []

    // Split post into logical sections
    const sections = this.splitIntoSections(text)

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim()
      if (section.length < 30) continue // Skip very short sections

      // Determine chunk type based on position and content
      const chunkType = this.determineChunkType(section, i, sections.length)

      // Analyze voice patterns in this chunk
      const patternTypes = this.identifyVoicePatterns(section)
      const voiceMarkers = this.extractVoiceMarkers(section)

      // Calculate authenticity and quality scores
      const authenticityScore = this.calculateAuthenticityScore(section, patternTypes, voiceMarkers)
      const qualityScore = this.calculateQualityScore(section, post)

      // Extract topic information
      const topicCategories = this.extractTopicCategories(section)
      const intentCategory = this.determineIntentCategory(section, patternTypes)

      // Calculate semantic metrics
      const semanticDensity = this.calculateSemanticDensity(section)
      const contextRelevance = this.calculateContextRelevance(section, patternTypes)

      const chunk: PostChunk = {
        text: section,
        order: i,
        type: chunkType,
        tokenCount: this.estimateTokenCount(section),
        wordCount: section.split(/\s+/).length,
        sentenceCount: section.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
        patternTypes,
        voiceMarkers,
        authenticityScore,
        qualityScore,
        topicCategories,
        intentCategory,
        semanticDensity,
        contextRelevance
      }

      chunks.push(chunk)
    }

    return chunks
  }

  /**
   * Split post text into logical sections
   */
  private splitIntoSections(text: string): string[] {
    // First, split by double line breaks (paragraph breaks)
    let sections = text.split(/\n\s*\n/).filter(section => section.trim().length > 0)

    // If we only have one section, try to split by single line breaks
    if (sections.length === 1) {
      sections = text.split(/\n/).filter(section => section.trim().length > 0)
    }

    // If still one section, try to split by sentence patterns
    if (sections.length === 1 && text.length > 500) {
      sections = this.splitBySentenceGroups(text)
    }

    return sections.map(section => section.trim()).filter(section => section.length > 0)
  }

  /**
   * Split long text into sentence groups
   */
  private splitBySentenceGroups(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const groups: string[] = []
    
    let currentGroup = ''
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim()
      if (currentGroup.length + trimmedSentence.length > 300 && currentGroup.length > 0) {
        groups.push(currentGroup.trim())
        currentGroup = trimmedSentence
      } else {
        currentGroup += (currentGroup ? '. ' : '') + trimmedSentence
      }
    }
    
    if (currentGroup.trim()) {
      groups.push(currentGroup.trim())
    }
    
    return groups
  }

  /**
   * Determine the type of chunk based on content and position
   */
  private determineChunkType(
    text: string, 
    position: number, 
    totalSections: number
  ): 'opening' | 'body' | 'insight' | 'cta' | 'story' | 'research_citation' {
    const lowerText = text.toLowerCase()

    // Research citations
    if (this.andrewVoicePatterns.get('research_citation')?.test(text)) {
      return 'research_citation'
    }

    // Stories
    if (this.andrewVoicePatterns.get('storytelling')?.test(text) || 
        this.andrewVoicePatterns.get('personal_experience')?.test(text)) {
      return 'story'
    }

    // CTAs (usually at the end)
    if (position === totalSections - 1 && this.andrewVoicePatterns.get('cta')?.test(text)) {
      return 'cta'
    }

    // Opening (first section with confrontational or question patterns)
    if (position === 0 && (
      this.andrewVoicePatterns.get('confrontational')?.test(text) ||
      this.andrewVoicePatterns.get('question')?.test(text)
    )) {
      return 'opening'
    }

    // Insights (contain key learning or insight patterns)
    if (this.andrewVoicePatterns.get('insight')?.test(text) ||
        this.andrewVoicePatterns.get('teaching')?.test(text)) {
      return 'insight'
    }

    // Default to body
    return 'body'
  }

  /**
   * Identify voice patterns in text
   */
  private identifyVoicePatterns(text: string): string[] {
    const patterns: string[] = []

    for (const [patternName, regex] of this.andrewVoicePatterns.entries()) {
      if (regex.test(text)) {
        patterns.push(patternName)
      }
    }

    return patterns
  }

  /**
   * Extract specific voice markers from text
   */
  private extractVoiceMarkers(text: string): string[] {
    const markers: string[] = []

    // Check for specific Andrew voice indicators
    if (/what if|imagine if/i.test(text)) {
      markers.push('philosophical_questioning')
    }

    if (/stop [a-z]+ing/i.test(text)) {
      markers.push('direct_confrontation')
    }

    if (/research shows|studies/i.test(text)) {
      markers.push('research_backing')
    }

    if (/in my experience|i've seen/i.test(text)) {
      markers.push('personal_authority')
    }

    if (/\d+%|\d+ years/i.test(text)) {
      markers.push('data_specificity')
    }

    if (/you know this|we've all/i.test(text)) {
      markers.push('empathetic_connection')
    }

    return markers
  }

  /**
   * Calculate authenticity score based on Andrew's voice patterns
   */
  private calculateAuthenticityScore(
    text: string, 
    patternTypes: string[], 
    voiceMarkers: string[]
  ): number {
    let score = 50 // Base score

    // Boost for signature patterns
    const signaturePatterns = ['confrontational', 'question', 'research_citation', 'storytelling']
    const signatureCount = patternTypes.filter(p => signaturePatterns.includes(p)).length
    score += signatureCount * 15

    // Boost for voice markers
    score += voiceMarkers.length * 10

    // Boost for specific Andrew phrases
    if (/what if/i.test(text)) score += 15
    if (/stop [a-z]+ing/i.test(text)) score += 20
    if (/research shows/i.test(text)) score += 15
    if (/in my experience/i.test(text)) score += 10

    // Penalty for generic business language
    if (/leverage|synergy|paradigm|best practice/i.test(text)) score -= 10
    if (/think outside the box|move the needle/i.test(text)) score -= 15

    // Boost for personal vulnerability
    if (/i failed|i was wrong|i struggle/i.test(text)) score += 20

    // Boost for direct, conversational tone
    if (/you know|let me tell you|here's the thing/i.test(text)) score += 10

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate quality score based on content depth and engagement
   */
  private calculateQualityScore(text: string, post: LinkedInPost): number {
    let score = 0.5 // Base score

    // Length factor (not too short, not too long)
    const wordCount = text.split(/\s+/).length
    if (wordCount >= 20 && wordCount <= 100) score += 0.2
    else if (wordCount > 100 && wordCount <= 200) score += 0.1

    // Sentence complexity
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgWordsPerSentence = wordCount / sentences.length
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 25) score += 0.1

    // Engagement factor based on post performance
    if (post.total_reactions > 10) score += 0.1
    if (post.comments_count > 3) score += 0.1

    return Math.max(0.0, Math.min(1.0, score))
  }

  /**
   * Extract topic categories from text
   */
  private extractTopicCategories(text: string): string[] {
    const categories: string[] = []
    const lowerText = text.toLowerCase()

    const topicMap = {
      'leadership': /leadership|leader|leading|manage|management/,
      'culture': /culture|cultural|environment|team/,
      'performance': /performance|productivity|results|outcome/,
      'coaching': /coaching|mentor|development|growth/,
      'strategy': /strategy|strategic|plan|goal/,
      'change': /change|transformation|adapt|evolve/,
      'communication': /communication|communicate|conversation|dialogue/,
      'accountability': /accountability|accountable|responsibility|ownership/
    }

    for (const [category, regex] of Object.entries(topicMap)) {
      if (regex.test(lowerText)) {
        categories.push(category)
      }
    }

    return categories
  }

  /**
   * Determine the intent category of the chunk
   */
  private determineIntentCategory(
    text: string, 
    patternTypes: string[]
  ): 'educational' | 'motivational' | 'challenging' | 'personal' {
    if (patternTypes.includes('confrontational') || patternTypes.includes('challenge')) {
      return 'challenging'
    }

    if (patternTypes.includes('storytelling') || patternTypes.includes('vulnerability')) {
      return 'personal'
    }

    if (patternTypes.includes('teaching') || patternTypes.includes('research_citation')) {
      return 'educational'
    }

    return 'motivational'
  }

  /**
   * Calculate semantic density (information richness)
   */
  private calculateSemanticDensity(text: string): number {
    const words = text.split(/\s+/)
    const uniqueWords = new Set(words.map(w => w.toLowerCase()))
    const density = uniqueWords.size / words.length

    // Adjust for content indicators
    let adjustedDensity = density

    // Boost for specific concepts
    if (/research|study|data|evidence/i.test(text)) adjustedDensity += 0.1
    if (/strategy|framework|methodology/i.test(text)) adjustedDensity += 0.1

    // Reduce for common words
    const commonWords = ['the', 'and', 'is', 'to', 'of', 'a', 'that', 'it', 'with', 'for']
    const commonWordCount = words.filter(w => commonWords.includes(w.toLowerCase())).length
    adjustedDensity -= (commonWordCount / words.length) * 0.2

    return Math.max(0.0, Math.min(1.0, adjustedDensity))
  }

  /**
   * Calculate context relevance (how well it represents Andrew's voice)
   */
  private calculateContextRelevance(text: string, patternTypes: string[]): number {
    let relevance = 0.3 // Base relevance

    // Boost for signature patterns
    const signaturePatterns = ['confrontational', 'question', 'storytelling', 'research_citation']
    const signatureCount = patternTypes.filter(p => signaturePatterns.includes(p)).length
    relevance += signatureCount * 0.15

    // Boost for first-person perspective
    if (/\b(I|my|me)\b/i.test(text)) relevance += 0.1

    // Boost for specific Andrew language
    if (/what if|stop [a-z]+ing|here's the thing/i.test(text)) relevance += 0.2

    // Boost for concrete examples
    if (/for example|let me tell you|recently|last week/i.test(text)) relevance += 0.1

    return Math.max(0.0, Math.min(1.0, relevance))
  }

  /**
   * Extract primary topic from text
   */
  private extractPrimaryTopic(text: string): string {
    const categories = this.extractTopicCategories(text)
    
    // Return the first category found, or 'general' if none
    return categories.length > 0 ? categories[0] : 'general'
  }

  /**
   * Estimate token count for text
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4)
  }

  /**
   * Generate embedding for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000) // Limit input length
      })

      return response.data[0].embedding

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        textLength: text.length
      }, 'Failed to generate embedding')
      
      // Return zero vector as fallback
      return new Array(1536).fill(0)
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    totalPosts: number
    totalChunks: number
    avgChunksPerPost: number
    avgAuthenticityScore: number
    topPatternTypes: Array<{ pattern: string; count: number }>
    processingHealth: 'excellent' | 'good' | 'fair' | 'poor'
  }> {
    try {
      const { data: stats, error } = await supabaseService.client
        .from('linkedin_rag_performance_stats')
        .select('*')
        .single()

      if (error) {
        logger.error({ error }, 'Failed to get processing stats')
        throw error
      }

      // Get top pattern types
      const { data: patternStats, error: patternError } = await supabaseService.client
        .rpc('get_top_linkedin_pattern_types', { limit_count: 5 })

      if (patternError) {
        logger.warn({ patternError }, 'Failed to get pattern statistics')
      }

      const totalPosts = stats?.unique_posts_processed || 0
      const totalChunks = stats?.total_records || 0
      const avgChunksPerPost = totalPosts > 0 ? totalChunks / totalPosts : 0
      const avgAuthenticityScore = (stats?.avg_authenticity || 0) * 100

      // Determine processing health
      let processingHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
      if (avgAuthenticityScore > 75 && totalChunks > 100) {
        processingHealth = 'excellent'
      } else if (avgAuthenticityScore > 60 && totalChunks > 50) {
        processingHealth = 'good'
      } else if (avgAuthenticityScore > 45 && totalChunks > 20) {
        processingHealth = 'fair'
      }

      return {
        totalPosts,
        totalChunks,
        avgChunksPerPost: Math.round(avgChunksPerPost * 10) / 10,
        avgAuthenticityScore: Math.round(avgAuthenticityScore),
        topPatternTypes: patternStats || [],
        processingHealth
      }

    } catch (error) {
      logger.error({ error }, 'Error getting processing stats')
      
      return {
        totalPosts: 0,
        totalChunks: 0,
        avgChunksPerPost: 0,
        avgAuthenticityScore: 0,
        topPatternTypes: [],
        processingHealth: 'poor'
      }
    }
  }
}

export const linkedInPostProcessor = new LinkedInPostProcessor()
export default linkedInPostProcessor