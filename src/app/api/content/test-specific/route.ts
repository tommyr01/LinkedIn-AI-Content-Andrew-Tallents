import { NextRequest, NextResponse } from 'next/server'
import { SupabaseService } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 TESTING getJobWithDrafts directly')
    
    // Test the specific queue job ID that should have drafts
    const result = await SupabaseService.getJobWithDrafts('4')
    
    console.log('🧪 Test result:', {
      job: result.job ? {
        id: result.job.id,
        queue_job_id: (result.job as any).queue_job_id,
        status: result.job.status,
        progress: result.job.progress
      } : null,
      draftsCount: result.drafts.length,
      drafts: result.drafts.map(d => ({
        id: d.id,
        job_id: d.job_id,
        agent_name: d.agent_name,
        variant_number: d.variant_number
      }))
    })

    return NextResponse.json({
      success: true,
      testJobId: '4',
      result: {
        job: result.job,
        draftsCount: result.drafts.length,
        sampleDrafts: result.drafts.slice(0, 2).map(d => ({
          id: d.id,
          job_id: d.job_id,
          agent_name: d.agent_name,
          variant_number: d.variant_number,
          content_preview: d.content?.body?.substring(0, 100) + '...'
        }))
      }
    })

  } catch (error) {
    console.error('Test specific error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test specific job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}