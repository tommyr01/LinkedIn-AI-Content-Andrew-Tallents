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
  }
  metadata: {
    token_count: number
    generation_time_ms: number
    model_used: string
    research_sources: string[]
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