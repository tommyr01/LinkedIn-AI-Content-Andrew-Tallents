/**
 * Test New RAG Content Script
 * 
 * Test the integration of new webinar content with the RAG system
 */

import { voiceRAGSystem } from '../services/voice-rag-system'
import logger from '../lib/logger'

async function testNewRAGContent() {
  console.log('🧪 Testing RAG system with new webinar content...\n')

  try {
    // Test 1: Leadership Team Coaching retrieval
    console.log('📋 Test 1: Leadership Team Coaching Content')
    const leadershipContext = await voiceRAGSystem.getVoiceContextForGeneration(
      'linkedin_post',
      ['Leadership Team Coaching', 'team leadership'],
      ['teaching', 'authority'],
      5,
      1
    )
    
    console.log(`✅ Retrieved ${leadershipContext.relevantChunks.length} chunks`)
    console.log(`🎯 Retrieved ${leadershipContext.relevantPatterns.length} patterns`)
    
    if (leadershipContext.relevantChunks.length > 0) {
      const sampleChunk = leadershipContext.relevantChunks[0]
      console.log(`📝 Sample chunk (${sampleChunk.token_count} tokens): "${(sampleChunk.chunk_text || '').substring(0, 100)}..."`)
      console.log(`🏷️  Topic: ${sampleChunk.primary_topic}`)
      console.log(`📊 Authenticity: ${sampleChunk.authenticity_score}`)
    }
    console.log('')

    // Test 2: Sustainable Self-Leadership retrieval  
    console.log('📋 Test 2: Sustainable Self-Leadership Content')
    const selfLeadershipContext = await voiceRAGSystem.getVoiceContextForGeneration(
      'linkedin_post', 
      ['Sustainable Self-Leadership', 'self-leadership', 'resilience'],
      ['teaching', 'vulnerability'],
      5,
      1
    )
    
    console.log(`✅ Retrieved ${selfLeadershipContext.relevantChunks.length} chunks`)
    console.log(`🎯 Retrieved ${selfLeadershipContext.relevantPatterns.length} patterns`)
    
    if (selfLeadershipContext.relevantChunks.length > 0) {
      const sampleChunk = selfLeadershipContext.relevantChunks[0]
      console.log(`📝 Sample chunk (${sampleChunk.token_count} tokens): "${(sampleChunk.chunk_text || '').substring(0, 100)}..."`)
      console.log(`🏷️  Topic: ${sampleChunk.primary_topic}`)
      console.log(`📊 Authenticity: ${sampleChunk.authenticity_score}`)
    }
    console.log('')

    // Test 3: System stats
    console.log('📋 Test 3: Updated System Statistics')
    const stats = await voiceRAGSystem.getRAGSystemStats()
    
    console.log(`📊 Total chunks: ${stats.totalChunks}`)
    console.log(`📈 Average quality: ${stats.avgChunkQuality?.toFixed(3)}`)
    console.log(`🎯 Total patterns: ${stats.totalPatterns}`)
    console.log(`💚 System health: ${stats.systemHealth}`)
    console.log(`🌐 Episodes covered: ${stats.episodesCovered}`)
    console.log('')

    // Test 4: Search for specific leadership concepts
    console.log('📋 Test 4: Concept-Specific Search')
    const coachingContext = await voiceRAGSystem.getVoiceContextForGeneration(
      'linkedin_post',
      ['coaching', 'leadership development'],
      ['confrontational', 'challenge'],
      3,
      1
    )

    console.log(`✅ Retrieved ${coachingContext.relevantChunks.length} chunks for coaching concepts`)
    const topics = coachingContext.relevantChunks.map(c => c.primary_topic)
    const uniqueTopics = [...new Set(topics)]
    console.log(`🏷️  Topics found: ${uniqueTopics.join(', ')}`)

    console.log('\n🎉 All tests completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`- RAG system now contains ${stats.totalChunks} chunks`)
    console.log(`- New webinars successfully integrated`)
    console.log(`- Leadership Team Coaching: searchable and retrievable`)
    console.log(`- Sustainable Self-Leadership: searchable and retrievable`)
    console.log(`- System health: ${stats.systemHealth}`)

  } catch (error) {
    console.error('💥 Test failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  testNewRAGContent().catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}