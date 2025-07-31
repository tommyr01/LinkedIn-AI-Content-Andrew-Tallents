import { NextRequest, NextResponse } from 'next/server'
import { QueueService } from '../../../../../lib/queue'
import { SupabaseService } from '../../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    console.log('📊 Getting job status for:', jobId)

    // Get queue job status
    const queueStatus = await QueueService.getJobStatus(jobId)
    console.log('Queue status:', queueStatus ? 'found' : 'not found', queueStatus?.state)
    
    // Get database job with drafts (now searches by queue_job_id first)
    const { job: dbJob, drafts } = await SupabaseService.getJobWithDrafts(jobId)
    console.log('Database job search result:')
    console.log('- Job found:', !!dbJob)
    console.log('- Job status:', dbJob?.status)
    console.log('- Job ID:', dbJob?.id)
    console.log('- Queue Job ID:', (dbJob as any)?.queue_job_id)
    console.log('- Drafts count:', drafts.length)
    
    if (drafts.length > 0) {
      console.log('- Sample draft:', {
        id: drafts[0].id,
        job_id: drafts[0].job_id,
        agent_name: drafts[0].agent_name,
        variant_number: drafts[0].variant_number
      })
    } else {
      console.log('- No drafts found. Investigating...')
      
      // Additional debugging: try to find recent jobs to see what's in the database
      const recentJobs = await SupabaseService.getRecentJobs(5)
      console.log('- Recent jobs in database:', recentJobs.length)
      recentJobs.forEach((job, index) => {
        console.log(`  ${index + 1}. Job ${job.id}: ${job.status} - ${job.topic} (queue_id: ${(job as any).queue_job_id})`)
      })
    }

    // If job exists in database, use that as primary source
    if (dbJob) {
      return NextResponse.json({
        success: true,
        job: {
          id: dbJob.id,
          queueId: jobId,
          status: dbJob.status,
          progress: dbJob.progress,
          topic: dbJob.topic,
          platform: dbJob.platform,
          error: dbJob.error,
          created_at: dbJob.created_at,
          updated_at: dbJob.updated_at,
          completed_at: dbJob.completed_at,
          research_data: dbJob.research_data
        },
        drafts: drafts.map(draft => ({
          id: draft.id,
          variant_number: draft.variant_number,
          agent_name: draft.agent_name,
          content: draft.content,
          metadata: draft.metadata,
          score: draft.score,
          created_at: draft.created_at
        })),
        queue: queueStatus ? {
          state: queueStatus.state,
          progress: queueStatus.progress,
          processedOn: queueStatus.processedOn,
          finishedOn: queueStatus.finishedOn
        } : null
      })
    }

    // Fall back to queue status only
    if (queueStatus) {
      return NextResponse.json({
        success: true,
        job: {
          queueId: jobId,
          status: queueStatus.state === 'completed' ? 'completed' :
                  queueStatus.state === 'failed' ? 'failed' :
                  queueStatus.state === 'active' ? 'processing' : 'pending',
          progress: queueStatus.progress || 0,
          topic: queueStatus.data?.topic,
          platform: queueStatus.data?.platform,
          error: queueStatus.failedReason,
          processedOn: queueStatus.processedOn,
          finishedOn: queueStatus.finishedOn
        },
        drafts: [],
        queue: {
          state: queueStatus.state,
          progress: queueStatus.progress,
          processedOn: queueStatus.processedOn,
          finishedOn: queueStatus.finishedOn
        }
      })
    }

    // Job not found
    return NextResponse.json(
      { 
        success: false,
        error: 'Job not found',
        jobId 
      },
      { status: 404 }
    )

  } catch (error) {
    console.error('Error getting job status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}