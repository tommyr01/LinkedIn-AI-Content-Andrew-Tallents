import { supabaseService } from './src/services/supabase';

async function testOpeningPatternDebug() {
  console.log('🔍 Debugging Opening Pattern Categorizer');
  console.log('========================================');
  
  // Test 1: Check what opening patterns exist in the database
  console.log('1. Checking opening patterns in voice_pattern_library...');
  try {
    const { data: patterns, error } = await supabaseService.client
      .from('voice_pattern_library')
      .select('id, pattern_type, pattern_text, frequency_score, effectiveness_score')
      .eq('pattern_type', 'opening')
      .limit(10);
    
    if (error) {
      console.error('❌ Query failed:', error);
    } else {
      console.log(`✅ Found ${patterns?.length || 0} opening patterns`);
      patterns?.forEach((p: any, i: number) => {
        console.log(`   ${i + 1}. "${p.pattern_text.substring(0, 80)}..." (freq: ${p.frequency_score}, eff: ${p.effectiveness_score})`);
      });
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
  
  // Test 2: Check all pattern types available
  console.log('\n2. Checking all pattern types available...');
  try {
    const { data: types, error } = await supabaseService.client
      .from('voice_pattern_library')
      .select('pattern_type')
      .order('pattern_type');
    
    if (error) {
      console.error('❌ Query failed:', error);
    } else {
      const uniqueTypes = [...new Set(types?.map((t: any) => t.pattern_type))];
      console.log(`✅ Available pattern types (${uniqueTypes.length}):`, uniqueTypes);
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
  
  // Test 3: Check voice_content_chunks for opening-related patterns
  console.log('\n3. Checking voice_content_chunks for opening patterns...');
  try {
    const { data: chunks, error } = await supabaseService.client
      .from('voice_content_chunks')
      .select('id, chunk_text, pattern_types, primary_topic')
      .contains('pattern_types', ['opening'])
      .limit(5);
    
    if (error) {
      console.error('❌ Query failed:', error);
    } else {
      console.log(`✅ Found ${chunks?.length || 0} chunks with opening patterns`);
      chunks?.forEach((c: any, i: number) => {
        console.log(`   ${i + 1}. "${c.chunk_text.substring(0, 60)}..." (patterns: ${JSON.stringify(c.pattern_types)})`);
      });
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
  
  // Test 4: Test the specific query that's failing in the categorizer
  console.log('\n4. Testing the specific categorizer pattern types...');
  const targetCategories = ['confrontational', 'question', 'story', 'observation', 'contrarian'];
  
  for (const category of targetCategories) {
    try {
      console.log(`\n   Testing category: ${category}`);
      
      // Test in voice_pattern_library
      const { data: patterns, error: patternsError } = await supabaseService.client
        .from('voice_pattern_library')
        .select('id, pattern_text, effectiveness_score')
        .eq('pattern_type', category)
        .limit(3);
      
      if (!patternsError) {
        console.log(`   ✅ voice_pattern_library: ${patterns?.length || 0} ${category} patterns`);
      } else {
        console.log(`   ❌ voice_pattern_library error:`, patternsError);
      }
      
      // Test in voice_content_chunks
      const { data: chunks, error: chunksError } = await supabaseService.client
        .from('voice_content_chunks')
        .select('id, chunk_text, pattern_types')
        .contains('pattern_types', [category])
        .limit(3);
      
      if (!chunksError) {
        console.log(`   ✅ voice_content_chunks: ${chunks?.length || 0} chunks with ${category} patterns`);
      } else {
        console.log(`   ❌ voice_content_chunks error:`, chunksError);
      }
      
    } catch (error) {
      console.error(`   💥 ${category} test failed:`, error);
    }
  }
  
  console.log('\n🎯 DIAGNOSIS COMPLETE');
  console.log('If no opening/confrontational patterns are found, the issue is:');
  console.log('1. Data processing categorized patterns differently than expected');
  console.log('2. Opening pattern categorizer is looking for wrong pattern names');
  console.log('3. The RAG system query logic has bugs');
}

testOpeningPatternDebug().catch(console.error);