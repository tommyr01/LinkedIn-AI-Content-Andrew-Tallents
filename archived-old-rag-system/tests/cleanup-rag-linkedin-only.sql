-- RAG System LinkedIn-Only Cleanup Script
-- This script removes all podcast/webinar voice chunks and converts the system to LinkedIn-exclusive

-- =============================================
-- PHASE 1: CREATE BACKUPS
-- =============================================

-- Backup podcast chunks before deletion
CREATE TABLE IF NOT EXISTS voice_content_chunks_backup AS 
SELECT * FROM voice_content_chunks;

-- Backup related analytics
CREATE TABLE IF NOT EXISTS chunk_retrieval_analytics_backup AS 
SELECT * FROM chunk_retrieval_analytics 
WHERE chunk_id IN (SELECT id FROM voice_content_chunks);

-- Verify backup creation
SELECT 
  'voice_content_chunks_backup' as table_name,
  COUNT(*) as backup_records,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM voice_content_chunks_backup
UNION ALL
SELECT 
  'chunk_retrieval_analytics_backup' as table_name,
  COUNT(*) as backup_records,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM chunk_retrieval_analytics_backup;

-- =============================================
-- PHASE 2: REMOVE ANALYTICS DEPENDENCIES
-- =============================================

-- Delete analytics for podcast chunks (before deleting the chunks themselves)
DELETE FROM chunk_retrieval_analytics 
WHERE chunk_id IN (SELECT id FROM voice_content_chunks);

-- Get deletion count for verification
SELECT 
  COUNT(*) as analytics_deleted,
  'Analytics records deleted' as description
FROM chunk_retrieval_analytics_backup;

-- =============================================
-- PHASE 3: DROP DEPENDENT VIEWS AND FUNCTIONS
-- =============================================

-- Drop views that depend on voice_content_chunks
DROP VIEW IF EXISTS combined_rag_performance_stats CASCADE;
DROP VIEW IF EXISTS rag_performance_stats CASCADE;

-- Drop functions that depend on voice_content_chunks
DROP FUNCTION IF EXISTS match_voice_chunks(vector, text, double precision, integer, double precision, text, text[]) CASCADE;
DROP FUNCTION IF EXISTS get_contextual_chunks(integer[], integer) CASCADE;
DROP FUNCTION IF EXISTS update_chunk_retrieval_stats() CASCADE;
DROP FUNCTION IF EXISTS analyze_chunk_quality() CASCADE;

-- =============================================
-- PHASE 4: DELETE PODCAST CHUNKS
-- =============================================

-- Store count before deletion for verification
CREATE TEMP TABLE deletion_stats AS
SELECT 
  COUNT(*) as chunks_to_delete,
  COUNT(DISTINCT episode_id) as episodes_to_remove,
  COUNT(*) FILTER (WHERE speaker = 'andrew') as andrew_chunks_to_delete
FROM voice_content_chunks;

-- Delete all podcast/webinar chunks
DELETE FROM voice_content_chunks;

-- Verify deletion
SELECT 
  ds.chunks_to_delete,
  ds.episodes_to_remove,
  ds.andrew_chunks_to_delete,
  COUNT(*) as remaining_chunks,
  'Podcast chunks deleted successfully' as status
FROM deletion_stats ds, voice_content_chunks
GROUP BY ds.chunks_to_delete, ds.episodes_to_remove, ds.andrew_chunks_to_delete;

-- If no remaining chunks, this should show 0
SELECT COUNT(*) as voice_content_chunks_remaining FROM voice_content_chunks;

-- =============================================
-- PHASE 5: RECREATE LINKEDIN-ONLY VIEWS
-- =============================================

-- Create LinkedIn-focused performance stats view
CREATE OR REPLACE VIEW rag_performance_stats AS
SELECT 
  'linkedin_chunks'::text AS type,
  COUNT(*) AS total_records,
  AVG(quality_score) AS avg_quality,
  AVG(retrieval_frequency) AS avg_retrieval_freq,
  COUNT(*) AS linkedin_chunks,
  COUNT(*) FILTER (WHERE quality_score >= 0.7) AS high_quality_chunks,
  AVG(authenticity_score) AS avg_authenticity_score,
  COUNT(*) FILTER (WHERE authenticity_score >= 80) AS high_authenticity_chunks,
  COUNT(DISTINCT post_id) AS unique_posts_processed,
  MAX(created_at) AS last_update_time
FROM linkedin_post_chunks
UNION ALL
SELECT 
  'voice_patterns'::text AS type,
  COUNT(*) AS total_records,
  AVG(effectiveness_score) AS avg_quality,
  AVG(frequency_score) AS avg_retrieval_freq,
  COUNT(*) FILTER (WHERE high_engagement_marker = true) AS linkedin_chunks,
  COUNT(*) FILTER (WHERE effectiveness_score >= 0.7) AS high_quality_chunks,
  AVG(effectiveness_score) AS avg_authenticity_score,
  COUNT(*) FILTER (WHERE effectiveness_score >= 0.8) AS high_authenticity_chunks,
  COUNT(DISTINCT pattern_type) AS unique_posts_processed,
  MAX(updated_at) AS last_update_time
FROM voice_pattern_library;

-- Create simplified LinkedIn analytics view
CREATE OR REPLACE VIEW linkedin_rag_analytics AS
SELECT 
  lpc.primary_topic,
  COUNT(*) as chunk_count,
  AVG(lpc.authenticity_score) as avg_authenticity,
  AVG(lpc.quality_score) as avg_quality,
  AVG(lpc.retrieval_frequency) as avg_retrieval_freq,
  COUNT(*) FILTER (WHERE lpc.authenticity_score >= 80) as high_auth_chunks,
  COUNT(*) FILTER (WHERE lpc.quality_score >= 0.7) as high_quality_chunks,
  STRING_AGG(DISTINCT unnest(lpc.pattern_types), ', ') as common_patterns
FROM linkedin_post_chunks lpc
GROUP BY lpc.primary_topic
ORDER BY chunk_count DESC;

-- =============================================
-- PHASE 6: VERIFICATION AND CLEANUP SUMMARY
-- =============================================

-- Final verification query
SELECT 
  'CLEANUP SUMMARY' as phase,
  'SUCCESS' as status,
  jsonb_build_object(
    'podcast_chunks_deleted', (SELECT chunks_to_delete FROM deletion_stats),
    'linkedin_chunks_available', (SELECT COUNT(*) FROM linkedin_post_chunks),
    'unique_linkedin_posts', (SELECT COUNT(DISTINCT post_id) FROM linkedin_post_chunks),
    'avg_linkedin_authenticity', (SELECT ROUND(AVG(authenticity_score), 2) FROM linkedin_post_chunks),
    'high_quality_linkedin_chunks', (SELECT COUNT(*) FROM linkedin_post_chunks WHERE authenticity_score >= 80),
    'backup_tables_created', 2,
    'views_recreated', 2
  ) as cleanup_results;

-- Show current RAG system status
SELECT 
  'RAG SYSTEM STATUS' as category,
  'LinkedIn-Only Active' as status,
  jsonb_build_object(
    'total_chunks', COUNT(*),
    'avg_authenticity', ROUND(AVG(authenticity_score), 2),
    'avg_quality', ROUND(AVG(quality_score), 2),
    'unique_posts', COUNT(DISTINCT post_id),
    'pattern_types_available', (SELECT COUNT(DISTINCT unnest(pattern_types)) FROM linkedin_post_chunks),
    'latest_post_date', MAX(original_post_date)
  ) as system_metrics
FROM linkedin_post_chunks;

-- =============================================
-- PHASE 7: ROLLBACK INSTRUCTIONS
-- =============================================

-- To rollback this cleanup, run the following commands:
/*
-- 1. Restore podcast chunks from backup
INSERT INTO voice_content_chunks 
SELECT * FROM voice_content_chunks_backup;

-- 2. Restore analytics from backup  
INSERT INTO chunk_retrieval_analytics 
SELECT * FROM chunk_retrieval_analytics_backup;

-- 3. Drop LinkedIn-only views
DROP VIEW IF EXISTS rag_performance_stats;
DROP VIEW IF EXISTS linkedin_rag_analytics;

-- 4. Recreate original mixed-source views (would need original DDL)
-- 5. Update voice-rag-system.ts to restore dual-source retrieval
*/

-- Success message
SELECT 
  'RAG LINKEDIN-ONLY CLEANUP COMPLETED' as message,
  'System now uses exclusively LinkedIn posts for voice training' as description,
  'Check voice-rag-system.ts code updates are also applied' as next_step;