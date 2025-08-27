import { supabaseService } from '../services/supabase'
import logger from '../lib/logger'

async function testVoiceData() {
  logger.info('Testing voice data availability...')

  try {
    // Check transcript segments
    const { data: segments, error: segError } = await supabaseService.client
      .from('transcript_segments')
      .select('id, speaker, segment_text, word_count')
      .eq('speaker', 'andrew')
      .limit(5)

    if (segError) throw segError

    console.log(`\n📊 ANDREW TRANSCRIPT SEGMENTS: ${segments?.length || 0} found`)
    segments?.forEach((seg, i) => {
      console.log(`${i + 1}. ${seg.segment_text.substring(0, 100)}... (${seg.word_count} words)`)
    })

    // Check voice patterns
    const { data: patterns, error: patError } = await supabaseService.client
      .from('voice_patterns')
      .select('id, pattern_type, pattern_text, confidence_score, emotional_tone')
      .limit(10)

    if (patError) throw patError

    console.log(`\n🎯 VOICE PATTERNS: ${patterns?.length || 0} found`)
    patterns?.forEach((pat, i) => {
      console.log(`${i + 1}. [${pat.pattern_type}] ${pat.pattern_text.substring(0, 80)}... (${pat.confidence_score} confidence, ${pat.emotional_tone})`)
    })

    // Get pattern type counts
    const { data: patternTypes, error: typeError } = await supabaseService.client
      .from('voice_patterns')
      .select('pattern_type')
      .neq('pattern_type', null)

    if (typeError) throw typeError

    const typeCounts = patternTypes?.reduce((acc: Record<string, number>, p) => {
      acc[p.pattern_type] = (acc[p.pattern_type] || 0) + 1
      return acc
    }, {})

    console.log('\n📋 PATTERN TYPE BREAKDOWN:', typeCounts)

    logger.info('Voice data test completed successfully')
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to test voice data')
  }
}

// Run if called directly
if (require.main === module) {
  testVoiceData()
}

export { testVoiceData }