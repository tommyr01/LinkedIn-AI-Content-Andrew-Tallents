import { NextRequest, NextResponse } from 'next/server'
import { QueueService } from '../../../../lib/queue'
import { SupabaseService } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('📈 Getting queue and database stats')

    // Get queue statistics
    const queueStats = await QueueService.getQueueStats()
    
    // Get recent jobs from database
    const recentJobs = await SupabaseService.getRecentJobs(10)

    // Calculate database stats
    const dbStats = {
      total: recentJobs.length,
      completed: recentJobs.filter(job => job.status === 'completed').length,
      failed: recentJobs.filter(job => job.status === 'failed').length,
      processing: recentJobs.filter(job => job.status === 'processing').length,
      pending: recentJobs.filter(job => job.status === 'pending').length
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      queue: queueStats,
      database: dbStats,
      recentJobs: recentJobs.slice(0, 5).map(job => ({
        id: job.id,
        topic: job.topic.substring(0, 50) + '...',
        status: job.status,
        progress: job.progress,
        platform: job.platform,
        created_at: job.created_at,
        completed_at: job.completed_at
      }))
    })

  } catch (error) {
    console.error('Error getting queue stats:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get queue statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}