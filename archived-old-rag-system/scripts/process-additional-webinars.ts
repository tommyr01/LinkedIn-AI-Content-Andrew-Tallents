/**
 * Process Additional Webinars into RAG System
 * 
 * Specifically processes Webinar 9 (Accountability) and Webinar 10 (Self-Limiting Beliefs)
 * directly from raw transcripts since the existing segments are too small.
 * 
 * Features:
 * - Direct transcript processing with proper chunking (100-500 tokens)
 * - Topic-specific labeling for accountability and self-limiting beliefs
 * - Embedding generation for semantic search
 * - Integration with existing RAG system
 */

import { OpenAI } from 'openai'
import { supabaseService } from '../services/supabase'
import logger from '../lib/logger'
import { appConfig } from '../config'

interface WebinarData {
  id: string
  title: string
  transcript: string
  primaryTopic: string
}

interface ProcessedChunk {
  chunk_text: string
  token_count: number
  word_count: number
  char_count: number
  speaker: string
  episode_id: string
  chunk_index: number
  primary_topic: string
  secondary_topics: string[]
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
  episode_title: string
}

class AdditionalWebinarProcessor {
  private openai: OpenAI
  private minChunkTokens: number = 100
  private maxChunkTokens: number = 500
  private overlapTokens: number = 50

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: appConfig.openai.apiKey 
    })
  }

  /**
   * Main processing function
   */
  async processWebinars(): Promise<{
    success: boolean
    webinarsProcessed: number
    totalChunks: number
    summary: string
  }> {
    logger.info('Starting additional webinar processing for Accountability and Self-Limiting Beliefs')

    try {
      // Get the target webinars
      const webinars = await this.getTargetWebinars()
      
      if (webinars.length === 0) {
        return {
          success: false,
          webinarsProcessed: 0,
          totalChunks: 0,
          summary: 'No target webinars found'
        }
      }

      let totalChunks = 0
      let webinarsProcessed = 0

      // Process each webinar
      for (const webinar of webinars) {
        logger.info({ 
          webinarId: webinar.id, 
          title: webinar.title,
          topic: webinar.primaryTopic 
        }, 'Processing webinar')

        const result = await this.processWebinar(webinar)
        
        if (result.success) {
          totalChunks += result.chunksCreated
          webinarsProcessed++
          logger.info({ 
            webinarTitle: webinar.title,
            chunksCreated: result.chunksCreated 
          }, 'Webinar processing completed')
        } else {
          logger.error({ 
            webinarTitle: webinar.title,
            error: result.error 
          }, 'Webinar processing failed')
        }
      }

      const success = webinarsProcessed > 0
      const summary = `Processed ${webinarsProcessed}/${webinars.length} webinars, created ${totalChunks} chunks`

      logger.info({ 
        success, 
        webinarsProcessed, 
        totalChunks, 
        summary 
      }, 'Additional webinar processing completed')

      return {
        success,
        webinarsProcessed,
        totalChunks,
        summary
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error({ error: errorMessage }, 'Additional webinar processing failed')
      
      return {
        success: false,
        webinarsProcessed: 0,
        totalChunks: 0,
        summary: `Processing failed: ${errorMessage}`
      }
    }
  }

  /**
   * Get the specific target webinars
   */
  private async getTargetWebinars(): Promise<WebinarData[]> {
    const { data: episodes, error } = await supabaseService.client
      .from('podcast_episodes')
      .select('id, title, transcript_raw')
      .in('id', [
        '325529ff-fa76-4b9d-ab06-ec34da03fd2c', // Webinar 9 - Accountability
        '63048ab0-cde6-4b93-90d9-97fd8124063d'  // Webinar 10 - Self-Limiting Beliefs
      ])

    if (error) {
      throw new Error(`Failed to get webinars: ${error.message}`)
    }

    if (!episodes || episodes.length === 0) {
      throw new Error('Target webinars not found')
    }

    return episodes.map(episode => ({
      id: episode.id,
      title: episode.title,
      transcript: episode.transcript_raw || '',
      primaryTopic: this.determinePrimaryTopic(episode.title)
    }))
  }

  /**
   * Determine primary topic from webinar title
   */
  private determinePrimaryTopic(title: string): string {
    if (title.toLowerCase().includes('accountability')) {
      return 'Accountability'
    } else if (title.toLowerCase().includes('self-limiting beliefs')) {
      return 'Self-Limiting Beliefs'
    }
    return 'Self-Coaching'
  }

  /**
   * Process a single webinar
   */
  private async processWebinar(webinar: WebinarData): Promise<{
    success: boolean
    chunksCreated: number
    error?: string
  }> {
    try {
      // Check if already processed and clean up existing chunks if they're incomplete
      const { data: existingChunks } = await supabaseService.client
        .from('voice_content_chunks')
        .select('id, token_count')
        .eq('episode_id', webinar.id)

      if (existingChunks && existingChunks.length > 0) {
        // Check if existing chunks are properly sized (should be 100-500 tokens)
        const avgTokenCount = existingChunks.reduce((sum, chunk) => sum + chunk.token_count, 0) / existingChunks.length
        const hasProperChunking = existingChunks.length >= 20 && avgTokenCount >= 200

        if (hasProperChunking) {
          logger.info({ 
            webinarId: webinar.id,
            existingChunks: existingChunks.length,
            avgTokenCount 
          }, 'Webinar already properly processed, skipping')
          return { success: true, chunksCreated: 0 }
        } else {
          // Delete incomplete chunks and reprocess
          logger.info({ 
            webinarId: webinar.id,
            existingChunks: existingChunks.length,
            avgTokenCount 
          }, 'Deleting incomplete chunks for reprocessing')
          
          const { error: deleteError } = await supabaseService.client
            .from('voice_content_chunks')
            .delete()
            .eq('episode_id', webinar.id)

          if (deleteError) {
            logger.error({ error: deleteError }, 'Failed to delete existing chunks')
          } else {
            logger.info({ webinarId: webinar.id }, 'Deleted existing incomplete chunks')
          }
        }
      }

      // Split transcript into chunks
      const rawChunks = await this.splitTranscriptIntoChunks(webinar.transcript)
      
      if (rawChunks.length === 0) {
        throw new Error('No valid chunks created from transcript')
      }

      logger.info({ 
        webinarId: webinar.id,
        rawChunksCreated: rawChunks.length 
      }, 'Raw chunks created')

      // Process each chunk
      const processedChunks: ProcessedChunk[] = []
      
      for (let i = 0; i < rawChunks.length; i++) {
        const chunkText = rawChunks[i]
        
        try {
          const processedChunk = await this.processChunk(
            chunkText, 
            webinar, 
            i
          )
          processedChunks.push(processedChunk)
          
          // Rate limiting - small delay between chunks
          if (i > 0 && i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (error) {
          logger.error({ 
            error: error instanceof Error ? error.message : String(error),
            chunkIndex: i,
            webinarId: webinar.id 
          }, 'Failed to process chunk')
        }
      }

      if (processedChunks.length === 0) {
        throw new Error('No chunks were successfully processed')
      }

      // Save to database
      await this.saveChunksToDatabase(processedChunks)

      logger.info({ 
        webinarId: webinar.id,
        chunksProcessed: processedChunks.length,
        chunksSkipped: rawChunks.length - processedChunks.length
      }, 'Webinar chunks saved to database')

      return {
        success: true,
        chunksCreated: processedChunks.length
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error({ error: errorMessage, webinarId: webinar.id }, 'Webinar processing failed')
      
      return {
        success: false,
        chunksCreated: 0,
        error: errorMessage
      }
    }
  }

  /**
   * Split transcript into properly sized chunks
   */
  private async splitTranscriptIntoChunks(transcript: string): Promise<string[]> {
    // Clean up transcript
    const cleanTranscript = transcript
      .replace(/\[.*?\]/g, '') // Remove timestamps and speaker markers
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim()

    if (!cleanTranscript) {
      logger.warn('Empty transcript after cleaning')
      return []
    }

    logger.info({ 
      originalLength: transcript.length, 
      cleanedLength: cleanTranscript.length 
    }, 'Transcript cleaning completed')

    // For transcripts without punctuation, use word-based chunking
    const words = cleanTranscript.split(/\s+/)
    logger.info({ wordCount: words.length }, 'Words extracted')

    const chunks: string[] = []
    let currentChunk = ''
    let currentTokenCount = 0
    let wordIndex = 0

    while (wordIndex < words.length) {
      const word = words[wordIndex]
      const wordTokenCount = Math.ceil(word.length / 4) // Rough token estimate per word
      
      // If adding this word would exceed max tokens, finalize current chunk
      if (currentTokenCount + wordTokenCount > this.maxChunkTokens && currentChunk.length > 0) {
        if (currentTokenCount >= this.minChunkTokens) {
          chunks.push(currentChunk.trim())
          logger.debug({ 
            chunkIndex: chunks.length - 1, 
            tokenCount: currentTokenCount,
            chunkLength: currentChunk.length 
          }, 'Chunk created')
        }
        
        // Start new chunk with overlap (take last N words from previous chunk)
        const currentWords = currentChunk.split(/\s+/)
        const overlapWordCount = Math.min(12, currentWords.length) // ~50 token overlap
        const overlapWords = currentWords.slice(-overlapWordCount)
        
        currentChunk = overlapWords.join(' ') + ' ' + word
        currentTokenCount = this.estimateTokenCount(currentChunk)
      } else {
        currentChunk += (currentChunk ? ' ' : '') + word
        currentTokenCount += wordTokenCount
      }
      
      wordIndex++
    }

    // Add final chunk if it meets minimum requirements
    if (currentChunk.trim() && currentTokenCount >= this.minChunkTokens) {
      chunks.push(currentChunk.trim())
      logger.debug({ 
        chunkIndex: chunks.length - 1, 
        tokenCount: currentTokenCount,
        chunkLength: currentChunk.length 
      }, 'Final chunk created')
    }

    // Filter chunks that meet token requirements
    const validChunks = chunks.filter(chunk => {
      const tokenCount = this.estimateTokenCount(chunk)
      return tokenCount >= this.minChunkTokens && tokenCount <= this.maxChunkTokens
    })

    logger.info({ 
      totalChunks: chunks.length,
      validChunks: validChunks.length,
      avgTokenCount: validChunks.length > 0 ? validChunks.reduce((sum, chunk) => sum + this.estimateTokenCount(chunk), 0) / validChunks.length : 0,
      minTokenCount: validChunks.length > 0 ? Math.min(...validChunks.map(c => this.estimateTokenCount(c))) : 0,
      maxTokenCount: validChunks.length > 0 ? Math.max(...validChunks.map(c => this.estimateTokenCount(c))) : 0
    }, 'Chunking completed')

    return validChunks
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // More sophisticated sentence splitting
    const sentences = text
      .replace(/([.!?])\s+/g, '$1|SENTENCE_BREAK|') // Mark sentence boundaries
      .split('|SENTENCE_BREAK|')
      .map(s => s.trim())
      .filter(s => s.length > 10) // Filter out very short fragments
      .map(s => {
        // Ensure sentence ends with punctuation
        if (!s.match(/[.!?]$/)) {
          return s + '.'
        }
        return s
      })

    logger.debug({ 
      originalTextLength: text.length,
      sentenceCount: sentences.length,
      avgSentenceLength: sentences.length > 0 ? text.length / sentences.length : 0
    }, 'Sentence splitting analysis')

    return sentences
  }

  /**
   * Get overlap text from end of chunk
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
   * Process individual chunk with AI analysis
   */
  private async processChunk(
    chunkText: string, 
    webinar: WebinarData, 
    chunkIndex: number
  ): Promise<ProcessedChunk> {
    // Generate embedding
    const embedding = await this.generateEmbedding(chunkText)

    // Analyze chunk with AI
    const analysis = await this.analyzeChunk(chunkText, webinar.primaryTopic)

    return {
      chunk_text: chunkText,
      token_count: this.estimateTokenCount(chunkText),
      word_count: chunkText.split(/\s+/).length,
      char_count: chunkText.length,
      speaker: 'andrew',
      episode_id: webinar.id,
      chunk_index: chunkIndex,
      primary_topic: webinar.primaryTopic,
      secondary_topics: analysis.secondary_topics,
      pattern_types: analysis.pattern_types,
      emotional_tone: analysis.emotional_tone,
      authenticity_score: analysis.authenticity_score,
      authority_signals: analysis.authority_signals,
      vulnerability_markers: analysis.vulnerability_markers,
      has_question: analysis.has_question,
      has_story: analysis.has_story,
      has_data_point: analysis.has_data_point,
      has_call_to_action: analysis.has_call_to_action,
      has_personal_experience: analysis.has_personal_experience,
      teaching_moment: analysis.teaching_moment,
      embedding,
      episode_title: webinar.title
    }
  }

  /**
   * AI-powered chunk analysis
   */
  private async analyzeChunk(chunkText: string, primaryTopic: string): Promise<any> {
    try {
      const prompt = `Analyze this chunk from Andrew Tallents' webinar on "${primaryTopic}":

"${chunkText}"

Return ONLY a JSON object with this exact structure:
{
  "secondary_topics": ["related", "topics", "beyond", "primary"],
  "pattern_types": ["array", "of", "communication", "patterns"],
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

Pattern types: opening, transition, question, conclusion, storytelling, vulnerability, confrontational, teaching, authority, empathy, challenge, reframe, analogy, data_presentation, call_to_action

Secondary topics for ${primaryTopic}: ${this.getSecondaryTopicsHint(primaryTopic)}`

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a voice analysis expert specializing in coaching and leadership content. Return only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })

      const analysisText = completion.choices[0]?.message?.content || '{}'
      const analysis = JSON.parse(analysisText)

      return {
        secondary_topics: Array.isArray(analysis.secondary_topics) ? analysis.secondary_topics : [],
        pattern_types: Array.isArray(analysis.pattern_types) ? analysis.pattern_types : [],
        emotional_tone: analysis.emotional_tone || 'neutral',
        authenticity_score: typeof analysis.authenticity_score === 'number' 
          ? Math.max(0, Math.min(100, analysis.authenticity_score))
          : 70,
        authority_signals: Array.isArray(analysis.authority_signals) ? analysis.authority_signals : [],
        vulnerability_markers: Array.isArray(analysis.vulnerability_markers) ? analysis.vulnerability_markers : [],
        has_question: Boolean(analysis.has_question),
        has_story: Boolean(analysis.has_story),
        has_data_point: Boolean(analysis.has_data_point),
        has_call_to_action: Boolean(analysis.has_call_to_action),
        has_personal_experience: Boolean(analysis.has_personal_experience),
        teaching_moment: Boolean(analysis.teaching_moment)
      }

    } catch (error) {
      logger.error({ error }, 'AI analysis failed, using defaults')
      
      return {
        secondary_topics: [],
        pattern_types: ['teaching'],
        emotional_tone: 'professional',
        authenticity_score: 70,
        authority_signals: [],
        vulnerability_markers: [],
        has_question: chunkText.includes('?'),
        has_story: false,
        has_data_point: false,
        has_call_to_action: false,
        has_personal_experience: false,
        teaching_moment: true
      }
    }
  }

  /**
   * Get secondary topics hint based on primary topic
   */
  private getSecondaryTopicsHint(primaryTopic: string): string {
    switch (primaryTopic) {
      case 'Accountability':
        return 'responsibility, ownership, commitment, goals, measurement, feedback, performance, leadership, self-management, discipline'
      case 'Self-Limiting Beliefs':
        return 'mindset, confidence, fear, limiting thoughts, personal growth, breakthrough, potential, obstacles, self-doubt, transformation'
      default:
        return 'leadership, coaching, self-development, business, personal growth'
    }
  }

  /**
   * Generate embedding
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
   * Save chunks to database
   */
  private async saveChunksToDatabase(chunks: ProcessedChunk[]): Promise<void> {
    if (chunks.length === 0) return

    try {
      const chunksToInsert = chunks.map(chunk => ({
        episode_id: chunk.episode_id,
        segment_id: null, // Direct from transcript, no segment
        chunk_index: chunk.chunk_index,
        chunk_text: chunk.chunk_text,
        token_count: chunk.token_count,
        word_count: chunk.word_count,
        char_count: chunk.char_count,
        speaker: chunk.speaker,
        embedding: `[${chunk.embedding.join(',')}]`, // PostgreSQL vector format
        primary_topic: chunk.primary_topic,
        secondary_topics: chunk.secondary_topics,
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
        episode_title: chunk.episode_title,
        guest_name: null,
        episode_date: null,
        quality_score: this.calculateChunkQuality(chunk),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error } = await supabaseService.client
        .from('voice_content_chunks')
        .insert(chunksToInsert)

      if (error) {
        throw new Error(`Failed to insert chunks: ${error.message}`)
      }

      logger.info({ chunksInserted: chunks.length }, 'Successfully saved chunks to database')

    } catch (error) {
      logger.error({ error }, 'Failed to save chunks to database')
      throw error
    }
  }

  /**
   * Calculate chunk quality score
   */
  private calculateChunkQuality(chunk: ProcessedChunk): number {
    let quality = 0

    // Token count scoring (prefer 200-400 tokens)
    if (chunk.token_count >= 200 && chunk.token_count <= 400) {
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
    if (chunk.teaching_moment) quality += 0.15
    if (chunk.has_personal_experience) quality += 0.1
    if (chunk.has_data_point) quality += 0.05
    if (chunk.has_call_to_action) quality += 0.05

    // Authenticity score
    quality += (chunk.authenticity_score / 100) * 0.2

    return Math.min(1.0, quality)
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    totalChunks: number
    webinarChunks: { title: string, chunks: number }[]
  }> {
    const { data: chunks, error } = await supabaseService.client
      .from('voice_content_chunks')
      .select('episode_title')
      .in('episode_id', [
        '325529ff-fa76-4b9d-ab06-ec34da03fd2c',
        '63048ab0-cde6-4b93-90d9-97fd8124063d'
      ])

    if (error) {
      logger.error({ error }, 'Failed to get processing stats')
      return { totalChunks: 0, webinarChunks: [] }
    }

    const groupedChunks = chunks?.reduce((acc: any, chunk) => {
      const title = chunk.episode_title || 'Unknown'
      acc[title] = (acc[title] || 0) + 1
      return acc
    }, {}) || {}

    return {
      totalChunks: chunks?.length || 0,
      webinarChunks: Object.entries(groupedChunks).map(([title, count]) => ({
        title,
        chunks: count as number
      }))
    }
  }
}

// Export for use as module
export const additionalWebinarProcessor = new AdditionalWebinarProcessor()

// Main execution function
export async function processAdditionalWebinars(): Promise<void> {
  console.log('\n' + '='.repeat(80))
  console.log('PROCESSING ADDITIONAL WEBINARS INTO RAG SYSTEM')
  console.log('='.repeat(80))
  console.log('Target Webinars:')
  console.log('  - Webinar 9: Accountability')
  console.log('  - Webinar 10: Self-Limiting Beliefs')
  console.log('='.repeat(80) + '\n')

  const processor = new AdditionalWebinarProcessor()
  const result = await processor.processWebinars()

  console.log('\n' + '='.repeat(80))
  console.log('PROCESSING RESULTS')
  console.log('='.repeat(80))
  console.log(`Success: ${result.success ? '✅' : '❌'}`)
  console.log(`Webinars Processed: ${result.webinarsProcessed}`)
  console.log(`Total Chunks Created: ${result.totalChunks}`)
  console.log(`Summary: ${result.summary}`)
  console.log('='.repeat(80))

  if (result.success && result.totalChunks > 0) {
    // Get final stats
    const stats = await processor.getProcessingStats()
    
    console.log('\n' + '='.repeat(80))
    console.log('FINAL WEBINAR STATISTICS')
    console.log('='.repeat(80))
    console.log(`Total New Chunks: ${stats.totalChunks}`)
    
    for (const webinarStat of stats.webinarChunks) {
      console.log(`  - ${webinarStat.title}: ${webinarStat.chunks} chunks`)
    }
    
    // Get overall RAG system stats
    const { data: totalChunksData } = await supabaseService.client
      .from('voice_content_chunks')
      .select('id', { count: 'exact' })

    const currentTotal = totalChunksData || []
    console.log(`\nRAG System Total: ${currentTotal.length} chunks`)
    console.log('='.repeat(80))
    
    console.log('\n🎉 Additional webinars successfully processed!')
    console.log('\nNext steps:')
    console.log('1. Test semantic search for accountability topics')
    console.log('2. Test semantic search for self-limiting beliefs topics')
    console.log('3. Generate content using new RAG chunks')
    console.log('4. Monitor content quality and authenticity')
    
  } else {
    console.log('\n❌ Processing failed. Check logs for details.')
  }
  
  console.log('='.repeat(80) + '\n')
}

// Run if executed directly
if (require.main === module) {
  processAdditionalWebinars().catch(error => {
    console.error('Processing failed:', error)
    process.exit(1)
  })
}