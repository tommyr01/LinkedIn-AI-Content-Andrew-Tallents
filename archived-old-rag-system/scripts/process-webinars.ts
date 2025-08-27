/**
 * Webinar Processing Script
 * 
 * Processes specific webinars into the RAG system:
 * 1. Leadership Team Coaching
 * 2. Sustainable Self-Leadership
 * 
 * Creates proper 100-500 token chunks with appropriate topic labeling
 */

import { OpenAI } from 'openai'
import { supabaseService } from '../services/supabase'
import logger from '../lib/logger'
import { appConfig } from '../config'

interface ProcessingStats {
  webinarsProcessed: number
  chunksCreated: number
  embeddingsGenerated: number
  errors: number
  processingTime: number
  webinarResults: WebinarResult[]
}

interface WebinarResult {
  webinarId: string
  title: string
  topic: string
  chunksCreated: number
  success: boolean
  error?: string
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
  episode_title: string
  guest_name: string | null
  episode_date: string | null
  embedding: number[]
}

export class WebinarProcessor {
  private openai: OpenAI
  private overlapTokens: number = 50
  private minChunkTokens: number = 50  // Match database constraint
  private maxChunkTokens: number = 500
  
  // Target webinars to process
  private targetWebinars = [
    {
      titlePattern: '%Leadership Team Coaching%',
      topic: 'Leadership Team Coaching',
      expectedId: '8883ec44-c23d-44ec-8bae-f3e456858393'
    },
    {
      titlePattern: '%Sustainable Self-Leadership%', 
      topic: 'Sustainable Self-Leadership',
      expectedId: 'af361954-f776-4429-8539-bcb14fa0b074'
    }
  ]

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: appConfig.openai.apiKey 
    })
  }

  /**
   * Main processing function - process the two target webinars
   */
  async processTargetWebinars(): Promise<ProcessingStats> {
    const startTime = Date.now()
    let stats: ProcessingStats = {
      webinarsProcessed: 0,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      errors: 0,
      processingTime: 0,
      webinarResults: []
    }

    logger.info('Starting webinar processing for Leadership Team Coaching and Sustainable Self-Leadership')

    try {
      // Get the target webinars
      const webinars = await this.getTargetWebinars()
      
      if (webinars.length === 0) {
        logger.warn('No target webinars found')
        return stats
      }

      logger.info({ webinarsFound: webinars.length }, 'Found webinars to process')

      // Process each webinar
      for (const webinar of webinars) {
        try {
          const result = await this.processWebinar(webinar)
          stats.webinarResults.push(result)
          
          if (result.success) {
            stats.webinarsProcessed++
            stats.chunksCreated += result.chunksCreated
            stats.embeddingsGenerated += result.chunksCreated
          } else {
            stats.errors++
          }
          
          // Small delay between webinars
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          logger.error({ error: error instanceof Error ? error.message : String(error), webinarId: webinar.id }, 'Failed to process webinar')
          stats.errors++
          stats.webinarResults.push({
            webinarId: webinar.id,
            title: webinar.title,
            topic: this.getWebinarTopic(webinar.title),
            chunksCreated: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }

      stats.processingTime = Date.now() - startTime
      
      logger.info(stats, 'Webinar processing completed')
      return stats

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Webinar processing failed')
      stats.errors++
      stats.processingTime = Date.now() - startTime
      return stats
    }
  }

  /**
   * Get the target webinars from database
   */
  private async getTargetWebinars(): Promise<any[]> {
    const webinars = []
    
    for (const target of this.targetWebinars) {
      const { data: webinar, error } = await supabaseService.client
        .from('podcast_episodes')
        .select('*')
        .ilike('title', target.titlePattern)
        .single()

      if (error || !webinar) {
        logger.warn({ pattern: target.titlePattern, error }, 'Target webinar not found')
        continue
      }

      if (!webinar.transcript_raw || webinar.transcript_raw.trim().length === 0) {
        logger.warn({ webinarId: webinar.id, title: webinar.title }, 'Webinar has no transcript content')
        continue
      }

      webinars.push(webinar)
    }

    return webinars
  }

  /**
   * Process a single webinar into RAG chunks
   */
  private async processWebinar(webinar: any): Promise<WebinarResult> {
    const topic = this.getWebinarTopic(webinar.title)
    
    logger.info({ 
      webinarId: webinar.id, 
      title: webinar.title, 
      topic,
      contentLength: webinar.transcript_raw?.length 
    }, 'Processing webinar')

    try {
      // Check if already processed
      const { data: existingChunks } = await supabaseService.client
        .from('voice_content_chunks')
        .select('id')
        .eq('episode_id', webinar.id)
        .limit(1)

      if (existingChunks && existingChunks.length > 0) {
        logger.info({ webinarId: webinar.id }, 'Webinar already processed, skipping')
        return {
          webinarId: webinar.id,
          title: webinar.title,
          topic,
          chunksCreated: 0,
          success: true,
          error: 'Already processed'
        }
      }

      // Split transcript into chunks
      const chunks = await this.splitTranscriptIntoChunks(webinar.transcript_raw, webinar, topic)
      
      if (chunks.length === 0) {
        throw new Error('No valid chunks generated from transcript')
      }

      // Save all chunks to database
      if (chunks.length > 0) {
        await this.saveChunksToDatabase(chunks)
      }

      logger.info({ 
        webinarId: webinar.id, 
        chunksCreated: chunks.length,
        topic
      }, 'Webinar processing completed')

      return {
        webinarId: webinar.id,
        title: webinar.title,
        topic,
        chunksCreated: chunks.length,
        success: true
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error({ error: errorMessage, webinarId: webinar.id }, 'Failed to process webinar')
      
      return {
        webinarId: webinar.id,
        title: webinar.title,
        topic,
        chunksCreated: 0,
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Split transcript into properly sized chunks
   */
  private async splitTranscriptIntoChunks(
    transcript: string, 
    webinar: any,
    primaryTopic: string
  ): Promise<ChunkData[]> {
    // Clean up transcript - remove timestamps and clean formatting
    const cleanText = this.cleanTranscript(transcript)
    
    // Split into word segments for better chunking boundaries
    const segments = this.splitIntoSegments(cleanText)
    
    logger.debug({
      webinarId: webinar.id,
      originalLength: transcript.length,
      cleanedLength: cleanText.length,
      segmentCount: segments.length
    }, 'Text preprocessing completed')
    
    // Create chunks with overlap
    const rawChunks = this.createChunksFromSegments(segments)
    
    logger.debug({
      webinarId: webinar.id,
      rawChunkCount: rawChunks.length,
      chunkSample: rawChunks.length > 0 ? rawChunks[0].substring(0, 100) + '...' : 'No chunks'
    }, 'Chunking completed')
    
    // Process each chunk with AI analysis and embeddings
    const processedChunks: ChunkData[] = []
    const batchSize = 5 // Process in smaller batches to avoid timeouts
    
    for (let batchStart = 0; batchStart < rawChunks.length; batchStart += batchSize) {
      const batch = rawChunks.slice(batchStart, batchStart + batchSize)
      
      logger.info({ 
        webinarId: webinar.id, 
        batchStart, 
        batchSize: batch.length,
        totalChunks: rawChunks.length 
      }, 'Processing chunk batch')
      
      for (let i = 0; i < batch.length; i++) {
        const globalIndex = batchStart + i
        const chunkText = batch[i]
        
        try {
          const tokenCount = this.estimateTokenCount(chunkText)
          
          // Skip chunks outside database constraints
          if (tokenCount < 50 || tokenCount > 600) {
            logger.warn({ 
              chunkIndex: globalIndex, 
              tokenCount, 
              textLength: chunkText.length,
              webinarId: webinar.id
            }, 'Chunk token count outside database constraints')
            continue
          }
          
          // Analyze chunk content (with timeout)
          const analysis = await Promise.race([
            this.analyzeChunk(chunkText, primaryTopic, webinar),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Analysis timeout')), 30000))
          ]) as Partial<ChunkData>
          
          // Generate embedding (with timeout)
          const embedding = await Promise.race([
            this.generateEmbedding(chunkText),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Embedding timeout')), 15000))
          ]) as number[]
          
          processedChunks.push({
            chunk_text: chunkText,
            token_count: tokenCount,
            word_count: chunkText.split(/\s+/).length,
            char_count: chunkText.length,
            speaker: 'andrew', // Assume Andrew is the main speaker
            episode_id: webinar.id,
            chunk_index: globalIndex,
            episode_title: webinar.title,
            guest_name: webinar.guest_name || null,
            episode_date: webinar.episode_date || null,
            embedding,
            ...analysis
          })
          
          // Small delay between chunks to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 200))
          
        } catch (error) {
          logger.error({ error: error instanceof Error ? error.message : String(error), chunkIndex: globalIndex, webinarId: webinar.id }, 'Failed to process chunk')
          // Continue with next chunk rather than failing entire webinar
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return processedChunks
  }

  /**
   * Clean transcript text
   */
  private cleanTranscript(transcript: string): string {
    return transcript
      // Remove timestamp patterns like [00:12:34]
      .replace(/\[\d{1,2}:\d{2}:\d{2}\]/g, '')
      // Remove speaker labels like "Speaker:" or "Andrew:"
      .replace(/^[A-Za-z\s]+:/gm, '')
      // Clean up multiple spaces and newlines
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      // Remove extra whitespace
      .trim()
  }

  /**
   * Split text into manageable segments (using words instead of strict sentences)
   */
  private splitIntoSegments(text: string): string[] {
    const words = text.split(/\s+/)
    const segments: string[] = []
    
    // Create segments of roughly 30-50 words each for flexible chunking
    for (let i = 0; i < words.length; i += 35) {
      const segment = words.slice(i, i + 50).join(' ')
      if (segment.trim().length > 50) { // Minimum segment size
        segments.push(segment.trim())
      }
    }
    
    return segments
  }

  /**
   * Create chunks from segments with proper overlap
   */
  private createChunksFromSegments(segments: string[]): string[] {
    const chunks: string[] = []
    let currentChunk = ''
    let currentTokenCount = 0

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const segmentTokenCount = this.estimateTokenCount(segment)
      
      // If adding this segment would exceed max tokens, finalize current chunk
      if (currentTokenCount + segmentTokenCount > this.maxChunkTokens && currentChunk.length > 0) {
        if (currentTokenCount >= this.minChunkTokens) {
          chunks.push(currentChunk.trim())
        }
        
        // Start new chunk with overlap from previous chunk
        const overlapText = this.getOverlapText(currentChunk, this.overlapTokens)
        currentChunk = overlapText + ' ' + segment
        currentTokenCount = this.estimateTokenCount(currentChunk)
      } else {
        currentChunk += (currentChunk ? ' ' : '') + segment
        currentTokenCount += segmentTokenCount
      }
    }

    // Add final chunk if it has sufficient content
    if (currentChunk.trim() && currentTokenCount >= this.minChunkTokens) {
      chunks.push(currentChunk.trim())
    }

    return chunks.filter(chunk => {
      const tokenCount = this.estimateTokenCount(chunk)
      return tokenCount >= this.minChunkTokens && tokenCount <= 600 // Match database constraint
    })
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
   * Analyze chunk content with AI
   */
  private async analyzeChunk(
    chunkText: string, 
    primaryTopic: string,
    webinar: any
  ): Promise<Partial<ChunkData>> {
    try {
      const analysisPrompt = `Analyze this chunk from Andrew Tallents' webinar "${webinar.title}" (topic: ${primaryTopic}):

"${chunkText}"

Return ONLY a JSON object with this exact structure:
{
  "primary_topic": "${primaryTopic}",
  "secondary_topics": ["array", "of", "secondary", "topics"],
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
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a voice analysis expert specializing in leadership coaching content. Return only valid JSON.'
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
        primary_topic: analysis.primary_topic || primaryTopic,
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
      logger.error({ error }, 'Chunk analysis failed, using defaults')
      
      // Return basic analysis
      return {
        primary_topic: primaryTopic,
        secondary_topics: [],
        pattern_types: [],
        emotional_tone: 'instructional',
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
   * Save chunks to database
   */
  private async saveChunksToDatabase(chunks: ChunkData[]): Promise<void> {
    try {
      const chunksToInsert = chunks.map((chunk, index) => ({
        episode_id: chunk.episode_id,
        segment_id: null, // These are direct episode chunks, not segment chunks
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
        guest_name: chunk.guest_name,
        episode_date: chunk.episode_date,
        quality_score: this.calculateChunkQuality(chunk),
        // Overlap tracking
        prev_chunk_id: null, // Will be updated after insertion if needed
        next_chunk_id: null,
        overlap_prev_tokens: index > 0 ? this.overlapTokens : 0,
        overlap_next_tokens: index < chunks.length - 1 ? this.overlapTokens : 0,
        // RAG-specific fields
        retrieval_frequency: 0,
        relevance_boost: 1.0,
        // Timestamps (not available from transcript_raw)
        timestamp_start: null,
        timestamp_end: null,
        // Metadata
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error } = await supabaseService.client
        .from('voice_content_chunks')
        .insert(chunksToInsert)

      if (error) {
        throw new Error(`Failed to insert chunks: ${error.message}`)
      }

      logger.debug({ chunksInserted: chunks.length }, 'Chunks saved to database')

    } catch (error) {
      logger.error({ error }, 'Failed to save chunks to database')
      throw error
    }
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
    if (chunk.teaching_moment) quality += 0.15 // Higher weight for teaching content
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
   * Determine webinar topic from title
   */
  private getWebinarTopic(title: string): string {
    if (title.includes('Leadership Team Coaching')) {
      return 'Leadership Team Coaching'
    } else if (title.includes('Sustainable Self-Leadership')) {
      return 'Sustainable Self-Leadership'
    }
    return 'Leadership Development'
  }

  /**
   * Print processing summary
   */
  printSummary(stats: ProcessingStats): void {
    console.log('\n' + '='.repeat(60))
    console.log('WEBINAR PROCESSING SUMMARY')
    console.log('='.repeat(60))
    
    console.log(`Total Processing Time: ${Math.round(stats.processingTime / 1000)}s`)
    console.log(`Webinars Processed: ${stats.webinarsProcessed}`)
    console.log(`Total Chunks Created: ${stats.chunksCreated}`)
    console.log(`Embeddings Generated: ${stats.embeddingsGenerated}`)
    console.log(`Errors: ${stats.errors}`)
    console.log('')
    
    stats.webinarResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌'
      console.log(`${index + 1}. ${status} ${result.topic}`)
      console.log(`   Title: ${result.title}`)
      console.log(`   Chunks: ${result.chunksCreated}`)
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      console.log('')
    })
    
    console.log('='.repeat(60) + '\n')
  }
}

// Export for use in other scripts
export const webinarProcessor = new WebinarProcessor()

// Main execution function
export async function processTargetWebinars(): Promise<void> {
  console.log('🚀 Starting webinar processing...')
  
  const processor = new WebinarProcessor()
  const stats = await processor.processTargetWebinars()
  
  processor.printSummary(stats)
  
  if (stats.errors > 0) {
    console.log('⚠️  Some errors occurred during processing. Check logs for details.')
    if (stats.webinarsProcessed === 0) {
      process.exit(1)
    }
  }
  
  if (stats.webinarsProcessed > 0) {
    console.log('🎉 Webinar processing completed successfully!')
    console.log(`\nRAG system now has ${stats.chunksCreated} new chunks for:`)
    stats.webinarResults.forEach(result => {
      if (result.success) {
        console.log(`- ${result.topic}: ${result.chunksCreated} chunks`)
      }
    })
  } else {
    console.log('⚠️  No webinars were processed.')
  }
}

// Run processing if this file is executed directly
if (require.main === module) {
  processTargetWebinars().catch(error => {
    console.error('Processing failed:', error)
    process.exit(1)
  })
}