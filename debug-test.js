// Debug test script for Railway worker service
// Run with: node debug-test.js

// Update this with your actual Railway URL from the Railway dashboard
const RAILWAY_URL = 'https://content-commitment-production.up.railway.app' 
// Alternative formats to try:
// 'https://web-production-XXXX.up.railway.app'
// Check your Railway dashboard for the exact URL

async function testEndpoint(endpoint, method = 'GET', body = null) {
  try {
    console.log(`\n🔍 Testing ${method} ${endpoint}`)
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    const response = await fetch(`${RAILWAY_URL}${endpoint}`, options)
    const data = await response.json()
    
    console.log(`✅ Status: ${response.status}`)
    console.log(`📄 Response:`, JSON.stringify(data, null, 2))
    
    return { success: response.ok, data }
  } catch (error) {
    console.error(`❌ Error testing ${endpoint}:`, error.message)
    return { success: false, error: error.message }
  }
}

async function runDebugTests() {
  console.log('🚀 Starting debug tests for Railway worker service...')
  
  // Test 1: Environment variables
  await testEndpoint('/debug/env')
  
  // Test 2: OpenAI connection
  await testEndpoint('/debug/openai')
  
  // Test 3: Redis connection
  await testEndpoint('/debug/redis')
  
  // Test 4: Supabase connection  
  await testEndpoint('/debug/supabase')
  
  // Test 5: Simple AI agents test (no historical context)
  await testEndpoint('/debug/ai-agents-simple', 'POST', { topic: 'leadership challenges' })
  
  // Test 5b: Complex AI agents test (with historical context)
  await testEndpoint('/debug/ai-agents', 'POST', { topic: 'leadership challenges' })
  
  // Test 6: Research service
  await testEndpoint('/debug/research', 'POST', { topic: 'CEO burnout' })
  
  // Test 7: Historical analysis (this might fail if no data)
  await testEndpoint('/debug/historical', 'POST', { topic: 'self-leadership' })
  
  // Test 8: Simple job test
  await testEndpoint('/debug/simple-job', 'POST', { topic: 'test simple job' })
  
  console.log('\n🏁 Debug tests completed!')
  console.log('\n💡 Next steps:')
  console.log('1. Check which tests failed')
  console.log('2. If OpenAI test fails, check API key in Railway environment')
  console.log('3. If AI agents test fails, check the detailed error logs')
  console.log('4. Try the simple job test to see if basic flow works')
}

// Run the tests
runDebugTests().catch(console.error)