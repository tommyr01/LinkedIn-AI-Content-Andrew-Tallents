import { supabaseService } from './supabase'
import logger from '../lib/logger'
import OpenAI from 'openai'
import { appConfig } from '../config'

export class EmbeddingGenerator {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: appConfig.openai.apiKey
    })
  }

  /**
   * Generate embeddings for all transcript segments that don't have them
   */
  async generateAllEmbeddings(): Promise<void> {
    logger.info('Starting embedding generation for transcript segments...')

    try {
      // Get segments without embeddings
      const { data: segments, error } = await supabaseService.client
        .from('transcript_segments')
        .select('id, segment_text')
        .is('embedding', null)
        .eq('speaker', 'andrew') // Focus on Andrew's segments

      if (error) throw error
      if (!segments?.length) {
        logger.info('No segments need embeddings generated')
        return
      }

      logger.info(`Generating embeddings for ${segments.length} segments...`)

      // Process in batches to avoid rate limits
      const batchSize = 10
      let processed = 0

      for (let i = 0; i < segments.length; i += batchSize) {
        const batch = segments.slice(i, i + batchSize)
        await this.processBatch(batch)
        processed += batch.length
        
        logger.info(`Processed ${processed}/${segments.length} embeddings`)
        
        // Small delay to respect rate limits
        if (i + batchSize < segments.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      logger.info('✅ All embeddings generated successfully')
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error) 
      }, 'Failed to generate embeddings')
      throw error
    }
  }

  /**
   * Process a batch of segments for embedding generation
   */
  private async processBatch(segments: Array<{id: string, segment_text: string}>): Promise<void> {
    try {
      // Generate embeddings for all segments in batch
      const embeddings = await Promise.all(
        segments.map(segment => this.generateEmbedding(segment.segment_text))
      )

      // Update database with embeddings
      const updates = segments.map((segment, index) => ({
        id: segment.id,
        embedding: embeddings[index],
        embedding_generated_at: new Date().toISOString()
      }))

      for (const update of updates) {
        const { error } = await supabaseService.client
          .from('transcript_segments')
          .update({
            embedding: update.embedding,
            embedding_generated_at: update.embedding_generated_at
          })
          .eq('id', update.id)

        if (error) {
          logger.error({ error, segmentId: update.id }, 'Failed to update segment with embedding')
        }
      }

    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        batchSize: segments.length 
      }, 'Failed to process embedding batch')
    }
  }

  /**
   * Generate embedding for a single text segment
   */
  async generate(text: string): Promise<number[]> {
    return this.generateEmbedding(text)
  }

  /**
   * Generate embedding for a single text segment (internal method)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.replace(/\n/g, ' ').trim()
      })

      return response.data[0].embedding
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        textLength: text.length 
      }, 'Failed to generate single embedding')
      
      // Return zero vector as fallback
      return new Array(1536).fill(0)
    }
  }

  /**
   * Find semantically similar segments using vector search
   */
  async findSimilarSegments(queryText: string, limit: number = 5): Promise<Array<{
    id: string
    segment_text: string
    similarity: number
  }>> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(queryText)
      
      // Convert to string format for SQL
      const embeddingString = `[${queryEmbedding.join(',')}]`

      // Perform vector similarity search
      const { data, error } = await supabaseService.client.rpc('match_segments', {
        query_embedding: embeddingString,
        match_threshold: 0.7,
        match_count: limit
      })

      if (error) {
        logger.error({ error }, 'Vector search failed, falling back to basic search')
        return await this.fallbackTextSearch(queryText, limit)
      }

      return data || []
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        queryText 
      }, 'Failed to find similar segments')
      
      return await this.fallbackTextSearch(queryText, limit)
    }
  }

  /**
   * Fallback text search when vector search fails
   */
  private async fallbackTextSearch(queryText: string, limit: number): Promise<Array<{
    id: string
    segment_text: string 
    similarity: number
  }>> {
    const { data, error } = await supabaseService.client
      .from('transcript_segments')
      .select('id, segment_text')
      .eq('speaker', 'andrew')
      .textSearch('segment_text', queryText)
      .limit(limit)

    if (error) {
      logger.error({ error }, 'Fallback text search failed')
      return []
    }

    return (data || []).map(segment => ({
      ...segment,
      similarity: 0.5 // Default similarity for text search
    }))
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStats(): Promise<{
    totalSegments: number
    embeddedSegments: number
    missingEmbeddings: number
    embeddingCoverage: number
  }> {
    const { data: total } = await supabaseService.client
      .from('transcript_segments')
      .select('id')
      .eq('speaker', 'andrew')

    const { data: embedded } = await supabaseService.client
      .from('transcript_segments')
      .select('id')
      .eq('speaker', 'andrew')
      .not('embedding', 'is', null)

    const totalSegments = total?.length || 0
    const embeddedSegments = embedded?.length || 0
    const missingEmbeddings = totalSegments - embeddedSegments
    const embeddingCoverage = totalSegments > 0 ? (embeddedSegments / totalSegments) * 100 : 0

    return {
      totalSegments,
      embeddedSegments,
      missingEmbeddings,
      embeddingCoverage: Math.round(embeddingCoverage * 10) / 10
    }
  }
}

export const embeddingGenerator = new EmbeddingGenerator()