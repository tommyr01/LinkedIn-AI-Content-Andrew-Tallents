-- RAG Voice Learning Integration - Phase 1 Database Schema
-- Extends existing performance-driven schema with RAG capabilities for 915 voice chunks

-- Enable vector extension for embedding support
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Voice Chunks Table - Core RAG data storage
-- Stores 915 Andrew Tallents voice chunks with embeddings for semantic search
CREATE TABLE IF NOT EXISTS voice_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Original document reference
  document_id uuid NOT NULL,
  document_title text NOT NULL,
  document_source text NOT NULL,
  
  -- Chunk content and metadata
  content text NOT NULL,
  chunk_index integer NOT NULL,
  token_count integer DEFAULT 0,
  
  -- Vector embedding for semantic search
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  
  -- Voice analysis metadata
  metadata jsonb DEFAULT '{}',
  
  -- Voice pattern classification
  voice_pattern_type text, -- 'opening', 'story', 'insight', 'question', 'authority', 'vulnerability'
  emotional_tone text, -- 'professional', 'conversational', 'empathetic', 'authoritative'
  confidence_score decimal(3,2) DEFAULT 0.00,
  
  -- Usage tracking for learning
  usage_count integer DEFAULT 0,
  last_used_at timestamp,
  effectiveness_score decimal(3,2) DEFAULT 0.00,
  
  -- Temporal data
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Voice Learning Context Table
-- Tracks context and performance of voice chunks in content generation
CREATE TABLE IF NOT EXISTS voice_learning_context (
  id bigserial PRIMARY KEY,
  
  -- Content generation context
  job_id text NOT NULL, -- Links to content_jobs
  generation_topic text NOT NULL,
  content_type text NOT NULL DEFAULT 'post',
  
  -- Voice chunks used
  voice_chunks_used uuid[] DEFAULT '{}', -- Array of voice_chunk IDs used
  chunks_retrieval_query text NOT NULL, -- Original query used for retrieval
  similarity_threshold decimal(3,2) DEFAULT 0.70,
  chunks_retrieved_count integer DEFAULT 0,
  
  -- Context analysis
  topic_match_score decimal(3,2) DEFAULT 0.00,
  voice_authenticity_score decimal(3,2) DEFAULT 0.00,
  content_enhancement_applied jsonb DEFAULT '{}',
  
  -- Performance correlation
  generated_content_id text, -- Links to content_drafts or actual post
  content_performance_score integer,
  voice_contribution_score decimal(3,2),
  
  -- Learning feedback
  was_effective boolean,
  feedback_notes text,
  improvement_suggestions jsonb DEFAULT '{}',
  
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 3. Voice Pattern Cache Table  
-- Caches frequently used voice patterns for quick access
CREATE TABLE IF NOT EXISTS voice_pattern_cache (
  id bigserial PRIMARY KEY,
  
  -- Cache key
  query_hash text NOT NULL UNIQUE,
  query_topic text NOT NULL,
  pattern_types text[] DEFAULT '{}',
  
  -- Cached results
  matching_chunks uuid[] DEFAULT '{}',
  pattern_analysis jsonb NOT NULL,
  authenticity_boosts text[] DEFAULT '{}',
  voice_recommendations text[] DEFAULT '{}',
  
  -- Cache metadata
  chunk_count integer DEFAULT 0,
  avg_confidence_score decimal(3,2) DEFAULT 0.00,
  freshness_score integer DEFAULT 100,
  
  -- Cache management
  hit_count integer DEFAULT 0,
  last_accessed_at timestamp DEFAULT now(),
  expires_at timestamp DEFAULT (now() + interval '24 hours'),
  
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 4. Voice Learning Analytics Table
-- Tracks learning progress and system performance
CREATE TABLE IF NOT EXISTS voice_learning_analytics (
  id bigserial PRIMARY KEY,
  
  -- Analytics period
  date_period date NOT NULL UNIQUE,
  
  -- Usage statistics
  total_queries integer DEFAULT 0,
  cache_hit_rate decimal(3,2) DEFAULT 0.00,
  avg_chunks_retrieved decimal(4,2) DEFAULT 0.00,
  avg_similarity_score decimal(3,2) DEFAULT 0.00,
  
  -- Voice authenticity tracking
  avg_authenticity_score decimal(3,2) DEFAULT 0.00,
  high_authenticity_count integer DEFAULT 0, -- > 0.8
  low_authenticity_count integer DEFAULT 0,  -- < 0.5
  
  -- Performance correlation
  content_generated_count integer DEFAULT 0,
  avg_content_performance decimal(4,2) DEFAULT 0.00,
  voice_enhanced_vs_baseline decimal(3,2) DEFAULT 0.00,
  
  -- Learning insights
  top_performing_patterns text[] DEFAULT '{}',
  underperforming_patterns text[] DEFAULT '{}',
  optimization_opportunities jsonb DEFAULT '{}',
  
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_voice_chunks_embedding ON voice_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_voice_chunks_document_id ON voice_chunks (document_id);
CREATE INDEX IF NOT EXISTS idx_voice_chunks_pattern_type ON voice_chunks (voice_pattern_type);
CREATE INDEX IF NOT EXISTS idx_voice_chunks_confidence ON voice_chunks (confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_voice_chunks_usage ON voice_chunks (usage_count DESC, effectiveness_score DESC);

CREATE INDEX IF NOT EXISTS idx_voice_learning_context_job_id ON voice_learning_context (job_id);
CREATE INDEX IF NOT EXISTS idx_voice_learning_context_topic ON voice_learning_context (generation_topic);
CREATE INDEX IF NOT EXISTS idx_voice_learning_context_effectiveness ON voice_learning_context (was_effective);
CREATE INDEX IF NOT EXISTS idx_voice_learning_context_voice_score ON voice_learning_context (voice_authenticity_score DESC);

CREATE INDEX IF NOT EXISTS idx_voice_pattern_cache_query_hash ON voice_pattern_cache (query_hash);
CREATE INDEX IF NOT EXISTS idx_voice_pattern_cache_expires_at ON voice_pattern_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_voice_pattern_cache_hit_count ON voice_pattern_cache (hit_count DESC);

CREATE INDEX IF NOT EXISTS idx_voice_learning_analytics_date ON voice_learning_analytics (date_period DESC);

-- Functions for RAG Voice Learning System

-- Function: Semantic similarity search for voice chunks
CREATE OR REPLACE FUNCTION search_voice_chunks(
  query_embedding vector(1536),
  similarity_threshold decimal DEFAULT 0.70,
  limit_count integer DEFAULT 10,
  pattern_types text[] DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  content text,
  document_title text,
  similarity_score decimal,
  voice_pattern_type text,
  confidence_score decimal,
  metadata jsonb
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    vc.id,
    vc.content,
    vc.document_title,
    (1 - (vc.embedding <=> query_embedding))::decimal(4,3) as similarity_score,
    vc.voice_pattern_type,
    vc.confidence_score,
    vc.metadata
  FROM voice_chunks vc
  WHERE (vc.embedding <=> query_embedding) < (1 - similarity_threshold)
    AND (pattern_types IS NULL OR vc.voice_pattern_type = ANY(pattern_types))
  ORDER BY vc.embedding <=> query_embedding
  LIMIT limit_count;
$$;

-- Function: Update voice chunk usage tracking
CREATE OR REPLACE FUNCTION update_voice_chunk_usage(
  chunk_ids uuid[],
  effectiveness_score decimal DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE voice_chunks 
  SET 
    usage_count = usage_count + 1,
    last_used_at = now(),
    effectiveness_score = CASE 
      WHEN effectiveness_score IS NOT NULL THEN 
        ((effectiveness_score * usage_count) + effectiveness_score) / (usage_count + 1)
      ELSE effectiveness_score
    END,
    updated_at = now()
  WHERE id = ANY(chunk_ids);
END;
$$;

-- Function: Generate voice authenticity score based on retrieved chunks
CREATE OR REPLACE FUNCTION calculate_voice_authenticity_score(
  chunk_ids uuid[],
  similarity_scores decimal[]
)
RETURNS decimal
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  weighted_confidence decimal := 0;
  total_weight decimal := 0;
  i integer := 1;
BEGIN
  -- Calculate weighted average of confidence scores based on similarity
  WHILE i <= array_length(chunk_ids, 1) LOOP
    SELECT weighted_confidence + (vc.confidence_score * similarity_scores[i]),
           total_weight + similarity_scores[i]
    INTO weighted_confidence, total_weight
    FROM voice_chunks vc
    WHERE vc.id = chunk_ids[i];
    
    i := i + 1;
  END LOOP;
  
  RETURN CASE 
    WHEN total_weight > 0 THEN (weighted_confidence / total_weight)::decimal(3,2)
    ELSE 0.00
  END;
END;
$$;

-- Function: Cleanup expired voice pattern cache
CREATE OR REPLACE FUNCTION cleanup_voice_pattern_cache()
RETURNS integer
LANGUAGE sql
AS $$
  WITH deleted AS (
    DELETE FROM voice_pattern_cache 
    WHERE expires_at < now()
    RETURNING id
  )
  SELECT count(*)::integer FROM deleted;
$$;

-- Function: Update daily voice learning analytics
CREATE OR REPLACE FUNCTION update_voice_learning_analytics(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  analytics_record RECORD;
BEGIN
  -- Calculate analytics for the target date
  SELECT 
    COUNT(*) as total_queries,
    AVG(CASE WHEN vpc.id IS NOT NULL THEN 1.0 ELSE 0.0 END) as cache_hit_rate,
    AVG(vlc.chunks_retrieved_count) as avg_chunks_retrieved,
    AVG(vlc.topic_match_score) as avg_similarity_score,
    AVG(vlc.voice_authenticity_score) as avg_authenticity_score,
    COUNT(CASE WHEN vlc.voice_authenticity_score > 0.8 THEN 1 END) as high_authenticity_count,
    COUNT(CASE WHEN vlc.voice_authenticity_score < 0.5 THEN 1 END) as low_authenticity_count,
    COUNT(vlc.generated_content_id) as content_generated_count,
    AVG(vlc.content_performance_score) as avg_content_performance
  INTO analytics_record
  FROM voice_learning_context vlc
  LEFT JOIN voice_pattern_cache vpc ON vlc.chunks_retrieval_query = vpc.query_topic
  WHERE vlc.created_at::date = target_date;

  -- Insert or update analytics
  INSERT INTO voice_learning_analytics (
    date_period,
    total_queries,
    cache_hit_rate,
    avg_chunks_retrieved,
    avg_similarity_score,
    avg_authenticity_score,
    high_authenticity_count,
    low_authenticity_count,
    content_generated_count,
    avg_content_performance
  ) VALUES (
    target_date,
    analytics_record.total_queries,
    analytics_record.cache_hit_rate,
    analytics_record.avg_chunks_retrieved,
    analytics_record.avg_similarity_score,
    analytics_record.avg_authenticity_score,
    analytics_record.high_authenticity_count,
    analytics_record.low_authenticity_count,
    analytics_record.content_generated_count,
    analytics_record.avg_content_performance
  )
  ON CONFLICT (date_period) DO UPDATE SET
    total_queries = EXCLUDED.total_queries,
    cache_hit_rate = EXCLUDED.cache_hit_rate,
    avg_chunks_retrieved = EXCLUDED.avg_chunks_retrieved,
    avg_similarity_score = EXCLUDED.avg_similarity_score,
    avg_authenticity_score = EXCLUDED.avg_authenticity_score,
    high_authenticity_count = EXCLUDED.high_authenticity_count,
    low_authenticity_count = EXCLUDED.low_authenticity_count,
    content_generated_count = EXCLUDED.content_generated_count,
    avg_content_performance = EXCLUDED.avg_content_performance,
    updated_at = now();
END;
$$;

-- Triggers for timestamp updates
CREATE TRIGGER update_voice_chunks_timestamp 
  BEFORE UPDATE ON voice_chunks 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_trigger();

CREATE TRIGGER update_voice_learning_context_timestamp 
  BEFORE UPDATE ON voice_learning_context 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_trigger();

CREATE TRIGGER update_voice_pattern_cache_timestamp 
  BEFORE UPDATE ON voice_pattern_cache 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_trigger();

CREATE TRIGGER update_voice_learning_analytics_timestamp 
  BEFORE UPDATE ON voice_learning_analytics 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_trigger();

-- Initial setup comments
-- After running this migration:
-- 1. Run the data import script to populate voice_chunks from the existing chunks table
-- 2. Verify embedding indexing is working with test queries
-- 3. Initialize voice_learning_analytics with baseline data
-- 4. Set up cron job for cleanup_voice_pattern_cache() and update_voice_learning_analytics()