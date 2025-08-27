import { voiceRAGSystem } from './src/services/voice-rag-system';

async function debugVoiceChunksRetrieval() {
  console.log('🔍 Debugging Voice Chunks Retrieval');
  console.log('==================================');
  
  const topicKeywords = ['leadership', 'accountability'];
  const categories = ['confrontational', 'question', 'story', 'observation', 'contrarian'] as const;
  
  console.log(`📋 Testing with keywords: [${topicKeywords.join(', ')}]`);
  
  for (const category of categories) {
    console.log(`\n🎯 Testing ${category.toUpperCase()}:`);
    
    try {
      // Test direct method call
      const chunks = await voiceRAGSystem.getChunksByPatternCategory(
        category,
        topicKeywords,
        5
      );
      
      console.log(`   Direct call result: ${chunks.length} chunks`);
      
      if (chunks.length > 0) {
        chunks.forEach((chunk: any, index: number) => {
          console.log(`   ${index + 1}. ID: ${chunk.chunk_id || chunk.id}, Auth: ${chunk.authenticity_score}`);
          console.log(`      Text: "${chunk.chunk_text.substring(0, 60)}..."`);
          console.log(`      Patterns: ${JSON.stringify(chunk.pattern_types)}`);
        });
      } else {
        console.log('   ❌ No chunks returned - investigating...');
        
        // Test without topic filter
        const chunksNoTopic = await voiceRAGSystem.getChunksByPatternCategory(
          category,
          [], // No topic keywords
          5
        );
        console.log(`   Without topic filter: ${chunksNoTopic.length} chunks`);
      }
      
    } catch (error) {
      console.error(`   💥 Error testing ${category}:`, error);
    }
  }
  
  console.log('\n🎯 DIAGNOSIS:');
  console.log('If individual categories work but opening pattern categorizer fails,');
  console.log('the issue is likely in the pattern extraction or categorization logic.');
}

debugVoiceChunksRetrieval().catch(console.error);