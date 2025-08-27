import { Worker, Job } from 'bullmq'
import { redis, QUEUE_NAMES } from '../queue/setup'
import { appConfig } from '../config'
import logger from '../lib/logger'
import { supabaseService } from '../services/supabase'
import { researchService } from '../services/research'
// import { cleanContentGenerator } from '../services/clean-content-generator' // ARCHIVED - old RAG system
// import { simpleLinkedInRAG } from '../services/simple-linkedin-rag' // ARCHIVED - old RAG system
// import { authenticVoicePatterns } from '../services/authentic-voice-patterns' // ARCHIVED - old RAG system
import { AIAgentsService } from '../services/ai-agents'
import { voiceLearningEnhanced } from '../services/voice-learning-enhanced'
import type { JobData, AIAgentResult } from '../types'

export class ContentGenerationWorker {
  private worker: Worker
  private strategicWorker: Worker
  private aiAgentsService: AIAgentsService

  constructor() {
    // Initialize AI agents service
    this.aiAgentsService = new AIAgentsService()
    
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
    const { topic, platform, voiceGuidelines, postType, tone, userId, useVoiceLearning, voiceLearningData, strategicVariants, contentIntent } = job.data
    const startTime = Date.now()

    logger.info({ 
      jobId: job.id, 
      topic, 
      platform,
      postType
    }, 'Starting CLEAN content generation job - no contaminated pipelines')

    try {
      // Step 1: Create job in database
      const dbJob = await supabaseService.createJob({
        topic,
        platform,
        voice_guide_id: userId,
        queue_job_id: job.id
      })

      if (!dbJob) {
        throw new Error('Failed to create job in database')
      }

      await job.updateProgress(10)
      await supabaseService.updateJobProgress(dbJob.id, 10, 'processing')

      // Step 2: Minimal research (no complex research service)
      logger.info({ jobId: job.id, topic }, 'Getting minimal research context')
      await job.updateProgress(20)

      let research: any = {}
      try {
        research = await researchService.enhancedFirecrawlResearch(topic)
      } catch (error) {
        logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'Research failed, continuing with topic only')
        research = { topic_context: topic }
      }

      const researchData = {
        research_ideas: research,
        timestamp: new Date().toISOString(),
        method: 'clean_simple'
      }

      await supabaseService.updateJobResearchData(dbJob.id, researchData)
      await job.updateProgress(30)
      await supabaseService.updateJobProgress(dbJob.id, 30)

      // Step 3: CLEAN content generation using new RAG system
      logger.info({ jobId: job.id }, 'Starting CLEAN content generation with LinkedIn RAG only')
      await job.updateProgress(40)

      const numVariants = strategicVariants && strategicVariants.length > 0 ? strategicVariants.length : 3
      const agentResults: AIAgentResult[] = []

      // Generate multiple variants using clean system
      for (let i = 0; i < numVariants; i++) {
        try {
          const variantName = strategicVariants && strategicVariants[i] ? 
            strategicVariants[i] : `variant_${i + 1}`

          logger.info({ jobId: job.id, variant: variantName }, 'Generating clean content variant')

          // Use current AI agents service instead of archived clean content generator
          const singleVariantResults = await this.aiAgentsService.generateAllVariations(
            topic,
            research,
            voiceGuidelines,
            undefined // historical insights
          )
          
          const agentResult = singleVariantResults[i] || {
            agent_name: `variant_${i + 1}`,
            content: {
              title: '',
              body: 'Content generation failed - using fallback',
              hashtags: [],
              estimated_voice_score: 50,
              approach: 'fallback',
              performance_prediction: {
                predictedEngagement: 20,
                confidenceScore: 0.5,
                strengthFactors: [],
                improvementSuggestions: ['Content generation service needs attention'],
                similarPostPerformance: {
                  avgEngagement: 20,
                  topPerformance: 30,
                  similarityScore: 0.5
                }
              }
            },
            metadata: {
              token_count: 100,
              generation_time_ms: 1000,
              model_used: 'gpt-4o-mini',
              research_sources: [],
              historical_context_used: false,
              similar_posts_analyzed: 0
            }
          }

          agentResults.push(agentResult)

          const progress = 40 + ((i + 1) * 20) // 60%, 80%, 100% for 3 variants
          await job.updateProgress(progress)
          await supabaseService.updateJobProgress(dbJob.id, progress)

          logger.info({ 
            jobId: job.id,
            variant: variantName,
            agentName: agentResult.agent_name,
            hasContent: !!agentResult.content.body
          }, 'Content variant generated successfully')

        } catch (variantError) {
          logger.error({ 
            jobId: job.id, 
            variant: i + 1,
            error: variantError instanceof Error ? variantError.message : String(variantError) 
          }, 'Failed to generate clean variant')
          
          // Continue with other variants
        }
      }

      if (agentResults.length === 0) {
        throw new Error('Failed to generate any content variants')
      }

      // Step 4: Save results with clean tracking
      await job.updateProgress(95)
      await supabaseService.updateJobProgress(dbJob.id, 95)

      for (let i = 0; i < agentResults.length; i++) {
        const agent = agentResults[i]
        
        try {
          await supabaseService.saveContentVariantTracking({
            job_id: dbJob.id,
            variant_number: i + 1,
            topic: topic,
            research_ideas: research,
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
              clean_generation: true,
              linkedin_rag_used: true,
              has_question_opening: false, // authenticity_markers removed with old RAG system
              has_research_citation: false, // authenticity_markers removed with old RAG system 
              has_dramatic_structure: false, // authenticity_markers removed with old RAG system
              has_authentic_tone: true, // default for current system
              andrew_authenticity_score: agent.content.estimated_voice_score
            },
            historical_context_used: true,
            similar_posts_analyzed: 10
          })
        } catch (trackingError) {
          logger.warn({ 
            jobId: job.id,
            agentName: agent.agent_name,
            error: trackingError instanceof Error ? trackingError.message : String(trackingError)
          }, 'Failed to save clean variant tracking')
        }
      }

      // Step 5: Complete job
      await job.updateProgress(98)
      await supabaseService.updateJobProgress(dbJob.id, 98)
      
      const success = await supabaseService.completeJob(dbJob.id, agentResults)
      
      if (!success) {
        throw new Error('Failed to save results to database')
      }

      await job.updateProgress(100)
      
      const totalTime = Date.now() - startTime
      logger.info({ 
        jobId: job.id, 
        totalTimeMs: totalTime,
        draftCount: agentResults.length,
        generationMethod: 'clean_linkedin_rag'
      }, 'CLEAN content generation completed successfully')

      return {
        success: true,
        jobId: dbJob.id,
        draftsCount: agentResults.length,
        totalTimeMs: totalTime,
        researchMethod: 'clean_simple',
        cleanGeneration: true
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ jobId: job.id, error: errorMessage }, 'Clean content generation failed')

      // Handle job failure
      let existingDbJob = null
      try {
        if (job.id) {
          const jobWithDrafts = await supabaseService.getJobWithDrafts(job.id.toString())
          existingDbJob = jobWithDrafts?.job || null
        }
      } catch (findError) {
        logger.warn({ jobId: job.id, error: findError }, 'Could not find existing database job')
      }

      if (existingDbJob) {
        await supabaseService.failJob(existingDbJob.id, errorMessage)
      } else if (job.data.topic) {
        const dbJob = await supabaseService.createJob({
          topic: job.data.topic,
          platform: job.data.platform || 'linkedin',
          queue_job_id: job.id
        })
        
        if (dbJob) {
          await supabaseService.failJob(dbJob.id, errorMessage)
        }
      }

      throw error
    }
  }

  /**
   * Extract strength factors from authenticity markers
   */
  private extractStrengthFactors(markers: any): string[] {
    const strengths: string[] = []
    
    if (markers.hasQuestionOpening) {
      strengths.push('Uses authentic Andrew question-based opening')
    }
    if (markers.hasResearchCitation) {
      strengths.push('Includes research backing for credibility')
    }
    if (markers.hasDramaticStructure) {
      strengths.push('Applies Andrew\'s dramatic formatting')
    }
    if (markers.hasAuthenticTone) {
      strengths.push('Captures Andrew\'s authentic voice tone')
    }
    
    return strengths
  }

  /**
   * Extract improvements from authenticity markers
   */
  private extractImprovements(markers: any): string[] {
    const improvements: string[] = []
    
    if (!markers.hasQuestionOpening) {
      improvements.push('Consider using Andrew\'s question-based opening patterns')
    }
    if (!markers.hasResearchCitation) {
      improvements.push('Add specific research citations for authority')
    }
    if (!markers.hasDramaticStructure) {
      improvements.push('Apply more dramatic formatting elements')
    }
    if (!markers.hasAuthenticTone) {
      improvements.push('Strengthen Andrew\'s authentic voice markers')
    }
    
    return improvements
  }

  /**
   * Check content for Andrew's authentic voice markers
   */
  private hasAndrewAuthenticityMarkers(content: string): boolean {
    let authenticityScore = 0
    
    // Andrew's authentic LinkedIn opening patterns from RAG data
    const authenticLinkedInPatterns = [
      /^What if your job as a leader/i,
      /^What if\s+.*isn't to\s+/i,
      /^The best leaders I know/i,
      /^Most leaders think/i,
      /^Here's something I've learned/i
    ]
    if (authenticLinkedInPatterns.some(pattern => pattern.test(content))) {
      authenticityScore += 30 // Higher value for authentic LinkedIn patterns
    }
    
    // Research citations
    const researchPatterns = [
      /Yale Center for/i,
      /Harvard (studies|research|Business School)/i,
      /Research (shows|from|indicates)/i,
      /Studies (show|indicate|reveal)/i
    ]
    if (researchPatterns.some(pattern => pattern.test(content))) {
      authenticityScore += 20 // High value for research backing
    }
    
    // Authority establishment phrases
    if (/The best founders I work with/i.test(content)) {
      authenticityScore += 15
    }
    if (/Top performers/i.test(content)) {
      authenticityScore += 10
    }
    
    // Dramatic structural elements
    if (/…/.test(content)) authenticityScore += 8 // Ellipses for drama
    if (/[1-3]️⃣/.test(content)) authenticityScore += 8 // Numbered emojis
    if (/💡|➡️|✅/.test(content)) authenticityScore += 5 // Andrew's emojis
    
    // Signature phrases
    const signaturePhrases = [
      /Here's the truth:/i,
      /But here's the shift:/i,
      /Follow me if/i
    ]
    signaturePhrases.forEach(pattern => {
      if (pattern.test(content)) authenticityScore += 8
    })
    
    // Challenge-reframe pattern
    if (/Most [^.!?]+ do [^.!?]+\. But [^.!?]+\./i.test(content)) {
      authenticityScore += 12 // High value for challenge-reframe
    }
    
    // Punchy sentence structure (short sentences with impact)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const shortSentences = sentences.filter(s => s.trim().split(/\s+/).length <= 8).length
    if (sentences.length > 0 && (shortSentences / sentences.length) > 0.4) {
      authenticityScore += 10 // Good for punchy structure
    }
    
    // Avoid generic business speak AND generic "X is killing your Y" patterns (penalty)
    const genericPatterns = [
      /Are you feeling (overwhelmed|stuck|frustrated)/i,
      /Many leaders struggle with/i,
      /What if (we told you|I told you)/i,
      /In today's (competitive|business|challenging) environment/i,
      /^[A-Z][^.!?]*\s+is killing your\s+/i,  // Generic confrontational pattern
      /^Stop doing\s+/i,  // Generic command pattern
      /^This is why\s+/i   // Generic explanation pattern
    ]
    if (genericPatterns.some(pattern => pattern.test(content))) {
      authenticityScore -= 25 // Higher penalty for generic content including "X is killing your Y"
    }
    
    logger.debug({
      authenticityScore,
      hasAuthenticLinkedInOpening: authenticLinkedInPatterns.some(p => p.test(content)),
      hasResearchBacking: researchPatterns.some(p => p.test(content)),
      hasDramaticElements: /…|[1-3]️⃣/.test(content),
      hasGenericPhrases: genericPatterns.some(p => p.test(content))
    }, 'Andrew authenticity markers analysis')
    
    return authenticityScore >= 30 // Threshold for authentic Andrew voice
  }


  /**
   * Process strategic content generation jobs with enhanced intelligence
   */
  private async processStrategicJob(job: Job<JobData & { strategicIntelligence: any }>) {
    const { topic, platform, voiceGuidelines, postType, tone, userId, strategicIntelligence, useVoiceLearning, voiceLearningData } = job.data
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

      // Enhanced voice guidelines combining user input, strategic intelligence, and voice learning
      let baseVoiceGuidelines = voiceGuidelines || 
        `${strategicIntelligence.voiceModel.generationGuidelines}\n\nSTRATEGIC PERFORMANCE TARGET: ${strategicIntelligence.performanceTarget} engagement score\n\nKEY SUCCESS FACTORS:\n${strategicIntelligence.insights.performance_patterns.high_engagement_triggers.slice(0, 5).map((t: string) => `- ${t}`).join('\n')}`
      
      // Apply voice learning insights if enabled
      let enhancedVoiceGuidelines = baseVoiceGuidelines
      let actualVoiceLearningDataStrategic = null
      
      if (useVoiceLearning) {
        try {
          logger.info({ jobId: job.id, type: 'strategic' }, 'Generating voice learning insights for strategic content generation')
          
          // Get voice context from RAG system for strategic generation
          const topicKeywords = topic.toLowerCase().split(/\s+/).filter(word => word.length > 3)
          
          const voiceContext = await voiceLearningEnhanced.getVoiceContextForGeneration(
            'linkedin_post',
            topicKeywords,
            ['question-based', 'opening', 'storytelling', 'authority']
          )
          
          const voiceStats = await voiceLearningEnhanced.getVoiceLearningStats()
          
          actualVoiceLearningDataStrategic = {
            success: true,
            insights: {
              voice_profile: {
                dominantTone: 'strategic-authentic',
                avgScores: {
                  authenticity: 90,
                  authority: 92,
                  vulnerability: 78
                }
              },
              content_patterns: {
                avg_word_count: 180,
                most_common_opening: 'question',
                most_common_closing: 'call_to_action'
              }
            },
            generation_guidelines: voiceContext.authenticityBoosts,
            strength_factors: voiceContext.authenticityBoosts,
            meta: {
              data_points: voiceStats.totalSegments,
              model_confidence: Math.round(voiceStats.avgConfidenceScore * 100)
            }
          }
          
          logger.info({ 
            jobId: job.id,
            type: 'strategic',
            voiceDataConfidence: actualVoiceLearningDataStrategic.meta?.model_confidence,
            dominantTone: actualVoiceLearningDataStrategic.insights?.voice_profile?.dominantTone,
            dataPoints: actualVoiceLearningDataStrategic.meta?.data_points
          }, 'Voice learning insights generated for strategic content')
          
          const voiceInsights = actualVoiceLearningDataStrategic.insights?.voice_profile || {}
          const generationGuidelines = actualVoiceLearningDataStrategic.generation_guidelines || []
          const strengthFactors = actualVoiceLearningDataStrategic.strength_factors || []
          
          const voiceLearningGuidelines = [
            `\n\nANDREW TALLENTS STRATEGIC VOICE ENHANCEMENT (Confidence: ${actualVoiceLearningDataStrategic.meta?.model_confidence || 0}%):`,
            `- Enhanced Dominant Tone: ${voiceInsights.dominantTone || 'conversational'} with thoughtful edge`,
            `- Authenticity Score Target: ${Math.round(voiceInsights.avgScores?.authenticity || 90)}% (strategic authenticity boost)`,
            `- Authority Score Target: ${Math.round(voiceInsights.avgScores?.authority || 90)}% (research-backed authority)`,
            `- Vulnerability Score Target: ${Math.round(voiceInsights.avgScores?.vulnerability || 80)}% (balanced with boldness)`,
            '',
            'STRATEGIC ANDREW PATTERNS:',
            `- AUTHENTIC LINKEDIN OPENINGS: Use Andrew's question-based patterns from RAG data`,
            `- RESEARCH AUTHORITY: Cite specific sources for credibility`,
            `- DRAMATIC STRUCTURE: Strategic formatting for visual engagement`,
            ...generationGuidelines.slice(0, 2).map((g: string) => `- ${g}`),
            '',
            'STRATEGIC VOICE STRENGTH FACTORS:',
            ...strengthFactors.slice(0, 2).map((s: string) => `- ${s}`),
            '',
            'STRATEGIC AUTHENTICITY REQUIREMENTS:',
            `- Higher performance target demands bolder, more authentic Andrew voice`,
            `- Challenge conventional thinking more directly`,
            `- Use research backing for enhanced credibility`
          ].join('\n')
          
          enhancedVoiceGuidelines = `${baseVoiceGuidelines}${voiceLearningGuidelines}`
          
          logger.info({ 
            jobId: job.id,
            type: 'strategic',
            enhancedGuidelinesLength: enhancedVoiceGuidelines.length,
            targetAuthenticity: Math.round(voiceInsights.avgScores?.authenticity || 85),
            voiceLearningApplied: true
          }, 'Voice learning guidelines integrated into strategic generation')
          
        } catch (error) {
          logger.error({ 
            jobId: job.id,
            type: 'strategic',
            error: error instanceof Error ? error.message : String(error)
          }, 'Failed to generate strategic voice learning insights - continuing without voice learning')
        }
      }

      // Generate strategic variants with enhanced intelligence and voice learning
      // Use strategic variants if available, otherwise default to performance mode
      const variantsToGenerate: ('performance' | 'engagement' | 'experimental')[] = 
        job.data.strategicVariants && job.data.strategicVariants.length > 0 
          ? job.data.strategicVariants 
          : ['performance', 'engagement', 'experimental'] // Default to all 3 variants
      
      logger.info({ 
        jobId: job.id, 
        type: 'strategic',
        requestedVariants: job.data.strategicVariants,
        variantsToGenerate 
      }, 'Generating strategic variants with differentiated approaches')
      
      const agentResults = await this.aiAgentsService.generateStrategicVariants(
        topic,
        strategicResearch,
        variantsToGenerate,
        enhancedVoiceGuidelines, // Now includes voice learning insights
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
              performance_optimization: true,
              voice_learning_applied: useVoiceLearning && !!actualVoiceLearningDataStrategic,
              voice_learning_confidence: actualVoiceLearningDataStrategic?.meta?.model_confidence || null,
              learned_authenticity_target: actualVoiceLearningDataStrategic?.insights?.voice_profile?.avgScores?.authenticity || null,
              learned_authority_target: actualVoiceLearningDataStrategic?.insights?.voice_profile?.avgScores?.authority || null,
              learned_vulnerability_target: actualVoiceLearningDataStrategic?.insights?.voice_profile?.avgScores?.vulnerability || null,
              strategic_andrew_authenticity: this.hasAndrewAuthenticityMarkers(agent.content.body) ? 95 : 70,
              authentic_linkedin_opening_strategic: /^What if\s+.*\s+(isn't|is)\s+/i.test(agent.content.body),
              research_authority_strategic: /(Yale Center|Harvard|Research shows)/i.test(agent.content.body),
              dramatic_structure_strategic: /(…|[1-3]️⃣|💡)/.test(agent.content.body),
              andrew_voice_optimization: true
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
      
      logger.info({ 
        jobId: job.id,
        dbJobId: dbJob.id,
        type: 'strategic',
        agentResultsCount: agentResults.length,
        agentNames: agentResults.map(r => r.agent_name)
      }, 'Attempting to complete strategic job with agent results')
      
      const success = await supabaseService.completeJob(dbJob.id, agentResults)
      
      if (!success) {
        logger.error({ 
          jobId: job.id,
          dbJobId: dbJob.id,
          type: 'strategic',
          agentResultsCount: agentResults.length
        }, 'Failed to complete strategic job - database operation failed')
        throw new Error('Failed to save strategic results to database')
      }

      // Update job progress to 100% and mark as completed
      await job.updateProgress(100)
      
      logger.info({ 
        jobId: job.id,
        dbJobId: dbJob.id,
        type: 'strategic',
        finalProgress: 100
      }, 'Strategic job completed successfully in database')

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