-- LinkedIn Post Chunks Schema for RAG Integration
-- This table stores processed LinkedIn posts as semantic chunks for voice pattern extraction

CREATE TABLE IF NOT EXISTS linkedin_post_chunks (
    id SERIAL PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES linkedin_posts(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_order INTEGER NOT NULL, -- Order of chunk within the post
    chunk_type VARCHAR(50) NOT NULL, -- 'opening', 'body', 'insight', 'cta', 'story', 'research_citation'
    
    -- Vector embeddings for semantic search
    embedding vector(1536), -- OpenAI text-embedding-ada-002 dimensions
    
    -- Voice authenticity metrics
    authenticity_score INTEGER DEFAULT 0 CHECK (authenticity_score >= 0 AND authenticity_score <= 100),
    quality_score DECIMAL(3,2) DEFAULT 0.0 CHECK (quality_score >= 0.0 AND quality_score <= 1.0),
    
    -- Pattern analysis
    pattern_types TEXT[] DEFAULT '{}', -- e.g., ['confrontational', 'question', 'storytelling']
    voice_markers TEXT[] DEFAULT '{}', -- Specific Andrew voice indicators found
    
    -- Content metadata
    token_count INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    sentence_count INTEGER DEFAULT 0,
    
    -- Performance metrics
    retrieval_frequency INTEGER DEFAULT 0,
    effectiveness_score DECIMAL(3,2) DEFAULT 0.0,
    engagement_indicators JSONB DEFAULT '{}', -- reaction counts, comments, etc.
    
    -- Semantic categorization
    primary_topic VARCHAR(100),
    topic_categories TEXT[] DEFAULT '{}',
    intent_category VARCHAR(50), -- 'educational', 'motivational', 'challenging', 'personal'
    
    -- LinkedIn post context
    original_post_date TIMESTAMP WITH TIME ZONE,
    post_performance JSONB DEFAULT '{}', -- reactions, comments, reposts
    
    -- RAG optimization
    semantic_density DECIMAL(3,2) DEFAULT 0.0, -- How information-dense the chunk is
    context_relevance DECIMAL(3,2) DEFAULT 0.0, -- How well it represents Andrew's voice
    
    -- Metadata
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_retrieved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast RAG retrieval
CREATE INDEX IF NOT EXISTS idx_linkedin_post_chunks_embedding ON linkedin_post_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_linkedin_post_chunks_authenticity ON linkedin_post_chunks(authenticity_score DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_post_chunks_quality ON linkedin_post_chunks(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_post_chunks_pattern_types ON linkedin_post_chunks USING GIN(pattern_types);
CREATE INDEX IF NOT EXISTS idx_linkedin_post_chunks_topic ON linkedin_post_chunks(primary_topic);
CREATE INDEX IF NOT EXISTS idx_linkedin_post_chunks_post_id ON linkedin_post_chunks(post_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_post_chunks_chunk_type ON linkedin_post_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_linkedin_post_chunks_retrieval_freq ON linkedin_post_chunks(retrieval_frequency DESC);

-- Composite indexes for common RAG queries
CREATE INDEX IF NOT EXISTS idx_linkedin_post_chunks_rag_priority ON linkedin_post_chunks(authenticity_score DESC, quality_score DESC, retrieval_frequency DESC);
CREATE INDEX IF NOT EXISTS idx_linkedin_post_chunks_pattern_search ON linkedin_post_chunks USING GIN(pattern_types) WHERE authenticity_score >= 60;

-- Function to match LinkedIn post chunks using vector similarity
CREATE OR REPLACE FUNCTION match_linkedin_post_chunks(
    query_embedding vector(1536),
    chunk_types_filter text[] DEFAULT NULL,
    pattern_types_filter text[] DEFAULT NULL,
    similarity_threshold float DEFAULT 0.5,
    max_chunks int DEFAULT 10,
    min_authenticity_score int DEFAULT 50
)
RETURNS TABLE (
    chunk_id int,
    chunk_text text,
    chunk_type varchar(50),
    similarity_score float,
    authenticity_score int,
    quality_score decimal(3,2),
    pattern_types text[],
    voice_markers text[],
    primary_topic varchar(100),
    token_count int,
    retrieval_frequency int,
    post_id uuid,
    original_post_date timestamp with time zone,
    rank_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lpc.id as chunk_id,
        lpc.chunk_text,
        lpc.chunk_type,
        (1 - (lpc.embedding <=> query_embedding)) as similarity_score,
        lpc.authenticity_score,
        lpc.quality_score,
        lpc.pattern_types,
        lpc.voice_markers,
        lpc.primary_topic,
        lpc.token_count,
        lpc.retrieval_frequency,
        lpc.post_id,
        lpc.original_post_date,
        -- Combined ranking: similarity + authenticity + quality + retrieval frequency
        (
            (1 - (lpc.embedding <=> query_embedding)) * 0.4 +
            (lpc.authenticity_score / 100.0) * 0.3 +
            lpc.quality_score * 0.2 +
            (LEAST(lpc.retrieval_frequency, 100) / 100.0) * 0.1
        ) as rank_score
    FROM linkedin_post_chunks lpc
    WHERE 
        (1 - (lpc.embedding <=> query_embedding)) >= similarity_threshold
        AND lpc.authenticity_score >= min_authenticity_score
        AND (
            chunk_types_filter IS NULL 
            OR lpc.chunk_type = ANY(chunk_types_filter)
        )
        AND (
            pattern_types_filter IS NULL 
            OR lpc.pattern_types && pattern_types_filter
        )
    ORDER BY rank_score DESC
    LIMIT max_chunks;
END;
$$;

-- Function to get contextual LinkedIn post chunks (adjacent chunks from same post)
CREATE OR REPLACE FUNCTION get_contextual_linkedin_chunks(
    base_chunk_ids int[],
    context_window int DEFAULT 1
)
RETURNS TABLE (
    base_chunk_id int,
    context_chunk_id int,
    chunk_text text,
    context_position int,
    chunk_order int
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        base_chunks.id as base_chunk_id,
        context_chunks.id as context_chunk_id,
        context_chunks.chunk_text,
        (context_chunks.chunk_order - base_chunks.chunk_order) as context_position,
        context_chunks.chunk_order
    FROM linkedin_post_chunks base_chunks
    JOIN linkedin_post_chunks context_chunks 
        ON base_chunks.post_id = context_chunks.post_id
        AND context_chunks.chunk_order BETWEEN 
            (base_chunks.chunk_order - context_window) 
            AND (base_chunks.chunk_order + context_window)
    WHERE base_chunks.id = ANY(base_chunk_ids)
    ORDER BY base_chunks.id, context_chunks.chunk_order;
END;
$$;

-- Function to update retrieval frequency and effectiveness
CREATE OR REPLACE FUNCTION update_linkedin_chunk_analytics(
    chunk_ids int[],
    effectiveness_scores float[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    chunk_id int;
    effectiveness_score float;
BEGIN
    -- Update retrieval frequency for all chunks
    UPDATE linkedin_post_chunks 
    SET 
        retrieval_frequency = retrieval_frequency + 1,
        last_retrieved_at = NOW()
    WHERE id = ANY(chunk_ids);
    
    -- Update effectiveness scores if provided
    IF effectiveness_scores IS NOT NULL THEN
        FOR i IN 1..array_length(chunk_ids, 1) LOOP
            chunk_id := chunk_ids[i];
            effectiveness_score := effectiveness_scores[i];
            
            UPDATE linkedin_post_chunks 
            SET effectiveness_score = (
                CASE 
                    WHEN retrieval_frequency = 0 THEN effectiveness_score
                    ELSE (effectiveness_score * retrieval_frequency + effectiveness_score) / (retrieval_frequency + 1)
                END
            )
            WHERE id = chunk_id;
        END LOOP;
    END IF;
END;
$$;

-- Trigger to auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_linkedin_post_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_linkedin_post_chunks_updated_at
    BEFORE UPDATE ON linkedin_post_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_linkedin_post_chunks_updated_at();

-- View for LinkedIn post chunks analytics and performance
CREATE OR REPLACE VIEW linkedin_post_chunks_analytics AS
SELECT 
    chunk_type,
    COUNT(*) as total_chunks,
    AVG(authenticity_score) as avg_authenticity,
    AVG(quality_score) as avg_quality,
    AVG(retrieval_frequency) as avg_retrieval_freq,
    AVG(effectiveness_score) as avg_effectiveness,
    COUNT(*) FILTER (WHERE authenticity_score >= 80) as high_authenticity_chunks,
    COUNT(*) FILTER (WHERE quality_score >= 0.7) as high_quality_chunks,
    COUNT(*) FILTER (WHERE retrieval_frequency > 0) as retrieved_chunks,
    array_agg(DISTINCT unnest(pattern_types)) FILTER (WHERE pattern_types IS NOT NULL) as all_pattern_types
FROM linkedin_post_chunks
GROUP BY chunk_type;

-- Performance monitoring view
CREATE OR REPLACE VIEW linkedin_rag_performance_stats AS
SELECT 
    'linkedin_chunks' as type,
    COUNT(*) as total_records,
    AVG(authenticity_score / 100.0) as avg_authenticity,
    AVG(quality_score) as avg_quality,
    AVG(effectiveness_score) as avg_effectiveness,
    COUNT(*) FILTER (WHERE authenticity_score >= 80) as high_authenticity_chunks,
    COUNT(*) FILTER (WHERE quality_score >= 0.7) as high_quality_chunks,
    COUNT(*) FILTER (WHERE retrieval_frequency > 0) as retrieved_chunks,
    COUNT(*) FILTER (WHERE embedding IS NOT NULL) as chunks_with_embeddings,
    MAX(last_retrieved_at) as last_retrieval_time,
    COUNT(DISTINCT post_id) as unique_posts_processed
FROM linkedin_post_chunks;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON linkedin_post_chunks TO authenticated;
GRANT SELECT ON linkedin_post_chunks_analytics TO authenticated;
GRANT SELECT ON linkedin_rag_performance_stats TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE linkedin_post_chunks_id_seq TO authenticated;

COMMENT ON TABLE linkedin_post_chunks IS 'Semantic chunks of LinkedIn posts for voice pattern RAG retrieval';
COMMENT ON COLUMN linkedin_post_chunks.chunk_type IS 'Type of content chunk: opening, body, insight, cta, story, research_citation';
COMMENT ON COLUMN linkedin_post_chunks.pattern_types IS 'Array of voice patterns identified in this chunk';
COMMENT ON COLUMN linkedin_post_chunks.voice_markers IS 'Specific Andrew Tallents voice indicators found in this chunk';
COMMENT ON COLUMN linkedin_post_chunks.authenticity_score IS 'How authentic this chunk sounds like Andrew (0-100)';
COMMENT ON COLUMN linkedin_post_chunks.embedding IS 'Vector embedding for semantic similarity search';