import express from 'express'
import { appConfig } from '../config'
import logger from '../lib/logger'
import { supabaseService } from '../services/supabase'
import { researchService } from '../services/research'
import { aiAgentsService } from '../services/ai-agents'
import { historicalAnalysisService } from '../services/historical-analysis'
import { performanceInsightsService, type EnhancedInsight } from '../services/performance-insights'
import { simpleAIAgentsService } from '../services/ai-agents-simple'
import { vectorSimilarityService } from '../services/vector-similarity'
import { ragHistoricalAnalysisService, type RAGHistoricalInsight } from '../services/historical-analysis-rag'
import { embeddingsPopulatorService } from '../services/embeddings-populator'
import { OpenAI } from 'openai'
import { Redis } from 'ioredis'
import type { HistoricalPost } from '../services/historical-analysis'

const router = express.Router()

/**
 * Convert RAG insights to EnhancedInsight format for AI agents
 */
function convertRAGToEnhancedInsight(ragInsight: RAGHistoricalInsight): EnhancedInsight {
  // Convert similar_posts to HistoricalPost format
  const convertToHistoricalPost = (post: any): HistoricalPost => ({
    id: post.post_id || 'unknown',
    text: post.content || 'No content available', // Ensure text is always present
    posted_at: post.posted_date || new Date().toISOString(),
    total_reactions: post.total_reactions || 0,
    like_count: post.total_reactions || 0, // Use total_reactions as fallback
    comments_count: post.comments_count || 0,
    reposts_count: 0, // Not available in RAG format
    support_count: 0,
    love_count: 0,
    insight_count: 0,
    celebrate_count: 0,
    author_first_name: 'Andrew',
    author_last_name: 'Tallents',
    post_type: 'regular',
    similarity_score: post.similarity_score || 0
  })

  const historicalPosts = (ragInsight.similar_posts || []).map(convertToHistoricalPost)

  return {
    relatedPosts: historicalPosts,
    topPerformers: historicalPosts.length > 0 ? historicalPosts.slice(0, 5) : [], // Ensure not empty
    patterns: {
      avgWordCount: ragInsight.patterns?.avg_word_count || 150,
      commonOpenings: ragInsight.patterns?.common_openings || [],
      commonStructures: (ragInsight.structure_recommendations || []).map(s => s.structure || 'single_thought'),
      bestPerformingFormats: ragInsight.performance_factors?.format_recommendations || [],
      engagementTriggers: ragInsight.patterns?.engagement_triggers || []
    },
    performanceContext: {
      avgEngagement: ragInsight.performance_context?.avg_engagement || 0,
      topPerformingScore: ragInsight.performance_context?.top_performing_score || 0,
      suggestionScore: Math.round((ragInsight.performance_context?.top_performing_score || 0) * 0.8)
    },
    voiceAnalysis: {
      tone: (ragInsight.voice_analysis?.tone as any) || 'professional',
      personalStoryElements: (ragInsight.voice_analysis?.vulnerability_score || 0) > 30,
      vulnerabilityScore: ragInsight.voice_analysis?.vulnerability_score || 0,
      authoritySignals: ragInsight.voice_analysis?.authority_signals || [],
      emotionalWords: ragInsight.voice_analysis?.emotional_words || [],
      actionWords: ragInsight.voice_analysis?.action_words || []
    },
    structureRecommendations: (ragInsight.structure_recommendations || []).map(rec => ({
      wordCount: rec.wordCount || 150,
      sentenceCount: Math.round((rec.wordCount || 150) / 15), // Estimate
      paragraphCount: Math.round((rec.wordCount || 150) / 75), // Estimate
      hasQuestions: (rec.openingType || '').includes('question'),
      hasEmojis: false, // Default
      hasHashtags: false, // Default
      hasCallToAction: true, // Default for recommendations
      openingType: (rec.openingType || '').includes('question') ? 'question' : 'statement' as any,
      structure: (rec.structure || 'single_thought') as any
    })),
    performanceFactors: {
      highEngagementTriggers: ragInsight.performance_factors?.high_engagement_triggers || [],
      optimalTiming: ragInsight.performance_factors?.optimal_timing || [],
      contentLengthOptimal: ragInsight.performance_factors?.content_length_optimal || 150,
      formatRecommendations: ragInsight.performance_factors?.format_recommendations || []
    }
  }
}

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

// Vector similarity and RAG testing endpoints

// Test vector similarity search
router.post('/vector-similarity', async (req, res) => {
  try {
    const { topic = 'leadership challenges' } = req.body
    
    logger.info({ topic }, 'Debug: Testing vector similarity search')
    
    const similarPosts = await vectorSimilarityService.findSimilarHighPerformingPosts(topic, {
      match_count: 5,
      similarity_threshold: 0.3
    })
    
    res.json({
      success: true,
      message: 'Vector similarity test completed',
      topic,
      results: {
        found_posts: similarPosts.length,
        posts: similarPosts.map(post => ({
          post_id: post.post_id,
          similarity_score: post.similarity_score,
          engagement_score: post.engagement_score,
          performance_tier: post.performance_tier,
          content_preview: post.content.slice(0, 100) + '...',
          combined_score: post.combined_score
        }))
      }
    })
  } catch (error) {
    logger.error({ error }, 'Vector similarity debug test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Test RAG-based historical analysis
router.post('/rag-historical', async (req, res) => {
  try {
    const { topic = 'leadership challenges' } = req.body
    
    logger.info({ topic }, 'Debug: Testing RAG-based historical analysis')
    
    const insights = await ragHistoricalAnalysisService.generateHistoricalInsights(topic)
    
    res.json({
      success: true,
      message: 'RAG historical analysis test completed',
      topic,
      results: {
        similar_posts_found: insights.similar_posts.length,
        avg_engagement: insights.performance_context.avg_engagement,
        prediction_confidence: insights.performance_context.prediction_confidence,
        success_factors: insights.patterns.success_factors,
        optimization_suggestions: insights.performance_factors.format_recommendations.slice(0, 3),
        context_size_kb: Math.round(JSON.stringify(insights).length / 1024)
      },
      full_insights: insights
    })
  } catch (error) {
    logger.error({ error }, 'RAG historical analysis debug test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Test production data with RAG (the key test)
router.post('/production-data-rag', async (req, res) => {
  try {
    const { topic = 'leadership challenges' } = req.body
    
    logger.info({ topic }, 'Debug: Testing AI agents with production data using RAG')
    
    // Use the exact same process as production but with RAG
    // 1. Get real research data
    const research = await researchService.enhancedFirecrawlResearch(topic)
    logger.info({ 
      hasResearch: !!research,
      idea1Length: research.idea_1?.concise_summary?.length || 0
    }, 'Production research data loaded')
    
    // 2. Get RAG-based historical insights (much smaller context)
    let historicalInsights: EnhancedInsight | undefined = undefined
    try {
      const ragInsights = await ragHistoricalAnalysisService.generateHistoricalInsights(topic)
      // Convert RAG insights to format expected by AI agents
      historicalInsights = convertRAGToEnhancedInsight(ragInsights)
      logger.info({
        similarPostsCount: ragInsights.similar_posts.length,
        contextSizeKB: Math.round(JSON.stringify(ragInsights).length / 1024),
        predictionConfidence: ragInsights.performance_context.prediction_confidence,
        convertedToEnhanced: true
      }, 'RAG historical insights loaded and converted (much smaller context)')
    } catch (historicalError) {
      logger.warn({ error: historicalError instanceof Error ? historicalError.message : String(historicalError) }, 'RAG historical insights failed, continuing without')
    }
    
    // 3. Test AI agents with RAG data (sequential, not parallel)
    const results = []
    for (let i = 1; i <= 3; i++) {
      try {
        const ideaKey = `idea_${i}` as keyof typeof research
        const idea = research[ideaKey]
        
        logger.info({ agentNumber: i, ideaSummary: idea.concise_summary.slice(0, 50) }, 'Testing AI agent with RAG-based production data')
        
        // Use the actual production AI service method with RAG insights
        const agentResults = await aiAgentsService.generateAllVariations(
          topic,
          { idea_1: idea, idea_2: idea, idea_3: idea }, // Use same idea for all to test single agent
          undefined, // No voice guidelines
          historicalInsights // Converted RAG insights (much smaller)
        )
        
        if (agentResults.length > 0) {
          results.push(agentResults[0]) // Take first result
          logger.info({ agentNumber: i, success: true }, 'AI agent succeeded with RAG production data')
        } else {
          logger.error({ agentNumber: i }, 'AI agent failed with RAG production data')
        }
      } catch (agentError) {
        logger.error({ 
          agentNumber: i, 
          error: agentError instanceof Error ? agentError.message : String(agentError),
          stack: agentError instanceof Error ? agentError.stack : undefined
        }, 'AI agent error with RAG production data')
      }
    }
    
    res.json({
      success: true,
      message: 'Production data RAG test completed',
      topic,
      resultsCount: results.length,
      successfulAgents: results.length,
      failedAgents: 3 - results.length,
      dataInfo: {
        researchLoaded: !!research,
        ragInsightsLoaded: !!historicalInsights,
        contextSizeKB: historicalInsights ? Math.round(JSON.stringify(historicalInsights).length / 1024) : 0,
        vs_old_context: '858KB → ' + (historicalInsights ? Math.round(JSON.stringify(historicalInsights).length / 1024) : 0) + 'KB'
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
    logger.error({ error }, 'Production data RAG debug test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'This test uses RAG approach with much smaller context'
    })
  }
})

// Embeddings management endpoints
router.get('/embeddings-stats', async (req, res) => {
  try {
    const stats = await embeddingsPopulatorService.getEmbeddingsStats()
    
    res.json({
      success: true,
      message: 'Embeddings database statistics',
      stats
    })
  } catch (error) {
    logger.error({ error }, 'Failed to get embeddings stats')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.post('/populate-embeddings', async (req, res) => {
  try {
    logger.info('Starting embeddings population (this may take a while)')
    
    // This is a long-running operation, so we'll start it and return immediately
    embeddingsPopulatorService.populateAllPostEmbeddings().catch(error => {
      logger.error({ error }, 'Embeddings population failed')
    })
    
    res.json({
      success: true,
      message: 'Embeddings population started in background',
      note: 'Check logs for progress. This may take 10-30 minutes depending on post count.'
    })
  } catch (error) {
    logger.error({ error }, 'Failed to start embeddings population')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Debug single post embedding
router.post('/single-post-embedding', async (req, res) => {
  try {
    const { postId } = req.body
    
    logger.info({ postId }, 'Debug: Testing single post embedding')
    
    // Get a single Andrew post for testing
    let testPost = null
    if (postId) {
      const { data: post, error } = await supabaseService['client']
        .from('linkedin_posts')
        .select('id, text, posted_at, total_reactions, like_count, comments_count, reposts_count')
        .eq('id', postId)
        .single()
      
      if (error) throw error
      testPost = post
    } else {
      // Get the first Andrew post
      const { data: posts, error } = await supabaseService['client']
        .from('linkedin_posts')
        .select('id, text, posted_at, total_reactions, like_count, comments_count, reposts_count')
        .eq('author_username', 'andrewtallents')
        .not('text', 'is', null)
        .not('text', 'eq', '')
        .order('posted_at', { ascending: false })
        .limit(1)
      
      if (error) throw error
      testPost = posts?.[0]
    }
    
    if (!testPost) {
      return res.status(404).json({
        success: false,
        error: 'No test post found'
      })
    }
    
    logger.info({ postId: testPost.id, textLength: testPost.text?.length }, 'Found test post')
    
    // Try to create embedding using the populator service
    const performanceMetrics = {
      total_reactions: testPost.total_reactions || 0,
      like_count: testPost.like_count || 0,
      comments_count: testPost.comments_count || 0,
      reposts_count: testPost.reposts_count || 0,
      shares_count: 0, // Not available in linkedin_posts
      posted_date: new Date(testPost.posted_at)
    }
    
    await vectorSimilarityService.storePostEmbedding(
      testPost.id,
      testPost.text,
      performanceMetrics
    )
    
    logger.info({ postId: testPost.id }, 'Successfully created embedding')
    
    res.json({
      success: true,
      message: 'Single post embedding test completed',
      testPost: {
        id: testPost.id,
        textPreview: testPost.text.slice(0, 100) + '...',
        textLength: testPost.text.length,
        reactions: testPost.total_reactions || 0
      }
    })
    
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Single post embedding test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'Check if OpenAI API key is working and database permissions are correct'
    })
  }
})

// Debug AI agents with RAG insights - detailed error logging
router.post('/ai-agents-rag-debug', async (req, res) => {
  try {
    const { topic = 'leadership challenges' } = req.body
    
    logger.info({ topic }, 'Debug: Testing AI agents with RAG insights - detailed error capture')
    
    // Get research data
    const research = await researchService.enhancedFirecrawlResearch(topic)
    
    // Get RAG insights and convert
    let ragInsights = null
    let convertedInsights = null
    try {
      ragInsights = await ragHistoricalAnalysisService.generateHistoricalInsights(topic)
      convertedInsights = convertRAGToEnhancedInsight(ragInsights)
      
      logger.info({ 
        ragInsightsKeys: Object.keys(ragInsights),
        convertedInsightsKeys: Object.keys(convertedInsights),
        topPerformersCount: convertedInsights.topPerformers?.length || 0,
        patternsKeys: Object.keys(convertedInsights.patterns || {}),
        voiceAnalysisKeys: Object.keys(convertedInsights.voiceAnalysis || {})
      }, 'RAG insights structure analysis')
      
    } catch (ragError) {
      logger.error({ error: ragError instanceof Error ? ragError.message : String(ragError) }, 'RAG insights failed')
      return res.status(500).json({
        success: false,
        error: 'RAG insights failed',
        details: ragError instanceof Error ? ragError.message : String(ragError)
      })
    }
    
    // Try AI agents with detailed error capture
    try {
      logger.info('Testing single AI agent with converted RAG insights')
      
      const testResults = await aiAgentsService.generateAllVariations(
        topic,
        {
          idea_1: research.idea_1,
          idea_2: research.idea_2, 
          idea_3: research.idea_3
        },
        undefined, // No voice guidelines
        convertedInsights // Our converted insights
      )
      
      res.json({
        success: true,
        message: 'AI agents with RAG insights test completed',
        resultsCount: testResults.length,
        ragInsightsStructure: {
          hasTopPerformers: !!convertedInsights.topPerformers,
          topPerformersCount: convertedInsights.topPerformers?.length || 0,
          hasPatterns: !!convertedInsights.patterns,
          hasVoiceAnalysis: !!convertedInsights.voiceAnalysis,
          hasPerformanceFactors: !!convertedInsights.performanceFactors
        },
        results: testResults.map(r => ({
          agentName: r.agent_name,
          hasContent: !!r.content.body,
          contentLength: r.content.body.length,
          historicalContextUsed: r.metadata.historical_context_used
        }))
      })
      
    } catch (aiError) {
      logger.error({ 
        error: aiError instanceof Error ? aiError.message : String(aiError),
        stack: aiError instanceof Error ? aiError.stack : undefined,
        convertedInsightsStructure: {
          topPerformers: convertedInsights?.topPerformers?.length || 0,
          patterns: Object.keys(convertedInsights?.patterns || {}),
          voiceAnalysis: Object.keys(convertedInsights?.voiceAnalysis || {}),
          performanceFactors: Object.keys(convertedInsights?.performanceFactors || {})
        }
      }, 'AI agents failed with RAG insights - DETAILED ERROR')
      
      res.status(500).json({
        success: false,
        error: 'AI agents failed with RAG insights',
        details: aiError instanceof Error ? aiError.message : String(aiError),
        stack: aiError instanceof Error ? aiError.stack?.split('\n').slice(0, 10) : undefined,
        convertedInsightsStructure: {
          hasTopPerformers: !!convertedInsights?.topPerformers,
          topPerformersCount: convertedInsights?.topPerformers?.length || 0,
          hasPatterns: !!convertedInsights?.patterns,
          patternsKeys: Object.keys(convertedInsights?.patterns || {}),
          hasVoiceAnalysis: !!convertedInsights?.voiceAnalysis,
          voiceAnalysisKeys: Object.keys(convertedInsights?.voiceAnalysis || {}),
          hasPerformanceFactors: !!convertedInsights?.performanceFactors,
          performanceFactorsKeys: Object.keys(convertedInsights?.performanceFactors || {})
        }
      })
    }
    
  } catch (error) {
    logger.error({ error }, 'AI agents RAG debug test failed')
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
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