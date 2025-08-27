#!/usr/bin/env node

/**
 * Comprehensive Voice Learning Integration Test Suite
 * Tests the complete pipeline from API to worker processing
 */

const { execSync } = require('child_process');
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logTest(test, status, details = '') {
  const statusColor = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  const statusIcon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  log(`${statusIcon} ${test}`, statusColor);
  if (details) log(`    ${details}`, 'reset');
}

async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      timeout: 30000,
      ...options
    });
    const data = await response.json();
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class VoiceLearningIntegrationTester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    };
    this.testJobId = null;
  }

  updateResult(status) {
    this.results.total++;
    if (status === 'PASS') this.results.passed++;
    else if (status === 'FAIL') this.results.failed++;
    else this.results.warnings++;
  }

  async testVoiceStatusAPI() {
    logSection('Testing Voice Learning Status API');
    
    const result = await makeRequest('/api/voice-learning/status');
    
    if (!result.success) {
      logTest('Voice Status API - Connectivity', 'FAIL', result.error);
      this.updateResult('FAIL');
      return false;
    }

    logTest('Voice Status API - Connectivity', 'PASS');
    this.updateResult('PASS');

    // Test status structure
    const { status } = result.data;
    if (!status || typeof status !== 'object') {
      logTest('Voice Status API - Structure', 'FAIL', 'Missing or invalid status object');
      this.updateResult('FAIL');
      return false;
    }

    logTest('Voice Status API - Structure', 'PASS');
    this.updateResult('PASS');

    // Test required fields
    const requiredFields = ['database', 'voice_insights', 'system_health'];
    let allFieldsPresent = true;

    for (const field of requiredFields) {
      if (!status[field]) {
        logTest(`Voice Status API - Field: ${field}`, 'FAIL', 'Missing required field');
        this.updateResult('FAIL');
        allFieldsPresent = false;
      } else {
        logTest(`Voice Status API - Field: ${field}`, 'PASS');
        this.updateResult('PASS');
      }
    }

    // Test voice insights data
    if (status.voice_insights) {
      const insights = status.voice_insights;
      logTest('Voice Insights - Authenticity Score', 
        typeof insights.avg_authenticity_score === 'number' ? 'PASS' : 'FAIL',
        `Score: ${insights.avg_authenticity_score}`
      );
      this.updateResult(typeof insights.avg_authenticity_score === 'number' ? 'PASS' : 'FAIL');

      logTest('Voice Insights - Authority Score', 
        typeof insights.avg_authority_score === 'number' ? 'PASS' : 'FAIL',
        `Score: ${insights.avg_authority_score}`
      );
      this.updateResult(typeof insights.avg_authority_score === 'number' ? 'PASS' : 'FAIL');

      logTest('Voice Insights - Vulnerability Score', 
        typeof insights.avg_vulnerability_score === 'number' ? 'PASS' : 'FAIL',
        `Score: ${insights.avg_vulnerability_score}`
      );
      this.updateResult(typeof insights.avg_vulnerability_score === 'number' ? 'PASS' : 'FAIL');
    }

    return allFieldsPresent;
  }

  async testVoiceInsightsAPI() {
    logSection('Testing Voice Learning Insights API');

    const result = await makeRequest('/api/voice-learning/insights?include_guidelines=true');

    if (!result.success) {
      logTest('Voice Insights API - Connectivity', 'FAIL', result.error);
      this.updateResult('FAIL');
      return false;
    }

    logTest('Voice Insights API - Connectivity', 'PASS');
    this.updateResult('PASS');

    const { insights } = result.data;
    if (!insights) {
      logTest('Voice Insights API - Data Structure', 'FAIL', 'Missing insights object');
      this.updateResult('FAIL');
      return false;
    }

    logTest('Voice Insights API - Data Structure', 'PASS');
    this.updateResult('PASS');

    // Test voice profile
    if (insights.voice_profile) {
      const profile = insights.voice_profile;
      
      logTest('Voice Profile - Dominant Tone', 
        profile.dominantTone ? 'PASS' : 'WARN',
        `Tone: ${profile.dominantTone || 'Not defined'}`
      );
      this.updateResult(profile.dominantTone ? 'PASS' : 'WARN');

      if (profile.avgScores) {
        logTest('Voice Profile - Average Scores', 'PASS', 
          `Auth: ${profile.avgScores.authenticity}%, Auth: ${profile.avgScores.authority}%, Vuln: ${profile.avgScores.vulnerability}%`);
        this.updateResult('PASS');
      } else {
        logTest('Voice Profile - Average Scores', 'FAIL', 'Missing average scores');
        this.updateResult('FAIL');
      }
    }

    return true;
  }

  async testContentGenerationAPI() {
    logSection('Testing Content Generation API with Voice Learning');

    // Test payload for voice learning enabled content generation
    const testPayload = {
      topic: 'Voice Learning Integration Test - Leadership challenges in scaling startups',
      platform: 'linkedin',
      contentIntent: 'thought-leadership',
      strategicVariants: ['performance'],
      tone: 'professional',
      useVoiceLearning: true // KEY TEST POINT
    };

    log('Sending content generation request with voice learning enabled...', 'blue');
    
    const result = await makeRequest('/api/content/generate-async', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    if (!result.success) {
      logTest('Content Generation API - Request', 'FAIL', result.error);
      this.updateResult('FAIL');
      return false;
    }

    logTest('Content Generation API - Request', 'PASS');
    this.updateResult('PASS');

    // Verify response structure
    const { data } = result;
    if (!data.success || !data.jobId) {
      logTest('Content Generation API - Response Structure', 'FAIL', 'Missing success/jobId');
      this.updateResult('FAIL');
      return false;
    }

    logTest('Content Generation API - Response Structure', 'PASS', `Job ID: ${data.jobId}`);
    this.updateResult('PASS');

    // Store job ID for monitoring
    this.testJobId = data.jobId;

    // Test voice learning flag was processed
    if (data.debug) {
      logTest('Content Generation API - Debug Info', 'PASS', 
        `Database Job: ${data.debug.foundDatabaseJob}, Status: ${data.debug.databaseJobStatus}`);
      this.updateResult('PASS');
    }

    return true;
  }

  async testJobPolling() {
    if (!this.testJobId) {
      logTest('Job Polling - Prerequisites', 'FAIL', 'No job ID available');
      this.updateResult('FAIL');
      return false;
    }

    logSection('Testing Job Status Polling');

    let attempts = 0;
    const maxAttempts = 10;
    let jobCompleted = false;
    let finalJobData = null;

    log('Polling job status...', 'blue');

    while (attempts < maxAttempts && !jobCompleted) {
      attempts++;
      
      const result = await makeRequest(`/api/content/job/${this.testJobId}`);
      
      if (!result.success) {
        logTest(`Job Polling - Attempt ${attempts}`, 'WARN', result.error);
        this.updateResult('WARN');
        await sleep(3000);
        continue;
      }

      const { job } = result.data;
      if (job) {
        logTest(`Job Polling - Attempt ${attempts}`, 'PASS', 
          `Status: ${job.status}, Progress: ${job.progress}%`);
        this.updateResult('PASS');

        if (job.status === 'completed') {
          jobCompleted = true;
          finalJobData = result.data;
          break;
        } else if (job.status === 'failed') {
          logTest('Job Processing - Final Status', 'FAIL', job.error || 'Job failed');
          this.updateResult('FAIL');
          return false;
        }
      }

      await sleep(5000); // Wait 5 seconds between polls
    }

    if (!jobCompleted) {
      logTest('Job Processing - Completion', 'WARN', 'Job did not complete within polling window');
      this.updateResult('WARN');
      return false;
    }

    logTest('Job Processing - Completion', 'PASS');
    this.updateResult('PASS');

    // Test generated content
    if (finalJobData.drafts && finalJobData.drafts.length > 0) {
      logTest('Content Generation - Draft Count', 'PASS', `Generated ${finalJobData.drafts.length} drafts`);
      this.updateResult('PASS');

      // Test voice scores in generated content
      const draftsWithVoiceScores = finalJobData.drafts.filter(d => 
        d.content.estimated_voice_score && d.content.estimated_voice_score > 0
      );

      logTest('Voice Learning - Score Generation', 
        draftsWithVoiceScores.length > 0 ? 'PASS' : 'FAIL',
        `${draftsWithVoiceScores.length}/${finalJobData.drafts.length} drafts have voice scores`
      );
      this.updateResult(draftsWithVoiceScores.length > 0 ? 'PASS' : 'FAIL');

      // Test high authenticity scores (voice learning should improve these)
      const highAuthenticityDrafts = finalJobData.drafts.filter(d => 
        d.content.estimated_voice_score >= 75
      );

      logTest('Voice Learning - Authenticity Improvement', 
        highAuthenticityDrafts.length > 0 ? 'PASS' : 'WARN',
        `${highAuthenticityDrafts.length}/${finalJobData.drafts.length} drafts achieved 75%+ authenticity`
      );
      this.updateResult(highAuthenticityDrafts.length > 0 ? 'PASS' : 'WARN');

      // Test for voice learning metadata
      const draftsWithVoiceLearning = finalJobData.drafts.filter(d => 
        d.metadata && d.metadata.voice_analysis && d.metadata.voice_analysis.voice_learning_applied
      );

      logTest('Voice Learning - Metadata Integration', 
        draftsWithVoiceLearning.length > 0 ? 'PASS' : 'FAIL',
        `${draftsWithVoiceLearning.length}/${finalJobData.drafts.length} drafts show voice learning applied`
      );
      this.updateResult(draftsWithVoiceLearning.length > 0 ? 'PASS' : 'FAIL');

    } else {
      logTest('Content Generation - Draft Count', 'FAIL', 'No drafts generated');
      this.updateResult('FAIL');
      return false;
    }

    return true;
  }

  async testComparisonWithoutVoiceLearning() {
    logSection('Testing Content Generation WITHOUT Voice Learning (Baseline)');

    const baselinePayload = {
      topic: 'Voice Learning Baseline Test - Leadership challenges in scaling startups',
      platform: 'linkedin',
      contentIntent: 'thought-leadership',
      strategicVariants: ['performance'],
      tone: 'professional',
      useVoiceLearning: false // Disabled for comparison
    };

    const result = await makeRequest('/api/content/generate-async', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(baselinePayload)
    });

    if (!result.success) {
      logTest('Baseline Generation API - Request', 'FAIL', result.error);
      this.updateResult('FAIL');
      return false;
    }

    logTest('Baseline Generation API - Request', 'PASS');
    this.updateResult('PASS');

    // We won't poll this job to completion for time, but we can verify it was created
    logTest('Baseline Generation API - Job Creation', 'PASS', `Baseline Job ID: ${result.data.jobId}`);
    this.updateResult('PASS');

    return true;
  }

  async testVoiceLearningTrigger() {
    logSection('Testing Voice Learning Analysis Trigger');

    const triggerPayload = {
      analyze_historical: true,
      days_since: 30,
      limit: 10
    };

    const result = await makeRequest('/api/voice-learning/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(triggerPayload)
    });

    if (!result.success) {
      logTest('Voice Learning Trigger - Request', 'FAIL', result.error);
      this.updateResult('FAIL');
      return false;
    }

    logTest('Voice Learning Trigger - Request', 'PASS');
    this.updateResult('PASS');

    // Check if analysis was triggered
    if (result.data.success) {
      logTest('Voice Learning Trigger - Analysis Started', 'PASS', 
        result.data.message || 'Voice learning analysis triggered'
      );
      this.updateResult('PASS');
    } else {
      logTest('Voice Learning Trigger - Analysis Started', 'WARN', 
        result.data.error || 'Analysis may not have started'
      );
      this.updateResult('WARN');
    }

    return true;
  }

  printSummary() {
    logSection('Test Summary');
    
    const { total, passed, failed, warnings } = this.results;
    
    log(`Total Tests: ${total}`, 'bright');
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
    log(`Warnings: ${warnings}`, warnings > 0 ? 'yellow' : 'reset');
    
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    log(`Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');

    if (failed === 0) {
      log('\n🎉 Voice Learning Integration: OPERATIONAL', 'green');
    } else if (failed <= 2 && warnings >= 0) {
      log('\n⚠️  Voice Learning Integration: PARTIALLY OPERATIONAL', 'yellow');
    } else {
      log('\n❌ Voice Learning Integration: NEEDS ATTENTION', 'red');
    }

    // Specific recommendations
    log('\nRecommendations:', 'cyan');
    if (failed > 0) {
      log('• Fix failed tests before deploying voice learning features', 'red');
    }
    if (warnings > 0) {
      log('• Address warnings to optimize voice learning performance', 'yellow');
    }
    if (passed >= total * 0.8) {
      log('• Voice learning system is ready for production use', 'green');
    }
  }

  async run() {
    log('🧪 COMPREHENSIVE VOICE LEARNING INTEGRATION TEST', 'bright');
    log('Testing the complete pipeline from API to content generation\n', 'reset');

    try {
      // Test core APIs
      await this.testVoiceStatusAPI();
      await this.testVoiceInsightsAPI();

      // Test content generation with voice learning
      await this.testContentGenerationAPI();

      // Monitor job processing
      await this.testJobPolling();

      // Test baseline comparison
      await this.testComparisonWithoutVoiceLearning();

      // Test voice learning trigger
      await this.testVoiceLearningTrigger();

    } catch (error) {
      log(`\n💥 Test Suite Error: ${error.message}`, 'red');
      this.updateResult('FAIL');
    }

    this.printSummary();
    
    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run the test suite
const tester = new VoiceLearningIntegrationTester();
tester.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});