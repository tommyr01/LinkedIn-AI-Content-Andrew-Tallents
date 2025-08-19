# Database Schema - LinkedIn Content Generation Enhancement

## Overview
This document outlines all database changes required for the LinkedIn Content Generation Enhancement project. The schema builds upon the existing Supabase PostgreSQL database while adding new tables and relationships to support performance-driven content generation.

## Current Database Analysis
Based on existing `supabase tables.md`, the current schema includes:
- User management and authentication
- LinkedIn connections and profiles  
- Post storage and engagement tracking
- Research and analysis data

## Schema Enhancement Plan

### New Custom Types
```sql
-- Content types for voice learning
CREATE TYPE voice_content_type AS ENUM ('post', 'comment');

-- Generation job statuses  
CREATE TYPE generation_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Pattern types for analysis
CREATE TYPE pattern_type AS ENUM ('structural', 'linguistic', 'temporal', 'engagement');

-- Performance insight categories
CREATE TYPE insight_category AS ENUM ('high_performer', 'underperformer', 'trending', 'experimental');
```

### Core Enhancement Tables

#### 1. Historical Analysis Results
**Purpose**: Store analysis results of historical posts for pattern identification

```sql
CREATE TABLE historical_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL, -- LinkedIn post ID or internal reference
    content TEXT NOT NULL,
    content_features JSONB NOT NULL, -- Extracted content characteristics
    engagement_metrics JSONB NOT NULL, -- Views, likes, comments, shares
    temporal_data JSONB NOT NULL, -- Post timing, day of week, etc.
    success_patterns TEXT[] NOT NULL, -- Identified success elements
    performance_score DECIMAL(5,4) NOT NULL, -- Normalized performance score 0-1
    analysis_version INTEGER DEFAULT 1, -- For schema evolution
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_historical_analysis_user ON historical_analysis_results(user_id);
CREATE INDEX idx_historical_analysis_performance ON historical_analysis_results(user_id, performance_score DESC);
CREATE INDEX idx_historical_analysis_features ON historical_analysis_results USING GIN(content_features);
CREATE INDEX idx_historical_analysis_patterns ON historical_analysis_results USING GIN(success_patterns);
CREATE INDEX idx_historical_analysis_created ON historical_analysis_results(created_at DESC);
```

#### 2. Performance Patterns
**Purpose**: Store identified patterns that correlate with high engagement

```sql
CREATE TABLE performance_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern_name TEXT NOT NULL,
    pattern_type pattern_type NOT NULL,
    pattern_elements JSONB NOT NULL, -- Detailed pattern characteristics
    success_correlation DECIMAL(5,4) NOT NULL, -- Correlation with engagement 0-1
    confidence_score DECIMAL(5,4) NOT NULL, -- Statistical confidence 0-1
    sample_size INTEGER NOT NULL, -- Number of posts this pattern was found in
    usage_count INTEGER DEFAULT 0, -- How many times used in generation
    effectiveness_score DECIMAL(5,4), -- Actual effectiveness when used
    last_validated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_patterns_user_correlation ON performance_patterns(user_id, success_correlation DESC);
CREATE INDEX idx_patterns_type ON performance_patterns(user_id, pattern_type);
CREATE INDEX idx_patterns_confidence ON performance_patterns(confidence_score DESC);
CREATE UNIQUE INDEX idx_patterns_user_name ON performance_patterns(user_id, pattern_name);
```

#### 3. Voice Models
**Purpose**: Store learned voice characteristics for posts vs comments

```sql
CREATE TABLE voice_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type voice_content_type NOT NULL,
    model_name TEXT NOT NULL, -- e.g., "andrew_posts_v1", "andrew_comments_v1"
    linguistic_patterns JSONB NOT NULL, -- Tone, vocabulary, structure patterns
    authenticity_thresholds JSONB NOT NULL, -- Min/max values for authenticity scoring
    model_version INTEGER DEFAULT 1,
    training_data_count INTEGER NOT NULL,
    accuracy_score DECIMAL(5,4), -- Model accuracy on validation set
    last_trained TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_voice_models_user_type ON voice_models(user_id, content_type);
CREATE INDEX idx_voice_models_active ON voice_models(user_id, content_type, is_active, model_version DESC);
CREATE UNIQUE INDEX idx_voice_models_user_name ON voice_models(user_id, model_name);
```

#### 4. Content Generation Jobs
**Purpose**: Track all content generation requests and results

```sql
CREATE TABLE content_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    generation_request JSONB NOT NULL, -- Original request parameters
    generated_variants JSONB, -- Array of 3 generated variants
    performance_predictions JSONB, -- Predicted engagement for each variant
    voice_model_ids UUID[] NOT NULL, -- Which voice models were used
    pattern_ids UUID[] NOT NULL, -- Which patterns were applied
    authenticity_scores JSONB, -- Authenticity score for each variant
    generation_metadata JSONB, -- Generation context, timing, etc.
    status generation_status DEFAULT 'pending',
    error_message TEXT, -- If status is 'failed'
    processing_time_ms INTEGER, -- Generation time in milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_generation_jobs_user ON content_generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_status ON content_generation_jobs(status, created_at DESC);
CREATE INDEX idx_generation_jobs_topic ON content_generation_jobs(user_id, topic);
CREATE INDEX idx_generation_jobs_performance ON content_generation_jobs(processing_time_ms) WHERE status = 'completed';
```

#### 5. Performance Feedback
**Purpose**: Track actual performance of published content for learning

```sql
CREATE TABLE performance_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    generation_job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
    variant_index INTEGER NOT NULL, -- Which of the 3 variants was used (0, 1, 2)
    published_content TEXT NOT NULL, -- Final content that was published (may be edited)
    linkedin_post_id TEXT, -- LinkedIn post ID if available
    predicted_metrics JSONB NOT NULL, -- What we predicted
    actual_metrics JSONB, -- Actual engagement received
    prediction_accuracy JSONB, -- Comparison analysis
    learning_insights JSONB, -- What we learned from this publication
    feedback_complete BOOLEAN DEFAULT FALSE, -- Whether we have complete data
    tracking_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_metric_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    feedback_final_date TIMESTAMP WITH TIME ZONE -- When tracking period ended
);

-- Indexes
CREATE INDEX idx_feedback_user ON performance_feedback(user_id);
CREATE INDEX idx_feedback_job ON performance_feedback(generation_job_id);
CREATE INDEX idx_feedback_complete ON performance_feedback(user_id, feedback_complete);
CREATE INDEX idx_feedback_accuracy ON performance_feedback USING GIN(prediction_accuracy);
```

#### 6. Performance Insights Cache
**Purpose**: Cache computed insights for dashboard performance

```sql
CREATE TABLE performance_insights_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_category insight_category NOT NULL,
    insight_data JSONB NOT NULL, -- Cached analysis results
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    cache_key TEXT NOT NULL, -- For cache invalidation
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes
CREATE INDEX idx_insights_cache_user_category ON performance_insights_cache(user_id, insight_category);
CREATE INDEX idx_insights_cache_key ON performance_insights_cache(cache_key);
CREATE INDEX idx_insights_cache_expires ON performance_insights_cache(expires_at);
```

#### 7. System Performance Metrics
**Purpose**: Track system-wide performance for monitoring and optimization

```sql
CREATE TABLE system_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    metric_unit TEXT NOT NULL, -- 'ms', 'count', 'percentage', etc.
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system-wide metrics
    context_data JSONB, -- Additional context about the metric
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes  
CREATE INDEX idx_system_metrics_name_time ON system_performance_metrics(metric_name, recorded_at DESC);
CREATE INDEX idx_system_metrics_user ON system_performance_metrics(user_id, metric_name, recorded_at DESC);
```

### Relationship Tables

#### 8. Pattern Applications
**Purpose**: Track which patterns were used in which generations for effectiveness analysis

```sql
CREATE TABLE pattern_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID REFERENCES performance_patterns(id) ON DELETE CASCADE,
    generation_job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,
    variant_index INTEGER NOT NULL, -- Which variant (0, 1, 2)
    application_strength DECIMAL(3,2) NOT NULL, -- How strongly the pattern was applied (0-1)
    effectiveness_score DECIMAL(3,2), -- How effective it was (filled in after feedback)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pattern_applications_pattern ON pattern_applications(pattern_id);
CREATE INDEX idx_pattern_applications_job ON pattern_applications(generation_job_id);
CREATE UNIQUE INDEX idx_pattern_applications_unique ON pattern_applications(pattern_id, generation_job_id, variant_index);
```

## Migration Scripts

### Migration 001: Initial Schema Creation
```sql
-- Create all new custom types
-- Create all new tables with indexes
-- Add appropriate RLS policies

-- Enable RLS on all new tables
ALTER TABLE historical_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_insights_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_applications ENABLE ROW LEVEL SECURITY;
```

### Row Level Security (RLS) Policies

```sql
-- Historical analysis results - users can only access their own data
CREATE POLICY "Users can view own historical analysis" ON historical_analysis_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own historical analysis" ON historical_analysis_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own historical analysis" ON historical_analysis_results
    FOR UPDATE USING (auth.uid() = user_id);

-- Performance patterns - users can only access their own patterns
CREATE POLICY "Users can view own patterns" ON performance_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patterns" ON performance_patterns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns" ON performance_patterns
    FOR UPDATE USING (auth.uid() = user_id);

-- Voice models - users can only access their own models
CREATE POLICY "Users can view own voice models" ON voice_models
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice models" ON voice_models
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice models" ON voice_models
    FOR UPDATE USING (auth.uid() = user_id);

-- Generation jobs - users can only access their own jobs
CREATE POLICY "Users can view own generation jobs" ON content_generation_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generation jobs" ON content_generation_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generation jobs" ON content_generation_jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- Performance feedback - users can only access their own feedback
CREATE POLICY "Users can view own feedback" ON performance_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback" ON performance_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback" ON performance_feedback
    FOR UPDATE USING (auth.uid() = user_id);

-- Insights cache - users can only access their own insights
CREATE POLICY "Users can view own insights" ON performance_insights_cache
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights" ON performance_insights_cache
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights" ON performance_insights_cache
    FOR UPDATE USING (auth.uid() = user_id);

-- System metrics - read-only for authenticated users, write for service
CREATE POLICY "Authenticated users can view system metrics" ON system_performance_metrics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can insert system metrics" ON system_performance_metrics
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Pattern applications - users can view through their patterns and jobs
CREATE POLICY "Users can view pattern applications" ON pattern_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM performance_patterns p 
            WHERE p.id = pattern_id AND p.user_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM content_generation_jobs j 
            WHERE j.id = generation_job_id AND j.user_id = auth.uid()
        )
    );
```

### Database Functions

#### 1. Update Pattern Effectiveness
```sql
CREATE OR REPLACE FUNCTION update_pattern_effectiveness()
RETURNS TRIGGER AS $$
BEGIN
    -- When performance feedback is updated, update pattern effectiveness
    UPDATE performance_patterns 
    SET effectiveness_score = (
        SELECT AVG(pa.effectiveness_score)
        FROM pattern_applications pa
        WHERE pa.pattern_id = performance_patterns.id
        AND pa.effectiveness_score IS NOT NULL
    ),
    usage_count = (
        SELECT COUNT(*)
        FROM pattern_applications pa
        WHERE pa.pattern_id = performance_patterns.id
    ),
    updated_at = NOW()
    WHERE id IN (
        SELECT pa.pattern_id
        FROM pattern_applications pa
        WHERE pa.generation_job_id = NEW.generation_job_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pattern_effectiveness
    AFTER UPDATE ON performance_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_pattern_effectiveness();
```

#### 2. Cache Cleanup Function
```sql
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM performance_insights_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule periodic cache cleanup
SELECT cron.schedule('cleanup-insights-cache', '0 */6 * * *', 'SELECT cleanup_expired_cache();');
```

## Data Relationships

### Core Relationships
```
users (auth.users)
├── historical_analysis_results (1:many)
├── performance_patterns (1:many)
├── voice_models (1:many)  
├── content_generation_jobs (1:many)
└── performance_feedback (1:many)

content_generation_jobs
├── performance_feedback (1:1)
└── pattern_applications (1:many)

performance_patterns
└── pattern_applications (1:many)
```

### Data Flow
1. **Historical Analysis**: `historical_analysis_results` → `performance_patterns`
2. **Voice Learning**: Content data → `voice_models`
3. **Content Generation**: `voice_models` + `performance_patterns` → `content_generation_jobs`
4. **Performance Tracking**: Published content → `performance_feedback`
5. **Learning Loop**: `performance_feedback` → Updated `performance_patterns` and `voice_models`

## Performance Considerations

### Query Optimization
- All foreign key relationships are indexed
- JSONB fields have GIN indexes for efficient querying
- Time-based queries use indexed timestamp fields
- User-scoped queries leverage RLS policies with indexed user_id fields

### Storage Optimization
- JSONB compression for large content fields
- Periodic cleanup of expired cache entries
- Archival strategy for old generation jobs

### Scaling Considerations
- Table partitioning by user_id for large datasets
- Read replicas for analytics queries
- Connection pooling for high concurrency

## Backup & Recovery

### Critical Tables (Priority 1)
- `performance_patterns` - Core learning data
- `voice_models` - Trained models
- `historical_analysis_results` - Analysis foundation

### Important Tables (Priority 2)  
- `content_generation_jobs` - Generation history
- `performance_feedback` - Learning feedback

### Cache Tables (Priority 3)
- `performance_insights_cache` - Can be regenerated
- `system_performance_metrics` - Monitoring data

## Monitoring Queries

### System Health
```sql
-- Check generation job success rate
SELECT 
    status,
    COUNT(*) as count,
    AVG(processing_time_ms) as avg_time_ms
FROM content_generation_jobs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Check pattern effectiveness
SELECT 
    pattern_name,
    success_correlation,
    usage_count,
    effectiveness_score
FROM performance_patterns 
WHERE usage_count > 0
ORDER BY effectiveness_score DESC NULLS LAST;
```

### Performance Metrics
```sql
-- Average generation time by user
SELECT 
    user_id,
    COUNT(*) as jobs,
    AVG(processing_time_ms) as avg_time,
    MAX(processing_time_ms) as max_time
FROM content_generation_jobs 
WHERE status = 'completed'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id;
```

---

**Document Status**: Ready for Implementation
**Last Updated**: 2025-08-19
**Review Required**: Database Administrator approval
**Next Steps**: 
1. Review and approve schema design
2. Create migration scripts
3. Set up development database
4. Implement schema in staging environment