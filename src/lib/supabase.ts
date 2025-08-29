import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://alfsmmquyaygykvfcxbb.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZnNtbXF1eWF5Z3lrdmZjeGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NTIzMzcsImV4cCI6MjA2OTUyODMzN30.0t4rWhtVHOdypKnYMo4f-0XMl6nq7LZlABLPYLmWmlo'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client for frontend (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null

export interface ContentJob {
  id: string
  queue_job_id?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  topic: string
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram'
  voice_guide_id?: string
  research_data?: any
  progress: number
  error?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface ContentDraft {
  id: string
  job_id: string
  variant_number: number
  agent_name: string
  content: {
    title?: string
    body: string
    hashtags: string[]
    estimated_voice_score?: number
    approach?: string
    performance_prediction?: {
      predictedEngagement: number
      confidenceScore: number
      strengthFactors: string[]
      improvementSuggestions: string[]
      similarPostPerformance: {
        avgEngagement: number
        topPerformance: number
        similarityScore: number
      }
    }
  }
  metadata: {
    token_count?: number
    generation_time_ms?: number
    model_used?: string
    research_sources?: string[]
    historical_context_used?: boolean
    similar_posts_analyzed?: number
    top_performer_score?: number
    predicted_engagement?: number
    prediction_confidence?: number
  }
  score?: number
  created_at: string
}

export class SupabaseService {
  static async getJob(jobId: string): Promise<ContentJob | null> {
    try {
      // Use admin client for server-side operations to bypass RLS
      const client = supabaseAdmin || supabase
      const { data, error } = await client
        .from('content_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (error) {
        console.error('Error fetching job:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching job:', error)
      return null
    }
  }

  static async getJobWithDrafts(jobId: string): Promise<{
    job: ContentJob | null
    drafts: ContentDraft[]
  }> {
    try {
      // Use admin client for server-side operations to bypass RLS
      const client = supabaseAdmin || supabase
      
      console.log('🔍 DEBUGGING getJobWithDrafts for jobId:', jobId)
      
      // Try to find job by queue_job_id first (for queue job IDs like "3", "4", etc.)
      // Use limit(1) and order to handle duplicate queue_job_ids by getting the most recent
      let { data: jobs, error: jobError } = await client
        .from('content_jobs')
        .select('*')
        .eq('queue_job_id', jobId)
        .order('created_at', { ascending: false }) // Get most recent if multiple
        .limit(1)
      
      let job = jobs && jobs.length > 0 ? jobs[0] : null

      console.log('🔍 Job search by queue_job_id ("%s") result:', jobId, { found: !!job, error: jobError?.message })

      // If not found by queue_job_id, try by database ID (for UUID job IDs)
      if (!job && jobError) {
        console.log('🔍 Trying job search by database ID...')
        const result = await client
          .from('content_jobs')
          .select('*')
          .eq('id', jobId)
          .maybeSingle()
        job = result.data
        console.log('🔍 Job search by database id result:', { found: !!job, error: result.error?.message })
      }

      if (!job) {
        console.log('🔍 No job found for jobId:', jobId)
        return {
          job: null,
          drafts: []
        }
      }

      console.log('🔍 Found job:', { 
        database_id: job.id, 
        queue_job_id: job.queue_job_id, 
        status: job.status, 
        progress: job.progress 
      })

      // Search for drafts - they are linked to the database job ID, not queue job ID
      console.log('🔍 Searching for drafts with job_id:', job.id)
      const { data: drafts, error: draftsError } = await client
        .from('content_drafts')
        .select('*')
        .eq('job_id', job.id) // Use the database job ID for drafts
        .order('variant_number')

      console.log('🔍 Drafts search result:', { count: drafts?.length || 0, error: draftsError?.message })

      // Also try a broader search to see what drafts exist
      const { data: allRecentDrafts } = await client
        .from('content_drafts')
        .select('id, job_id, agent_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      
      console.log('🔍 Recent drafts in database:', allRecentDrafts?.map(d => ({ id: d.id, job_id: d.job_id, agent_name: d.agent_name })))

      return {
        job: job || null,
        drafts: drafts || []
      }
    } catch (error) {
      console.error('Error fetching job with drafts:', error)
      return {
        job: null,
        drafts: []
      }
    }
  }

  static async getRecentJobs(limit: number = 10): Promise<ContentJob[]> {
    try {
      // Use admin client for server-side operations to bypass RLS
      const client = supabaseAdmin || supabase
      const { data, error } = await client
        .from('content_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent jobs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching recent jobs:', error)
      return []
    }
  }

  static subscribeToJobUpdates(jobId: string, callback: (job: ContentJob) => void) {
    return supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'content_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          callback(payload.new as ContentJob)
        }
      )
      .subscribe()
  }

  static subscribeToJobDrafts(jobId: string, callback: (draft: ContentDraft) => void) {
    return supabase
      .channel(`drafts-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content_drafts',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          callback(payload.new as ContentDraft)
        }
      )
      .subscribe()
  }
}

export default SupabaseService