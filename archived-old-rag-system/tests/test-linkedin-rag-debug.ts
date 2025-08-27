#!/usr/bin/env tsx
/**
 * Debug script to test the LinkedIn RAG system and identify where content is being lost
 */

import { supabaseService } from './src/services/supabase'
import logger from './src/lib/logger'

async function testLinkedInRAG() {
  console.log('🔍 Testing LinkedIn RAG System - Debug Mode')
  
  try {
    // Step 1: Test direct SQL query
    console.log('\n1. Testing direct SQL query...')
    const { data: directSqlResults, error: sqlError } = await supabaseService.client
      .from('linkedin_post_chunks')
      .select('id, chunk_text, chunk_type, authenticity_score')
      .limit(3)
      
    if (sqlError) {
      console.error('❌ Direct SQL Error:', sqlError)
      return
    }
    
    console.log('✅ Direct SQL Results:')
    directSqlResults?.forEach((chunk, i) => {
      console.log(`   ${i + 1}. chunk_text: "${chunk.chunk_text?.substring(0, 50)}..."`)
      console.log(`      chunk_type: ${chunk.chunk_type}`)
      console.log(`      authenticity_score: ${chunk.authenticity_score}`)
      console.log('')
    })

    // Step 2: Test the RPC function call
    console.log('\n2. Testing RPC function call...')
    
    // Get an actual embedding from the database
    const { data: embeddingData, error: embError } = await supabaseService.client
      .from('linkedin_post_chunks')
      .select('embedding')
      .not('embedding', 'is', null)
      .limit(1)
      
    if (embError || !embeddingData?.[0]?.embedding) {
      console.error('❌ Could not get embedding:', embError)
      return
    }
    
    const testEmbedding = embeddingData[0].embedding
    console.log(`   Using embedding vector (length: ${testEmbedding.length})`)
    
    // Call the RPC function
    const { data: rpcResults, error: rpcError } = await supabaseService.client
      .rpc('match_linkedin_post_chunks', {
        query_embedding: testEmbedding,
        chunk_types_filter: null,
        pattern_types_filter: null,
        similarity_threshold: 0.4,
        max_chunks: 3,
        min_authenticity_score: 50
      })
      
    if (rpcError) {
      console.error('❌ RPC Error:', rpcError)
      return
    }
    
    console.log('✅ RPC Function Results:')
    console.log(`   Found ${rpcResults?.length || 0} chunks`)
    
    rpcResults?.forEach((chunk: any, i: number) => {
      console.log(`   ${i + 1}. chunk_id: ${chunk.chunk_id}`)
      console.log(`      chunk_text: "${chunk.chunk_text?.substring(0, 50) || 'UNDEFINED/EMPTY'}..."`)
      console.log(`      chunk_type: ${chunk.chunk_type || 'UNDEFINED'}`)
      console.log(`      similarity_score: ${chunk.similarity_score}`)
      console.log(`      authenticity_score: ${chunk.authenticity_score}`)
      console.log('')
    })
    
    // Step 3: Check if content field is actually populated
    console.log('\n3. Analyzing field contents...')
    rpcResults?.forEach((chunk: any, i: number) => {
      console.log(`   Chunk ${i + 1}:`)
      console.log(`      chunk_text type: ${typeof chunk.chunk_text}`)
      console.log(`      chunk_text length: ${chunk.chunk_text?.length || 0}`)
      console.log(`      chunk_text value: ${JSON.stringify(chunk.chunk_text)}`)
      console.log('')
    })
    
    // Step 4: Test the voice RAG system integration
    console.log('\n4. Testing voice RAG system integration...')
    
    const { voiceRAGSystem } = await import('./src/services/voice-rag-system')
    
    const voiceContext = await voiceRAGSystem.getVoiceContextForGeneration(
      'linkedin_post',
      ['leadership'],
      ['confrontational'],
      5
    )
    
    console.log('✅ Voice RAG System Results:')
    console.log(`   relevantChunks count: ${voiceContext.relevantChunks.length}`)
    console.log(`   contentConfidence: ${voiceContext.contentConfidence}`)
    console.log('')
    
    voiceContext.relevantChunks.forEach((chunkText: string, i: number) => {
      console.log(`   Chunk ${i + 1}: "${chunkText?.substring(0, 50) || 'UNDEFINED/EMPTY'}..."`)
      console.log(`      Length: ${chunkText?.length || 0}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testLinkedInRAG()
  .then(() => {
    console.log('🎉 Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test failed:', error)
    process.exit(1)
  })