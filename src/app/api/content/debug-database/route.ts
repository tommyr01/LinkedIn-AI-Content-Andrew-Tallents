import { NextRequest, NextResponse } from 'next/server'
import { SupabaseService, supabaseAdmin } from '../../../../lib/supabase'
import { supabase } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Inspecting database contents')

    // Get recent jobs
    const recentJobs = await SupabaseService.getRecentJobs(10)
    console.log('Recent jobs:', recentJobs.length)

    // Try to get drafts directly from content_drafts table using admin client
    const client = supabaseAdmin || supabase
    const { data: allDrafts, error: draftsError } = await client
      .from('content_drafts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('Direct drafts query result:', allDrafts?.length, 'Error:', draftsError)

    // Check if queue_job_id column exists by trying to select it
    const { data: jobsWithQueueId, error: queueIdError } = await client
      .from('content_jobs')
      .select('id, topic, status, queue_job_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('Jobs with queue_job_id query result:', jobsWithQueueId?.length, 'Error:', queueIdError)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        recentJobs: recentJobs.map(job => ({
          id: job.id,
          topic: job.topic,
          status: job.status,
          progress: job.progress,
          queue_job_id: (job as any).queue_job_id,
          created_at: job.created_at,
          completed_at: job.completed_at
        })),
        directDraftsQuery: {
          count: allDrafts?.length || 0,
          error: draftsError?.message,
          sample: allDrafts?.slice(0, 3).map(draft => ({
            id: draft.id,
            job_id: draft.job_id,
            agent_name: draft.agent_name,
            variant_number: draft.variant_number,
            created_at: draft.created_at
          }))
        },
        queueJobIdColumn: {
          exists: !queueIdError,
          error: queueIdError?.message,
          sample: jobsWithQueueId?.map(job => ({
            id: job.id,
            topic: job.topic,
            status: job.status,
            queue_job_id: job.queue_job_id,
            created_at: job.created_at
          }))
        }
      }
    })

  } catch (error) {
    console.error('Database debug error:', error)
    return NextResponse.json(
      { 
        error: 'Database debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}