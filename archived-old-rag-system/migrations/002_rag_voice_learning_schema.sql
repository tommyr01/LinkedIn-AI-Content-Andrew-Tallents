-- RAG-Optimized Voice Learning System
-- Phase 2: Proper RAG Architecture for Podcast/Transcript Data
-- This replaces the current poor segmentation with proper RAG chunking

-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- 1. VOICE CONTENT CHUNKS (RAG-Optimized)
-- ==========================================

-- Replace large transcript_segments with proper RAG chunks
CREATE TABLE IF NOT EXISTS voice_content_chunks (
  id bigserial PRIMARY KEY,
  
  -- Source references
  episode_id text NOT NULL,
  segment_id text, -- Original transcript segment this came from
  chunk_index int NOT NULL, -- Order within the segment
  
  -- Content data (RAG-optimized sizes)
  chunk_text text NOT NULL,
  token_count int NOT NULL CHECK (token_count >= 50 AND token_count <= 600),
  word_count int NOT NULL,
  char_count int NOT NULL,
  
  -- Speaker identification
  speaker text NOT NULL CHECK (speaker IN ('andrew', 'guest', 'mixed')),
  speaker_confidence decimal(3,2) DEFAULT 1.0,
  
  -- Semantic embedding for RAG retrieval
  embedding vector(1536), -- OpenAI embeddings
  
  -- Context preservation (overlapping chunks)
  prev_chunk_id bigint REFERENCES voice_content_chunks(id),
  next_chunk_id bigint REFERENCES voice_content_chunks(id),
  overlap_prev_tokens int DEFAULT 0,
  overlap_next_tokens int DEFAULT 0,
  
  -- Topic classification
  primary_topic text,
  secondary_topics text[] DEFAULT '{}',
  topic_confidence decimal(3,2),
  
  -- Voice pattern classification
  pattern_types text[] DEFAULT '{}', -- ['confrontational', 'storytelling', 'authority']
  emotional_tone text,
  authenticity_score int CHECK (authenticity_score >= 0 AND authenticity_score <= 100),
  authority_signals text[] DEFAULT '{}',
  vulnerability_markers text[] DEFAULT '{}',
  
  -- Content analysis
  has_question boolean DEFAULT false,
  has_story boolean DEFAULT false,
  has_data_point boolean DEFAULT false,
  has_call_to_action boolean DEFAULT false,
  has_personal_experience boolean DEFAULT false,
  teaching_moment boolean DEFAULT false,
  
  -- Timestamps (if available)
  timestamp_start interval,
  timestamp_end interval,
  
  -- RAG metadata
  retrieval_frequency int DEFAULT 0, -- How often this chunk is retrieved
  relevance_boost decimal(3,2) DEFAULT 1.0, -- Manual relevance adjustment
  quality_score decimal(3,2) DEFAULT 0.0, -- AI-assessed chunk quality
  
  -- Content source metadata
  episode_title text,
  guest_name text,
  episode_date date,
  
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- ==========================================
-- 2. VOICE PATTERN LIBRARY (RAG-Enhanced)
-- ==========================================

-- Enhanced voice patterns with embeddings for semantic search
CREATE TABLE IF NOT EXISTS voice_pattern_library (
  id bigserial PRIMARY KEY,
  
  -- Pattern identification
  pattern_id text NOT NULL UNIQUE, -- Consistent ID across chunks
  pattern_type text NOT NULL CHECK (pattern_type IN (
    'opening', 'transition', 'question', 'conclusion', 'storytelling', 
    'vulnerability', 'confrontational', 'teaching', 'authority', 'empathy', 
    'challenge', 'reframe', 'analogy', 'data_presentation', 'call_to_action'
  )),
  
  -- Pattern content
  pattern_text text NOT NULL,
  context_before text, -- Context before the pattern
  context_after text,  -- Context after the pattern
  full_context text,   -- Full surrounding context
  
  -- Embeddings for semantic retrieval
  pattern_embedding vector(1536),
  context_embedding vector(1536),
  
  -- Usage analytics
  frequency_score int DEFAULT 1, -- How often Andrew uses this pattern
  effectiveness_score decimal(3,2), -- How effective it is
  confidence_score decimal(3,2) NOT NULL,
  
  -- Pattern metadata
  usage_context text NOT NULL, -- When/where this pattern is used
  emotional_tone text,
  authenticity_indicators text[] DEFAULT '{}',
  audience_impact text, -- How audience typically responds
  
  -- Source references
  source_chunk_ids bigint[] DEFAULT '{}', -- Which chunks contain this pattern
  episode_examples text[] DEFAULT '{}',   -- Episode references
  
  -- Content classification
  topic_categories text[] DEFAULT '{}',
  content_themes text[] DEFAULT '{}',
  applicable_situations text[] DEFAULT '{}',
  
  -- Performance correlation
  high_engagement_marker boolean DEFAULT false,
  viral_potential_score decimal(3,2) DEFAULT 0.0,
  
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  -- Ensure pattern uniqueness per type and content
  CONSTRAINT unique_pattern_per_type UNIQUE(pattern_type, pattern_text)
);

-- ==========================================
-- 3. RAG RETRIEVAL OPTIMIZATION
-- ==========================================

-- Create vector indexes for efficient similarity search
CREATE INDEX IF NOT EXISTS idx_voice_chunks_embedding 
  ON voice_content_chunks USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_voice_patterns_pattern_embedding 
  ON voice_pattern_library USING ivfflat (pattern_embedding vector_cosine_ops) 
  WITH (lists = 50);

CREATE INDEX IF NOT EXISTS idx_voice_patterns_context_embedding 
  ON voice_pattern_library USING ivfflat (context_embedding vector_cosine_ops) 
  WITH (lists = 50);

-- Additional indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_voice_chunks_speaker ON voice_content_chunks (speaker);
CREATE INDEX IF NOT EXISTS idx_voice_chunks_primary_topic ON voice_content_chunks (primary_topic);
CREATE INDEX IF NOT EXISTS idx_voice_chunks_pattern_types ON voice_content_chunks USING GIN (pattern_types);
CREATE INDEX IF NOT EXISTS idx_voice_chunks_token_count ON voice_content_chunks (token_count);
CREATE INDEX IF NOT EXISTS idx_voice_chunks_quality_score ON voice_content_chunks (quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_voice_chunks_retrieval_frequency ON voice_content_chunks (retrieval_frequency DESC);

CREATE INDEX IF NOT EXISTS idx_voice_patterns_type ON voice_pattern_library (pattern_type);
CREATE INDEX IF NOT EXISTS idx_voice_patterns_frequency ON voice_pattern_library (frequency_score DESC);
CREATE INDEX IF NOT EXISTS idx_voice_patterns_effectiveness ON voice_pattern_library (effectiveness_score DESC);
CREATE INDEX IF NOT EXISTS idx_voice_patterns_topics ON voice_pattern_library USING GIN (topic_categories);

-- ==========================================
-- 4. RAG RETRIEVAL FUNCTIONS
-- ==========================================

-- Function to retrieve relevant voice chunks (core RAG functionality)
CREATE OR REPLACE FUNCTION match_voice_chunks(
  query_embedding vector(1536),
  speaker_filter text DEFAULT 'andrew',
  similarity_threshold float DEFAULT 0.3,
  max_chunks int DEFAULT 10,
  min_quality_score float DEFAULT 0.0,
  topic_filter text DEFAULT NULL,
  pattern_types_filter text[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id bigint,
  chunk_text text,
  similarity_score float,
  token_count int,
  speaker text,
  primary_topic text,
  pattern_types text[],
  authenticity_score int,
  quality_score decimal,
  retrieval_frequency int,
  episode_title text,
  guest_name text,
  rank_score float
)
LANGUAGE sql
AS $$
  WITH scored_chunks AS (
    SELECT 
      vc.id as chunk_id,
      vc.chunk_text,
      1 - (vc.embedding <=> query_embedding) as similarity_score,
      vc.token_count,
      vc.speaker,
      vc.primary_topic,
      vc.pattern_types,
      vc.authenticity_score,
      vc.quality_score,
      vc.retrieval_frequency,
      vc.episode_title,
      vc.guest_name,
      -- Composite ranking: similarity + quality + authenticity + boost
      (1 - (vc.embedding <=> query_embedding)) * 0.4 +  -- Similarity weight
      (vc.quality_score / 1.0) * 0.25 +                 -- Quality weight
      (COALESCE(vc.authenticity_score, 50) / 100.0) * 0.2 + -- Authenticity weight
      (vc.relevance_boost - 1.0) * 0.15                 -- Manual boost weight
      as rank_score
    FROM voice_content_chunks vc
    WHERE 
      vc.embedding <=> query_embedding < similarity_threshold
      AND (speaker_filter IS NULL OR vc.speaker = speaker_filter)
      AND vc.quality_score >= min_quality_score
      AND (topic_filter IS NULL OR vc.primary_topic ILIKE '%' || topic_filter || '%')
      AND (pattern_types_filter IS NULL OR vc.pattern_types && pattern_types_filter)
  )
  SELECT * FROM scored_chunks
  ORDER BY rank_score DESC, similarity_score DESC
  LIMIT max_chunks;
$$;

-- Function to retrieve relevant voice patterns
CREATE OR REPLACE FUNCTION match_voice_patterns(
  query_embedding vector(1536),
  pattern_types_filter text[] DEFAULT NULL,
  similarity_threshold float DEFAULT 0.25,
  max_patterns int DEFAULT 5,
  min_effectiveness float DEFAULT 0.0
)
RETURNS TABLE (
  pattern_id text,
  pattern_type text,
  pattern_text text,
  full_context text,
  similarity_score float,
  effectiveness_score decimal,
  frequency_score int,
  usage_context text,
  authenticity_indicators text[],
  topic_categories text[]
)
LANGUAGE sql
AS $$
  SELECT 
    vpl.pattern_id,
    vpl.pattern_type,
    vpl.pattern_text,
    vpl.full_context,
    1 - (vpl.pattern_embedding <=> query_embedding) as similarity_score,
    vpl.effectiveness_score,
    vpl.frequency_score,
    vpl.usage_context,
    vpl.authenticity_indicators,
    vpl.topic_categories
  FROM voice_pattern_library vpl
  WHERE 
    vpl.pattern_embedding <=> query_embedding < similarity_threshold
    AND (pattern_types_filter IS NULL OR vpl.pattern_type = ANY(pattern_types_filter))
    AND vpl.effectiveness_score >= min_effectiveness
  ORDER BY 
    (1 - (vpl.pattern_embedding <=> query_embedding)) * 0.6 +
    (vpl.effectiveness_score / 1.0) * 0.4 DESC
  LIMIT max_patterns;
$$;

-- Function to get contextual chunks (with overlap)
CREATE OR REPLACE FUNCTION get_contextual_chunks(
  base_chunk_ids bigint[],
  context_window int DEFAULT 2
)
RETURNS TABLE (
  chunk_id bigint,
  chunk_text text,
  context_position int, -- -2, -1, 0, 1, 2 relative to base chunks
  base_chunk_id bigint,
  episode_title text
)
LANGUAGE sql
AS $$
  WITH RECURSIVE chunk_context AS (
    -- Base chunks (position 0)
    SELECT 
      vc.id as chunk_id,
      vc.chunk_text,
      0 as context_position,
      vc.id as base_chunk_id,
      vc.episode_title,
      0 as depth
    FROM voice_content_chunks vc
    WHERE vc.id = ANY(base_chunk_ids)
    
    UNION ALL
    
    -- Previous chunks (negative positions)
    SELECT 
      prev.id as chunk_id,
      prev.chunk_text,
      cc.context_position - 1,
      cc.base_chunk_id,
      prev.episode_title,
      cc.depth + 1
    FROM chunk_context cc
    JOIN voice_content_chunks prev ON prev.next_chunk_id = cc.chunk_id
    WHERE cc.depth < context_window AND cc.context_position >= -context_window
    
    UNION ALL
    
    -- Next chunks (positive positions) 
    SELECT 
      next.id as chunk_id,
      next.chunk_text,
      cc.context_position + 1,
      cc.base_chunk_id,
      next.episode_title,
      cc.depth + 1
    FROM chunk_context cc
    JOIN voice_content_chunks next ON next.prev_chunk_id = cc.chunk_id
    WHERE cc.depth < context_window AND cc.context_position <= context_window
  )
  SELECT DISTINCT 
    chunk_id,
    chunk_text,
    context_position,
    base_chunk_id,
    episode_title
  FROM chunk_context
  ORDER BY base_chunk_id, context_position;
$$;

-- ==========================================
-- 5. RAG ANALYTICS & OPTIMIZATION
-- ==========================================

-- Track chunk retrieval analytics
CREATE TABLE IF NOT EXISTS chunk_retrieval_analytics (
  id bigserial PRIMARY KEY,
  
  chunk_id bigint NOT NULL REFERENCES voice_content_chunks(id),
  query_hash text NOT NULL, -- Hash of the query/topic
  similarity_score decimal(5,4),
  rank_position int,
  was_used_in_generation boolean DEFAULT false,
  generation_job_id text,
  
  -- Query context
  query_topic text,
  content_type text, -- 'linkedin_post', 'article', etc.
  required_patterns text[] DEFAULT '{}',
  
  -- Performance tracking
  content_quality_contribution decimal(3,2), -- How much this chunk helped
  authenticity_contribution decimal(3,2),
  user_feedback_score int, -- If available
  
  retrieved_at timestamp DEFAULT now()
);

-- Update chunk retrieval frequency trigger
CREATE OR REPLACE FUNCTION update_chunk_retrieval_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update retrieval frequency
  UPDATE voice_content_chunks 
  SET retrieval_frequency = retrieval_frequency + 1,
      updated_at = now()
  WHERE id = NEW.chunk_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_chunk_retrieval
  AFTER INSERT ON chunk_retrieval_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_chunk_retrieval_stats();

-- ==========================================
-- 6. MAINTENANCE & OPTIMIZATION FUNCTIONS
-- ==========================================

-- Function to analyze chunk quality and update scores
CREATE OR REPLACE FUNCTION analyze_chunk_quality()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  chunk_record RECORD;
  quality_score decimal(3,2);
  chunks_updated int := 0;
BEGIN
  FOR chunk_record IN 
    SELECT id, chunk_text, token_count, pattern_types, authenticity_score, retrieval_frequency
    FROM voice_content_chunks 
    WHERE quality_score = 0.0 OR updated_at < now() - interval '30 days'
    LIMIT 1000
  LOOP
    -- Calculate quality score based on multiple factors
    quality_score := 
      CASE 
        -- Token count scoring (prefer 100-400 tokens)
        WHEN chunk_record.token_count BETWEEN 100 AND 400 THEN 0.3
        WHEN chunk_record.token_count BETWEEN 50 AND 500 THEN 0.2
        ELSE 0.1
      END +
      -- Pattern richness scoring
      CASE 
        WHEN array_length(chunk_record.pattern_types, 1) >= 3 THEN 0.25
        WHEN array_length(chunk_record.pattern_types, 1) >= 2 THEN 0.2
        WHEN array_length(chunk_record.pattern_types, 1) >= 1 THEN 0.15
        ELSE 0.05
      END +
      -- Authenticity scoring
      CASE 
        WHEN chunk_record.authenticity_score >= 80 THEN 0.25
        WHEN chunk_record.authenticity_score >= 60 THEN 0.2
        WHEN chunk_record.authenticity_score >= 40 THEN 0.15
        ELSE 0.1
      END +
      -- Usage frequency scoring (popular chunks are likely good)
      CASE 
        WHEN chunk_record.retrieval_frequency >= 50 THEN 0.2
        WHEN chunk_record.retrieval_frequency >= 20 THEN 0.15
        WHEN chunk_record.retrieval_frequency >= 5 THEN 0.1
        ELSE 0.05
      END;
    
    -- Update the chunk
    UPDATE voice_content_chunks 
    SET quality_score = quality_score, updated_at = now()
    WHERE id = chunk_record.id;
    
    chunks_updated := chunks_updated + 1;
  END LOOP;
  
  RETURN chunks_updated;
END;
$$;

-- Cleanup and maintenance function
CREATE OR REPLACE FUNCTION maintain_rag_system()
RETURNS TABLE (
  chunks_updated int,
  old_analytics_deleted int,
  patterns_optimized int
)
LANGUAGE plpgsql
AS $$
DECLARE
  chunks_count int;
  analytics_count int;
  patterns_count int;
BEGIN
  -- Update chunk quality scores
  SELECT analyze_chunk_quality() INTO chunks_count;
  
  -- Clean old retrieval analytics (keep last 90 days)
  WITH deleted AS (
    DELETE FROM chunk_retrieval_analytics 
    WHERE retrieved_at < now() - interval '90 days'
    RETURNING id
  )
  SELECT count(*) INTO analytics_count FROM deleted;
  
  -- Update pattern effectiveness scores based on usage
  UPDATE voice_pattern_library 
  SET effectiveness_score = LEAST(1.0, 
    GREATEST(0.1,
      (frequency_score::decimal / 100.0) * 0.6 +
      (CASE WHEN high_engagement_marker THEN 0.4 ELSE 0.0 END)
    )
  ),
  updated_at = now()
  WHERE effectiveness_score = 0.0 OR updated_at < now() - interval '7 days';
  
  GET DIAGNOSTICS patterns_count = ROW_COUNT;
  
  RETURN QUERY SELECT chunks_count, analytics_count, patterns_count;
END;
$$;

-- Create timestamp update triggers
CREATE TRIGGER update_voice_chunks_timestamp 
  BEFORE UPDATE ON voice_content_chunks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_timestamp_trigger();

CREATE TRIGGER update_voice_patterns_timestamp 
  BEFORE UPDATE ON voice_pattern_library 
  FOR EACH ROW 
  EXECUTE FUNCTION update_timestamp_trigger();

-- Initial setup and maintenance job recommendations
COMMENT ON TABLE voice_content_chunks IS 
'RAG-optimized voice content chunks. Run maintain_rag_system() daily for optimal performance.';

COMMENT ON TABLE voice_pattern_library IS 
'Voice pattern library with semantic embeddings. Patterns are automatically extracted and optimized.';

-- Performance monitoring views
CREATE VIEW rag_performance_stats AS
SELECT 
  'chunks' as type,
  count(*) as total_records,
  avg(quality_score) as avg_quality,
  avg(retrieval_frequency) as avg_retrieval_freq,
  count(*) FILTER (WHERE speaker = 'andrew') as andrew_chunks,
  count(*) FILTER (WHERE quality_score >= 0.7) as high_quality_chunks
FROM voice_content_chunks
UNION ALL
SELECT 
  'patterns' as type,
  count(*) as total_records,
  avg(effectiveness_score) as avg_effectiveness,
  avg(frequency_score) as avg_frequency,
  count(*) FILTER (WHERE high_engagement_marker) as high_engagement_patterns,
  count(*) FILTER (WHERE effectiveness_score >= 0.7) as effective_patterns
FROM voice_pattern_library;