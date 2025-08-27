import { embeddingGenerator } from '../services/embedding-generator'
import logger from '../lib/logger'

/**
 * Script to generate embeddings for all transcript segments
 * This enables semantic search for true RAG functionality
 */
async function generateEmbeddings() {
  logger.info('🔄 Starting embedding generation process...')
  
  try {
    // Check current status
    const stats = await embeddingGenerator.getEmbeddingStats()
    logger.info('📊 Current embedding status:', stats)

    if (stats.missingEmbeddings === 0) {
      logger.info('✅ All segments already have embeddings!')
      return
    }

    // Generate embeddings
    logger.info(`🚀 Generating embeddings for ${stats.missingEmbeddings} segments...`)
    await embeddingGenerator.generateAllEmbeddings()

    // Check final status
    const finalStats = await embeddingGenerator.getEmbeddingStats()
    logger.info('🎉 Final embedding status:', finalStats)

    // Test vector search
    logger.info('🔍 Testing vector search...')
    const testResults = await embeddingGenerator.findSimilarSegments(
      'leadership delegation trust team management',
      3
    )
    
    logger.info(`Found ${testResults.length} similar segments:`)
    testResults.forEach((result, index) => {
      logger.info(`${index + 1}. Similarity: ${result.similarity.toFixed(3)} - "${result.segment_text.substring(0, 100)}..."`)
    })

    logger.info('✅ Embedding generation and testing complete!')

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error) 
    }, '❌ Failed to generate embeddings')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  generateEmbeddings().then(() => {
    logger.info('Embedding generation complete')
    process.exit(0)
  })
}

export { generateEmbeddings }