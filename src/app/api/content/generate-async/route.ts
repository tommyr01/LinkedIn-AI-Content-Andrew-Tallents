import { NextRequest, NextResponse } from 'next/server'
import { QueueService } from '../../../../lib/queue'
import { SupabaseService } from '../../../../lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      )
    }

    const {
      topic,
      platform = 'linkedin',
      voiceGuidelines,
      postType = 'Thought Leadership',
      tone = 'professional',
      userId
    } = body

    // Validate platform
    const validPlatforms = ['linkedin', 'twitter', 'facebook', 'instagram']
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be one of: ' + validPlatforms.join(', ') },
        { status: 400 }
      )
    }

    console.log('🚀 Creating async content generation job:', {
      topic: topic.substring(0, 50) + '...',
      platform,
      postType,
      hasVoiceGuidelines: !!voiceGuidelines
    })

    // Add job to queue
    const result = await QueueService.addContentGenerationJob({
      topic,
      platform,
      voiceGuidelines,
      postType,
      tone,
      userId
    })

    if (!result.success) {
      console.error('Failed to add job to queue:', result.error)
      return NextResponse.json(
        { error: 'Failed to create content generation job' },
        { status: 500 }
      )
    }

    console.log('✅ Job added to queue successfully:', result.jobId)

    // Try to get the database job that was created by the worker with retry logic
    let dbJob = null
    let attempts = 0
    const maxAttempts = 3
    
    while (!dbJob && attempts < maxAttempts) {
      attempts++
      console.log(`Attempt ${attempts}/${maxAttempts}: Looking for database job...`)
      
      // Wait before each attempt (longer for later attempts)
      await new Promise(resolve => setTimeout(resolve, attempts * 2000))
      
      try {
        const jobData = await SupabaseService.getJobWithDrafts(result.jobId!)
        if (jobData.job) {
          dbJob = jobData.job
          console.log(`✅ Found database job on attempt ${attempts}:`, dbJob.id)
          break
        }
      } catch (error) {
        console.log(`❌ Attempt ${attempts} failed:`, error)
      }
    }
    
    if (!dbJob) {
      console.log('⚠️ Could not find database job after all attempts, using queue job ID only')
    }
    
    return NextResponse.json({
      success: true,
      queueJobId: result.jobId,
      jobId: dbJob?.id || result.jobId, // Use database job ID if available, fallback to queue ID
      databaseJobId: dbJob?.id,
      status: 'pending',
      message: 'Content generation job created successfully',
      estimatedTimeMs: 60000, // 60 seconds estimated
      debug: {
        foundDatabaseJob: !!dbJob,
        databaseJobStatus: dbJob?.status,
        attemptsUsed: attempts,
        timing: `Waited ${attempts * 2} seconds total`
      }
    })

  } catch (error) {
    console.error('Content generation job creation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create content generation job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}