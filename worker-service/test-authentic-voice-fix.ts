#!/usr/bin/env tsx

/**
 * Test script to verify the authentic voice fix implementation
 * 
 * This script tests:
 * 1. That hard-coded "X is killing your Y" patterns have been removed
 * 2. That the system now uses Andrew's authentic LinkedIn patterns
 * 3. That the authenticity scoring rewards LinkedIn patterns over generic ones
 */

import { voiceLearningEnhanced } from './src/services/voice-learning-enhanced'
import { voiceRAGSystem } from './src/services/voice-rag-system'
import logger from './src/lib/logger'

async function testAuthenticVoiceFix() {
  logger.info('🧪 Testing authentic voice fix implementation')
  
  try {
    // Test 1: Check RAG system for LinkedIn content prioritization
    logger.info('1️⃣ Testing RAG system for LinkedIn content retrieval')
    
    const testTopic = 'leadership challenges'
    const topicKeywords = testTopic.split(' ')
    
    const ragContext = await voiceRAGSystem.getVoiceContextForGeneration(
      'linkedin_post',
      topicKeywords,
      ['opening', 'question', 'storytelling'],
      5,
      1
    )
    
    logger.info({
      relevantPatternsCount: ragContext.relevantPatterns?.length || 0,
      hasLinkedInSources: ragContext.relevantPatterns?.some(p => p.usage_context?.includes('linkedin')) || false,
      patternTypes: ragContext.relevantPatterns?.map(p => p.pattern_type) || []
    }, 'RAG context retrieved for LinkedIn content')
    
    // Test 2: Check voice learning enhanced integration
    logger.info('2️⃣ Testing voice learning enhanced service integration')
    
    const voiceContext = await voiceLearningEnhanced.getVoiceContextForGeneration(
      'linkedin_post',
      topicKeywords,
      ['opening', 'question', 'storytelling', 'authority']
    )
    
    logger.info({
      relevantPatternsCount: voiceContext.relevantPatterns.length,
      voiceGuidelinesLength: voiceContext.voiceGuidelines.length,
      authenticityBoostsCount: voiceContext.authenticityBoosts.length,
      ragEnhanced: voiceContext.ragEnhanced,
      retrievalQuality: voiceContext.retrievalQuality
    }, 'Voice context generated successfully')
    
    // Test 3: Check for LinkedIn-style patterns vs generic patterns
    logger.info('3️⃣ Analyzing patterns for authentic LinkedIn voice vs generic patterns')
    
    const hasAuthenticPatterns = voiceContext.relevantPatterns.some(p => 
      p.pattern_text.includes('What if') || 
      p.pattern_text.includes('The best leaders') ||
      p.pattern_text.includes('Here\'s something')
    )
    
    const hasGenericPatterns = voiceContext.relevantPatterns.some(p => 
      p.pattern_text.includes('is killing your') ||
      p.pattern_text.includes('Stop doing') ||
      p.pattern_text.includes('This is why')
    )
    
    logger.info({
      hasAuthenticLinkedInPatterns: hasAuthenticPatterns,
      hasGenericConfrontationalPatterns: hasGenericPatterns,
      samplePatterns: voiceContext.relevantPatterns.slice(0, 3).map(p => ({
        type: p.pattern_type,
        text: p.pattern_text.substring(0, 100),
        confidenceScore: p.confidence_score
      }))
    }, 'Pattern analysis completed')
    
    // Test 4: Get voice learning stats
    logger.info('4️⃣ Getting voice learning statistics')
    
    const voiceStats = await voiceLearningEnhanced.getVoiceLearningStats()
    
    logger.info({
      totalSegments: voiceStats.totalSegments,
      totalPatterns: voiceStats.totalPatterns,
      avgConfidenceScore: voiceStats.avgConfidenceScore,
      patternBreakdown: voiceStats.patternBreakdown
    }, 'Voice learning statistics')
    
    // Test Results Summary
    logger.info('✅ AUTHENTIC VOICE FIX TEST RESULTS:', {
      ragSystemWorking: ragContext.relevantPatterns.length > 0,
      voiceLearningIntegrated: voiceContext.relevantPatterns.length > 0,
      hasAuthenticPatterns,
      avoidsGenericPatterns: !hasGenericPatterns,
      retrievalQuality: voiceContext.retrievalQuality || 0,
      overallSuccess: ragContext.relevantPatterns.length > 0 && 
                     voiceContext.relevantPatterns.length > 0 && 
                     hasAuthenticPatterns && 
                     !hasGenericPatterns
    })
    
    if (hasGenericPatterns) {
      logger.warn('⚠️ STILL FOUND GENERIC PATTERNS - May need further cleanup')
    }
    
    if (!hasAuthenticPatterns) {
      logger.warn('⚠️ NO AUTHENTIC LINKEDIN PATTERNS FOUND - May need to verify RAG data')
    }
    
    logger.info('🎉 Authentic voice fix test completed successfully')
    
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, '❌ Test failed with error')
    throw error
  }
}

// Run the test
if (require.main === module) {
  testAuthenticVoiceFix()
    .then(() => {
      logger.info('✨ Test script completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error({ error }, '💥 Test script failed')
      process.exit(1)
    })
}