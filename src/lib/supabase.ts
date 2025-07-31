import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://alfsmmquyaygykvfcxbb.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZnNtbXF1eWF5Z3lrdmZjeGJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NTIzMzcsImV4cCI6MjA2OTUyODMzN30.0t4rWhtVHOdypKnYMo4f-0XMl6nq7LZlABLPYLmWmlo'

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
  }
  metadata: {
    token_count?: number
    generation_time_ms?: number
    model_used?: string
    research_sources?: string[]
  }
  score?: number
  created_at: string
}

export class SupabaseService {
  static async getJob(jobId: string): Promise<ContentJob | null> {
    try {
      const { data, error } = await supabase
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
      // First try to find by queue_job_id, then by regular id
      let { data: job } = await supabase
        .from('content_jobs')
        .select('*')
        .eq('queue_job_id', jobId)
        .single()

      // If not found by queue_job_id, try by regular id
      if (!job) {
        const result = await supabase
          .from('content_jobs')
          .select('*')
          .eq('id', jobId)
          .single()
        job = result.data
      }

      if (!job) {
        return {
          job: null,
          drafts: []
        }
      }

      const { data: drafts } = await supabase
        .from('content_drafts')
        .select('*')
        .eq('job_id', job.id) // Use the database job ID for drafts
        .order('variant_number')

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
      const { data, error } = await supabase
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