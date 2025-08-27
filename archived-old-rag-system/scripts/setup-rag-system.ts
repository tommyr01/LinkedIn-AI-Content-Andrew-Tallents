/**
 * RAG System Setup Script
 * 
 * Initializes the RAG voice learning system:
 * 1. Validates database schema
 * 2. Processes existing transcript data
 * 3. Generates embeddings
 * 4. Performs initial optimization
 * 5. Validates system functionality
 */

import { supabaseService } from '../services/supabase'
import { ragDataProcessor } from '../services/rag-data-processor'
import { voiceRAGSystem } from '../services/voice-rag-system'
import { RAGSystemTester } from './test-rag-system'
import logger from '../lib/logger'
import { readFileSync } from 'fs'
import { join } from 'path'

interface SetupProgress {
  step: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number
  details?: any
  error?: string
  startTime?: number
  duration?: number
}

class RAGSystemSetup {
  private setupSteps: SetupProgress[] = [
    { step: 'Database Schema Validation', status: 'pending' },
    { step: 'Data Processing', status: 'pending' },
    { step: 'Embedding Generation', status: 'pending' },
    { step: 'System Optimization', status: 'pending' },
    { step: 'Functionality Testing', status: 'pending' },
    { step: 'Performance Validation', status: 'pending' }
  ]

  async setupRAGSystem(options: {
    skipSchemaCheck?: boolean
    skipDataProcessing?: boolean
    batchSize?: number
    testAfterSetup?: boolean
  } = {}): Promise<{
    success: boolean
    steps: SetupProgress[]
    totalDuration: number
    summary: string
  }> {
    const startTime = Date.now()
    logger.info({ options }, 'Starting RAG system setup')

    try {
      // Step 1: Database Schema Validation
      if (!options.skipSchemaCheck) {
        await this.runStep(0, () => this.validateDatabaseSchema())
      } else {
        this.skipStep(0, 'Schema check skipped by user')
      }

      // Step 2: Data Processing
      if (!options.skipDataProcessing) {
        await this.runStep(1, () => this.processTranscriptData(options.batchSize || 5))
      } else {
        this.skipStep(1, 'Data processing skipped by user')
      }

      // Step 3: Embedding Generation (included in data processing)
      this.skipStep(2, 'Embeddings generated during data processing')

      // Step 4: System Optimization
      await this.runStep(3, () => this.optimizeSystem())

      // Step 5: Functionality Testing
      if (options.testAfterSetup !== false) {
        await this.runStep(4, () => this.testFunctionality())
      } else {
        this.skipStep(4, 'Testing skipped by user')
      }

      // Step 6: Performance Validation
      if (options.testAfterSetup !== false) {
        await this.runStep(5, () => this.validatePerformance())
      } else {
        this.skipStep(5, 'Performance validation skipped by user')
      }

      const totalDuration = Date.now() - startTime
      const successfulSteps = this.setupSteps.filter(s => s.status === 'completed').length
      const failedSteps = this.setupSteps.filter(s => s.status === 'failed').length
      
      const success = failedSteps === 0
      const summary = `RAG System Setup ${success ? 'COMPLETED' : 'FAILED'}: ${successfulSteps}/${this.setupSteps.length} steps successful (${Math.round(totalDuration / 1000)}s)`

      logger.info({
        success,
        successfulSteps,
        failedSteps,
        totalDuration,
        summary
      }, 'RAG system setup completed')

      return {
        success,
        steps: this.setupSteps,
        totalDuration,
        summary
      }

    } catch (error) {
      const totalDuration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      logger.error({ error: errorMessage, totalDuration }, 'RAG system setup failed')
      
      return {
        success: false,
        steps: this.setupSteps,
        totalDuration,
        summary: `RAG System Setup FAILED: ${errorMessage}`
      }
    }
  }

  private async runStep(stepIndex: number, stepFunction: () => Promise<any>): Promise<void> {
    const step = this.setupSteps[stepIndex]
    step.status = 'running'
    step.startTime = Date.now()
    
    logger.info({ stepName: step.step }, 'Starting setup step')
    
    try {
      const result = await stepFunction()
      step.status = 'completed'
      step.details = result
      step.duration = Date.now() - (step.startTime || 0)
      
      logger.info({ 
        stepName: step.step, 
        duration: step.duration,
        details: result 
      }, 'Setup step completed')
    } catch (error) {
      step.status = 'failed'
      step.error = error instanceof Error ? error.message : String(error)
      step.duration = Date.now() - (step.startTime || 0)
      
      logger.error({ 
        stepName: step.step,
        error: step.error,
        duration: step.duration
      }, 'Setup step failed')
      
      throw error
    }
  }

  private skipStep(stepIndex: number, reason: string): void {
    const step = this.setupSteps[stepIndex]
    step.status = 'completed'
    step.details = { skipped: true, reason }
    step.duration = 0
    
    logger.info({ stepName: step.step, reason }, 'Setup step skipped')
  }

  /**
   * Step 1: Validate Database Schema
   */
  private async validateDatabaseSchema(): Promise<any> {
    logger.info('Validating RAG database schema')

    // Check if migration file exists
    const migrationPath = join(__dirname, '../../migrations/002_rag_voice_learning_schema.sql')
    let migrationExists = false
    try {
      readFileSync(migrationPath)
      migrationExists = true
    } catch (error) {
      // Migration file doesn't exist
    }

    // Check if tables exist
    const requiredTables = ['voice_content_chunks', 'voice_pattern_library', 'chunk_retrieval_analytics']
    const tableChecks = []

    for (const tableName of requiredTables) {
      try {
        const { data, error } = await supabaseService.client
          .from(tableName)
          .select('id')
          .limit(1)
        
        tableChecks.push({
          table: tableName,
          exists: !error,
          recordCount: data?.length || 0,
          error: error?.message
        })
      } catch (error) {
        tableChecks.push({
          table: tableName,
          exists: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    const allTablesExist = tableChecks.every(check => check.exists)

    if (!allTablesExist) {
      throw new Error(
        `Missing required tables. Please run migration: 002_rag_voice_learning_schema.sql\n` +
        `Table status: ${JSON.stringify(tableChecks, null, 2)}`
      )
    }

    return {
      migrationExists,
      tableChecks,
      schemaValid: true
    }
  }

  /**
   * Step 2: Process Transcript Data
   */
  private async processTranscriptData(batchSize: number = 5): Promise<any> {
    logger.info({ batchSize }, 'Processing existing transcript data into RAG chunks')

    // Check existing data
    const { data: existingChunks } = await supabaseService.client
      .from('voice_content_chunks')
      .select('id')
      .limit(1)

    const hasExistingChunks = (existingChunks?.length || 0) > 0

    if (hasExistingChunks) {
      logger.info('Existing chunks found, processing only new segments')
    }

    // Process all transcript data
    const processingStats = await ragDataProcessor.processAllTranscriptData(
      batchSize,
      true // Skip existing
    )

    if (processingStats.errors > 0) {
      logger.warn({ 
        errors: processingStats.errors,
        processed: processingStats.segmentsProcessed 
      }, 'Some segments failed to process')
    }

    return {
      hadExistingChunks: hasExistingChunks,
      processingStats,
      success: processingStats.segmentsProcessed > 0 || hasExistingChunks
    }
  }

  /**
   * Step 4: Optimize System
   */
  private async optimizeSystem(): Promise<any> {
    logger.info('Optimizing RAG system performance')

    // Run system maintenance
    const maintenance = await voiceRAGSystem.performSystemMaintenance()

    // Get system stats
    const stats = await voiceRAGSystem.getRAGSystemStats()

    return {
      maintenance,
      systemStats: stats,
      optimizationSuccess: maintenance.maintenanceSuccess
    }
  }

  /**
   * Step 5: Test Functionality
   */
  private async testFunctionality(): Promise<any> {
    logger.info('Testing RAG system functionality')

    // Run basic functionality tests
    const tester = new RAGSystemTester()
    const basicTests = [
      'Database Schema Validation',
      'RAG Functions Testing',
      'RAG Retrieval Performance'
    ]

    // We'll create a simpler test version for setup
    const testResults = []

    // Test 1: Basic retrieval
    try {
      const context = await voiceRAGSystem.getVoiceContextForGeneration(
        'linkedin_post',
        ['leadership'],
        ['confrontational'],
        5,
        1
      )

      testResults.push({
        test: 'Basic RAG Retrieval',
        success: true,
        chunksRetrieved: context.relevantChunks.length,
        patternsRetrieved: context.relevantPatterns.length
      })
    } catch (error) {
      testResults.push({
        test: 'Basic RAG Retrieval',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Test 2: System stats
    try {
      const stats = await voiceRAGSystem.getRAGSystemStats()
      testResults.push({
        test: 'System Stats',
        success: stats.totalChunks > 0,
        totalChunks: stats.totalChunks,
        systemHealth: stats.systemHealth
      })
    } catch (error) {
      testResults.push({
        test: 'System Stats',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }

    const successfulTests = testResults.filter(t => t.success).length
    const allTestsPassed = successfulTests === testResults.length

    return {
      testResults,
      successfulTests,
      totalTests: testResults.length,
      allTestsPassed
    }
  }

  /**
   * Step 6: Validate Performance
   */
  private async validatePerformance(): Promise<any> {
    logger.info('Validating RAG system performance')

    const performanceTests = []

    // Test response time
    const startTime = Date.now()
    try {
      await voiceRAGSystem.getVoiceContextForGeneration(
        'linkedin_post',
        ['business', 'leadership'],
        ['confrontational', 'storytelling'],
        8,
        1
      )
      const responseTime = Date.now() - startTime
      
      performanceTests.push({
        test: 'Response Time',
        success: responseTime < 5000, // Should be under 5 seconds
        responseTime,
        target: 5000
      })
    } catch (error) {
      performanceTests.push({
        test: 'Response Time',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Test system health
    try {
      const stats = await voiceRAGSystem.getRAGSystemStats()
      const healthScore = stats.systemHealth
      
      performanceTests.push({
        test: 'System Health',
        success: healthScore === 'excellent' || healthScore === 'good',
        systemHealth: healthScore,
        totalChunks: stats.totalChunks,
        avgQuality: stats.avgChunkQuality
      })
    } catch (error) {
      performanceTests.push({
        test: 'System Health',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }

    const allPerformanceTestsPassed = performanceTests.every(t => t.success)

    return {
      performanceTests,
      allTestsPassed: allPerformanceTestsPassed
    }
  }

  /**
   * Print setup progress
   */
  printProgress(): void {
    console.log('\n' + '='.repeat(60))
    console.log('RAG SYSTEM SETUP PROGRESS')
    console.log('='.repeat(60))
    
    this.setupSteps.forEach((step, index) => {
      const status = step.status === 'completed' ? '✅' :
                    step.status === 'running' ? '🔄' :
                    step.status === 'failed' ? '❌' : '⏳'
      
      const duration = step.duration ? `(${step.duration}ms)` : ''
      console.log(`${index + 1}. ${status} ${step.step} ${duration}`)
      
      if (step.error) {
        console.log(`   Error: ${step.error}`)
      }
    })
    
    console.log('='.repeat(60) + '\n')
  }
}

// Export for use in other scripts
export { RAGSystemSetup }

// Main execution function
export async function setupRAGSystem(options: {
  skipSchemaCheck?: boolean
  skipDataProcessing?: boolean
  batchSize?: number
  testAfterSetup?: boolean
} = {}): Promise<void> {
  const setup = new RAGSystemSetup()
  
  // Print initial progress
  setup.printProgress()
  
  const result = await setup.setupRAGSystem(options)
  
  // Print final results
  setup.printProgress()
  
  console.log('\n' + '='.repeat(60))
  console.log(result.summary)
  console.log('='.repeat(60))
  
  if (result.success) {
    console.log('🎉 RAG System is ready for use!')
    console.log('\nNext steps:')
    console.log('1. Test the system with: npm run test:rag')
    console.log('2. Generate content using the RAG-enhanced voice learning')
    console.log('3. Monitor system performance and optimize as needed')
  } else {
    console.log('❌ RAG System setup failed. Check the errors above.')
    console.log('\nTroubleshooting:')
    console.log('1. Ensure database migration has been applied')
    console.log('2. Verify OpenAI API key is configured')
    console.log('3. Check Supabase connection and permissions')
  }
  
  console.log('='.repeat(60) + '\n')
  
  if (!result.success) {
    process.exit(1)
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2)
  const options = {
    skipSchemaCheck: args.includes('--skip-schema'),
    skipDataProcessing: args.includes('--skip-processing'),
    batchSize: parseInt(args.find(arg => arg.startsWith('--batch='))?.split('=')[1] || '5'),
    testAfterSetup: !args.includes('--skip-tests')
  }

  setupRAGSystem(options).catch(error => {
    console.error('Setup failed:', error)
    process.exit(1)
  })
}