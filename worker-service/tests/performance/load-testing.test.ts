import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { performance } from 'perf_hooks'
import strategicVariantsRouter from '../../src/routes/strategic-variants'
import performanceRouter from '../../src/routes/performance'
import { 
  mockSupabaseService, 
  mockHistoricalAnalysisService, 
  mockVoiceLearningService,
  mockPerformanceInsightsService,
  mockQueueService,
  resetAllMocks 
} from '../helpers/mocks'

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

vi.mock('../../src/services/performance-insights', () => ({
  performanceInsightsService: mockPerformanceInsightsService
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

interface PerformanceMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  throughputPerSecond: number
  errorRate: number
  p95ResponseTime: number
  p99ResponseTime: number
}

interface LoadTestResult {
  endpoint: string
  metrics: PerformanceMetrics
  memoryUsage: NodeJS.MemoryUsage
  testDuration: number
}

describe('Performance Benchmarking and Load Testing', () => {
  let app: express.Application
  let performanceMetrics: Map<string, number[]> = new Map()

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/content', strategicVariantsRouter)
    app.use('/api/performance', performanceRouter)
    resetAllMocks()
    performanceMetrics.clear()

    // Add response time tracking middleware
    app.use((req, res, next) => {
      const startTime = performance.now()
      res.on('finish', () => {
        const endTime = performance.now()
        const responseTime = endTime - startTime
        const endpoint = `${req.method} ${req.path}`
        
        if (!performanceMetrics.has(endpoint)) {
          performanceMetrics.set(endpoint, [])
        }
        performanceMetrics.get(endpoint)!.push(responseTime)
      })
      next()
    })
  })

  afterEach(() => {
    performanceMetrics.clear()
  })

  const calculateMetrics = (responseTimes: number[], testDuration: number): PerformanceMetrics => {
    const sorted = responseTimes.sort((a, b) => a - b)
    const total = responseTimes.length
    const successful = responseTimes.filter(time => time < 30000).length // Under 30s = success
    
    return {
      totalRequests: total,
      successfulRequests: successful,
      failedRequests: total - successful,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / total,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      throughputPerSecond: total / (testDuration / 1000),
      errorRate: ((total - successful) / total) * 100,
      p95ResponseTime: sorted[Math.floor(total * 0.95)] || 0,
      p99ResponseTime: sorted[Math.floor(total * 0.99)] || 0
    }
  }

  describe('Strategic Content Generation Performance', () => {
    const testPayload = {
      topic: 'Performance testing topic for AI transformation',
      platform: 'linkedin',
      voiceGuidelines: 'Professional testing tone',
      postType: 'performance_test',
      tone: 'professional'
    }

    it('should handle moderate load (10 concurrent requests)', async () => {
      const concurrentRequests = 10
      const startTime = performance.now()
      
      const requests = Array(concurrentRequests).fill(null).map((_, index) =>
        request(app)
          .post('/api/content/generate-strategic')
          .send({ ...testPayload, topic: `${testPayload.topic} ${index}` })
      )

      const responses = await Promise.all(requests)
      const endTime = performance.now()
      const testDuration = endTime - startTime

      // Verify all requests completed successfully
      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.job_id).toBeDefined()
      })

      const responseTimes = performanceMetrics.get('POST /generate-strategic') || []
      const metrics = calculateMetrics(responseTimes, testDuration)

      // Performance assertions
      expect(metrics.successfulRequests).toBe(concurrentRequests)
      expect(metrics.errorRate).toBeLessThan(5) // Less than 5% error rate
      expect(metrics.averageResponseTime).toBeLessThan(5000) // Under 5 seconds average
      expect(metrics.p95ResponseTime).toBeLessThan(10000) // 95th percentile under 10 seconds
      expect(metrics.throughputPerSecond).toBeGreaterThan(1) // At least 1 request per second

      console.log('Strategic Content Generation - Moderate Load Metrics:', metrics)
    }, 30000) // 30 second timeout

    it('should handle high load (50 concurrent requests)', async () => {
      const concurrentRequests = 50
      const startTime = performance.now()
      
      // Add artificial delay to simulate realistic processing time
      mockHistoricalAnalysisService.generateComprehensiveInsights.mockImplementation(
        async (topic: string) => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50)) // 50-150ms delay
          return {
            query_topic: topic,
            confidence_level: 0.85,
            performance_context: { avg_engagement: 75 },
            content_patterns: {},
            voice_patterns: {},
            performance_recommendations: {},
            related_posts: [],
            top_performers: []
          }
        }
      )

      const requests = Array(concurrentRequests).fill(null).map((_, index) => {
        // Stagger requests slightly to simulate realistic load
        const delay = Math.random() * 100
        return new Promise(resolve => 
          setTimeout(() => {
            resolve(request(app)
              .post('/api/content/generate-strategic')
              .send({ ...testPayload, topic: `${testPayload.topic} batch ${index}` }))
          }, delay)
        )
      })

      const responses = await Promise.all(requests)
      const endTime = performance.now()
      const testDuration = endTime - startTime

      // Count successful responses
      const successfulResponses = responses.filter((response: any) => response.status === 200).length
      const failedResponses = concurrentRequests - successfulResponses

      const responseTimes = performanceMetrics.get('POST /generate-strategic') || []
      const metrics = calculateMetrics(responseTimes, testDuration)

      // High load performance assertions (more lenient)
      expect(metrics.errorRate).toBeLessThan(20) // Allow up to 20% error rate under high load
      expect(metrics.averageResponseTime).toBeLessThan(15000) // Under 15 seconds average
      expect(metrics.throughputPerSecond).toBeGreaterThan(0.5) // At least 0.5 requests per second

      console.log('Strategic Content Generation - High Load Metrics:', {
        ...metrics,
        actualSuccessful: successfulResponses,
        actualFailed: failedResponses
      })
    }, 60000) // 60 second timeout

    it('should maintain performance under sustained load', async () => {
      const requestsPerBatch = 5
      const batches = 10
      const batchDelay = 500 // 500ms between batches
      
      const allMetrics: PerformanceMetrics[] = []
      
      for (let batch = 0; batch < batches; batch++) {
        const batchStartTime = performance.now()
        
        const batchRequests = Array(requestsPerBatch).fill(null).map((_, index) =>
          request(app)
            .post('/api/content/generate-strategic')
            .send({ ...testPayload, topic: `${testPayload.topic} sustained ${batch}-${index}` })
        )

        const batchResponses = await Promise.all(batchRequests)
        const batchEndTime = performance.now()
        const batchDuration = batchEndTime - batchStartTime

        const successfulBatchResponses = batchResponses.filter(response => response.status === 200).length
        
        // Calculate metrics for this batch
        const batchResponseTimes = performanceMetrics.get('POST /generate-strategic')?.slice(-requestsPerBatch) || []
        if (batchResponseTimes.length > 0) {
          const batchMetrics = calculateMetrics(batchResponseTimes, batchDuration)
          allMetrics.push(batchMetrics)
        }

        // Wait before next batch
        if (batch < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, batchDelay))
        }
      }

      // Analyze sustained performance
      const avgResponseTimes = allMetrics.map(m => m.averageResponseTime)
      const responseTimeVariation = Math.max(...avgResponseTimes) - Math.min(...avgResponseTimes)
      const avgThroughput = allMetrics.reduce((sum, m) => sum + m.throughputPerSecond, 0) / allMetrics.length

      // Sustained load assertions
      expect(responseTimeVariation).toBeLessThan(5000) // Response time shouldn't vary by more than 5 seconds
      expect(avgThroughput).toBeGreaterThan(0.8) // Maintain reasonable throughput
      
      console.log('Strategic Content Generation - Sustained Load Metrics:', {
        totalBatches: batches,
        avgResponseTimeVariation: responseTimeVariation,
        avgThroughput,
        batchMetrics: allMetrics.slice(0, 3) // Show first 3 batches as sample
      })
    }, 120000) // 120 second timeout
  })

  describe('Performance Analytics Endpoints', () => {
    it('should handle analytics requests efficiently', async () => {
      const concurrentRequests = 20
      const startTime = performance.now()

      // Test different analytics endpoints
      const endpointVariations = [
        '/api/performance/analytics',
        '/api/performance/analytics?timeframe=7',
        '/api/performance/analytics?timeframe=30',
        '/api/performance/analytics?timeframe=90'
      ]

      const requests = Array(concurrentRequests).fill(null).map((_, index) => {
        const endpoint = endpointVariations[index % endpointVariations.length]
        return request(app).get(endpoint)
      })

      const responses = await Promise.all(requests)
      const endTime = performance.now()
      const testDuration = endTime - startTime

      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toBeDefined()
      })

      const responseTimes = performanceMetrics.get('GET /analytics') || []
      const metrics = calculateMetrics(responseTimes, testDuration)

      // Analytics should be faster than content generation
      expect(metrics.averageResponseTime).toBeLessThan(2000) // Under 2 seconds
      expect(metrics.p95ResponseTime).toBeLessThan(5000) // 95th percentile under 5 seconds
      expect(metrics.throughputPerSecond).toBeGreaterThan(5) // At least 5 requests per second

      console.log('Performance Analytics - Load Metrics:', metrics)
    }, 30000)

    it('should cache analytics data effectively', async () => {
      // First request (should be slower - no cache)
      const firstRequestStart = performance.now()
      const firstResponse = await request(app).get('/api/performance/analytics?timeframe=30')
      const firstRequestTime = performance.now() - firstRequestStart

      expect(firstResponse.status).toBe(200)

      // Subsequent requests (should be faster - cached)
      const cachedRequests = Array(10).fill(null).map(() => {
        const start = performance.now()
        return request(app)
          .get('/api/performance/analytics?timeframe=30')
          .then(response => ({
            response,
            responseTime: performance.now() - start
          }))
      })

      const cachedResults = await Promise.all(cachedRequests)
      const avgCachedTime = cachedResults.reduce((sum, result) => sum + result.responseTime, 0) / cachedResults.length

      cachedResults.forEach(({ response }) => {
        expect(response.status).toBe(200)
      })

      // Cached requests should be significantly faster
      expect(avgCachedTime).toBeLessThan(firstRequestTime * 0.8) // At least 20% faster

      console.log('Analytics Caching Performance:', {
        firstRequestTime,
        avgCachedTime,
        improvementRatio: firstRequestTime / avgCachedTime
      })
    })
  })

  describe('Voice Learning System Performance', () => {
    const testVoiceContent = 'This is a comprehensive test of voice learning analysis performance with sufficient content length to trigger full analysis including tone detection, vocabulary pattern recognition, structural pattern analysis, and authenticity scoring mechanisms that simulate real-world usage scenarios.'

    it('should handle voice analysis requests efficiently', async () => {
      const concurrentAnalyses = 15
      const startTime = performance.now()

      const requests = Array(concurrentAnalyses).fill(null).map((_, index) =>
        request(app)
          .post('/api/performance/voice-analysis')
          .send({
            content: `${testVoiceContent} Analysis ${index}`,
            contentType: 'post',
            context: `Performance test ${index}`,
            performanceData: {
              engagement_score: 80 + (index % 20),
              viral_score: 70 + (index % 25),
              performance_tier: index % 2 === 0 ? 'top_25_percent' : 'average'
            }
          })
      )

      const responses = await Promise.all(requests)
      const endTime = performance.now()
      const testDuration = endTime - startTime

      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.scores).toBeDefined()
      })

      const responseTimes = performanceMetrics.get('POST /voice-analysis') || []
      const metrics = calculateMetrics(responseTimes, testDuration)

      expect(metrics.averageResponseTime).toBeLessThan(3000) // Under 3 seconds average
      expect(metrics.errorRate).toBeLessThan(5) // Less than 5% error rate
      expect(metrics.throughputPerSecond).toBeGreaterThan(2) // At least 2 analyses per second

      console.log('Voice Analysis - Performance Metrics:', metrics)
    }, 45000)

    it('should generate voice models efficiently', async () => {
      const concurrentModelRequests = 8
      const startTime = performance.now()

      const requests = Array(concurrentModelRequests).fill(null).map(() =>
        request(app).get('/api/performance/voice-model')
      )

      const responses = await Promise.all(requests)
      const endTime = performance.now()
      const testDuration = endTime - startTime

      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.voice_profile).toBeDefined()
      })

      const responseTimes = performanceMetrics.get('GET /voice-model') || []
      const metrics = calculateMetrics(responseTimes, testDuration)

      expect(metrics.averageResponseTime).toBeLessThan(4000) // Under 4 seconds average
      expect(metrics.throughputPerSecond).toBeGreaterThan(1) // At least 1 model per second

      console.log('Voice Model Generation - Performance Metrics:', metrics)
    }, 40000)
  })

  describe('System Resource Usage', () => {
    it('should monitor memory usage under load', async () => {
      const initialMemory = process.memoryUsage()
      const concurrentRequests = 25
      
      // Generate load across different endpoints
      const requests = Array(concurrentRequests).fill(null).map((_, index) => {
        const endpoints = [
          () => request(app).post('/api/content/generate-strategic').send({
            topic: `Memory test topic ${index}`,
            platform: 'linkedin'
          }),
          () => request(app).get('/api/performance/analytics'),
          () => request(app).get('/api/performance/voice-model'),
          () => request(app).post('/api/performance/voice-analysis').send({
            content: `Memory test content ${index} with sufficient length for analysis`,
            contentType: 'post'
          })
        ]
        
        return endpoints[index % endpoints.length]()
      })

      await Promise.all(requests)
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = {
        rss: finalMemory.rss - initialMemory.rss,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        external: finalMemory.external - initialMemory.external
      }

      // Memory usage assertions (allowing for reasonable increases)
      expect(memoryIncrease.heapUsed).toBeLessThan(100 * 1024 * 1024) // Less than 100MB increase
      expect(finalMemory.heapUsed / finalMemory.heapTotal).toBeLessThan(0.9) // Heap utilization under 90%

      console.log('Memory Usage Analysis:', {
        initial: initialMemory,
        final: finalMemory,
        increase: memoryIncrease,
        heapUtilization: (finalMemory.heapUsed / finalMemory.heapTotal * 100).toFixed(2) + '%'
      })

      // Trigger garbage collection if available
      if (global.gc) {
        global.gc()
        const postGcMemory = process.memoryUsage()
        console.log('Post-GC Memory:', postGcMemory)
      }
    }, 60000)

    it('should handle error scenarios without resource leaks', async () => {
      const initialMemory = process.memoryUsage()
      
      // Force errors in various services
      mockHistoricalAnalysisService.generateComprehensiveInsights.mockRejectedValue(
        new Error('Simulated service failure')
      )

      const errorRequests = Array(10).fill(null).map((_, index) =>
        request(app)
          .post('/api/content/generate-strategic')
          .send({ topic: `Error test ${index}`, platform: 'linkedin' })
          .catch(() => {}) // Ignore errors for this test
      )

      await Promise.all(errorRequests)
      
      // Reset mocks to working state
      resetAllMocks()
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Memory shouldn't increase significantly even with errors
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // Less than 50MB increase

      console.log('Error Scenario Memory Analysis:', {
        initialHeapUsed: initialMemory.heapUsed,
        finalHeapUsed: finalMemory.heapUsed,
        increase: memoryIncrease
      })
    })
  })

  describe('Performance Degradation Detection', () => {
    it('should detect performance degradation over time', async () => {
      const testRounds = 5
      const requestsPerRound = 10
      const roundMetrics: PerformanceMetrics[] = []

      for (let round = 0; round < testRounds; round++) {
        const roundStart = performance.now()
        
        const roundRequests = Array(requestsPerRound).fill(null).map((_, index) =>
          request(app)
            .get(`/api/performance/analytics?round=${round}&request=${index}`)
        )

        await Promise.all(roundRequests)
        
        const roundEnd = performance.now()
        const roundDuration = roundEnd - roundStart
        
        const roundResponseTimes = performanceMetrics.get('GET /analytics')?.slice(-requestsPerRound) || []
        if (roundResponseTimes.length > 0) {
          const roundMetric = calculateMetrics(roundResponseTimes, roundDuration)
          roundMetrics.push(roundMetric)
        }

        // Small delay between rounds
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Analyze performance trend
      const avgResponseTimes = roundMetrics.map(m => m.averageResponseTime)
      const firstRoundAvg = avgResponseTimes[0]
      const lastRoundAvg = avgResponseTimes[avgResponseTimes.length - 1]
      const performanceDrift = lastRoundAvg - firstRoundAvg

      console.log('Performance Degradation Analysis:', {
        rounds: testRounds,
        firstRoundAvg,
        lastRoundAvg,
        performanceDrift,
        avgResponseTimes
      })

      // Performance shouldn't degrade significantly over time
      expect(performanceDrift).toBeLessThan(1000) // Less than 1 second degradation
      expect(lastRoundAvg).toBeLessThan(firstRoundAvg * 1.5) // No more than 50% degradation
    })
  })
})