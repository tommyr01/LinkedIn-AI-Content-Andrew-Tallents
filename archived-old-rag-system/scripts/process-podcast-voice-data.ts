import { podcastVoiceProcessor } from '../services/podcast-voice-processor'
import logger from '../lib/logger'

/**
 * Script to process podcast transcripts and extract Andrew's voice patterns
 * This will populate the transcript_segments and voice_patterns tables
 */
async function processPodcastVoiceData() {
  logger.info('Starting podcast voice data processing...')
  
  try {
    await podcastVoiceProcessor.processAllEpisodes()
    logger.info('✅ Successfully processed all podcast episodes')
    
    // Test retrieval
    const patterns = await podcastVoiceProcessor.getVoicePatternsForGeneration(['confrontational', 'opening'])
    logger.info(`Found ${patterns.length} voice patterns for testing`)
    
    const segments = await podcastVoiceProcessor.getRandomAndrewSegments(5)
    logger.info(`Retrieved ${segments.length} random Andrew segments for testing`)
    
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error) 
    }, '❌ Failed to process podcast voice data')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  processPodcastVoiceData().then(() => {
    logger.info('Processing complete')
    process.exit(0)
  })
}

export { processPodcastVoiceData }