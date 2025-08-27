/**
 * LinkedIn-Only RAG System for Voice Learning
 * 
 * This is a simplified, LinkedIn-exclusive version of the RAG system that:
 * - Uses ONLY LinkedIn post chunks as voice training data
 * - Eliminates podcast/webinar voice contamination  
 * - Provides authentic, consistent LinkedIn voice patterns
 * - Maintains full RAG functionality with a single, high-quality data source
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
  primary_topic: string
  pattern_types: string[]
  authenticity_score: number
  quality_score: number
  retrieval_frequency: number
  rank_score: number
  // LinkedIn-specific fields
  chunk_type?: string
  voice_markers?: string[]
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
    linkedInChunks: number
    dataSource: 'linkedin_exclusive'
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
  sourceInfo: {
    dataSource: 'linkedin_exclusive'
    uniquePostsReferenced: number
    avgAuthenticityScore: number
  }
}

export class LinkedInOnlyVoiceRAGSystem {
  private openai: OpenAI
  private embeddingCache: Map<string, number[]> = new Map()

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: appConfig.openai.apiKey 
    })
  }

  /**
   * Main RAG retrieval function for LinkedIn-exclusive voice context
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
      openingCategory,
      dataSource: 'linkedin_exclusive'
    }, 'Starting LinkedIn-exclusive RAG voice context retrieval')

    try {
      // Step 1: Generate embedding for the query
      const queryText = this.buildQueryText(contentType, topicKeywords, requiredPatterns)
      const queryEmbedding = await this.generateEmbedding(queryText)
      const queryHash = this.generateQueryHash(queryText)

      // Step 2: LinkedIn-only RAG retrieval
      const ragResults = await this.performLinkedInOnlyRetrieval(
        queryEmbedding,
        topicKeywords,
        requiredPatterns,
        maxChunks,
        openingCategory
      )

      // Step 3: Get contextual chunks for better understanding (if needed)
      // Note: LinkedIn chunks may not have the same contextual linking as podcast chunks
      // This is a simplified context approach
      ragResults.contextualChunks = await this.getLinkedInContextualChunks(
        ragResults.relevantChunks.map(c => c.chunk_id),
        contextWindow
      )

      // Step 4: Log retrieval analytics
      await this.logLinkedInRetrievalAnalytics(
        ragResults.relevantChunks,
        queryHash,
        queryText,
        contentType
      )

      // Step 5: Synthesize LinkedIn-focused voice context
      const voiceContext = await this.synthesizeLinkedInVoiceContext(ragResults, topicKeywords)

      const totalTime = Date.now() - startTime
      logger.info({
        chunksRetrieved: ragResults.relevantChunks.length,
        patternsRetrieved: ragResults.relevantPatterns.length,
        avgSimilarity: ragResults.retrievalMetadata.avgSimilarityScore,
        avgAuthenticity: voiceContext.sourceInfo.avgAuthenticityScore,
        retrievalLatency: totalTime,
        dataSource: 'linkedin_exclusive'
      }, 'LinkedIn-exclusive RAG voice context retrieval completed')

      return voiceContext

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        contentType,
        topicKeywords
      }, 'LinkedIn-exclusive RAG voice context retrieval failed')

      // Return minimal fallback context
      return this.getLinkedInFallbackVoiceContext(contentType, topicKeywords)
    }
  }

  /**
   * Perform LinkedIn-exclusive RAG retrieval
   */
  private async performLinkedInOnlyRetrieval(
    queryEmbedding: number[],
    topicKeywords: string[],
    requiredPatterns: string[],
    maxChunks: number,
    openingCategory?: 'confrontational' | 'question' | 'story' | 'observation' | 'contrarian'
  ): Promise<RAGRetrievalResult> {
    const startTime = Date.now()

    // Convert embedding to PostgreSQL vector format
    const embeddingVector = `[${queryEmbedding.join(',')}]`
    
    // Determine topic filter from keywords
    const topicFilter = topicKeywords.length > 0 ? topicKeywords[0] : null
    
    // Apply category-aware pattern filtering
    let categoryFilteredPatterns = requiredPatterns
    if (openingCategory) {
      const categoryMappings = {
        confrontational: ['confrontational', 'challenge', 'authority'],
        question: ['question', 'inquiry', 'philosophical_question'],
        story: ['storytelling', 'personal_experience', 'narrative'],
        observation: ['insight_reveal', 'observation', 'research_citation'],
        contrarian: ['counterintuitive', 'reframe', 'contrarian']
      }
      categoryFilteredPatterns = [...categoryFilteredPatterns, ...categoryMappings[openingCategory]]
    }

    logger.info({
      topicFilter,
      topicKeywords,
      similarityThreshold: 0.5,
      maxChunks,
      openingCategory,
      categoryFilteredPatterns,
      dataSource: 'linkedin_exclusive'
    }, 'LinkedIn-only RAG retrieval parameters')
    
    // RAG Retrieval: LinkedIn post chunks ONLY
    const linkedInResults = await this.retrieveLinkedInChunks(
      embeddingVector,
      topicFilter,
      categoryFilteredPatterns,
      maxChunks
    )

    // Fallback: If we get very few chunks, try broader LinkedIn search
    let chunks = linkedInResults
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
        
        chunks = broadLinkedInResults
      }
    }

    // Get relevant voice patterns
    const { data: patterns, error: patternsError } = await supabaseService.client
      .rpc('match_voice_patterns', {
        query_embedding: embeddingVector,
        pattern_types_filter: categoryFilteredPatterns.length > 0 ? categoryFilteredPatterns : null,
        similarity_threshold: 0.2,
        max_patterns: 5,
        min_effectiveness: 0.1
      })

    if (patternsError) {
      logger.error({ patternsError }, 'Failed to retrieve voice patterns')
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
        linkedInChunks: chunks?.length || 0,
        dataSource: 'linkedin_exclusive'
      }
    }
  }

  /**
   * Retrieve LinkedIn post chunks (EXCLUSIVE voice source)
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
          chunk_types_filter: null,
          pattern_types_filter: patternTypesFilter.length > 0 ? patternTypesFilter : null,
          similarity_threshold: similarityThreshold,
          max_chunks: maxChunks,
          min_authenticity_score: 60
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
        original_post_date: chunk.original_post_date,
        context_relevance: chunk.context_relevance,
        semantic_density: chunk.semantic_density
      }))

      logger.info({
        linkedInChunksFound: mappedChunks.length,
        avgAuthenticity: mappedChunks.length > 0 
          ? Math.round(mappedChunks.reduce((sum, c) => sum + c.authenticity_score, 0) / mappedChunks.length)
          : 0,
        avgSimilarity: mappedChunks.length > 0
          ? Math.round(mappedChunks.reduce((sum, c) => sum + c.similarity_score, 0) / mappedChunks.length * 100) / 100
          : 0,
        dataSource: 'linkedin_exclusive'
      }, 'Retrieved LinkedIn post chunks (EXCLUSIVE voice source)')

      return mappedChunks

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'Error retrieving LinkedIn chunks')
      return []
    }
  }

  /**
   * Get contextual chunks for LinkedIn posts (simplified approach)
   */
  private async getLinkedInContextualChunks(
    baseChunkIds: number[], 
    contextWindow: number = 1
  ): Promise<any[]> {
    try {
      // For LinkedIn chunks, we'll get related chunks from the same posts
      const { data: contextChunks, error } = await supabaseService.client
        .from('linkedin_post_chunks')
        .select(`
          id,
          chunk_text,
          post_id,
          chunk_order,
          chunk_type
        `)
        .in('post_id', 
          // Get post_ids from base chunks first
          supabaseService.client
            .from('linkedin_post_chunks')
            .select('post_id')
            .in('id', baseChunkIds)
        )
        .not('id', 'in', baseChunkIds) // Exclude the base chunks themselves
        .limit(contextWindow * baseChunkIds.length * 2)

      if (error) {
        logger.error({ error }, 'Failed to get LinkedIn contextual chunks')
        return []
      }

      return contextChunks?.map(chunk => ({
        chunk_id: chunk.id,
        chunk_text: chunk.chunk_text,
        context_position: chunk.chunk_order,
        base_chunk_id: null, // Will be mapped later if needed
        post_id: chunk.post_id
      })) || []

    } catch (error) {
      logger.error({ error }, 'Error getting LinkedIn contextual chunks')
      return []
    }
  }

  /**
   * Synthesize LinkedIn-focused voice context
   */
  private async synthesizeLinkedInVoiceContext(
    ragResults: RAGRetrievalResult,
    topicKeywords: string[]
  ): Promise<VoiceContextForGeneration> {
    const { relevantChunks, relevantPatterns, contextualChunks } = ragResults

    // Extract the most relevant voice content
    const relevantChunkTexts = relevantChunks
      .slice(0, 8)
      .map(chunk => chunk.chunk_text)

    // Build contextual examples
    const contextualExamples = this.buildLinkedInContextualExamples(relevantChunks, contextualChunks)

    // Generate LinkedIn-exclusive voice guidelines
    const voiceGuidelines = this.buildLinkedInExclusiveVoiceGuidelines(
      relevantChunks, 
      relevantPatterns, 
      topicKeywords
    )

    // Extract authenticity boosters from patterns
    const authenticityBoosts = this.extractAuthenticityBoostersFromRAG(relevantPatterns)

    // Generate topic-specific advice
    const topicSpecificAdvice = this.generateLinkedInTopicAdvice(
      relevantChunks, 
      topicKeywords
    )

    // Calculate metrics
    const retrievalQuality = this.calculateRetrievalQuality(ragResults)
    const contentConfidence = this.calculateContentConfidence(relevantChunks, relevantPatterns)
    const avgAuthenticityScore = relevantChunks.length > 0
      ? relevantChunks.reduce((sum, chunk) => sum + chunk.authenticity_score, 0) / relevantChunks.length
      : 0
    
    const uniquePostsReferenced = new Set(
      contextualChunks.map(chunk => chunk.post_id).filter(Boolean)
    ).size

    return {
      relevantChunks: relevantChunkTexts,
      relevantPatterns,
      contextualExamples,
      voiceGuidelines,
      authenticityBoosts,
      topicSpecificAdvice,
      retrievalQuality,
      contentConfidence,
      sourceInfo: {
        dataSource: 'linkedin_exclusive',
        uniquePostsReferenced,
        avgAuthenticityScore: Math.round(avgAuthenticityScore)
      }
    }
  }

  /**
   * Build LinkedIn-exclusive voice guidelines
   */
  private buildLinkedInExclusiveVoiceGuidelines(
    chunks: VoiceChunk[], 
    patterns: VoicePattern[],
    topicKeywords: string[]
  ): string {
    let guidelines = `**ANDREW'S AUTHENTIC VOICE - LINKEDIN EXCLUSIVE (${chunks.length} chunks)**\n\n`
    
    guidelines += `**VOICE SOURCE:**\n`
    guidelines += `✅ EXCLUSIVE: LinkedIn Posts Only - Andrew's direct, authentic written voice\n`
    guidelines += `🎯 NO CONTAMINATION: Zero coaching/webinar voice interference\n`
    guidelines += `📊 AUTHENTICITY: ${chunks.length > 0 ? Math.round(chunks.reduce((sum, c) => sum + c.authenticity_score, 0) / chunks.length) : 0}% average authenticity score\n\n`

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

    // Add examples from retrieved chunks
    if (chunks.length > 0) {
      guidelines += `\n**LINKEDIN VOICE EXAMPLES (Authenticity-Ranked):**\n`
      
      const topChunks = chunks
        .filter(chunk => chunk.authenticity_score >= 60)
        .sort((a, b) => b.authenticity_score - a.authenticity_score)
        .slice(0, 3)
      
      topChunks.forEach((chunk, i) => {
        const truncatedText = chunk.chunk_text.length > 200 
          ? chunk.chunk_text.substring(0, 200) + '...'
          : chunk.chunk_text
        guidelines += `${i + 1}. "${truncatedText}"\n`
        guidelines += `   - LinkedIn Post (${chunk.original_post_date ? new Date(chunk.original_post_date).toLocaleDateString() : 'Recent'})\n`
        if (chunk.chunk_type) guidelines += `   - Type: ${chunk.chunk_type}\n`
        if (chunk.voice_markers && chunk.voice_markers.length > 0) {
          guidelines += `   - Voice Markers: ${chunk.voice_markers.join(', ')}\n`
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
        guidelines += `- Found ${topicRelevantChunks.length} topic-relevant LinkedIn examples (avg authenticity: ${avgAuthenticity}%)\n`
        guidelines += `- Common patterns in this topic: ${this.extractTopicPatterns(topicRelevantChunks)}\n`
      }
    }

    // Add authenticity reminders based on retrieved data
    guidelines += `\n**LINKEDIN AUTHENTICITY MARKERS:**\n`
    const authenticityMarkers = this.extractLinkedInAuthenticityMarkers(chunks)
    authenticityMarkers.forEach(marker => {
      guidelines += `- ${marker}\n`
    })

    guidelines += `\n**VOICE CONSISTENCY GUARANTEE:**\n`
    guidelines += `- 100% LinkedIn voice source ensures consistent tone and style\n`
    guidelines += `- No coaching/webinar contamination = authentic written voice only\n`
    guidelines += `- Every example is from Andrew's actual LinkedIn posts\n`

    return guidelines
  }

  /**
   * Build contextual examples specific to LinkedIn posts
   */
  private buildLinkedInContextualExamples(
    chunks: VoiceChunk[], 
    contextualChunks: any[]
  ): string[] {
    const examples: string[] = []

    // For LinkedIn, we'll use the highest quality chunks directly
    chunks
      .filter(chunk => chunk.authenticity_score >= 70)
      .slice(0, 3)
      .forEach(chunk => {
        examples.push(chunk.chunk_text)
      })

    // Add contextual chunks if available
    if (contextualChunks.length > 0) {
      contextualChunks.slice(0, 2).forEach(context => {
        examples.push(context.chunk_text)
      })
    }

    return examples
  }

  /**
   * Generate LinkedIn-specific topic advice
   */
  private generateLinkedInTopicAdvice(
    chunks: VoiceChunk[],
    topicKeywords: string[]
  ): string[] {
    const advice: string[] = []

    if (topicKeywords.length === 0) {
      return advice
    }

    // Analyze topic-specific patterns from LinkedIn chunks
    const topicChunks = chunks.filter(chunk => 
      topicKeywords.some(keyword => 
        chunk.chunk_text.toLowerCase().includes(keyword.toLowerCase())
      )
    )

    if (topicChunks.length === 0) {
      return advice
    }

    // Extract patterns specific to LinkedIn voice
    const topicPatterns = new Set<string>()
    topicChunks.forEach(chunk => {
      chunk.pattern_types.forEach(pattern => topicPatterns.add(pattern))
    })

    // Generate LinkedIn-specific advice
    if (topicPatterns.has('confrontational')) {
      advice.push(`For ${topicKeywords[0]} on LinkedIn, Andrew uses direct, challenging statements that make readers think`)
    }
    
    if (topicPatterns.has('storytelling') || topicPatterns.has('personal_experience')) {
      advice.push(`Personal LinkedIn stories work exceptionally well for ${topicKeywords[0]} - ${topicChunks.filter(c => c.pattern_types.some(p => ['storytelling', 'personal_experience'].includes(p))).length} examples found`)
    }

    if (topicPatterns.has('research_citation') || topicPatterns.has('insight_reveal')) {
      advice.push(`LinkedIn audience responds to research-backed insights on ${topicKeywords[0]} - establish credibility early`)
    }

    if (topicPatterns.has('question') || topicPatterns.has('philosophical_question')) {
      advice.push(`Thought-provoking questions drive LinkedIn engagement for ${topicKeywords[0]} topics`)
    }

    // Add authenticity-based advice
    const avgAuthenticity = topicChunks.reduce((sum, chunk) => sum + chunk.authenticity_score, 0) / topicChunks.length
    if (avgAuthenticity > 75) {
      advice.push(`High authenticity works for ${topicKeywords[0]} on LinkedIn (avg: ${Math.round(avgAuthenticity)}%) - be vulnerable and honest`)
    }

    return advice.slice(0, 5)
  }

  /**
   * Extract LinkedIn-specific authenticity markers
   */
  private extractLinkedInAuthenticityMarkers(chunks: VoiceChunk[]): string[] {
    const markers = new Set<string>()
    
    // Analyze chunks for LinkedIn-specific authenticity patterns
    chunks.forEach(chunk => {
      if (chunk.authenticity_score >= 70) {
        if (chunk.pattern_types.includes('vulnerability') || chunk.pattern_types.includes('personal_experience')) {
          markers.add('Personal vulnerability and honest professional admissions')
        }
        if (chunk.pattern_types.includes('confrontational') || chunk.pattern_types.includes('challenge')) {
          markers.add('Direct, challenging LinkedIn statements that provoke professional thought')
        }
        if (chunk.pattern_types.includes('storytelling')) {
          markers.add('Real professional experiences and concrete examples')
        }
        if (chunk.pattern_types.includes('authority') || chunk.pattern_types.includes('insight_reveal')) {
          markers.add('Confident expertise demonstrated through LinkedIn content')
        }
        if (chunk.pattern_types.includes('research_citation')) {
          markers.add('Research-backed insights shared authentically on LinkedIn')
        }
        if (chunk.voice_markers && chunk.voice_markers.length > 0) {
          chunk.voice_markers.forEach(marker => {
            markers.add(`LinkedIn voice marker: ${marker}`)
          })
        }
      }
    })

    // Add LinkedIn-specific default markers if none found
    if (markers.size === 0) {
      markers.add('Authentic professional experience shared on LinkedIn')
      markers.add('Direct, honest professional communication style')
      markers.add('LinkedIn-native voice patterns and engagement style')
    }

    return Array.from(markers).slice(0, 8)
  }

  /**
   * Log LinkedIn-specific retrieval analytics
   */
  private async logLinkedInRetrievalAnalytics(
    chunks: VoiceChunk[],
    queryHash: string,
    queryText: string,
    contentType: string
  ): Promise<void> {
    try {
      // Log to LinkedIn-specific analytics if available
      const analyticsData = chunks.map((chunk, index) => ({
        chunk_id: chunk.chunk_id,
        query_hash: queryHash,
        similarity_score: chunk.similarity_score,
        rank_position: index + 1,
        query_topic: queryText,
        content_type: contentType,
        data_source: 'linkedin_exclusive',
        authenticity_score: chunk.authenticity_score,
        was_used_in_generation: true
      }))

      // Try to use LinkedIn-specific analytics table if it exists
      const { error } = await supabaseService.client
        .from('linkedin_post_chunks_analytics')
        .insert(analyticsData)

      if (error) {
        // Fallback to general analytics
        const fallbackData = analyticsData.map(item => ({
          chunk_id: item.chunk_id,
          query_hash: item.query_hash,
          similarity_score: item.similarity_score,
          rank_position: item.rank_position,
          query_topic: item.query_topic,
          content_type: item.content_type,
          was_used_in_generation: item.was_used_in_generation
        }))

        const { error: fallbackError } = await supabaseService.client
          .from('chunk_retrieval_analytics')
          .insert(fallbackData)

        if (fallbackError) {
          logger.error({ fallbackError }, 'Failed to log LinkedIn retrieval analytics')
        }
      } else {
        logger.debug({ chunksLogged: analyticsData.length }, 'Logged LinkedIn-exclusive retrieval analytics')
      }
    } catch (error) {
      logger.error({ error }, 'Error logging LinkedIn retrieval analytics')
    }
  }

  // Utility methods (reused from original)
  private async generateEmbedding(text: string): Promise<number[]> {
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
      this.embeddingCache.set(cacheKey, embedding)
      return embedding
    } catch (error) {
      logger.error({ error }, 'Failed to generate embedding')
      throw new Error('Embedding generation failed')
    }
  }

  private buildQueryText(contentType: string, topicKeywords: string[], requiredPatterns: string[]): string {
    let queryText = `${contentType} content about ${topicKeywords.join(', ')}`
    if (requiredPatterns.length > 0) {
      queryText += ` using ${requiredPatterns.join(', ')} patterns`
    }
    return queryText
  }

  private generateQueryHash(queryText: string): string {
    return createHash('sha256').update(queryText.toLowerCase().trim()).digest('hex')
  }

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

  private calculateRetrievalQuality(ragResults: RAGRetrievalResult): number {
    const { relevantChunks, relevantPatterns } = ragResults
    if (relevantChunks.length === 0) return 0

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

  private getLinkedInFallbackVoiceContext(contentType: string, topicKeywords: string[]): VoiceContextForGeneration {
    logger.warn({ contentType, topicKeywords }, 'Using LinkedIn fallback voice context - RAG retrieval failed')

    return {
      relevantChunks: [],
      relevantPatterns: [],
      contextualExamples: [],
      voiceGuidelines: `**FALLBACK LINKEDIN VOICE GUIDELINES**\n\n` +
        `Use Andrew's authentic LinkedIn voice patterns:\n` +
        `- Direct, challenging statements that provoke thought\n` +
        `- Personal professional experiences and vulnerability\n` +
        `- Research-backed insights with practical application\n` +
        `- Authentic storytelling from real business situations\n` +
        `- Confident expertise balanced with humility`,
      authenticityBoosts: [
        'confrontational LinkedIn openings',
        'personal professional vulnerability',
        'research citations',
        'authentic business storytelling',
        'direct challenge statements'
      ],
      topicSpecificAdvice: [
        `For ${contentType} on LinkedIn, focus on professional practical value`,
        'Use authentic business experience to build trust',
        'Challenge common professional assumptions',
        'Provide actionable insights for LinkedIn audience'
      ],
      retrievalQuality: 0,
      contentConfidence: 0.3,
      sourceInfo: {
        dataSource: 'linkedin_exclusive',
        uniquePostsReferenced: 0,
        avgAuthenticityScore: 0
      }
    }
  }

  /**
   * Get system statistics for LinkedIn-only RAG
   */
  async getLinkedInRAGSystemStats(): Promise<{
    totalChunks: number
    totalPatterns: number
    avgChunkAuthenticity: number
    avgPatternEffectiveness: number
    uniquePostsProcessed: number
    systemHealth: 'excellent' | 'good' | 'fair' | 'poor'
    dataSource: 'linkedin_exclusive'
  }> {
    try {
      // Get LinkedIn chunk statistics
      const { data: chunkStats, error: chunkError } = await supabaseService.client
        .from('linkedin_post_chunks')
        .select('authenticity_score, quality_score, post_id')

      if (chunkError) {
        logger.error({ chunkError }, 'Failed to get LinkedIn chunk stats')
        throw chunkError
      }

      // Get pattern statistics
      const { data: patternStats, error: patternError } = await supabaseService.client
        .from('voice_pattern_library')
        .select('effectiveness_score')

      if (patternError) {
        logger.error({ patternError }, 'Failed to get pattern stats')
        // Continue without patterns
      }

      const totalChunks = chunkStats?.length || 0
      const avgAuthenticity = chunkStats?.length > 0
        ? chunkStats.reduce((sum, c) => sum + c.authenticity_score, 0) / chunkStats.length / 100
        : 0
      const avgPatternEffectiveness = patternStats?.length > 0
        ? patternStats.reduce((sum, p) => sum + p.effectiveness_score, 0) / patternStats.length
        : 0
      const uniquePostsProcessed = new Set(chunkStats?.map(c => c.post_id)).size

      // Determine system health
      let systemHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
      
      if (avgAuthenticity > 0.8 && totalChunks > 100) {
        systemHealth = 'excellent'
      } else if (avgAuthenticity > 0.7 && totalChunks > 50) {
        systemHealth = 'good'
      } else if (avgAuthenticity > 0.6 && totalChunks > 25) {
        systemHealth = 'fair'
      }

      return {
        totalChunks,
        totalPatterns: patternStats?.length || 0,
        avgChunkAuthenticity: Math.round(avgAuthenticity * 100) / 100,
        avgPatternEffectiveness: Math.round(avgPatternEffectiveness * 100) / 100,
        uniquePostsProcessed,
        systemHealth,
        dataSource: 'linkedin_exclusive'
      }
    } catch (error) {
      logger.error({ error }, 'Error getting LinkedIn RAG system stats')
      
      return {
        totalChunks: 0,
        totalPatterns: 0,
        avgChunkAuthenticity: 0,
        avgPatternEffectiveness: 0,
        uniquePostsProcessed: 0,
        systemHealth: 'poor',
        dataSource: 'linkedin_exclusive'
      }
    }
  }
}

export const linkedInOnlyVoiceRAGSystem = new LinkedInOnlyVoiceRAGSystem()
export default linkedInOnlyVoiceRAGSystem