/**
 * Production-Ready RAG System for Voice Learning
 * 
 * This implements proper RAG architecture with:
 * - Small, semantically coherent chunks (100-500 tokens)
 * - Vector similarity search with filtering
 * - Context preservation through overlapping chunks
 * - Performance-based retrieval optimization
 * - Comprehensive voice pattern matching
 */

import { OpenAI } from 'openai'
import { createHash } from 'crypto'
import { supabaseService } from './supabase'
import logger from '../lib/logger'
import { appConfig } from '../config'

interface VoiceChunk {
  chunk_id: number
  chunk_text: string
  similarity_score: number
  token_count: number
  speaker?: string // Optional for LinkedIn chunks
  primary_topic: string
  pattern_types: string[]
  authenticity_score: number
  quality_score: number
  retrieval_frequency: number
  episode_title?: string // Optional for LinkedIn chunks
  guest_name?: string // Optional for LinkedIn chunks
  rank_score: number
  // LinkedIn-specific fields
  chunk_type?: string
  voice_markers?: string[]
  source_type: 'linkedin' | 'podcast' // Track source for prioritization
  original_post_date?: string
  context_relevance?: number
  semantic_density?: number
}

interface VoicePattern {
  pattern_id: string
  pattern_type: string
  pattern_text: string
  full_context: string
  similarity_score: number
  effectiveness_score: number
  frequency_score: number
  usage_context: string
  authenticity_indicators: string[]
  topic_categories: string[]
}

interface RAGRetrievalResult {
  relevantChunks: VoiceChunk[]
  relevantPatterns: VoicePattern[]
  contextualChunks: any[]
  retrievalMetadata: {
    queryHash: string
    totalChunksSearched: number
    avgSimilarityScore: number
    topicFocus: string
    retrievalLatency: number
    linkedInChunks?: number
    podcastChunks?: number
    prioritizationRatio?: number
  }
}

interface VoiceContextForGeneration {
  // Core RAG retrieved content
  relevantChunks: string[]           // 5-10 most relevant voice chunks
  relevantPatterns: VoicePattern[]   // 3-7 matching voice patterns
  contextualExamples: string[]       // Full context examples
  
  // Synthesized guidance
  voiceGuidelines: string
  authenticityBoosts: string[]
  topicSpecificAdvice: string[]
  
  // Performance metadata
  retrievalQuality: number
  contentConfidence: number
  sourceEpisodes: string[]
}

export class VoiceRAGSystem {
  private openai: OpenAI
  private embeddingCache: Map<string, number[]> = new Map()

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: appConfig.openai.apiKey 
    })
  }

  /**
   * Main RAG retrieval function for voice context with category-aware pattern retrieval
   */
  async getVoiceContextForGeneration(
    contentType: 'linkedin_post' | 'article' | 'comment' = 'linkedin_post',
    topicKeywords: string[] = [],
    requiredPatterns: string[] = ['confrontational', 'opening', 'storytelling'],
    maxChunks: number = 8,
    contextWindow: number = 1,
    openingCategory?: 'confrontational' | 'question' | 'story' | 'observation' | 'contrarian'
  ): Promise<VoiceContextForGeneration> {
    const startTime = Date.now()
    
    logger.info({
      contentType, 
      topicKeywords, 
      requiredPatterns, 
      maxChunks,
      openingCategory
    }, 'Starting RAG-based voice context retrieval with category awareness')

    try {
      // Step 1: Generate embedding for the query
      const queryText = this.buildQueryText(contentType, topicKeywords, requiredPatterns)
      const queryEmbedding = await this.generateEmbedding(queryText)
      const queryHash = this.generateQueryHash(queryText)

      // Step 2: RAG retrieval - get relevant chunks and patterns
      const ragResults = await this.performRAGRetrieval(
        queryEmbedding,
        topicKeywords,
        requiredPatterns,
        maxChunks,
        openingCategory
      )

      // Step 3: Get contextual chunks for better understanding
      if (ragResults.relevantChunks.length > 0) {
        const chunkIds = ragResults.relevantChunks.map(c => c.chunk_id)
        ragResults.contextualChunks = await this.getContextualChunks(chunkIds, contextWindow)
      }

      // Step 4: Log retrieval analytics
      await this.logRetrievalAnalytics(
        ragResults.relevantChunks,
        queryHash,
        queryText,
        contentType
      )

      // Step 5: Synthesize context for generation
      const voiceContext = await this.synthesizeVoiceContext(ragResults, topicKeywords)

      const totalTime = Date.now() - startTime
      logger.info({
        chunksRetrieved: ragResults.relevantChunks.length,
        patternsRetrieved: ragResults.relevantPatterns.length,
        avgSimilarity: ragResults.retrievalMetadata.avgSimilarityScore,
        retrievalLatency: totalTime
      }, 'RAG voice context retrieval completed')

      return voiceContext

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        contentType,
        topicKeywords
      }, 'RAG voice context retrieval failed')

      // Return minimal fallback context
      return this.getFallbackVoiceContext(contentType, topicKeywords)
    }
  }

  /**
   * Perform the core RAG retrieval using vector similarity search with LinkedIn prioritization
   */
  private async performRAGRetrieval(
    queryEmbedding: number[],
    topicKeywords: string[],
    requiredPatterns: string[],
    maxChunks: number,
    openingCategory?: 'confrontational' | 'question' | 'story' | 'observation' | 'contrarian'
  ): Promise<RAGRetrievalResult> {
    const startTime = Date.now()

    // Convert embedding to PostgreSQL vector format
    const embeddingVector = `[${queryEmbedding.join(',')}]`
    
    // Determine topic filter from keywords - try broader matching first
    const topicFilter = topicKeywords.length > 0 ? topicKeywords[0] : null
    
    // Apply category-aware pattern filtering
    let categoryFilteredPatterns = requiredPatterns
    if (openingCategory) {
      const categoryMappings = {
        confrontational: ['confrontational', 'authority', 'challenge'],
        question: ['question', 'inquiry', 'curious'],
        story: ['storytelling', 'narrative', 'personal'],
        observation: ['observation', 'insight', 'analysis'],
        contrarian: ['contrarian', 'counterintuitive', 'unconventional']
      }
      categoryFilteredPatterns = [...categoryFilteredPatterns, ...categoryMappings[openingCategory]]
    }

    logger.info({
      topicFilter,
      topicKeywords,
      similarityThreshold: 0.4,
      maxChunks,
      openingCategory,
      categoryFilteredPatterns
    }, 'RAG retrieval parameters with category awareness')
    
    // RAG Retrieval 1: PRIORITIZE LinkedIn post chunks (Andrew's written voice)
    const linkedInResults = await this.retrieveLinkedInChunks(
      embeddingVector,
      topicFilter,
      categoryFilteredPatterns,
      Math.ceil(maxChunks * 0.8) // 80% from LinkedIn posts
    )

    // RAG Retrieval 2: Supplement with podcast chunks if needed
    const supplementaryChunks = await this.retrievePodcastChunks(
      embeddingVector,
      topicFilter,
      categoryFilteredPatterns,
      Math.max(2, maxChunks - linkedInResults.length) // Fill remaining slots
    )

    // Combine and prioritize LinkedIn chunks
    const chunks = [...linkedInResults, ...supplementaryChunks].slice(0, maxChunks) as VoiceChunk[]

    logger.info({
      linkedInChunks: linkedInResults.length,
      podcastChunks: supplementaryChunks.length,
      totalChunks: chunks.length,
      linkedInPriority: linkedInResults.length / chunks.length
    }, 'RAG retrieval completed with LinkedIn prioritization')

    // Fallback: If we get very few chunks, try broader LinkedIn search
    if (chunks.length < 3 && topicFilter) {
      logger.info({ 
        chunksFound: chunks.length,
        originalTopic: topicFilter 
      }, 'Low chunk count with topic filter, trying broader LinkedIn search')
      
      const broadLinkedInResults = await this.retrieveLinkedInChunks(
        embeddingVector,
        null, // Remove topic filter
        categoryFilteredPatterns,
        maxChunks,
        0.35 // More lenient threshold
      )

      if (broadLinkedInResults.length > chunks.length) {
        logger.info({ 
          originalChunks: chunks.length,
          broadLinkedInChunks: broadLinkedInResults.length 
        }, 'Using broader LinkedIn search results')
        
        chunks.splice(0, chunks.length, ...broadLinkedInResults)
      }
    }

    // RAG Retrieval 2: Get relevant voice patterns with category awareness
    const { data: patterns, error: patternsError } = await supabaseService.client
      .rpc('match_voice_patterns', {
        query_embedding: embeddingVector,
        pattern_types_filter: categoryFilteredPatterns.length > 0 ? categoryFilteredPatterns : null,
        similarity_threshold: 0.2, // More lenient for patterns
        max_patterns: 5,
        min_effectiveness: 0.1
      })

    if (patternsError) {
      logger.error({ patternsError }, 'Failed to retrieve voice patterns')
      // Continue without patterns rather than failing completely
    }

    const retrievalLatency = Date.now() - startTime
    const avgSimilarityScore = chunks?.length > 0 
      ? chunks.reduce((sum: number, chunk: any) => sum + chunk.similarity_score, 0) / chunks.length
      : 0

    return {
      relevantChunks: chunks || [],
      relevantPatterns: patterns || [],
      contextualChunks: [],
      retrievalMetadata: {
        queryHash: this.generateQueryHash(`${topicKeywords.join(' ')} ${requiredPatterns.join(' ')}`),
        totalChunksSearched: chunks?.length || 0,
        avgSimilarityScore,
        topicFocus: topicKeywords.join(', '),
        retrievalLatency,
        linkedInChunks: linkedInResults.length,
        podcastChunks: supplementaryChunks.length,
        prioritizationRatio: linkedInResults.length / Math.max(chunks.length, 1)
      }
    }
  }

  /**
   * Get contextual chunks (with overlap) for better understanding
   */
  private async getContextualChunks(
    baseChunkIds: number[], 
    contextWindow: number = 1
  ): Promise<any[]> {
    try {
      const { data: contextChunks, error } = await supabaseService.client
        .rpc('get_contextual_chunks', {
          base_chunk_ids: baseChunkIds,
          context_window: contextWindow
        })

      if (error) {
        logger.error({ error }, 'Failed to get contextual chunks')
        return []
      }

      return contextChunks || []
    } catch (error) {
      logger.error({ error }, 'Error getting contextual chunks')
      return []
    }
  }

  /**
   * Synthesize the retrieved RAG data into usable voice context
   */
  private async synthesizeVoiceContext(
    ragResults: RAGRetrievalResult,
    topicKeywords: string[]
  ): Promise<VoiceContextForGeneration> {
    const { relevantChunks, relevantPatterns, contextualChunks } = ragResults

    // Extract the most relevant voice content
    const relevantChunkTexts = relevantChunks
      .slice(0, 8) // Limit to top 8 chunks
      .map(chunk => chunk.chunk_text)

    // Build contextual examples with episode context
    const contextualExamples = this.buildContextualExamples(relevantChunks, contextualChunks)

    // Generate comprehensive voice guidelines
    const voiceGuidelines = this.buildRAGEnhancedVoiceGuidelines(
      relevantChunks, 
      relevantPatterns, 
      topicKeywords
    )

    // Extract authenticity boosters from patterns
    const authenticityBoosts = this.extractAuthenticityBoostersFromRAG(relevantPatterns)

    // Generate topic-specific advice
    const topicSpecificAdvice = this.generateTopicSpecificAdvice(
      relevantChunks, 
      topicKeywords
    )

    // Calculate retrieval quality metrics
    const retrievalQuality = this.calculateRetrievalQuality(ragResults)
    const contentConfidence = this.calculateContentConfidence(relevantChunks, relevantPatterns)

    // Extract source episodes for reference
    const sourceEpisodes = [
      ...new Set(relevantChunks.map(chunk => chunk.episode_title).filter((title): title is string => Boolean(title)))
    ].slice(0, 5)

    return {
      relevantChunks: relevantChunkTexts,
      relevantPatterns,
      contextualExamples,
      voiceGuidelines,
      authenticityBoosts,
      topicSpecificAdvice,
      retrievalQuality,
      contentConfidence,
      sourceEpisodes
    }
  }

  /**
   * Build enhanced voice guidelines using RAG-retrieved content
   */
  private buildRAGEnhancedVoiceGuidelines(
    chunks: VoiceChunk[], 
    patterns: VoicePattern[],
    topicKeywords: string[]
  ): string {
    const linkedInChunks = chunks.filter(c => c.source_type === 'linkedin')
    const podcastChunks = chunks.filter(c => c.source_type === 'podcast')
    
    let guidelines = `**ANDREW'S AUTHENTIC VOICE - LINKEDIN-PRIORITIZED RAG (${linkedInChunks.length} LinkedIn + ${podcastChunks.length} Podcast)**\n\n`
    
    guidelines += `**VOICE SOURCE PRIORITIZATION:**\n`
    guidelines += `✅ PRIMARY: LinkedIn Posts (${linkedInChunks.length} chunks) - Andrew's direct written voice\n`
    guidelines += `🔄 SUPPLEMENTARY: Podcast Transcripts (${podcastChunks.length} chunks) - Conversational context\n\n`

    // Add pattern-based guidelines from RAG
    if (patterns.length > 0) {
      guidelines += `**RETRIEVED VOICE PATTERNS (${patterns.length} patterns found):**\n`
      
      const patternsByType = this.groupPatternsByType(patterns)
      
      Object.entries(patternsByType).forEach(([type, typePatterns]) => {
        guidelines += `\n**${type.toUpperCase()} PATTERNS:**\n`
        typePatterns.slice(0, 2).forEach((pattern, i) => {
          guidelines += `${i + 1}. "${pattern.pattern_text}"\n`
          guidelines += `   - Context: ${pattern.usage_context}\n`
          guidelines += `   - Effectiveness: ${Math.round(pattern.effectiveness_score * 100)}%\n`
          guidelines += `   - Authenticity markers: ${pattern.authenticity_indicators.join(', ')}\n`
        })
      })
    }

    // Add examples from retrieved chunks (prioritizing LinkedIn)
    if (chunks.length > 0) {
      guidelines += `\n**RAG-RETRIEVED VOICE EXAMPLES (LinkedIn-Prioritized):**\n`
      
      // Prioritize LinkedIn chunks for examples
      const sortedChunks = chunks
        .filter(chunk => chunk.authenticity_score >= 60)
        .sort((a, b) => {
          // LinkedIn chunks get priority boost
          const aScore = a.authenticity_score + (a.source_type === 'linkedin' ? 20 : 0)
          const bScore = b.authenticity_score + (b.source_type === 'linkedin' ? 20 : 0)
          return bScore - aScore
        })
        .slice(0, 3)
      
      sortedChunks.forEach((chunk, i) => {
        const truncatedText = chunk.chunk_text.length > 200 
          ? chunk.chunk_text.substring(0, 200) + '...'
          : chunk.chunk_text
        guidelines += `${i + 1}. "${truncatedText}"\n`
        
        if (chunk.source_type === 'linkedin') {
          guidelines += `   - Source: ✅ LinkedIn Post (${chunk.original_post_date ? new Date(chunk.original_post_date).toLocaleDateString() : 'Recent'})\n`
          if (chunk.chunk_type) guidelines += `   - Type: ${chunk.chunk_type}\n`
          if (chunk.voice_markers && chunk.voice_markers.length > 0) {
            guidelines += `   - Voice Markers: ${chunk.voice_markers.join(', ')}\n`
          }
        } else {
          guidelines += `   - Source: 🔄 Podcast: ${chunk.episode_title}\n`
        }
        
        guidelines += `   - Authenticity: ${chunk.authenticity_score}%\n`
        guidelines += `   - Patterns: ${chunk.pattern_types.join(', ')}\n\n`
      })
    }

    // Add topic-specific insights
    if (topicKeywords.length > 0) {
      guidelines += `\n**TOPIC-SPECIFIC VOICE GUIDANCE (${topicKeywords.join(', ')}):**\n`
      const topicRelevantChunks = chunks.filter(chunk => 
        topicKeywords.some(keyword => 
          chunk.chunk_text.toLowerCase().includes(keyword.toLowerCase()) ||
          chunk.primary_topic?.toLowerCase().includes(keyword.toLowerCase())
        )
      )

      if (topicRelevantChunks.length > 0) {
        const avgAuthenticity = Math.round(
          topicRelevantChunks.reduce((sum, chunk) => sum + chunk.authenticity_score, 0) / topicRelevantChunks.length
        )
        guidelines += `- Found ${topicRelevantChunks.length} topic-relevant examples (avg authenticity: ${avgAuthenticity}%)\n`
        guidelines += `- Common patterns in this topic: ${this.extractTopicPatterns(topicRelevantChunks)}\n`
      }
    }

    // Add authenticity reminders based on retrieved data
    guidelines += `\n**AUTHENTICITY MARKERS FROM RAG ANALYSIS:**\n`
    const authenticityMarkers = this.extractAuthenticityMarkersFromChunks(chunks)
    authenticityMarkers.forEach(marker => {
      guidelines += `- ${marker}\n`
    })

    return guidelines
  }

  /**
   * Build contextual examples with proper context
   */
  private buildContextualExamples(
    chunks: VoiceChunk[], 
    contextualChunks: any[]
  ): string[] {
    const examples: string[] = []

    // Group contextual chunks by base chunk
    const contextByBaseChunk = new Map()
    contextualChunks.forEach(context => {
      if (!contextByBaseChunk.has(context.base_chunk_id)) {
        contextByBaseChunk.set(context.base_chunk_id, [])
      }
      contextByBaseChunk.get(context.base_chunk_id).push(context)
    })

    // Build full contextual examples for top chunks
    chunks.slice(0, 3).forEach(chunk => {
      const contexts = contextByBaseChunk.get(chunk.chunk_id) || []
      if (contexts.length > 0) {
        // Sort by context position
        contexts.sort((a: any, b: any) => a.context_position - b.context_position)
        
        const fullContext = contexts
          .map((ctx: any) => ctx.chunk_text)
          .join(' [...] ')
        
        examples.push(fullContext)
      } else {
        examples.push(chunk.chunk_text)
      }
    })

    return examples
  }

  /**
   * Generate topic-specific advice based on RAG results
   */
  private generateTopicSpecificAdvice(
    chunks: VoiceChunk[],
    topicKeywords: string[]
  ): string[] {
    const advice: string[] = []

    if (topicKeywords.length === 0) {
      return advice
    }

    // Analyze topic-specific patterns
    const topicChunks = chunks.filter(chunk => 
      topicKeywords.some(keyword => 
        chunk.chunk_text.toLowerCase().includes(keyword.toLowerCase())
      )
    )

    if (topicChunks.length === 0) {
      return advice
    }

    // Extract common patterns for this topic
    const topicPatterns = new Set<string>()
    topicChunks.forEach(chunk => {
      chunk.pattern_types.forEach(pattern => topicPatterns.add(pattern))
    })

    // Generate advice based on patterns
    if (topicPatterns.has('confrontational')) {
      advice.push(`For ${topicKeywords[0]} topics, Andrew often uses confrontational openings to challenge assumptions`)
    }
    
    if (topicPatterns.has('storytelling')) {
      advice.push(`Personal stories work well for ${topicKeywords[0]} content - ${topicChunks.filter(c => c.pattern_types.includes('storytelling')).length} examples found`)
    }

    if (topicPatterns.has('authority')) {
      advice.push(`Establish authority early when discussing ${topicKeywords[0]} - reference specific experience or research`)
    }

    // Add authenticity-based advice
    const avgAuthenticity = topicChunks.reduce((sum, chunk) => sum + chunk.authenticity_score, 0) / topicChunks.length
    if (avgAuthenticity > 75) {
      advice.push(`High authenticity works for ${topicKeywords[0]} topics (avg: ${Math.round(avgAuthenticity)}%) - be vulnerable and personal`)
    }

    return advice.slice(0, 5) // Limit to 5 pieces of advice
  }

  /**
   * Log retrieval analytics for optimization
   */
  private async logRetrievalAnalytics(
    chunks: VoiceChunk[],
    queryHash: string,
    queryText: string,
    contentType: string
  ): Promise<void> {
    try {
      // Log each retrieved chunk for analytics
      const analyticsData = chunks.map((chunk, index) => ({
        chunk_id: chunk.chunk_id,
        query_hash: queryHash,
        similarity_score: chunk.similarity_score,
        rank_position: index + 1,
        query_topic: queryText,
        content_type: contentType,
        was_used_in_generation: true // Will be updated later if content is generated
      }))

      // Batch insert analytics
      if (analyticsData.length > 0) {
        const { error } = await supabaseService.client
          .from('chunk_retrieval_analytics')
          .insert(analyticsData)

        if (error) {
          logger.error({ error }, 'Failed to log retrieval analytics')
        } else {
          logger.debug({ chunksLogged: analyticsData.length }, 'Logged retrieval analytics')
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error logging retrieval analytics')
    }
  }

  /**
   * Generate embedding for query text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = createHash('md5').update(text).digest('hex')
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      })

      const embedding = response.data[0].embedding
      
      // Cache the embedding
      this.embeddingCache.set(cacheKey, embedding)

      return embedding
    } catch (error) {
      logger.error({ error }, 'Failed to generate embedding')
      throw new Error('Embedding generation failed')
    }
  }

  /**
   * Build query text from parameters
   */
  private buildQueryText(
    contentType: string,
    topicKeywords: string[],
    requiredPatterns: string[]
  ): string {
    let queryText = `${contentType} content about ${topicKeywords.join(', ')}`
    
    if (requiredPatterns.length > 0) {
      queryText += ` using ${requiredPatterns.join(', ')} patterns`
    }

    return queryText
  }

  /**
   * Generate query hash for caching and analytics
   */
  private generateQueryHash(queryText: string): string {
    return createHash('sha256').update(queryText.toLowerCase().trim()).digest('hex')
  }

  /**
   * Utility functions for voice context building
   */
  private groupPatternsByType(patterns: VoicePattern[]): Record<string, VoicePattern[]> {
    return patterns.reduce((acc, pattern) => {
      if (!acc[pattern.pattern_type]) {
        acc[pattern.pattern_type] = []
      }
      acc[pattern.pattern_type].push(pattern)
      return acc
    }, {} as Record<string, VoicePattern[]>)
  }

  private extractAuthenticityBoostersFromRAG(patterns: VoicePattern[]): string[] {
    const boosters = new Set<string>()
    
    patterns.forEach(pattern => {
      pattern.authenticity_indicators.forEach(indicator => {
        boosters.add(indicator)
      })
    })

    return Array.from(boosters).slice(0, 10)
  }

  private extractTopicPatterns(chunks: VoiceChunk[]): string {
    const patternCounts = new Map<string, number>()
    
    chunks.forEach(chunk => {
      chunk.pattern_types.forEach(pattern => {
        patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1)
      })
    })

    return Array.from(patternCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([pattern, count]) => `${pattern} (${count}x)`)
      .join(', ')
  }

  private extractAuthenticityMarkersFromChunks(chunks: VoiceChunk[]): string[] {
    const markers = new Set<string>()
    
    // Analyze chunks for authenticity patterns
    chunks.forEach(chunk => {
      if (chunk.authenticity_score >= 70) {
        if (chunk.pattern_types.includes('vulnerability')) {
          markers.add('Personal vulnerability and honest admissions')
        }
        if (chunk.pattern_types.includes('confrontational')) {
          markers.add('Direct, challenging statements that provoke thought')
        }
        if (chunk.pattern_types.includes('storytelling')) {
          markers.add('Personal experience and real examples')
        }
        if (chunk.pattern_types.includes('authority')) {
          markers.add('Confident expertise backed by experience')
        }
      }
    })

    // Add default markers if none found
    if (markers.size === 0) {
      markers.add('Authentic personal experience')
      markers.add('Direct, honest communication')
      markers.add('Research-backed insights')
    }

    return Array.from(markers).slice(0, 6)
  }

  private calculateRetrievalQuality(ragResults: RAGRetrievalResult): number {
    const { relevantChunks, relevantPatterns } = ragResults

    if (relevantChunks.length === 0) return 0

    // Quality based on similarity scores and chunk quality
    const avgSimilarity = relevantChunks.reduce((sum, chunk) => sum + chunk.similarity_score, 0) / relevantChunks.length
    const avgQuality = relevantChunks.reduce((sum, chunk) => sum + chunk.quality_score, 0) / relevantChunks.length
    const patternCoverage = relevantPatterns.length >= 3 ? 1.0 : relevantPatterns.length / 3.0

    return Math.min(1.0, (avgSimilarity * 0.4) + (avgQuality * 0.4) + (patternCoverage * 0.2))
  }

  private calculateContentConfidence(chunks: VoiceChunk[], patterns: VoicePattern[]): number {
    if (chunks.length === 0) return 0

    const chunkConfidence = chunks.reduce((sum, chunk) => sum + (chunk.authenticity_score / 100), 0) / chunks.length
    const patternConfidence = patterns.length > 0 
      ? patterns.reduce((sum, pattern) => sum + pattern.effectiveness_score, 0) / patterns.length
      : 0.5

    return Math.min(1.0, (chunkConfidence * 0.6) + (patternConfidence * 0.4))
  }

  /**
   * Fallback voice context when RAG fails
   */
  private getFallbackVoiceContext(
    contentType: string, 
    topicKeywords: string[]
  ): VoiceContextForGeneration {
    logger.warn({ contentType, topicKeywords }, 'Using fallback voice context - RAG retrieval failed')

    return {
      relevantChunks: [],
      relevantPatterns: [],
      contextualExamples: [],
      voiceGuidelines: `**FALLBACK VOICE GUIDELINES (RAG unavailable)**\n\n` +
        `Use Andrew's signature confrontational but supportive approach.\n` +
        `Reference specific research and personal experience.\n` +
        `Challenge assumptions while providing practical solutions.\n` +
        `Be vulnerable about challenges while demonstrating authority.`,
      authenticityBoosts: [
        'confrontational openings',
        'personal vulnerability',
        'research citations',
        'authority establishment'
      ],
      topicSpecificAdvice: [
        `For ${contentType}, focus on practical value`,
        'Use personal experience to build trust',
        'Challenge common assumptions',
        'Provide actionable insights'
      ],
      retrievalQuality: 0,
      contentConfidence: 0.3,
      sourceEpisodes: []
    }
  }

  /**
   * Get voice learning statistics
   */
  async getRAGSystemStats(): Promise<{
    totalChunks: number
    totalPatterns: number
    avgChunkQuality: number
    avgPatternEffectiveness: number
    retrievalStats: any
    systemHealth: 'excellent' | 'good' | 'fair' | 'poor'
  }> {
    try {
      // Get system statistics from the performance view
      const { data: stats, error } = await supabaseService.client
        .from('rag_performance_stats')
        .select('*')

      if (error) {
        logger.error({ error }, 'Failed to get RAG system stats')
        throw error
      }

      // Process the stats
      const chunkStats = stats?.find(s => s.type === 'chunks')
      const patternStats = stats?.find(s => s.type === 'patterns')

      // Determine system health
      let systemHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
      
      if (chunkStats && patternStats) {
        const chunkQuality = chunkStats.avg_quality || 0
        const patternEffectiveness = patternStats.avg_effectiveness || 0
        
        if (chunkQuality > 0.7 && patternEffectiveness > 0.7) {
          systemHealth = 'excellent'
        } else if (chunkQuality > 0.5 && patternEffectiveness > 0.5) {
          systemHealth = 'good'
        } else if (chunkQuality > 0.3 && patternEffectiveness > 0.3) {
          systemHealth = 'fair'
        }
      }

      return {
        totalChunks: chunkStats?.total_records || 0,
        totalPatterns: patternStats?.total_records || 0,
        avgChunkQuality: chunkStats?.avg_quality || 0,
        avgPatternEffectiveness: patternStats?.avg_effectiveness || 0,
        retrievalStats: {
          andrewChunks: chunkStats?.andrew_chunks || 0,
          highQualityChunks: chunkStats?.high_quality_chunks || 0,
          highEngagementPatterns: patternStats?.high_engagement_patterns || 0,
          effectivePatterns: patternStats?.effective_patterns || 0
        },
        systemHealth
      }
    } catch (error) {
      logger.error({ error }, 'Error getting RAG system stats')
      
      return {
        totalChunks: 0,
        totalPatterns: 0,
        avgChunkQuality: 0,
        avgPatternEffectiveness: 0,
        retrievalStats: {},
        systemHealth: 'poor'
      }
    }
  }

  /**
   * Perform system maintenance
   */
  async performSystemMaintenance(): Promise<{
    chunksUpdated: number
    analyticsDeleted: number
    patternsOptimized: number
    maintenanceSuccess: boolean
  }> {
    try {
      logger.info('Starting RAG system maintenance')

      const { data, error } = await supabaseService.client
        .rpc('maintain_rag_system')

      if (error) {
        logger.error({ error }, 'RAG system maintenance failed')
        throw error
      }

      const result = data[0] || {}
      
      logger.info({
        chunksUpdated: result.chunks_updated,
        analyticsDeleted: result.old_analytics_deleted,
        patternsOptimized: result.patterns_optimized
      }, 'RAG system maintenance completed')

      return {
        chunksUpdated: result.chunks_updated || 0,
        analyticsDeleted: result.old_analytics_deleted || 0,
        patternsOptimized: result.patterns_optimized || 0,
        maintenanceSuccess: true
      }
    } catch (error) {
      logger.error({ error }, 'Error performing RAG system maintenance')
      
      return {
        chunksUpdated: 0,
        analyticsDeleted: 0,
        patternsOptimized: 0,
        maintenanceSuccess: false
      }
    }
  }

  /**
   * Get voice chunks by pattern category for opening pattern extraction
   */
  async getChunksByPatternCategory(
    category: 'confrontational' | 'question' | 'story' | 'observation' | 'contrarian',
    topicKeywords: string[] = [],
    maxChunks: number = 10
  ): Promise<VoiceChunk[]> {
    try {
      // Map strategic categories to actual database pattern types
      const categoryMappings = {
        confrontational: ['challenge', 'authority', 'reframe'],
        question: ['question'],
        story: ['storytelling', 'vulnerability', 'empathy'],
        observation: ['data_presentation', 'analogy', 'teaching'],
        contrarian: ['reframe', 'challenge', 'authority']
      }

      const patternTypes = categoryMappings[category] || []
      
      let query = supabaseService.client
        .from('voice_content_chunks')
        .select(`
          id,
          chunk_text,
          authenticity_score,
          quality_score,
          episode_title,
          primary_topic,
          pattern_types,
          speaker,
          token_count,
          retrieval_frequency,
          guest_name
        `)
        .eq('speaker', 'andrew')
        .gte('authenticity_score', 60)
        .overlaps('pattern_types', patternTypes)
        .limit(maxChunks)
        .order('authenticity_score', { ascending: false })

      // Add topic filter if specified
      if (topicKeywords.length > 0) {
        query = query.or(
          topicKeywords
            .map(keyword => `chunk_text.ilike.%${keyword}%,primary_topic.ilike.%${keyword}%`)
            .join(',')
        )
      }

      const { data, error } = await query

      if (error) {
        logger.error({ 
          error, 
          category, 
          topicKeywords 
        }, 'Failed to fetch chunks by pattern category')
        return []
      }

      const chunks = data?.map(chunk => ({
        ...chunk,
        chunk_id: chunk.id, // Map id to chunk_id for consistency
        similarity_score: 0.8, // Default similarity for direct category matches
        rank_score: 0.8 // Default rank score for direct category matches
      })) || []

      logger.debug({
        category,
        chunksFound: chunks.length,
        avgAuthenticity: chunks.length > 0 
          ? chunks.reduce((sum, c) => sum + c.authenticity_score, 0) / chunks.length 
          : 0
      }, 'Retrieved chunks by pattern category')

      return chunks

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        category,
        topicKeywords
      }, 'Error fetching chunks by pattern category')
      return []
    }
  }

  /**
   * Retrieve LinkedIn post chunks (PRIMARY voice source)
   */
  private async retrieveLinkedInChunks(
    embeddingVector: string,
    topicFilter: string | null,
    patternTypesFilter: string[],
    maxChunks: number,
    similarityThreshold: number = 0.5
  ): Promise<VoiceChunk[]> {
    try {
      const { data: linkedInChunks, error } = await supabaseService.client
        .rpc('match_linkedin_post_chunks', {
          query_embedding: embeddingVector,
          chunk_types_filter: null, // Allow all chunk types
          pattern_types_filter: patternTypesFilter.length > 0 ? patternTypesFilter : null,
          similarity_threshold: similarityThreshold,
          max_chunks: maxChunks,
          min_authenticity_score: 60 // Focus on high-authenticity LinkedIn content
        })

      if (error) {
        logger.error({ error }, 'Failed to retrieve LinkedIn chunks')
        return []
      }

      // Map LinkedIn chunks to VoiceChunk interface
      const mappedChunks: VoiceChunk[] = (linkedInChunks || []).map((chunk: any) => ({
        chunk_id: chunk.chunk_id,
        chunk_text: chunk.chunk_text,
        similarity_score: chunk.similarity_score,
        token_count: chunk.token_count,
        primary_topic: chunk.primary_topic || 'general',
        pattern_types: chunk.pattern_types || [],
        authenticity_score: chunk.authenticity_score,
        quality_score: chunk.quality_score,
        retrieval_frequency: chunk.retrieval_frequency,
        rank_score: chunk.rank_score,
        chunk_type: chunk.chunk_type,
        voice_markers: chunk.voice_markers || [],
        source_type: 'linkedin',
        original_post_date: chunk.original_post_date,
        context_relevance: chunk.context_relevance,
        semantic_density: chunk.semantic_density
      }))

      logger.info({
        linkedInChunksFound: mappedChunks.length,
        avgAuthenticity: mappedChunks.length > 0 
          ? mappedChunks.reduce((sum, c) => sum + c.authenticity_score, 0) / mappedChunks.length 
          : 0,
        avgSimilarity: mappedChunks.length > 0
          ? mappedChunks.reduce((sum, c) => sum + c.similarity_score, 0) / mappedChunks.length
          : 0
      }, 'Retrieved LinkedIn post chunks (PRIMARY voice source)')

      return mappedChunks

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Error retrieving LinkedIn chunks')
      return []
    }
  }

  /**
   * Retrieve podcast chunks (SUPPLEMENTARY voice source)
   */
  private async retrievePodcastChunks(
    embeddingVector: string,
    topicFilter: string | null,
    patternTypesFilter: string[],
    maxChunks: number,
    similarityThreshold: number = 0.4
  ): Promise<VoiceChunk[]> {
    try {
      const { data: podcastChunks, error } = await supabaseService.client
        .rpc('match_voice_chunks', {
          query_embedding: embeddingVector,
          speaker_filter: 'andrew',
          similarity_threshold: similarityThreshold,
          max_chunks: maxChunks,
          min_quality_score: 0.0,
          topic_filter: topicFilter,
          pattern_types_filter: patternTypesFilter.length > 0 ? patternTypesFilter : null
        })

      if (error) {
        logger.error({ error }, 'Failed to retrieve podcast chunks')
        return []
      }

      // Map podcast chunks to VoiceChunk interface with source_type
      const mappedChunks: VoiceChunk[] = (podcastChunks || []).map((chunk: any) => ({
        chunk_id: chunk.chunk_id,
        chunk_text: chunk.chunk_text,
        similarity_score: chunk.similarity_score,
        token_count: chunk.token_count,
        speaker: chunk.speaker,
        primary_topic: chunk.primary_topic,
        pattern_types: chunk.pattern_types,
        authenticity_score: chunk.authenticity_score,
        quality_score: chunk.quality_score,
        retrieval_frequency: chunk.retrieval_frequency,
        episode_title: chunk.episode_title,
        guest_name: chunk.guest_name,
        rank_score: chunk.rank_score,
        source_type: 'podcast' as const
      }))

      logger.info({
        podcastChunksFound: mappedChunks.length,
        avgAuthenticity: mappedChunks.length > 0 
          ? mappedChunks.reduce((sum, c) => sum + c.authenticity_score, 0) / mappedChunks.length 
          : 0
      }, 'Retrieved podcast chunks (SUPPLEMENTARY voice source)')

      return mappedChunks

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Error retrieving podcast chunks')
      return []
    }
  }

  /**
   * Get LinkedIn chunks by category (primary source)
   */
  private async getLinkedInChunksByCategory(
    category: string,
    topicKeywords: string[],
    maxChunks: number
  ): Promise<VoiceChunk[]> {
    try {
      const categoryMappings = {
        confrontational: ['confrontational', 'challenge'],
        question: ['question', 'philosophical_question'],
        story: ['storytelling', 'personal_experience'],
        observation: ['insight_reveal', 'research_citation'],
        contrarian: ['counterintuitive', 'reframe']
      }

      const patternTypes = categoryMappings[category as keyof typeof categoryMappings] || []
      
      let query = supabaseService.client
        .from('linkedin_post_chunks')
        .select(`
          id,
          chunk_text,
          authenticity_score,
          quality_score,
          primary_topic,
          pattern_types,
          token_count,
          retrieval_frequency,
          chunk_type,
          voice_markers,
          context_relevance,
          semantic_density,
          original_post_date
        `)
        .gte('authenticity_score', 70) // Higher threshold for LinkedIn
        .overlaps('pattern_types', patternTypes)
        .limit(maxChunks)
        .order('authenticity_score', { ascending: false })

      // Add topic filter if specified
      if (topicKeywords.length > 0) {
        query = query.or(
          topicKeywords
            .map(keyword => `chunk_text.ilike.%${keyword}%,primary_topic.ilike.%${keyword}%`)
            .join(',')
        )
      }

      const { data, error } = await query

      if (error) {
        logger.error({ error, category }, 'Failed to fetch LinkedIn chunks by category')
        return []
      }

      return data?.map(chunk => ({
        chunk_id: chunk.id,
        chunk_text: chunk.chunk_text,
        similarity_score: 0.85, // Higher for LinkedIn direct matches
        token_count: chunk.token_count,
        primary_topic: chunk.primary_topic || 'general',
        pattern_types: chunk.pattern_types || [],
        authenticity_score: chunk.authenticity_score,
        quality_score: chunk.quality_score,
        retrieval_frequency: chunk.retrieval_frequency,
        rank_score: 0.85,
        chunk_type: chunk.chunk_type,
        voice_markers: chunk.voice_markers,
        source_type: 'linkedin' as const,
        original_post_date: chunk.original_post_date,
        context_relevance: chunk.context_relevance,
        semantic_density: chunk.semantic_density
      })) || []

    } catch (error) {
      logger.error({ error, category }, 'Error fetching LinkedIn chunks by category')
      return []
    }
  }

  /**
   * Get podcast chunks by category (supplementary source)
   */
  private async getPodcastChunksByCategory(
    category: string,
    topicKeywords: string[],
    maxChunks: number
  ): Promise<VoiceChunk[]> {
    try {
      const categoryMappings = {
        confrontational: ['challenge', 'authority', 'reframe'],
        question: ['question'],
        story: ['storytelling', 'vulnerability', 'empathy'],
        observation: ['data_presentation', 'analogy', 'teaching'],
        contrarian: ['reframe', 'challenge', 'authority']
      }

      const patternTypes = categoryMappings[category as keyof typeof categoryMappings] || []
      
      let query = supabaseService.client
        .from('voice_content_chunks')
        .select(`
          id,
          chunk_text,
          authenticity_score,
          quality_score,
          episode_title,
          primary_topic,
          pattern_types,
          speaker,
          token_count,
          retrieval_frequency,
          guest_name
        `)
        .eq('speaker', 'andrew')
        .gte('authenticity_score', 60)
        .overlaps('pattern_types', patternTypes)
        .limit(maxChunks)
        .order('authenticity_score', { ascending: false })

      // Add topic filter if specified
      if (topicKeywords.length > 0) {
        query = query.or(
          topicKeywords
            .map(keyword => `chunk_text.ilike.%${keyword}%,primary_topic.ilike.%${keyword}%`)
            .join(',')
        )
      }

      const { data, error } = await query

      if (error) {
        logger.error({ error, category }, 'Failed to fetch podcast chunks by category')
        return []
      }

      return data?.map(chunk => ({
        chunk_id: chunk.id,
        chunk_text: chunk.chunk_text,
        similarity_score: 0.75, // Lower than LinkedIn
        token_count: chunk.token_count,
        speaker: chunk.speaker,
        primary_topic: chunk.primary_topic,
        pattern_types: chunk.pattern_types,
        authenticity_score: chunk.authenticity_score,
        quality_score: chunk.quality_score,
        retrieval_frequency: chunk.retrieval_frequency,
        episode_title: chunk.episode_title,
        guest_name: chunk.guest_name,
        rank_score: 0.75,
        source_type: 'podcast' as const
      })) || []

    } catch (error) {
      logger.error({ error, category }, 'Error fetching podcast chunks by category')
      return []
    }
  }
}

export const voiceRAGSystem = new VoiceRAGSystem()
export default voiceRAGSystem