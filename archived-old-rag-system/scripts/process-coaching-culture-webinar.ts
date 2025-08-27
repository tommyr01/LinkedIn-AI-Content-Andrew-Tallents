import { topicLabeledProcessor } from '../services/topic-labeled-processor'
import logger from '../lib/logger'

/**
 * Process the "Creating a Coaching Culture" webinar with topic labeling
 */
async function processCoachingCultureWebinar() {
  logger.info('🎯 Processing Coaching Culture webinar with topic labeling...')
  
  try {
    // Process the specific webinar
    await topicLabeledProcessor.processWebinarWithTopicLabels(
      'Creating a Coaching Culture',  // Webinar title to match
      'Coaching Culture',              // Topic label
      60                              // Target number of segments
    )

    // Test the topic-aware search
    logger.info('🔍 Testing topic-aware search...')
    
    const coachingResults = await topicLabeledProcessor.searchTopicSegments(
      'Coaching Culture',
      'team development coaching leadership culture building',
      5
    )

    logger.info(`Found ${coachingResults.length} coaching culture segments:`)
    coachingResults.forEach((result, index) => {
      logger.info(`${index + 1}. [${result.similarity.toFixed(3)}] Keywords: [${result.topic_keywords?.join(', ')}]`)
      logger.info(`   "${result.segment_text.substring(0, 150)}..."`)
      logger.info('')
    })

    logger.info('✅ Coaching Culture webinar processing complete!')
    logger.info('🎯 This webinar now has topic-labeled segments for precise RAG retrieval')

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error) 
    }, '❌ Failed to process coaching culture webinar')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  processCoachingCultureWebinar().then(() => {
    logger.info('Coaching culture processing complete')
    process.exit(0)
  })
}

export { processCoachingCultureWebinar }