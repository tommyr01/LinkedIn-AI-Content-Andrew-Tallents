import { NextRequest, NextResponse } from 'next/server'
import { QueueService } from '../../../../lib/queue'
import { SupabaseService } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing complete job creation and retrieval flow')

    // Step 1: Create a test job in the queue
    console.log('Step 1: Creating job in queue...')
    const result = await QueueService.addContentGenerationJob({
      topic: 'Test async content generation flow',
      platform: 'linkedin',
      postType: 'Test',
      tone: 'professional'
    })

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create queue job',
        details: result.error
      }, { status: 500 })
    }

    const queueJobId = result.jobId
    console.log('✅ Queue job created:', queueJobId)

    // Step 2: Wait a moment for the worker to potentially pick it up
    console.log('Step 2: Waiting 5 seconds for worker to process...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Step 3: Check queue status
    console.log('Step 3: Checking queue status...')
    const queueStatus = await QueueService.getJobStatus(queueJobId)
    console.log('Queue status:', queueStatus)

    // Step 4: Try to find database job by queue job ID
    console.log('Step 4: Looking for database job by queue job ID...')
    const { job: dbJob, drafts } = await SupabaseService.getJobWithDrafts(queueJobId)
    console.log('Database job found:', !!dbJob, dbJob?.status)
    console.log('Drafts found:', drafts.length)

    // Step 5: Get recent jobs to see what's in the database
    console.log('Step 5: Getting recent database jobs...')
    const recentJobs = await SupabaseService.getRecentJobs(5)
    console.log('Recent jobs count:', recentJobs.length)

    return NextResponse.json({
      success: true,
      test: {
        queueJobId,
        queueStatus: queueStatus ? {
          state: queueStatus.state,
          progress: queueStatus.progress,
          data: queueStatus.data
        } : null,
        databaseJob: dbJob ? {
          id: dbJob.id,
          queue_job_id: (dbJob as any).queue_job_id,
          status: dbJob.status,
          progress: dbJob.progress,
          topic: dbJob.topic
        } : null,
        draftsCount: drafts.length,
        recentJobsCount: recentJobs.length,
        recentJobs: recentJobs.slice(0, 3).map(job => ({
          id: job.id,
          queue_job_id: (job as any).queue_job_id,
          status: job.status,
          topic: job.topic.substring(0, 50),
          created_at: job.created_at
        }))
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Test job flow error:', error)
    return NextResponse.json(
      { 
        error: 'Test job flow failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Just get current state without creating new jobs
    console.log('🔍 Getting current job state...')

    // Get queue stats
    const queueStats = await QueueService.getQueueStats()
    
    // Get recent database jobs
    const recentJobs = await SupabaseService.getRecentJobs(10)

    return NextResponse.json({
      success: true,
      currentState: {
        queue: queueStats,
        recentDatabaseJobs: recentJobs.map(job => ({
          id: job.id,
          queue_job_id: (job as any).queue_job_id,
          status: job.status,
          progress: job.progress,
          topic: job.topic.substring(0, 50),
          created_at: job.created_at,
          completed_at: job.completed_at
        }))
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Get job state error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get job state',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}