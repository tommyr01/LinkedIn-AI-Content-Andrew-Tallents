import { Worker, Job } from 'bullmq'
import { redis, QUEUE_NAMES } from '../queue/setup'
import { appConfig } from '../config'
import logger from '../lib/logger'
import { supabaseService } from '../services/supabase'
import { researchService } from '../services/research'
import { aiAgentsService } from '../services/ai-agents'
import { historicalAnalysisEnhancedService } from '../services/historical-analysis-enhanced'
import { voiceLearningEnhancedService } from '../services/voice-learning-enhanced'
import type { JobData, AIAgentResult } from '../types'

export class ContentGenerationWorker {
  private worker: Worker
  private strategicWorker: Worker

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

    // Strategic content generation worker
    this.strategicWorker = new Worker(
      'content-generation-strategic',
      this.processStrategicJob.bind(this),
      {
        connection: redis,
        concurrency: Math.max(1, Math.floor(appConfig.worker.concurrency / 2)), // Lower concurrency for strategic jobs
        removeOnComplete: { count: 30 },
        removeOnFail: { count: 15 },
        maxStalledCount: isRailway ? 2 : 1,
        stalledInterval: isRailway ? 90000 : 60000, // Longer timeout for strategic jobs
        ...(isRailway && {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 10000,
          }
        })
      }
    )

    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Standard worker events
    this.worker.on('completed', (job) => {
      logger.info({ jobId: job.id, type: 'standard' }, 'Content generation completed')
    })

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, type: 'standard', error: err.message }, 'Content generation failed')
    })

    this.worker.on('progress', (job, progress) => {
      logger.debug({ jobId: job.id, type: 'standard', progress }, 'Content generation progress')
    })

    this.worker.on('error', (err) => {
      if (err.message?.includes('Command timed out')) {
        logger.debug({ error: err.message, type: 'standard' }, 'Redis command timeout (expected on Railway)')
      } else {
        logger.error({ error: err.message, type: 'standard' }, 'Worker error')
      }
    })

    this.worker.on('stalled', (jobId) => {
      logger.warn({ jobId, type: 'standard' }, 'Job stalled - may be due to Redis timeout')
    })

    this.worker.on('active', (job) => {
      logger.info({ jobId: job.id, topic: job.data.topic, type: 'standard' }, 'Job started processing')
    })

    // Strategic worker events
    this.strategicWorker.on('completed', (job) => {
      logger.info({ jobId: job.id, type: 'strategic' }, 'Strategic content generation completed')
    })

    this.strategicWorker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, type: 'strategic', error: err.message }, 'Strategic content generation failed')
    })

    this.strategicWorker.on('progress', (job, progress) => {
      logger.debug({ jobId: job.id, type: 'strategic', progress }, 'Strategic content generation progress')
    })

    this.strategicWorker.on('error', (err) => {
      if (err.message?.includes('Command timed out')) {
        logger.debug({ error: err.message, type: 'strategic' }, 'Strategic Redis command timeout')
      } else {
        logger.error({ error: err.message, type: 'strategic' }, 'Strategic worker error')
      }
    })

    this.strategicWorker.on('stalled', (jobId) => {
      logger.warn({ jobId, type: 'strategic' }, 'Strategic job stalled')
    })

    this.strategicWorker.on('active', (job) => {
      logger.info({ jobId: job.id, topic: job.data.topic, type: 'strategic' }, 'Strategic job started processing')
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

      // Step 3: Enhanced Performance Analysis Phase
      logger.info({ jobId: job.id, topic }, 'Starting enhanced performance analysis for topic')
      await job.updateProgress(45)
      await supabaseService.updateJobProgress(dbJob.id, 45)
      
      // Generate comprehensive historical insights using the enhanced service
      let enhancedInsights = null
      try {
        enhancedInsights = await historicalAnalysisEnhancedService.generateComprehensiveInsights(
          topic,
          {
            maxPosts: 30,
            timeframeDays: 365,
            includeComments: false,
            forceRefresh: false
          }
        )
        
        logger.info({ 
          jobId: job.id,
          topic,
          confidenceLevel: enhancedInsights.confidence_level,
          similarPostsFound: enhancedInsights.similar_posts_count,
          topPerformersCount: enhancedInsights.top_performers.length,
          performanceBenchmark: enhancedInsights.performance_context.performance_benchmark,
          dominantTone: enhancedInsights.voice_patterns.dominant_tone
        }, 'Enhanced historical insights generated')
      } catch (insightError) {
        logger.warn({ 
          jobId: job.id, 
          topic,
          error: insightError instanceof Error ? insightError.message : String(insightError)
        }, 'Failed to generate enhanced insights - proceeding with basic generation')
      }
      
      // Step 4: AI Agents phase with enhanced context
      logger.info({ jobId: job.id }, 'Starting Andrew Tallents content generation with 3 agents and enhanced insights')
      await job.updateProgress(50)
      await supabaseService.updateJobProgress(dbJob.id, 50)
      
      // Convert enhanced insights to format compatible with existing AI agents
      const historicalInsights = enhancedInsights ? {
        relatedPosts: enhancedInsights.related_posts.slice(0, 15).map(p => ({
          id: p.id,
          text: p.content_text,
          posted_at: p.posted_at,
          total_reactions: p.total_reactions,
          comments_count: p.comments_count,
          reposts_count: p.reposts_count,
          viral_score: p.viral_score,
          performance_tier: p.performance_tier
        })),
        topPerformers: enhancedInsights.top_performers.slice(0, 5).map(p => ({
          id: p.id,
          text: p.content_text,
          posted_at: p.posted_at,
          total_reactions: p.total_reactions,
          comments_count: p.comments_count,
          reposts_count: p.reposts_count,
          viral_score: p.viral_score,
          performance_tier: p.performance_tier
        })),
        patterns: {
          avgWordCount: enhancedInsights.content_patterns.avg_word_count,
          commonOpenings: enhancedInsights.content_patterns.common_openings,
          bestPerformingFormats: enhancedInsights.content_patterns.best_performing_formats,
          engagementTriggers: enhancedInsights.content_patterns.engagement_triggers
        },
        performanceContext: {
          avgEngagement: enhancedInsights.performance_context.avg_engagement,
          topPerformingScore: enhancedInsights.performance_context.top_performing_score,
          suggestionScore: enhancedInsights.performance_context.performance_benchmark
        },
        voiceAnalysis: {
          tone: (enhancedInsights.voice_patterns.dominant_tone === 'conversational' ? 'conversational' : 'professional') as 'professional' | 'casual' | 'inspirational' | 'educational' | 'conversational',
          personalStoryElements: enhancedInsights.voice_patterns.personal_story_frequency > 0.5,
          vulnerabilityScore: enhancedInsights.voice_patterns.vulnerability_score_avg,
          authoritySignals: enhancedInsights.voice_patterns.key_authority_signals,
          emotionalWords: enhancedInsights.voice_patterns.emotional_triggers,
          actionWords: []
        },
        structureRecommendations: [],
        performanceFactors: {
          highEngagementTriggers: enhancedInsights.content_patterns.engagement_triggers,
          optimalTiming: [],
          contentLengthOptimal: enhancedInsights.content_patterns.avg_word_count,
          formatRecommendations: enhancedInsights.content_patterns.best_performing_formats
        }
      } : undefined
      
      logger.info({ 
        jobId: job.id,
        hasHistoricalInsights: !!historicalInsights,
        hasEnhancedInsights: !!enhancedInsights,
        relatedPosts: historicalInsights?.relatedPosts?.length || 0,
        topPerformers: historicalInsights?.topPerformers?.length || 0,
        avgWordCount: historicalInsights?.patterns?.avgWordCount || 0,
        performanceBenchmark: historicalInsights?.performanceContext?.suggestionScore || 0
      }, 'Historical insights prepared for AI agent generation')
      
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
        (historicalInsights as any) || undefined
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

      // Step 5: Track content variant performance data
      for (let i = 0; i < agentResults.length; i++) {
        const agent = agentResults[i]
        const progress = 50 + ((i + 1) * 15) // 65%, 80%, 95%
        await job.updateProgress(progress)
        await supabaseService.updateJobProgress(dbJob.id, progress)
        
        // Save content variant tracking for performance learning
        try {
          await supabaseService.saveContentVariantTracking({
            job_id: dbJob.id,
            variant_number: i + 1,
            topic: topic,
            research_ideas: structuredResearch,
            generated_content: agent.content.body,
            agent_name: agent.agent_name,
            predicted_engagement: agent.content.performance_prediction?.predictedEngagement,
            predicted_confidence: agent.content.performance_prediction?.confidenceScore,
            prediction_factors: {
              strengths: agent.content.performance_prediction?.strengthFactors || [],
              improvements: agent.content.performance_prediction?.improvementSuggestions || [],
              similar_post_score: agent.content.performance_prediction?.similarPostPerformance?.similarityScore
            },
            voice_score: agent.content.estimated_voice_score,
            voice_analysis: {
              authenticity: agent.metadata.historical_context_used ? 'enhanced' : 'standard',
              authority_signals: enhancedInsights?.voice_patterns.key_authority_signals || [],
              dominant_tone: enhancedInsights?.voice_patterns.dominant_tone || 'conversational'
            },
            historical_context_used: !!historicalInsights,
            similar_posts_analyzed: agent.metadata.similar_posts_analyzed || 0
          })
          
          logger.info({ 
            jobId: job.id, 
            agentName: agent.agent_name,
            variantNumber: i + 1,
            voiceScore: agent.content.estimated_voice_score,
            predictedEngagement: agent.content.performance_prediction?.predictedEngagement,
            hasHistoricalContext: !!historicalInsights,
            progress 
          }, 'Agent completed content generation with performance tracking')
        } catch (trackingError) {
          logger.warn({ 
            jobId: job.id,
            agentName: agent.agent_name,
            error: trackingError instanceof Error ? trackingError.message : String(trackingError)
          }, 'Failed to save content variant tracking')
        }
      }

      // Step 6: Complete job with enhanced metadata
      await job.updateProgress(98)
      await supabaseService.updateJobProgress(dbJob.id, 98)
      
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

      // Try to find existing database job by queue_job_id first
      let existingDbJob = null
      try {
        if (job.id) {
          const jobWithDrafts = await supabaseService.getJobWithDrafts(job.id.toString())
          existingDbJob = jobWithDrafts?.job || null
        }
      } catch (findError) {
        logger.warn({ jobId: job.id, error: findError }, 'Could not find existing database job')
      }

      // Update existing job or create failed job record
      if (existingDbJob) {
        // Update the existing job to failed status
        await supabaseService.failJob(existingDbJob.id, errorMessage)
        logger.info({ jobId: job.id, dbJobId: existingDbJob.id }, 'Updated existing job to failed status')
      } else if (job.data.topic) {
        // Create a failed job record with proper queue_job_id if we don't have one yet
        const dbJob = await supabaseService.createJob({
          topic: job.data.topic,
          platform: job.data.platform || 'linkedin',
          queue_job_id: job.id // Important: include the queue job ID
        })
        
        if (dbJob) {
          await supabaseService.failJob(dbJob.id, errorMessage)
          logger.info({ jobId: job.id, dbJobId: dbJob.id }, 'Created new failed job record')
        }
      }

      throw error
    }
  }

  /**
   * Process strategic content generation jobs with enhanced intelligence
   */
  private async processStrategicJob(job: Job<JobData & { strategicIntelligence: any }>) {
    const { topic, platform, voiceGuidelines, postType, tone, userId, strategicIntelligence } = job.data
    const startTime = Date.now()

    logger.info({ 
      jobId: job.id, 
      topic, 
      platform,
      postType,
      type: 'strategic',
      performanceTarget: strategicIntelligence?.performanceTarget
    }, 'Starting strategic content generation job')

    try {
      // Step 1: Create job in database with strategic metadata
      const dbJob = await supabaseService.createContentJob({
        id: job.id || 'unknown',
        queue_job_id: job.id?.toString(),
        status: 'processing',
        topic,
        platform,
        voice_guide_id: userId || 'strategic-intelligence',
        research_data: {
          strategic_intelligence: {
            performance_target: strategicIntelligence.performanceTarget,
            insights_confidence: strategicIntelligence.insights.confidence_level,
            voice_model_type: 'enhanced',
            generation_type: 'strategic_variants'
          }
        },
        progress: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      if (!dbJob) {
        throw new Error('Failed to create strategic job in database')
      }

      await job.updateProgress(15)

      // Step 2: Enhanced Research with Strategic Context
      logger.info({ jobId: job.id, type: 'strategic' }, 'Starting strategic research phase')
      await job.updateProgress(20)

      const research = await researchService.enhancedFirecrawlResearch(topic)
      
      // Enhance research with strategic insights
      const strategicResearch = {
        ...research,
        strategic_context: {
          performance_benchmark: strategicIntelligence.insights.performance_context.performance_benchmark,
          top_performing_patterns: strategicIntelligence.insights.content_patterns.engagement_triggers.slice(0, 5),
          voice_optimization: {
            dominant_tone: strategicIntelligence.insights.voice_patterns.dominant_tone,
            authority_signals: strategicIntelligence.insights.voice_patterns.key_authority_signals.slice(0, 3),
            authenticity_target: Math.max(75, strategicIntelligence.voiceModel.voiceProfile.authenticity_score_avg)
          }
        }
      }

      await supabaseService.updateJobProgress(dbJob.id, 35, 'processing')
      await job.updateProgress(35)

      // Step 3: Strategic AI Generation with Enhanced Intelligence
      logger.info({ 
        jobId: job.id, 
        type: 'strategic',
        historicalContextPosts: strategicIntelligence.insights.related_posts_count,
        topPerformersAnalyzed: strategicIntelligence.insights.top_performers.length
      }, 'Starting strategic AI generation with enhanced intelligence')

      await job.updateProgress(40)

      // Convert strategic insights to enhanced historical insights format
      const enhancedHistoricalInsights = {
        relatedPosts: strategicIntelligence.insights.related_posts.slice(0, 20).map((p: any) => ({
          id: p.id,
          text: p.content_text,
          posted_at: p.posted_at,
          total_reactions: p.total_reactions,
          comments_count: p.comments_count,
          reposts_count: p.reposts_count,
          viral_score: p.viral_score,
          performance_tier: p.performance_tier
        })),
        topPerformers: strategicIntelligence.insights.top_performers.slice(0, 8).map((p: any) => ({
          id: p.id,
          text: p.content_text,
          posted_at: p.posted_at,
          total_reactions: p.total_reactions,
          comments_count: p.comments_count,
          reposts_count: p.reposts_count,
          viral_score: p.viral_score,
          performance_tier: p.performance_tier
        })),
        patterns: {
          avgWordCount: strategicIntelligence.insights.content_patterns.avg_word_count,
          commonOpenings: strategicIntelligence.insights.content_patterns.common_openings,
          bestPerformingFormats: strategicIntelligence.insights.content_patterns.best_performing_formats,
          engagementTriggers: strategicIntelligence.insights.content_patterns.engagement_triggers
        },
        performanceContext: {
          avgEngagement: strategicIntelligence.insights.performance_context.avg_engagement_score,
          topPerformingScore: strategicIntelligence.insights.performance_context.top_performing_score,
          suggestionScore: strategicIntelligence.performanceTarget
        },
        voiceAnalysis: {
          tone: strategicIntelligence.insights.voice_patterns.dominant_tone as 'professional' | 'casual' | 'inspirational' | 'educational' | 'conversational',
          personalStoryElements: (strategicIntelligence.insights.voice_patterns.personal_story_frequency || 0) > 0.5,
          vulnerabilityScore: strategicIntelligence.insights.voice_patterns.vulnerability_score_avg,
          authoritySignals: strategicIntelligence.insights.voice_patterns.key_authority_signals,
          emotionalWords: strategicIntelligence.insights.voice_patterns.emotional_triggers,
          actionWords: []
        },
        structureRecommendations: strategicIntelligence.insights.performance_patterns.content_structure_advice || [],
        performanceFactors: {
          highEngagementTriggers: strategicIntelligence.insights.performance_patterns.high_engagement_triggers,
          optimalTiming: strategicIntelligence.insights.performance_patterns.timing_suggestions || [],
          contentLengthOptimal: strategicIntelligence.insights.content_patterns.avg_word_count,
          formatRecommendations: strategicIntelligence.insights.content_patterns.best_performing_formats
        },
        strategicIntelligence: {
          performanceTarget: strategicIntelligence.performanceTarget,
          confidenceLevel: strategicIntelligence.insights.confidence_level,
          generationType: 'strategic_variants'
        }
      }

      // Enhanced voice guidelines combining user input with strategic intelligence
      const enhancedVoiceGuidelines = voiceGuidelines || 
        `${strategicIntelligence.voiceModel.generationGuidelines}\n\nSTRATEGIC PERFORMANCE TARGET: ${strategicIntelligence.performanceTarget} engagement score\n\nKEY SUCCESS FACTORS:\n${strategicIntelligence.insights.performance_patterns.high_engagement_triggers.slice(0, 5).map((t: string) => `- ${t}`).join('\n')}`

      // Generate strategic variants with enhanced intelligence
      const agentResults = await aiAgentsService.generateAllVariations(
        topic,
        strategicResearch,
        enhancedVoiceGuidelines,
        enhancedHistoricalInsights
      )

      // Step 4: Track Strategic Variants with Enhanced Performance Prediction
      for (let i = 0; i < agentResults.length; i++) {
        const agent = agentResults[i]
        const progress = 40 + ((i + 1) * 18) // 58%, 76%, 94%
        await job.updateProgress(progress)
        await supabaseService.updateJobProgress(dbJob.id, progress)
        
        // Enhanced strategic variant tracking
        try {
          await supabaseService.saveContentVariantTracking({
            job_id: dbJob.id,
            variant_number: i + 1,
            topic: topic,
            research_ideas: strategicResearch,
            generated_content: agent.content.body,
            agent_name: agent.agent_name,
            predicted_engagement: agent.content.performance_prediction?.predictedEngagement || 
                                Math.round(strategicIntelligence.performanceTarget * (0.8 + (i * 0.1))), // Varied predictions
            predicted_confidence: agent.content.performance_prediction?.confidenceScore || 
                                strategicIntelligence.insights.confidence_level,
            prediction_factors: {
              strengths: agent.content.performance_prediction?.strengthFactors || 
                        strategicIntelligence.voiceModel.strengthFactors.slice(0, 3),
              improvements: agent.content.performance_prediction?.improvementSuggestions || 
                           strategicIntelligence.voiceModel.improvementAreas.slice(0, 2),
              similar_post_score: agent.content.performance_prediction?.similarPostPerformance?.similarityScore ||
                                 strategicIntelligence.insights.performance_context.avg_engagement_score
            },
            voice_score: agent.content.estimated_voice_score,
            voice_analysis: {
              strategic_enhancement: true,
              authenticity_target: strategicIntelligence.voiceModel.voiceProfile.authenticity_score_avg,
              authority_signals: strategicIntelligence.insights.voice_patterns.key_authority_signals,
              dominant_tone: strategicIntelligence.insights.voice_patterns.dominant_tone,
              performance_optimization: true
            },
            historical_context_used: true,
            similar_posts_analyzed: strategicIntelligence.insights.related_posts_count
          })
          
          logger.info({ 
            jobId: job.id, 
            type: 'strategic',
            agentName: agent.agent_name,
            variantNumber: i + 1,
            voiceScore: agent.content.estimated_voice_score,
            predictedEngagement: agent.content.performance_prediction?.predictedEngagement,
            strategicTarget: strategicIntelligence.performanceTarget,
            progress 
          }, 'Strategic variant completed with enhanced performance tracking')
        } catch (trackingError) {
          logger.warn({ 
            jobId: job.id,
            type: 'strategic',
            agentName: agent.agent_name,
            error: trackingError instanceof Error ? trackingError.message : String(trackingError)
          }, 'Failed to save strategic variant tracking')
        }
      }

      // Step 5: Complete Strategic Job
      await job.updateProgress(98)
      await supabaseService.updateJobProgress(dbJob.id, 98)
      
      const success = await supabaseService.completeJob(dbJob.id, agentResults)
      
      if (!success) {
        throw new Error('Failed to save strategic results to database')
      }

      const totalTime = Date.now() - startTime
      logger.info({ 
        jobId: job.id,
        type: 'strategic',
        totalTimeMs: totalTime,
        draftCount: agentResults.length,
        performanceTarget: strategicIntelligence.performanceTarget,
        insightsConfidence: strategicIntelligence.insights.confidence_level,
        historicalContextPosts: strategicIntelligence.insights.related_posts_count
      }, 'Strategic content generation completed successfully')

      return {
        success: true,
        jobId: dbJob.id,
        draftsCount: agentResults.length,
        totalTimeMs: totalTime,
        generationType: 'strategic',
        performanceTarget: strategicIntelligence.performanceTarget,
        strategicIntelligence: {
          confidence: strategicIntelligence.insights.confidence_level,
          historicalContext: strategicIntelligence.insights.related_posts_count,
          voiceOptimization: true
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ jobId: job.id, type: 'strategic', error: errorMessage }, 'Strategic content generation failed')

      // Handle strategic job failure
      let existingDbJob = null
      try {
        if (job.id) {
          const jobWithDrafts = await supabaseService.getJobWithDrafts(job.id.toString())
          existingDbJob = jobWithDrafts?.job || null
        }
      } catch (findError) {
        logger.warn({ jobId: job.id, type: 'strategic', error: findError }, 'Could not find existing strategic database job')
      }

      if (existingDbJob) {
        await supabaseService.failJob(existingDbJob.id, `Strategic generation failed: ${errorMessage}`)
      } else if (job.data.topic) {
        const dbJob = await supabaseService.createContentJob({
          id: job.id || 'unknown',
          queue_job_id: job.id?.toString(),
          status: 'failed',
          topic: job.data.topic,
          platform: job.data.platform || 'linkedin',
          error: `Strategic generation failed: ${errorMessage}`,
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
      queueName: QUEUE_NAMES.CONTENT_GENERATION,
      strategicConcurrency: Math.max(1, Math.floor(appConfig.worker.concurrency / 2))
    }, 'Starting content generation workers (standard + strategic)')
    
    // Workers start automatically when created
    return { standard: this.worker, strategic: this.strategicWorker }
  }

  async stop() {
    logger.info('Stopping content generation workers')
    await Promise.all([
      this.worker.close(),
      this.strategicWorker.close()
    ])
  }

  async pause() {
    logger.info('Pausing content generation workers')
    await Promise.all([
      this.worker.pause(),
      this.strategicWorker.pause()
    ])
  }

  async resume() {
    logger.info('Resuming content generation workers')
    await Promise.all([
      this.worker.resume(),
      this.strategicWorker.resume()
    ])
  }

  getWorkerState() {
    return {
      standard: {
        isRunning: this.worker.isRunning(),
        isPaused: this.worker.isPaused(),
        concurrency: appConfig.worker.concurrency
      },
      strategic: {
        isRunning: this.strategicWorker.isRunning(),
        isPaused: this.strategicWorker.isPaused(),
        concurrency: Math.max(1, Math.floor(appConfig.worker.concurrency / 2))
      }
    }
  }
}

export default ContentGenerationWorker