/**
 * RAG Data Processor
 * 
 * Converts existing large transcript segments into proper RAG chunks:
 * - Splits large segments into 100-500 token chunks
 * - Creates overlapping chunks for context preservation
 * - Generates embeddings for semantic search
 * - Extracts and classifies voice patterns
 * - Performs content analysis and scoring
 */

import { OpenAI } from 'openai'
import { supabaseService } from './supabase'
import logger from '../lib/logger'
import { appConfig } from '../config'

interface ProcessingStats {
  segmentsProcessed: number
  chunksCreated: number
  patternsExtracted: number
  embeddingsGenerated: number
  errors: number
  processingTime: number
}

interface ChunkData {
  chunk_text: string
  token_count: number
  word_count: number
  char_count: number
  speaker: string
  episode_id: string
  chunk_index: number
  primary_topic: string
  pattern_types: string[]
  emotional_tone: string
  authenticity_score: number
  authority_signals: string[]
  vulnerability_markers: string[]
  has_question: boolean
  has_story: boolean
  has_data_point: boolean
  has_call_to_action: boolean
  has_personal_experience: boolean
  teaching_moment: boolean
  embedding: number[]
}

interface ExtractedPattern {
  pattern_type: string
  pattern_text: string
  context_before: string
  context_after: string
  full_context: string
  usage_context: string
  emotional_tone: string
  authenticity_indicators: string[]
  frequency_score: number
  effectiveness_score: number
  topic_categories: string[]
  pattern_embedding: number[]
  context_embedding: number[]
}

export class RAGDataProcessor {
  private openai: OpenAI
  private batchSize: number = 10
  private overlapTokens: number = 50
  private minChunkTokens: number = 100
  private maxChunkTokens: number = 500

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: appConfig.openai.apiKey 
    })
  }

  /**
   * Main processing function - convert all existing transcript data to RAG format
   */
  async processAllTranscriptData(
    batchSize: number = 10,
    skipExisting: boolean = true
  ): Promise<ProcessingStats> {
    const startTime = Date.now()
    let stats: ProcessingStats = {
      segmentsProcessed: 0,
      chunksCreated: 0,
      patternsExtracted: 0,
      embeddingsGenerated: 0,
      errors: 0,
      processingTime: 0
    }

    logger.info({ batchSize, skipExisting }, 'Starting RAG data processing for all transcript segments')

    try {
      // Get all transcript segments that need processing
      const segments = await this.getUnprocessedSegments(skipExisting)
      logger.info({ totalSegments: segments.length }, 'Found segments to process')

      if (segments.length === 0) {
        logger.info('No segments to process')
        return stats
      }

      // Process in batches to avoid memory issues
      for (let i = 0; i < segments.length; i += batchSize) {
        const batch = segments.slice(i, i + batchSize)
        logger.info({ 
          batchNumber: Math.floor(i / batchSize) + 1,
          totalBatches: Math.ceil(segments.length / batchSize),
          batchSize: batch.length 
        }, 'Processing batch')

        const batchStats = await this.processBatch(batch)
        
        // Accumulate stats
        stats.segmentsProcessed += batchStats.segmentsProcessed
        stats.chunksCreated += batchStats.chunksCreated
        stats.patternsExtracted += batchStats.patternsExtracted
        stats.embeddingsGenerated += batchStats.embeddingsGenerated
        stats.errors += batchStats.errors

        // Small delay between batches to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      stats.processingTime = Date.now() - startTime
      
      logger.info(stats, 'RAG data processing completed')
      return stats

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'RAG data processing failed')
      stats.errors++
      stats.processingTime = Date.now() - startTime
      return stats
    }
  }

  /**
   * Process a single transcript segment into RAG chunks
   */
  async processTranscriptSegment(segmentId: string): Promise<{
    chunksCreated: number
    patternsExtracted: number
    success: boolean
    error?: string
  }> {
    try {
      logger.info({ segmentId }, 'Processing individual transcript segment')

      // Get the segment data
      const { data: segment, error } = await supabaseService.client
        .from('transcript_segments')
        .select(`
          *,
          podcast_episodes(title, guest_name, episode_date)
        `)
        .eq('id', segmentId)
        .single()

      if (error || !segment) {
        throw new Error(`Failed to get segment ${segmentId}: ${error?.message}`)
      }

      // Process this segment
      const result = await this.processSingleSegment(segment)

      logger.info({
        segmentId,
        chunksCreated: result.chunks.length,
        patternsExtracted: result.patterns.length
      }, 'Segment processing completed')

      return {
        chunksCreated: result.chunks.length,
        patternsExtracted: result.patterns.length,
        success: true
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error({ error: errorMessage, segmentId }, 'Failed to process transcript segment')
      
      return {
        chunksCreated: 0,
        patternsExtracted: 0,
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Get unprocessed segments from the database
   */
  private async getUnprocessedSegments(skipExisting: boolean): Promise<any[]> {
    let query = supabaseService.client
      .from('transcript_segments')
      .select(`
        *,
        podcast_episodes(title, guest_name, episode_date)
      `)
      .eq('speaker', 'andrew')  // Focus on Andrew's segments
      .gte('word_count', 50)    // Minimum viable content

    if (skipExisting) {
      // Only get segments that don't have chunks yet
      const { data: existingChunkSegments } = await supabaseService.client
        .from('voice_content_chunks')
        .select('segment_id')
        .not('segment_id', 'is', null)

      if (existingChunkSegments && existingChunkSegments.length > 0) {
        const processedSegmentIds = existingChunkSegments.map(c => c.segment_id)
        query = query.not('id', 'in', `(${processedSegmentIds.join(',')})`)
      }
    }

    const { data: segments, error } = await query.order('created_at', { ascending: true })

    if (error) {
      logger.error({ error }, 'Failed to get unprocessed segments')
      throw new Error(`Database query failed: ${error.message}`)
    }

    return segments || []
  }

  /**
   * Process a batch of segments
   */
  private async processBatch(segments: any[]): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      segmentsProcessed: 0,
      chunksCreated: 0,
      patternsExtracted: 0,
      embeddingsGenerated: 0,
      errors: 0,
      processingTime: 0
    }

    for (const segment of segments) {
      try {
        const result = await this.processSingleSegment(segment)
        
        stats.segmentsProcessed++
        stats.chunksCreated += result.chunks.length
        stats.patternsExtracted += result.patterns.length
        stats.embeddingsGenerated += result.chunks.length + result.patterns.length * 2 // Pattern + context embeddings

      } catch (error) {
        logger.error({ 
          error: error instanceof Error ? error.message : String(error),
          segmentId: segment.id 
        }, 'Failed to process segment in batch')
        stats.errors++
      }
    }

    return stats
  }

  /**
   * Process a single segment into chunks and patterns
   */
  private async processSingleSegment(segment: any): Promise<{
    chunks: ChunkData[]
    patterns: ExtractedPattern[]
  }> {
    const segmentText = segment.segment_text || ''
    const episodeId = segment.episode_id
    const episodeData = segment.podcast_episodes || {}

    // Step 1: Split into chunks
    const rawChunks = await this.splitIntoChunks(segmentText)
    
    // Step 2: Analyze each chunk
    const processedChunks: ChunkData[] = []
    for (let i = 0; i < rawChunks.length; i++) {
      const chunkText = rawChunks[i]
      const analysis = await this.analyzeChunk(chunkText, segment.speaker, episodeData)
      
      processedChunks.push({
        chunk_text: chunkText,
        token_count: this.estimateTokenCount(chunkText),
        word_count: chunkText.split(/\s+/).length,
        char_count: chunkText.length,
        speaker: segment.speaker,
        episode_id: episodeId,
        chunk_index: i,
        ...analysis
      })
    }

    // Step 3: Extract patterns
    const patterns = await this.extractPatternsFromSegment(segmentText, episodeData)

    // Step 4: Save to database
    await this.saveChunksToDatabase(processedChunks, segment.id)
    await this.savePatternsToDatabase(patterns)

    return {
      chunks: processedChunks,
      patterns
    }
  }

  /**
   * Split text into properly sized chunks with overlap
   */
  private async splitIntoChunks(text: string): Promise<string[]> {
    const sentences = this.splitIntoSentences(text)
    const chunks: string[] = []
    let currentChunk = ''
    let currentTokenCount = 0

    for (const sentence of sentences) {
      const sentenceTokenCount = this.estimateTokenCount(sentence)
      
      // If adding this sentence would exceed max tokens, finalize current chunk
      if (currentTokenCount + sentenceTokenCount > this.maxChunkTokens && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        
        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, this.overlapTokens)
        currentChunk = overlapText + ' ' + sentence
        currentTokenCount = this.estimateTokenCount(currentChunk)
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence
        currentTokenCount += sentenceTokenCount
      }
    }

    // Add final chunk if it has content
    if (currentChunk.trim() && currentTokenCount >= this.minChunkTokens) {
      chunks.push(currentChunk.trim())
    }

    return chunks.filter(chunk => this.estimateTokenCount(chunk) >= this.minChunkTokens)
  }

  /**
   * Split text into sentences for better chunking boundaries
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - could be enhanced with more sophisticated NLP
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + '.') // Add back the period
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlapText(chunk: string, maxTokens: number): string {
    const words = chunk.split(/\s+/)
    const estimatedWords = Math.floor(maxTokens * 0.75) // Rough conversion
    
    if (words.length <= estimatedWords) {
      return chunk
    }

    return words.slice(-estimatedWords).join(' ')
  }

  /**
   * Analyze a chunk for content patterns and metadata
   */
  private async analyzeChunk(
    chunkText: string, 
    speaker: string, 
    episodeData: any
  ): Promise<Partial<ChunkData>> {
    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(chunkText)

      // Use AI to analyze the chunk
      const analysisPrompt = `Analyze this voice chunk from Andrew Tallents' podcast:

"${chunkText}"

Return ONLY a JSON object with this exact structure:
{
  "primary_topic": "main topic in 2-3 words",
  "pattern_types": ["array", "of", "pattern", "types"],
  "emotional_tone": "dominant emotional tone",
  "authenticity_score": 0-100,
  "authority_signals": ["specific", "authority", "markers"],
  "vulnerability_markers": ["vulnerability", "indicators"],
  "has_question": true/false,
  "has_story": true/false,
  "has_data_point": true/false,
  "has_call_to_action": true/false,
  "has_personal_experience": true/false,
  "teaching_moment": true/false
}

Pattern types: opening, transition, question, conclusion, storytelling, vulnerability, confrontational, teaching, authority, empathy, challenge, reframe, analogy, data_presentation, call_to_action`

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Use faster model for batch processing
        messages: [
          {
            role: 'system',
            content: 'You are a voice analysis expert. Return only valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })

      const analysisText = completion.choices[0]?.message?.content || '{}'
      const analysis = JSON.parse(analysisText)

      return {
        primary_topic: analysis.primary_topic || 'general',
        pattern_types: Array.isArray(analysis.pattern_types) ? analysis.pattern_types : [],
        emotional_tone: analysis.emotional_tone || 'neutral',
        authenticity_score: typeof analysis.authenticity_score === 'number' 
          ? Math.max(0, Math.min(100, analysis.authenticity_score))
          : 50,
        authority_signals: Array.isArray(analysis.authority_signals) ? analysis.authority_signals : [],
        vulnerability_markers: Array.isArray(analysis.vulnerability_markers) ? analysis.vulnerability_markers : [],
        has_question: Boolean(analysis.has_question),
        has_story: Boolean(analysis.has_story),
        has_data_point: Boolean(analysis.has_data_point),
        has_call_to_action: Boolean(analysis.has_call_to_action),
        has_personal_experience: Boolean(analysis.has_personal_experience),
        teaching_moment: Boolean(analysis.teaching_moment),
        embedding
      }

    } catch (error) {
      logger.error({ error }, 'Chunk analysis failed, using defaults')
      
      // Return basic analysis with embedding if possible
      try {
        const embedding = await this.generateEmbedding(chunkText)
        return {
          primary_topic: 'general',
          pattern_types: [],
          emotional_tone: 'neutral',
          authenticity_score: 50,
          authority_signals: [],
          vulnerability_markers: [],
          has_question: chunkText.includes('?'),
          has_story: false,
          has_data_point: false,
          has_call_to_action: false,
          has_personal_experience: false,
          teaching_moment: false,
          embedding
        }
      } catch (embeddingError) {
        throw new Error('Failed to generate embedding for chunk')
      }
    }
  }

  /**
   * Extract voice patterns from a segment
   */
  private async extractPatternsFromSegment(
    segmentText: string, 
    episodeData: any
  ): Promise<ExtractedPattern[]> {
    try {
      const prompt = `Extract voice patterns from this Andrew Tallents podcast segment:

"${segmentText}"

Find 2-5 distinct voice patterns. For each pattern, return this JSON structure:
{
  "patterns": [
    {
      "pattern_type": "one of: opening, transition, question, conclusion, storytelling, vulnerability, confrontational, teaching, authority, empathy, challenge, reframe, analogy, data_presentation, call_to_action",
      "pattern_text": "the exact text of the pattern (20-100 words)",
      "context_before": "text before the pattern",
      "context_after": "text after the pattern", 
      "usage_context": "when/how this pattern is used",
      "emotional_tone": "tone of this pattern",
      "authenticity_indicators": ["specific", "authenticity", "markers"],
      "frequency_score": 1-10,
      "effectiveness_score": 0.0-1.0,
      "topic_categories": ["relevant", "topics"]
    }
  ]
}`

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a voice pattern extraction expert. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })

      const responseText = completion.choices[0]?.message?.content || '{"patterns": []}'
      const response = JSON.parse(responseText)
      const patterns: ExtractedPattern[] = []

      for (const pattern of response.patterns || []) {
        try {
          const patternEmbedding = await this.generateEmbedding(pattern.pattern_text || '')
          const contextEmbedding = await this.generateEmbedding(
            `${pattern.context_before || ''} ${pattern.pattern_text || ''} ${pattern.context_after || ''}`
          )

          patterns.push({
            pattern_type: pattern.pattern_type || 'general',
            pattern_text: pattern.pattern_text || '',
            context_before: pattern.context_before || '',
            context_after: pattern.context_after || '',
            full_context: `${pattern.context_before || ''} ${pattern.pattern_text || ''} ${pattern.context_after || ''}`,
            usage_context: pattern.usage_context || '',
            emotional_tone: pattern.emotional_tone || 'neutral',
            authenticity_indicators: Array.isArray(pattern.authenticity_indicators) ? pattern.authenticity_indicators : [],
            frequency_score: Math.max(1, Math.min(10, pattern.frequency_score || 5)),
            effectiveness_score: Math.max(0, Math.min(1, pattern.effectiveness_score || 0.5)),
            topic_categories: Array.isArray(pattern.topic_categories) ? pattern.topic_categories : [],
            pattern_embedding: patternEmbedding,
            context_embedding: contextEmbedding
          })
        } catch (embeddingError) {
          logger.error({ embeddingError, pattern: pattern.pattern_text }, 'Failed to generate pattern embeddings')
        }
      }

      return patterns

    } catch (error) {
      logger.error({ error }, 'Pattern extraction failed')
      return []
    }
  }

  /**
   * Save chunks to database
   */
  private async saveChunksToDatabase(chunks: ChunkData[], segmentId: string): Promise<void> {
    try {
      const chunksToInsert = chunks.map((chunk, index) => ({
        episode_id: chunk.episode_id,
        segment_id: segmentId,
        chunk_index: chunk.chunk_index,
        chunk_text: chunk.chunk_text,
        token_count: chunk.token_count,
        word_count: chunk.word_count,
        char_count: chunk.char_count,
        speaker: chunk.speaker,
        embedding: `[${chunk.embedding.join(',')}]`, // PostgreSQL vector format
        primary_topic: chunk.primary_topic,
        pattern_types: chunk.pattern_types,
        emotional_tone: chunk.emotional_tone,
        authenticity_score: chunk.authenticity_score,
        authority_signals: chunk.authority_signals,
        vulnerability_markers: chunk.vulnerability_markers,
        has_question: chunk.has_question,
        has_story: chunk.has_story,
        has_data_point: chunk.has_data_point,
        has_call_to_action: chunk.has_call_to_action,
        has_personal_experience: chunk.has_personal_experience,
        teaching_moment: chunk.teaching_moment,
        quality_score: this.calculateChunkQuality(chunk),
        // Set up chunk linking for overlap
        prev_chunk_id: index > 0 ? null : null, // Will be updated after insertion
        next_chunk_id: null,
        overlap_prev_tokens: index > 0 ? this.overlapTokens : 0,
        overlap_next_tokens: index < chunks.length - 1 ? this.overlapTokens : 0
      }))

      const { error } = await supabaseService.client
        .from('voice_content_chunks')
        .insert(chunksToInsert)

      if (error) {
        throw new Error(`Failed to insert chunks: ${error.message}`)
      }

      logger.debug({ chunksInserted: chunks.length, segmentId }, 'Chunks saved to database')

    } catch (error) {
      logger.error({ error, segmentId }, 'Failed to save chunks to database')
      throw error
    }
  }

  /**
   * Save patterns to database
   */
  private async savePatternsToDatabase(patterns: ExtractedPattern[]): Promise<void> {
    if (patterns.length === 0) return

    try {
      const patternsToInsert = patterns.map(pattern => ({
        pattern_id: this.generatePatternId(pattern),
        pattern_type: pattern.pattern_type,
        pattern_text: pattern.pattern_text,
        context_before: pattern.context_before,
        context_after: pattern.context_after,
        full_context: pattern.full_context,
        pattern_embedding: `[${pattern.pattern_embedding.join(',')}]`,
        context_embedding: `[${pattern.context_embedding.join(',')}]`,
        frequency_score: pattern.frequency_score,
        effectiveness_score: pattern.effectiveness_score,
        usage_context: pattern.usage_context,
        emotional_tone: pattern.emotional_tone,
        authenticity_indicators: pattern.authenticity_indicators,
        topic_categories: pattern.topic_categories
      }))

      const { error } = await supabaseService.client
        .from('voice_pattern_library')
        .upsert(patternsToInsert, {
          onConflict: 'pattern_id',
          ignoreDuplicates: false
        })

      if (error) {
        throw new Error(`Failed to insert patterns: ${error.message}`)
      }

      logger.debug({ patternsInserted: patterns.length }, 'Patterns saved to database')

    } catch (error) {
      logger.error({ error }, 'Failed to save patterns to database')
      throw error
    }
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text')
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.trim()
      })

      return response.data[0].embedding
    } catch (error) {
      logger.error({ error, textLength: text.length }, 'Failed to generate embedding')
      throw new Error('Embedding generation failed')
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  /**
   * Calculate chunk quality score
   */
  private calculateChunkQuality(chunk: ChunkData): number {
    let quality = 0

    // Token count scoring (prefer 150-350 tokens)
    if (chunk.token_count >= 150 && chunk.token_count <= 350) {
      quality += 0.3
    } else if (chunk.token_count >= 100 && chunk.token_count <= 500) {
      quality += 0.2
    } else {
      quality += 0.1
    }

    // Pattern richness
    quality += Math.min(0.25, chunk.pattern_types.length * 0.08)

    // Content features
    if (chunk.has_story) quality += 0.1
    if (chunk.teaching_moment) quality += 0.1
    if (chunk.has_personal_experience) quality += 0.1
    if (chunk.has_data_point) quality += 0.05

    // Authenticity score
    quality += (chunk.authenticity_score / 100) * 0.2

    return Math.min(1.0, quality)
  }

  /**
   * Generate consistent pattern ID
   */
  private generatePatternId(pattern: ExtractedPattern): string {
    const content = `${pattern.pattern_type}_${pattern.pattern_text}`
    return require('crypto').createHash('md5').update(content).digest('hex')
  }
}

export const ragDataProcessor = new RAGDataProcessor()
export default ragDataProcessor