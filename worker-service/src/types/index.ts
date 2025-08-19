export interface ContentJob {
  id: string
  queue_job_id?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  topic: string
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram'
  voice_guide_id?: string
  research_data?: any
  progress: number
  error?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface ContentDraft {
  id: string
  job_id: string
  variant_number: number
  agent_name: string
  content: {
    title?: string
    body: string
    hashtags: string[]
    estimated_voice_score?: number
    approach?: string
  }
  metadata: {
    token_count?: number
    generation_time_ms?: number
    model_used?: string
    research_sources?: string[]
  }
  score?: number
  created_at: string
}

export interface ResearchCache {
  id: string
  query_hash: string
  source: 'firecrawl' | 'perplexity' | 'rapidapi' | 'openai' | 'other'
  query_text: string
  results: any
  created_at: string
  expires_at: string
  hit_count: number
  last_accessed_at: string
}

export interface JobData {
  topic: string
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram'
  voiceGuidelines?: string
  postType?: string
  tone?: string
  userId?: string
}

export interface ResearchResult {
  source: string
  title?: string
  content: string
  url?: string
  relevance_score?: number
  summary?: string
}

export interface AIAgentResult {
  agent_name: string
  content: {
    title?: string
    body: string
    hashtags: string[]
    estimated_voice_score: number
    approach: string
    performance_prediction?: {
      predictedEngagement: number
      confidenceScore: number
      strengthFactors: string[]
      improvementSuggestions: string[]
      similarPostPerformance: {
        avgEngagement: number
        topPerformance: number
        similarityScore: number
      }
    }
  }
  metadata: {
    token_count: number
    generation_time_ms: number
    model_used: string
    research_sources: string[]
    historical_context_used?: boolean
    similar_posts_analyzed?: number
    top_performer_score?: number
    predicted_engagement?: number
    prediction_confidence?: number
  }
  score?: number
}

export interface WorkerConfig {
  redis: {
    url: string
  }
  supabase: {
    url: string
    serviceKey: string
  }
  openai: {
    apiKey: string
    model: string
  }
  research: {
    firecrawl: {
      apiKey: string
    }
    perplexity: {
      apiKey: string
    }
  }
  worker: {
    concurrency: number
    maxJobAttempts: number
  }
  logging: {
    level: string
  }
}

// ==========================================
// PHASE 1: PERFORMANCE-DRIVEN ENHANCEMENT
// ==========================================

// Post Performance Analytics
export interface PostPerformanceAnalytics {
  id: string
  post_id: string
  platform: string
  post_url?: string
  content_text: string
  word_count?: number
  character_count?: number
  hashtags: string[]
  mentions: string[]
  total_reactions: number
  like_count: number
  love_count: number
  support_count: number
  celebrate_count: number
  insight_count: number
  funny_count: number
  comments_count: number
  reposts_count: number
  shares_count: number
  engagement_rate: number
  comment_rate: number
  share_rate: number
  viral_score: number
  performance_tier: 'top_10_percent' | 'top_25_percent' | 'average' | 'below_average'
  posted_at?: string
  scraped_at: string
  last_updated: string
  author_name: string
  post_type?: string
  created_at: string
  updated_at: string
}

// Voice Learning Data
export interface VoiceLearningData {
  id: string
  content_id: string
  content_type: 'post' | 'comment' | 'article'
  content_text: string
  content_context?: string
  tone_analysis?: {
    primary_tone: string
    secondary_tone: string
    confidence: number
    tone_markers: string[]
  }
  writing_style?: {
    sentence_length: 'short' | 'medium' | 'long' | 'mixed'
    paragraph_structure: 'single' | 'short' | 'medium' | 'long'
    punctuation_style: string[]
    formatting_patterns: string[]
  }
  vocabulary_patterns?: {
    authority_signals: string[]
    emotional_words: string[]
    action_words: string[]
    industry_terms: string[]
    personal_markers: string[]
  }
  structural_patterns?: {
    opening_type: string
    closing_type: string
    story_elements: boolean
    question_patterns: string[]
    call_to_action_style: string
  }
  authenticity_score?: number
  authority_score?: number
  vulnerability_score?: number
  engagement_potential?: number
  analysis_model: string
  confidence_score: number
  training_weight: number
  content_date?: string
  analyzed_at: string
  created_at: string
  updated_at: string
  post_performance_id?: string
}

// Content Variants Tracking
export interface ContentVariantsTracking {
  id: string
  job_id: string
  variant_number: number
  generation_timestamp: string
  topic: string
  research_ideas?: any
  generated_content: string
  agent_name: string
  predicted_engagement?: number
  predicted_confidence?: number
  prediction_factors?: {
    strengths: string[]
    improvements: string[]
    similar_post_score?: number
  }
  voice_score?: number
  voice_analysis?: any
  historical_context_used: boolean
  similar_posts_analyzed: number
  was_posted: boolean
  posted_at?: string
  actual_performance_id?: string
  prediction_accuracy?: number
  performance_delta?: number
  success_factors?: {
    what_worked: string[]
    what_didnt: string[]
  }
  improvement_insights?: {
    for_future_generations: string[]
    pattern_insights: string[]
  }
  created_at: string
  updated_at: string
}

// Historical Insights
export interface HistoricalInsights {
  id: string
  query_topic: string
  query_hash: string
  related_posts_count: number
  top_performers_count: number
  analysis_timeframe_days: number
  content_patterns: {
    avg_word_count: number
    optimal_word_count_range: [number, number]
    common_openings: string[]
    common_structures: string[]
    best_performing_formats: string[]
    engagement_triggers: string[]
    optimal_hashtag_count?: number
    story_vs_advice_ratio?: number
  }
  voice_patterns: {
    dominant_tone: string
    authenticity_score_avg: number
    authority_score_avg: number
    vulnerability_score_avg: number
    key_authority_signals: string[]
    emotional_triggers: string[]
    personal_story_frequency?: number
    question_usage_frequency?: number
  }
  performance_patterns: {
    high_engagement_triggers: string[]
    optimal_timing: string[]
    format_recommendations: string[]
    content_structure_advice?: string[]
    voice_tone_guidance?: string[]
    engagement_optimization?: string[]
    timing_suggestions?: string[]
  }
  avg_engagement_score: number
  top_performing_score: number
  performance_benchmark: number
  related_post_ids: string[]
  top_performer_ids: string[]
  analysis_model: string
  confidence_level: number
  data_freshness_score: number
  expires_at: string
  cache_hit_count: number
  last_accessed_at: string
  created_at: string
  updated_at: string
}

// Performance Analysis Request
export interface PerformanceAnalysisRequest {
  topic: string
  max_posts?: number
  timeframe_days?: number
  include_comments?: boolean
  force_refresh?: boolean
  analysis_depth?: 'basic' | 'comprehensive' | 'deep'
}