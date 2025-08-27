#!/usr/bin/env tsx

import { voiceRAGSystem } from './src/services/voice-rag-system'
import logger from './src/lib/logger'

async function testRAGSystem() {
  console.log('🎯 Testing RAG system directly...')
  
  try {
    const result = await voiceRAGSystem.getVoiceContextForGeneration(
      'linkedin_post',
      ['self-leadership', 'accountability'],
      ['confrontational', 'teaching'],
      8, // maxChunks
      1  // contextWindow
    )

    console.log('✅ RAG Test Results:')
    console.log(`📊 Chunks retrieved: ${result.relevantChunks.length}`)
    console.log(`🎯 Patterns retrieved: ${result.relevantPatterns.length}`)
    console.log(`📈 Retrieval quality: ${result.retrievalQuality}`)
    console.log(`🎪 Content confidence: ${result.contentConfidence}`)
    console.log(`📚 Source episodes: ${result.sourceEpisodes.length}`)
    
    if (result.relevantChunks.length > 0) {
      console.log('\n🔍 First chunk preview:')
      console.log(result.relevantChunks[0].substring(0, 200) + '...')
    }
    
    if (result.relevantPatterns.length > 0) {
      console.log('\n🎭 First pattern:')
      console.log(`Type: ${result.relevantPatterns[0].pattern_type}`)
      console.log(`Text: ${result.relevantPatterns[0].pattern_text}`)
    }

  } catch (error) {
    console.error('❌ RAG system test failed:', error)
  }
}

testRAGSystem()