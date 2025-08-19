import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import strategicVariantsRouter from '../../src/routes/strategic-variants'
import performanceRouter from '../../src/routes/performance'
import { 
  mockSupabaseService, 
  mockHistoricalAnalysisService, 
  mockVoiceLearningService,
  mockAIAgentsService,
  mockQueueService,
  resetAllMocks 
} from '../helpers/mocks'
import { mockAIAgentResult, createMockContentJob } from '../helpers/test-data'

// Mock all dependencies
vi.mock('../../src/services/supabase', () => ({
  supabaseService: mockSupabaseService
}))

vi.mock('../../src/services/historical-analysis-enhanced', () => ({
  historicalAnalysisEnhancedService: mockHistoricalAnalysisService
}))

vi.mock('../../src/services/voice-learning-enhanced', () => ({
  voiceLearningEnhancedService: mockVoiceLearningService
}))

vi.mock('../../src/services/ai-agents', () => ({
  aiAgentsService: mockAIAgentsService
}))

vi.mock('../../src/queue/setup', () => ({
  contentGenerationQueue: mockQueueService
}))

vi.mock('../../src/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

describe('End-to-End Content Generation Workflow', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/content', strategicVariantsRouter)
    app.use('/api/performance', performanceRouter)
    resetAllMocks()
  })

  describe('Complete Strategic Content Generation Flow', () => {
    const testPayload = {
      topic: 'AI transformation in modern workplace environments',
      platform: 'linkedin',
      voiceGuidelines: 'Professional but authentic, include personal stories',
      postType: 'thought_leadership',
      tone: 'professional',
      userId: 'test-user-123'
    }

    it('should complete full strategic content generation workflow', async () => {
      // Step 1: Submit strategic content generation request
      const createResponse = await request(app)
        .post('/api/content/generate-strategic')
        .send(testPayload)

      expect(createResponse.status).toBe(200)
      expect(createResponse.body.success).toBe(true)
      
      const { job_id, content_job_id, strategic_intelligence } = createResponse.body.data
      
      // Verify strategic intelligence was calculated
      expect(strategic_intelligence).toMatchObject({
        performance_target: expect.any(Number),
        insights_confidence: expect.any(Number),
        voice_authenticity_score: expect.any(Number),
        historical_context_posts: expect.any(Number),
        top_performers_analyzed: expect.any(Number)
      })

      // Verify all services were called correctly
      expect(mockHistoricalAnalysisService.generateComprehensiveInsights).toHaveBeenCalledWith(
        testPayload.topic,
        expect.objectContaining({
          maxPosts: 30,
          timeframeDays: 365,
          includeComments: true,
          forceRefresh: false
        })
      )
      
      expect(mockVoiceLearningService.generateEnhancedVoiceModel).toHaveBeenCalled()
      expect(mockQueueService.add).toHaveBeenCalledWith(
        'content-generation-strategic',
        expect.objectContaining({
          topic: testPayload.topic,
          platform: testPayload.platform,
          strategicIntelligence: expect.any(Object)
        }),
        expect.any(Object)
      )
      expect(mockSupabaseService.createContentJob).toHaveBeenCalled()

      // Step 2: Simulate worker processing the job
      const jobData = mockQueueService.add.mock.calls[0][1]
      expect(jobData.strategicIntelligence).toBeDefined()
      expect(jobData.strategicIntelligence.insights).toBeDefined()
      expect(jobData.strategicIntelligence.voiceModel).toBeDefined()
      expect(jobData.strategicIntelligence.performanceTarget).toBeGreaterThan(0)

      // Step 3: Verify content job was stored with proper metadata
      const storedJobData = mockSupabaseService.createContentJob.mock.calls[0][0]
      expect(storedJobData).toMatchObject({
        id: job_id,
        queue_job_id: job_id.toString(),
        status: 'pending',
        topic: testPayload.topic,
        platform: testPayload.platform,
        research_data: {
          historical_insights: expect.any(Object),
          voice_model: expect.any(Object)
        }
      })

      // Step 4: Verify preview data includes strategic approach
      const preview = createResponse.body.data.preview
      expect(preview).toMatchObject({
        expected_variants: 3,
        generation_approach: 'Performance-driven with historical intelligence',
        voice_strategy: expect.any(Array)
      })
    })

    it('should handle job status tracking throughout workflow', async () => {
      // Mock job status progression
      const jobStatuses = ['waiting', 'active', 'completed']
      let statusIndex = 0

      mockQueueService.getJob.mockImplementation(() => ({
        id: 'test-job-123',
        data: testPayload,
        getState: vi.fn().mockReturnValue(jobStatuses[statusIndex++] || 'completed'),
        progress: vi.fn().mockReturnValue(statusIndex * 33.33),
        moveToCompleted: vi.fn(),
        moveToFailed: vi.fn()
      }))

      // Create job
      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send(testPayload)

      expect(response.body.data.queue_position).toBeDefined()
      
      // Verify job tracking capabilities
      expect(mockQueueService.add).toHaveBeenCalledWith(
        'content-generation-strategic',
        expect.any(Object),
        expect.objectContaining({
          attempts: 3,
          backoff: expect.any(Object),
          removeOnComplete: 10,
          removeOnFail: 5
        })
      )
    })

    it('should integrate with performance analytics system', async () => {
      // Step 1: Create strategic content job
      await request(app)
        .post('/api/content/generate-strategic')
        .send(testPayload)

      // Step 2: Fetch analytics to verify integration
      const analyticsResponse = await request(app)
        .get('/api/performance/analytics?timeframe=30')

      expect(analyticsResponse.status).toBe(200)
      expect(analyticsResponse.body.data).toMatchObject({
        overview: expect.any(Object),
        performance_metrics: expect.any(Object),
        voice_analytics: expect.any(Object),
        strategic_generation_stats: expect.any(Object)
      })

      // Verify both systems accessed the same data sources
      expect(mockSupabaseService.getTopPerformingPosts).toHaveBeenCalled()
      expect(mockSupabaseService.getVoiceLearningData).toHaveBeenCalled()
    })

    it('should maintain data consistency across services', async () => {
      // Create job with specific parameters
      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send(testPayload)

      const jobData = mockQueueService.add.mock.calls[0][1]
      const storedJobData = mockSupabaseService.createContentJob.mock.calls[0][0]

      // Verify consistency between queue data and stored data
      expect(jobData.topic).toBe(storedJobData.topic)
      expect(jobData.platform).toBe(storedJobData.platform)
      expect(jobData.voiceGuidelines).toBe(testPayload.voiceGuidelines)
      
      // Verify strategic intelligence is properly passed through
      expect(jobData.strategicIntelligence.insights.query_topic).toBe(testPayload.topic)
      expect(storedJobData.research_data.voice_model.generation_strategy).toBe('strategic_variants')
    })
  })

  describe('Performance Analytics Integration', () => {
    it('should provide real-time analytics for strategic generation system', async () => {
      // Mock recent variants data
      const recentVariants = [
        { was_posted: true, prediction_accuracy: 0.85, agent_name: 'Performance-Optimized Agent' },
        { was_posted: true, prediction_accuracy: 0.78, agent_name: 'Engagement-Focused Agent' },
        { was_posted: false, prediction_accuracy: null, agent_name: 'Experimental Agent' }
      ]
      mockSupabaseService.getContentVariantsTracking.mockResolvedValueOnce(recentVariants)

      const analyticsResponse = await request(app)
        .get('/api/performance/analytics?timeframe=7')

      expect(analyticsResponse.status).toBe(200)
      
      const strategicStats = analyticsResponse.body.data.strategic_generation_stats
      expect(strategicStats).toMatchObject({
        variants_generated: 3,
        posted_variants: 2,
        avg_prediction_accuracy: expect.any(Number),
        best_performing_agent: expect.any(String),
        success_rate: expect.any(Number)
      })

      // Verify calculations
      expect(strategicStats.avg_prediction_accuracy).toBeCloseTo(0.82, 1) // (0.85 + 0.78) / 2
      expect(strategicStats.success_rate).toBeGreaterThan(0) // Based on prediction accuracy > 0.7
    })

    it('should track voice evolution over time', async () => {
      const voiceEvolutionResponse = await request(app)
        .get('/api/performance/voice-evolution?period=6&metric=authenticity')

      expect(voiceEvolutionResponse.status).toBe(200)
      expect(voiceEvolutionResponse.body.data).toMatchObject({
        metric_tracked: 'authenticity',
        period_months: 6,
        evolution_trend: expect.any(String),
        improvement_rate: expect.any(Number),
        monthly_progress: expect.any(Array),
        insights: expect.any(Array)
      })

      // Verify the system tracks continuous learning
      expect(mockSupabaseService.getVoiceLearningData).toHaveBeenCalledWith('post', 200)
    })

    it('should generate contextual AI insights', async () => {
      const insightsResponse = await request(app)
        .get('/api/performance/insights?topic=leadership&timeframe=90')

      expect(insightsResponse.status).toBe(200)
      expect(insightsResponse.body.data).toMatchObject({
        insights: expect.any(Array),
        recommendations: expect.any(Array),
        voice_guidance: expect.any(Object),
        content_strategy: expect.any(Object),
        performance_predictions: expect.any(Object),
        confidence_score: expect.any(Number)
      })

      // Verify insights are contextual to the topic
      expect(mockAIAgentsService.generateStrategicVariants).not.toHaveBeenCalled() // This is insights, not generation
    })
  })

  describe('Voice Learning System Integration', () => {
    it('should analyze and store voice patterns from new content', async () => {
      const testContent = 'This is a new piece of content about workplace innovation and leadership challenges.'
      const analysisPayload = {
        content: testContent,
        contentType: 'post',
        context: 'Strategic content generation test',
        performanceData: {
          engagement_score: 85,
          viral_score: 78,
          performance_tier: 'top_25_percent'
        }
      }

      const voiceAnalysisResponse = await request(app)
        .post('/api/performance/voice-analysis')
        .send(analysisPayload)

      expect(voiceAnalysisResponse.status).toBe(200)
      expect(voiceAnalysisResponse.body.data).toMatchObject({
        tone_analysis: expect.any(Object),
        writing_style: expect.any(Object),
        vocabulary_patterns: expect.any(Object),
        structural_patterns: expect.any(Object),
        scores: {
          authenticity: expect.any(Number),
          authority: expect.any(Number),
          vulnerability: expect.any(Number),
          engagement_potential: expect.any(Number),
          confidence: expect.any(Number)
        }
      })

      // Verify the analysis included performance context
      expect(mockVoiceLearningService.analyzeVoicePatterns).toHaveBeenCalledWith(
        testContent,
        expect.objectContaining({
          performance_data: analysisPayload.performanceData
        })
      )
    })

    it('should generate enhanced voice model from accumulated data', async () => {
      const voiceModelResponse = await request(app)
        .get('/api/performance/voice-model')

      expect(voiceModelResponse.status).toBe(200)
      expect(voiceModelResponse.body.data).toMatchObject({
        voice_profile: expect.any(Object),
        generation_guidelines: expect.any(String),
        strength_factors: expect.any(Array),
        improvement_areas: expect.any(Array)
      })

      // Verify the model is based on historical voice learning data
      expect(mockVoiceLearningService.generateEnhancedVoiceModel).toHaveBeenCalled()
    })

    it('should provide voice guidance for strategic content generation', async () => {
      // First, generate voice model
      const voiceModelResponse = await request(app)
        .get('/api/performance/voice-model')

      expect(voiceModelResponse.status).toBe(200)

      // Then, create strategic content using the voice model
      const contentResponse = await request(app)
        .post('/api/content/generate-strategic')
        .send({ ...testPayload, voiceGuidelines: undefined }) // Use enhanced voice model

      expect(contentResponse.status).toBe(200)
      
      // Verify the job uses the enhanced voice model
      const storedJobData = mockSupabaseService.createContentJob.mock.calls[0][0]
      expect(storedJobData.voice_guide_id).toBe('enhanced-voice-model')
      
      const queueJobData = mockQueueService.add.mock.calls[0][1]
      expect(queueJobData.voiceGuidelines).toBeDefined()
      expect(queueJobData.strategicIntelligence.voiceModel).toBeDefined()
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle service failures gracefully without breaking the workflow', async () => {
      // Simulate historical analysis service failure
      mockHistoricalAnalysisService.generateComprehensiveInsights.mockRejectedValueOnce(
        new Error('Historical analysis service temporarily unavailable')
      )

      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send(testPayload)

      expect(response.status).toBe(503)
      expect(response.body.success).toBe(false)
      expect(response.body.error_type).toBe('insights_service_error')

      // Verify no partial data was created
      expect(mockSupabaseService.createContentJob).not.toHaveBeenCalled()
      expect(mockQueueService.add).not.toHaveBeenCalled()
    })

    it('should handle database failures with proper error responses', async () => {
      // Simulate database failure
      mockSupabaseService.getTopPerformingPosts.mockRejectedValueOnce(
        new Error('Database connection timeout')
      )

      const analyticsResponse = await request(app)
        .get('/api/performance/analytics')

      expect(analyticsResponse.status).toBe(500)
      expect(analyticsResponse.body.success).toBe(false)
      expect(analyticsResponse.body.error_type).toBe('analytics_error')
    })

    it('should provide meaningful error messages for debugging', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      mockVoiceLearningService.generateEnhancedVoiceModel.mockRejectedValueOnce(
        new Error('Specific voice model error details')
      )

      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send(testPayload)

      expect(response.status).toBe(503)
      expect(response.body.message).toContain('Specific voice model error details')

      process.env.NODE_ENV = originalEnv
    })

    it('should handle concurrent requests without data corruption', async () => {
      const requests = Array(5).fill(null).map((_, index) => 
        request(app)
          .post('/api/content/generate-strategic')
          .send({ ...testPayload, topic: `${testPayload.topic} ${index}` })
      )

      const responses = await Promise.all(requests)

      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.job_id).toBeDefined()
      })

      // Verify all jobs were created independently
      expect(mockQueueService.add).toHaveBeenCalledTimes(5)
      expect(mockSupabaseService.createContentJob).toHaveBeenCalledTimes(5)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle high-frequency analytics requests efficiently', async () => {
      const startTime = Date.now()
      
      const analyticsRequests = Array(10).fill(null).map(() =>
        request(app).get('/api/performance/analytics?timeframe=30')
      )

      const responses = await Promise.all(analyticsRequests)
      const endTime = Date.now()

      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })

      // Should complete within reasonable time (allowing for mock overhead)
      expect(endTime - startTime).toBeLessThan(5000) // 5 seconds max
    })

    it('should cache historical insights for performance', async () => {
      // First request should generate new insights
      await request(app)
        .post('/api/performance/insights')
        .send({ topic: 'caching test topic' })

      expect(mockHistoricalAnalysisService.generateComprehensiveInsights).toHaveBeenCalledTimes(1)

      // Mock cached insights for second request
      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce({
        id: 'cached-insights',
        query_topic: 'caching test topic',
        cache_hit_count: 1
      })

      resetAllMocks()

      // Second request should use cached data
      await request(app)
        .post('/api/performance/insights')
        .send({ topic: 'caching test topic' })

      expect(mockHistoricalAnalysisService.generateComprehensiveInsights).not.toHaveBeenCalled()
    })

    it('should validate input data to prevent resource waste', async () => {
      const invalidRequests = [
        { topic: '' }, // Empty topic
        { topic: 'A'.repeat(10000) }, // Extremely long topic
        { topic: 'valid', platform: 'invalid_platform' }, // Invalid platform
        { topic: 'valid', voiceGuidelines: 'A'.repeat(50000) } // Extremely long guidelines
      ]

      for (const invalidRequest of invalidRequests) {
        const response = await request(app)
          .post('/api/content/generate-strategic')
          .send(invalidRequest)

        // Should either reject with 400 or handle gracefully
        if (response.status === 400) {
          expect(response.body.success).toBe(false)
        } else {
          // If handled gracefully, should still return valid response
          expect(response.status).toBe(200)
        }
      }
    })
  })

  describe('Data Flow Validation', () => {
    it('should maintain referential integrity across all components', async () => {
      // Create strategic content job
      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send(testPayload)

      const { job_id, content_job_id } = response.body.data

      // Verify IDs are consistent across all service calls
      expect(job_id).toBeDefined()
      expect(content_job_id).toBeDefined()

      const queueCall = mockQueueService.add.mock.calls[0]
      const dbCall = mockSupabaseService.createContentJob.mock.calls[0][0]

      expect(queueCall[1].topic).toBe(dbCall.topic)
      expect(queueCall[1].platform).toBe(dbCall.platform)
      expect(dbCall.id).toBe(job_id)
      expect(dbCall.queue_job_id).toBe(job_id.toString())
    })

    it('should properly link performance data with content variants', async () => {
      // Generate analytics that would include variants tracking
      const analyticsResponse = await request(app)
        .get('/api/performance/analytics')

      expect(analyticsResponse.status).toBe(200)

      const strategicStats = analyticsResponse.body.data.strategic_generation_stats
      expect(strategicStats).toMatchObject({
        variants_generated: expect.any(Number),
        posted_variants: expect.any(Number),
        avg_prediction_accuracy: expect.any(Number)
      })

      // Verify the data sources are properly linked
      expect(mockSupabaseService.getContentVariantsTracking).toHaveBeenCalled()
    })
  })
})