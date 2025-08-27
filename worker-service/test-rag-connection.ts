/**
 * Test RAG Connection - Simple test to verify LinkedIn app can connect to RAG system
 * 
 * This script tests:
 * 1. RAG API client connection
 * 2. Voice learning service integration
 * 3. Content generation with RAG data
 */

import { ragClient } from './src/services/rag-client'
import { voiceLearningEnhanced } from './src/services/voice-learning-enhanced'

async function testRAGConnection() {
  console.log('🔍 Testing RAG Connection...\n')

  // Test 1: RAG API Health Check
  console.log('1. Testing RAG API health...')
  const isHealthy = await ragClient.healthCheck()
  console.log(`   Health Status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`)

  // Test 2: Get RAG Stats
  console.log('\n2. Getting RAG system stats...')
  const stats = await ragClient.getStats()
  if (stats) {
    console.log(`   Total Chunks: ${stats.total_chunks}`)
    console.log(`   Service Status: ${stats.service_status}`)
  } else {
    console.log('   ❌ Could not get stats')
  }

  // Test 3: Simple RAG Search
  console.log('\n3. Testing RAG search...')
  const searchResults = await ragClient.searchVoiceChunks('leadership development', 5, 0.6)
  console.log(`   Search Results: ${searchResults.length} chunks found`)
  
  if (searchResults.length > 0) {
    console.log(`   Sample Result:`)
    console.log(`   - Title: ${searchResults[0].document_title}`)
    console.log(`   - Similarity: ${searchResults[0].similarity_score}`)
    console.log(`   - Content Preview: ${searchResults[0].content.substring(0, 100)}...`)
  }

  // Test 4: Voice Learning Service Integration
  console.log('\n4. Testing voice learning service integration...')
  try {
    const voiceStats = await voiceLearningEnhanced.getVoiceLearningStats()
    console.log(`   Voice Stats Retrieved: ✅`)
    console.log(`   - Total Segments: ${voiceStats.totalSegments}`)
    console.log(`   - Avg Confidence: ${voiceStats.avgConfidenceScore}`)
    console.log(`   - Service Health: ${voiceStats.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`)
  } catch (error) {
    console.log(`   ❌ Voice stats error: ${error}`)
  }

  // Test 5: Voice Context Generation
  console.log('\n5. Testing voice context generation...')
  try {
    const voiceContext = await voiceLearningEnhanced.getVoiceContextForGeneration(
      'post',
      ['leadership', 'team building'],
      ['authenticity', 'engagement']
    )
    
    console.log(`   Voice Context Generated: ✅`)
    console.log(`   - Authenticity Score: ${Math.round(voiceContext.authenticity_score * 100)}%`)
    console.log(`   - Confidence Level: ${Math.round(voiceContext.confidence_level * 100)}%`)
    console.log(`   - Authenticity Boosts: ${voiceContext.authenticityBoosts.length}`)
    console.log(`   - Voice Patterns: ${voiceContext.voicePatterns.length}`)
    console.log(`   - Similar Content: ${voiceContext.similarContent.length}`)
  } catch (error) {
    console.log(`   ❌ Voice context error: ${error}`)
  }

  // Test 6: Content Enhancement
  console.log('\n6. Testing content enhancement...')
  try {
    const testContent = "Leadership is about making tough decisions and guiding your team forward."
    
    const enhancement = await voiceLearningEnhanced.enhanceVoiceForContent(
      testContent, 
      'leadership development',
      'test-job-123'
    )
    
    console.log(`   Content Enhancement: ${enhancement.success ? '✅ Success' : '❌ Failed'}`)
    console.log(`   - Voice Score: ${enhancement.voiceScore}%`)
    console.log(`   - Improvements: ${enhancement.improvements.length}`)
    console.log(`   - Applied Patterns: ${enhancement.appliedPatterns.length}`)
    console.log(`   - Enhancement Preview: ${enhancement.enhancedContent.substring(0, 100)}...`)
  } catch (error) {
    console.log(`   ❌ Enhancement error: ${error}`)
  }

  console.log('\n🎉 RAG Connection Test Complete!')
}

// Run the test
testRAGConnection().catch(console.error)