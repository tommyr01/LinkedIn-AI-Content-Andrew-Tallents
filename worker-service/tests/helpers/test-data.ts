import { 
  PostPerformanceAnalytics, 
  VoiceLearningData, 
  ContentVariantsTracking,
  HistoricalInsights,
  ContentJob,
  ContentDraft,
  AIAgentResult
} from '../../src/types'

export const mockPostPerformanceAnalytics: PostPerformanceAnalytics = {
  id: 'test-analytics-1',
  post_id: 'post-123',
  platform: 'linkedin',
  post_url: 'https://linkedin.com/posts/test-123',
  content_text: 'This is a test post about AI and innovation in the workplace.',
  word_count: 12,
  character_count: 65,
  hashtags: ['#AI', '#Innovation', '#Workplace'],
  mentions: ['@testuser'],
  total_reactions: 150,
  like_count: 100,
  love_count: 20,
  support_count: 15,
  celebrate_count: 10,
  insight_count: 5,
  funny_count: 0,
  comments_count: 25,
  reposts_count: 8,
  shares_count: 12,
  engagement_rate: 12.5,
  comment_rate: 2.1,
  share_rate: 1.0,
  viral_score: 85,
  performance_tier: 'top_10_percent',
  posted_at: '2024-01-15T10:00:00Z',
  scraped_at: '2024-01-15T12:00:00Z',
  last_updated: '2024-01-15T12:00:00Z',
  author_name: 'Andrew Tallents',
  post_type: 'text',
  created_at: '2024-01-15T12:00:00Z',
  updated_at: '2024-01-15T12:00:00Z'
}

export const mockVoiceLearningData: VoiceLearningData = {
  id: 'voice-analysis-1',
  content_id: 'post-123',
  content_type: 'post',
  content_text: 'This is authentic content that shows vulnerability and authority.',
  content_context: 'LinkedIn post about leadership challenges',
  tone_analysis: {
    primary_tone: 'professional',
    secondary_tone: 'vulnerable',
    confidence: 0.85,
    tone_markers: ['authentic', 'reflective', 'actionable']
  },
  writing_style: {
    sentence_length: 'medium',
    paragraph_structure: 'short',
    punctuation_style: ['periods', 'questions'],
    formatting_patterns: ['line_breaks', 'emphasis']
  },
  vocabulary_patterns: {
    authority_signals: ['experience shows', 'learned that', 'found'],
    emotional_words: ['challenging', 'rewarding', 'growth'],
    action_words: ['implement', 'develop', 'focus'],
    industry_terms: ['leadership', 'team', 'strategy'],
    personal_markers: ['I', 'my experience', 'personally']
  },
  structural_patterns: {
    opening_type: 'hook_question',
    closing_type: 'call_to_action',
    story_elements: true,
    question_patterns: ['What do you think?', 'Have you experienced this?'],
    call_to_action_style: 'engagement'
  },
  authenticity_score: 88,
  authority_score: 82,
  vulnerability_score: 75,
  engagement_potential: 85,
  analysis_model: 'gpt-4o',
  confidence_score: 0.92,
  training_weight: 1.0,
  content_date: '2024-01-15T10:00:00Z',
  analyzed_at: '2024-01-15T12:30:00Z',
  created_at: '2024-01-15T12:30:00Z',
  updated_at: '2024-01-15T12:30:00Z',
  post_performance_id: 'test-analytics-1'
}

export const mockContentVariantsTracking: ContentVariantsTracking = {
  id: 'variant-tracking-1',
  job_id: 'job-123',
  variant_number: 1,
  generation_timestamp: '2024-01-15T14:00:00Z',
  topic: 'AI in workplace transformation',
  research_ideas: {
    trends: ['remote work', 'automation', 'employee engagement'],
    insights: ['productivity gains', 'skill development needs']
  },
  generated_content: 'AI is transforming how we work...',
  agent_name: 'Performance-Optimized Agent',
  predicted_engagement: 75,
  predicted_confidence: 0.82,
  prediction_factors: {
    strengths: ['engaging hook', 'actionable insights', 'clear structure'],
    improvements: ['could add personal story', 'more specific examples'],
    similar_post_score: 78
  },
  voice_score: 85,
  voice_analysis: {
    authenticity_match: 0.88,
    authority_level: 0.82,
    vulnerability_balance: 0.75
  },
  historical_context_used: true,
  similar_posts_analyzed: 15,
  was_posted: false,
  posted_at: null,
  actual_performance_id: null,
  prediction_accuracy: null,
  performance_delta: null,
  success_factors: null,
  improvement_insights: null,
  created_at: '2024-01-15T14:00:00Z',
  updated_at: '2024-01-15T14:00:00Z'
}

export const mockHistoricalInsights: HistoricalInsights = {
  id: 'insights-1',
  query_topic: 'leadership challenges',
  query_hash: 'hash-123',
  related_posts_count: 25,
  top_performers_count: 5,
  analysis_timeframe_days: 365,
  content_patterns: {
    avg_word_count: 120,
    optimal_word_count_range: [80, 150],
    common_openings: ['Question hook', 'Personal story', 'Industry insight'],
    common_structures: ['Hook-Story-Lesson-CTA', 'Problem-Solution-Action'],
    best_performing_formats: ['personal_story', 'actionable_list', 'thought_leadership'],
    engagement_triggers: ['vulnerability', 'actionable_advice', 'questions'],
    optimal_hashtag_count: 3,
    story_vs_advice_ratio: 0.6
  },
  voice_patterns: {
    dominant_tone: 'professional_authentic',
    authenticity_score_avg: 85,
    authority_score_avg: 80,
    vulnerability_score_avg: 72,
    key_authority_signals: ['experience shows', 'learned that', 'found'],
    emotional_triggers: ['challenging', 'growth', 'breakthrough'],
    personal_story_frequency: 0.7,
    question_usage_frequency: 0.8
  },
  performance_patterns: {
    high_engagement_triggers: ['personal stories', 'actionable insights', 'questions'],
    optimal_timing: ['Tuesday 9AM', 'Wednesday 2PM', 'Thursday 10AM'],
    format_recommendations: ['story_driven', 'list_format', 'question_driven'],
    content_structure_advice: ['start with hook', 'include personal element', 'end with engagement'],
    voice_tone_guidance: ['authentic', 'vulnerable', 'authoritative'],
    engagement_optimization: ['ask questions', 'share struggles', 'provide value'],
    timing_suggestions: ['post during business hours', 'avoid Friday afternoons']
  },
  avg_engagement_score: 78,
  top_performing_score: 95,
  performance_benchmark: 82,
  related_post_ids: ['post-1', 'post-2', 'post-3'],
  top_performer_ids: ['top-post-1', 'top-post-2'],
  analysis_model: 'gpt-4o',
  confidence_level: 0.88,
  data_freshness_score: 95,
  expires_at: '2024-02-15T12:00:00Z',
  cache_hit_count: 1,
  last_accessed_at: '2024-01-15T12:00:00Z',
  created_at: '2024-01-15T12:00:00Z',
  updated_at: '2024-01-15T12:00:00Z'
}

export const mockContentJob: ContentJob = {
  id: 'job-123',
  queue_job_id: 'queue-456',
  status: 'completed',
  topic: 'AI workplace transformation',
  platform: 'linkedin',
  voice_guide_id: 'enhanced-voice-model',
  research_data: {
    historical_insights: {
      confidence_level: 0.88,
      performance_benchmark: 82,
      top_performers_count: 5
    },
    voice_model: {
      authenticity_avg: 85,
      authority_avg: 80,
      generation_strategy: 'strategic_variants'
    }
  },
  progress: 100,
  created_at: '2024-01-15T14:00:00Z',
  updated_at: '2024-01-15T14:30:00Z',
  completed_at: '2024-01-15T14:30:00Z'
}

export const mockContentDraft: ContentDraft = {
  id: 'draft-123',
  job_id: 'job-123',
  variant_number: 1,
  agent_name: 'Performance-Optimized Agent',
  content: {
    title: 'The Future of AI in Workplace Transformation',
    body: 'AI is not just changing what we do at work—it is fundamentally reshaping how we think about productivity, creativity, and human potential.\n\nLast week, I watched our team implement an AI workflow that reduced manual data processing from 8 hours to 30 minutes. But here is what surprised me most: instead of feeling replaceable, our team felt more empowered to focus on strategic thinking and creative problem-solving.\n\nThe real transformation is not about replacing humans—it is about amplifying human capabilities.\n\nThree key shifts I am seeing:\n\n1️⃣ From task completion to strategic oversight\n2️⃣ From individual work to human-AI collaboration  \n3️⃣ From skill maintenance to continuous learning\n\nThe companies that will thrive are not just adopting AI tools—they are reimagining what human potential looks like when augmented by intelligent systems.\n\nWhat changes are you seeing in how AI is reshaping work in your industry?',
    hashtags: ['#AITransformation', '#FutureOfWork', '#Leadership'],
    estimated_voice_score: 85,
    approach: 'Performance-Optimized: Hook with personal story, provide actionable insights, engage with question'
  },
  metadata: {
    token_count: 245,
    generation_time_ms: 3200,
    model_used: 'gpt-4o',
    research_sources: ['historical_insights', 'voice_model', 'topic_research']
  },
  score: 88,
  created_at: '2024-01-15T14:20:00Z'
}

export const mockAIAgentResult: AIAgentResult = {
  agent_name: 'Performance-Optimized Agent',
  content: {
    title: 'The Future of AI in Workplace Transformation',
    body: mockContentDraft.content.body,
    hashtags: ['#AITransformation', '#FutureOfWork', '#Leadership'],
    estimated_voice_score: 85,
    approach: 'Performance-Optimized: Hook with personal story, provide actionable insights, engage with question',
    performance_prediction: {
      predictedEngagement: 78,
      confidenceScore: 0.85,
      strengthFactors: ['personal story', 'actionable insights', 'engagement question'],
      improvementSuggestions: ['add more specific metrics', 'include industry context'],
      similarPostPerformance: {
        avgEngagement: 72,
        topPerformance: 95,
        similarityScore: 0.82
      }
    }
  },
  metadata: {
    token_count: 245,
    generation_time_ms: 3200,
    model_used: 'gpt-4o',
    research_sources: ['historical_insights', 'voice_model', 'topic_research'],
    historical_context_used: true,
    similar_posts_analyzed: 15,
    top_performer_score: 95,
    predicted_engagement: 78,
    prediction_confidence: 0.85
  },
  score: 88
}

// Helper functions for creating variations of test data
export function createMockPostAnalytics(overrides: Partial<PostPerformanceAnalytics> = {}): PostPerformanceAnalytics {
  return { ...mockPostPerformanceAnalytics, ...overrides }
}

export function createMockVoiceData(overrides: Partial<VoiceLearningData> = {}): VoiceLearningData {
  return { ...mockVoiceLearningData, ...overrides }
}

export function createMockVariantsTracking(overrides: Partial<ContentVariantsTracking> = {}): ContentVariantsTracking {
  return { ...mockContentVariantsTracking, ...overrides }
}

export function createMockHistoricalInsights(overrides: Partial<HistoricalInsights> = {}): HistoricalInsights {
  return { ...mockHistoricalInsights, ...overrides }
}

export function createMockContentJob(overrides: Partial<ContentJob> = {}): ContentJob {
  return { ...mockContentJob, ...overrides }
}

export function createMockAIAgentResult(overrides: Partial<AIAgentResult> = {}): AIAgentResult {
  return { ...mockAIAgentResult, ...overrides }
}

// Mock data arrays for list operations
export const mockTopPerformingPosts: PostPerformanceAnalytics[] = [
  createMockPostAnalytics({ 
    id: 'top-1', 
    post_id: 'post-top-1', 
    viral_score: 95, 
    performance_tier: 'top_10_percent',
    content_text: 'Top performing post about leadership transformation.'
  }),
  createMockPostAnalytics({ 
    id: 'top-2', 
    post_id: 'post-top-2', 
    viral_score: 88, 
    performance_tier: 'top_10_percent',
    content_text: 'High engagement post about team building strategies.'
  }),
  createMockPostAnalytics({ 
    id: 'avg-1', 
    post_id: 'post-avg-1', 
    viral_score: 65, 
    performance_tier: 'top_25_percent',
    content_text: 'Average performing post about industry trends.'
  })
]

export const mockVoiceDataArray: VoiceLearningData[] = [
  createMockVoiceData({
    id: 'voice-1',
    authenticity_score: 90,
    authority_score: 85,
    vulnerability_score: 80,
    analyzed_at: '2024-01-01T12:00:00Z'
  }),
  createMockVoiceData({
    id: 'voice-2',
    authenticity_score: 85,
    authority_score: 80,
    vulnerability_score: 75,
    analyzed_at: '2024-01-15T12:00:00Z'
  }),
  createMockVoiceData({
    id: 'voice-3',
    authenticity_score: 88,
    authority_score: 82,
    vulnerability_score: 78,
    analyzed_at: '2024-01-30T12:00:00Z'
  })
]