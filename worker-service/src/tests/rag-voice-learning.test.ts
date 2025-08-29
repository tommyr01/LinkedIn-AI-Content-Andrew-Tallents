/**
 * RAG Voice Learning Integration Tests
 * 
 * Comprehensive test suite for Phase 1 RAG integration including:
 * - Voice chunk retrieval and similarity search
 * - Voice learning service functionality
 * - Content generation pipeline integration
 * - Performance analytics and caching
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { voiceLearningEnhanced } from '../services/voice-learning-enhanced'
import { supabaseService } from '../services/supabase'
import { appConfig } from '../config'
import crypto from 'crypto'

describe('RAG Voice Learning Integration', () => {
  let supabase: any
  let testJobId: string
  let testChunkIds: string[] = []

  beforeAll(async () => {
    // Initialize test environment
    supabase = createClient(appConfig.supabase.url, appConfig.supabase.serviceKey)
    testJobId = `test-${crypto.randomUUID()}`
    
    // Verify RAG tables exist
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['voice_chunks', 'voice_learning_context', 'voice_pattern_cache'])

    expect(tables?.length).toBeGreaterThanOrEqual(3)
  })

  afterAll(async () => {
    // Cleanup test data
    if (testChunkIds.length > 0) {
      await supabase
        .from('voice_chunks')
        .delete()
        .in('id', testChunkIds)
    }

    await supabase
      .from('voice_learning_context')
      .delete()
      .eq('job_id', testJobId)

    await supabase
      .from('voice_pattern_cache')
      .delete()
      .like('query_topic', '%test%')
  })

  describe('Database Schema and Migration', () => {
    it('should have voice_chunks table with correct structure', async () => {
      const { data: columns } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'voice_chunks')
        .order('ordinal_position')

      const expectedColumns = [
        'id', 'document_id', 'document_title', 'document_source', 'content',
        'chunk_index', 'token_count', 'embedding', 'metadata', 'voice_pattern_type',
        'emotional_tone', 'confidence_score', 'usage_count', 'last_used_at',
        'effectiveness_score', 'created_at', 'updated_at'
      ]

      const actualColumns = columns?.map((col: any) => col.column_name) || []
      expectedColumns.forEach(col => {
        expect(actualColumns).toContain(col)
      })
    })

    it('should have vector extension enabled', async () => {
      const { data } = await supabase
        .from('pg_extension')
        .select('extname')
        .eq('extname', 'vector')

      expect(data?.length).toBeGreaterThan(0)
    })

    it('should have search_voice_chunks function available', async () => {
      const { data } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'search_voice_chunks')

      expect(data?.length).toBeGreaterThan(0)
    })

    it('should have proper indexes created', async () => {
      const { data: indexes } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', 'voice_chunks')

      const indexNames = indexes?.map((idx: any) => idx.indexname) || []
      expect(indexNames.some(name => name.includes('embedding'))).toBe(true)
      expect(indexNames.some(name => name.includes('pattern_type'))).toBe(true)
    })
  })

  describe('Voice Chunks Data Import', () => {
    it('should verify voice chunks exist in database', async () => {
      const { count } = await supabase
        .from('voice_chunks')
        .select('id', { count: 'exact', head: true })

      expect(count).toBeGreaterThan(800) // Should have most of the 915 chunks
    })

    it('should have voice pattern classifications', async () => {
      const { data: patternStats } = await supabase
        .from('voice_chunks')
        .select('voice_pattern_type')
        .not('voice_pattern_type', 'is', null)
        .limit(100)

      const patterns = new Set(patternStats?.map((chunk: any) => chunk.voice_pattern_type))
      expect(patterns.size).toBeGreaterThan(3) // Should have multiple pattern types
    })

    it('should have embeddings populated', async () => {
      const { data: chunksWithEmbeddings } = await supabase
        .from('voice_chunks')
        .select('id, embedding')
        .not('embedding', 'is', null)
        .limit(10)

      expect(chunksWithEmbeddings?.length).toBeGreaterThan(0)
      // Check embedding is proper vector format
      if (chunksWithEmbeddings && chunksWithEmbeddings[0]) {
        const embedding = chunksWithEmbeddings[0].embedding
        expect(embedding).toBeDefined()
      }
    })
  })

  describe('Voice Learning Enhanced Service', () => {
    it('should get voice learning statistics', async () => {
      const stats = await voiceLearningEnhanced.getVoiceLearningStats()
      
      expect(stats).toBeDefined()
      expect(stats.totalSegments).toBeGreaterThan(0)
      expect(stats.avgConfidenceScore).toBeGreaterThan(0)
      expect(stats.patternDistribution).toBeDefined()
      expect(typeof stats.patternDistribution).toBe('object')
    })

    it('should get voice context for content generation', async () => {
      const context = await voiceLearningEnhanced.getVoiceContextForGeneration(
        'post',
        ['leadership', 'coaching'],
        ['authenticity', 'authority']
      )

      expect(context).toBeDefined()
      expect(context.authenticityBoosts).toBeDefined()
      expect(Array.isArray(context.authenticityBoosts)).toBe(true)
      expect(context.authenticity_score).toBeGreaterThan(0)
      expect(context.confidence_level).toBeGreaterThan(0)
      expect(context.voicePatterns).toBeDefined()
      expect(context.contextualGuidance).toBeDefined()
    })

    it('should enhance content with voice insights', async () => {
      const testContent = 'This is a test post about leadership and coaching effectiveness.'
      
      const result = await voiceLearningEnhanced.enhanceVoiceForContent(
        testContent,
        'leadership coaching',
        testJobId
      )

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.enhancedContent).toBeDefined()
      expect(result.voiceScore).toBeGreaterThan(0)
      expect(result.improvements).toBeDefined()
      expect(Array.isArray(result.improvements)).toBe(true)
      expect(result.authenticity_analysis).toBeDefined()
      expect(result.authenticity_analysis.enhanced_score).toBeGreaterThanOrEqual(
        result.authenticity_analysis.original_score
      )
    })

    it('should handle cache properly', async () => {
      // First call to populate cache
      const context1 = await voiceLearningEnhanced.getVoiceContextForGeneration(
        'post',
        ['test-cache'],
        ['test']
      )

      // Second identical call should use cache
      const startTime = Date.now()
      const context2 = await voiceLearningEnhanced.getVoiceContextForGeneration(
        'post',
        ['test-cache'],
        ['test']
      )
      const endTime = Date.now()

      // Should be faster (cached)
      expect(endTime - startTime).toBeLessThan(1000)
      expect(context1.authenticity_score).toBe(context2.authenticity_score)
    })

    it('should provide fallback when no voice data available', async () => {
      const context = await voiceLearningEnhanced.getVoiceContextForGeneration(
        'post',
        ['extremely-rare-topic-xyz-123'],
        []
      )

      expect(context).toBeDefined()
      expect(context.authenticityBoosts.length).toBeGreaterThan(0)
      expect(context.authenticity_score).toBeGreaterThan(0.5) // Should have reasonable fallback
    })
  })

  describe('Supabase Service RAG Extensions', () => {
    it('should search voice chunks by content', async () => {
      const results = await supabaseService.searchVoiceChunksByContent(
        'leadership',
        0.5, // Lower threshold for testing
        5
      )

      expect(Array.isArray(results)).toBe(true)
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('content')
        expect(results[0]).toHaveProperty('voice_pattern_type')
        expect(results[0]).toHaveProperty('confidence_score')
      }
    })

    it('should get voice chunks by pattern', async () => {
      const results = await supabaseService.getVoiceChunksByPattern('insight', 5)

      expect(Array.isArray(results)).toBe(true)
      if (results.length > 0) {
        results.forEach(chunk => {
          expect(chunk.voice_pattern_type).toBe('insight')
          expect(chunk).toHaveProperty('content')
          expect(chunk).toHaveProperty('confidence_score')
        })
      }
    })

    it('should save voice learning context', async () => {
      const success = await supabaseService.saveVoiceLearningContext({
        job_id: testJobId,
        generation_topic: 'test leadership topic',
        content_type: 'post',
        voice_chunks_used: ['test-chunk-1', 'test-chunk-2'],
        chunks_retrieval_query: 'leadership coaching effectiveness',
        similarity_threshold: 0.75,
        chunks_retrieved_count: 5,
        topic_match_score: 0.85,
        voice_authenticity_score: 0.90
      })

      expect(success).toBe(true)

      // Verify data was saved
      const { data } = await supabase
        .from('voice_learning_context')
        .select('*')
        .eq('job_id', testJobId)
        .single()

      expect(data).toBeDefined()
      expect(data.generation_topic).toBe('test leadership topic')
      expect(data.voice_authenticity_score).toBe(0.90)
    })

    it('should get voice system health', async () => {
      const health = await supabaseService.getVoiceSystemHealth()

      expect(health).toBeDefined()
      expect(health.totalChunks).toBeGreaterThan(0)
      expect(health.avgConfidence).toBeGreaterThan(0)
      expect(health.systemStatus).toMatch(/^(healthy|warning|error)$/)
      expect(typeof health.patternDistribution).toBe('object')
    })

    it('should handle voice pattern cache operations', async () => {
      const cacheData = {
        queryHash: 'test-hash-' + Date.now(),
        queryTopic: 'test caching topic',
        patternTypes: ['insight', 'authority'],
        matchingChunks: ['chunk-1', 'chunk-2'],
        patternAnalysis: { test: 'data' },
        authenticityBoosts: ['test boost 1', 'test boost 2'],
        voiceRecommendations: ['test recommendation'],
        chunkCount: 2,
        avgConfidenceScore: 0.85
      }

      // Set cache
      const setSuccess = await supabaseService.setVoicePatternCache(cacheData)
      expect(setSuccess).toBe(true)

      // Get from cache
      const cachedData = await supabaseService.getVoicePatternCache(cacheData.queryHash)
      expect(cachedData).toBeDefined()
      expect(cachedData.query_topic).toBe(cacheData.queryTopic)
      expect(cachedData.chunk_count).toBe(cacheData.chunkCount)
    })
  })

  describe('Vector Similarity Search', () => {
    it('should perform vector search using database function', async () => {
      // Get a sample embedding from an existing chunk
      const { data: sampleChunk } = await supabase
        .from('voice_chunks')
        .select('embedding')
        .not('embedding', 'is', null)
        .limit(1)
        .single()

      if (sampleChunk && sampleChunk.embedding) {
        const { data: results } = await supabase.rpc('search_voice_chunks', {
          query_embedding: sampleChunk.embedding,
          similarity_threshold: 0.5,
          limit_count: 5
        })

        expect(Array.isArray(results)).toBe(true)
        if (results && results.length > 0) {
          expect(results[0]).toHaveProperty('similarity_score')
          expect(results[0]).toHaveProperty('content')
          expect(results[0]).toHaveProperty('voice_pattern_type')
        }
      }
    })
  })

  describe('Performance and Analytics', () => {
    it('should update voice learning analytics', async () => {
      const success = await supabaseService.updateVoiceLearningAnalytics()
      expect(success).toBe(true)

      const analytics = await supabaseService.getVoiceLearningAnalytics(1)
      expect(Array.isArray(analytics)).toBe(true)
    })

    it('should cleanup expired cache', async () => {
      // Insert expired cache entry for testing
      await supabase
        .from('voice_pattern_cache')
        .insert({
          query_hash: 'expired-test-hash',
          query_topic: 'expired test topic',
          pattern_analysis: {},
          authenticity_boosts: [],
          voice_recommendations: [],
          chunk_count: 0,
          avg_confidence_score: 0,
          expires_at: new Date(Date.now() - 1000).toISOString() // Already expired
        })

      const deletedCount = await supabaseService.cleanupExpiredVoicePatternCache()
      expect(deletedCount).toBeGreaterThanOrEqual(1)
    })

    it('should track chunk usage', async () => {
      // Get a test chunk
      const { data: testChunk } = await supabase
        .from('voice_chunks')
        .select('id, usage_count')
        .limit(1)
        .single()

      if (testChunk) {
        const originalUsageCount = testChunk.usage_count
        
        const success = await supabaseService.updateVoiceChunkEffectiveness(
          testChunk.id,
          0.95
        )
        expect(success).toBe(true)

        // Verify usage count increased
        const { data: updatedChunk } = await supabase
          .from('voice_chunks')
          .select('usage_count, effectiveness_score')
          .eq('id', testChunk.id)
          .single()

        expect(updatedChunk.usage_count).toBeGreaterThan(originalUsageCount)
        expect(updatedChunk.effectiveness_score).toBe(0.95)
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing chunks gracefully', async () => {
      const context = await voiceLearningEnhanced.getVoiceContextForGeneration(
        'post',
        ['nonexistent-topic-xyz-999'],
        []
      )

      expect(context).toBeDefined()
      expect(context.authenticityBoosts.length).toBeGreaterThan(0)
      expect(context.authenticity_score).toBeGreaterThan(0)
    })

    it('should handle invalid voice chunk IDs', async () => {
      const result = await supabaseService.getVoiceChunk('invalid-uuid-123')
      expect(result).toBeNull()
    })

    it('should handle malformed search queries', async () => {
      const results = await supabaseService.searchVoiceChunksByContent('', 0.5, 5)
      expect(Array.isArray(results)).toBe(true)
      // Should return empty array or handle gracefully
    })

    it('should handle content enhancement errors gracefully', async () => {
      const result = await voiceLearningEnhanced.enhanceVoiceForContent(
        '', // Empty content
        'test topic'
      )

      expect(result).toBeDefined()
      expect(typeof result.success).toBe('boolean')
      expect(result.voiceScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Integration with Content Generation Pipeline', () => {
    it('should provide voice context compatible with AI agents service', async () => {
      const context = await voiceLearningEnhanced.getVoiceContextForGeneration(
        'post',
        ['leadership', 'team building'],
        ['authenticity', 'authority']
      )

      // Check format expected by AI agents service
      expect(context.authenticityBoosts).toBeDefined()
      expect(Array.isArray(context.authenticityBoosts)).toBe(true)
      expect(context.voicePatterns).toBeDefined()
      expect(Array.isArray(context.voicePatterns)).toBe(true)
      
      // Should provide actionable guidance
      context.authenticityBoosts.forEach(boost => {
        expect(typeof boost).toBe('string')
        expect(boost.length).toBeGreaterThan(10)
      })
    })

    it('should maintain compatibility with existing voice learning interface', async () => {
      // Test that the service maintains the expected interface
      expect(typeof voiceLearningEnhanced.getVoiceContextForGeneration).toBe('function')
      expect(typeof voiceLearningEnhanced.getVoiceLearningStats).toBe('function')
      expect(typeof voiceLearningEnhanced.enhanceVoiceForContent).toBe('function')
    })
  })
})