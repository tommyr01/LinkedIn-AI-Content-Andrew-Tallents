import { NextRequest, NextResponse } from 'next/server'
import { QueueService } from '../../../../lib/queue'
import { SupabaseService } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Getting queue and database job information')

    // Get queue stats
    const queueStats = await QueueService.getQueueStats()
    console.log('Queue stats:', queueStats)

    // Get recent database jobs
    const recentJobs = await SupabaseService.getRecentJobs(5)
    console.log('Recent database jobs:', recentJobs)

    // Test getting a specific job if provided
    const url = new URL(request.url)
    const testJobId = url.searchParams.get('jobId')
    
    let jobTest = null
    if (testJobId) {
      console.log(`Testing job ID: ${testJobId}`)
      
      // Test queue job status
      const queueStatus = await QueueService.getJobStatus(testJobId)
      console.log('Queue status:', queueStatus)
      
      // Test database job
      const dbResult = await SupabaseService.getJobWithDrafts(testJobId)
      console.log('Database result:', dbResult)
      
      jobTest = {
        jobId: testJobId,
        queueStatus,
        databaseJob: dbResult.job,
        drafts: dbResult.drafts
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      queue: queueStats,
      recentDatabaseJobs: recentJobs.map(job => ({
        id: job.id,
        topic: job.topic,
        status: job.status,
        progress: job.progress,
        created_at: job.created_at,
        completed_at: job.completed_at
      })),
      jobTest,
      instructions: {
        testSpecificJob: 'Add ?jobId=YOUR_JOB_ID to test a specific job',
        note: 'Check if queue job IDs match database job IDs'
      }
    })

  } catch (error) {
    console.error('Debug jobs error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to debug jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}