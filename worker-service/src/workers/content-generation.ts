import { Worker, Job } from 'bullmq'
import { redis, QUEUE_NAMES } from '../queue/setup'
import { appConfig } from '../config'
import logger from '../lib/logger'
import { supabaseService } from '../services/supabase'
import { researchService } from '../services/research'
import { aiAgentsService } from '../services/ai-agents'
import type { JobData, AIAgentResult } from '../types'

export class ContentGenerationWorker {
  private worker: Worker

  constructor() {
    // Railway-optimized worker settings
    const isRailway = process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_NAME
    
    this.worker = new Worker(
      QUEUE_NAMES.CONTENT_GENERATION,
      this.processJob.bind(this),
      {
        connection: redis,
        concurrency: appConfig.worker.concurrency,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 20 },
        // Railway-specific optimizations
        maxStalledCount: isRailway ? 2 : 1, // More tolerance for stalled jobs on Railway
        stalledInterval: isRailway ? 60000 : 30000, // Longer stalled check interval for Railway
        ...(isRailway && {
          // Reduce Redis polling to minimize timeouts on Railway
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 5000,
          }
        })
      }
    )

    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.worker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Content generation completed')
    })

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, error: err.message }, 'Content generation failed')
    })

    this.worker.on('progress', (job, progress) => {
      logger.debug({ jobId: job.id, progress }, 'Content generation progress')
    })

    this.worker.on('error', (err) => {
      // Don't log Redis timeout errors as errors since they're expected on Railway
      if (err.message?.includes('Command timed out')) {
        logger.debug({ error: err.message }, 'Redis command timeout (expected on Railway)')
      } else {
        logger.error({ error: err.message }, 'Worker error')
      }
    })

    // Add Railway-specific connection monitoring
    this.worker.on('stalled', (jobId) => {
      logger.warn({ jobId }, 'Job stalled - may be due to Redis timeout')
    })

    this.worker.on('active', (job) => {
      logger.info({ jobId: job.id, topic: job.data.topic }, 'Job started processing')
    })
  }

  private async processJob(job: Job<JobData>) {
    const { topic, platform, voiceGuidelines, postType, tone, userId } = job.data
    const startTime = Date.now()

    logger.info({ 
      jobId: job.id, 
      topic, 
      platform,
      postType 
    }, 'Starting content generation job')

    try {
      // Step 1: Create job in database with queue job ID
      const dbJob = await supabaseService.createJob({
        topic,
        platform,
        voice_guide_id: userId,
        queue_job_id: job.id // Store the queue job ID in the database
      })

      if (!dbJob) {
        throw new Error('Failed to create job in database')
      }

      // Update job progress: Job created
      await job.updateProgress(10)
      await supabaseService.updateJobProgress(dbJob.id, 10, 'processing')

      // Step 2: Enhanced Research phase
      logger.info({ jobId: job.id, topic }, 'Starting enhanced research phase')
      await job.updateProgress(15)
      await supabaseService.updateJobProgress(dbJob.id, 15)

      const research = await researchService.enhancedFirecrawlResearch(topic)
      
      const researchData = {
        research_ideas: research,
        timestamp: new Date().toISOString(),
        method: 'enhanced_firecrawl'
      }

      await supabaseService.updateJobResearchData(dbJob.id, researchData)
      await job.updateProgress(40)
      await supabaseService.updateJobProgress(dbJob.id, 40)

      logger.info({ 
        jobId: job.id, 
        ideasFound: 3
      }, 'Enhanced research phase completed')

      // Step 3: AI Agents phase
      logger.info({ jobId: job.id }, 'Starting Andrew Tallents content generation with 3 agents')
      
      // Get historical insights from research if available
      const historicalInsights = research.historicalInsights || null
      
      logger.info({ 
        jobId: job.id,
        hasHistoricalInsights: !!historicalInsights,
        relatedPosts: historicalInsights?.relatedPosts?.length || 0,
        topPerformers: historicalInsights?.topPerformers?.length || 0,
        contextSize: historicalInsights ? JSON.stringify(historicalInsights).length : 0
      }, 'Historical insights for AI agent generation')
      
      // FIX: Convert string research to structured objects if needed (PRODUCTION FIX)
      let structuredResearch: any = research
      if (typeof research.idea_1 === 'string') {
        logger.info({ jobId: job.id }, 'PRODUCTION: Converting string research data to structured objects')
        
        const stringResearch = research as any
        structuredResearch = {
          idea_1: {
            concise_summary: stringResearch.idea_1,
            angle_approach: `How this ${topic} development reveals self-leadership challenges`,
            details: `Key insights: ${stringResearch.idea_1}`,
            relevance: `This impacts UK CEOs who struggle with self-leadership while scaling their businesses.`
          },
          idea_2: {
            concise_summary: stringResearch.idea_2,
            angle_approach: `The connection between ${topic} and authentic leadership`,
            details: `Research shows: ${stringResearch.idea_2}`,
            relevance: `Relevant for founders feeling stuck despite outward success.`
          },
          idea_3: {
            concise_summary: stringResearch.idea_3,
            angle_approach: `Why traditional approaches to ${topic} fail for leaders`,
            details: `Analysis reveals: ${stringResearch.idea_3}`,
            relevance: `Critical for leaders seeking practical solutions without slowing down.`
          }
        }
        
        logger.info({ jobId: job.id }, 'PRODUCTION: Successfully converted research to structured format')
      }

      // Log memory usage before AI generation
      const memoryBefore = process.memoryUsage()
      logger.info({ 
        jobId: job.id,
        memoryBefore: {
          heapUsed: Math.round(memoryBefore.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryBefore.heapTotal / 1024 / 1024),
          rss: Math.round(memoryBefore.rss / 1024 / 1024)
        }
      }, 'Memory usage before AI agent generation')
      
      const agentResults = await aiAgentsService.generateAllVariations(
        topic,
        structuredResearch, // Use structured research instead of raw research
        voiceGuidelines,
        historicalInsights
      )
      
      // Log memory usage after AI generation
      const memoryAfter = process.memoryUsage()
      logger.info({ 
        jobId: job.id,
        memoryAfter: {
          heapUsed: Math.round(memoryAfter.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryAfter.heapTotal / 1024 / 1024),
          rss: Math.round(memoryAfter.rss / 1024 / 1024)
        },
        memoryDelta: {
          heapUsed: Math.round((memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024),
          rss: Math.round((memoryAfter.rss - memoryBefore.rss) / 1024 / 1024)
        },
        agentResultsCount: agentResults.length
      }, 'Memory usage after AI agent generation')

      // Update progress for each completed agent
      for (let i = 0; i < agentResults.length; i++) {
        const progress = 40 + ((i + 1) * 20) // 60%, 80%, 100%
        await job.updateProgress(progress)
        await supabaseService.updateJobProgress(dbJob.id, progress)
        
        logger.info({ 
          jobId: job.id, 
          agentName: agentResults[i].agent_name,
          voiceScore: agentResults[i].content.estimated_voice_score,
          progress 
        }, 'Agent completed content generation')
      }

      // Step 4: Complete job
      const success = await supabaseService.completeJob(dbJob.id, agentResults)
      
      if (!success) {
        throw new Error('Failed to save results to database')
      }

      const totalTime = Date.now() - startTime
      logger.info({ 
        jobId: job.id, 
        totalTimeMs: totalTime,
        draftCount: agentResults.length,
        researchMethod: researchData.method 
      }, 'Content generation completed successfully')

      return {
        success: true,
        jobId: dbJob.id,
        draftsCount: agentResults.length,
        totalTimeMs: totalTime,
        researchMethod: researchData.method
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ jobId: job.id, error: errorMessage }, 'Content generation failed')

      // Try to update job status in database
      if (job.data.topic) {
        // Create a failed job record if we don't have a database job yet
        const dbJob = await supabaseService.createJob({
          topic: job.data.topic,
          platform: job.data.platform || 'linkedin'
        })
        
        if (dbJob) {
          await supabaseService.failJob(dbJob.id, errorMessage)
        }
      }

      throw error
    }
  }

  async start() {
    logger.info({ 
      concurrency: appConfig.worker.concurrency,
      queueName: QUEUE_NAMES.CONTENT_GENERATION 
    }, 'Starting content generation worker')
    
    // Worker starts automatically when created
    return this.worker
  }

  async stop() {
    logger.info('Stopping content generation worker')
    await this.worker.close()
  }

  async pause() {
    logger.info('Pausing content generation worker')
    await this.worker.pause()
  }

  async resume() {
    logger.info('Resuming content generation worker')
    await this.worker.resume()
  }

  getWorkerState() {
    return {
      isRunning: this.worker.isRunning(),
      isPaused: this.worker.isPaused(),
      concurrency: appConfig.worker.concurrency
    }
  }
}

export default ContentGenerationWorker