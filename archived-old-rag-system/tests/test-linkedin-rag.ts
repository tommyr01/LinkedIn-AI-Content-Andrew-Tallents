#!/usr/bin/env tsx

import { VoiceRAGSystem } from './src/services/voice-rag-system.js';
import { supabaseService } from './src/services/supabase.js';

async function testLinkedInRAG() {
  console.log('🔥 TESTING LINKEDIN-FIRST RAG SYSTEM');
  console.log('=====================================\n');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const { data, error } = await supabaseService.client
      .from('linkedin_post_chunks')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    console.log(`✅ Found ${data?.length || 0} LinkedIn post chunks in database`);

    // Test RAG system
    console.log('\n🧠 Testing RAG voice context generation...');
    const ragSystem = new VoiceRAGSystem();
    
    const context = await ragSystem.getVoiceContextForGeneration(
      'linkedin_post',
      ['leadership', 'accountability'],
      ['confrontational', 'question', 'storytelling'],
      8
    );

    console.log('\n📊 RAG Results:');
    console.log(`- Relevant chunks: ${context.relevantChunks.length}`);
    console.log(`- Voice guidelines length: ${context.voiceGuidelines.length} chars`);
    console.log(`- Source episodes: ${context.sourceEpisodes.length}`);
    console.log(`- Retrieval quality: ${context.retrievalQuality}`);
    console.log(`- Content confidence: ${context.contentConfidence}`);

    console.log('\n🎯 Sample Voice Patterns Retrieved:');
    context.relevantChunks.slice(0, 3).forEach((chunk, i) => {
      const preview = chunk.length > 100 ? chunk.substring(0, 100) + '...' : chunk;
      console.log(`${i + 1}. "${preview}"`);
    });

    console.log('\n📝 Voice Guidelines Sample:');
    const guidelines = context.voiceGuidelines.substring(0, 300) + '...';
    console.log(guidelines);

    console.log('\n✅ LinkedIn-first RAG test completed successfully!');
    console.log('🎉 System now has access to Andrew\'s authentic LinkedIn voice patterns');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLinkedInRAG();