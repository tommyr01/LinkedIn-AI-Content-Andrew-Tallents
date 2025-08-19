import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockSupabaseService, mockOpenAIService, resetAllMocks } from '../helpers/mocks'
import { mockTopPerformingPosts, mockHistoricalInsights } from '../helpers/test-data'

// Mock dependencies before importing the service
vi.mock('../../src/services/supabase', () => ({
  supabaseService: mockSupabaseService
}))

vi.mock('../../src/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

vi.mock('../../src/config', () => ({
  appConfig: {
    openai: {
      apiKey: 'test-key',
      model: 'gpt-4o'
    }
  }
}))

// Mock OpenAI
vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => mockOpenAIService)
}))

// Now import the service
import { HistoricalAnalysisEnhancedService } from '../../src/services/historical-analysis-enhanced'

describe('HistoricalAnalysisEnhancedService', () => {
  let service: HistoricalAnalysisEnhancedService
  
  beforeEach(() => {
    resetAllMocks()
    service = new HistoricalAnalysisEnhancedService()
  })

  describe('generateComprehensiveInsights', () => {
    const mockAnalysisRequest = {
      maxPosts: 30,
      timeframeDays: 365,
      includeComments: true,
      forceRefresh: false
    }

    it('should generate comprehensive insights successfully', async () => {
      // Mock Supabase responses
      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(null) // No cached insights
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce(mockTopPerformingPosts)
      mockSupabaseService.storeHistoricalInsights.mockResolvedValueOnce(mockHistoricalInsights)

      // Mock OpenAI response for content analysis
      mockOpenAIService.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              content_patterns: {
                avg_word_count: 120,
                optimal_word_count_range: [80, 150],
                common_openings: ['Question hook', 'Personal story'],
                best_performing_formats: ['personal_story', 'actionable_list'],
                engagement_triggers: ['vulnerability', 'actionable_advice']
              },
              voice_patterns: {
                dominant_tone: 'professional_authentic',
                key_authority_signals: ['experience shows', 'learned that'],
                emotional_triggers: ['challenging', 'growth']
              },
              performance_recommendations: {
                high_engagement_triggers: ['personal stories', 'actionable insights'],
                format_recommendations: ['story_driven', 'list_format']
              }
            })
          }
        }],
        usage: { prompt_tokens: 500, completion_tokens: 300, total_tokens: 800 }
      })

      const result = await service.generateComprehensiveInsights('leadership challenges', mockAnalysisRequest)

      expect(result).toMatchObject({
        query_topic: 'leadership challenges',
        query_hash: expect.any(String),
        related_posts: expect.any(Array),
        top_performers: expect.any(Array),
        performance_context: {
          avg_engagement: expect.any(Number),
          top_performing_score: expect.any(Number),
          performance_benchmark: expect.any(Number),
          total_posts_analyzed: expect.any(Number),
          timeframe_days: 365
        },
        content_patterns: expect.any(Object),
        voice_patterns: expect.any(Object),
        performance_recommendations: expect.any(Object),
        confidence_level: expect.any(Number),
        analysis_freshness: expect.any(Number)
      })

      // Verify service calls
      expect(mockSupabaseService.getTopPerformingPosts).toHaveBeenCalledWith(30, 365)
      expect(mockOpenAIService.chat.completions.create).toHaveBeenCalled()
      expect(mockSupabaseService.storeHistoricalInsights).toHaveBeenCalled()
    })

    it('should return cached insights when available and not forced refresh', async () => {
      const cachedInsights = { ...mockHistoricalInsights, cache_hit_count: 1 }
      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(cachedInsights)

      const result = await service.generateComprehensiveInsights(
        'leadership challenges', 
        { ...mockAnalysisRequest, forceRefresh: false }
      )

      expect(result).toEqual(cachedInsights)
      expect(mockSupabaseService.getTopPerformingPosts).not.toHaveBeenCalled()
      expect(mockOpenAIService.chat.completions.create).not.toHaveBeenCalled()
    })

    it('should bypass cache when forceRefresh is true', async () => {
      const cachedInsights = { ...mockHistoricalInsights, cache_hit_count: 1 }
      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(cachedInsights)
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce(mockTopPerformingPosts)

      await service.generateComprehensiveInsights(
        'leadership challenges', 
        { ...mockAnalysisRequest, forceRefresh: true }
      )

      expect(mockSupabaseService.getTopPerformingPosts).toHaveBeenCalled()
      expect(mockOpenAIService.chat.completions.create).toHaveBeenCalled()
    })

    it('should handle empty posts data gracefully', async () => {
      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(null)
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce([])

      const result = await service.generateComprehensiveInsights('empty topic', mockAnalysisRequest)

      expect(result.related_posts).toEqual([])
      expect(result.top_performers).toEqual([])
      expect(result.performance_context.total_posts_analyzed).toBe(0)
      expect(result.confidence_level).toBeLessThan(0.5) // Low confidence with no data
    })

    it('should calculate performance metrics correctly', async () => {
      const testPosts = [
        { viral_score: 95, engagement_rate: 15.0 },
        { viral_score: 85, engagement_rate: 12.0 },
        { viral_score: 75, engagement_rate: 10.0 },
        { viral_score: 65, engagement_rate: 8.0 },
        { viral_score: 55, engagement_rate: 6.0 }
      ]

      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(null)
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce(testPosts)

      const result = await service.generateComprehensiveInsights('test topic', mockAnalysisRequest)

      expect(result.performance_context.avg_engagement).toBe(10.2) // Average of engagement rates
      expect(result.performance_context.top_performing_score).toBe(95) // Highest viral score
      expect(result.performance_context.total_posts_analyzed).toBe(5)
    })

    it('should handle OpenAI API errors gracefully', async () => {
      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(null)
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce(mockTopPerformingPosts)
      
      mockOpenAIService.chat.completions.create.mockRejectedValueOnce(
        new Error('OpenAI API rate limit exceeded')
      )

      await expect(
        service.generateComprehensiveInsights('test topic', mockAnalysisRequest)
      ).rejects.toThrow('OpenAI API rate limit exceeded')
    })

    it('should handle malformed OpenAI response', async () => {
      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(null)
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce(mockTopPerformingPosts)
      
      mockOpenAIService.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'invalid json response'
          }
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      })

      await expect(
        service.generateComprehensiveInsights('test topic', mockAnalysisRequest)
      ).rejects.toThrow()
    })

    it('should generate appropriate query hash for caching', async () => {
      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(null)
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce(mockTopPerformingPosts)

      const result1 = await service.generateComprehensiveInsights('same topic', mockAnalysisRequest)
      const result2 = await service.generateComprehensiveInsights('same topic', mockAnalysisRequest)

      expect(result1.query_hash).toBe(result2.query_hash)

      const result3 = await service.generateComprehensiveInsights('different topic', mockAnalysisRequest)
      expect(result3.query_hash).not.toBe(result1.query_hash)
    })

    it('should filter and categorize posts correctly', async () => {
      const mixedPerformancePosts = [
        { ...mockTopPerformingPosts[0], viral_score: 95, performance_tier: 'top_10_percent' },
        { ...mockTopPerformingPosts[1], viral_score: 85, performance_tier: 'top_25_percent' },
        { ...mockTopPerformingPosts[2], viral_score: 65, performance_tier: 'average' },
        { id: 'low-4', viral_score: 45, performance_tier: 'below_average' }
      ]

      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(null)
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce(mixedPerformancePosts)

      const result = await service.generateComprehensiveInsights('test topic', mockAnalysisRequest)

      // Should prioritize top performers
      expect(result.top_performers.length).toBeGreaterThan(0)
      expect(result.top_performers[0].viral_score).toBeGreaterThanOrEqual(85)
      expect(result.related_posts.length).toBe(mixedPerformancePosts.length)
    })

    it('should set appropriate confidence levels based on data quality', async () => {
      // Test high confidence with good data
      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(null)
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce(mockTopPerformingPosts)

      const resultWithGoodData = await service.generateComprehensiveInsights('test topic', mockAnalysisRequest)
      expect(resultWithGoodData.confidence_level).toBeGreaterThan(0.7)

      // Test low confidence with limited data
      resetAllMocks()
      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(null)
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce([mockTopPerformingPosts[0]]) // Only 1 post

      const resultWithLimitedData = await service.generateComprehensiveInsights('test topic', mockAnalysisRequest)
      expect(resultWithLimitedData.confidence_level).toBeLessThan(0.7)
    })
  })

  describe('populateHistoricalPerformanceData', () => {
    it('should populate performance data successfully', async () => {
      // Mock Supabase to return posts without performance analytics
      const postsWithoutAnalytics = [
        { id: 'post-1', content_text: 'Test content 1', total_reactions: 100 },
        { id: 'post-2', content_text: 'Test content 2', total_reactions: 150 }
      ]

      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce(postsWithoutAnalytics)
      mockSupabaseService.storeVoiceLearningData.mockResolvedValue({ id: 'voice-1' })

      // Mock voice learning service
      const mockVoiceLearningService = {
        analyzeVoicePatterns: vi.fn().mockResolvedValue({
          authenticity_score: 85,
          authority_score: 80,
          vulnerability_score: 75,
          confidence_score: 0.9
        })
      }

      // Mock the voice learning service import
      vi.doMock('../../src/services/voice-learning-enhanced', () => ({
        voiceLearningEnhancedService: mockVoiceLearningService
      }))

      const result = await service.populateHistoricalPerformanceData()

      expect(result.postsProcessed).toBe(postsWithoutAnalytics.length)
      expect(result.voiceAnalysisCompleted).toBeGreaterThanOrEqual(0)
      expect(result.errors).toBeGreaterThanOrEqual(0)
      expect(mockSupabaseService.getTopPerformingPosts).toHaveBeenCalled()
    })

    it('should handle voice analysis errors gracefully', async () => {
      const postsData = [{ id: 'post-1', content_text: 'Test content' }]
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce(postsData)

      // Mock voice learning service to throw error
      const mockVoiceLearningService = {
        analyzeVoicePatterns: vi.fn().mockRejectedValue(new Error('Voice analysis failed'))
      }

      vi.doMock('../../src/services/voice-learning-enhanced', () => ({
        voiceLearningEnhancedService: mockVoiceLearningService
      }))

      const result = await service.populateHistoricalPerformanceData()

      expect(result.errors).toBeGreaterThan(0)
      expect(result.postsProcessed).toBe(postsData.length)
    })

    it('should handle empty posts data', async () => {
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce([])

      const result = await service.populateHistoricalPerformanceData()

      expect(result.postsProcessed).toBe(0)
      expect(result.voiceAnalysisCompleted).toBe(0)
      expect(result.errors).toBe(0)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabaseService.getTopPerformingPosts.mockRejectedValueOnce(
        new Error('Database connection failed')
      )

      await expect(
        service.generateComprehensiveInsights('test topic', { maxPosts: 10, timeframeDays: 30 })
      ).rejects.toThrow('Database connection failed')
    })

    it('should handle very long topic strings', async () => {
      const longTopic = 'A'.repeat(1000)
      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(null)
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce([])

      const result = await service.generateComprehensiveInsights(longTopic, { maxPosts: 10, timeframeDays: 30 })

      expect(result.query_topic).toBe(longTopic)
      expect(result.query_hash).toBeDefined()
    })

    it('should handle special characters in topics', async () => {
      const specialTopic = 'Leadership & Growth: What I\'ve Learned! (2024) #insights @everyone'
      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(null)
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce([])

      const result = await service.generateComprehensiveInsights(specialTopic, { maxPosts: 10, timeframeDays: 30 })

      expect(result.query_topic).toBe(specialTopic)
      expect(result.query_hash).toBeDefined()
    })

    it('should validate analysis request parameters', async () => {
      const invalidRequest = {
        maxPosts: -5, // Invalid negative number
        timeframeDays: 0, // Invalid zero days
        includeComments: 'yes', // Invalid boolean type
        forceRefresh: 'true' // Invalid boolean type
      }

      mockSupabaseService.getHistoricalInsights.mockResolvedValueOnce(null)
      mockSupabaseService.getTopPerformingPosts.mockResolvedValueOnce([])

      // Should handle invalid parameters gracefully by using defaults or sanitizing
      const result = await service.generateComprehensiveInsights('test topic', invalidRequest as any)

      expect(result).toBeDefined()
      expect(result.performance_context.timeframe_days).toBeGreaterThan(0)
    })
  })
})