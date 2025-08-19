import { vi } from 'vitest'
import { 
  mockPostPerformanceAnalytics, 
  mockVoiceLearningData, 
  mockHistoricalInsights,
  mockTopPerformingPosts,
  mockVoiceDataArray,
  mockContentVariantsTracking
} from './test-data'

// Mock Supabase Service
export const mockSupabaseService = {
  createContentJob: vi.fn().mockResolvedValue({
    id: 'job-123',
    queue_job_id: 'queue-456',
    status: 'pending',
    topic: 'AI workplace transformation',
    platform: 'linkedin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  
  getContentJob: vi.fn().mockResolvedValue({
    id: 'job-123',
    status: 'completed',
    progress: 100
  }),
  
  updateContentJobStatus: vi.fn().mockResolvedValue(true),
  
  createContentDraft: vi.fn().mockResolvedValue({
    id: 'draft-123',
    job_id: 'job-123',
    variant_number: 1
  }),
  
  getTopPerformingPosts: vi.fn().mockResolvedValue(mockTopPerformingPosts),
  
  getVoiceLearningData: vi.fn().mockResolvedValue(mockVoiceDataArray),
  
  getContentVariantsTracking: vi.fn().mockResolvedValue([mockContentVariantsTracking]),
  
  storeHistoricalInsights: vi.fn().mockResolvedValue({
    id: 'insights-123',
    ...mockHistoricalInsights
  }),
  
  getHistoricalInsights: vi.fn().mockResolvedValue(mockHistoricalInsights),
  
  storeVoiceLearningData: vi.fn().mockResolvedValue({
    id: 'voice-123',
    ...mockVoiceLearningData
  }),
  
  updatePerformanceTiers: vi.fn().mockResolvedValue(true),
  
  cleanupExpiredInsights: vi.fn().mockResolvedValue(5),
  
  storeContentVariantsTracking: vi.fn().mockResolvedValue({
    id: 'tracking-123',
    ...mockContentVariantsTracking
  })
}

// Mock OpenAI Service
export const mockOpenAIService = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              analysis: 'AI is transforming workplace dynamics...',
              insights: ['productivity gains', 'skill development'],
              recommendations: ['implement gradually', 'focus on training']
            })
          }
        }],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 200,
          total_tokens: 350
        }
      })
    }
  }
}

// Mock Historical Analysis Service
export const mockHistoricalAnalysisService = {
  generateComprehensiveInsights: vi.fn().mockResolvedValue({
    query_topic: 'AI workplace transformation',
    confidence_level: 0.88,
    analysis_freshness: 95,
    performance_context: {
      avg_engagement: 75,
      top_performing_score: 95,
      performance_benchmark: 82,
      total_posts_analyzed: 25,
      timeframe_days: 365
    },
    content_patterns: mockHistoricalInsights.content_patterns,
    voice_patterns: mockHistoricalInsights.voice_patterns,
    performance_recommendations: mockHistoricalInsights.performance_patterns,
    related_posts: mockTopPerformingPosts.slice(0, 3),
    top_performers: mockTopPerformingPosts.slice(0, 2)
  }),
  
  populateHistoricalPerformanceData: vi.fn().mockResolvedValue({
    postsProcessed: 50,
    voiceAnalysisCompleted: 45,
    errors: 2,
    successRate: 96
  })
}

// Mock Voice Learning Service
export const mockVoiceLearningService = {
  analyzeVoicePatterns: vi.fn().mockResolvedValue({
    tone_analysis: mockVoiceLearningData.tone_analysis,
    writing_style: mockVoiceLearningData.writing_style,
    vocabulary_patterns: mockVoiceLearningData.vocabulary_patterns,
    structural_patterns: mockVoiceLearningData.structural_patterns,
    authenticity_score: 88,
    authority_score: 82,
    vulnerability_score: 75,
    engagement_potential: 85,
    confidence_score: 0.92
  }),
  
  generateEnhancedVoiceModel: vi.fn().mockResolvedValue({
    voiceProfile: {
      authenticity_score_avg: 85,
      authority_score_avg: 80,
      vulnerability_score_avg: 75,
      engagement_potential_avg: 82,
      dominant_tones: ['professional', 'authentic', 'vulnerable'],
      key_patterns: ['personal_stories', 'actionable_insights', 'questions']
    },
    generationGuidelines: 'Use authentic tone with personal stories and actionable insights.',
    strengthFactors: ['vulnerability', 'authority signals', 'engagement questions'],
    improvementAreas: ['more industry-specific terms', 'stronger call-to-actions']
  })
}

// Mock Performance Insights Service
export const mockPerformanceInsightsService = {
  generatePerformanceInsights: vi.fn().mockResolvedValue({
    insights: [
      'Posts with personal stories perform 40% better than average',
      'Questions at the end increase engagement by 25%',
      'Optimal post length is 120-150 words'
    ],
    recommendations: [
      'Include more personal anecdotes',
      'Always end with engagement questions',
      'Keep posts concise but comprehensive'
    ],
    voiceGuidance: {
      authenticity_target: 85,
      authority_balance: 80,
      vulnerability_level: 'moderate'
    },
    contentStrategy: {
      optimal_formats: ['story_driven', 'list_format'],
      engagement_triggers: ['questions', 'personal_elements'],
      timing_recommendations: ['Tuesday 9AM', 'Wednesday 2PM']
    },
    performancePredictions: {
      expected_engagement_range: [70, 85],
      success_probability: 0.82,
      risk_factors: ['topic saturation', 'timing conflicts']
    },
    confidenceScore: 0.88,
    generatedAt: new Date().toISOString()
  })
}

// Mock AI Agents Service
export const mockAIAgentsService = {
  generateStrategicVariants: vi.fn().mockResolvedValue([
    {
      agent_name: 'Performance-Optimized Agent',
      content: {
        title: 'The Future of AI in Workplace Transformation',
        body: 'AI is transforming how we work...',
        hashtags: ['#AITransformation', '#FutureOfWork', '#Leadership'],
        estimated_voice_score: 85,
        approach: 'Performance-Optimized with personal story and actionable insights'
      },
      metadata: {
        token_count: 245,
        generation_time_ms: 3200,
        model_used: 'gpt-4o',
        research_sources: ['historical_insights', 'voice_model']
      },
      score: 88
    },
    {
      agent_name: 'Engagement-Focused Agent',
      content: {
        title: 'Why AI Will Make Your Team Stronger, Not Weaker',
        body: 'Everyone is worried about AI replacing jobs...',
        hashtags: ['#AIFuture', '#TeamBuilding', '#Innovation'],
        estimated_voice_score: 82,
        approach: 'Engagement-Focused with provocative angle and community building'
      },
      metadata: {
        token_count: 220,
        generation_time_ms: 2800,
        model_used: 'gpt-4o',
        research_sources: ['historical_insights', 'voice_model']
      },
      score: 84
    },
    {
      agent_name: 'Experimental Agent',
      content: {
        title: 'The Unexpected Truth About AI and Human Creativity',
        body: 'What if I told you AI might actually make us more creative...',
        hashtags: ['#Creativity', '#AIInsights', '#FutureThinking'],
        estimated_voice_score: 79,
        approach: 'Experimental with contrarian viewpoint and thought-provoking content'
      },
      metadata: {
        token_count: 195,
        generation_time_ms: 2200,
        model_used: 'gpt-4o',
        research_sources: ['historical_insights', 'voice_model']
      },
      score: 81
    }
  ])
}

// Mock Queue Service
export const mockQueueService = {
  add: vi.fn().mockResolvedValue({
    id: 'queue-job-123',
    getState: vi.fn().mockResolvedValue('waiting')
  }),
  
  process: vi.fn(),
  
  getJob: vi.fn().mockResolvedValue({
    id: 'queue-job-123',
    data: {
      topic: 'AI workplace transformation',
      platform: 'linkedin'
    },
    progress: vi.fn().mockResolvedValue(undefined),
    moveToCompleted: vi.fn().mockResolvedValue(undefined),
    moveToFailed: vi.fn().mockResolvedValue(undefined)
  })
}

// Mock Redis Service
export const mockRedisService = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(0),
  expire: vi.fn().mockResolvedValue(1),
  hget: vi.fn().mockResolvedValue(null),
  hset: vi.fn().mockResolvedValue(1),
  hdel: vi.fn().mockResolvedValue(1)
}

// Mock Logger
export const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}

// Helper function to reset all mocks
export function resetAllMocks() {
  vi.clearAllMocks()
  
  // Reset specific mock implementations if needed
  mockSupabaseService.getTopPerformingPosts.mockResolvedValue(mockTopPerformingPosts)
  mockSupabaseService.getVoiceLearningData.mockResolvedValue(mockVoiceDataArray)
  mockHistoricalAnalysisService.generateComprehensiveInsights.mockResolvedValue({
    query_topic: 'AI workplace transformation',
    confidence_level: 0.88,
    analysis_freshness: 95,
    performance_context: {
      avg_engagement: 75,
      top_performing_score: 95,
      performance_benchmark: 82,
      total_posts_analyzed: 25,
      timeframe_days: 365
    },
    content_patterns: mockHistoricalInsights.content_patterns,
    voice_patterns: mockHistoricalInsights.voice_patterns,
    performance_recommendations: mockHistoricalInsights.performance_patterns,
    related_posts: mockTopPerformingPosts.slice(0, 3),
    top_performers: mockTopPerformingPosts.slice(0, 2)
  })
}