import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockSupabaseService, mockOpenAIService, resetAllMocks } from '../helpers/mocks'
import { mockVoiceDataArray, mockVoiceLearningData } from '../helpers/test-data'

// Mock dependencies
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

vi.mock('openai', () => ({
  OpenAI: vi.fn().mockImplementation(() => mockOpenAIService)
}))

import { VoiceLearningEnhancedService } from '../../src/services/voice-learning-enhanced'

describe('VoiceLearningEnhancedService', () => {
  let service: VoiceLearningEnhancedService
  
  beforeEach(() => {
    resetAllMocks()
    service = new VoiceLearningEnhancedService()
  })

  describe('analyzeVoicePatterns', () => {
    const testContent = 'This is a test post about leadership challenges. I learned from my experience that vulnerability and authenticity are key to building trust. What do you think?'
    const testContext = {
      content_type: 'post' as const,
      context: 'LinkedIn thought leadership post',
      performance_data: {
        engagement_score: 85,
        viral_score: 78,
        performance_tier: 'top_25_percent'
      }
    }

    it('should analyze voice patterns successfully', async () => {
      mockOpenAIService.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              tone_analysis: {
                primary_tone: 'professional',
                secondary_tone: 'vulnerable',
                confidence: 0.85,
                tone_markers: ['authentic', 'reflective', 'engaging']
              },
              writing_style: {
                sentence_length: 'medium',
                paragraph_structure: 'short',
                punctuation_style: ['periods', 'questions'],
                formatting_patterns: ['line_breaks', 'emphasis']
              },
              vocabulary_patterns: {
                authority_signals: ['learned from my experience', 'key to'],
                emotional_words: ['challenges', 'trust'],
                action_words: ['building'],
                industry_terms: ['leadership'],
                personal_markers: ['I learned', 'my experience']
              },
              structural_patterns: {
                opening_type: 'topic_statement',
                closing_type: 'engagement_question',
                story_elements: true,
                question_patterns: ['What do you think?'],
                call_to_action_style: 'engagement'
              },
              authenticity_score: 88,
              authority_score: 82,
              vulnerability_score: 85,
              engagement_potential: 87,
              confidence_score: 0.91
            })
          }
        }],
        usage: { prompt_tokens: 200, completion_tokens: 150, total_tokens: 350 }
      })

      const result = await service.analyzeVoicePatterns(testContent, testContext)

      expect(result).toMatchObject({
        tone_analysis: {
          primary_tone: 'professional',
          secondary_tone: 'vulnerable',
          confidence: 0.85,
          tone_markers: expect.any(Array)
        },
        writing_style: {
          sentence_length: expect.any(String),
          paragraph_structure: expect.any(String),
          punctuation_style: expect.any(Array),
          formatting_patterns: expect.any(Array)
        },
        vocabulary_patterns: {
          authority_signals: expect.any(Array),
          emotional_words: expect.any(Array),
          action_words: expect.any(Array),
          industry_terms: expect.any(Array),
          personal_markers: expect.any(Array)
        },
        structural_patterns: {
          opening_type: expect.any(String),
          closing_type: expect.any(String),
          story_elements: expect.any(Boolean),
          question_patterns: expect.any(Array),
          call_to_action_style: expect.any(String)
        },
        authenticity_score: expect.any(Number),
        authority_score: expect.any(Number),
        vulnerability_score: expect.any(Number),
        engagement_potential: expect.any(Number),
        confidence_score: expect.any(Number)
      })

      expect(mockOpenAIService.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          messages: expect.any(Array),
          temperature: 0.3
        })
      )
    })

    it('should handle different content types', async () => {
      const contentTypes = ['post', 'comment', 'article'] as const

      for (const contentType of contentTypes) {
        resetAllMocks()
        
        const context = { ...testContext, content_type: contentType }
        await service.analyzeVoicePatterns(testContent, context)

        const openAICall = mockOpenAIService.chat.completions.create.mock.calls[0][0]
        const systemMessage = openAICall.messages[0].content
        expect(systemMessage).toContain(contentType)
      }
    })

    it('should incorporate performance data into analysis', async () => {
      await service.analyzeVoicePatterns(testContent, testContext)

      const openAICall = mockOpenAIService.chat.completions.create.mock.calls[0][0]
      const userMessage = openAICall.messages[1].content
      
      expect(userMessage).toContain('Performance Context')
      expect(userMessage).toContain('engagement_score: 85')
      expect(userMessage).toContain('viral_score: 78')
      expect(userMessage).toContain('performance_tier: top_25_percent')
    })

    it('should work without performance data', async () => {
      const contextWithoutPerformance = {
        content_type: 'post' as const,
        context: 'LinkedIn thought leadership post'
      }

      await service.analyzeVoicePatterns(testContent, contextWithoutPerformance)

      const openAICall = mockOpenAIService.chat.completions.create.mock.calls[0][0]
      const userMessage = openAICall.messages[1].content
      
      expect(userMessage).not.toContain('Performance Context')
    })

    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAIService.chat.completions.create.mockRejectedValueOnce(
        new Error('OpenAI API rate limit exceeded')
      )

      await expect(
        service.analyzeVoicePatterns(testContent, testContext)
      ).rejects.toThrow('OpenAI API rate limit exceeded')
    })

    it('should handle malformed OpenAI responses', async () => {
      mockOpenAIService.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'invalid json response'
          }
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      })

      await expect(
        service.analyzeVoicePatterns(testContent, testContext)
      ).rejects.toThrow()
    })

    it('should validate score ranges', async () => {
      mockOpenAIService.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              tone_analysis: { primary_tone: 'test', confidence: 0.8 },
              writing_style: { sentence_length: 'medium' },
              vocabulary_patterns: { authority_signals: [] },
              structural_patterns: { opening_type: 'test', story_elements: false },
              authenticity_score: 150, // Invalid - above 100
              authority_score: -10,    // Invalid - below 0
              vulnerability_score: 75,
              engagement_potential: 85,
              confidence_score: 0.92
            })
          }
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      })

      const result = await service.analyzeVoicePatterns(testContent, testContext)

      // Should clamp scores to valid ranges
      expect(result.authenticity_score).toBeLessThanOrEqual(100)
      expect(result.authority_score).toBeGreaterThanOrEqual(0)
      expect(result.vulnerability_score).toBeGreaterThanOrEqual(0)
      expect(result.vulnerability_score).toBeLessThanOrEqual(100)
    })

    it('should handle empty content gracefully', async () => {
      await expect(
        service.analyzeVoicePatterns('', testContext)
      ).rejects.toThrow()
    })

    it('should handle very long content', async () => {
      const longContent = 'A'.repeat(10000) // Very long content
      
      await service.analyzeVoicePatterns(longContent, testContext)

      const openAICall = mockOpenAIService.chat.completions.create.mock.calls[0][0]
      const userMessage = openAICall.messages[1].content
      
      expect(userMessage).toContain(longContent.substring(0, 1000)) // Should include the content
    })
  })

  describe('generateEnhancedVoiceModel', () => {
    it('should generate enhanced voice model successfully', async () => {
      mockSupabaseService.getVoiceLearningData.mockResolvedValueOnce(mockVoiceDataArray)

      mockOpenAIService.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              voice_profile_summary: {
                dominant_patterns: ['authentic vulnerability', 'professional storytelling'],
                strength_indicators: ['personal experience sharing', 'actionable insights'],
                growth_areas: ['industry expertise', 'call-to-action strength']
              },
              generation_guidelines: 'Use authentic tone with personal stories, include actionable insights, end with engagement questions.',
              content_strategy_recommendations: {
                optimal_formats: ['personal_story', 'list_with_insights', 'question_driven'],
                engagement_triggers: ['vulnerability', 'experience_sharing', 'questions'],
                voice_balance: {
                  authenticity_target: 85,
                  authority_target: 82,
                  vulnerability_target: 78
                }
              }
            })
          }
        }],
        usage: { prompt_tokens: 400, completion_tokens: 200, total_tokens: 600 }
      })

      const result = await service.generateEnhancedVoiceModel()

      expect(result).toMatchObject({
        voiceProfile: {
          authenticity_score_avg: expect.any(Number),
          authority_score_avg: expect.any(Number),
          vulnerability_score_avg: expect.any(Number),
          engagement_potential_avg: expect.any(Number),
          total_analyses: mockVoiceDataArray.length,
          dominant_tones: expect.any(Array),
          key_patterns: expect.any(Array),
          improvement_trajectory: expect.any(Object)
        },
        generationGuidelines: expect.any(String),
        strengthFactors: expect.any(Array),
        improvementAreas: expect.any(Array),
        contentStrategyRecommendations: expect.any(Object)
      })

      expect(mockSupabaseService.getVoiceLearningData).toHaveBeenCalledWith('post', 200)
      expect(mockOpenAIService.chat.completions.create).toHaveBeenCalled()
    })

    it('should handle empty voice learning data', async () => {
      mockSupabaseService.getVoiceLearningData.mockResolvedValueOnce([])

      const result = await service.generateEnhancedVoiceModel()

      expect(result.voiceProfile.total_analyses).toBe(0)
      expect(result.voiceProfile.authenticity_score_avg).toBe(0)
      expect(result.generationGuidelines).toContain('limited data')
    })

    it('should calculate voice profile statistics correctly', async () => {
      const testVoiceData = [
        { authenticity_score: 90, authority_score: 85, vulnerability_score: 80, engagement_potential: 88 },
        { authenticity_score: 85, authority_score: 80, vulnerability_score: 75, engagement_potential: 82 },
        { authenticity_score: 88, authority_score: 82, vulnerability_score: 78, engagement_potential: 85 }
      ]

      mockSupabaseService.getVoiceLearningData.mockResolvedValueOnce(testVoiceData)

      const result = await service.generateEnhancedVoiceModel()

      expect(result.voiceProfile.authenticity_score_avg).toBeCloseTo(87.67, 1)
      expect(result.voiceProfile.authority_score_avg).toBeCloseTo(82.33, 1)
      expect(result.voiceProfile.vulnerability_score_avg).toBeCloseTo(77.67, 1)
      expect(result.voiceProfile.engagement_potential_avg).toBeCloseTo(85, 1)
    })

    it('should identify dominant tones from voice data', async () => {
      const voiceDataWithTones = mockVoiceDataArray.map((data, index) => ({
        ...data,
        tone_analysis: {
          primary_tone: index === 0 ? 'professional' : index === 1 ? 'professional' : 'authentic',
          secondary_tone: 'vulnerable',
          confidence: 0.8,
          tone_markers: ['test']
        }
      }))

      mockSupabaseService.getVoiceLearningData.mockResolvedValueOnce(voiceDataWithTones)

      const result = await service.generateEnhancedVoiceModel()

      expect(result.voiceProfile.dominant_tones).toContain('professional') // Most frequent
    })

    it('should track improvement trajectory', async () => {
      const voiceDataWithDates = [
        { ...mockVoiceDataArray[0], authenticity_score: 80, analyzed_at: '2024-01-01T12:00:00Z' },
        { ...mockVoiceDataArray[1], authenticity_score: 85, analyzed_at: '2024-01-15T12:00:00Z' },
        { ...mockVoiceDataArray[2], authenticity_score: 90, analyzed_at: '2024-01-30T12:00:00Z' }
      ]

      mockSupabaseService.getVoiceLearningData.mockResolvedValueOnce(voiceDataWithDates)

      const result = await service.generateEnhancedVoiceModel()

      expect(result.voiceProfile.improvement_trajectory).toMatchObject({
        authenticity_trend: 'improving',
        authority_trend: expect.any(String),
        vulnerability_trend: expect.any(String),
        overall_improvement_rate: expect.any(Number)
      })
    })

    it('should handle OpenAI service errors gracefully', async () => {
      mockSupabaseService.getVoiceLearningData.mockResolvedValueOnce(mockVoiceDataArray)
      
      mockOpenAIService.chat.completions.create.mockRejectedValueOnce(
        new Error('OpenAI service unavailable')
      )

      await expect(service.generateEnhancedVoiceModel()).rejects.toThrow('OpenAI service unavailable')
    })

    it('should provide fallback recommendations with limited data', async () => {
      const limitedVoiceData = [mockVoiceDataArray[0]] // Only one analysis

      mockSupabaseService.getVoiceLearningData.mockResolvedValueOnce(limitedVoiceData)

      const result = await service.generateEnhancedVoiceModel()

      expect(result.generationGuidelines).toBeDefined()
      expect(result.strengthFactors).toBeDefined()
      expect(result.improvementAreas).toBeDefined()
      expect(result.generationGuidelines).toContain('limited')
    })
  })

  describe('storeVoiceAnalysis', () => {
    const testAnalysisResult = {
      tone_analysis: {
        primary_tone: 'professional',
        secondary_tone: 'vulnerable',
        confidence: 0.85,
        tone_markers: ['authentic']
      },
      writing_style: {
        sentence_length: 'medium' as const,
        paragraph_structure: 'short' as const,
        punctuation_style: ['periods'],
        formatting_patterns: ['line_breaks']
      },
      vocabulary_patterns: {
        authority_signals: ['experience shows'],
        emotional_words: ['challenging'],
        action_words: ['implement'],
        industry_terms: ['leadership'],
        personal_markers: ['I learned']
      },
      structural_patterns: {
        opening_type: 'hook',
        closing_type: 'question',
        story_elements: true,
        question_patterns: ['What do you think?'],
        call_to_action_style: 'engagement'
      },
      authenticity_score: 88,
      authority_score: 82,
      vulnerability_score: 75,
      engagement_potential: 85,
      confidence_score: 0.92
    }

    const testMetadata = {
      content_id: 'post-123',
      content_type: 'post' as const,
      content_context: 'LinkedIn thought leadership',
      performance_data: {
        engagement_score: 85,
        viral_score: 78,
        performance_tier: 'top_25_percent'
      }
    }

    it('should store voice analysis successfully', async () => {
      mockSupabaseService.storeVoiceLearningData.mockResolvedValueOnce({
        id: 'voice-analysis-123',
        ...testAnalysisResult
      })

      const result = await service.storeVoiceAnalysis(testAnalysisResult, testMetadata)

      expect(result.id).toBe('voice-analysis-123')
      expect(mockSupabaseService.storeVoiceLearningData).toHaveBeenCalledWith(
        expect.objectContaining({
          content_id: 'post-123',
          content_type: 'post',
          tone_analysis: testAnalysisResult.tone_analysis,
          writing_style: testAnalysisResult.writing_style,
          vocabulary_patterns: testAnalysisResult.vocabulary_patterns,
          structural_patterns: testAnalysisResult.structural_patterns,
          authenticity_score: 88,
          authority_score: 82,
          vulnerability_score: 75,
          engagement_potential: 85,
          confidence_score: 0.92
        })
      )
    })

    it('should handle storage errors gracefully', async () => {
      mockSupabaseService.storeVoiceLearningData.mockRejectedValueOnce(
        new Error('Database storage failed')
      )

      await expect(
        service.storeVoiceAnalysis(testAnalysisResult, testMetadata)
      ).rejects.toThrow('Database storage failed')
    })
  })

  describe('edge cases and validation', () => {
    it('should handle null or undefined scores in voice data', async () => {
      const dataWithNullScores = [
        { ...mockVoiceDataArray[0], authenticity_score: null, authority_score: undefined },
        { ...mockVoiceDataArray[1], authenticity_score: 85, authority_score: 80 }
      ]

      mockSupabaseService.getVoiceLearningData.mockResolvedValueOnce(dataWithNullScores as any)

      const result = await service.generateEnhancedVoiceModel()

      expect(result.voiceProfile.authenticity_score_avg).toBeGreaterThanOrEqual(0)
      expect(result.voiceProfile.authority_score_avg).toBeGreaterThanOrEqual(0)
    })

    it('should handle very recent voice data (< 7 days)', async () => {
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 3) // 3 days ago

      const recentVoiceData = [{
        ...mockVoiceDataArray[0],
        analyzed_at: recentDate.toISOString()
      }]

      mockSupabaseService.getVoiceLearningData.mockResolvedValueOnce(recentVoiceData)

      const result = await service.generateEnhancedVoiceModel()

      expect(result.voiceProfile.total_analyses).toBe(1)
      expect(result.generationGuidelines).toBeDefined()
    })

    it('should validate content length limits', async () => {
      const veryShortContent = 'Hi'
      const testContext = {
        content_type: 'post' as const,
        context: 'Test'
      }

      await expect(
        service.analyzeVoicePatterns(veryShortContent, testContext)
      ).rejects.toThrow()
    })

    it('should handle special characters in content gracefully', async () => {
      const contentWithSpecialChars = 'This is a test with émojis 🚀 and spëcial chars & symbols!'
      const testContext = {
        content_type: 'post' as const,
        context: 'Test with special characters'
      }

      await service.analyzeVoicePatterns(contentWithSpecialChars, testContext)

      const openAICall = mockOpenAIService.chat.completions.create.mock.calls[0][0]
      expect(openAICall.messages[1].content).toContain(contentWithSpecialChars)
    })

    it('should handle concurrent analysis requests', async () => {
      const content1 = 'First test content about leadership'
      const content2 = 'Second test content about innovation'
      const testContext = {
        content_type: 'post' as const,
        context: 'Concurrent test'
      }

      // Make concurrent calls
      const [result1, result2] = await Promise.all([
        service.analyzeVoicePatterns(content1, testContext),
        service.analyzeVoicePatterns(content2, testContext)
      ])

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(mockOpenAIService.chat.completions.create).toHaveBeenCalledTimes(2)
    })
  })
})