/**
 * Test Script: LinkedIn-Only RAG System Validation
 * 
 * This script tests the RAG system after removing podcast chunks
 * to ensure LinkedIn-only retrieval works effectively.
 */

import { voiceRAGSystem } from '../services/voice-rag-system'
import { supabaseService } from '../services/supabase'
import logger from '../lib/logger'

interface TestResult {
  testName: string
  passed: boolean
  details: any
  recommendations?: string[]
}

class LinkedInOnlyRAGTester {
  private testResults: TestResult[] = []

  async runAllTests(): Promise<void> {
    logger.info('Starting LinkedIn-Only RAG System Validation')
    
    // Test 1: Database Cleanup Verification
    await this.testDatabaseCleanup()
    
    // Test 2: LinkedIn Chunk Availability
    await this.testLinkedInChunkAvailability()
    
    // Test 3: RAG Retrieval Functionality
    await this.testRAGRetrieval()
    
    // Test 4: Voice Context Generation
    await this.testVoiceContextGeneration()
    
    // Test 5: Query Coverage Analysis
    await this.testQueryCoverage()
    
    // Test 6: Performance Benchmarking
    await this.testPerformance()
    
    // Generate final report
    this.generateReport()
  }

  private async testDatabaseCleanup(): Promise<void> {
    logger.info('Testing database cleanup...')
    
    try {
      // Check that podcast chunks are removed
      const { data: podcastChunks, error: podcastError } = await supabaseService.client
        .from('voice_content_chunks')
        .select('count')
        .single()
      
      if (podcastError && !podcastError.message.includes('relation "voice_content_chunks" does not exist')) {
        throw podcastError
      }
      
      const podcastCount = podcastChunks ? podcastChunks.count : 0
      
      // Check LinkedIn chunks are available
      const { data: linkedInCount, error: linkedInError } = await supabaseService.client
        .from('linkedin_post_chunks')
        .select('count')
        .single()
      
      if (linkedInError) {
        throw linkedInError
      }
      
      const testPassed = podcastCount === 0 && linkedInCount.count > 0
      
      this.testResults.push({
        testName: 'Database Cleanup Verification',
        passed: testPassed,
        details: {
          podcastChunksRemaining: podcastCount,
          linkedInChunksAvailable: linkedInCount.count,
          cleanupSuccessful: podcastCount === 0
        },
        recommendations: testPassed ? [] : [
          'Run the cleanup SQL script to remove podcast chunks',
          'Verify LinkedIn post chunks are properly populated'
        ]
      })
      
    } catch (error) {
      this.testResults.push({
        testName: 'Database Cleanup Verification',
        passed: false,
        details: { error: error instanceof Error ? error.message : String(error) },
        recommendations: ['Check database connectivity and run cleanup script']
      })
    }
  }

  private async testLinkedInChunkAvailability(): Promise<void> {
    logger.info('Testing LinkedIn chunk availability and quality...')
    
    try {
      const { data: chunks, error } = await supabaseService.client
        .from('linkedin_post_chunks')
        .select(`
          id,
          authenticity_score,
          quality_score,
          pattern_types,
          primary_topic,
          chunk_type,
          token_count
        `)
        .gte('authenticity_score', 60)
        .order('authenticity_score', { ascending: false })
        .limit(100)
      
      if (error) {
        throw error
      }
      
      const totalChunks = chunks?.length || 0
      const highAuthChunks = chunks?.filter(c => c.authenticity_score >= 80).length || 0
      const highQualityChunks = chunks?.filter(c => c.quality_score >= 0.7).length || 0
      const avgAuthenticity = chunks?.reduce((sum, c) => sum + c.authenticity_score, 0) / totalChunks || 0
      const uniqueTopics = new Set(chunks?.map(c => c.primary_topic).filter(Boolean)).size
      const uniquePatterns = new Set(chunks?.flatMap(c => c.pattern_types || [])).size
      
      const testPassed = totalChunks >= 50 && avgAuthenticity >= 70 && uniqueTopics >= 5
      
      this.testResults.push({
        testName: 'LinkedIn Chunk Availability',
        passed: testPassed,
        details: {
          totalChunks,
          highAuthenticityChunks: highAuthChunks,
          highQualityChunks,
          avgAuthenticity: Math.round(avgAuthenticity),
          uniqueTopics,
          uniquePatterns,
          coverageAssessment: totalChunks >= 50 ? 'Sufficient' : 'Insufficient'
        },
        recommendations: !testPassed ? [
          'Import more LinkedIn posts to increase chunk coverage',
          'Review authenticity scoring for existing chunks',
          'Ensure topic diversity in LinkedIn post dataset'
        ] : []
      })
      
    } catch (error) {
      this.testResults.push({
        testName: 'LinkedIn Chunk Availability',
        passed: false,
        details: { error: error instanceof Error ? error.message : String(error) },
        recommendations: ['Check linkedin_post_chunks table structure and data']
      })
    }
  }

  private async testRAGRetrieval(): Promise<void> {
    logger.info('Testing RAG retrieval functionality...')
    
    const testQueries = [
      { topic: ['leadership'], patterns: ['confrontational'] },
      { topic: ['coaching'], patterns: ['storytelling'] },
      { topic: ['business'], patterns: ['authority'] },
      { topic: ['innovation'], patterns: ['question'] },
      { topic: ['culture'], patterns: ['vulnerability'] }
    ]
    
    let passedQueries = 0
    const queryResults: any[] = []
    
    for (const query of testQueries) {
      try {
        const context = await voiceRAGSystem.getVoiceContextForGeneration(
          'linkedin_post',
          query.topic,
          query.patterns,
          8
        )
        
        const chunksRetrieved = context.relevantChunks.length
        const patternsRetrieved = context.relevantPatterns.length
        const avgQuality = context.retrievalQuality
        
        const queryPassed = chunksRetrieved >= 3 && avgQuality >= 0.5
        
        if (queryPassed) passedQueries++
        
        queryResults.push({
          query: `${query.topic.join(',')} + ${query.patterns.join(',')}`,
          chunksRetrieved,
          patternsRetrieved,
          retrievalQuality: Math.round(avgQuality * 100),
          contentConfidence: Math.round(context.contentConfidence * 100),
          passed: queryPassed
        })
        
      } catch (error) {
        queryResults.push({
          query: `${query.topic.join(',')} + ${query.patterns.join(',')}`,
          error: error instanceof Error ? error.message : String(error),
          passed: false
        })
      }
    }
    
    const testPassed = passedQueries >= 4 // 80% success rate
    
    this.testResults.push({
      testName: 'RAG Retrieval Functionality',
      passed: testPassed,
      details: {
        totalQueries: testQueries.length,
        passedQueries,
        successRate: Math.round((passedQueries / testQueries.length) * 100),
        queryResults
      },
      recommendations: !testPassed ? [
        'Review LinkedIn chunk quality and relevance',
        'Adjust similarity thresholds in retrieval functions',
        'Ensure sufficient pattern diversity in LinkedIn chunks'
      ] : []
    })
  }

  private async testVoiceContextGeneration(): Promise<void> {
    logger.info('Testing voice context generation...')
    
    try {
      const context = await voiceRAGSystem.getVoiceContextForGeneration(
        'linkedin_post',
        ['leadership', 'culture'],
        ['confrontational', 'storytelling'],
        8
      )
      
      const hasChunks = context.relevantChunks.length > 0
      const hasPatterns = context.relevantPatterns.length > 0
      const hasGuidelines = context.voiceGuidelines.length > 100
      const hasAdvice = context.topicSpecificAdvice.length > 0
      const hasBoosts = context.authenticityBoosts.length > 0
      
      // Check that voice guidelines mention LinkedIn-only (not mixed sources)
      const isLinkedInOnly = context.voiceGuidelines.toLowerCase().includes('exclusive') ||
                             context.voiceGuidelines.toLowerCase().includes('linkedin-only') ||
                             !context.voiceGuidelines.toLowerCase().includes('podcast')
      
      const testPassed = hasChunks && hasPatterns && hasGuidelines && hasAdvice && isLinkedInOnly
      
      this.testResults.push({
        testName: 'Voice Context Generation',
        passed: testPassed,
        details: {
          relevantChunks: context.relevantChunks.length,
          relevantPatterns: context.relevantPatterns.length,
          voiceGuidelinesLength: context.voiceGuidelines.length,
          topicSpecificAdvice: context.topicSpecificAdvice.length,
          authenticityBoosts: context.authenticityBoosts.length,
          retrievalQuality: Math.round(context.retrievalQuality * 100),
          contentConfidence: Math.round(context.contentConfidence * 100),
          linkedInOnlyMessaging: isLinkedInOnly
        },
        recommendations: !testPassed ? [
          'Update voice guidelines to reflect LinkedIn-only approach',
          'Ensure sufficient chunk and pattern retrieval',
          'Review context synthesis logic'
        ] : []
      })
      
    } catch (error) {
      this.testResults.push({
        testName: 'Voice Context Generation',
        passed: false,
        details: { error: error instanceof Error ? error.message : String(error) },
        recommendations: ['Debug voice context generation process']
      })
    }
  }

  private async testQueryCoverage(): Promise<void> {
    logger.info('Testing query coverage across different topics...')
    
    const testTopics = [
      'leadership', 'coaching', 'culture', 'innovation', 'business',
      'team building', 'performance', 'communication', 'strategy', 'growth'
    ]
    
    let topicsWithCoverage = 0
    const coverageResults: any[] = []
    
    for (const topic of testTopics) {
      try {
        const { data: topicChunks, error } = await supabaseService.client
          .from('linkedin_post_chunks')
          .select('id, authenticity_score, primary_topic')
          .or(`chunk_text.ilike.%${topic}%,primary_topic.ilike.%${topic}%`)
          .gte('authenticity_score', 60)
        
        if (error) {
          throw error
        }
        
        const chunkCount = topicChunks?.length || 0
        const hasCoverage = chunkCount >= 3
        
        if (hasCoverage) topicsWithCoverage++
        
        coverageResults.push({
          topic,
          chunksFound: chunkCount,
          hasSufficientCoverage: hasCoverage
        })
        
      } catch (error) {
        coverageResults.push({
          topic,
          error: error instanceof Error ? error.message : String(error),
          hasSufficientCoverage: false
        })
      }
    }
    
    const coverageRate = topicsWithCoverage / testTopics.length
    const testPassed = coverageRate >= 0.7 // 70% topic coverage
    
    this.testResults.push({
      testName: 'Query Coverage Analysis',
      passed: testPassed,
      details: {
        totalTopics: testTopics.length,
        topicsWithCoverage,
        coverageRate: Math.round(coverageRate * 100),
        coverageResults
      },
      recommendations: !testPassed ? [
        'Import LinkedIn posts covering more diverse topics',
        'Review topic classification and tagging',
        'Consider expanding LinkedIn post dataset'
      ] : []
    })
  }

  private async testPerformance(): Promise<void> {
    logger.info('Testing performance with LinkedIn-only retrieval...')
    
    const performanceResults: any[] = []
    
    // Test multiple retrieval operations
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now()
      
      try {
        const context = await voiceRAGSystem.getVoiceContextForGeneration(
          'linkedin_post',
          ['leadership'],
          ['confrontational'],
          8
        )
        
        const endTime = Date.now()
        const latency = endTime - startTime
        
        performanceResults.push({
          test: `Retrieval ${i + 1}`,
          latency,
          chunksRetrieved: context.relevantChunks.length,
          success: true
        })
        
      } catch (error) {
        const endTime = Date.now()
        const latency = endTime - startTime
        
        performanceResults.push({
          test: `Retrieval ${i + 1}`,
          latency,
          error: error instanceof Error ? error.message : String(error),
          success: false
        })
      }
    }
    
    const successfulTests = performanceResults.filter(r => r.success)
    const avgLatency = successfulTests.reduce((sum, r) => sum + r.latency, 0) / successfulTests.length
    const maxLatency = Math.max(...successfulTests.map(r => r.latency))
    const successRate = successfulTests.length / performanceResults.length
    
    const testPassed = avgLatency <= 2000 && successRate >= 0.8 // 2 second avg, 80% success
    
    this.testResults.push({
      testName: 'Performance Benchmarking',
      passed: testPassed,
      details: {
        totalTests: performanceResults.length,
        successfulTests: successfulTests.length,
        averageLatency: Math.round(avgLatency),
        maxLatency: Math.round(maxLatency),
        successRate: Math.round(successRate * 100),
        performanceResults
      },
      recommendations: !testPassed ? [
        'Optimize LinkedIn chunk retrieval queries',
        'Review embedding search performance',
        'Consider indexing improvements'
      ] : []
    })
  }

  private generateReport(): void {
    const totalTests = this.testResults.length
    const passedTests = this.testResults.filter(r => r.passed).length
    const successRate = passedTests / totalTests
    
    logger.info('\n=== LinkedIn-Only RAG System Validation Report ===')
    logger.info(`Overall Success Rate: ${Math.round(successRate * 100)}% (${passedTests}/${totalTests} tests passed)`)
    logger.info('\nDetailed Results:')
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL'
      logger.info(`${status}: ${result.testName}`)
      
      if (result.details) {
        logger.info('  Details:', JSON.stringify(result.details, null, 2))
      }
      
      if (result.recommendations && result.recommendations.length > 0) {
        logger.info('  Recommendations:')
        result.recommendations.forEach(rec => logger.info(`    - ${rec}`))
      }
      
      logger.info('')
    })
    
    // Final recommendations
    if (successRate >= 0.8) {
      logger.info('🎉 SYSTEM READY: LinkedIn-Only RAG system is functioning well!')
      logger.info('Next steps:')
      logger.info('  - Deploy to staging environment for user testing')
      logger.info('  - Monitor content generation quality in production')
      logger.info('  - Set up performance monitoring dashboards')
    } else {
      logger.info('⚠️  SYSTEM NEEDS WORK: Address failing tests before deployment')
      logger.info('Critical actions needed:')
      const failedTests = this.testResults.filter(r => !r.passed)
      failedTests.forEach(test => {
        logger.info(`  - Fix: ${test.testName}`)
        test.recommendations?.forEach(rec => logger.info(`    > ${rec}`))
      })
    }
    
    logger.info('\n=== End Report ===\n')
  }
}

// Run the test suite
async function main() {
  try {
    const tester = new LinkedInOnlyRAGTester()
    await tester.runAllTests()
    process.exit(0)
  } catch (error) {
    logger.error('Test suite failed:', error)
    process.exit(1)
  }
}

// Execute if run directly
if (require.main === module) {
  main()
}

export { LinkedInOnlyRAGTester }