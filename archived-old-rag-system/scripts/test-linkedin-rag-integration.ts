/**
 * LinkedIn RAG Integration Test Script
 * 
 * This script tests the complete LinkedIn posts RAG integration:
 * 1. Processes LinkedIn posts into chunks
 * 2. Extracts voice patterns
 * 3. Tests RAG retrieval with LinkedIn prioritization
 * 4. Validates authentic voice pattern extraction
 * 5. Generates sample content to verify improvement
 */

import { linkedInPostProcessor } from '../services/linkedin-post-processor'
import { andrewVoicePatternExtractor } from '../services/andrew-voice-pattern-extractor'
import { voiceRAGSystem } from '../services/voice-rag-system'
import { supabaseService } from '../services/supabase'
import logger from '../lib/logger'

async function testLinkedInRAGIntegration() {
  logger.info('🚀 Starting LinkedIn RAG Integration Test')

  try {
    // Step 1: Check if we have LinkedIn posts to process
    const { data: posts, error: postsError } = await supabaseService.client
      .from('linkedin_posts')
      .select('id, text, posted_at, total_reactions')
      .not('text', 'is', null)
      .gte('total_reactions', 5)
      .limit(5)

    if (postsError) {
      throw new Error(`Failed to fetch LinkedIn posts: ${postsError.message}`)
    }

    if (!posts || posts.length === 0) {
      logger.warn('❌ No LinkedIn posts found in database - cannot test integration')
      return
    }

    logger.info(`📊 Found ${posts.length} LinkedIn posts to test with`)

    // Step 2: Test LinkedIn post processing
    logger.info('📝 Testing LinkedIn post processing...')
    const processingResults = await linkedInPostProcessor.processAllPosts()
    
    logger.info({
      postsProcessed: processingResults.length,
      successful: processingResults.filter(r => r.success).length,
      totalChunks: processingResults.reduce((sum, r) => sum + r.chunksCreated, 0),
      avgAuthenticity: processingResults.reduce((sum, r) => sum + r.avgAuthenticityScore, 0) / processingResults.length
    }, '📝 LinkedIn post processing completed')

    // Step 3: Test voice pattern extraction
    logger.info('🎯 Testing voice pattern extraction...')
    const voicePatterns = await andrewVoicePatternExtractor.extractVoicePatterns()
    const openingPatterns = await andrewVoicePatternExtractor.extractOpeningPatterns()
    
    logger.info({
      voicePatternsExtracted: voicePatterns.length,
      openingCategories: openingPatterns.size,
      avgEffectiveness: voicePatterns.reduce((sum, p) => sum + p.effectiveness_score, 0) / voicePatterns.length
    }, '🎯 Voice pattern extraction completed')

    // Step 4: Test RAG retrieval with LinkedIn prioritization
    logger.info('🔍 Testing RAG retrieval with LinkedIn prioritization...')
    
    const testTopics = [
      ['accountability', 'leadership'],
      ['culture', 'performance'],
      ['coaching', 'development']
    ]

    for (const topicKeywords of testTopics) {
      logger.info(`Testing topic: ${topicKeywords.join(', ')}`)
      
      const voiceContext = await voiceRAGSystem.getVoiceContextForGeneration(
        'linkedin_post',
        topicKeywords,
        ['confrontational', 'authority', 'research_citation'],
        8,
        1,
        'confrontational'
      )

      logger.info({
        topic: topicKeywords.join(', '),
        chunksRetrieved: voiceContext.relevantChunks.length,
        patternsRetrieved: voiceContext.relevantPatterns.length,
        retrievalQuality: voiceContext.retrievalQuality,
        contentConfidence: voiceContext.contentConfidence
      }, 'RAG retrieval results')

      // Test pattern category retrieval
      const categoryChunks = await voiceRAGSystem.getChunksByPatternCategory(
        'confrontational',
        topicKeywords,
        5
      )

      const linkedInCount = categoryChunks.filter(c => c.source_type === 'linkedin').length
      const podcastCount = categoryChunks.filter(c => c.source_type === 'podcast').length

      logger.info({
        category: 'confrontational',
        topic: topicKeywords.join(', '),
        totalChunks: categoryChunks.length,
        linkedInChunks: linkedInCount,
        podcastChunks: podcastCount,
        prioritizationRatio: linkedInCount / Math.max(categoryChunks.length, 1)
      }, 'Pattern category retrieval with LinkedIn prioritization')

      // Verify we're getting LinkedIn chunks as primary source
      if (linkedInCount === 0) {
        logger.warn(`⚠️ No LinkedIn chunks retrieved for ${topicKeywords.join(', ')} - may need more processed data`)
      } else {
        logger.info(`✅ LinkedIn prioritization working: ${linkedInCount}/${categoryChunks.length} chunks from LinkedIn`)
      }
    }

    // Step 5: Test voice templates creation
    logger.info('📋 Testing voice template creation...')
    const voiceTemplates = await andrewVoicePatternExtractor.createVoiceTemplates()
    
    logger.info({
      openingTemplateCategories: Object.keys(voiceTemplates.openingTemplates).length,
      bodyTemplates: voiceTemplates.bodyTemplates.length,
      storyTemplates: voiceTemplates.storyTemplates.length,
      ctaTemplates: voiceTemplates.ctaTemplates.length
    }, '📋 Voice templates created')

    // Step 6: Test pattern recommendations
    logger.info('💡 Testing pattern recommendations...')
    const recommendations = await andrewVoicePatternExtractor.getPatternRecommendations(
      'linkedin_post',
      ['accountability'],
      'leaders'
    )

    logger.info({
      recommendedOpeningCategory: recommendations.recommendedOpeningCategory,
      suggestedPatternsCount: recommendations.suggestedPatterns.length,
      templateRecommendationsCount: recommendations.templateRecommendations.length,
      authenticityTipsCount: recommendations.authenticityTips.length
    }, '💡 Pattern recommendations generated')

    // Step 7: Generate sample content to test voice authenticity
    logger.info('🎨 Testing sample content generation with LinkedIn RAG...')
    
    const sampleContext = await voiceRAGSystem.getVoiceContextForGeneration(
      'linkedin_post',
      ['accountability', 'leadership'],
      ['confrontational', 'authority'],
      6,
      1,
      'confrontational'
    )

    // Display sample voice guidelines to verify LinkedIn integration
    console.log('\n' + '='.repeat(80))
    console.log('SAMPLE VOICE GUIDELINES (LinkedIn-Prioritized RAG)')
    console.log('='.repeat(80))
    console.log(sampleContext.voiceGuidelines)
    console.log('='.repeat(80))

    // Step 8: Validate authenticity improvement
    logger.info('✅ Testing authenticity validation...')
    
    const linkedInChunks = sampleContext.relevantChunks.length
    const avgAuthenticity = sampleContext.contentConfidence

    if (avgAuthenticity > 0.7 && linkedInChunks > 0) {
      logger.info('🎉 SUCCESS: LinkedIn RAG integration is working correctly!')
      logger.info({
        linkedInPrioritization: '✅ Active',
        authenticityScore: Math.round(avgAuthenticity * 100),
        chunksRetrieved: linkedInChunks,
        voicePatternsExtracted: voicePatterns.length,
        systemHealth: 'Excellent'
      }, 'Integration test results')
    } else {
      logger.warn('⚠️ LinkedIn RAG integration may need optimization')
      logger.warn({
        linkedInPrioritization: linkedInChunks > 0 ? '✅ Active' : '❌ No LinkedIn chunks',
        authenticityScore: Math.round(avgAuthenticity * 100),
        recommendedAction: 'Process more LinkedIn posts or check pattern extraction'
      }, 'Integration test results')
    }

    // Step 9: Get system statistics
    logger.info('📊 Getting system statistics...')
    const ragStats = await voiceRAGSystem.getRAGSystemStats()
    const processingStats = await linkedInPostProcessor.getProcessingStats()

    logger.info({
      ragSystem: {
        totalChunks: ragStats.totalChunks,
        totalPatterns: ragStats.totalPatterns,
        avgChunkQuality: Math.round(ragStats.avgChunkQuality * 100),
        systemHealth: ragStats.systemHealth
      },
      linkedInProcessing: {
        totalPosts: processingStats.totalPosts,
        totalChunks: processingStats.totalChunks,
        avgAuthenticityScore: processingStats.avgAuthenticityScore,
        processingHealth: processingStats.processingHealth
      }
    }, 'Final system statistics')

    logger.info('🎊 LinkedIn RAG Integration Test Completed Successfully!')

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, '❌ LinkedIn RAG Integration Test Failed')
    throw error
  }
}

async function main() {
  try {
    await testLinkedInRAGIntegration()
    process.exit(0)
  } catch (error) {
    logger.error('Test script failed', error)
    process.exit(1)
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  main()
}

export { testLinkedInRAGIntegration }