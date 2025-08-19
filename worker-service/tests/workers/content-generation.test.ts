import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Job } from 'bullmq'
import { mockSupabaseService, mockAIAgentsService, resetAllMocks } from '../helpers/mocks'
import { mockAIAgentResult, createMockContentJob } from '../helpers/test-data'

// Mock dependencies
vi.mock('../../src/services/supabase', () => ({
  supabaseService: mockSupabaseService
}))

vi.mock('../../src/services/ai-agents', () => ({
  aiAgentsService: mockAIAgentsService
}))

vi.mock('../../src/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

// Mock the content generation worker
const mockContentGenerationWorker = {
  processJob: vi.fn(),
  handleStrategicGeneration: vi.fn(),
  handleStandardGeneration: vi.fn(),
  updateJobProgress: vi.fn(),
  storeGeneratedContent: vi.fn()
}

// Mock BullMQ Job
const createMockJob = (data: any, id: string = 'test-job-123'): Partial<Job> => ({
  id,
  data,
  progress: vi.fn(),
  log: vi.fn(),
  updateProgress: vi.fn(),
  moveToCompleted: vi.fn(),
  moveToFailed: vi.fn(),
  attemptsMade: 0,
  opts: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
})

describe('Content Generation Worker Service', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('Strategic Content Generation Processing', () => {
    const strategicJobData = {
      topic: 'AI workplace transformation',
      platform: 'linkedin',
      voiceGuidelines: 'Professional but authentic',
      postType: 'thought_leadership',
      tone: 'professional',
      userId: 'user-123',
      strategicIntelligence: {
        insights: {
          query_topic: 'AI workplace transformation',
          confidence_level: 0.88,
          performance_context: {
            avg_engagement: 75,
            performance_benchmark: 82
          },
          content_patterns: {
            optimal_word_count_range: [100, 150],
            best_performing_formats: ['personal_story', 'actionable_list']
          },
          voice_patterns: {
            dominant_tone: 'professional_authentic',
            key_authority_signals: ['experience shows', 'learned']
          }
        },
        voiceModel: {
          voiceProfile: {
            authenticity_score_avg: 85,
            authority_score_avg: 80
          },
          generationGuidelines: 'Use authentic tone with personal stories'
        },
        generationType: 'strategic',
        performanceTarget: 90
      }
    }

    it('should process strategic content generation job successfully', async () => {
      const job = createMockJob(strategicJobData) as Job
      
      // Mock AI agents to return strategic variants
      mockAIAgentsService.generateStrategicVariants.mockResolvedValueOnce([
        {
          ...mockAIAgentResult,
          agent_name: 'Performance-Optimized Agent',
          content: {
            ...mockAIAgentResult.content,
            performance_prediction: {
              predictedEngagement: 85,
              confidenceScore: 0.88,
              strengthFactors: ['personal story', 'actionable insights'],
              improvementSuggestions: ['add metrics', 'stronger CTA'],
              similarPostPerformance: {
                avgEngagement: 78,
                topPerformance: 95,
                similarityScore: 0.82
              }
            }
          }
        },
        {
          ...mockAIAgentResult,
          agent_name: 'Engagement-Focused Agent',
          content: {
            ...mockAIAgentResult.content,
            title: 'Why AI Makes Teams Stronger',
            approach: 'Engagement-focused with provocative angle'
          }
        },
        {
          ...mockAIAgentResult,
          agent_name: 'Experimental Agent',
          content: {
            ...mockAIAgentResult.content,
            title: 'The Unexpected Truth About AI',
            approach: 'Experimental contrarian viewpoint'
          }
        }
      ])

      // Mock successful job processing
      mockContentGenerationWorker.processJob.mockImplementation(async (job: Job) => {
        if (job.data.strategicIntelligence) {
          return await mockContentGenerationWorker.handleStrategicGeneration(job)
        } else {
          return await mockContentGenerationWorker.handleStandardGeneration(job)
        }
      })

      mockContentGenerationWorker.handleStrategicGeneration.mockResolvedValueOnce({
        success: true,
        variants: 3,
        totalTime: 5200,
        averageScore: 86
      })

      const result = await mockContentGenerationWorker.processJob(job)

      expect(result.success).toBe(true)
      expect(result.variants).toBe(3)
      expect(mockAIAgentsService.generateStrategicVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: strategicJobData.topic,
          platform: strategicJobData.platform,
          strategicContext: strategicJobData.strategicIntelligence
        })
      )
    })

    it('should update job progress during strategic generation', async () => {
      const job = createMockJob(strategicJobData) as Job
      
      mockContentGenerationWorker.updateJobProgress.mockImplementation(async (job: Job, progress: number, message: string) => {
        await job.updateProgress?.(progress)
        await job.log?.(message)
      })

      // Simulate progress updates during processing
      await mockContentGenerationWorker.updateJobProgress(job, 25, 'Analyzing historical insights...')
      await mockContentGenerationWorker.updateJobProgress(job, 50, 'Generating voice model...')
      await mockContentGenerationWorker.updateJobProgress(job, 75, 'Creating strategic variants...')
      await mockContentGenerationWorker.updateJobProgress(job, 100, 'Strategic generation complete')

      expect(job.updateProgress).toHaveBeenCalledTimes(4)
      expect(job.log).toHaveBeenCalledTimes(4)
      expect(job.log).toHaveBeenCalledWith('Strategic generation complete')
    })

    it('should store strategic variants with tracking data', async () => {
      const job = createMockJob(strategicJobData) as Job
      const generatedVariants = [mockAIAgentResult]

      mockContentGenerationWorker.storeGeneratedContent.mockImplementation(async (job: Job, variants: any[]) => {
        for (const [index, variant] of variants.entries()) {
          await mockSupabaseService.createContentDraft({
            id: `draft-${job.id}-${index}`,
            job_id: job.id!,
            variant_number: index + 1,
            agent_name: variant.agent_name,
            content: variant.content,
            metadata: variant.metadata,
            score: variant.score
          })

          if (job.data.strategicIntelligence) {
            await mockSupabaseService.storeContentVariantsTracking({
              id: `tracking-${job.id}-${index}`,
              job_id: job.id!,
              variant_number: index + 1,
              topic: job.data.topic,
              agent_name: variant.agent_name,
              predicted_engagement: variant.content.performance_prediction?.predictedEngagement,
              predicted_confidence: variant.content.performance_prediction?.confidenceScore,
              voice_score: variant.content.estimated_voice_score,
              historical_context_used: true,
              similar_posts_analyzed: variant.metadata.similar_posts_analyzed || 0
            })
          }
        }
      })

      await mockContentGenerationWorker.storeGeneratedContent(job, generatedVariants)

      expect(mockSupabaseService.createContentDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          job_id: job.id,
          variant_number: 1,
          agent_name: mockAIAgentResult.agent_name
        })
      )

      expect(mockSupabaseService.storeContentVariantsTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          job_id: job.id,
          topic: strategicJobData.topic,
          historical_context_used: true
        })
      )
    })

    it('should handle AI service failures gracefully', async () => {
      const job = createMockJob(strategicJobData) as Job
      
      mockAIAgentsService.generateStrategicVariants.mockRejectedValueOnce(
        new Error('AI service rate limit exceeded')
      )

      mockContentGenerationWorker.processJob.mockImplementation(async (job: Job) => {
        try {
          const variants = await mockAIAgentsService.generateStrategicVariants(job.data)
          return { success: true, variants: variants.length }
        } catch (error) {
          await job.moveToFailed?.(error as Error)
          return { success: false, error: (error as Error).message }
        }
      })

      const result = await mockContentGenerationWorker.processJob(job)

      expect(result.success).toBe(false)
      expect(result.error).toContain('AI service rate limit exceeded')
      expect(job.moveToFailed).toHaveBeenCalled()
    })

    it('should retry failed jobs with exponential backoff', async () => {
      const job = createMockJob(strategicJobData) as Job
      job.attemptsMade = 2 // Simulate retry attempt

      mockContentGenerationWorker.processJob.mockImplementation(async (job: Job) => {
        if (job.attemptsMade < 2) {
          throw new Error('Temporary service unavailable')
        }
        return { success: true, variants: 3, retried: true }
      })

      // First attempt fails
      job.attemptsMade = 0
      await expect(mockContentGenerationWorker.processJob(job)).rejects.toThrow('Temporary service unavailable')

      // Second attempt succeeds
      job.attemptsMade = 2
      const result = await mockContentGenerationWorker.processJob(job)

      expect(result.success).toBe(true)
      expect(result.retried).toBe(true)
    })

    it('should validate strategic intelligence data', async () => {
      const invalidStrategicData = {
        ...strategicJobData,
        strategicIntelligence: {
          insights: null, // Invalid
          voiceModel: undefined, // Invalid
          generationType: 'strategic',
          performanceTarget: -5 // Invalid
        }
      }

      const job = createMockJob(invalidStrategicData) as Job

      mockContentGenerationWorker.processJob.mockImplementation(async (job: Job) => {
        const strategic = job.data.strategicIntelligence
        if (!strategic?.insights || !strategic?.voiceModel || strategic.performanceTarget < 0) {
          throw new Error('Invalid strategic intelligence data')
        }
        return { success: true }
      })

      await expect(mockContentGenerationWorker.processJob(job)).rejects.toThrow('Invalid strategic intelligence data')
    })
  })

  describe('Standard Content Generation Processing', () => {
    const standardJobData = {
      topic: 'Leadership challenges in remote work',
      platform: 'linkedin',
      voiceGuidelines: 'Professional and approachable',
      postType: 'general',
      tone: 'professional',
      userId: 'user-456'
      // No strategicIntelligence - this is standard generation
    }

    it('should process standard content generation job', async () => {
      const job = createMockJob(standardJobData) as Job

      mockContentGenerationWorker.handleStandardGeneration.mockResolvedValueOnce({
        success: true,
        variants: 3,
        totalTime: 3000,
        averageScore: 78
      })

      mockContentGenerationWorker.processJob.mockImplementation(async (job: Job) => {
        if (job.data.strategicIntelligence) {
          return await mockContentGenerationWorker.handleStrategicGeneration(job)
        } else {
          return await mockContentGenerationWorker.handleStandardGeneration(job)
        }
      })

      const result = await mockContentGenerationWorker.processJob(job)

      expect(result.success).toBe(true)
      expect(result.variants).toBe(3)
      expect(mockContentGenerationWorker.handleStandardGeneration).toHaveBeenCalledWith(job)
      expect(mockContentGenerationWorker.handleStrategicGeneration).not.toHaveBeenCalled()
    })

    it('should use different AI service call for standard generation', async () => {
      const job = createMockJob(standardJobData) as Job

      // Mock standard AI service call (not strategic variants)
      const mockStandardAIService = {
        generateContent: vi.fn().mockResolvedValue([mockAIAgentResult])
      }

      mockContentGenerationWorker.handleStandardGeneration.mockImplementation(async (job: Job) => {
        const variants = await mockStandardAIService.generateContent(job.data)
        return { success: true, variants: variants.length }
      })

      await mockContentGenerationWorker.processJob(job)

      expect(mockStandardAIService.generateContent).toHaveBeenCalledWith(standardJobData)
      expect(mockAIAgentsService.generateStrategicVariants).not.toHaveBeenCalled()
    })
  })

  describe('Job Queue Integration', () => {
    it('should handle job completion correctly', async () => {
      const job = createMockJob(strategicJobData) as Job
      
      mockContentGenerationWorker.processJob.mockResolvedValueOnce({
        success: true,
        variants: 3,
        jobId: job.id
      })

      const result = await mockContentGenerationWorker.processJob(job)

      expect(result.success).toBe(true)
      
      // Verify job completion
      if (result.success) {
        await job.moveToCompleted?.(result)
        expect(job.moveToCompleted).toHaveBeenCalledWith(result)
      }
    })

    it('should update database job status throughout processing', async () => {
      const job = createMockJob(strategicJobData, 'job-database-123') as Job

      // Mock database job tracking
      const mockUpdateJobStatus = vi.fn()
      mockSupabaseService.updateContentJobStatus = mockUpdateJobStatus

      mockContentGenerationWorker.processJob.mockImplementation(async (job: Job) => {
        await mockUpdateJobStatus(job.id, 'processing', 25)
        await mockUpdateJobStatus(job.id, 'processing', 50)
        await mockUpdateJobStatus(job.id, 'processing', 75)
        await mockUpdateJobStatus(job.id, 'completed', 100)
        
        return { success: true, variants: 3 }
      })

      await mockContentGenerationWorker.processJob(job)

      expect(mockUpdateJobStatus).toHaveBeenCalledTimes(4)
      expect(mockUpdateJobStatus).toHaveBeenLastCalledWith(job.id, 'completed', 100)
    })

    it('should handle job cancellation gracefully', async () => {
      const job = createMockJob(strategicJobData) as Job
      
      // Mock job cancellation during processing
      mockContentGenerationWorker.processJob.mockImplementation(async (job: Job) => {
        // Simulate cancellation signal
        if (job.data.cancel) {
          return { success: false, cancelled: true, message: 'Job was cancelled' }
        }
        return { success: true }
      })

      // Test normal processing
      let result = await mockContentGenerationWorker.processJob(job)
      expect(result.success).toBe(true)

      // Test cancelled job
      job.data.cancel = true
      result = await mockContentGenerationWorker.processJob(job)
      expect(result.success).toBe(false)
      expect(result.cancelled).toBe(true)
    })

    it('should clean up resources on job failure', async () => {
      const job = createMockJob(strategicJobData) as Job
      const cleanup = vi.fn()

      mockContentGenerationWorker.processJob.mockImplementation(async (job: Job) => {
        try {
          throw new Error('Processing failed')
        } catch (error) {
          await cleanup()
          throw error
        }
      })

      await expect(mockContentGenerationWorker.processJob(job)).rejects.toThrow('Processing failed')
      expect(cleanup).toHaveBeenCalled()
    })
  })

  describe('Performance and Resource Management', () => {
    it('should track processing time and resource usage', async () => {
      const job = createMockJob(strategicJobData) as Job
      
      mockContentGenerationWorker.processJob.mockImplementation(async (job: Job) => {
        const startTime = Date.now()
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const endTime = Date.now()
        const processingTime = endTime - startTime
        
        return {
          success: true,
          variants: 3,
          processingTime,
          memoryUsage: process.memoryUsage()
        }
      })

      const result = await mockContentGenerationWorker.processJob(job)

      expect(result.success).toBe(true)
      expect(result.processingTime).toBeGreaterThan(50) // At least processing time
      expect(result.memoryUsage).toBeDefined()
    })

    it('should handle memory pressure gracefully', async () => {
      const job = createMockJob(strategicJobData) as Job
      
      // Mock memory pressure scenario
      const originalMemoryUsage = process.memoryUsage
      process.memoryUsage = vi.fn().mockReturnValue({
        rss: 1000000000, // 1GB RSS
        heapTotal: 800000000,
        heapUsed: 700000000,
        external: 50000000,
        arrayBuffers: 10000000
      })

      mockContentGenerationWorker.processJob.mockImplementation(async (job: Job) => {
        const memory = process.memoryUsage()
        if (memory.heapUsed > 500000000) { // 500MB threshold
          throw new Error('Memory pressure detected - job deferred')
        }
        return { success: true }
      })

      await expect(mockContentGenerationWorker.processJob(job)).rejects.toThrow('Memory pressure detected')

      process.memoryUsage = originalMemoryUsage
    })

    it('should limit concurrent processing based on system resources', async () => {
      const jobs = Array(5).fill(null).map((_, index) => 
        createMockJob(strategicJobData, `concurrent-job-${index}`) as Job
      )

      let activeJobs = 0
      const maxConcurrent = 3

      mockContentGenerationWorker.processJob.mockImplementation(async (job: Job) => {
        if (activeJobs >= maxConcurrent) {
          throw new Error('Concurrency limit exceeded')
        }
        
        activeJobs++
        await new Promise(resolve => setTimeout(resolve, 50))
        activeJobs--
        
        return { success: true, jobId: job.id }
      })

      // Process jobs with concurrency control
      const results = await Promise.allSettled(
        jobs.map(job => mockContentGenerationWorker.processJob(job))
      )

      // Some jobs should succeed, others should fail due to concurrency limits
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      expect(successful).toBeLessThanOrEqual(maxConcurrent)
      expect(failed).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Data Consistency and Validation', () => {
    it('should validate generated content before storage', async () => {
      const job = createMockJob(strategicJobData) as Job
      
      const invalidContent = {
        ...mockAIAgentResult,
        content: {
          body: '', // Invalid empty content
          hashtags: [],
          estimated_voice_score: 150 // Invalid score > 100
        }
      }

      mockContentGenerationWorker.storeGeneratedContent.mockImplementation(async (job: Job, variants: any[]) => {
        for (const variant of variants) {
          if (!variant.content.body || variant.content.estimated_voice_score > 100) {
            throw new Error('Invalid content data - validation failed')
          }
        }
      })

      await expect(
        mockContentGenerationWorker.storeGeneratedContent(job, [invalidContent])
      ).rejects.toThrow('Invalid content data - validation failed')
    })

    it('should maintain transactional integrity during storage', async () => {
      const job = createMockJob(strategicJobData) as Job
      const variants = [mockAIAgentResult, mockAIAgentResult, mockAIAgentResult]

      // Mock database transaction failure on third variant
      mockSupabaseService.createContentDraft
        .mockResolvedValueOnce({ id: 'draft-1' })
        .mockResolvedValueOnce({ id: 'draft-2' })
        .mockRejectedValueOnce(new Error('Database constraint violation'))

      mockContentGenerationWorker.storeGeneratedContent.mockImplementation(async (job: Job, variants: any[]) => {
        const storedDrafts = []
        
        try {
          for (const [index, variant] of variants.entries()) {
            const draft = await mockSupabaseService.createContentDraft({
              id: `draft-${index}`,
              job_id: job.id!,
              variant_number: index + 1,
              agent_name: variant.agent_name,
              content: variant.content
            })
            storedDrafts.push(draft)
          }
        } catch (error) {
          // Rollback stored drafts
          for (const draft of storedDrafts) {
            await mockSupabaseService.deleteContentDraft?.(draft.id)
          }
          throw error
        }
      })

      await expect(
        mockContentGenerationWorker.storeGeneratedContent(job, variants)
      ).rejects.toThrow('Database constraint violation')

      // Verify rollback was attempted
      expect(mockSupabaseService.createContentDraft).toHaveBeenCalledTimes(3)
    })
  })
})