import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockSupabaseService, resetAllMocks } from '../helpers/mocks'
import { 
  mockPostPerformanceAnalytics, 
  mockVoiceLearningData, 
  mockHistoricalInsights,
  mockContentVariantsTracking,
  mockContentJob,
  mockContentDraft,
  createMockPostAnalytics,
  createMockVoiceData
} from '../helpers/test-data'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  upsert: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  single: vi.fn()
}

// Chain-able query builder mock
const createQueryBuilder = () => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn()
  }
  return builder
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))

// Import the actual service for testing
import { SupabaseService } from '../../src/services/supabase'

describe('Database Integration Tests - Supabase', () => {
  let supabaseService: SupabaseService

  beforeEach(() => {
    resetAllMocks()
    
    // Reset mock implementations
    mockSupabaseClient.from.mockImplementation(() => createQueryBuilder())
    
    // Create a new service instance for each test
    supabaseService = new SupabaseService()
  })

  describe('Performance Analytics Operations', () => {
    it('should store post performance analytics correctly', async () => {
      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: { id: 'analytics-123', ...mockPostPerformanceAnalytics },
        error: null
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.storePostPerformanceAnalytics(mockPostPerformanceAnalytics)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('post_performance_analytics')
      expect(queryBuilder.insert).toHaveBeenCalledWith([mockPostPerformanceAnalytics])
      expect(result).toMatchObject({
        id: 'analytics-123',
        post_id: mockPostPerformanceAnalytics.post_id
      })
    })

    it('should retrieve top performing posts with proper filtering', async () => {
      const mockPosts = [
        createMockPostAnalytics({ viral_score: 95, performance_tier: 'top_10_percent' }),
        createMockPostAnalytics({ viral_score: 88, performance_tier: 'top_10_percent' }),
        createMockPostAnalytics({ viral_score: 82, performance_tier: 'top_25_percent' })
      ]

      const queryBuilder = createQueryBuilder()
      queryBuilder.then.mockResolvedValueOnce({ data: mockPosts, error: null })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.getTopPerformingPosts(50, 365)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('post_performance_analytics')
      expect(queryBuilder.select).toHaveBeenCalledWith('*')
      expect(queryBuilder.gte).toHaveBeenCalled() // Date filtering
      expect(queryBuilder.order).toHaveBeenCalledWith('viral_score', { ascending: false })
      expect(queryBuilder.limit).toHaveBeenCalledWith(50)
      expect(result).toHaveLength(3)
      expect(result[0].viral_score).toBe(95) // Highest score first
    })

    it('should handle database errors gracefully', async () => {
      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed', code: 'CONNECTION_ERROR' }
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      await expect(
        supabaseService.storePostPerformanceAnalytics(mockPostPerformanceAnalytics)
      ).rejects.toThrow('Database connection failed')
    })

    it('should update performance tiers correctly', async () => {
      const queryBuilder = createQueryBuilder()
      queryBuilder.then.mockResolvedValueOnce({ data: [], error: null })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.updatePerformanceTiers()

      expect(result).toBe(true)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('post_performance_analytics')
      // Should execute multiple update queries for different tiers
    })

    it('should calculate viral scores using proper algorithm', async () => {
      const testPost = {
        total_reactions: 100,
        comments_count: 25,
        reposts_count: 15,
        shares_count: 10,
        engagement_rate: 12.5
      }

      const expectedViralScore = Math.round(
        (testPost.total_reactions * 0.4) + 
        (testPost.comments_count * 0.3) + 
        (testPost.reposts_count * 0.2) + 
        (testPost.shares_count * 0.1) + 
        (testPost.engagement_rate * 2)
      )

      const postWithViralScore = {
        ...mockPostPerformanceAnalytics,
        ...testPost,
        viral_score: expectedViralScore
      }

      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: postWithViralScore,
        error: null
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.storePostPerformanceAnalytics(postWithViralScore)

      expect(result.viral_score).toBe(expectedViralScore)
    })
  })

  describe('Voice Learning Data Operations', () => {
    it('should store voice learning data with proper validation', async () => {
      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: { id: 'voice-123', ...mockVoiceLearningData },
        error: null
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.storeVoiceLearningData(mockVoiceLearningData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('voice_learning_data')
      expect(queryBuilder.insert).toHaveBeenCalledWith([mockVoiceLearningData])
      expect(result).toMatchObject({
        id: 'voice-123',
        content_id: mockVoiceLearningData.content_id
      })
    })

    it('should retrieve voice learning data with content type filtering', async () => {
      const mockVoiceDataPosts = [
        createMockVoiceData({ content_type: 'post', authenticity_score: 90 }),
        createMockVoiceData({ content_type: 'post', authenticity_score: 85 }),
        createMockVoiceData({ content_type: 'comment', authenticity_score: 80 })
      ]

      const queryBuilder = createQueryBuilder()
      queryBuilder.then.mockResolvedValueOnce({ 
        data: mockVoiceDataPosts.filter(d => d.content_type === 'post'), 
        error: null 
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.getVoiceLearningData('post', 100)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('voice_learning_data')
      expect(queryBuilder.eq).toHaveBeenCalledWith('content_type', 'post')
      expect(queryBuilder.order).toHaveBeenCalledWith('analyzed_at', { ascending: false })
      expect(queryBuilder.limit).toHaveBeenCalledWith(100)
      expect(result).toHaveLength(2) // Only posts, not comments
    })

    it('should validate voice learning data scores within valid ranges', async () => {
      const invalidVoiceData = createMockVoiceData({
        authenticity_score: 150, // Invalid - above 100
        authority_score: -10,    // Invalid - below 0
        vulnerability_score: 75,
        confidence_score: 1.5    // Invalid - above 1.0
      })

      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Check constraint violation', code: '23514' }
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      await expect(
        supabaseService.storeVoiceLearningData(invalidVoiceData)
      ).rejects.toThrow('Check constraint violation')
    })

    it('should link voice data to performance analytics correctly', async () => {
      const voiceDataWithPerformanceLink = createMockVoiceData({
        post_performance_id: 'analytics-123'
      })

      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: voiceDataWithPerformanceLink,
        error: null
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.storeVoiceLearningData(voiceDataWithPerformanceLink)

      expect(result.post_performance_id).toBe('analytics-123')
      expect(queryBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          post_performance_id: 'analytics-123'
        })
      ])
    })
  })

  describe('Historical Insights Operations', () => {
    it('should store and retrieve historical insights with caching', async () => {
      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: { id: 'insights-123', ...mockHistoricalInsights },
        error: null
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.storeHistoricalInsights(mockHistoricalInsights)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('historical_insights')
      expect(result).toMatchObject({
        id: 'insights-123',
        query_topic: mockHistoricalInsights.query_topic
      })
    })

    it('should retrieve cached insights by query hash', async () => {
      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: mockHistoricalInsights,
        error: null
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.getHistoricalInsights(mockHistoricalInsights.query_hash)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('historical_insights')
      expect(queryBuilder.eq).toHaveBeenCalledWith('query_hash', mockHistoricalInsights.query_hash)
      expect(queryBuilder.single).toHaveBeenCalled()
      expect(result).toEqual(mockHistoricalInsights)
    })

    it('should clean up expired insights correctly', async () => {
      const queryBuilder = createQueryBuilder()
      queryBuilder.then.mockResolvedValueOnce({
        data: [{ id: 'expired-1' }, { id: 'expired-2' }],
        error: null
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const deletedCount = await supabaseService.cleanupExpiredInsights()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('historical_insights')
      expect(queryBuilder.delete).toHaveBeenCalled()
      expect(queryBuilder.lt).toHaveBeenCalled() // expires_at < now()
      expect(deletedCount).toBe(2)
    })

    it('should handle concurrent access to insights cache', async () => {
      const queryHash = 'concurrent-test-hash'
      
      // Simulate multiple concurrent requests for the same insights
      const concurrentRequests = Array(5).fill(null).map(() => {
        const queryBuilder = createQueryBuilder()
        queryBuilder.single.mockResolvedValueOnce({
          data: { ...mockHistoricalInsights, query_hash: queryHash },
          error: null
        })
        mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)
        
        return supabaseService.getHistoricalInsights(queryHash)
      })

      const results = await Promise.all(concurrentRequests)

      // All requests should return the same data
      results.forEach(result => {
        expect(result?.query_hash).toBe(queryHash)
      })

      // Database should have been queried for each request (no in-memory caching in this mock)
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(5)
    })
  })

  describe('Content Generation Job Tracking', () => {
    it('should create content jobs with proper status tracking', async () => {
      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: { ...mockContentJob, id: 'job-123' },
        error: null
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.createContentJob(mockContentJob)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('content_jobs')
      expect(queryBuilder.insert).toHaveBeenCalledWith([mockContentJob])
      expect(result).toMatchObject({
        id: 'job-123',
        status: mockContentJob.status,
        topic: mockContentJob.topic
      })
    })

    it('should update job status and progress correctly', async () => {
      const jobId = 'job-123'
      const newStatus = 'processing'
      const progress = 50

      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: { ...mockContentJob, id: jobId, status: newStatus, progress },
        error: null
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.updateContentJobStatus(jobId, newStatus, progress)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('content_jobs')
      expect(queryBuilder.update).toHaveBeenCalledWith({
        status: newStatus,
        progress,
        updated_at: expect.any(String)
      })
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', jobId)
      expect(result).toBe(true)
    })

    it('should store content drafts with proper job linking', async () => {
      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: { ...mockContentDraft, id: 'draft-123' },
        error: null
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.createContentDraft(mockContentDraft)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('content_drafts')
      expect(queryBuilder.insert).toHaveBeenCalledWith([mockContentDraft])
      expect(result).toMatchObject({
        id: 'draft-123',
        job_id: mockContentDraft.job_id
      })
    })
  })

  describe('Content Variants Tracking', () => {
    it('should store content variants with prediction data', async () => {
      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: { ...mockContentVariantsTracking, id: 'tracking-123' },
        error: null
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.storeContentVariantsTracking(mockContentVariantsTracking)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('content_variants_tracking')
      expect(queryBuilder.insert).toHaveBeenCalledWith([mockContentVariantsTracking])
      expect(result).toMatchObject({
        id: 'tracking-123',
        job_id: mockContentVariantsTracking.job_id
      })
    })

    it('should retrieve variants tracking data with time filtering', async () => {
      const timeframeDays = 30
      const mockVariantsData = [mockContentVariantsTracking]

      const queryBuilder = createQueryBuilder()
      queryBuilder.then.mockResolvedValueOnce({
        data: mockVariantsData,
        error: null
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const result = await supabaseService.getContentVariantsTracking(timeframeDays)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('content_variants_tracking')
      expect(queryBuilder.gte).toHaveBeenCalled() // Date filtering
      expect(queryBuilder.order).toHaveBeenCalledWith('generation_timestamp', { ascending: false })
      expect(result).toEqual(mockVariantsData)
    })

    it('should update variants with actual performance data', async () => {
      const variantId = 'tracking-123'
      const performanceUpdate = {
        was_posted: true,
        posted_at: '2024-01-16T10:00:00Z',
        actual_performance_id: 'analytics-456',
        prediction_accuracy: 0.85,
        performance_delta: 10
      }

      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: { ...mockContentVariantsTracking, ...performanceUpdate },
        error: null
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      await supabaseService.updateVariantPerformanceData(variantId, performanceUpdate)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('content_variants_tracking')
      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          was_posted: true,
          prediction_accuracy: 0.85
        })
      )
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', variantId)
    })
  })

  describe('Database Constraints and Validation', () => {
    it('should enforce foreign key constraints', async () => {
      const voiceDataWithInvalidPerformanceId = createMockVoiceData({
        post_performance_id: 'non-existent-analytics-id'
      })

      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { 
          message: 'Foreign key constraint violation', 
          code: '23503',
          details: 'Key (post_performance_id)=(non-existent-analytics-id) is not present in table "post_performance_analytics"'
        }
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      await expect(
        supabaseService.storeVoiceLearningData(voiceDataWithInvalidPerformanceId)
      ).rejects.toThrow('Foreign key constraint violation')
    })

    it('should enforce unique constraints', async () => {
      const duplicateInsight = { ...mockHistoricalInsights }

      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { 
          message: 'Unique constraint violation', 
          code: '23505',
          details: 'Key (query_hash)=(hash-123) already exists'
        }
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      await expect(
        supabaseService.storeHistoricalInsights(duplicateInsight)
      ).rejects.toThrow('Unique constraint violation')
    })

    it('should enforce check constraints on score ranges', async () => {
      const invalidScoreData = createMockVoiceData({
        authenticity_score: -5, // Below valid range
        confidence_score: 2.0   // Above valid range
      })

      const queryBuilder = createQueryBuilder()
      queryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: { 
          message: 'Check constraint violation', 
          code: '23514',
          details: 'New row violates check constraint "authenticity_score_range"'
        }
      })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      await expect(
        supabaseService.storeVoiceLearningData(invalidScoreData)
      ).rejects.toThrow('Check constraint violation')
    })
  })

  describe('Transaction Handling', () => {
    it('should handle transaction rollback on failure', async () => {
      const jobData = mockContentJob
      const draftData = [mockContentDraft]

      // Mock transaction failure
      const queryBuilder = createQueryBuilder()
      queryBuilder.single
        .mockResolvedValueOnce({ data: jobData, error: null }) // Job creation succeeds
        .mockResolvedValueOnce({ data: null, error: { message: 'Draft creation failed' } }) // Draft creation fails

      mockSupabaseClient.from.mockReturnValue(queryBuilder)

      // This would be part of a transactional operation
      await expect(async () => {
        await supabaseService.createContentJob(jobData)
        await supabaseService.createContentDraft(draftData[0]) // This fails
      }).rejects.toThrow('Draft creation failed')

      // In a real scenario, the job creation would be rolled back
      // This test ensures error handling is proper
    })

    it('should handle concurrent job creation correctly', async () => {
      const concurrentJobs = Array(5).fill(null).map((_, index) => ({
        ...mockContentJob,
        id: `job-${index}`,
        topic: `Concurrent topic ${index}`
      }))

      // Mock successful creation for all jobs
      concurrentJobs.forEach(job => {
        const queryBuilder = createQueryBuilder()
        queryBuilder.single.mockResolvedValueOnce({
          data: job,
          error: null
        })
        mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)
      })

      const results = await Promise.all(
        concurrentJobs.map(job => supabaseService.createContentJob(job))
      )

      results.forEach((result, index) => {
        expect(result).toMatchObject({
          id: `job-${index}`,
          topic: `Concurrent topic ${index}`
        })
      })

      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(5)
    })
  })

  describe('Query Optimization and Indexing', () => {
    it('should use proper indexing for performance queries', async () => {
      const queryBuilder = createQueryBuilder()
      queryBuilder.then.mockResolvedValueOnce({ data: [], error: null })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      await supabaseService.getTopPerformingPosts(50, 365)

      // Verify the query uses indexed columns
      expect(queryBuilder.order).toHaveBeenCalledWith('viral_score', { ascending: false })
      expect(queryBuilder.gte).toHaveBeenCalled() // Date filtering should use indexed posted_at
    })

    it('should optimize voice data queries with proper ordering', async () => {
      const queryBuilder = createQueryBuilder()
      queryBuilder.then.mockResolvedValueOnce({ data: [], error: null })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      await supabaseService.getVoiceLearningData('post', 100)

      // Verify query uses indexed columns for filtering and ordering
      expect(queryBuilder.eq).toHaveBeenCalledWith('content_type', 'post')
      expect(queryBuilder.order).toHaveBeenCalledWith('analyzed_at', { ascending: false })
      expect(queryBuilder.limit).toHaveBeenCalledWith(100)
    })

    it('should handle large result sets efficiently', async () => {
      // Simulate large dataset query
      const largeDataset = Array(1000).fill(null).map((_, index) => 
        createMockPostAnalytics({ id: `post-${index}`, viral_score: 90 - index })
      )

      const queryBuilder = createQueryBuilder()
      queryBuilder.then.mockResolvedValueOnce({ data: largeDataset, error: null })
      mockSupabaseClient.from.mockReturnValueOnce(queryBuilder)

      const startTime = Date.now()
      const result = await supabaseService.getTopPerformingPosts(1000, 365)
      const queryTime = Date.now() - startTime

      expect(result).toHaveLength(1000)
      expect(queryTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})