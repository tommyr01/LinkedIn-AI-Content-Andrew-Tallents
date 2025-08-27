-- Migration: RAG Integration Schema
-- Description: Add RAG-specific tables and columns for voice pattern integration
-- Created: 2025-01-27

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Voice content chunks storage (from 865 Andrew voice chunks)
CREATE TABLE IF NOT EXISTS voice_content_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    source_document VARCHAR(255) NOT NULL,
    chunk_index INTEGER NOT NULL,
    topic_tags TEXT[],
    pattern_category VARCHAR(50), -- 'opening', 'storytelling', 'conclusion', etc.
    authenticity_score FLOAT DEFAULT 0.8 CHECK (authenticity_score >= 0 AND authenticity_score <= 1),
    token_count INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Performance tracking
    usage_count INTEGER DEFAULT 0,
    performance_score FLOAT DEFAULT 0.5 CHECK (performance_score >= 0 AND performance_score <= 1),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Voice patterns extracted from RAG system
CREATE TABLE IF NOT EXISTS voice_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_type VARCHAR(50) NOT NULL,
    pattern_text TEXT NOT NULL,
    source_episode VARCHAR(255),
    confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    usage_count INTEGER DEFAULT 0,
    performance_score FLOAT DEFAULT 0.5 CHECK (performance_score >= 0 AND performance_score <= 1),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- RAG retrieval analytics for tracking pattern usage and effectiveness
CREATE TABLE IF NOT EXISTS rag_retrieval_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES content_jobs(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES voice_content_chunks(id) ON DELETE SET NULL,
    retrieval_query TEXT NOT NULL,
    similarity_score FLOAT NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
    rank_position INTEGER NOT NULL CHECK (rank_position > 0),
    used_in_generation BOOLEAN DEFAULT FALSE,
    contribution_score FLOAT CHECK (contribution_score >= 0 AND contribution_score <= 1),
    rag_system_version VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pattern effectiveness tracking
CREATE TABLE IF NOT EXISTS pattern_effectiveness (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID NOT NULL REFERENCES voice_patterns(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES content_jobs(id) ON DELETE CASCADE,
    authenticity_contribution FLOAT CHECK (authenticity_contribution >= 0 AND authenticity_contribution <= 1),
    engagement_impact FLOAT,
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    effectiveness_score FLOAT CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1),
    usage_context VARCHAR(100),
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced content jobs with RAG support
ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS rag_metadata JSONB DEFAULT '{}';
ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS voice_authenticity_score FLOAT CHECK (voice_authenticity_score >= 0 AND voice_authenticity_score <= 1);
ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS patterns_used UUID[];
ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS rag_processing_time_ms INTEGER;

-- Enhanced content drafts with RAG insights
ALTER TABLE content_drafts ADD COLUMN IF NOT EXISTS rag_insights JSONB DEFAULT '{}';
ALTER TABLE content_drafts ADD COLUMN IF NOT EXISTS voice_patterns_used UUID[];
ALTER TABLE content_drafts ADD COLUMN IF NOT EXISTS retrieval_quality_score FLOAT CHECK (retrieval_quality_score >= 0 AND retrieval_quality_score <= 1);
ALTER TABLE content_drafts ADD COLUMN IF NOT EXISTS authenticity_breakdown JSONB DEFAULT '{}';

-- Performance indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_voice_content_chunks_embedding 
    ON voice_content_chunks USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

-- Indexes for pattern retrieval and analytics
CREATE INDEX IF NOT EXISTS idx_voice_patterns_type ON voice_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_voice_patterns_performance ON voice_patterns(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_voice_patterns_usage ON voice_patterns(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_voice_patterns_category_performance ON voice_content_chunks(pattern_category, performance_score DESC);

-- Indexes for RAG analytics
CREATE INDEX IF NOT EXISTS idx_rag_retrieval_job ON rag_retrieval_analytics(job_id);
CREATE INDEX IF NOT EXISTS idx_rag_retrieval_similarity ON rag_retrieval_analytics(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_rag_retrieval_timestamp ON rag_retrieval_analytics(timestamp);

-- Indexes for pattern effectiveness
CREATE INDEX IF NOT EXISTS idx_pattern_effectiveness_pattern ON pattern_effectiveness(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_effectiveness_score ON pattern_effectiveness(effectiveness_score DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_effectiveness_context ON pattern_effectiveness(usage_context);

-- Content jobs enhanced indexes
CREATE INDEX IF NOT EXISTS idx_content_jobs_rag_enabled ON content_jobs(rag_enabled) WHERE rag_enabled = true;
CREATE INDEX IF NOT EXISTS idx_content_jobs_voice_score ON content_jobs(voice_authenticity_score) WHERE voice_authenticity_score IS NOT NULL;

-- Content drafts enhanced indexes
CREATE INDEX IF NOT EXISTS idx_content_drafts_retrieval_quality ON content_drafts(retrieval_quality_score) WHERE retrieval_quality_score IS NOT NULL;

-- Function to update pattern usage statistics
CREATE OR REPLACE FUNCTION update_pattern_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Update usage count and last used timestamp for voice patterns
    IF TG_TABLE_NAME = 'rag_retrieval_analytics' AND NEW.used_in_generation = true THEN
        UPDATE voice_patterns 
        SET usage_count = usage_count + 1,
            last_used_at = NOW()
        WHERE id = (
            SELECT pattern_id FROM voice_content_chunks 
            WHERE id = NEW.chunk_id
        );
    END IF;
    
    -- Update chunk usage statistics
    IF TG_TABLE_NAME = 'rag_retrieval_analytics' AND NEW.used_in_generation = true AND NEW.chunk_id IS NOT NULL THEN
        UPDATE voice_content_chunks
        SET usage_count = usage_count + 1,
            last_used_at = NOW()
        WHERE id = NEW.chunk_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update pattern usage statistics
CREATE TRIGGER IF NOT EXISTS trigger_update_pattern_usage
    AFTER INSERT OR UPDATE ON rag_retrieval_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_pattern_usage();

-- Function to calculate pattern effectiveness scores
CREATE OR REPLACE FUNCTION calculate_pattern_effectiveness(pattern_uuid UUID)
RETURNS FLOAT AS $$
DECLARE
    avg_contribution FLOAT;
    usage_frequency FLOAT;
    recent_performance FLOAT;
    effectiveness FLOAT;
BEGIN
    -- Get average contribution score
    SELECT COALESCE(AVG(authenticity_contribution), 0.5)
    INTO avg_contribution
    FROM pattern_effectiveness
    WHERE pattern_id = pattern_uuid
    AND measured_at > NOW() - INTERVAL '30 days';
    
    -- Get usage frequency (normalized)
    SELECT LEAST(usage_count::FLOAT / 100.0, 1.0)
    INTO usage_frequency
    FROM voice_patterns
    WHERE id = pattern_uuid;
    
    -- Get recent performance (last 10 uses)
    SELECT COALESCE(AVG(effectiveness_score), 0.5)
    INTO recent_performance
    FROM (
        SELECT effectiveness_score
        FROM pattern_effectiveness
        WHERE pattern_id = pattern_uuid
        ORDER BY measured_at DESC
        LIMIT 10
    ) recent_scores;
    
    -- Calculate weighted effectiveness score
    effectiveness := (avg_contribution * 0.5) + (usage_frequency * 0.2) + (recent_performance * 0.3);
    
    -- Update the pattern's performance score
    UPDATE voice_patterns
    SET performance_score = effectiveness,
        updated_at = NOW()
    WHERE id = pattern_uuid;
    
    RETURN effectiveness;
END;
$$ LANGUAGE plpgsql;

-- Function to get top performing patterns by category
CREATE OR REPLACE FUNCTION get_top_patterns_by_category(
    category_name VARCHAR(50),
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    pattern_id UUID,
    pattern_text TEXT,
    confidence_score FLOAT,
    performance_score FLOAT,
    usage_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vp.id,
        vp.pattern_text,
        vp.confidence_score,
        vp.performance_score,
        vp.usage_count
    FROM voice_patterns vp
    WHERE vp.pattern_type = category_name
    ORDER BY vp.performance_score DESC, vp.usage_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search similar voice content chunks
CREATE OR REPLACE FUNCTION search_similar_voice_chunks(
    query_embedding vector(1536),
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INTEGER DEFAULT 10,
    pattern_categories TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    chunk_id UUID,
    content TEXT,
    similarity_score FLOAT,
    pattern_category VARCHAR(50),
    source_document VARCHAR(255),
    authenticity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vcc.id,
        vcc.content,
        1 - (vcc.embedding <=> query_embedding) AS similarity,
        vcc.pattern_category,
        vcc.source_document,
        vcc.authenticity_score
    FROM voice_content_chunks vcc
    WHERE 
        (1 - (vcc.embedding <=> query_embedding)) >= similarity_threshold
        AND (pattern_categories IS NULL OR vcc.pattern_category = ANY(pattern_categories))
        AND vcc.embedding IS NOT NULL
    ORDER BY vcc.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Insert initial RAG system metadata
INSERT INTO voice_patterns (pattern_type, pattern_text, source_episode, confidence_score, metadata)
VALUES 
    ('system', 'RAG Integration System Initialized', 'system', 1.0, '{"version": "1.0.0", "initialized_at": "2025-01-27"}')
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE voice_content_chunks IS 'Stores semantic chunks of Andrew Tallents voice patterns with vector embeddings';
COMMENT ON TABLE voice_patterns IS 'Extracted voice patterns with performance tracking and categorization';
COMMENT ON TABLE rag_retrieval_analytics IS 'Analytics for RAG pattern retrieval and usage effectiveness';
COMMENT ON TABLE pattern_effectiveness IS 'Tracks how effective different patterns are in generating authentic content';
COMMENT ON FUNCTION calculate_pattern_effectiveness(UUID) IS 'Calculates and updates pattern effectiveness score based on usage and performance data';
COMMENT ON FUNCTION search_similar_voice_chunks(vector(1536), FLOAT, INTEGER, TEXT[]) IS 'Performs vector similarity search on voice content chunks';

-- Migration completion log
DO $$
BEGIN
    RAISE NOTICE 'RAG Integration Schema Migration Completed Successfully';
    RAISE NOTICE 'Created tables: voice_content_chunks, voice_patterns, rag_retrieval_analytics, pattern_effectiveness';
    RAISE NOTICE 'Enhanced tables: content_jobs, content_drafts';
    RAISE NOTICE 'Created indexes for optimal vector search performance';
    RAISE NOTICE 'Created utility functions for pattern management and search';
END $$;