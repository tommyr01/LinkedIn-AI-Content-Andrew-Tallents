import { NextRequest, NextResponse } from 'next/server'
import { QueueService } from '../../../lib/queue'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('🧪 Testing voice learning integration...')
    
    // Test 1: Create a job with voice learning enabled
    const testJobResult = await QueueService.addContentGenerationJob({
      topic: 'Voice Learning Integration Test',
      platform: 'linkedin',
      voiceGuidelines: 'Test guidelines',
      postType: 'Thought Leadership',
      tone: 'professional',
      userId: 'test-voice-integration',
      useVoiceLearning: true, // ← KEY TEST POINT
      voiceLearningData: { test: true },
      strategicVariants: [],
      contentIntent: 'Test voice learning integration'
    })
    
    console.log('✅ Voice learning job created:', testJobResult)
    
    return NextResponse.json({
      success: true,
      message: 'Voice learning integration test completed',
      testResults: {
        jobCreated: testJobResult.success,
        jobId: testJobResult.jobId,
        voiceLearningEnabled: true,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Voice learning integration test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Voice learning integration test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}