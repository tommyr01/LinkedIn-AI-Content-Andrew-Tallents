import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import strategicVariantsRouter from '../../src/routes/strategic-variants'
import { 
  mockSupabaseService, 
  mockHistoricalAnalysisService, 
  mockVoiceLearningService,
  mockQueueService,
  resetAllMocks 
} from '../helpers/mocks'

// Mock the dependencies
vi.mock('../../src/services/supabase', () => ({
  supabaseService: mockSupabaseService
}))

vi.mock('../../src/services/historical-analysis-enhanced', () => ({
  historicalAnalysisEnhancedService: mockHistoricalAnalysisService
}))

vi.mock('../../src/services/voice-learning-enhanced', () => ({
  voiceLearningEnhancedService: mockVoiceLearningService
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

describe('Strategic Variants API Routes', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/content', strategicVariantsRouter)
    resetAllMocks()
  })

  describe('POST /api/content/generate-strategic', () => {
    const validPayload = {
      topic: 'AI transformation in modern workplace',
      platform: 'linkedin',
      voiceGuidelines: 'Professional but authentic, include personal stories',
      postType: 'thought_leadership',
      tone: 'professional',
      userId: 'user-123'
    }

    it('should successfully create strategic content generation job', async () => {
      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send(validPayload)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        job_id: expect.any(String),
        content_job_id: expect.any(String),
        status: 'queued',
        estimated_completion: '3-5 minutes',
        strategic_intelligence: {
          performance_target: expect.any(Number),
          insights_confidence: expect.any(Number),
          voice_authenticity_score: expect.any(Number),
          historical_context_posts: expect.any(Number),
          top_performers_analyzed: expect.any(Number)
        },
        preview: {
          expected_variants: 3,
          generation_approach: 'Performance-driven with historical intelligence',
          voice_strategy: expect.any(Array)
        }
      })

      // Verify service calls
      expect(mockHistoricalAnalysisService.generateComprehensiveInsights).toHaveBeenCalledWith(
        validPayload.topic,
        {
          maxPosts: 30,
          timeframeDays: 365,
          includeComments: true,
          forceRefresh: false
        }
      )
      expect(mockVoiceLearningService.generateEnhancedVoiceModel).toHaveBeenCalled()
      expect(mockQueueService.add).toHaveBeenCalledWith(
        'content-generation-strategic',
        expect.objectContaining({
          topic: validPayload.topic,
          platform: validPayload.platform,
          strategicIntelligence: expect.any(Object)
        }),
        expect.any(Object)
      )
      expect(mockSupabaseService.createContentJob).toHaveBeenCalled()
    })

    it('should use enhanced voice model when no voice guidelines provided', async () => {
      const payloadWithoutVoice = {
        ...validPayload,
        voiceGuidelines: undefined
      }

      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send(payloadWithoutVoice)

      expect(response.status).toBe(200)
      expect(mockVoiceLearningService.generateEnhancedVoiceModel).toHaveBeenCalled()
      
      // Verify the job data uses enhanced voice model guidelines
      const createJobCall = mockSupabaseService.createContentJob.mock.calls[0][0]
      expect(createJobCall.voice_guide_id).toBe('enhanced-voice-model')
    })

    it('should return 400 for missing topic', async () => {
      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send({ platform: 'linkedin' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Topic is required')
      expect(response.body.error_type).toBe('validation_error')
    })

    it('should return 400 for topic too short', async () => {
      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send({ topic: 'AI', platform: 'linkedin' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('at least 5 characters')
      expect(response.body.error_type).toBe('validation_error')
    })

    it('should handle insights service errors gracefully', async () => {
      mockHistoricalAnalysisService.generateComprehensiveInsights.mockRejectedValueOnce(
        new Error('Insights service temporarily unavailable')
      )

      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send(validPayload)

      expect(response.status).toBe(503)
      expect(response.body.success).toBe(false)
      expect(response.body.error_type).toBe('insights_service_error')
      expect(response.body.request_id).toBeDefined()
    })

    it('should handle voice service errors gracefully', async () => {
      mockVoiceLearningService.generateEnhancedVoiceModel.mockRejectedValueOnce(
        new Error('Voice model generation failed')
      )

      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send(validPayload)

      expect(response.status).toBe(503)
      expect(response.body.success).toBe(false)
      expect(response.body.error_type).toBe('voice_service_error')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseService.createContentJob.mockResolvedValueOnce(null)

      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send(validPayload)

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Failed to start strategic content generation')
    })

    it('should handle queue errors gracefully', async () => {
      mockQueueService.add.mockRejectedValueOnce(
        new Error('Redis connection failed')
      )

      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send(validPayload)

      expect(response.status).toBe(503)
      expect(response.body.success).toBe(false)
      expect(response.body.error_type).toBe('queue_error')
    })

    it('should calculate appropriate performance target', async () => {
      // Mock insights with specific avg_engagement
      mockHistoricalAnalysisService.generateComprehensiveInsights.mockResolvedValueOnce({
        query_topic: 'AI workplace transformation',
        confidence_level: 0.88,
        performance_context: {
          avg_engagement: 80, // Should target 96 (80 * 1.2)
          top_performing_score: 95,
          performance_benchmark: 82,
          total_posts_analyzed: 25,
          timeframe_days: 365
        },
        content_patterns: {},
        voice_patterns: {},
        performance_recommendations: {},
        related_posts: [],
        top_performers: []
      })

      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send(validPayload)

      expect(response.status).toBe(200)
      expect(response.body.data.strategic_intelligence.performance_target).toBe(96)
    })

    it('should include proper metadata in strategic intelligence', async () => {
      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send(validPayload)

      expect(response.status).toBe(200)
      
      const strategicIntel = response.body.data.strategic_intelligence
      expect(strategicIntel).toMatchObject({
        performance_target: expect.any(Number),
        insights_confidence: expect.any(Number),
        voice_authenticity_score: expect.any(Number),
        historical_context_posts: expect.any(Number),
        top_performers_analyzed: expect.any(Number)
      })
      
      expect(strategicIntel.insights_confidence).toBeGreaterThan(0)
      expect(strategicIntel.insights_confidence).toBeLessThanOrEqual(1)
      expect(strategicIntel.voice_authenticity_score).toBeGreaterThan(0)
      expect(strategicIntel.voice_authenticity_score).toBeLessThanOrEqual(100)
    })

    it('should store proper research data in content job', async () => {
      await request(app)
        .post('/api/content/generate-strategic')
        .send(validPayload)

      const createJobCall = mockSupabaseService.createContentJob.mock.calls[0][0]
      expect(createJobCall.research_data).toMatchObject({
        historical_insights: {
          confidence_level: expect.any(Number),
          performance_benchmark: expect.any(Number),
          top_performers_count: expect.any(Number)
        },
        voice_model: {
          authenticity_avg: expect.any(Number),
          authority_avg: expect.any(Number),
          generation_strategy: 'strategic_variants'
        }
      })
    })

    it('should handle different platforms correctly', async () => {
      const platforms = ['linkedin', 'twitter', 'facebook', 'instagram']
      
      for (const platform of platforms) {
        resetAllMocks()
        const response = await request(app)
          .post('/api/content/generate-strategic')
          .send({ ...validPayload, platform })

        expect(response.status).toBe(200)
        
        const queueCall = mockQueueService.add.mock.calls[0][1]
        expect(queueCall.platform).toBe(platform)
      }
    })

    it('should preserve user-provided voice guidelines', async () => {
      const customVoiceGuidelines = 'Be very casual and use lots of emojis'
      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send({ ...validPayload, voiceGuidelines: customVoiceGuidelines })

      expect(response.status).toBe(200)
      
      const queueCall = mockQueueService.add.mock.calls[0][1]
      expect(queueCall.voiceGuidelines).toBe(customVoiceGuidelines)
      
      const createJobCall = mockSupabaseService.createContentJob.mock.calls[0][0]
      expect(createJobCall.voice_guide_id).toBe('user-provided')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/content/generate-strategic')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')

      expect(response.status).toBe(400)
    })

    it('should handle very long topics', async () => {
      const longTopic = 'A'.repeat(1000) // Very long topic
      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send({ topic: longTopic, platform: 'linkedin' })

      expect(response.status).toBe(200) // Should still work
      expect(mockHistoricalAnalysisService.generateComprehensiveInsights)
        .toHaveBeenCalledWith(longTopic, expect.any(Object))
    })

    it('should handle special characters in topic', async () => {
      const specialTopic = 'AI & Machine Learning: The Future? (2024 edition) #innovation'
      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send({ topic: specialTopic, platform: 'linkedin' })

      expect(response.status).toBe(200)
      expect(mockHistoricalAnalysisService.generateComprehensiveInsights)
        .toHaveBeenCalledWith(specialTopic, expect.any(Object))
    })

    it('should not expose sensitive error details in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      mockHistoricalAnalysisService.generateComprehensiveInsights.mockRejectedValueOnce(
        new Error('Database connection string: postgresql://user:pass@host/db')
      )

      const response = await request(app)
        .post('/api/content/generate-strategic')
        .send({ topic: 'test topic', platform: 'linkedin' })

      expect(response.status).toBe(503)
      expect(response.body.message).toBe('An unexpected error occurred')
      expect(response.body.message).not.toContain('Database connection string')

      process.env.NODE_ENV = originalEnv
    })
  })
})