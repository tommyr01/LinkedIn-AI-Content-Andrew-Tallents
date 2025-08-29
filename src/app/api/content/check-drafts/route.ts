import { NextRequest, NextResponse } from 'next/server'
import { SupabaseService } from '../../../../lib/supabase'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const jobId = url.searchParams.get('jobId') || 'b16e9b09-754d-4a6f-b289-bbff8f4e7bce'
    
    console.log('🔍 DIRECT DATABASE CHECK for job:', jobId)
    
    const client = supabaseAdmin
    if (!client) {
      return NextResponse.json({ error: 'No admin client available' }, { status: 500 })
    }

    // Check job exists
    const { data: job, error: jobError } = await client
      .from('content_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    console.log('Job found:', { id: job?.id, status: job?.status, queue_job_id: job?.queue_job_id })

    // Check all drafts in the database
    const { data: allDrafts, error: allDraftsError } = await client
      .from('content_drafts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    console.log('Total drafts in database:', allDrafts?.length || 0)
    console.log('Sample drafts:', allDrafts?.slice(0, 3).map(d => ({ 
      id: d.id, 
      job_id: d.job_id, 
      agent_name: d.agent_name,
      created_at: d.created_at 
    })))

    // Check drafts for this specific job
    const { data: jobDrafts, error: jobDraftsError } = await client
      .from('content_drafts')
      .select('*')
      .eq('job_id', jobId)

    console.log('Drafts for job', jobId, ':', jobDrafts?.length || 0)

    // Check if any drafts exist for different job_id patterns
    const queue_job_id = job?.queue_job_id
    let queueJobDrafts = []
    if (queue_job_id) {
      const { data: queueDrafts } = await client
        .from('content_drafts')
        .select('*')
        .eq('job_id', queue_job_id)
      queueJobDrafts = queueDrafts || []
      console.log('Drafts for queue_job_id', queue_job_id, ':', queueJobDrafts.length)
    }

    // Check if any drafts exist matching the string representation
    const { data: stringJobDrafts } = await client
      .from('content_drafts')
      .select('*')
      .eq('job_id', jobId.toString())

    console.log('Drafts for string job_id:', stringJobDrafts?.length || 0)

    return NextResponse.json({
      success: true,
      jobId,
      job: job ? {
        id: job.id,
        queue_job_id: job.queue_job_id,
        status: job.status,
        progress: job.progress
      } : null,
      draftsCheck: {
        totalInDatabase: allDrafts?.length || 0,
        forThisJobId: jobDrafts?.length || 0,
        forQueueJobId: queueJobDrafts.length,
        forStringJobId: stringJobDrafts?.length || 0
      },
      sampleDrafts: allDrafts?.slice(0, 5).map(d => ({
        id: d.id,
        job_id: d.job_id,
        agent_name: d.agent_name,
        variant_number: d.variant_number,
        created_at: d.created_at
      })) || [],
      errors: {
        job: jobError?.message,
        allDrafts: allDraftsError?.message,
        jobDrafts: jobDraftsError?.message
      }
    })

  } catch (error) {
    console.error('Check drafts error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check drafts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}