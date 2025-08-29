import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'No admin client' }, { status: 500 })
    }

    console.log('🔧 TESTING queue_job_id search approaches')
    
    // Test different approaches to find the job
    console.log('1️⃣ Testing search for queue_job_id = "4" (string)')
    const { data: jobString, error: errorString } = await supabaseAdmin
      .from('content_jobs')
      .select('*')
      .eq('queue_job_id', '4')
      .maybeSingle()

    console.log('Result string search:', { found: !!jobString, error: errorString?.message })

    console.log('2️⃣ Testing search for queue_job_id = 4 (integer)')
    const { data: jobInt, error: errorInt } = await supabaseAdmin
      .from('content_jobs')
      .select('*')
      .eq('queue_job_id', 4)
      .maybeSingle()

    console.log('Result integer search:', { found: !!jobInt, error: errorInt?.message })

    console.log('3️⃣ Getting all jobs to see queue_job_id format')
    const { data: allJobs, error: allJobsError } = await supabaseAdmin
      .from('content_jobs')
      .select('id, queue_job_id, status, topic')
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('All recent jobs:', allJobs?.map(j => ({
      id: j.id,
      queue_job_id: j.queue_job_id,
      queue_job_id_type: typeof j.queue_job_id,
      status: j.status
    })))

    const foundJob = jobString || jobInt
    let drafts = []
    if (foundJob) {
      console.log('4️⃣ Found job, searching for drafts with job_id:', foundJob.id)
      const { data: foundDrafts } = await supabaseAdmin
        .from('content_drafts')
        .select('id, job_id, agent_name, variant_number')
        .eq('job_id', foundJob.id)
      drafts = foundDrafts || []
      console.log('Found drafts:', drafts.length)
    }

    return NextResponse.json({
      success: true,
      tests: {
        stringSearch: { found: !!jobString, error: errorString?.message },
        integerSearch: { found: !!jobInt, error: errorInt?.message },
        foundJob: foundJob ? {
          id: foundJob.id,
          queue_job_id: foundJob.queue_job_id,
          status: foundJob.status,
          progress: foundJob.progress
        } : null,
        draftsCount: drafts.length
      },
      allJobs: allJobs?.map(j => ({
        id: j.id,
        queue_job_id: j.queue_job_id,
        queue_job_id_type: typeof j.queue_job_id,
        status: j.status
      })) || []
    })

  } catch (error) {
    console.error('Fix test error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test fix',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}