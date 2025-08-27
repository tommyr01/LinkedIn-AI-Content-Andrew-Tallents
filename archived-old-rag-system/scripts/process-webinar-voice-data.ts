import { supabaseService } from '../services/supabase'
import logger from '../lib/logger'
import Anthropic from '@anthropic-ai/sdk'
import { appConfig } from '../config'

const anthropic = new Anthropic({
  apiKey: appConfig.anthropic.apiKey
})

/**
 * Process webinar transcripts - these are solo Andrew content, much cleaner for voice extraction
 */
async function processWebinarVoiceData() {
  logger.info('Processing webinar voice data...')
  
  try {
    // Get webinar episodes only
    const { data: webinars, error } = await supabaseService.client
      .from('podcast_episodes')
      .select('id, title, transcript_raw')
      .or('title.ilike.%webinar%,title.ilike.%self-coaching%')

    if (error) throw error
    if (!webinars?.length) {
      logger.warn('No webinars found')
      return
    }

    logger.info(`Processing ${webinars.length} webinars`)

    for (const webinar of webinars) {
      try {
        await processWebinar(webinar)
        logger.info(`✅ Processed: ${webinar.title}`)
      } catch (error) {
        logger.error({ 
          error: error instanceof Error ? error.message : String(error),
          title: webinar.title
        }, '❌ Failed to process webinar')
      }
    }

    // Check results
    const { data: segments } = await supabaseService.client
      .from('transcript_segments')
      .select('count')
      .eq('speaker', 'andrew')

    const { data: patterns } = await supabaseService.client
      .from('voice_patterns')
      .select('count')

    logger.info(`✅ Complete! Total segments: ${segments?.length || 0}, patterns: ${patterns?.length || 0}`)

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to process webinars')
    throw error
  }
}

async function processWebinar(webinar: any) {
  // Since it's all Andrew, we can segment by natural breaks
  const segments = await extractWebinarSegments(webinar.transcript_raw, webinar.title)
  const segmentIds = await storeSegments(webinar.id, segments)
  const patterns = await extractVoicePatterns(segments.join('\n\n'), webinar.title)
  await storePatterns(segmentIds, patterns)
}

async function extractWebinarSegments(transcript: string, title: string): Promise<string[]> {
  const prompt = `Extract natural speaking segments from this Andrew Tallents webinar transcript. Since this is solo content, segment by topic changes and natural pauses.

WEBINAR: ${title}
TRANSCRIPT: ${transcript.substring(0, 45000)}

Return segments as clean speaking blocks (remove "um", "uh", technical interruptions). Focus on complete thoughts and ideas.

Return JSON: {"segments": ["segment1", "segment2", ...]}`

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    })

    const response = completion.content[0]
    if (response.type !== 'text') throw new Error('Unexpected response type')

    // Clean the response to handle non-JSON text
    let jsonText = response.text.trim()
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim()
    }
    if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].trim()
    }

    const parsed = JSON.parse(jsonText)
    return parsed.segments || []
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), title }, 'Failed to extract segments')
    
    // Fallback: simple splitting
    return transcript
      .split(/\.\s+(?=[A-Z])/)
      .filter(seg => seg.length > 100)
      .slice(0, 20) // Max 20 segments per webinar
  }
}

async function extractVoicePatterns(combinedText: string, title: string): Promise<any[]> {
  const prompt = `Extract Andrew Tallents' voice patterns from this webinar content for LinkedIn content generation.

WEBINAR: ${title}
CONTENT: ${combinedText.substring(0, 40000)}

Find patterns for:
1. OPENING - How he starts topics/presentations
2. STORYTELLING - Personal examples and narratives  
3. TEACHING - His instructional/coaching style
4. VULNERABILITY - Authentic personal moments
5. AUTHORITY - Professional credibility signals
6. CONCLUSION - How he wraps up points
7. CONFRONTATIONAL - Direct, challenging statements

Return JSON only:
{
  "patterns": [
    {
      "pattern_type": "opening",
      "pattern_text": "exact quote",
      "confidence_score": 0.9,
      "usage_context": "when starting coaching sessions",
      "emotional_tone": "authoritative yet approachable",
      "authenticity_indicators": ["personal vulnerability", "professional experience"]
    }
  ]
}`

  try {
    const completion = await anthropic.messages.create({
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
    return parsed.patterns || []
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), title }, 'Failed to extract patterns')
    return []
  }
}

async function storeSegments(episodeId: string, segments: string[]): Promise<string[]> {
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

  if (error) throw error
  return data?.map(row => row.id) || []
}

async function storePatterns(segmentIds: string[], patterns: any[]): Promise<void> {
  if (!patterns.length || !segmentIds.length) return

  const patternData = patterns.map((pattern, index) => ({
    segment_id: segmentIds[index % segmentIds.length],
    pattern_type: pattern.pattern_type,
    pattern_text: pattern.pattern_text,
    confidence_score: pattern.confidence_score,
    usage_context: pattern.usage_context,
    emotional_tone: pattern.emotional_tone,
    authenticity_indicators: pattern.authenticity_indicators || []
  }))

  const { error } = await supabaseService.client
    .from('voice_patterns')
    .insert(patternData)

  if (error) throw error
}

// Run if called directly
if (require.main === module) {
  processWebinarVoiceData()
    .then(() => {
      logger.info('Webinar processing complete')
      process.exit(0)
    })
    .catch((error) => {
      logger.error({ error: error.message }, 'Webinar processing failed')
      process.exit(1)
    })
}

export { processWebinarVoiceData }