import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'No admin client' }, { status: 500 })
    }

    // Check for duplicate queue_job_id values
    console.log('🔍 Checking for duplicate queue_job_id values...')
    
    const { data: allJobs, error } = await supabaseAdmin
      .from('content_jobs')
      .select('id, queue_job_id, status, created_at, topic')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by queue_job_id to find duplicates
    const queueIdGroups: { [key: string]: any[] } = {}
    allJobs?.forEach(job => {
      const queueId = job.queue_job_id || 'null'
      if (!queueIdGroups[queueId]) {
        queueIdGroups[queueId] = []
      }
      queueIdGroups[queueId].push(job)
    })

    // Find duplicates
    const duplicates = Object.entries(queueIdGroups)
      .filter(([queueId, jobs]) => jobs.length > 1)
      .map(([queueId, jobs]) => ({
        queue_job_id: queueId,
        count: jobs.length,
        jobs: jobs.map(j => ({
          id: j.id,
          status: j.status,
          created_at: j.created_at,
          topic: j.topic
        }))
      }))

    // Specifically check queue_job_id "4"
    const queueId4Jobs = queueIdGroups['4'] || []
    console.log('Jobs with queue_job_id "4":', queueId4Jobs)

    // Test the most recent job with queue_job_id "4"
    let testResult = null
    if (queueId4Jobs.length > 0) {
      const mostRecentJob = queueId4Jobs.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]

      console.log('Testing most recent job with queue_job_id "4":', mostRecentJob.id)
      
      // Check for drafts
      const { data: drafts } = await supabaseAdmin
        .from('content_drafts')
        .select('id, job_id, agent_name, variant_number')
        .eq('job_id', mostRecentJob.id)

      testResult = {
        job: mostRecentJob,
        drafts: drafts || [],
        draftsCount: (drafts || []).length
      }
    }

    return NextResponse.json({
      success: true,
      totalJobs: allJobs?.length || 0,
      duplicateQueueIds: duplicates,
      queueId4Analysis: {
        jobsWithQueueId4: queueId4Jobs.length,
        jobs: queueId4Jobs,
        testResult
      }
    })

  } catch (error) {
    console.error('Debug queue IDs error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to debug queue IDs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}