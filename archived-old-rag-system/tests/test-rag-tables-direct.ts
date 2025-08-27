import { supabaseService } from './src/services/supabase';

async function testRagTablesDirect() {
  console.log('🧪 Testing RAG Tables Direct Access');
  console.log('===================================');
  
  // Test voice_content_chunks
  console.log('1. Testing voice_content_chunks...');
  try {
    const { data: chunks, error: chunksError } = await supabaseService.client
      .from('voice_content_chunks')
      .select('id, chunk_text, pattern_types, primary_topic')
      .limit(3);
    
    if (chunksError) {
      console.error('❌ voice_content_chunks failed:', chunksError);
    } else {
      console.log(`✅ voice_content_chunks exists with ${chunks?.length || 0} records`);
      if (chunks && chunks.length > 0) {
        chunks.forEach((chunk: any, index: number) => {
          console.log(`   ${index + 1}. Topic: ${chunk.primary_topic}, Patterns: ${JSON.stringify(chunk.pattern_types)}`);
        });
      }
    }
  } catch (error) {
    console.error('💥 voice_content_chunks error:', error);
  }
  
  // Test voice_pattern_library
  console.log('\n2. Testing voice_pattern_library...');
  try {
    const { data: patterns, error: patternsError } = await supabaseService.client
      .from('voice_pattern_library')
      .select('id, pattern_type, pattern_text')
      .limit(3);
    
    if (patternsError) {
      console.error('❌ voice_pattern_library failed:', patternsError);
    } else {
      console.log(`✅ voice_pattern_library exists with ${patterns?.length || 0} records`);
      if (patterns && patterns.length > 0) {
        patterns.forEach((pattern: any, index: number) => {
          console.log(`   ${index + 1}. Type: ${pattern.pattern_type}, Text: ${pattern.pattern_text.substring(0, 50)}...`);
        });
      }
    }
  } catch (error) {
    console.error('💥 voice_pattern_library error:', error);
  }
  
  // Try to find all tables that contain 'voice' or 'chunk'
  console.log('\n3. Searching for voice/chunk-related tables...');
  const tableNames = [
    'voice_content_chunks', 'voice_pattern_library', 'voice_learning_chunks',
    'voice_chunks', 'voice_data', 'voice_learning_data', 'chunks',
    'rag_chunks', 'andrew_voice', 'podcast_chunks'
  ];
  
  for (const tableName of tableNames) {
    try {
      const { data, error } = await supabaseService.client
        .from(tableName)
        .select('count')
        .limit(1);
      
      if (!error) {
        const { count } = await supabaseService.client
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        console.log(`✅ ${tableName}: ${count || 0} records`);
      }
    } catch (err) {
      // Ignore - table doesn't exist
    }
  }
  
  console.log('\n4. DIAGNOSIS:');
  console.log('If voice_content_chunks and voice_pattern_library don\'t exist,');
  console.log('then the RAG migration failed and we need to process podcast data differently.');
}

testRagTablesDirect().catch(console.error);