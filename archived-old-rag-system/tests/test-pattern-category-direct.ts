import { supabaseService } from './src/services/supabase';

async function testPatternCategoryDirect() {
  console.log('🧪 Testing Pattern Category Queries Direct');
  console.log('==========================================');
  
  // Test each category mapping 
  const categoryMappings = {
    confrontational: ['challenge', 'authority', 'reframe'],
    question: ['question'],
    story: ['storytelling', 'vulnerability', 'empathy'],
    observation: ['data_presentation', 'analogy', 'teaching'],
    contrarian: ['reframe', 'challenge', 'authority']
  };
  
  for (const [category, patterns] of Object.entries(categoryMappings)) {
    console.log(`\n🔍 Testing ${category.toUpperCase()} patterns...`);
    console.log(`   Looking for patterns: [${patterns.join(', ')}]`);
    
    try {
      // Test the exact query from getChunksByPatternCategory
      let query = supabaseService.client
        .from('voice_content_chunks')
        .select(`
          id,
          chunk_text,
          authenticity_score,
          quality_score,
          episode_title,
          primary_topic,
          pattern_types,
          speaker,
          token_count
        `)
        .eq('speaker', 'andrew')
        .gte('authenticity_score', 60)
        .overlaps('pattern_types', patterns)
        .limit(5)
        .order('authenticity_score', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`❌ ${category} query failed:`, error);
      } else {
        console.log(`✅ ${category}: ${data?.length || 0} chunks found`);
        if (data && data.length > 0) {
          data.forEach((chunk: any, index: number) => {
            console.log(`   ${index + 1}. Auth: ${chunk.authenticity_score}, Pattern: ${JSON.stringify(chunk.pattern_types)}`);
            console.log(`      Text: "${chunk.chunk_text.substring(0, 80)}..."`);
          });
        }
      }
      
      // Also test without speaker and authenticity filters
      console.log(`   Testing ${category} without filters...`);
      const { data: unfiltered, error: unfilteredError } = await supabaseService.client
        .from('voice_content_chunks')
        .select('id, chunk_text, pattern_types, authenticity_score, speaker')
        .overlaps('pattern_types', patterns)
        .limit(3);
      
      if (!unfilteredError && unfiltered) {
        console.log(`   📊 Unfiltered ${category}: ${unfiltered.length} chunks`);
        unfiltered.forEach((chunk: any, index: number) => {
          console.log(`      ${index + 1}. Speaker: ${chunk.speaker}, Auth: ${chunk.authenticity_score || 'null'}`);
        });
      }
      
    } catch (error) {
      console.error(`💥 ${category} test failed:`, error);
    }
  }
  
  // Test general stats
  console.log('\n📈 General Database Statistics:');
  try {
    const { data: stats, error: statsError } = await supabaseService.client
      .from('voice_content_chunks')
      .select('speaker, authenticity_score, pattern_types')
      .limit(10);
    
    if (statsError) {
      console.error('❌ Stats query failed:', statsError);
    } else {
      console.log(`✅ Sample of ${stats?.length || 0} chunks:`);
      stats?.forEach((chunk: any, index: number) => {
        console.log(`   ${index + 1}. Speaker: ${chunk.speaker}, Auth: ${chunk.authenticity_score || 'null'}, Patterns: ${JSON.stringify(chunk.pattern_types)}`);
      });
      
      // Count by speaker
      const andrewChunks = stats?.filter(c => c.speaker === 'andrew').length || 0;
      const highAuthChunks = stats?.filter(c => (c.authenticity_score || 0) >= 60).length || 0;
      
      console.log(`📊 Andrew chunks: ${andrewChunks}/${stats?.length || 0}`);
      console.log(`📊 High auth (≥60): ${highAuthChunks}/${stats?.length || 0}`);
    }
  } catch (error) {
    console.error('💥 Stats test failed:', error);
  }
}

testPatternCategoryDirect().catch(console.error);