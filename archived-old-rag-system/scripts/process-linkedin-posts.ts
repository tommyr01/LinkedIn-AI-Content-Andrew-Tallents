#!/usr/bin/env node

/**
 * LinkedIn Posts Processing Script
 * 
 * Processes Andrew's LinkedIn posts into semantic RAG chunks for authentic voice extraction.
 * This script is the critical bridge between raw LinkedIn content and the AI content generation system.
 * 
 * Key Functions:
 * - Fetches all unprocessed LinkedIn posts from the database
 * - Uses LinkedInPostProcessor for semantic chunking (not fixed-length)
 * - Extracts Andrew's authentic voice patterns during processing
 * - Generates embeddings for each chunk
 * - Stores processed chunks in linkedin_post_chunks table
 * - Provides detailed progress tracking and summary statistics
 * 
 * Usage:
 *   npm run script:process-linkedin-posts
 *   or
 *   node -r tsx/cjs src/scripts/process-linkedin-posts.ts
 */

import { config } from 'dotenv'
import path from 'path'
import logger from '../lib/logger'
import { linkedInPostProcessor } from '../services/linkedin-post-processor'
import { supabaseService } from '../services/supabase'

// Load environment variables
config({ path: path.join(__dirname, '../../.env') })

interface ScriptOptions {
  batchSize?: number
  maxPosts?: number
  forceReprocess?: boolean
  specificPostId?: string
  minEngagement?: number
  dryRun?: boolean
}

interface ProcessingStats {
  totalPosts: number
  processedPosts: number
  totalChunks: number
  avgChunksPerPost: number
  avgAuthenticityScore: number
  highAuthenticityChunks: number
  patternTypesFound: Set<string>
  voiceMarkersFound: Set<string>
  errors: Array<{ postId: string; error: string }>
  processingTimeMs: number
  embeddingTokensUsed: number
}

class LinkedInPostsProcessor {
  private stats: ProcessingStats = {
    totalPosts: 0,
    processedPosts: 0,
    totalChunks: 0,
    avgChunksPerPost: 0,
    avgAuthenticityScore: 0,
    highAuthenticityChunks: 0,
    patternTypesFound: new Set(),
    voiceMarkersFound: new Set(),
    errors: [],
    processingTimeMs: 0,
    embeddingTokensUsed: 0
  }

  async run(options: ScriptOptions = {}): Promise<void> {
    const startTime = Date.now()
    
    logger.info({
      options,
      scriptVersion: '1.0.0'
    }, 'Starting LinkedIn posts processing for RAG integration')

    try {
      // Check database connection
      await this.validateDatabaseConnection()

      // Check for existing chunks table
      await this.ensureChunksTableExists()

      // Process posts
      if (options.specificPostId) {
        await this.processSpecificPost(options.specificPostId, options)
      } else {
        await this.processAllPosts(options)
      }

      // Calculate final statistics
      this.stats.processingTimeMs = Date.now() - startTime
      this.calculateFinalStats()

      // Display results
      await this.displayResults(options.dryRun || false)

      // Update performance stats
      if (!options.dryRun) {
        await this.updatePerformanceStats()
      }

      logger.info({
        stats: this.stats,
        duration: `${this.stats.processingTimeMs}ms`
      }, 'LinkedIn posts processing completed successfully')

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      }, 'LinkedIn posts processing failed')
      throw error
    }
  }

  /**
   * Validate database connection and required services
   */
  private async validateDatabaseConnection(): Promise<void> {
    try {
      const { data, error } = await supabaseService.client
        .from('linkedin_posts')
        .select('id')
        .limit(1)

      if (error) {
        throw new Error(`Database connection failed: ${error.message}`)
      }

      logger.info('Database connection validated successfully')
    } catch (error) {
      logger.error({ error }, 'Failed to validate database connection')
      throw error
    }
  }

  /**
   * Ensure the linkedin_post_chunks table exists
   */
  private async ensureChunksTableExists(): Promise<void> {
    try {
      const { error } = await supabaseService.client
        .from('linkedin_post_chunks')
        .select('id')
        .limit(1)

      if (error) {
        logger.warn({ error }, 'linkedin_post_chunks table may not exist, attempting to create schema')
        
        // Check if we need to run migrations
        const migrationNeeded = error.message.includes('relation "linkedin_post_chunks" does not exist')
        
        if (migrationNeeded) {
          logger.error('linkedin_post_chunks table does not exist. Please run database migrations first.')
          throw new Error('Missing linkedin_post_chunks table. Run: npm run db:migrate')
        }
      }

      logger.info('linkedin_post_chunks table verified')
    } catch (error) {
      logger.error({ error }, 'Failed to verify chunks table')
      throw error
    }
  }

  /**
   * Process all LinkedIn posts
   */
  private async processAllPosts(options: ScriptOptions): Promise<void> {
    logger.info('Starting bulk LinkedIn posts processing')

    try {
      // Get posts to process
      const posts = await this.getPostsToProcess(options)
      this.stats.totalPosts = posts.length

      logger.info({
        postsFound: posts.length,
        minEngagement: options.minEngagement || 0,
        maxPosts: options.maxPosts || 'unlimited'
      }, 'Found LinkedIn posts for processing')

      if (posts.length === 0) {
        logger.info('No posts found that need processing')
        return
      }

      // Process in batches
      const batchSize = options.batchSize || 5
      let processedCount = 0

      for (let i = 0; i < posts.length; i += batchSize) {
        const batch = posts.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(posts.length / batchSize)

        logger.info({
          batchNumber,
          totalBatches,
          batchSize: batch.length,
          progressPercent: Math.round((i / posts.length) * 100)
        }, 'Processing batch')

        // Process batch
        const batchResults = await Promise.allSettled(
          batch.map(post => this.processSinglePost(post, options))
        )

        // Track results
        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j]
          const post = batch[j]

          if (result.status === 'fulfilled') {
            this.updateStatsFromResult(result.value)
            processedCount++
          } else {
            logger.error({
              postId: post.id,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason)
            }, 'Failed to process post in batch')

            this.stats.errors.push({
              postId: post.id,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason)
            })
          }
        }

        // Progress update
        logger.info({
          processed: processedCount,
          total: posts.length,
          successRate: `${Math.round((processedCount / (i + batch.length)) * 100)}%`,
          errors: this.stats.errors.length
        }, 'Batch processing progress')

        // Rate limiting pause
        if (i + batchSize < posts.length) {
          await new Promise(resolve => setTimeout(resolve, 1500))
        }
      }

      this.stats.processedPosts = processedCount

    } catch (error) {
      logger.error({ error }, 'Failed to process all posts')
      throw error
    }
  }

  /**
   * Process a specific post by ID
   */
  private async processSpecificPost(postId: string, options: ScriptOptions): Promise<void> {
    logger.info({ postId }, 'Processing specific LinkedIn post')

    try {
      const { data: post, error } = await supabaseService.client
        .from('linkedin_posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (error || !post) {
        throw new Error(`Post not found: ${postId}`)
      }

      this.stats.totalPosts = 1
      const result = await this.processSinglePost(post, options)
      
      this.updateStatsFromResult(result)
      this.stats.processedPosts = 1

      logger.info({ 
        postId,
        result 
      }, 'Specific post processed successfully')

    } catch (error) {
      logger.error({ 
        postId,
        error: error instanceof Error ? error.message : String(error)
      }, 'Failed to process specific post')
      
      this.stats.errors.push({
        postId,
        error: error instanceof Error ? error.message : String(error)
      })
      
      throw error
    }
  }

  /**
   * Get posts that need processing
   */
  private async getPostsToProcess(options: ScriptOptions): Promise<any[]> {
    let query = supabaseService.client
      .from('linkedin_posts')
      .select(`
        id,
        text,
        posted_at,
        total_reactions,
        like_count,
        comments_count,
        reposts_count,
        author_first_name,
        author_last_name
      `)
      .not('text', 'is', null)
      .gte('total_reactions', options.minEngagement || 5) // Focus on posts with some engagement
      .order('posted_at', { ascending: false })

    if (options.maxPosts) {
      query = query.limit(options.maxPosts)
    } else {
      query = query.limit(200) // Reasonable default limit
    }

    const { data: posts, error } = await query

    if (error) {
      throw new Error(`Failed to fetch posts: ${error.message}`)
    }

    if (!posts || posts.length === 0) {
      return []
    }

    // Filter out already processed posts unless force reprocessing
    if (!options.forceReprocess) {
      const processedPostIds = await this.getProcessedPostIds()
      return posts.filter(post => 
        !processedPostIds.has(post.id) && 
        post.text && 
        post.text.length > 50 // Minimum content length
      )
    }

    return posts.filter(post => post.text && post.text.length > 50)
  }

  /**
   * Get IDs of posts that have already been processed
   */
  private async getProcessedPostIds(): Promise<Set<string>> {
    const { data: processedChunks, error } = await supabaseService.client
      .from('linkedin_post_chunks')
      .select('post_id')

    if (error) {
      logger.warn({ error }, 'Failed to fetch processed post IDs, proceeding with empty set')
      return new Set()
    }

    return new Set(processedChunks?.map(chunk => chunk.post_id) || [])
  }

  /**
   * Process a single post using LinkedInPostProcessor
   */
  private async processSinglePost(post: any, options: ScriptOptions): Promise<any> {
    if (options.dryRun) {
      logger.info({ postId: post.id, textLength: post.text?.length }, 'DRY RUN: Would process post')
      
      // Simulate processing for stats
      return {
        postId: post.id,
        chunksCreated: Math.floor(Math.random() * 5) + 2, // 2-6 chunks
        totalTokens: Math.floor(Math.random() * 1000) + 500,
        avgAuthenticityScore: Math.floor(Math.random() * 40) + 60, // 60-100
        patternTypesFound: ['confrontational', 'question', 'storytelling'],
        processingTime: Math.floor(Math.random() * 5000) + 1000,
        success: true
      }
    }

    return await linkedInPostProcessor.processSpecificPost(post.id)
  }

  /**
   * Update processing statistics from a single result
   */
  private updateStatsFromResult(result: any): void {
    if (!result.success) {
      return
    }

    this.stats.totalChunks += result.chunksCreated
    this.stats.embeddingTokensUsed += result.totalTokens

    // Track authenticity scores
    if (result.avgAuthenticityScore >= 75) {
      this.stats.highAuthenticityChunks += result.chunksCreated
    }

    // Track pattern types found
    result.patternTypesFound?.forEach((pattern: string) => {
      this.stats.patternTypesFound.add(pattern)
    })

    // Track voice markers (if available in the result)
    if (result.voiceMarkersFound) {
      result.voiceMarkersFound.forEach((marker: string) => {
        this.stats.voiceMarkersFound.add(marker)
      })
    }
  }

  /**
   * Calculate final aggregated statistics
   */
  private calculateFinalStats(): void {
    if (this.stats.processedPosts > 0) {
      this.stats.avgChunksPerPost = Math.round((this.stats.totalChunks / this.stats.processedPosts) * 10) / 10
    }

    // Calculate average authenticity from database if we have processed posts
    if (this.stats.totalChunks > 0) {
      this.stats.avgAuthenticityScore = Math.round(
        (this.stats.highAuthenticityChunks / this.stats.totalChunks) * 100
      )
    }
  }

  /**
   * Display processing results
   */
  private async displayResults(isDryRun: boolean): Promise<void> {
    const prefix = isDryRun ? '[DRY RUN] ' : ''
    
    console.log(`\n${prefix}🎯 LinkedIn Posts Processing Results`)
    console.log('=' .repeat(50))
    console.log(`📊 Posts processed: ${this.stats.processedPosts}/${this.stats.totalPosts}`)
    console.log(`🧩 Total chunks created: ${this.stats.totalChunks}`)
    console.log(`📈 Average chunks per post: ${this.stats.avgChunksPerPost}`)
    console.log(`🎭 High authenticity chunks: ${this.stats.highAuthenticityChunks}/${this.stats.totalChunks}`)
    console.log(`⏱️  Processing time: ${(this.stats.processingTimeMs / 1000).toFixed(2)}s`)
    console.log(`🤖 Embedding tokens used: ${this.stats.embeddingTokensUsed.toLocaleString()}`)
    
    if (this.stats.errors.length > 0) {
      console.log(`❌ Errors: ${this.stats.errors.length}`)
      this.stats.errors.slice(0, 5).forEach(error => {
        console.log(`   • ${error.postId}: ${error.error}`)
      })
      if (this.stats.errors.length > 5) {
        console.log(`   ... and ${this.stats.errors.length - 5} more`)
      }
    }

    console.log('\n📋 Voice Patterns Found:')
    Array.from(this.stats.patternTypesFound).slice(0, 8).forEach(pattern => {
      console.log(`   • ${pattern}`)
    })

    if (this.stats.voiceMarkersFound.size > 0) {
      console.log('\n🎤 Voice Markers Detected:')
      Array.from(this.stats.voiceMarkersFound).slice(0, 5).forEach(marker => {
        console.log(`   • ${marker}`)
      })
    }

    // Success rate
    const successRate = this.stats.totalPosts > 0 
      ? Math.round((this.stats.processedPosts / this.stats.totalPosts) * 100)
      : 0

    console.log(`\n✅ Success Rate: ${successRate}%`)

    if (!isDryRun && this.stats.totalChunks > 0) {
      console.log('\n🚀 Ready for RAG-powered content generation!')
      console.log('   Andrew\'s authentic voice patterns are now available for AI content creation.')
    }
  }

  /**
   * Update performance statistics in database
   */
  private async updatePerformanceStats(): Promise<void> {
    try {
      const performanceData = {
        last_processing_run: new Date().toISOString(),
        unique_posts_processed: this.stats.processedPosts,
        total_chunks_created: this.stats.totalChunks,
        avg_chunks_per_post: this.stats.avgChunksPerPost,
        high_authenticity_chunk_rate: this.stats.totalChunks > 0 
          ? this.stats.highAuthenticityChunks / this.stats.totalChunks 
          : 0,
        pattern_types_found: Array.from(this.stats.patternTypesFound),
        processing_time_ms: this.stats.processingTimeMs,
        error_rate: this.stats.totalPosts > 0 
          ? this.stats.errors.length / this.stats.totalPosts 
          : 0,
        embedding_tokens_used: this.stats.embeddingTokensUsed
      }

      const { error } = await supabaseService.client
        .from('linkedin_rag_performance_stats')
        .upsert(performanceData, { onConflict: 'id' })

      if (error) {
        logger.warn({ error }, 'Failed to update performance stats, but processing completed successfully')
      } else {
        logger.info('Performance statistics updated successfully')
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to update performance stats')
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArguments(): ScriptOptions {
  const args = process.argv.slice(2)
  const options: ScriptOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    switch (arg) {
      case '--batch-size':
        if (nextArg && !isNaN(Number(nextArg))) {
          options.batchSize = Number(nextArg)
          i++
        }
        break
      case '--max-posts':
        if (nextArg && !isNaN(Number(nextArg))) {
          options.maxPosts = Number(nextArg)
          i++
        }
        break
      case '--min-engagement':
        if (nextArg && !isNaN(Number(nextArg))) {
          options.minEngagement = Number(nextArg)
          i++
        }
        break
      case '--post-id':
        if (nextArg) {
          options.specificPostId = nextArg
          i++
        }
        break
      case '--force-reprocess':
        options.forceReprocess = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--help':
        console.log(`
LinkedIn Posts Processor

Usage: node process-linkedin-posts.ts [options]

Options:
  --batch-size <number>       Number of posts to process in each batch (default: 5)
  --max-posts <number>        Maximum number of posts to process (default: 200)
  --min-engagement <number>   Minimum engagement threshold (default: 5)
  --post-id <string>         Process a specific post by ID
  --force-reprocess          Reprocess posts that were already processed
  --dry-run                  Run without actually processing (for testing)
  --help                     Show this help message

Examples:
  npm run script:process-linkedin-posts
  npm run script:process-linkedin-posts -- --batch-size 3 --max-posts 50
  npm run script:process-linkedin-posts -- --post-id abc123 --force-reprocess
  npm run script:process-linkedin-posts -- --dry-run
        `)
        process.exit(0)
    }
  }

  return options
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    const options = parseArguments()
    
    logger.info({
      scriptName: 'process-linkedin-posts',
      version: '1.0.0',
      options
    }, 'Script started')

    const processor = new LinkedInPostsProcessor()
    await processor.run(options)

    logger.info('Script completed successfully')
    process.exit(0)

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Script failed')

    console.error('\n❌ Processing failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { LinkedInPostsProcessor }