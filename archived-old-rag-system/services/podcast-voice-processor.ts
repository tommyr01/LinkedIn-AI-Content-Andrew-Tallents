import { supabaseService } from './supabase'
import logger from '../lib/logger'
import Anthropic from '@anthropic-ai/sdk'
import { appConfig } from '../config'

interface PodcastEpisode {
  id: string
  title: string
  transcript_raw: string
}

interface VoicePattern {
  pattern_type: 'opening' | 'transition' | 'question' | 'conclusion' | 'storytelling' | 'vulnerability' | 'confrontational'
  pattern_text: string
  confidence_score: number
  usage_context: string
  emotional_tone: string
  authenticity_indicators: string[]
}

export class PodcastVoiceProcessor {
  private anthropic: Anthropic

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: appConfig.anthropic.apiKey
    })
  }

  /**
   * Process all podcast episodes to extract Andrew's voice patterns
   */
  async processAllEpisodes(): Promise<void> {
    logger.info('Starting podcast voice processing for all episodes')

    try {
      // Get all podcast episodes
      const { data: episodes, error } = await supabaseService.client
        .from('podcast_episodes')
        .select('id, title, transcript_raw')

      if (error) {
        throw error
      }

      if (!episodes || episodes.length === 0) {
        logger.warn('No podcast episodes found to process')
        return
      }

      logger.info(`Found ${episodes.length} episodes to process`)

      // Process each episode
      for (const episode of episodes) {
        try {
          await this.processEpisode(episode)
          logger.info(`Processed episode: ${episode.title}`)
        } catch (error) {
          logger.error({ 
            error: error instanceof Error ? error.message : String(error),
            episodeId: episode.id,
            title: episode.title
          }, 'Failed to process episode')
        }
      }

      logger.info('Completed processing all podcast episodes')
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to process podcast episodes')
      throw error
    }
  }

  /**
   * Process a single episode to extract Andrew's segments and voice patterns
   */
  private async processEpisode(episode: PodcastEpisode): Promise<void> {
    // Step 1: Separate Andrew's segments from guest segments
    const andrewSegments = await this.extractAndrewSegments(episode)
    
    // Step 2: Store segments in transcript_segments table
    const segmentIds = await this.storeTranscriptSegments(episode.id, andrewSegments)
    
    // Step 3: Extract voice patterns from Andrew's segments
    const voicePatterns = await this.extractVoicePatterns(andrewSegments)
    
    // Step 4: Store voice patterns
    await this.storeVoicePatterns(segmentIds, voicePatterns)
  }

  /**
   * Extract Andrew's segments from the full transcript
   */
  private async extractAndrewSegments(episode: PodcastEpisode): Promise<string[]> {
    const prompt = `Analyze this podcast transcript and extract ONLY Andrew Tallents' speaking segments. 

TRANSCRIPT:
${episode.transcript_raw.substring(0, 50000)} // Limit to fit context

INSTRUCTIONS:
1. Identify Andrew Tallents as the host (he introduces guests, asks questions, shares personal stories)
2. Extract his complete speaking segments - don't break mid-sentence
3. Remove guest responses, audience reactions, technical notes
4. Focus on segments that show his authentic voice, personality, and speaking patterns
5. Include his questions, transitions, personal anecdotes, and conclusions

Return a JSON array of Andrew's speaking segments:
{"segments": ["segment1", "segment2", ...]}

Be thorough - this data will train an AI to replicate his authentic voice.`

    try {
      const completion = await this.anthropic.messages.create({
        model: appConfig.anthropic.model,
        max_tokens: 4000,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      })

      const response = completion.content[0]
      if (response.type !== 'text') {
        throw new Error('Unexpected response type from Claude')
      }

      const parsed = JSON.parse(response.text)
      return parsed.segments || []
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        episodeTitle: episode.title
      }, 'Failed to extract Andrew segments')
      return []
    }
  }

  /**
   * Store transcript segments in database
   */
  private async storeTranscriptSegments(episodeId: string, segments: string[]): Promise<string[]> {
    const segmentData = segments.map((segment, index) => ({
      episode_id: episodeId,
      speaker: 'andrew',
      segment_text: segment,
      segment_order: index + 1,
      word_count: segment.split(' ').length
    }))

    const { data, error } = await supabaseService.client
      .from('transcript_segments')
      .insert(segmentData)
      .select('id')

    if (error) {
      throw error
    }

    return data?.map(row => row.id) || []
  }

  /**
   * Extract voice patterns from Andrew's segments
   */
  private async extractVoicePatterns(segments: string[]): Promise<VoicePattern[]> {
    const combinedText = segments.join('\n\n')
    
    const prompt = `Analyze Andrew Tallents' speaking patterns from these podcast segments to identify his authentic voice characteristics.

ANDREW'S SEGMENTS:
${combinedText.substring(0, 40000)}

Extract voice patterns in these categories:
1. OPENING - How he starts conversations/topics
2. TRANSITION - How he moves between topics
3. QUESTION - His questioning style and approach
4. STORYTELLING - Personal anecdotes and narrative style
5. VULNERABILITY - Moments of openness and humanity
6. CONFRONTATIONAL - Direct, challenging statements (his signature style)
7. CONCLUSION - How he wraps up discussions

For each pattern found, provide:
- The actual text example
- Confidence score (0-1)
- Usage context
- Emotional tone
- Authenticity indicators (what makes it uniquely Andrew)

Return JSON:
{
  "patterns": [
    {
      "pattern_type": "opening",
      "pattern_text": "exact quote",
      "confidence_score": 0.9,
      "usage_context": "when introducing controversial topics",
      "emotional_tone": "direct but warm",
      "authenticity_indicators": ["confrontational opening", "personal vulnerability", "research backing"]
    }
  ]
}

Focus on patterns that could help an AI write LinkedIn posts in Andrew's authentic voice.`

    try {
      const completion = await this.anthropic.messages.create({
        model: appConfig.anthropic.model,
        max_tokens: 4000,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      })

      const response = completion.content[0]
      if (response.type !== 'text') {
        throw new Error('Unexpected response type from Claude')
      }

      const parsed = JSON.parse(response.text)
      return parsed.patterns || []
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to extract voice patterns')
      return []
    }
  }

  /**
   * Store voice patterns in database
   */
  private async storeVoicePatterns(segmentIds: string[], patterns: VoicePattern[]): Promise<void> {
    if (patterns.length === 0 || segmentIds.length === 0) {
      return
    }

    // Distribute patterns across segments
    const patternData = patterns.map((pattern, index) => ({
      segment_id: segmentIds[index % segmentIds.length], // Distribute evenly
      pattern_type: pattern.pattern_type,
      pattern_text: pattern.pattern_text,
      confidence_score: pattern.confidence_score,
      usage_context: pattern.usage_context,
      emotional_tone: pattern.emotional_tone,
      authenticity_indicators: pattern.authenticity_indicators
    }))

    const { error } = await supabaseService.client
      .from('voice_patterns')
      .insert(patternData)

    if (error) {
      throw error
    }
  }

  /**
   * Get voice patterns for content generation
   */
  async getVoicePatternsForGeneration(patternTypes?: string[]): Promise<VoicePattern[]> {
    let query = supabaseService.client
      .from('voice_patterns')
      .select('*')
      .order('confidence_score', { ascending: false })

    if (patternTypes && patternTypes.length > 0) {
      query = query.in('pattern_type', patternTypes)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      throw error
    }

    return data || []
  }

  /**
   * Get random Andrew segments for RAG context
   */
  async getRandomAndrewSegments(count: number = 10): Promise<string[]> {
    const { data, error } = await supabaseService.client
      .from('transcript_segments')
      .select('segment_text')
      .eq('speaker', 'andrew')
      .order('random()')
      .limit(count)

    if (error) {
      throw error
    }

    return data?.map(row => row.segment_text) || []
  }
}

export const podcastVoiceProcessor = new PodcastVoiceProcessor()