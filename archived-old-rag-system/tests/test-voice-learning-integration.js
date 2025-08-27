/**
 * Test script to verify voice learning integration with content generation
 * This tests the complete pipeline from API to worker processing
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function testVoiceLearningIntegration() {
  console.log('🧪 Starting Voice Learning Integration Test')
  console.log('=====================================')
  
  try {
    // Step 1: Test voice learning insights endpoint
    console.log('1️⃣ Testing voice learning insights endpoint...')
    const voiceResponse = await fetch(`${BASE_URL}/api/test-voice-integration`)
    const voiceTest = await voiceResponse.json()
    
    if (!voiceTest.success) {
      throw new Error(`Voice learning test failed: ${voiceTest.error}`)
    }
    
    console.log('✅ Voice learning insights working:', {
      dataPoints: voiceTest.validation.dataPoints,
      confidence: voiceTest.validation.confidence,
      dominantTone: voiceTest.validation.dominantTone,
      hasGuidelines: voiceTest.validation.hasGenerationGuidelines
    })
    
    // Step 2: Test content generation with voice learning enabled
    console.log('\\n2️⃣ Testing content generation with voice learning...')
    const contentResponse = await fetch(`${BASE_URL}/api/content/generate-async`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Leadership challenges for UK CEOs in 2024',
        platform: 'linkedin',
        postType: 'Thought Leadership',
        tone: 'professional',
        useVoiceLearning: true, // ← THIS IS THE KEY INTEGRATION POINT
        userId: 'voice-learning-test'
      })
    })
    
    if (!contentResponse.ok) {
      throw new Error(`Content generation failed: ${contentResponse.status}`)
    }
    
    const contentResult = await contentResponse.json()
    console.log('✅ Content generation job created with voice learning:', {
      jobId: contentResult.jobId,
      queueJobId: contentResult.queueJobId,
      status: contentResult.status,
      foundDatabaseJob: contentResult.debug?.foundDatabaseJob
    })
    
    // Step 3: Wait and check job status
    console.log('\\n3️⃣ Waiting for job processing...')
    let attempts = 0
    const maxAttempts = 10
    let finalJobStatus = null
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 6000)) // Wait 6 seconds
      attempts++
      
      try {
        const statusResponse = await fetch(`${BASE_URL}/api/content/status/${contentResult.jobId}`)
        const statusResult = await statusResponse.json()
        
        console.log(`📊 Job status (attempt ${attempts}/${maxAttempts}):`, {
          status: statusResult.job?.status,
          progress: statusResult.job?.progress,
          draftsCount: statusResult.drafts?.length || 0
        })
        
        if (statusResult.job?.status === 'completed') {
          finalJobStatus = statusResult
          break
        }
        
        if (statusResult.job?.status === 'failed') {
          console.error('❌ Job failed:', statusResult.job.error)
          break
        }
      } catch (statusError) {
        console.warn(`⚠️ Status check ${attempts} failed:`, statusError.message)
      }
    }
    
    // Step 4: Analyze results
    if (finalJobStatus && finalJobStatus.job?.status === 'completed') {
      console.log('\\n4️⃣ Analyzing voice learning integration results...')
      const drafts = finalJobStatus.drafts || []
      
      console.log('✅ Content generation completed with voice learning!')
      console.log(`📝 Generated ${drafts.length} drafts`)
      
      // Check if drafts show evidence of voice learning integration
      const draftAnalysis = drafts.map(draft => ({
        agent: draft.agent_name,
        voiceScore: draft.content?.estimated_voice_score,
        hasAuthenticScore: !!draft.content?.estimated_voice_score,
        contentLength: draft.content?.body?.length || 0,
        approach: draft.content?.approach
      }))
      
      console.log('📊 Draft analysis:', draftAnalysis)
      
      // Success criteria
      const successCriteria = {
        allDraftsGenerated: drafts.length >= 3,
        allHaveVoiceScores: draftAnalysis.every(d => d.hasAuthenticScore),
        averageVoiceScore: Math.round(draftAnalysis.reduce((sum, d) => sum + (d.voiceScore || 0), 0) / draftAnalysis.length),
        uniqueApproaches: new Set(draftAnalysis.map(d => d.approach)).size
      }
      
      console.log('\\n🎯 SUCCESS CRITERIA:')
      console.log('✅ All drafts generated:', successCriteria.allDraftsGenerated)
      console.log('✅ All have voice scores:', successCriteria.allHaveVoiceScores)
      console.log('📊 Average voice score:', successCriteria.averageVoiceScore + '%')
      console.log('🎨 Unique approaches:', successCriteria.uniqueApproaches)
      
      if (successCriteria.averageVoiceScore >= 75) {
        console.log('\\n🎉 VOICE LEARNING INTEGRATION SUCCESSFUL!')
        console.log('The generated content reflects learned voice patterns with high authenticity scores.')
        return true
      } else {
        console.log('\\n⚠️ Voice learning integration partially successful but voice scores are low.')
        console.log('Generated content may not fully reflect learned patterns.')
        return false
      }
      
    } else {
      console.log('\\n❌ Job did not complete successfully within timeout period')
      return false
    }
    
  } catch (error) {
    console.error('❌ Voice learning integration test failed:', error.message)
    return false
  }
}

// Run the test
if (require.main === module) {
  testVoiceLearningIntegration()
    .then(success => {
      console.log('\\n=====================================')
      console.log(success ? '🎉 TEST PASSED' : '❌ TEST FAILED')
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Test execution error:', error)
      process.exit(1)
    })
}

module.exports = { testVoiceLearningIntegration }