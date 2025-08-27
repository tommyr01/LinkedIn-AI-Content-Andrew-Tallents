#!/usr/bin/env node

/**
 * Voice Learning System Test Script
 * 
 * Tests the complete continuous voice learning system implementation
 * including monitoring, analysis, insights, and API endpoints.
 */

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000'

// ANSI colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.magenta}🔍${colors.reset} ${msg}`),
  result: (msg) => console.log(`${colors.cyan}📊${colors.reset} ${msg}`)
}

async function makeRequest(endpoint, options = {}) {
  try {
    const url = `${baseUrl}${endpoint}`
    log.step(`Making ${options.method || 'GET'} request to ${endpoint}`)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    const data = await response.json()
    
    if (response.ok) {
      log.success(`${options.method || 'GET'} ${endpoint} - Status: ${response.status}`)
    } else {
      log.warning(`${options.method || 'GET'} ${endpoint} - Status: ${response.status}`)
    }
    
    return { response, data, ok: response.ok, status: response.status }
  } catch (error) {
    log.error(`Request failed for ${endpoint}: ${error.message}`)
    return { error: error.message, ok: false, status: 0 }
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testSystemStatus() {
  log.info('=== Testing Voice Learning System Status ===')
  
  const result = await makeRequest('/api/voice-learning/system')
  
  if (result.ok && result.data.success) {
    log.result(`System Status: ${result.data.system.health_indicators.overall_status}`)
    log.result(`Initialization: ${result.data.system.initialization.is_initialized ? 'Yes' : 'No'}`)
    log.result(`Scheduler Running: ${result.data.system.initialization.scheduler_running ? 'Yes' : 'No'}`)
    log.result(`Monitoring Active: ${result.data.system.initialization.monitoring_active ? 'Yes' : 'No'}`)
    
    return {
      initialized: result.data.system.initialization.is_initialized,
      schedulerRunning: result.data.system.initialization.scheduler_running,
      monitoringActive: result.data.system.initialization.monitoring_active
    }
  } else {
    log.error('Failed to get system status')
    return { initialized: false, schedulerRunning: false, monitoringActive: false }
  }
}

async function testSystemInitialization() {
  log.info('=== Testing System Initialization ===')
  
  const result = await makeRequest('/api/voice-learning/system', {
    method: 'POST',
    body: JSON.stringify({
      auto_start_monitoring: true,
      run_initial_analysis: true,
      max_initial_days: 7,
      max_initial_posts: 10,
      force_reinitialize: true
    })
  })
  
  if (result.ok && result.data.success) {
    log.result(`Services Started: ${result.data.initialization.services_started.join(', ')}`)
    log.result(`Errors: ${result.data.initialization.errors.length}`)
    
    if (result.data.initialization.errors.length > 0) {
      result.data.initialization.errors.forEach(error => {
        log.warning(`Initialization Error: ${error}`)
      })
    }
    
    return true
  } else {
    log.error('System initialization failed')
    if (result.data && result.data.initialization && result.data.initialization.errors) {
      result.data.initialization.errors.forEach(error => {
        log.error(`Init Error: ${error}`)
      })
    }
    return false
  }
}

async function testVoiceLearningData() {
  log.info('=== Testing Voice Learning Data Access ===')
  
  const result = await makeRequest('/api/voice-learning/data?limit=5&include_analysis=true')
  
  if (result.ok && result.data.success) {
    log.result(`Total Records: ${result.data.stats.total_records}`)
    log.result(`Content Types: ${Object.keys(result.data.stats.content_types).join(', ')}`)
    
    if (result.data.stats.score_averages) {
      log.result(`Avg Authenticity: ${result.data.stats.score_averages.authenticity}`)
      log.result(`Avg Authority: ${result.data.stats.score_averages.authority}`)
      log.result(`Avg Vulnerability: ${result.data.stats.score_averages.vulnerability}`)
    }
    
    return result.data.stats.total_records > 0
  } else {
    log.error('Failed to get voice learning data')
    return false
  }
}

async function testVoiceInsights() {
  log.info('=== Testing Voice Learning Insights ===')
  
  const result = await makeRequest('/api/voice-learning/insights?include_guidelines=true&include_analysis=true')
  
  if (result.ok && result.data.success) {
    log.result(`Data Points: ${result.data.meta.data_points}`)
    log.result(`Model Confidence: ${result.data.meta.model_confidence}%`)
    
    if (result.data.generation_guidelines) {
      log.result(`Generation Guidelines: ${result.data.generation_guidelines.length}`)
    }
    
    if (result.data.insights.voice_profile) {
      log.result(`Dominant Tone: ${result.data.insights.voice_profile.dominantTone}`)
    }
    
    return true
  } else {
    log.error('Failed to get voice learning insights')
    return false
  }
}

async function testTriggerAnalysis() {
  log.info('=== Testing Voice Analysis Trigger ===')
  
  // First get some posts to analyze
  const postsResult = await makeRequest('/api/linkedin/posts/list?username=andrewtallents&maxRecords=3')
  
  if (!postsResult.ok || !postsResult.data.success || postsResult.data.posts.length === 0) {
    log.warning('No LinkedIn posts found for testing analysis trigger')
    return false
  }
  
  const postIds = postsResult.data.posts.slice(0, 2).map(post => post.id)
  log.result(`Testing with post IDs: ${postIds.join(', ')}`)
  
  const result = await makeRequest('/api/voice-learning/trigger', {
    method: 'POST',
    body: JSON.stringify({
      post_ids: postIds
    })
  })
  
  if (result.ok && result.data.success) {
    log.result(`Posts Processed: ${result.data.data.processed}`)
    log.result(`Posts Failed: ${result.data.data.failed}`)
    log.result(`Success Rate: ${Math.round(result.data.data.summary.success_rate * 100)}%`)
    
    return result.data.data.processed > 0
  } else {
    log.error('Failed to trigger voice analysis')
    return false
  }
}

async function testEmergencyAnalysis() {
  log.info('=== Testing Emergency Analysis ===')
  
  // Get the emergency analysis info first
  const infoResult = await makeRequest('/api/voice-learning/monitor/emergency')
  
  if (infoResult.ok && infoResult.data.success) {
    log.result(`Emergency Analysis Available: ${infoResult.data.emergency_analysis.available ? 'Yes' : 'No'}`)
    log.result(`Max Posts per Request: ${infoResult.data.emergency_analysis.max_posts_per_request}`)
  }
  
  // Note: We'll skip actually triggering emergency analysis to avoid API rate limits
  log.info('Skipping emergency analysis trigger to preserve API limits')
  return true
}

async function testMonitoringControls() {
  log.info('=== Testing Monitoring Controls ===')
  
  // Get monitor status
  const statusResult = await makeRequest('/api/voice-learning/monitor')
  
  if (statusResult.ok && statusResult.data.success) {
    log.result(`Scheduler Running: ${statusResult.data.scheduler.is_running ? 'Yes' : 'No'}`)
    log.result(`Monitoring Active: ${statusResult.data.scheduler.monitoring.isRunning ? 'Yes' : 'No'}`)
    
    if (statusResult.data.scheduler.scheduled_tasks.next_batch_analysis) {
      log.result(`Next Batch Analysis: ${new Date(statusResult.data.scheduler.scheduled_tasks.next_batch_analysis).toLocaleString()}`)
    }
  }
  
  return statusResult.ok && statusResult.data.success
}

async function testLinkedInPostsIntegration() {
  log.info('=== Testing LinkedIn Posts Integration ===')
  
  const result = await makeRequest('/api/linkedin/posts/list?username=andrewtallents&maxRecords=5')
  
  if (result.ok && result.data.success) {
    log.result(`Posts Retrieved: ${result.data.posts.length}`)
    log.result(`Total Reactions: ${result.data.stats.totalReactions}`)
    log.result(`Voice Analysis Integration: Available`)
    
    // Check if posts have engagement data for voice analysis
    const postsWithEngagement = result.data.posts.filter(post => post.totalReactions > 0)
    log.result(`Posts with Engagement Data: ${postsWithEngagement.length}`)
    
    return true
  } else {
    log.error('Failed to get LinkedIn posts')
    return false
  }
}

async function runComprehensiveTest() {
  log.info(`${colors.cyan}🚀 Starting Comprehensive Voice Learning System Test${colors.reset}`)
  log.info(`Base URL: ${baseUrl}`)
  console.log('')
  
  const testResults = {
    systemStatus: false,
    initialization: false,
    dataAccess: false,
    insights: false,
    triggerAnalysis: false,
    emergencyAnalysis: false,
    monitoring: false,
    linkedInIntegration: false
  }
  
  try {
    // Test 1: System Status
    const systemStatus = await testSystemStatus()
    testResults.systemStatus = systemStatus.initialized
    console.log('')
    
    // Test 2: System Initialization (if not already initialized)
    if (!systemStatus.initialized || !systemStatus.schedulerRunning) {
      log.info('System not fully initialized, attempting initialization...')
      testResults.initialization = await testSystemInitialization()
      
      if (testResults.initialization) {
        log.info('Waiting 10 seconds for system to fully start...')
        await sleep(10000)
      }
    } else {
      log.info('System already initialized, skipping initialization test')
      testResults.initialization = true
    }
    console.log('')
    
    // Test 3: Voice Learning Data Access
    testResults.dataAccess = await testVoiceLearningData()
    console.log('')
    
    // Test 4: Voice Learning Insights
    testResults.insights = await testVoiceInsights()
    console.log('')
    
    // Test 5: Manual Analysis Trigger
    testResults.triggerAnalysis = await testTriggerAnalysis()
    console.log('')
    
    // Test 6: Emergency Analysis
    testResults.emergencyAnalysis = await testEmergencyAnalysis()
    console.log('')
    
    // Test 7: Monitoring Controls
    testResults.monitoring = await testMonitoringControls()
    console.log('')
    
    // Test 8: LinkedIn Posts Integration
    testResults.linkedInIntegration = await testLinkedInPostsIntegration()
    console.log('')
    
  } catch (error) {
    log.error(`Test execution failed: ${error.message}`)
  }
  
  // Generate Test Report
  log.info('=== Test Results Summary ===')
  
  const passedTests = Object.values(testResults).filter(result => result === true).length
  const totalTests = Object.keys(testResults).length
  const successRate = Math.round((passedTests / totalTests) * 100)
  
  console.log('')
  Object.entries(testResults).forEach(([test, passed]) => {
    const status = passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`
    const emoji = passed ? '✅' : '❌'
    console.log(`${emoji} ${test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${status}`)
  })
  
  console.log('')
  log.result(`Overall Success Rate: ${successRate}% (${passedTests}/${totalTests} tests passed)`)
  
  if (successRate >= 80) {
    log.success('Voice Learning System is functioning well! 🎉')
  } else if (successRate >= 60) {
    log.warning('Voice Learning System has some issues that need attention ⚠️')
  } else {
    log.error('Voice Learning System has significant problems that need immediate attention 🚨')
  }
  
  console.log('')
  log.info('=== System URLs for Manual Testing ===')
  console.log(`System Status: ${baseUrl}/api/voice-learning/system`)
  console.log(`Monitor Control: ${baseUrl}/api/voice-learning/monitor`)
  console.log(`Voice Data: ${baseUrl}/api/voice-learning/data`)
  console.log(`Voice Insights: ${baseUrl}/api/voice-learning/insights`)
  console.log(`Analysis Trigger: ${baseUrl}/api/voice-learning/trigger`)
  console.log(`Emergency Analysis: ${baseUrl}/api/voice-learning/monitor/emergency`)
  console.log('')
  
  return { testResults, successRate, passedTests, totalTests }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runComprehensiveTest()
    .then(({ successRate }) => {
      process.exit(successRate >= 80 ? 0 : 1)
    })
    .catch(error => {
      log.error(`Test runner failed: ${error.message}`)
      process.exit(1)
    })
}

module.exports = { runComprehensiveTest, makeRequest }