import { supabaseService } from './src/services/supabase';
import { logger } from './src/lib/logger';

async function testDatabaseConnection() {
  try {
    console.log('🧪 Testing Database Connection');
    console.log('===============================');
    
    // Test basic connection - first check what tables exist
    console.log('🔍 Checking available tables...');
    
    const { data: tables, error: tablesError } = await supabaseService.client
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('❌ Failed to list tables:', tablesError);
      console.log('Trying alternative approach...');
      
      // Try comprehensive table search for voice/RAG data
      const potentialTables = [
        'voice_chunks', 'andrew_voice_chunks', 'rag_voice_chunks', 'podcast_chunks', 
        'voice_learning_data', 'voice_learning_chunks', 'rag_chunks', 'chunks',
        'voice_data', 'podcast_episodes', 'webinar_chunks', 'andrew_posts'
      ];
      
      const foundTables: any[] = [];
      
      for (const tableName of potentialTables) {
        try {
          const { data: testData, error: testError } = await supabaseService.client
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!testError && testData !== null) {
            console.log(`✅ Found table: ${tableName}`);
            
            // Get total count
            const { count } = await supabaseService.client
              .from(tableName)
              .select('*', { count: 'exact', head: true });
            
            console.log(`📊 Total records: ${count || 0}`);
            
            if (testData && testData.length > 0) {
              const firstRecord = testData[0];
              const columns = Object.keys(firstRecord);
              console.log(`🔍 Available columns: [${columns.slice(0, 8).join(', ')}${columns.length > 8 ? '...' : ''}]`);
              
              foundTables.push({
                name: tableName,
                count: count || 0,
                columns,
                hasPatterns: columns.some(col => col.includes('pattern') || col.includes('opening')),
                hasVoice: columns.some(col => col.includes('voice') || col.includes('tone') || col.includes('style')),
                hasText: columns.some(col => col.includes('text') || col.includes('content') || col.includes('chunk'))
              });
              
              if (foundTables[foundTables.length - 1].hasPatterns) {
                console.log('🎯 This table has pattern columns!');
              }
            }
            console.log('');
          }
        } catch (err) {
          // Ignore tables that don't exist
        }
      }
      
      if (foundTables.length === 0) {
        console.log('❌ No voice/content tables found');
        return false;
      }
      
      // Summary
      console.log('📈 SUMMARY OF FOUND TABLES:');
      console.log('=====================================');
      foundTables.forEach(table => {
        console.log(`Table: ${table.name}`);
        console.log(`   Records: ${table.count}`);
        console.log(`   Has Patterns: ${table.hasPatterns ? '✅' : '❌'}`);
        console.log(`   Has Voice Data: ${table.hasVoice ? '✅' : '❌'}`);
        console.log(`   Has Text Content: ${table.hasText ? '✅' : '❌'}`);
        console.log('');
      });
      
      return false;
    }
    
    console.log('📋 Available tables:');
    if (tables && tables.length > 0) {
      tables.forEach((table: any) => {
        console.log(`   - ${table.table_name}`);
      });
    }
    
    // Check if voice_learning_chunks exists
    const hasVoiceChunks = tables?.some((table: any) => 
      table.table_name.includes('voice') || 
      table.table_name.includes('chunk') ||
      table.table_name.includes('rag')
    );
    
    if (!hasVoiceChunks) {
      console.log('❌ No voice/chunk tables found in database');
      return false;
    }
    
    // Test the actual RAG tables
    console.log('🔍 Testing RAG tables...');
    
    const { data: chunks, error: chunksError } = await supabaseService.client
      .from('voice_content_chunks')
      .select('id, chunk_text, pattern_types, primary_topic')
      .limit(5);
    
    if (chunksError) {
      console.error('❌ voice_content_chunks query failed:', chunksError);
    } else {
      console.log(`📊 voice_content_chunks: ${chunks?.length || 0} records`);
      if (chunks && chunks.length > 0) {
        chunks.forEach((chunk: any, index: number) => {
          console.log(`   ${index + 1}. Topic: ${chunk.primary_topic}, Patterns: ${JSON.stringify(chunk.pattern_types)}`);
        });
      } else {
        console.log('⚠️  voice_content_chunks table is empty - this is the problem!');
      }
    }
    
    const { data: patterns, error: patternsError } = await supabaseService.client
      .from('voice_pattern_library')
      .select('id, pattern_type, pattern_text')
      .limit(5);
    
    if (patternsError) {
      console.error('❌ voice_pattern_library query failed:', patternsError);
    } else {
      console.log(`📊 voice_pattern_library: ${patterns?.length || 0} records`);
      if (patterns && patterns.length > 0) {
        patterns.forEach((pattern: any, index: number) => {
          console.log(`   ${index + 1}. Type: ${pattern.pattern_type}, Text: ${pattern.pattern_text.substring(0, 50)}...`);
        });
      } else {
        console.log('⚠️  voice_pattern_library table is empty - this is also a problem!');
      }
    }
    
    return true;
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return false;
  }
}

testDatabaseConnection()
  .then(success => {
    if (success) {
      console.log('\n🎉 Database connection test PASSED');
    } else {
      console.log('\n🔴 Database connection test FAILED');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });