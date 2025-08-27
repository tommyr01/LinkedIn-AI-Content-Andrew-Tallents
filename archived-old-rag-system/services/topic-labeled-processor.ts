import { supabaseService } from './supabase'
import { embeddingGenerator } from './embedding-generator'
import logger from '../lib/logger'
import Anthropic from '@anthropic-ai/sdk'
import { appConfig } from '../config'

export class TopicLabeledProcessor {
  private anthropic: Anthropic

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: appConfig.anthropic.apiKey
    })
  }

  /**
   * Process a specific webinar with topic-focused segmentation and labeling
   */
  async processWebinarWithTopicLabels(
    webinarTitle: string, 
    topicLabel: string,
    targetSegmentCount: number = 50
  ): Promise<void> {
    logger.info(`Processing webinar: ${webinarTitle} with topic: ${topicLabel}`)

    try {
      // Get the webinar
      const { data: webinar, error } = await supabaseService.client
        .from('podcast_episodes')
        .select('id, title, transcript_raw')
        .ilike('title', `%${webinarTitle}%`)
        .single()

      if (error || !webinar) {
        throw new Error(`Webinar not found: ${webinarTitle}`)
      }

      logger.info(`Found webinar: ${webinar.title}`)

      // Clear existing segments for this webinar
      await this.clearExistingSegments(webinar.id)

      // Create topic-focused segments
      const segments = await this.createTopicFocusedSegments(
        webinar.transcript_raw, 
        topicLabel, 
        targetSegmentCount
      )

      logger.info(`Created ${segments.length} topic-focused segments`)

      // Store segments with topic labels
      const segmentIds = await this.storeTopicLabeledSegments(
        webinar.id, 
        segments, 
        topicLabel
      )

      // Generate embeddings for new segments
      logger.info('Generating embeddings for topic-labeled segments...')
      await this.generateEmbeddingsForSegments(segmentIds)

      logger.info(`✅ Successfully processed ${webinar.title} with ${segments.length} segments labeled as "${topicLabel}"`)

    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        webinarTitle,
        topicLabel 
      }, 'Failed to process webinar with topic labels')
      throw error
    }
  }

  /**
   * Create topic-focused segments from webinar transcript
   */
  private async createTopicFocusedSegments(
    transcript: string,
    topicLabel: string,
    targetCount: number
  ): Promise<Array<{
    text: string
    keywords: string[]
    confidence: number
  }>> {
    const prompt = `Segment this ${topicLabel.toLowerCase()} webinar transcript into ${targetCount} focused, coherent segments.

WEBINAR TOPIC: ${topicLabel}
TRANSCRIPT: ${transcript.substring(0, 45000)}

SEGMENTATION REQUIREMENTS:
1. Each segment should be 2-4 complete sentences about a specific ${topicLabel.toLowerCase()} concept
2. Focus on actionable insights, examples, and key principles
3. Remove filler words, "um", "uh", technical interruptions
4. Each segment should be standalone and meaningful
5. Extract key topic keywords for each segment

Return JSON:
{
  "segments": [
    {
      "text": "clean segment text",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "confidence": 0.9
    }
  ]
}`

    try {
      const completion = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      })

      const response = completion.content[0]
      if (response.type !== 'text') throw new Error('Unexpected response type')

      // Clean JSON response
      let jsonText = response.text.trim()
      if (jsonText.includes('```json')) {
        jsonText = jsonText.split('```json')[1].split('```')[0].trim()
      }

      const parsed = JSON.parse(jsonText)
      return parsed.segments || []
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        topicLabel 
      }, 'Failed to create topic-focused segments, using fallback')

      // Fallback: simple sentence-based splitting
      return this.fallbackSegmentation(transcript, topicLabel, targetCount)
    }
  }

  /**
   * Fallback segmentation if AI processing fails
   */
  private fallbackSegmentation(
    transcript: string, 
    topicLabel: string, 
    targetCount: number
  ): Array<{text: string, keywords: string[], confidence: number}> {
    const sentences = transcript
      .split(/\.\s+/)
      .filter(s => s.length > 50)
      .map(s => s.trim())

    const segmentSize = Math.max(2, Math.floor(sentences.length / targetCount))
    const segments = []

    for (let i = 0; i < sentences.length; i += segmentSize) {
      const segmentText = sentences.slice(i, i + segmentSize).join('. ') + '.'
      segments.push({
        text: segmentText,
        keywords: [topicLabel.toLowerCase()],
        confidence: 0.7
      })
    }

    return segments.slice(0, targetCount)
  }

  /**
   * Store segments with topic labels
   */
  private async storeTopicLabeledSegments(
    episodeId: string,
    segments: Array<{text: string, keywords: string[], confidence: number}>,
    topicLabel: string
  ): Promise<string[]> {
    const segmentData = segments.map((segment, index) => ({
      episode_id: episodeId,
      speaker: 'andrew',
      segment_text: segment.text,
      segment_order: index + 1,
      word_count: segment.text.split(' ').length,
      topic_label: topicLabel,
      topic_confidence: segment.confidence,
      topic_keywords: segment.keywords
    }))

    const { data, error } = await supabaseService.client
      .from('transcript_segments')
      .insert(segmentData)
      .select('id')

    if (error) throw error
    return data?.map(row => row.id) || []
  }

  /**
   * Clear existing segments for a webinar
   */
  private async clearExistingSegments(episodeId: string): Promise<void> {
    const { error } = await supabaseService.client
      .from('transcript_segments')
      .delete()
      .eq('episode_id', episodeId)

    if (error) {
      logger.warn({ error, episodeId }, 'Failed to clear existing segments')
    }
  }

  /**
   * Generate embeddings for specific segments
   */
  private async generateEmbeddingsForSegments(segmentIds: string[]): Promise<void> {
    for (const segmentId of segmentIds) {
      try {
        const { data: segment } = await supabaseService.client
          .from('transcript_segments')
          .select('segment_text')
          .eq('id', segmentId)
          .single()

        if (segment) {
          const embedding = await embeddingGenerator['generateEmbedding'](segment.segment_text)
          
          await supabaseService.client
            .from('transcript_segments')
            .update({
              embedding,
              embedding_generated_at: new Date().toISOString()
            })
            .eq('id', segmentId)
        }
      } catch (error) {
        logger.error({ error, segmentId }, 'Failed to generate embedding for segment')
      }
    }
  }

  /**
   * Search segments by topic and semantic similarity
   */
  async searchTopicSegments(
    topicLabel: string,
    queryText: string,
    limit: number = 5
  ): Promise<Array<{
    id: string
    segment_text: string
    topic_keywords: string[]
    similarity: number
  }>> {
    try {
      // Generate embedding for query
      const queryEmbedding = await embeddingGenerator['generateEmbedding'](queryText)
      const embeddingString = `[${queryEmbedding.join(',')}]`

      // Search with topic filter
      const { data, error } = await supabaseService.client.rpc('match_topic_segments', {
        query_embedding: embeddingString,
        topic_filter: topicLabel,
        match_threshold: 0.7,
        match_count: limit
      })

      if (error) throw error
      return data || []
    } catch (error) {
      logger.error({ error, topicLabel, queryText }, 'Failed to search topic segments')
      return []
    }
  }
}

export const topicLabeledProcessor = new TopicLabeledProcessor()