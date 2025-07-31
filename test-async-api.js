// Simple test script to test the async content generation API
const testAsyncGeneration = async () => {
  try {
    console.log('🧪 Testing async content generation API...')

    const response = await fetch('http://localhost:3000/api/content/generate-async', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: 'Leadership challenges in 2024',
        platform: 'linkedin',
        postType: 'Thought Leadership',
        tone: 'professional',
        voiceGuidelines: 'Professional yet approachable, use personal anecdotes, focus on leadership development'
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    console.log('✅ Job created successfully:', result)

    if (result.jobId) {
      console.log('🔍 Checking job status...')
      
      // Check job status
      const statusResponse = await fetch(`http://localhost:3000/api/content/job/${result.jobId}`)
      const status = await statusResponse.json()
      console.log('📊 Job status:', status)

      // Check queue stats
      const statsResponse = await fetch('http://localhost:3000/api/content/queue-stats')
      const stats = await statsResponse.json()
      console.log('📈 Queue stats:', stats)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testAsyncGeneration()