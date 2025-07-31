import { createClient } from '@supabase/supabase-js'
import { appConfig } from '../config'
import logger from '../lib/logger'
import type { ContentJob, ContentDraft, ResearchCache, AIAgentResult } from '../types'

export class SupabaseService {
  private client
  
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
  }): Promise<ContentJob | null> {
    try {
      const { data: job, error } = await this.client
        .from('content_jobs')
        .insert({
          topic: data.topic,
          platform: data.platform,
          voice_guide_id: data.voice_guide_id,
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
}

export const supabaseService = new SupabaseService()
export default supabaseService