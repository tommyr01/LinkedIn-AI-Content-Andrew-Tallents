-- Create enhanced post embeddings table for analytics-driven RAG
-- This enables semantic similarity search combined with performance analytics

-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the enhanced embeddings table
CREATE TABLE IF NOT EXISTS post_embeddings (
  id bigserial PRIMARY KEY,
  post_id text NOT NULL REFERENCES connection_posts(id) ON DELETE CASCADE,
  
  -- Content data
  content text NOT NULL,
  word_count int,
  
  -- Vector embedding for semantic similarity
  embedding vector(1536), -- OpenAI ada-002 embedding size
  
  -- Performance metrics for analytics
  total_reactions int DEFAULT 0,
  like_count int DEFAULT 0,
  comments_count int DEFAULT 0,
  reposts_count int DEFAULT 0,
  shares_count int DEFAULT 0,
  
  -- Calculated performance scores
  engagement_score int GENERATED ALWAYS AS (
    total_reactions + comments_count * 2 + reposts_count * 3 + shares_count * 2
  ) STORED,
  
  -- Content analysis metrics
  has_question boolean DEFAULT false,
  has_story boolean DEFAULT false,
  has_data_points boolean DEFAULT false,
  has_call_to_action boolean DEFAULT false,
  vulnerability_score int DEFAULT 0,
  authority_signals text[] DEFAULT '{}',
  
  -- Performance categorization
  performance_tier text, -- 'top_10_percent', 'top_25_percent', 'average', 'below_average'
  
  -- Temporal data
  posted_date timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_post_embeddings_vector ON post_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_post_embeddings_performance ON post_embeddings (engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_post_embeddings_tier ON post_embeddings (performance_tier);
CREATE INDEX IF NOT EXISTS idx_post_embeddings_posted_date ON post_embeddings (posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_post_embeddings_composite ON post_embeddings (performance_tier, posted_date DESC, engagement_score DESC);

-- Function to find similar high-performing posts
CREATE OR REPLACE FUNCTION match_posts_with_performance(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5,
  min_performance_tier text DEFAULT 'top_25_percent',
  recency_months int DEFAULT 24
)
RETURNS TABLE (
  post_id text,
  content text,
  similarity_score float,
  engagement_score int,
  total_reactions int,
  comments_count int,
  performance_tier text,
  posted_date timestamp,
  combined_score float
)
LANGUAGE sql
AS $$
  WITH scored_posts AS (
    SELECT 
      pe.post_id,
      pe.content,
      1 - (pe.embedding <=> query_embedding) as similarity_score,
      pe.engagement_score,
      pe.total_reactions,
      pe.comments_count,
      pe.performance_tier,
      pe.posted_date,
      -- Combined scoring: 40% similarity + 60% performance
      (1 - (pe.embedding <=> query_embedding)) * 0.4 + 
      (pe.engagement_score::float / GREATEST((SELECT MAX(engagement_score) FROM post_embeddings), 1)) * 0.6 as combined_score
    FROM post_embeddings pe
    WHERE 
      pe.embedding <=> query_embedding < similarity_threshold
      AND pe.performance_tier IN ('top_10_percent', 'top_25_percent')
      AND pe.posted_date > NOW() - INTERVAL '1 month' * recency_months
  )
  SELECT * FROM scored_posts
  ORDER BY combined_score DESC
  LIMIT match_count;
$$;

-- Function to update performance tiers based on engagement scores
CREATE OR REPLACE FUNCTION update_performance_tiers()
RETURNS void
LANGUAGE sql
AS $$
  WITH percentiles AS (
    SELECT 
      percentile_cont(0.9) WITHIN GROUP (ORDER BY engagement_score) as p90,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY engagement_score) as p75,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY engagement_score) as p50
    FROM post_embeddings
  )
  UPDATE post_embeddings 
  SET performance_tier = CASE 
    WHEN engagement_score >= (SELECT p90 FROM percentiles) THEN 'top_10_percent'
    WHEN engagement_score >= (SELECT p75 FROM percentiles) THEN 'top_25_percent'  
    WHEN engagement_score >= (SELECT p50 FROM percentiles) THEN 'average'
    ELSE 'below_average'
  END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_post_embeddings_updated_at 
  BEFORE UPDATE ON post_embeddings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Initial performance tier calculation (run after populating data)
-- SELECT update_performance_tiers();