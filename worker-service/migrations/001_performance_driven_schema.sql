-- Performance-Driven Content Enhancement Phase 1 - Database Schema
-- This creates the foundational tables for tracking and learning from performance data

-- 1. Post Performance Analytics Table
-- Tracks engagement metrics for Andrew's posts over time
CREATE TABLE IF NOT EXISTS post_performance_analytics (
  id bigserial PRIMARY KEY,
  
  -- Post identification
  post_id text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'linkedin',
  post_url text,
  
  -- Content data
  content_text text NOT NULL,
  word_count int,
  character_count int,
  hashtags text[] DEFAULT '{}',
  mentions text[] DEFAULT '{}',
  
  -- Performance metrics
  total_reactions int DEFAULT 0,
  like_count int DEFAULT 0,
  love_count int DEFAULT 0,
  support_count int DEFAULT 0,
  celebrate_count int DEFAULT 0,
  insight_count int DEFAULT 0,
  funny_count int DEFAULT 0,
  comments_count int DEFAULT 0,
  reposts_count int DEFAULT 0,
  shares_count int DEFAULT 0,
  
  -- Calculated engagement metrics
  engagement_rate decimal(5,2) DEFAULT 0,
  comment_rate decimal(5,2) DEFAULT 0,
  share_rate decimal(5,2) DEFAULT 0,
  viral_score int GENERATED ALWAYS AS (
    total_reactions + (comments_count * 3) + (reposts_count * 5) + (shares_count * 4)
  ) STORED,
  
  -- Performance tier (calculated from percentiles)
  performance_tier text CHECK (performance_tier IN ('top_10_percent', 'top_25_percent', 'average', 'below_average')),
  
  -- Temporal data
  posted_at timestamp,
  scraped_at timestamp DEFAULT now(),
  last_updated timestamp DEFAULT now(),
  
  -- Metadata
  author_name text DEFAULT 'Andrew Tallents',
  post_type text, -- 'text', 'image', 'video', 'carousel', 'poll'
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 2. Voice Learning Data Table
-- Stores analyzed voice patterns from posts and comments
CREATE TABLE IF NOT EXISTS voice_learning_data (
  id bigserial PRIMARY KEY,
  
  -- Source content
  content_id text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('post', 'comment', 'article')),
  content_text text NOT NULL,
  content_context text, -- What the comment was replying to, post topic, etc.
  
  -- Voice analysis
  tone_analysis jsonb, -- {"primary_tone": "professional", "secondary_tone": "conversational", "confidence": 0.85}
  writing_style jsonb, -- {"sentence_length": "mixed", "paragraph_structure": "short", "punctuation_style": "em_dashes"}
  vocabulary_patterns jsonb, -- {"authority_signals": [...], "emotional_words": [...], "action_words": [...]}
  structural_patterns jsonb, -- {"opening_type": "question", "closing_type": "cta", "story_elements": true}
  
  -- Voice scoring
  authenticity_score int CHECK (authenticity_score >= 0 AND authenticity_score <= 100),
  authority_score int CHECK (authority_score >= 0 AND authority_score <= 100),
  vulnerability_score int CHECK (vulnerability_score >= 0 AND vulnerability_score <= 100),
  engagement_potential int CHECK (engagement_potential >= 0 AND engagement_potential <= 100),
  
  -- Learning metadata
  analysis_model text DEFAULT 'gpt-4o',
  confidence_score decimal(3,2) DEFAULT 0.00,
  training_weight decimal(3,2) DEFAULT 1.00, -- Higher for posts, lower for comments
  
  -- Temporal data
  content_date timestamp,
  analyzed_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  
  -- Performance correlation (for posts)
  post_performance_id bigint REFERENCES post_performance_analytics(id) ON DELETE SET NULL
);

-- 3. Content Variants Tracking Table  
-- Track performance of our 3 strategic variants over time
CREATE TABLE IF NOT EXISTS content_variants_tracking (
  id bigserial PRIMARY KEY,
  
  -- Generation metadata
  job_id text NOT NULL, -- Links to content_jobs table
  variant_number int NOT NULL CHECK (variant_number IN (1, 2, 3)),
  generation_timestamp timestamp DEFAULT now(),
  
  -- Content data
  topic text NOT NULL,
  research_ideas jsonb, -- The research ideas used for this variant
  generated_content text NOT NULL,
  agent_name text NOT NULL,
  
  -- Performance prediction (at generation time)
  predicted_engagement int,
  predicted_confidence decimal(3,2),
  prediction_factors jsonb, -- {"strengths": [...], "improvements": [...], "similar_post_score": 85}
  
  -- Voice analysis (at generation time)
  voice_score int,
  voice_analysis jsonb, -- Full voice analysis from performance insights
  historical_context_used boolean DEFAULT false,
  similar_posts_analyzed int DEFAULT 0,
  
  -- Actual performance (if posted and tracked)
  was_posted boolean DEFAULT false,
  posted_at timestamp,
  actual_performance_id bigint REFERENCES post_performance_analytics(id) ON DELETE SET NULL,
  
  -- Performance comparison (predicted vs actual)
  prediction_accuracy decimal(3,2), -- How close was our prediction?
  performance_delta int, -- actual_score - predicted_score
  
  -- Learning feedback
  success_factors jsonb, -- What made this variant successful/unsuccessful
  improvement_insights jsonb, -- What we learned for future generations
  
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 4. Historical Insights Table
-- Store processed insights from high-performing content for quick access
CREATE TABLE IF NOT EXISTS historical_insights (
  id bigserial PRIMARY KEY,
  
  -- Query context
  query_topic text NOT NULL,
  query_hash text NOT NULL, -- Hash of normalized topic for caching
  
  -- Analysis results
  related_posts_count int DEFAULT 0,
  top_performers_count int DEFAULT 0,
  analysis_timeframe_days int DEFAULT 365,
  
  -- Patterns discovered
  content_patterns jsonb NOT NULL, -- {"avg_word_count": 180, "common_openings": [...], "best_formats": [...]}
  voice_patterns jsonb NOT NULL, -- {"tone": "conversational", "vulnerability_score": 75, "authority_signals": [...]}
  performance_patterns jsonb NOT NULL, -- {"high_engagement_triggers": [...], "optimal_timing": [...], "format_recommendations": [...]}
  
  -- Performance context
  avg_engagement_score decimal(10,2),
  top_performing_score int,
  performance_benchmark int, -- Target score for new content
  
  -- Related post references
  related_post_ids text[], -- Array of post IDs used in analysis
  top_performer_ids text[], -- Array of top performing post IDs
  
  -- Analysis metadata
  analysis_model text DEFAULT 'gpt-4o',
  confidence_level decimal(3,2) DEFAULT 0.00,
  data_freshness_score int DEFAULT 100, -- Decreases over time
  
  -- Caching and freshness
  expires_at timestamp DEFAULT (now() + interval '7 days'),
  cache_hit_count int DEFAULT 0,
  last_accessed_at timestamp DEFAULT now(),
  
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_performance_analytics_posted_at ON post_performance_analytics (posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_performance_analytics_viral_score ON post_performance_analytics (viral_score DESC);
CREATE INDEX IF NOT EXISTS idx_post_performance_analytics_performance_tier ON post_performance_analytics (performance_tier);
CREATE INDEX IF NOT EXISTS idx_post_performance_analytics_composite ON post_performance_analytics (performance_tier, posted_at DESC, viral_score DESC);

CREATE INDEX IF NOT EXISTS idx_voice_learning_data_content_type ON voice_learning_data (content_type);
CREATE INDEX IF NOT EXISTS idx_voice_learning_data_content_date ON voice_learning_data (content_date DESC);
CREATE INDEX IF NOT EXISTS idx_voice_learning_data_authenticity ON voice_learning_data (authenticity_score DESC);
CREATE INDEX IF NOT EXISTS idx_voice_learning_data_training_weight ON voice_learning_data (training_weight DESC);

CREATE INDEX IF NOT EXISTS idx_content_variants_tracking_job_id ON content_variants_tracking (job_id);
CREATE INDEX IF NOT EXISTS idx_content_variants_tracking_topic ON content_variants_tracking (topic);
CREATE INDEX IF NOT EXISTS idx_content_variants_tracking_generation_timestamp ON content_variants_tracking (generation_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_content_variants_tracking_was_posted ON content_variants_tracking (was_posted);

CREATE INDEX IF NOT EXISTS idx_historical_insights_query_hash ON historical_insights (query_hash);
CREATE INDEX IF NOT EXISTS idx_historical_insights_expires_at ON historical_insights (expires_at);
CREATE INDEX IF NOT EXISTS idx_historical_insights_confidence_level ON historical_insights (confidence_level DESC);

-- Functions for performance tier calculation
CREATE OR REPLACE FUNCTION update_performance_tiers_analytics()
RETURNS void
LANGUAGE sql
AS $$
  WITH percentiles AS (
    SELECT 
      percentile_cont(0.9) WITHIN GROUP (ORDER BY viral_score) as p90,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY viral_score) as p75,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY viral_score) as p50
    FROM post_performance_analytics
    WHERE posted_at > NOW() - INTERVAL '1 year'
  )
  UPDATE post_performance_analytics 
  SET performance_tier = CASE 
    WHEN viral_score >= (SELECT p90 FROM percentiles) THEN 'top_10_percent'
    WHEN viral_score >= (SELECT p75 FROM percentiles) THEN 'top_25_percent'  
    WHEN viral_score >= (SELECT p50 FROM percentiles) THEN 'average'
    ELSE 'below_average'
  END
  WHERE posted_at > NOW() - INTERVAL '1 year';
$$;

-- Function to clean up expired historical insights
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS int
LANGUAGE sql
AS $$
  WITH deleted AS (
    DELETE FROM historical_insights 
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT count(*) FROM deleted;
$$;

-- Function to calculate prediction accuracy after posting
CREATE OR REPLACE FUNCTION update_prediction_accuracy(
  variant_tracking_id bigint,
  actual_performance_score int
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  predicted_score int;
  accuracy decimal(3,2);
BEGIN
  -- Get the predicted score
  SELECT predicted_engagement INTO predicted_score
  FROM content_variants_tracking
  WHERE id = variant_tracking_id;
  
  -- Calculate accuracy (how close the prediction was)
  IF predicted_score > 0 THEN
    accuracy = 1.0 - ABS(actual_performance_score - predicted_score)::decimal / GREATEST(actual_performance_score, predicted_score);
    accuracy = GREATEST(0.0, accuracy); -- Ensure non-negative
  ELSE
    accuracy = 0.0;
  END IF;
  
  -- Update the tracking record
  UPDATE content_variants_tracking
  SET 
    prediction_accuracy = accuracy,
    performance_delta = actual_performance_score - predicted_score,
    updated_at = now()
  WHERE id = variant_tracking_id;
END;
$$;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_post_performance_analytics_timestamp 
  BEFORE UPDATE ON post_performance_analytics 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_trigger();

CREATE TRIGGER update_voice_learning_data_timestamp 
  BEFORE UPDATE ON voice_learning_data 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_trigger();

CREATE TRIGGER update_content_variants_tracking_timestamp 
  BEFORE UPDATE ON content_variants_tracking 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_trigger();

CREATE TRIGGER update_historical_insights_timestamp 
  BEFORE UPDATE ON historical_insights 
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_trigger();

-- Initial setup comments
-- After running this migration:
-- 1. Run SELECT update_performance_tiers_analytics(); to calculate initial tiers
-- 2. Set up cron job to run cleanup_expired_insights() daily
-- 3. Begin populating voice_learning_data from existing posts and comments