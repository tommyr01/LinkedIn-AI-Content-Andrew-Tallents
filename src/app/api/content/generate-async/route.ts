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
      userId,
      useVoiceLearning = true, // RAG enabled by default for authentic voice
      strategicVariants = [],
      contentIntent
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
      hasVoiceGuidelines: !!voiceGuidelines,
      useVoiceLearning,
      strategicVariants,
      contentIntent
    })

    // Prepare voice learning data flag for worker
    let voiceLearningData = null
    if (useVoiceLearning) {
      console.log('🎯 Voice learning enabled - will be processed by worker')
      // Pass the flag to the worker - the worker will handle voice learning data generation
      voiceLearningData = { enabled: true, timestamp: new Date().toISOString() }
    }

    // Add job to queue
    const result = await QueueService.addContentGenerationJob({
      topic,
      platform,
      voiceGuidelines,
      postType,
      tone,
      userId,
      useVoiceLearning,
      voiceLearningData,
      strategicVariants,
      contentIntent
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
    const maxAttempts = 5 // Increased attempts
    
    // Give the worker more time to create the database job
    console.log('⏳ Giving worker time to create database job...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    while (!dbJob && attempts < maxAttempts) {
      attempts++
      console.log(`Attempt ${attempts}/${maxAttempts}: Looking for database job with queue_job_id=${result.jobId}`)
      
      try {
        const jobData = await SupabaseService.getJobWithDrafts(result.jobId!)
        if (jobData.job) {
          dbJob = jobData.job
          console.log(`✅ Found database job on attempt ${attempts}:`, dbJob.id, 'queue_job_id:', (dbJob as any).queue_job_id)
          break
        } else {
          console.log(`❌ No database job found on attempt ${attempts}`)
        }
      } catch (error) {
        console.log(`❌ Attempt ${attempts} failed:`, error)
      }
      
      // Wait before next attempt (longer for later attempts)
      if (attempts < maxAttempts) {
        const waitTime = attempts * 3000 // 3s, 6s, 9s, 12s
        console.log(`⏳ Waiting ${waitTime}ms before next attempt...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
    if (!dbJob) {
      console.log('⚠️ Could not find database job after all attempts, using queue job ID only')
      console.log('💡 The job will still process, but frontend will rely on API polling to get results')
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