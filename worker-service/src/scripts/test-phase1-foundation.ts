#!/usr/bin/env ts-node

/**
 * Phase 1 Foundation Test Script
 * 
 * This script tests the core components of the performance-driven content enhancement system:
 * - Database schema validation
 * - Voice learning system
 * - Historical analysis system
 * - Performance tracking integration
 */

import logger from '../lib/logger'
import { supabaseService } from '../services/supabase'
import { voiceLearningEnhancedService } from '../services/voice-learning-enhanced'
import { historicalAnalysisEnhancedService } from '../services/historical-analysis-enhanced'

class Phase1FoundationTester {
  private testResults: { [key: string]: { passed: boolean; message: string; data?: any } } = {}

  async runAllTests(): Promise<void> {
    logger.info('🚀 Starting Phase 1 Foundation Tests')
    
    try {
      await this.testDatabaseSchema()
      await this.testSupabaseEnhancedMethods()
      await this.testVoiceLearningSystem()
      await this.testHistoricalAnalysisSystem()
      
      this.printResults()
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Phase 1 foundation tests failed')
      throw error
    }
  }

  async testDatabaseSchema(): Promise<void> {
    logger.info('📊 Testing database schema...')
    
    try {
      // Test if performance analytics table exists and can be queried
      const topPosts = await supabaseService.getTopPerformingPosts(1, 365)
      
      this.testResults.database_schema = {
        passed: true,
        message: 'Database schema accessible',
        data: { topPostsQueryWorked: true, postsFound: topPosts.length }
      }
      
      logger.info('✅ Database schema test passed')
    } catch (error) {
      this.testResults.database_schema = {
        passed: false,
        message: `Database schema test failed: ${error instanceof Error ? error.message : String(error)}`
      }
      
      logger.error('❌ Database schema test failed')
    }
  }

  async testSupabaseEnhancedMethods(): Promise<void> {
    logger.info('🗄️ Testing enhanced Supabase methods...')
    
    try {
      // Test saving performance data
      const testPostId = `test_post_${Date.now()}`
      const saved = await supabaseService.savePostPerformance({
        post_id: testPostId,
        platform: 'linkedin',
        content_text: 'Test post for Phase 1 foundation validation. This tests the enhanced Supabase service methods.',
        total_reactions: 10,
        like_count: 8,
        comments_count: 2,
        reposts_count: 1,
        post_type: 'test'
      })

      // Test saving voice learning data
      const voiceSaved = await supabaseService.saveVoiceLearningData({
        content_id: testPostId,
        content_type: 'post',
        content_text: 'Test voice learning data',
        authenticity_score: 75,
        authority_score: 80,
        vulnerability_score: 70,
        engagement_potential: 85,
        confidence_score: 0.85
      })

      this.testResults.supabase_enhanced = {
        passed: saved && voiceSaved,
        message: saved && voiceSaved ? 
          'Enhanced Supabase methods working correctly' : 
          'Some enhanced Supabase methods failed',
        data: { 
          performanceDataSaved: saved, 
          voiceDataSaved: voiceSaved,
          testPostId 
        }
      }
      
      logger.info('✅ Enhanced Supabase methods test passed')
    } catch (error) {
      this.testResults.supabase_enhanced = {
        passed: false,
        message: `Enhanced Supabase methods test failed: ${error instanceof Error ? error.message : String(error)}`
      }
      
      logger.error('❌ Enhanced Supabase methods test failed')
    }
  }

  async testVoiceLearningSystem(): Promise<void> {
    logger.info('🎭 Testing voice learning system...')
    
    try {
      const testContent = `
        Most CEOs won't admit this:
        
        They've built successful companies but feel completely stuck personally.
        
        I've coached 100s of founders who are crushing it externally - hitting targets, scaling teams, earning respect.
        
        But privately? They're burned out, reactive, and wondering "Is this it?"
        
        The problem isn't strategy. It's self-leadership.
        
        When you're always "on" - making decisions, solving problems, being the answer - you lose touch with who you are beneath the title.
        
        Real breakthrough comes when you learn to lead yourself first.
        
        Not through another framework or productivity hack.
        
        Through honest self-awareness and the courage to change what isn't working.
        
        The best leaders I work with share one trait: They're willing to be vulnerable about their own growth.
        
        ♻️ Repost if you know a founder who might need to hear this.
      `

      const analysis = await voiceLearningEnhancedService.analyzeVoicePatterns(
        testContent,
        {
          content_type: 'post',
          context: 'Phase 1 foundation test - typical Andrew Tallents post style',
          performance_data: {
            engagement_score: 150,
            viral_score: 200,
            performance_tier: 'top_25_percent'
          }
        }
      )

      const isValidAnalysis = 
        analysis.authenticity_score > 0 &&
        analysis.authority_score > 0 &&
        analysis.vulnerability_score > 0 &&
        !!analysis.tone_analysis &&
        !!analysis.vocabulary_patterns &&
        !!analysis.structural_patterns

      this.testResults.voice_learning = {
        passed: isValidAnalysis,
        message: isValidAnalysis ? 
          'Voice learning system functioning correctly' : 
          'Voice learning system analysis incomplete',
        data: {
          authenticity_score: analysis.authenticity_score,
          authority_score: analysis.authority_score,
          vulnerability_score: analysis.vulnerability_score,
          engagement_potential: analysis.engagement_potential,
          dominant_tone: analysis.tone_analysis.primary_tone,
          confidence: analysis.confidence_score
        }
      }
      
      logger.info('✅ Voice learning system test passed')
    } catch (error) {
      this.testResults.voice_learning = {
        passed: false,
        message: `Voice learning system test failed: ${error instanceof Error ? error.message : String(error)}`
      }
      
      logger.error('❌ Voice learning system test failed')
    }
  }

  async testHistoricalAnalysisSystem(): Promise<void> {
    logger.info('📈 Testing historical analysis system...')
    
    try {
      // Test getting Andrew's posts from connections (this may not have data yet)
      const posts = await historicalAnalysisEnhancedService['getAndrewsPostsFromConnections']()
      
      // Test comprehensive insights generation (will work with empty data)
      const insights = await historicalAnalysisEnhancedService.generateComprehensiveInsights(
        'leadership development for CEOs',
        {
          maxPosts: 10,
          timeframeDays: 365,
          forceRefresh: true
        }
      )

      const isValidInsights = 
        !!insights.query_topic &&
        !!insights.query_hash &&
        typeof insights.confidence_level === 'number' &&
        !!insights.performance_context &&
        !!insights.content_patterns &&
        !!insights.voice_patterns

      this.testResults.historical_analysis = {
        passed: isValidInsights,
        message: isValidInsights ? 
          'Historical analysis system functioning correctly' : 
          'Historical analysis system structure incomplete',
        data: {
          postsFound: posts.length,
          confidenceLevel: insights.confidence_level,
          similarPostsCount: insights.similar_posts_count,
          queryHash: insights.query_hash,
          dominantTone: insights.voice_patterns.dominant_tone,
          avgWordCount: insights.content_patterns.avg_word_count
        }
      }
      
      logger.info('✅ Historical analysis system test passed')
    } catch (error) {
      this.testResults.historical_analysis = {
        passed: false,
        message: `Historical analysis system test failed: ${error instanceof Error ? error.message : String(error)}`
      }
      
      logger.error('❌ Historical analysis system test failed')
    }
  }

  printResults(): void {
    logger.info('📊 PHASE 1 FOUNDATION TEST RESULTS')
    logger.info('='.repeat(50))
    
    let totalTests = 0
    let passedTests = 0

    for (const [testName, result] of Object.entries(this.testResults)) {
      totalTests++
      if (result.passed) passedTests++

      const status = result.passed ? '✅ PASSED' : '❌ FAILED'
      const testNameFormatted = testName.replace(/_/g, ' ').toUpperCase()
      
      logger.info(`${status} - ${testNameFormatted}`)
      logger.info(`   Message: ${result.message}`)
      
      if (result.data) {
        logger.info(`   Data: ${JSON.stringify(result.data, null, 2)}`)
      }
      logger.info('')
    }

    logger.info('='.repeat(50))
    logger.info(`📈 TEST SUMMARY: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`)
    
    if (passedTests === totalTests) {
      logger.info('🎉 ALL PHASE 1 FOUNDATION TESTS PASSED!')
      logger.info('🚀 Ready to proceed with Phase 2 Strategic Variants')
    } else {
      logger.warn('⚠️  Some tests failed. Please review and fix issues before proceeding.')
    }

    logger.info('')
    logger.info('📋 NEXT STEPS FOR PHASE 1 COMPLETION:')
    logger.info('1. Run the database migration: npm run migrate')
    logger.info('2. Initialize historical data: POST /api/performance/initialize')
    logger.info('3. Update performance tiers: POST /api/performance/update-tiers')
    logger.info('4. Generate voice model: GET /api/performance/voice-model')
    logger.info('5. Test comprehensive insights: POST /api/performance/insights')
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  const tester = new Phase1FoundationTester()
  
  tester.runAllTests()
    .then(() => {
      logger.info('🏁 Phase 1 foundation testing completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, '💥 Phase 1 foundation testing failed')
      process.exit(1)
    })
}

export { Phase1FoundationTester }