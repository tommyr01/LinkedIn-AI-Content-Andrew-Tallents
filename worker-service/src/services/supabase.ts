import { createClient } from '@supabase/supabase-js'
import { appConfig } from '../config'
import logger from '../lib/logger'
import type { ContentJob, ContentDraft, ResearchCache, AIAgentResult } from '../types'

export class SupabaseService {
  public client
  
  constructor() {
    this.client = createClient(
      appConfig.supabase.url,
      appConfig.supabase.serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }

  // Content Jobs Methods
  async createJob(data: {
    topic: string
    platform: string
    voice_guide_id?: string
    queue_job_id?: string
  }): Promise<ContentJob | null> {
    try {
      const { data: job, error } = await this.client
        .from('content_jobs')
        .insert({
          topic: data.topic,
          platform: data.platform,
          voice_guide_id: data.voice_guide_id,
          queue_job_id: data.queue_job_id,
          status: 'pending',
          progress: 0
        })
        .select()
        .single()

      if (error) {
        logger.error({ error }, 'Failed to create job in database')
        return null
      }

      logger.info({ jobId: job.id, topic: data.topic }, 'Job created in database')
      return job
    } catch (error) {
      logger.error({ error }, 'Error creating job')
      return null
    }
  }

  async updateJobProgress(jobId: string, progress: number, status?: string): Promise<boolean> {
    try {
      const updateData: any = { progress }
      if (status) {
        updateData.status = status
      }

      const { error } = await this.client
        .from('content_jobs')
        .update(updateData)
        .eq('id', jobId)

      if (error) {
        logger.error({ error, jobId }, 'Failed to update job progress')
        return false
      }

      logger.debug({ jobId, progress, status }, 'Job progress updated')
      return true
    } catch (error) {
      logger.error({ error, jobId }, 'Error updating job progress')
      return false
    }
  }

  async updateJobResearchData(jobId: string, researchData: any): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('content_jobs')
        .update({ research_data: researchData })
        .eq('id', jobId)

      if (error) {
        logger.error({ error, jobId }, 'Failed to update job research data')
        return false
      }

      logger.debug({ jobId }, 'Job research data updated')
      return true
    } catch (error) {
      logger.error({ error, jobId }, 'Error updating job research data')
      return false
    }
  }

  async completeJob(jobId: string, drafts: AIAgentResult[]): Promise<boolean> {
    try {
      // Use the stored procedure for atomic completion
      const draftData = drafts.map(draft => ({
        agent_name: draft.agent_name,
        content: draft.content,
        metadata: draft.metadata,
        score: draft.score?.toString() || null
      }))

      const { error } = await this.client.rpc('complete_job', {
        job_id: jobId,
        draft_data: draftData
      })

      if (error) {
        logger.error({ error, jobId }, 'Failed to complete job')
        return false
      }

      logger.info({ jobId, draftCount: drafts.length }, 'Job completed successfully')
      return true
    } catch (error) {
      logger.error({ error, jobId }, 'Error completing job')
      return false
    }
  }

  async failJob(jobId: string, errorMessage: string): Promise<boolean> {
    try {
      const { error } = await this.client.rpc('fail_job', {
        job_id: jobId,
        error_message: errorMessage
      })

      if (error) {
        logger.error({ error, jobId }, 'Failed to mark job as failed')
        return false
      }

      logger.info({ jobId, errorMessage }, 'Job marked as failed')
      return true
    } catch (error) {
      logger.error({ error, jobId }, 'Error failing job')
      return false
    }
  }

  async getJob(jobId: string): Promise<ContentJob | null> {
    try {
      const { data, error } = await this.client
        .from('content_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (error) {
        logger.error({ error, jobId }, 'Failed to get job')
        return null
      }

      return data
    } catch (error) {
      logger.error({ error, jobId }, 'Error getting job')
      return null
    }
  }

  async getJobWithDrafts(jobId: string): Promise<{
    job: ContentJob
    drafts: ContentDraft[]
  } | null> {
    try {
      const { data, error } = await this.client
        .from('content_with_jobs')
        .select('*')
        .eq('job_id', jobId)

      if (error) {
        logger.error({ error, jobId }, 'Failed to get job with drafts')
        return null
      }

      if (data.length === 0) {
        return null
      }

      // Group data
      const job = {
        id: data[0].job_id,
        status: data[0].job_status,
        topic: data[0].topic,
        platform: data[0].platform,
        voice_guide_id: data[0].voice_guide_id,
        // Add other job fields as needed
      } as ContentJob

      const drafts = data.map(row => ({
        id: row.id,
        job_id: row.job_id,
        variant_number: row.variant_number,
        agent_name: row.agent_name,
        content: row.content,
        metadata: row.metadata,
        score: row.score,
        created_at: row.created_at
      })) as ContentDraft[]

      return { job, drafts }
    } catch (error) {
      logger.error({ error, jobId }, 'Error getting job with drafts')
      return null
    }
  }

  // Research Cache Methods
  async getCachedResearch(queryHash: string): Promise<ResearchCache | null> {
    try {
      const { data, error } = await this.client
        .from('research_cache')
        .select('*')
        .eq('query_hash', queryHash)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        return null
      }

      // Update access tracking
      await this.client
        .from('research_cache')
        .update({
          hit_count: data.hit_count + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', data.id)

      return data
    } catch (error) {
      logger.error({ error, queryHash }, 'Error getting cached research')
      return null
    }
  }

  async setCachedResearch(data: {
    queryHash: string
    source: string
    queryText: string
    results: any
    expiresAt: Date
  }): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('research_cache')
        .insert({
          query_hash: data.queryHash,
          source: data.source,
          query_text: data.queryText,
          results: data.results,
          expires_at: data.expiresAt.toISOString()
        })

      if (error) {
        logger.error({ error }, 'Failed to cache research data')
        return false
      }

      return true
    } catch (error) {
      logger.error({ error }, 'Error caching research data')
      return false
    }
  }

  async cleanupExpiredCache(): Promise<number> {
    try {
      const { data, error } = await this.client.rpc('cleanup_expired_cache')

      if (error) {
        logger.error({ error }, 'Failed to cleanup expired cache')
        return 0
      }

      logger.info({ deletedCount: data }, 'Cleaned up expired cache entries')
      return data || 0
    } catch (error) {
      logger.error({ error }, 'Error cleaning up expired cache')
      return 0
    }
  }

  async getCacheStats() {
    try {
      const { data, error } = await this.client.rpc('get_cache_stats')

      if (error) {
        logger.error({ error }, 'Failed to get cache stats')
        return null
      }

      return data[0] || null
    } catch (error) {
      logger.error({ error }, 'Error getting cache stats')
      return null
    }
  }

  async clearCacheByHash(queryHash: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('research_cache')
        .delete()
        .eq('query_hash', queryHash)

      if (error) {
        logger.error({ error, queryHash }, 'Failed to clear cache by hash')
        return false
      }

      logger.info({ queryHash }, 'Cache entry cleared by hash')
      return true
    } catch (error) {
      logger.error({ error, queryHash }, 'Error clearing cache by hash')
      return false
    }
  }

  async clearCacheByPattern(pattern: string): Promise<number> {
    try {
      const { data, error } = await this.client
        .from('research_cache')
        .delete()
        .like('query_text', `%${pattern}%`)
        .select('id')

      if (error) {
        logger.error({ error, pattern }, 'Failed to clear cache by pattern')
        return 0
      }

      const deletedCount = data ? data.length : 0
      logger.info({ pattern, deletedCount }, 'Cache entries cleared by pattern')
      return deletedCount
    } catch (error) {
      logger.error({ error, pattern }, 'Error clearing cache by pattern')
      return 0
    }
  }

  async getAllCacheEntries(limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('research_cache')
        .select('query_hash, source, query_text, created_at, expires_at, hit_count')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        logger.error({ error }, 'Failed to get cache entries')
        return []
      }

      return data || []
    } catch (error) {
      logger.error({ error }, 'Error getting cache entries')
      return []
    }
  }

  // ==========================================
  // PHASE 1: PERFORMANCE-DRIVEN ENHANCEMENT
  // ==========================================

  // Post Performance Analytics Methods
  async savePostPerformance(data: {
    post_id: string
    platform?: string
    post_url?: string
    content_text: string
    total_reactions?: number
    like_count?: number
    love_count?: number
    support_count?: number
    celebrate_count?: number
    insight_count?: number
    funny_count?: number
    comments_count?: number
    reposts_count?: number
    shares_count?: number
    posted_at?: Date
    post_type?: string
  }): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('post_performance_analytics')
        .upsert({
          post_id: data.post_id,
          platform: data.platform || 'linkedin',
          post_url: data.post_url,
          content_text: data.content_text,
          word_count: data.content_text.split(' ').length,
          character_count: data.content_text.length,
          hashtags: this.extractHashtags(data.content_text),
          mentions: this.extractMentions(data.content_text),
          total_reactions: data.total_reactions || 0,
          like_count: data.like_count || 0,
          love_count: data.love_count || 0,
          support_count: data.support_count || 0,
          celebrate_count: data.celebrate_count || 0,
          insight_count: data.insight_count || 0,
          funny_count: data.funny_count || 0,
          comments_count: data.comments_count || 0,
          reposts_count: data.reposts_count || 0,
          shares_count: data.shares_count || 0,
          posted_at: data.posted_at?.toISOString(),
          post_type: data.post_type,
          scraped_at: new Date().toISOString()
        }, {
          onConflict: 'post_id'
        })

      if (error) {
        logger.error({ error, postId: data.post_id }, 'Failed to save post performance data')
        return false
      }

      logger.info({ postId: data.post_id }, 'Post performance data saved successfully')
      return true
    } catch (error) {
      logger.error({ error, postId: data.post_id }, 'Error saving post performance data')
      return false
    }
  }

  async getTopPerformingPosts(limit: number = 10, days: number = 365): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('post_performance_analytics')
        .select('*')
        .gte('posted_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('viral_score', { ascending: false })
        .limit(limit)

      if (error) {
        logger.error({ error }, 'Failed to get top performing posts')
        return []
      }

      return data || []
    } catch (error) {
      logger.error({ error }, 'Error getting top performing posts')
      return []
    }
  }

  // Voice Learning Data Methods
  async saveVoiceLearningData(data: {
    content_id: string
    content_type: 'post' | 'comment' | 'article'
    content_text: string
    content_context?: string
    tone_analysis?: any
    writing_style?: any
    vocabulary_patterns?: any
    structural_patterns?: any
    authenticity_score?: number
    authority_score?: number
    vulnerability_score?: number
    engagement_potential?: number
    confidence_score?: number
    content_date?: Date
    post_performance_id?: string
  }): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('voice_learning_data')
        .insert({
          content_id: data.content_id,
          content_type: data.content_type,
          content_text: data.content_text,
          content_context: data.content_context,
          tone_analysis: data.tone_analysis,
          writing_style: data.writing_style,
          vocabulary_patterns: data.vocabulary_patterns,
          structural_patterns: data.structural_patterns,
          authenticity_score: data.authenticity_score,
          authority_score: data.authority_score,
          vulnerability_score: data.vulnerability_score,
          engagement_potential: data.engagement_potential,
          confidence_score: data.confidence_score,
          training_weight: data.content_type === 'post' ? 1.0 : 0.7, // Posts have higher weight
          content_date: data.content_date?.toISOString(),
          post_performance_id: data.post_performance_id ? parseInt(data.post_performance_id) : null
        })

      if (error) {
        logger.error({ error, contentId: data.content_id }, 'Failed to save voice learning data')
        return false
      }

      logger.info({ contentId: data.content_id, contentType: data.content_type }, 'Voice learning data saved successfully')
      return true
    } catch (error) {
      logger.error({ error, contentId: data.content_id }, 'Error saving voice learning data')
      return false
    }
  }

  async getVoiceLearningData(contentType?: string, limit: number = 100): Promise<any[]> {
    try {
      let query = this.client
        .from('voice_learning_data')
        .select('*')
        .order('training_weight', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (contentType) {
        query = query.eq('content_type', contentType)
      }

      const { data, error } = await query

      if (error) {
        logger.error({ error }, 'Failed to get voice learning data')
        return []
      }

      return data || []
    } catch (error) {
      logger.error({ error }, 'Error getting voice learning data')
      return []
    }
  }

  // Content Variants Tracking Methods
  async saveContentVariantTracking(data: {
    job_id: string
    variant_number: number
    topic: string
    research_ideas?: any
    generated_content: string
    agent_name: string
    predicted_engagement?: number
    predicted_confidence?: number
    prediction_factors?: any
    voice_score?: number
    voice_analysis?: any
    historical_context_used?: boolean
    similar_posts_analyzed?: number
  }): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('content_variants_tracking')
        .insert({
          job_id: data.job_id,
          variant_number: data.variant_number,
          topic: data.topic,
          research_ideas: data.research_ideas,
          generated_content: data.generated_content,
          agent_name: data.agent_name,
          predicted_engagement: data.predicted_engagement,
          predicted_confidence: data.predicted_confidence,
          prediction_factors: data.prediction_factors,
          voice_score: data.voice_score,
          voice_analysis: data.voice_analysis,
          historical_context_used: data.historical_context_used || false,
          similar_posts_analyzed: data.similar_posts_analyzed || 0
        })

      if (error) {
        logger.error({ error, jobId: data.job_id, variant: data.variant_number }, 'Failed to save content variant tracking')
        return false
      }

      logger.info({ jobId: data.job_id, variant: data.variant_number }, 'Content variant tracking saved successfully')
      return true
    } catch (error) {
      logger.error({ error, jobId: data.job_id }, 'Error saving content variant tracking')
      return false
    }
  }

  async updateVariantActualPerformance(
    jobId: string,
    variantNumber: number,
    actualPerformanceId: string
  ): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('content_variants_tracking')
        .update({
          was_posted: true,
          posted_at: new Date().toISOString(),
          actual_performance_id: parseInt(actualPerformanceId)
        })
        .eq('job_id', jobId)
        .eq('variant_number', variantNumber)

      if (error) {
        logger.error({ error, jobId, variantNumber }, 'Failed to update variant actual performance')
        return false
      }

      // Trigger prediction accuracy calculation
      await this.client.rpc('update_prediction_accuracy', {
        variant_tracking_id: null, // Will be found by job_id and variant_number
        actual_performance_score: 0 // Will be calculated from performance data
      })

      return true
    } catch (error) {
      logger.error({ error, jobId }, 'Error updating variant actual performance')
      return false
    }
  }

  async getContentVariantsTracking(timeframeDays: number): Promise<any[]> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - timeframeDays)

      const { data, error } = await this.client
        .from('content_variants_tracking')
        .select('*')
        .gte('generation_timestamp', cutoffDate.toISOString())
        .order('generation_timestamp', { ascending: false })

      if (error) {
        logger.error({ error, timeframeDays }, 'Failed to get content variants tracking data')
        return []
      }

      return data || []
    } catch (error) {
      logger.error({ error, timeframeDays }, 'Error getting content variants tracking data')
      return []
    }
  }

  async createContentJob(data: {
    id: string
    queue_job_id?: string
    status: string
    topic: string
    platform: string
    voice_guide_id?: string
    research_data?: any
    progress: number
    error?: string
    created_at: string
    updated_at: string
    completed_at?: string
  }): Promise<ContentJob | null> {
    try {
      const { data: job, error } = await this.client
        .from('content_jobs')
        .insert({
          id: data.id,
          queue_job_id: data.queue_job_id,
          status: data.status,
          topic: data.topic,
          platform: data.platform,
          voice_guide_id: data.voice_guide_id,
          research_data: data.research_data,
          progress: data.progress,
          error: data.error,
          created_at: data.created_at,
          updated_at: data.updated_at,
          completed_at: data.completed_at
        })
        .select()
        .single()

      if (error) {
        logger.error({ error, jobId: data.id }, 'Failed to create content job in database')
        return null
      }

      logger.info({ jobId: job.id, topic: data.topic, type: 'strategic' }, 'Strategic content job created in database')
      return job
    } catch (error) {
      logger.error({ error, jobId: data.id }, 'Error creating content job')
      return null
    }
  }

  // Historical Insights Methods
  async saveHistoricalInsight(data: {
    query_topic: string
    query_hash: string
    related_posts_count: number
    top_performers_count: number
    analysis_timeframe_days?: number
    content_patterns: any
    voice_patterns: any
    performance_patterns: any
    avg_engagement_score: number
    top_performing_score: number
    performance_benchmark: number
    related_post_ids: string[]
    top_performer_ids: string[]
    confidence_level?: number
    expires_at?: Date
  }): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('historical_insights')
        .upsert({
          query_topic: data.query_topic,
          query_hash: data.query_hash,
          related_posts_count: data.related_posts_count,
          top_performers_count: data.top_performers_count,
          analysis_timeframe_days: data.analysis_timeframe_days || 365,
          content_patterns: data.content_patterns,
          voice_patterns: data.voice_patterns,
          performance_patterns: data.performance_patterns,
          avg_engagement_score: data.avg_engagement_score,
          top_performing_score: data.top_performing_score,
          performance_benchmark: data.performance_benchmark,
          related_post_ids: data.related_post_ids,
          top_performer_ids: data.top_performer_ids,
          confidence_level: data.confidence_level || 0.75,
          expires_at: data.expires_at?.toISOString() || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          cache_hit_count: 1,
          last_accessed_at: new Date().toISOString()
        }, {
          onConflict: 'query_hash'
        })

      if (error) {
        logger.error({ error, queryTopic: data.query_topic }, 'Failed to save historical insight')
        return false
      }

      logger.info({ queryTopic: data.query_topic }, 'Historical insight saved successfully')
      return true
    } catch (error) {
      logger.error({ error, queryTopic: data.query_topic }, 'Error saving historical insight')
      return false
    }
  }

  async getHistoricalInsight(queryHash: string): Promise<any | null> {
    try {
      const { data, error } = await this.client
        .from('historical_insights')
        .select('*')
        .eq('query_hash', queryHash)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        return null
      }

      // Update access tracking
      await this.client
        .from('historical_insights')
        .update({
          cache_hit_count: data.cache_hit_count + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', data.id)

      return data
    } catch (error) {
      logger.error({ error, queryHash }, 'Error getting historical insight')
      return null
    }
  }

  // Utility Methods
  async updatePerformanceTiers(): Promise<boolean> {
    try {
      const { error } = await this.client.rpc('update_performance_tiers_analytics')

      if (error) {
        logger.error({ error }, 'Failed to update performance tiers')
        return false
      }

      logger.info('Performance tiers updated successfully')
      return true
    } catch (error) {
      logger.error({ error }, 'Error updating performance tiers')
      return false
    }
  }

  async cleanupExpiredInsights(): Promise<number> {
    try {
      const { data, error } = await this.client.rpc('cleanup_expired_insights')

      if (error) {
        logger.error({ error }, 'Failed to cleanup expired insights')
        return 0
      }

      logger.info({ deletedCount: data }, 'Cleaned up expired insights')
      return data || 0
    } catch (error) {
      logger.error({ error }, 'Error cleaning up expired insights')
      return 0
    }
  }

  // ==========================================
  // PODCAST VOICE LEARNING METHODS
  // ==========================================

  async insertPodcastEpisode(data: {
    title: string
    guest_name?: string | null
    episode_date?: string | null
    duration_minutes?: number
    source_url?: string
    transcript_raw: string
  }): Promise<any> {
    try {
      const { data: episode, error } = await this.client
        .from('podcast_episodes')
        .insert({
          title: data.title,
          guest_name: data.guest_name,
          episode_date: data.episode_date,
          duration_minutes: data.duration_minutes,
          source_url: data.source_url,
          transcript_raw: data.transcript_raw
        })
        .select()
        .single()

      if (error) {
        logger.error({ error, title: data.title }, 'Failed to insert podcast episode')
        return null
      }

      logger.debug({ episodeId: episode.id, title: data.title }, 'Podcast episode inserted')
      return episode
    } catch (error) {
      logger.error({ error, title: data.title }, 'Error inserting podcast episode')
      return null
    }
  }

  async insertTranscriptSegment(data: {
    episode_id: string
    speaker: string
    segment_text: string
    timestamp_start?: string
    timestamp_end?: string
    segment_order: number
    word_count: number
  }): Promise<any> {
    try {
      const { data: segment, error } = await this.client
        .from('transcript_segments')
        .insert(data)
        .select()
        .single()

      if (error) {
        logger.error({ error, episode_id: data.episode_id }, 'Failed to insert transcript segment')
        return null
      }

      return segment
    } catch (error) {
      logger.error({ error, episode_id: data.episode_id }, 'Error inserting transcript segment')
      return null
    }
  }

  async insertVoicePattern(data: {
    segment_id: string
    pattern_type: string
    pattern_text: string
    confidence_score: number
    usage_context: string
    emotional_tone: string
    authenticity_indicators: string[]
  }): Promise<any> {
    try {
      const { data: pattern, error } = await this.client
        .from('voice_patterns')
        .insert(data)
        .select()
        .single()

      if (error) {
        logger.error({ error, segment_id: data.segment_id }, 'Failed to insert voice pattern')
        return null
      }

      return pattern
    } catch (error) {
      logger.error({ error, segment_id: data.segment_id }, 'Error inserting voice pattern')
      return null
    }
  }

  async getAndrewVoicePatterns(patternTypes?: string[]): Promise<any[]> {
    try {
      let query = this.client
        .from('voice_patterns')
        .select(`
          *,
          transcript_segments!inner(
            speaker,
            segment_text,
            podcast_episodes(title, guest_name)
          )
        `)
        .eq('transcript_segments.speaker', 'andrew')

      if (patternTypes && patternTypes.length > 0) {
        query = query.in('pattern_type', patternTypes)
      }

      const { data, error } = await query
        .order('confidence_score', { ascending: false })
        .limit(100)

      if (error) {
        logger.error({ error }, 'Failed to get Andrew voice patterns')
        return []
      }

      return data || []
    } catch (error) {
      logger.error({ error }, 'Error getting Andrew voice patterns')
      return []
    }
  }

  async getAndrewTranscriptSegments(limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('transcript_segments')
        .select(`
          *,
          podcast_episodes(title, guest_name)
        `)
        .eq('speaker', 'andrew')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        logger.error({ error }, 'Failed to get Andrew transcript segments')
        return []
      }

      return data || []
    } catch (error) {
      logger.error({ error }, 'Error getting Andrew transcript segments')
      return []
    }
  }

  async searchAndrewVoiceContent(query: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('transcript_segments')
        .select(`
          *,
          podcast_episodes(title, guest_name),
          voice_patterns(pattern_type, confidence_score, emotional_tone)
        `)
        .eq('speaker', 'andrew')
        .textSearch('segment_text', query)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        logger.error({ error, query }, 'Failed to search Andrew voice content')
        return []
      }

      return data || []
    } catch (error) {
      logger.error({ error, query }, 'Error searching Andrew voice content')
      return []
    }
  }

  // ==========================================
  // PHASE 1: RAG VOICE LEARNING INTEGRATION
  // ==========================================

  // Voice Chunks Methods
  async getVoiceChunk(chunkId: string): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('voice_chunks')
        .select('*')
        .eq('id', chunkId)
        .single()

      if (error) {
        logger.error({ error, chunkId }, 'Failed to get voice chunk')
        return null
      }

      return data
    } catch (error) {
      logger.error({ error, chunkId }, 'Error getting voice chunk')
      return null
    }
  }

  async searchVoiceChunksByContent(
    query: string,
    similarityThreshold: number = 0.70,
    limit: number = 10,
    patternTypes?: string[]
  ): Promise<any[]> {
    try {
      // For text-based search as fallback when embeddings aren't available
      let queryBuilder = this.client
        .from('voice_chunks')
        .select('*')
        .textSearch('content', query)
        .order('confidence_score', { ascending: false })
        .limit(limit)

      if (patternTypes && patternTypes.length > 0) {
        queryBuilder = queryBuilder.in('voice_pattern_type', patternTypes)
      }

      const { data, error } = await queryBuilder

      if (error) {
        logger.error({ error, query }, 'Failed to search voice chunks by content')
        return []
      }

      return data || []
    } catch (error) {
      logger.error({ error, query }, 'Error searching voice chunks by content')
      return []
    }
  }

  async getVoiceChunksByPattern(patternType: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('voice_chunks')
        .select('*')
        .eq('voice_pattern_type', patternType)
        .order('confidence_score', { ascending: false })
        .order('effectiveness_score', { ascending: false })
        .limit(limit)

      if (error) {
        logger.error({ error, patternType }, 'Failed to get voice chunks by pattern')
        return []
      }

      return data || []
    } catch (error) {
      logger.error({ error, patternType }, 'Error getting voice chunks by pattern')
      return []
    }
  }

  async updateVoiceChunkEffectiveness(chunkId: string, effectivenessScore: number): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('voice_chunks')
        .update({
          effectiveness_score: effectivenessScore,
          usage_count: this.client.raw('usage_count + 1'),
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', chunkId)

      if (error) {
        logger.error({ error, chunkId }, 'Failed to update voice chunk effectiveness')
        return false
      }

      return true
    } catch (error) {
      logger.error({ error, chunkId }, 'Error updating voice chunk effectiveness')
      return false
    }
  }

  // Voice Learning Context Methods
  async saveVoiceLearningContext(data: {
    job_id: string
    generation_topic: string
    content_type?: string
    voice_chunks_used: string[]
    chunks_retrieval_query: string
    similarity_threshold?: number
    chunks_retrieved_count: number
    topic_match_score?: number
    voice_authenticity_score?: number
    content_enhancement_applied?: any
  }): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('voice_learning_context')
        .insert({
          job_id: data.job_id,
          generation_topic: data.generation_topic,
          content_type: data.content_type || 'post',
          voice_chunks_used: data.voice_chunks_used,
          chunks_retrieval_query: data.chunks_retrieval_query,
          similarity_threshold: data.similarity_threshold || 0.70,
          chunks_retrieved_count: data.chunks_retrieved_count,
          topic_match_score: data.topic_match_score || 0.00,
          voice_authenticity_score: data.voice_authenticity_score || 0.00,
          content_enhancement_applied: data.content_enhancement_applied || {}
        })

      if (error) {
        logger.error({ error, jobId: data.job_id }, 'Failed to save voice learning context')
        return false
      }

      logger.info({ jobId: data.job_id, chunksUsed: data.voice_chunks_used.length }, 'Voice learning context saved')
      return true
    } catch (error) {
      logger.error({ error, jobId: data.job_id }, 'Error saving voice learning context')
      return false
    }
  }

  async updateVoiceLearningContextPerformance(
    jobId: string,
    contentPerformanceScore: number,
    voiceContributionScore?: number,
    wasEffective?: boolean,
    feedbackNotes?: string
  ): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('voice_learning_context')
        .update({
          content_performance_score: contentPerformanceScore,
          voice_contribution_score: voiceContributionScore,
          was_effective: wasEffective,
          feedback_notes: feedbackNotes,
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId)

      if (error) {
        logger.error({ error, jobId }, 'Failed to update voice learning context performance')
        return false
      }

      return true
    } catch (error) {
      logger.error({ error, jobId }, 'Error updating voice learning context performance')
      return false
    }
  }

  // Voice Pattern Cache Methods
  async getVoicePatternCache(queryHash: string): Promise<any | null> {
    try {
      const { data, error } = await this.client
        .from('voice_pattern_cache')
        .select('*')
        .eq('query_hash', queryHash)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        return null
      }

      // Update access tracking
      await this.client
        .from('voice_pattern_cache')
        .update({
          hit_count: data.hit_count + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', data.id)

      return data
    } catch (error) {
      logger.error({ error, queryHash }, 'Error getting voice pattern cache')
      return null
    }
  }

  async setVoicePatternCache(data: {
    queryHash: string
    queryTopic: string
    patternTypes?: string[]
    matchingChunks: string[]
    patternAnalysis: any
    authenticityBoosts: string[]
    voiceRecommendations: string[]
    chunkCount: number
    avgConfidenceScore: number
    expiresAt?: Date
  }): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('voice_pattern_cache')
        .upsert({
          query_hash: data.queryHash,
          query_topic: data.queryTopic,
          pattern_types: data.patternTypes || [],
          matching_chunks: data.matchingChunks,
          pattern_analysis: data.patternAnalysis,
          authenticity_boosts: data.authenticityBoosts,
          voice_recommendations: data.voiceRecommendations,
          chunk_count: data.chunkCount,
          avg_confidence_score: data.avgConfidenceScore,
          expires_at: data.expiresAt?.toISOString() || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          hit_count: 0,
          last_accessed_at: new Date().toISOString()
        }, {
          onConflict: 'query_hash'
        })

      if (error) {
        logger.error({ error, queryHash: data.queryHash }, 'Failed to set voice pattern cache')
        return false
      }

      return true
    } catch (error) {
      logger.error({ error, queryHash: data.queryHash }, 'Error setting voice pattern cache')
      return false
    }
  }

  async cleanupExpiredVoicePatternCache(): Promise<number> {
    try {
      const { data, error } = await this.client.rpc('cleanup_voice_pattern_cache')

      if (error) {
        logger.error({ error }, 'Failed to cleanup expired voice pattern cache')
        return 0
      }

      logger.info({ deletedCount: data }, 'Cleaned up expired voice pattern cache entries')
      return data || 0
    } catch (error) {
      logger.error({ error }, 'Error cleaning up expired voice pattern cache')
      return 0
    }
  }

  // Voice Learning Analytics Methods
  async getVoiceLearningAnalytics(days: number = 7): Promise<any[]> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await this.client
        .from('voice_learning_analytics')
        .select('*')
        .gte('date_period', startDate.toISOString().split('T')[0])
        .order('date_period', { ascending: false })

      if (error) {
        logger.error({ error, days }, 'Failed to get voice learning analytics')
        return []
      }

      return data || []
    } catch (error) {
      logger.error({ error, days }, 'Error getting voice learning analytics')
      return []
    }
  }

  async updateVoiceLearningAnalytics(targetDate?: Date): Promise<boolean> {
    try {
      const dateToUpdate = targetDate || new Date()
      const { error } = await this.client.rpc('update_voice_learning_analytics', {
        target_date: dateToUpdate.toISOString().split('T')[0]
      })

      if (error) {
        logger.error({ error, targetDate }, 'Failed to update voice learning analytics')
        return false
      }

      logger.info({ targetDate }, 'Voice learning analytics updated')
      return true
    } catch (error) {
      logger.error({ error, targetDate }, 'Error updating voice learning analytics')
      return false
    }
  }

  // Voice System Health Methods
  async getVoiceSystemHealth(): Promise<{
    totalChunks: number
    avgConfidence: number
    avgEffectiveness: number
    patternDistribution: Record<string, number>
    recentUsage: number
    systemStatus: 'healthy' | 'warning' | 'error'
  }> {
    try {
      const { data: chunks } = await this.client
        .from('voice_chunks')
        .select('voice_pattern_type, confidence_score, effectiveness_score, usage_count')

      if (!chunks) {
        return {
          totalChunks: 0,
          avgConfidence: 0,
          avgEffectiveness: 0,
          patternDistribution: {},
          recentUsage: 0,
          systemStatus: 'error'
        }
      }

      const totalChunks = chunks.length
      const avgConfidence = chunks.reduce((sum, c) => sum + c.confidence_score, 0) / totalChunks
      const avgEffectiveness = chunks.reduce((sum, c) => sum + (c.effectiveness_score || 0), 0) / totalChunks
      const recentUsage = chunks.reduce((sum, c) => sum + c.usage_count, 0)

      const patternDistribution = chunks.reduce((acc, chunk) => {
        if (chunk.voice_pattern_type) {
          acc[chunk.voice_pattern_type] = (acc[chunk.voice_pattern_type] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

      const systemStatus = totalChunks > 800 && avgConfidence > 0.6 ? 'healthy' : 
                          totalChunks > 500 && avgConfidence > 0.4 ? 'warning' : 'error'

      return {
        totalChunks,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        avgEffectiveness: Math.round(avgEffectiveness * 100) / 100,
        patternDistribution,
        recentUsage,
        systemStatus
      }
    } catch (error) {
      logger.error({ error }, 'Error getting voice system health')
      return {
        totalChunks: 0,
        avgConfidence: 0,
        avgEffectiveness: 0,
        patternDistribution: {},
        recentUsage: 0,
        systemStatus: 'error'
      }
    }
  }

  // Helper methods for content analysis
  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g
    return content.match(hashtagRegex) || []
  }

  private extractMentions(content: string): string[] {
    const mentionRegex = /@[\w\u0590-\u05ff]+/g
    return content.match(mentionRegex) || []
  }
}

export const supabaseService = new SupabaseService()
export default supabaseService