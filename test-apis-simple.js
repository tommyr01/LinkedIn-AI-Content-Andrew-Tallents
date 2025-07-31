// Simple test to check if our new API endpoints are accessible
const testEndpoints = async () => {
  console.log('🧪 Testing new async content generation APIs...')
  
  const baseUrl = 'http://localhost:3000'
  
  // Test 1: Queue Stats (should work even without jobs)
  try {
    console.log('\n📈 Testing queue stats endpoint...')
    const response = await fetch(`${baseUrl}/api/content/queue-stats`)
    const data = await response.json()
    console.log('✅ Queue stats response:', JSON.stringify(data, null, 2))
  } catch (error) {
    console.log('❌ Queue stats failed:', error.message)
  }
  
  // Test 2: Job Creation (will create job but worker won't process without Redis)
  try {
    console.log('\n🚀 Testing job creation endpoint...')
    const response = await fetch(`${baseUrl}/api/content/generate-async`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Testing async content generation system',
        platform: 'linkedin',
        voiceGuidelines: 'Professional and engaging tone'
      })
    })
    const data = await response.json()
    console.log('✅ Job creation response:', JSON.stringify(data, null, 2))
    
    if (data.jobId) {
      // Test 3: Job Status Check
      console.log('\n🔍 Testing job status endpoint...')
      const statusResponse = await fetch(`${baseUrl}/api/content/job/${data.jobId}`)
      const statusData = await statusResponse.json()
      console.log('✅ Job status response:', JSON.stringify(statusData, null, 2))
    }
  } catch (error) {
    console.log('❌ Job creation failed:', error.message)
  }
  
  console.log('\n🎉 API endpoint testing complete!')
  console.log('Note: Full functionality requires Redis + Worker service to be running.')
}

testEndpoints()