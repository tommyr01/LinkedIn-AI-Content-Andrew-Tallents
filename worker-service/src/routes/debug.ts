import express from 'express'
import { appConfig } from '../config'
import logger from '../lib/logger'
import { supabaseService } from '../services/supabase'
import { researchService } from '../services/research'
import { aiAgentsService } from '../services/ai-agents'
import { historicalAnalysisService } from '../services/historical-analysis'
import { performanceInsightsService, type EnhancedInsight } from '../services/performance-insights'
import { simpleAIAgentsService } from '../services/ai-agents-simple'
import { OpenAI } from 'openai'
import { Redis } from 'ioredis'

const router = express.Router()

// Redis connection test
router.get('/redis', async (req, res) => {
  try {
    const redis = new Redis(appConfig.redis.url)
    
    await redis.set('debug:test', 'connection-test', 'EX', 10)
    const result = await redis.get('debug:test')
    await redis.del('debug:test')
    await redis.disconnect()
    
    res.json({
      success: true,
      message: 'Redis connection successful',
      testResult: result,
      redisUrl: appConfig.redis.url.replace(/:[^:]*@/, ':***@') // Hide password
    })
  } catch (error) {
    logger.error({ error }, 'Redis debug test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      redisUrl: appConfig.redis.url.replace(/:[^:]*@/, ':***@')
    })
  }
})

// OpenAI connection test
router.get('/openai', async (req, res) => {
  try {
    const openai = new OpenAI({
      apiKey: appConfig.openai.apiKey
    })
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a test assistant.' },
        { role: 'user', content: 'Say "OpenAI connection test successful"' }
      ],
      max_tokens: 20
    })
    
    res.json({
      success: true,
      message: 'OpenAI connection successful',
      testResult: completion.choices[0]?.message?.content,
      model: appConfig.openai.model,
      hasApiKey: !!appConfig.openai.apiKey
    })
  } catch (error) {
    logger.error({ error }, 'OpenAI debug test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      hasApiKey: !!appConfig.openai.apiKey,
      model: appConfig.openai.model
    })
  }
})

// Supabase connection test
router.get('/supabase', async (req, res) => {
  try {
    // Test basic connection by trying to fetch a job (even if none exist)
    const testJob = await supabaseService.getJob('test-id')
    
    // Test job creation
    const testJobData = {
      topic: 'debug test topic',
      platform: 'linkedin' as const,
      queue_job_id: 'debug-test-' + Date.now()
    }
    
    const createdJob = await supabaseService.createJob(testJobData)
    
    res.json({
      success: true,
      message: 'Supabase connection successful',
      canQuery: true,
      canCreate: !!createdJob,
      createdJobId: createdJob?.id,
      supabaseUrl: appConfig.supabase.url,
      hasServiceKey: !!appConfig.supabase.serviceKey
    })
  } catch (error) {
    logger.error({ error }, 'Supabase debug test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      supabaseUrl: appConfig.supabase.url,
      hasServiceKey: !!appConfig.supabase.serviceKey
    })
  }
})

// Research services test
router.post('/research', async (req, res) => {
  try {
    const { topic = 'test leadership topic' } = req.body
    
    logger.info({ topic }, 'Debug: Testing research service')
    
    // Test basic research (without historical analysis to isolate issues)
    const research = await researchService.enhancedFirecrawlResearch(topic)
    
    res.json({
      success: true,
      message: 'Research service test completed',
      hasResults: !!research,
      resultCount: research ? Object.keys(research).length : 0,
      research: research ? {
        idea_1: research.idea_1?.concise_summary || 'No summary',
        idea_2: research.idea_2?.concise_summary || 'No summary', 
        idea_3: research.idea_3?.concise_summary || 'No summary'
      } : null,
      apiKeys: {
        hasFirecrawl: !!appConfig.research.firecrawl.apiKey,
        hasPerplexity: !!appConfig.research.perplexity.apiKey
      }
    })
  } catch (error) {
    logger.error({ error }, 'Research debug test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      apiKeys: {
        hasFirecrawl: !!appConfig.research.firecrawl.apiKey,
        hasPerplexity: !!appConfig.research.perplexity.apiKey
      }
    })
  }
})

// Historical analysis test
router.post('/historical', async (req, res) => {
  try {
    const { topic = 'leadership' } = req.body
    
    logger.info({ topic }, 'Debug: Testing historical analysis service')
    
    // Test finding similar posts
    const similarPosts = await historicalAnalysisService.findSimilarHistoricalPosts(topic, 5)
    
    // Test generating insights (using performance insights service for enhanced insights)
    const basicInsight = await historicalAnalysisService.generateHistoricalInsights(topic)
    const insights: EnhancedInsight = await performanceInsightsService.generateEnhancedInsights(basicInsight)
    
    res.json({
      success: true,
      message: 'Historical analysis test completed',
      similarPostsCount: similarPosts.length,
      hasInsights: !!insights,
      samplePost: similarPosts[0] ? {
        id: similarPosts[0].id,
        textPreview: similarPosts[0].text.slice(0, 100) + '...',
        reactions: similarPosts[0].total_reactions
      } : null,
      insightsPreview: insights ? {
        topPerformersCount: insights.topPerformers.length,
        avgWordCount: insights.patterns.avgWordCount,
        commonOpenings: insights.patterns.commonOpenings.length,
        tone: insights.voiceAnalysis.tone,
        vulnerabilityScore: insights.voiceAnalysis.vulnerabilityScore
      } : null
    })
  } catch (error) {
    logger.error({ error }, 'Historical analysis debug test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Check if historical posts exist in database and OpenAI embeddings are working'
    })
  }
})

// Simple AI agents test (completely simplified, no historical context)
router.post('/ai-agents-simple', async (req, res) => {
  try {
    const { topic = 'test leadership topic' } = req.body
    
    logger.info({ topic }, 'Debug: Testing simple AI agents service')
    
    // Create simple research data for testing
    const simpleResearch = {
      idea_1: {
        concise_summary: 'Test leadership insight',
        angle_approach: 'Personal story approach',
        details: 'Focus on self-leadership challenges',
        relevance: 'Highly relevant to CEO audience'
      },
      idea_2: {
        concise_summary: 'Test business growth insight',
        angle_approach: 'Data-driven approach',
        details: 'Key metrics and performance indicators',
        relevance: 'Relevant to scaling businesses'
      },
      idea_3: {
        concise_summary: 'Test team management insight',
        angle_approach: 'Vulnerability-based approach',
        details: 'Managing team dynamics and culture',
        relevance: 'Critical for established leaders'
      }
    }
    
    // Test simple AI agents (no historical context, no complex features)
    const results = await simpleAIAgentsService.generateAllVariations(topic, simpleResearch)
    
    res.json({
      success: true,
      message: 'Simple AI agents test completed',
      resultsCount: results.length,
      results: results.map(r => ({
        agentName: r.agent_name,
        hasContent: !!r.content.body,
        contentPreview: r.content.body.slice(0, 100) + '...',
        voiceScore: r.content.estimated_voice_score,
        tokenCount: r.metadata.token_count
      }))
    })
  } catch (error) {
    logger.error({ error }, 'Simple AI agents debug test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Complex AI agents test (with historical context)
router.post('/ai-agents', async (req, res) => {
  try {
    const { topic = 'test leadership topic' } = req.body
    
    logger.info({ topic }, 'Debug: Testing AI agents service')
    
    // Create simple research data for testing
    const simpleResearch = {
      idea_1: {
        concise_summary: 'Test leadership insight',
        angle_approach: 'Personal story approach',
        details: 'Focus on self-leadership challenges',
        relevance: 'Highly relevant to CEO audience'
      },
      idea_2: {
        concise_summary: 'Test business growth insight',
        angle_approach: 'Data-driven approach',
        details: 'Key metrics and performance indicators',
        relevance: 'Relevant to scaling businesses'
      },
      idea_3: {
        concise_summary: 'Test team management insight',
        angle_approach: 'Vulnerability-based approach',
        details: 'Managing team dynamics and culture',
        relevance: 'Critical for established leaders'
      }
    }
    
    // Test AI agents without historical context
    const results = await aiAgentsService.generateAllVariations(
      topic,
      simpleResearch,
      undefined, // No voice guidelines
      undefined  // No historical insights
    )
    
    res.json({
      success: true,
      message: 'AI agents test completed',
      resultsCount: results.length,
      results: results.map(r => ({
        agentName: r.agent_name,
        hasContent: !!r.content.body,
        contentPreview: r.content.body.slice(0, 100) + '...',
        voiceScore: r.content.estimated_voice_score,
        tokenCount: r.metadata.token_count
      }))
    })
  } catch (error) {
    logger.error({ error }, 'AI agents debug test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Simple job test (minimal processing)
router.post('/simple-job', async (req, res) => {
  try {
    const { topic = 'test topic' } = req.body
    
    logger.info({ topic }, 'Debug: Testing simple job processing')
    
    // Create a minimal job that bypasses complex features
    const job = await supabaseService.createJob({
      topic,
      platform: 'linkedin',
      queue_job_id: 'debug-simple-' + Date.now()
    })
    
    if (!job) {
      throw new Error('Failed to create debug job')
    }
    
    // Update job to processing
    await supabaseService.updateJobProgress(job.id, 25, 'processing')
    
    // Test basic research
    const research = await researchService.enhancedFirecrawlResearch(topic)
    await supabaseService.updateJobProgress(job.id, 50, 'processing')
    
    // Test AI agents (without historical context)
    const results = await aiAgentsService.generateAllVariations(
      topic,
      research,
      undefined,
      undefined
    )
    await supabaseService.updateJobProgress(job.id, 75, 'processing')
    
    // Complete job with drafts
    await supabaseService.completeJob(job.id, results)
    
    // Job is already completed by completeJob method
    
    res.json({
      success: true,
      message: 'Simple job test completed successfully',
      jobId: job.id,
      draftsCreated: results.length,
      stages: {
        jobCreated: true,
        researchCompleted: !!research,
        aiAgentsCompleted: results.length > 0,
        draftsStored: true,
        jobCompleted: true
      }
    })
    
  } catch (error) {
    logger.error({ error }, 'Simple job debug test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Test with real production data (most important debug test)
router.post('/production-data', async (req, res) => {
  try {
    const { topic = 'leadership challenges' } = req.body
    
    logger.info({ topic }, 'Debug: Testing AI agents with real production data')
    
    // Use the exact same process as production
    // 1. Get real research data
    const research = await researchService.enhancedFirecrawlResearch(topic)
    logger.info({ 
      hasResearch: !!research,
      idea1Length: research.idea_1?.concise_summary?.length || 0,
      idea2Length: research.idea_2?.concise_summary?.length || 0,
      idea3Length: research.idea_3?.concise_summary?.length || 0
    }, 'Production research data loaded')
    
    // 2. Get real historical insights
    let historicalInsights = null
    try {
      const basicInsight = await historicalAnalysisService.generateHistoricalInsights(topic)
      historicalInsights = await performanceInsightsService.generateEnhancedInsights(basicInsight)
      logger.info({
        topPerformersCount: historicalInsights.topPerformers.length,
        relatedPostsCount: historicalInsights.relatedPosts.length,
        contextLength: JSON.stringify(historicalInsights).length
      }, 'Production historical insights loaded')
    } catch (historicalError) {
      logger.warn({ error: historicalError instanceof Error ? historicalError.message : String(historicalError) }, 'Historical insights failed, continuing without')
    }
    
    // 3. Test AI agents with EXACT production data (sequential, not parallel)
    const results = []
    for (let i = 1; i <= 3; i++) {
      try {
        const ideaKey = `idea_${i}` as keyof typeof research
        const idea = research[ideaKey]
        
        logger.info({ agentNumber: i, ideaSummary: idea.concise_summary.slice(0, 50) }, 'Testing individual AI agent with production data')
        
        // Use the actual production AI service method
        const agentResults = await aiAgentsService.generateAllVariations(
          topic,
          { idea_1: idea, idea_2: idea, idea_3: idea }, // Use same idea for all to test single agent
          undefined, // No voice guidelines
          historicalInsights || undefined
        )
        
        if (agentResults.length > 0) {
          results.push(agentResults[0]) // Take first result
          logger.info({ agentNumber: i, success: true }, 'AI agent succeeded with production data')
        } else {
          logger.error({ agentNumber: i }, 'AI agent failed with production data')
        }
      } catch (agentError) {
        logger.error({ 
          agentNumber: i, 
          error: agentError instanceof Error ? agentError.message : String(agentError),
          stack: agentError instanceof Error ? agentError.stack : undefined
        }, 'AI agent error with production data')
      }
    }
    
    res.json({
      success: true,
      message: 'Production data test completed',
      topic,
      resultsCount: results.length,
      successfulAgents: results.length,
      failedAgents: 3 - results.length,
      dataInfo: {
        researchLoaded: !!research,
        historicalInsightsLoaded: !!historicalInsights,
        contextSize: historicalInsights ? JSON.stringify(historicalInsights).length : 0
      },
      results: results.map(r => ({
        agentName: r.agent_name,
        hasContent: !!r.content.body,
        contentLength: r.content.body.length,
        contentPreview: r.content.body.slice(0, 100) + '...',
        voiceScore: r.content.estimated_voice_score,
        tokenCount: r.metadata.token_count,
        historicalContextUsed: r.metadata.historical_context_used
      }))
    })
    
  } catch (error) {
    logger.error({ error }, 'Production data debug test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'This test uses the exact same data and process as production jobs'
    })
  }
})

// Environment variables check
router.get('/env', async (req, res) => {
  try {
    res.json({
      success: true,
      environment: {
        hasOpenAIKey: !!appConfig.openai.apiKey,
        openAIModel: appConfig.openai.model,
        hasFirecrawlKey: !!appConfig.research.firecrawl.apiKey,
        hasPerplexityKey: !!appConfig.research.perplexity.apiKey,
        hasSupabaseUrl: !!appConfig.supabase.url,
        hasSupabaseKey: !!appConfig.supabase.serviceKey,
        hasRedisUrl: !!appConfig.redis.url,
        workerConcurrency: appConfig.worker.concurrency,
        maxJobAttempts: appConfig.worker.maxJobAttempts,
        logLevel: appConfig.logging.level
      }
    })
  } catch (error) {
    logger.error({ error }, 'Environment debug check failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router