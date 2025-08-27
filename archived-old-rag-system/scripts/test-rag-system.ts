/**
 * RAG System Test Script
 * 
 * Tests the new RAG voice learning system:
 * 1. Database schema validation
 * 2. Data processing functionality
 * 3. RAG retrieval performance
 * 4. Voice context generation
 * 5. System integration
 */

import { supabaseService } from '../services/supabase'
import { voiceRAGSystem } from '../services/voice-rag-system'
import { ragDataProcessor } from '../services/rag-data-processor'
import { voiceLearningEnhanced } from '../services/voice-learning-enhanced'
import logger from '../lib/logger'

interface TestResult {
  testName: string
  success: boolean
  duration: number
  details: any
  error?: string
}

class RAGSystemTester {
  private testResults: TestResult[] = []

  async runAllTests(): Promise<{
    totalTests: number
    passed: number
    failed: number
    results: TestResult[]
    summary: string
  }> {
    logger.info('Starting comprehensive RAG system tests')
    
    const tests = [
      () => this.testDatabaseSchema(),
      () => this.testRAGFunctions(),
      () => this.testDataProcessing(),
      () => this.testRAGRetrieval(),
      () => this.testVoiceContextGeneration(),
      () => this.testPerformanceComparison(),
      () => this.testSystemIntegration(),
      () => this.testSystemMaintenance()
    ]

    for (const test of tests) {
      try {
        await test()
      } catch (error) {
        logger.error({ error }, 'Test execution failed')
      }
    }

    const passed = this.testResults.filter(r => r.success).length
    const failed = this.testResults.length - passed
    
    const summary = `RAG System Tests: ${passed}/${this.testResults.length} passed (${failed} failed)`
    
    logger.info({ 
      totalTests: this.testResults.length,
      passed,
      failed,
      summary
    }, 'RAG system testing completed')

    return {
      totalTests: this.testResults.length,
      passed,
      failed,
      results: this.testResults,
      summary
    }
  }

  private async runTest(
    testName: string,
    testFunction: () => Promise<any>
  ): Promise<void> {
    const startTime = Date.now()
    
    try {
      logger.info({ testName }, 'Running test')
      const result = await testFunction()
      const duration = Date.now() - startTime
      
      this.testResults.push({
        testName,
        success: true,
        duration,
        details: result
      })
      
      logger.info({ testName, duration, result }, 'Test passed')
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      this.testResults.push({
        testName,
        success: false,
        duration,
        details: null,
        error: errorMessage
      })
      
      logger.error({ testName, duration, error: errorMessage }, 'Test failed')
    }
  }

  /**
   * Test 1: Database Schema Validation
   */
  private async testDatabaseSchema(): Promise<void> {
    await this.runTest('Database Schema Validation', async () => {
      // Check if RAG tables exist
      const requiredTables = [
        'voice_content_chunks',
        'voice_pattern_library', 
        'chunk_retrieval_analytics'
      ]

      const tableChecks = await Promise.all(
        requiredTables.map(async (tableName) => {
          try {
            const { data, error } = await supabaseService.client
              .from(tableName)
              .select('*')
              .limit(1)
            
            return {
              table: tableName,
              exists: !error,
              error: error?.message
            }
          } catch (error) {
            return {
              table: tableName,
              exists: false,
              error: error instanceof Error ? error.message : String(error)
            }
          }
        })
      )

      // Check if RAG functions exist
      const functionChecks = []
      const requiredFunctions = [
        'match_voice_chunks',
        'match_voice_patterns',
        'get_contextual_chunks',
        'maintain_rag_system'
      ]

      for (const functionName of requiredFunctions) {
        try {
          // Test function exists by calling with dummy parameters
          const { error } = await supabaseService.client
            .rpc(functionName, {
              query_embedding: '[0.1,0.2,0.3]',
              max_chunks: 1
            })
          
          functionChecks.push({
            function: functionName,
            exists: error?.code !== '42883', // Function does not exist
            error: error?.message
          })
        } catch (error) {
          functionChecks.push({
            function: functionName,
            exists: false,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }

      const allTablesExist = tableChecks.every(check => check.exists)
      const allFunctionsExist = functionChecks.every(check => check.exists)

      if (!allTablesExist || !allFunctionsExist) {
        throw new Error(`Schema validation failed. Tables: ${JSON.stringify(tableChecks)}, Functions: ${JSON.stringify(functionChecks)}`)
      }

      return {
        tables: tableChecks,
        functions: functionChecks,
        schemaValid: true
      }
    })
  }

  /**
   * Test 2: RAG Functions Testing
   */
  private async testRAGFunctions(): Promise<void> {
    await this.runTest('RAG Functions Testing', async () => {
      // Test vector similarity search with dummy data
      const testEmbedding = Array(1536).fill(0).map(() => Math.random())
      const embeddingVector = `[${testEmbedding.join(',')}]`

      // Test chunk matching function
      const { data: chunks, error: chunksError } = await supabaseService.client
        .rpc('match_voice_chunks', {
          query_embedding: embeddingVector,
          speaker_filter: 'andrew',
          similarity_threshold: 1.0, // Very permissive for testing
          max_chunks: 5
        })

      // Test pattern matching function
      const { data: patterns, error: patternsError } = await supabaseService.client
        .rpc('match_voice_patterns', {
          query_embedding: embeddingVector,
          similarity_threshold: 1.0,
          max_patterns: 3
        })

      return {
        chunkMatchingWorks: !chunksError,
        chunksFound: chunks?.length || 0,
        patternMatchingWorks: !patternsError,
        patternsFound: patterns?.length || 0,
        chunksError: chunksError?.message,
        patternsError: patternsError?.message
      }
    })
  }

  /**
   * Test 3: Data Processing
   */
  private async testDataProcessing(): Promise<void> {
    await this.runTest('Data Processing', async () => {
      // Check if we have unprocessed transcript segments
      const { data: segments } = await supabaseService.client
        .from('transcript_segments')
        .select('id')
        .eq('speaker', 'andrew')
        .limit(1)

      if (!segments || segments.length === 0) {
        return {
          hasTranscriptData: false,
          message: 'No transcript segments found for testing'
        }
      }

      // Test processing a single segment
      const segmentId = segments[0].id
      const result = await ragDataProcessor.processTranscriptSegment(segmentId)

      return {
        hasTranscriptData: true,
        testSegmentId: segmentId,
        processingSuccess: result.success,
        chunksCreated: result.chunksCreated,
        patternsExtracted: result.patternsExtracted,
        error: result.error
      }
    })
  }

  /**
   * Test 4: RAG Retrieval Performance
   */
  private async testRAGRetrieval(): Promise<void> {
    await this.runTest('RAG Retrieval Performance', async () => {
      // Test different query scenarios
      const testQueries = [
        {
          name: 'Leadership Topic',
          contentType: 'linkedin_post' as const,
          keywords: ['leadership', 'authenticity'],
          patterns: ['confrontational', 'storytelling']
        },
        {
          name: 'General Business',
          contentType: 'linkedin_post' as const,
          keywords: ['business', 'growth'],
          patterns: ['teaching', 'authority']
        },
        {
          name: 'Personal Development',
          contentType: 'article' as const,
          keywords: ['self-leadership', 'development'],
          patterns: ['vulnerability', 'storytelling']
        }
      ]

      const queryResults = []
      
      for (const query of testQueries) {
        const startTime = Date.now()
        
        try {
          const context = await voiceRAGSystem.getVoiceContextForGeneration(
            query.contentType,
            query.keywords,
            query.patterns,
            8,
            1
          )
          
          const duration = Date.now() - startTime
          
          queryResults.push({
            queryName: query.name,
            success: true,
            duration,
            chunksRetrieved: context.relevantChunks.length,
            patternsRetrieved: context.relevantPatterns.length,
            retrievalQuality: context.retrievalQuality,
            contentConfidence: context.contentConfidence,
            sourceEpisodes: context.sourceEpisodes.length
          })
        } catch (error) {
          queryResults.push({
            queryName: query.name,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }

      const successfulQueries = queryResults.filter(r => r.success).length
      const avgDuration = queryResults.reduce((sum, r) => sum + (r.duration || 0), 0) / queryResults.length

      return {
        totalQueries: testQueries.length,
        successfulQueries,
        avgDuration,
        queryResults
      }
    })
  }

  /**
   * Test 5: Voice Context Generation
   */
  private async testVoiceContextGeneration(): Promise<void> {
    await this.runTest('Voice Context Generation', async () => {
      // Test both RAG and legacy systems
      const testTopic = ['leadership']
      const testPatterns = ['confrontational', 'storytelling']
      
      const startTimeRAG = Date.now()
      const ragContext = await voiceLearningEnhanced.getVoiceContextForGeneration(
        'linkedin_post',
        testTopic,
        testPatterns,
        true // Use RAG
      )
      const ragDuration = Date.now() - startTimeRAG

      const startTimeLegacy = Date.now()
      const legacyContext = await voiceLearningEnhanced.getVoiceContextForGeneration(
        'linkedin_post',
        testTopic,
        testPatterns,
        false // Use legacy
      )
      const legacyDuration = Date.now() - startTimeLegacy

      return {
        ragSystem: {
          duration: ragDuration,
          patternsFound: ragContext.relevantPatterns.length,
          examplesFound: ragContext.exampleSegments.length,
          isRAGEnhanced: ragContext.ragEnhanced,
          retrievalQuality: ragContext.retrievalQuality,
          contentConfidence: ragContext.contentConfidence,
          sourceEpisodes: ragContext.sourceEpisodes?.length || 0,
          topicAdvice: ragContext.topicSpecificAdvice?.length || 0
        },
        legacySystem: {
          duration: legacyDuration,
          patternsFound: legacyContext.relevantPatterns.length,
          examplesFound: legacyContext.exampleSegments.length,
          isRAGEnhanced: legacyContext.ragEnhanced || false
        },
        performance: {
          ragFaster: ragDuration < legacyDuration,
          ragMoreContent: ragContext.exampleSegments.length > legacyContext.exampleSegments.length,
          improvementFactor: legacyContext.exampleSegments.length > 0 
            ? ragContext.exampleSegments.length / legacyContext.exampleSegments.length
            : 0
        }
      }
    })
  }

  /**
   * Test 6: Performance Comparison
   */
  private async testPerformanceComparison(): Promise<void> {
    await this.runTest('Performance Comparison', async () => {
      // Compare RAG vs legacy performance over multiple queries
      const testQueries = [
        { topic: ['leadership'], patterns: ['confrontational'] },
        { topic: ['business'], patterns: ['teaching'] },
        { topic: ['growth'], patterns: ['storytelling'] }
      ]

      const ragTimes: number[] = []
      const legacyTimes: number[] = []
      const ragContentCounts: number[] = []
      const legacyContentCounts: number[] = []

      for (const query of testQueries) {
        // Test RAG system
        const ragStart = Date.now()
        const ragResult = await voiceLearningEnhanced.getVoiceContextForGeneration(
          'linkedin_post',
          query.topic,
          query.patterns,
          true
        )
        ragTimes.push(Date.now() - ragStart)
        ragContentCounts.push(ragResult.exampleSegments.length)

        // Test legacy system
        const legacyStart = Date.now()
        const legacyResult = await voiceLearningEnhanced.getVoiceContextForGeneration(
          'linkedin_post',
          query.topic,
          query.patterns,
          false
        )
        legacyTimes.push(Date.now() - legacyStart)
        legacyContentCounts.push(legacyResult.exampleSegments.length)
      }

      const avgRAGTime = ragTimes.reduce((a, b) => a + b, 0) / ragTimes.length
      const avgLegacyTime = legacyTimes.reduce((a, b) => a + b, 0) / legacyTimes.length
      const avgRAGContent = ragContentCounts.reduce((a, b) => a + b, 0) / ragContentCounts.length
      const avgLegacyContent = legacyContentCounts.reduce((a, b) => a + b, 0) / legacyContentCounts.length

      return {
        performance: {
          avgRAGTime,
          avgLegacyTime,
          speedImprovement: avgLegacyTime / avgRAGTime,
          avgRAGContent,
          avgLegacyContent,
          contentImprovement: avgRAGContent / avgLegacyContent
        },
        rawData: {
          ragTimes,
          legacyTimes,
          ragContentCounts,
          legacyContentCounts
        }
      }
    })
  }

  /**
   * Test 7: System Integration
   */
  private async testSystemIntegration(): Promise<void> {
    await this.runTest('System Integration', async () => {
      // Test integration with existing content generation system
      const stats = await voiceRAGSystem.getRAGSystemStats()
      
      return {
        systemHealth: stats.systemHealth,
        totalChunks: stats.totalChunks,
        totalPatterns: stats.totalPatterns,
        avgChunkQuality: stats.avgChunkQuality,
        avgPatternEffectiveness: stats.avgPatternEffectiveness,
        retrievalStats: stats.retrievalStats
      }
    })
  }

  /**
   * Test 8: System Maintenance
   */
  private async testSystemMaintenance(): Promise<void> {
    await this.runTest('System Maintenance', async () => {
      // Test maintenance functions
      const maintenanceResult = await voiceRAGSystem.performSystemMaintenance()
      
      return {
        maintenanceSuccess: maintenanceResult.maintenanceSuccess,
        chunksUpdated: maintenanceResult.chunksUpdated,
        analyticsDeleted: maintenanceResult.analyticsDeleted,
        patternsOptimized: maintenanceResult.patternsOptimized
      }
    })
  }
}

// Export for use in other scripts
export { RAGSystemTester }

// Main execution function
export async function runRAGSystemTests(): Promise<void> {
  const tester = new RAGSystemTester()
  const results = await tester.runAllTests()
  
  console.log('\n' + '='.repeat(60))
  console.log('RAG SYSTEM TEST RESULTS')
  console.log('='.repeat(60))
  console.log(`Total Tests: ${results.totalTests}`)
  console.log(`Passed: ${results.passed}`)
  console.log(`Failed: ${results.failed}`)
  console.log(`Success Rate: ${Math.round((results.passed / results.totalTests) * 100)}%`)
  console.log('='.repeat(60))
  
  results.results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${result.testName} (${result.duration}ms)`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })
  
  console.log('='.repeat(60))
  console.log(results.summary)
  console.log('='.repeat(60) + '\n')
  
  if (results.failed > 0) {
    process.exit(1)
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runRAGSystemTests().catch(error => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })
}