import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import performanceRouter from '../../src/routes/performance'
import { 
  mockSupabaseService, 
  mockHistoricalAnalysisService, 
  mockVoiceLearningService,
  mockPerformanceInsightsService,
  resetAllMocks 
} from '../helpers/mocks'
import { mockTopPerformingPosts, mockVoiceDataArray } from '../helpers/test-data'

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

vi.mock('../../src/services/performance-insights', () => ({
  performanceInsightsService: mockPerformanceInsightsService
}))

vi.mock('../../src/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

describe('Performance Analytics API Routes', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/performance', performanceRouter)
    resetAllMocks()
  })

  describe('GET /api/performance/analytics', () => {
    it('should return comprehensive analytics dashboard data', async () => {
      const response = await request(app)
        .get('/api/performance/analytics?timeframe=30&metric=viral_score')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        overview: {
          timeframe_days: 30,
          total_posts_analyzed: expect.any(Number),
          total_voice_analyses: expect.any(Number),
          total_variants_generated: expect.any(Number),
          data_freshness_score: expect.any(Number)
        },
        performance_metrics: {
          avg_viral_score: expect.any(Number),
          top_viral_score: expect.any(Number),
          engagement_rate_avg: expect.any(String),
          performance_distribution: {
            top_10_percent: expect.any(Number),
            top_25_percent: expect.any(Number),
            average: expect.any(Number),
            below_average: expect.any(Number)
          }
        },
        voice_analytics: {
          authenticity_avg: expect.any(Number),
          authority_avg: expect.any(Number),
          vulnerability_avg: expect.any(Number),
          engagement_potential_avg: expect.any(Number),
          evolution_trend: expect.any(Object)
        },
        performance_trends: expect.any(Array),
        strategic_generation_stats: {
          variants_generated: expect.any(Number),
          posted_variants: expect.any(Number),
          avg_prediction_accuracy: expect.any(Number),
          best_performing_agent: expect.any(String),
          success_rate: expect.any(Number)
        },
        top_performers: expect.any(Array),
        generated_at: expect.any(String)
      })

      // Verify service calls
      expect(mockSupabaseService.getTopPerformingPosts).toHaveBeenCalledWith(50, 30)
      expect(mockSupabaseService.getVoiceLearningData).toHaveBeenCalledWith('post', 100)
      expect(mockSupabaseService.getContentVariantsTracking).toHaveBeenCalledWith(30)
    })

    it('should use default parameters when none provided', async () => {
      const response = await request(app)
        .get('/api/performance/analytics')

      expect(response.status).toBe(200)
      expect(response.body.data.overview.timeframe_days).toBe(30)
      expect(mockSupabaseService.getTopPerformingPosts).toHaveBeenCalledWith(50, 30)
    })

    it('should handle custom timeframe parameter', async () => {
      const response = await request(app)
        .get('/api/performance/analytics?timeframe=90')

      expect(response.status).toBe(200)
      expect(response.body.data.overview.timeframe_days).toBe(90)
      expect(mockSupabaseService.getTopPerformingPosts).toHaveBeenCalledWith(50, 90)
    })

    it('should calculate correct performance metrics', async () => {
      // Mock specific data for calculation verification
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce([
        { viral_score: 90, engagement_rate: 15.0, performance_tier: 'top_10_percent' },
        { viral_score: 80, engagement_rate: 12.0, performance_tier: 'top_25_percent' },
        { viral_score: 70, engagement_rate: 8.0, performance_tier: 'average' }
      ])

      const response = await request(app)
        .get('/api/performance/analytics')

      expect(response.status).toBe(200)
      expect(response.body.data.performance_metrics.avg_viral_score).toBe(80)
      expect(response.body.data.performance_metrics.top_viral_score).toBe(90)
      expect(response.body.data.performance_metrics.engagement_rate_avg).toBe('11.67')
    })

    it('should handle empty data gracefully', async () => {
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce([])
      mockSupabaseService.getVoiceLearningData.mockResolvedValueOnce([])
      mockSupabaseService.getContentVariantsTracking.mockResolvedValueOnce([])

      const response = await request(app)
        .get('/api/performance/analytics')

      expect(response.status).toBe(200)
      expect(response.body.data.performance_metrics.avg_viral_score).toBe(0)
      expect(response.body.data.voice_analytics.authenticity_avg).toBe(0)
      expect(response.body.data.strategic_generation_stats.variants_generated).toBe(0)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseService.getTopPerformingPosts.mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      const response = await request(app)
        .get('/api/performance/analytics')

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.error_type).toBe('analytics_error')
    })

    it('should include top performers preview', async () => {
      const response = await request(app)
        .get('/api/performance/analytics')

      expect(response.status).toBe(200)
      expect(response.body.data.top_performers).toHaveLength(Math.min(5, mockTopPerformingPosts.length))
      
      if (response.body.data.top_performers.length > 0) {
        const topPerformer = response.body.data.top_performers[0]
        expect(topPerformer).toMatchObject({
          post_id: expect.any(String),
          content_preview: expect.any(String),
          viral_score: expect.any(Number),
          engagement_rate: expect.any(Number),
          performance_tier: expect.any(String),
          posted_at: expect.any(String)
        })
        expect(topPerformer.content_preview.length).toBeLessThanOrEqual(153) // 150 + '...'
      }
    })
  })

  describe('GET /api/performance/insights', () => {
    it('should generate AI insights successfully', async () => {
      const response = await request(app)
        .get('/api/performance/insights?topic=leadership&timeframe=90')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        insights: expect.any(Array),
        recommendations: expect.any(Array),
        voice_guidance: expect.any(Object),
        content_strategy: expect.any(Object),
        performance_predictions: expect.any(Object),
        confidence_score: expect.any(Number),
        generated_at: expect.any(String)
      })

      expect(mockPerformanceInsightsService.generatePerformanceInsights)
        .toHaveBeenCalledWith('leadership', {
          timeframeDays: 90,
          includeVoiceAnalysis: true,
          includeContentPatterns: true,
          includePredictions: true
        })
    })

    it('should use default topic when none provided', async () => {
      const response = await request(app)
        .get('/api/performance/insights')

      expect(response.status).toBe(200)
      expect(mockPerformanceInsightsService.generatePerformanceInsights)
        .toHaveBeenCalledWith('general performance', expect.any(Object))
    })

    it('should handle service errors gracefully', async () => {
      mockPerformanceInsightsService.generatePerformanceInsights.mockRejectedValueOnce(
        new Error('AI service unavailable')
      )

      const response = await request(app)
        .get('/api/performance/insights')

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Failed to generate AI insights')
    })
  })

  describe('GET /api/performance/voice-evolution', () => {
    it('should return voice evolution data successfully', async () => {
      const response = await request(app)
        .get('/api/performance/voice-evolution?period=12&metric=authenticity')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        metric_tracked: 'authenticity',
        period_months: 12,
        data_points: expect.any(Number),
        evolution_trend: expect.any(String),
        improvement_rate: expect.any(Number),
        current_score: expect.any(Number),
        peak_score: expect.any(Number),
        monthly_progress: expect.any(Array),
        insights: expect.any(Array),
        generated_at: expect.any(String)
      })

      expect(mockSupabaseService.getVoiceLearningData).toHaveBeenCalledWith('post', 200)
    })

    it('should use default parameters', async () => {
      const response = await request(app)
        .get('/api/performance/voice-evolution')

      expect(response.status).toBe(200)
      expect(response.body.data.metric_tracked).toBe('authenticity')
      expect(response.body.data.period_months).toBe(12)
    })

    it('should handle different metrics', async () => {
      const metrics = ['authenticity', 'authority', 'vulnerability', 'engagement_potential']
      
      for (const metric of metrics) {
        const response = await request(app)
          .get(`/api/performance/voice-evolution?metric=${metric}`)

        expect(response.status).toBe(200)
        expect(response.body.data.metric_tracked).toBe(metric)
      }
    })

    it('should handle empty voice data', async () => {
      mockSupabaseService.getVoiceLearningData.mockResolvedValueOnce([])

      const response = await request(app)
        .get('/api/performance/voice-evolution')

      expect(response.status).toBe(200)
      expect(response.body.data.data_points).toBe(0)
      expect(response.body.data.current_score).toBe(0)
      expect(response.body.data.peak_score).toBe(0)
    })
  })

  describe('POST /api/performance/initialize', () => {
    it('should initialize historical performance data', async () => {
      const response = await request(app)
        .post('/api/performance/initialize')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        postsProcessed: expect.any(Number),
        voiceAnalysisCompleted: expect.any(Number),
        errors: expect.any(Number),
        successRate: expect.any(String)
      })

      expect(mockHistoricalAnalysisService.populateHistoricalPerformanceData)
        .toHaveBeenCalled()
    })

    it('should handle initialization errors', async () => {
      mockHistoricalAnalysisService.populateHistoricalPerformanceData
        .mockRejectedValueOnce(new Error('Initialization failed'))

      const response = await request(app)
        .post('/api/performance/initialize')

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Failed to initialize historical performance data')
    })
  })

  describe('POST /api/performance/insights', () => {
    const validPayload = {
      topic: 'leadership challenges',
      maxPosts: 50,
      timeframeDays: 180,
      includeComments: true,
      forceRefresh: false
    }

    it('should generate comprehensive insights', async () => {
      const response = await request(app)
        .post('/api/performance/insights')
        .send(validPayload)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        query_topic: validPayload.topic,
        confidence_level: expect.any(Number),
        analysis_freshness: expect.any(Number),
        performance_context: expect.any(Object),
        content_patterns: expect.any(Object),
        voice_patterns: expect.any(Object),
        recommendations: expect.any(Object),
        top_performers_preview: expect.any(Array)
      })

      expect(mockHistoricalAnalysisService.generateComprehensiveInsights)
        .toHaveBeenCalledWith(validPayload.topic, {
          maxPosts: validPayload.maxPosts,
          timeframeDays: validPayload.timeframeDays,
          includeComments: validPayload.includeComments,
          forceRefresh: validPayload.forceRefresh
        })
    })

    it('should require topic parameter', async () => {
      const response = await request(app)
        .post('/api/performance/insights')
        .send({ maxPosts: 30 })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Topic is required')
    })

    it('should use default parameters when not provided', async () => {
      const response = await request(app)
        .post('/api/performance/insights')
        .send({ topic: 'test topic' })

      expect(response.status).toBe(200)
      expect(mockHistoricalAnalysisService.generateComprehensiveInsights)
        .toHaveBeenCalledWith('test topic', {
          maxPosts: 30,
          timeframeDays: 365,
          includeComments: false,
          forceRefresh: false
        })
    })
  })

  describe('POST /api/performance/voice-analysis', () => {
    const validPayload = {
      content: 'This is a test post about leadership challenges and personal growth.',
      contentType: 'post',
      context: 'LinkedIn thought leadership post',
      performanceData: {
        engagement_score: 85,
        viral_score: 78,
        performance_tier: 'top_25_percent'
      }
    }

    it('should analyze voice patterns successfully', async () => {
      const response = await request(app)
        .post('/api/performance/voice-analysis')
        .send(validPayload)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
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

      expect(mockVoiceLearningService.analyzeVoicePatterns)
        .toHaveBeenCalledWith(validPayload.content, {
          content_type: validPayload.contentType,
          context: validPayload.context,
          performance_data: validPayload.performanceData
        })
    })

    it('should require content parameter', async () => {
      const response = await request(app)
        .post('/api/performance/voice-analysis')
        .send({ contentType: 'post' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Content is required for voice analysis')
    })

    it('should use default parameters', async () => {
      const response = await request(app)
        .post('/api/performance/voice-analysis')
        .send({ content: 'Test content' })

      expect(response.status).toBe(200)
      expect(mockVoiceLearningService.analyzeVoicePatterns)
        .toHaveBeenCalledWith('Test content', {
          content_type: 'post',
          context: 'Manual analysis',
          performance_data: undefined
        })
    })
  })

  describe('GET /api/performance/voice-model', () => {
    it('should generate enhanced voice model', async () => {
      const response = await request(app)
        .get('/api/performance/voice-model')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        voice_profile: expect.any(Object),
        generation_guidelines: expect.any(String),
        strength_factors: expect.any(Array),
        improvement_areas: expect.any(Array),
        generated_at: expect.any(String)
      })

      expect(mockVoiceLearningService.generateEnhancedVoiceModel).toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      mockVoiceLearningService.generateEnhancedVoiceModel
        .mockRejectedValueOnce(new Error('Voice model generation failed'))

      const response = await request(app)
        .get('/api/performance/voice-model')

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Failed to generate voice model')
    })
  })

  describe('GET /api/performance/stats', () => {
    it('should return comprehensive performance statistics', async () => {
      const response = await request(app)
        .get('/api/performance/stats')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        performance_analytics: {
          total_posts_analyzed: expect.any(Number),
          avg_viral_score: expect.any(Number),
          top_performing_score: expect.any(Number),
          performance_distribution: expect.any(Object)
        },
        voice_learning: {
          total_analyses_completed: expect.any(Number),
          avg_authenticity_score: expect.any(Number),
          avg_authority_score: expect.any(Number),
          avg_vulnerability_score: expect.any(Number),
          avg_confidence: expect.any(String)
        },
        system_health: {
          last_analysis_date: expect.any(String),
          cache_efficiency: expect.any(String),
          data_freshness_score: expect.any(Number)
        }
      })

      expect(mockSupabaseService.getTopPerformingPosts).toHaveBeenCalledWith(10, 365)
      expect(mockSupabaseService.getVoiceLearningData).toHaveBeenCalledWith('post', 50)
    })
  })

  describe('POST /api/performance/update-tiers', () => {
    it('should update performance tiers successfully', async () => {
      mockSupabaseService.updatePerformanceTiers.mockResolvedValueOnce(true)

      const response = await request(app)
        .post('/api/performance/update-tiers')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Performance tiers updated successfully')
      expect(mockSupabaseService.updatePerformanceTiers).toHaveBeenCalled()
    })

    it('should handle update failures', async () => {
      mockSupabaseService.updatePerformanceTiers.mockResolvedValueOnce(false)

      const response = await request(app)
        .post('/api/performance/update-tiers')

      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Failed to update performance tiers')
    })
  })

  describe('POST /api/performance/cleanup', () => {
    it('should cleanup expired insights successfully', async () => {
      mockSupabaseService.cleanupExpiredInsights.mockResolvedValueOnce(5)

      const response = await request(app)
        .post('/api/performance/cleanup')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Cleaned up 5 expired insights')
      expect(response.body.deleted_count).toBe(5)
      expect(mockSupabaseService.cleanupExpiredInsights).toHaveBeenCalled()
    })
  })
})