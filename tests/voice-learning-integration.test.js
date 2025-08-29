/**
 * Voice Learning Integration Test Suite
 * Comprehensive test coverage for voice learning system
 */

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const fetch = require('node-fetch');

const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';
const TIMEOUT = 30000;

describe('Voice Learning Integration', () => {
  let testJobId = null;

  beforeAll(async () => {
    // Ensure API is accessible
    try {
      const response = await fetch(`${API_BASE}/api/voice-learning/status`);
      expect(response.ok).toBe(true);
    } catch (error) {
      throw new Error(`API not accessible: ${error.message}`);
    }
  }, TIMEOUT);

  describe('Voice Learning APIs', () => {
    test('should return voice learning status', async () => {
      const response = await fetch(`${API_BASE}/api/voice-learning/status`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBeDefined();
      expect(data.status.database).toBeDefined();
      expect(data.status.voice_insights).toBeDefined();
      expect(data.status.system_health).toBeDefined();
    });

    test('should return voice learning insights', async () => {
      const response = await fetch(`${API_BASE}/api/voice-learning/insights?include_guidelines=true`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.insights).toBeDefined();
      expect(data.insights.voice_profile).toBeDefined();
    });

    test('should return voice learning data', async () => {
      const response = await fetch(`${API_BASE}/api/voice-learning/data?limit=5`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('Voice Profile Quality', () => {
    let voiceProfile = null;

    beforeAll(async () => {
      const response = await fetch(`${API_BASE}/api/voice-learning/insights`);
      const data = await response.json();
      voiceProfile = data.insights.voice_profile;
    });

    test('should have high authenticity scores', () => {
      expect(voiceProfile.avgScores.authenticity).toBeGreaterThanOrEqual(75);
    });

    test('should have high authority scores', () => {
      expect(voiceProfile.avgScores.authority).toBeGreaterThanOrEqual(75);
    });

    test('should have acceptable vulnerability scores', () => {
      expect(voiceProfile.avgScores.vulnerability).toBeGreaterThanOrEqual(65);
    });

    test('should have defined dominant tone', () => {
      expect(voiceProfile.dominantTone).toBeDefined();
      expect(typeof voiceProfile.dominantTone).toBe('string');
    });
  });

  describe('Content Generation Integration', () => {
    test('should create job with voice learning enabled', async () => {
      const payload = {
        topic: 'Jest Integration Test - Voice Learning',
        platform: 'linkedin',
        contentIntent: 'thought-leadership',
        strategicVariants: ['performance'],
        tone: 'professional',
        useVoiceLearning: true
      };

      const response = await fetch(`${API_BASE}/api/test-voice-integration`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.testResults.voiceLearningEnabled).toBe(true);
      expect(data.testResults.jobId).toBeDefined();
      
      testJobId = data.testResults.jobId;
    });

    test('should store job in database', async () => {
      if (!testJobId) {
        throw new Error('No test job ID available');
      }

      // Wait a moment for job to be stored
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await fetch(`${API_BASE}/api/content/job/${testJobId}`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.job).toBeDefined();
      expect(data.job.id).toBe(testJobId);
    });
  });

  describe('Voice Learning Guidelines Generation', () => {
    test('should generate comprehensive voice guidelines', async () => {
      const mockVoiceLearningData = {
        insights: {
          voice_profile: {
            dominantTone: 'conversational',
            avgScores: { authenticity: 85, authority: 78, vulnerability: 65 }
          },
          content_patterns: {
            avg_word_count: 150,
            most_common_opening: 'question',
            most_common_closing: 'call_to_action'
          }
        },
        generation_guidelines: [
          'Use conversational tone with authority signals',
          'Include vulnerability through personal examples',
          'Start with questions or contrarian statements'
        ],
        strength_factors: [
          'High vulnerability and authenticity',
          'Strong authority signals'
        ],
        meta: { model_confidence: 76 }
      };

      // Test guideline generation logic
      const voiceInsights = mockVoiceLearningData.insights.voice_profile;
      const generationGuidelines = mockVoiceLearningData.generation_guidelines;
      const strengthFactors = mockVoiceLearningData.strength_factors;

      const voiceLearningGuidelines = [
        `VOICE LEARNING INSIGHTS (Confidence: ${mockVoiceLearningData.meta.model_confidence}%):`,
        `- Dominant Tone: ${voiceInsights.dominantTone}`,
        `- Authenticity Score Target: ${Math.round(voiceInsights.avgScores.authenticity)}%`,
        `- Authority Score Target: ${Math.round(voiceInsights.avgScores.authority)}%`,
        `- Vulnerability Score Target: ${Math.round(voiceInsights.avgScores.vulnerability)}%`,
        '',
        'LEARNED WRITING PATTERNS:',
        ...generationGuidelines.slice(0, 5).map(g => `- ${g}`),
        '',
        'STRENGTH FACTORS TO MAINTAIN:',
        ...strengthFactors.slice(0, 5).map(s => `- ${s}`)
      ].join('\\n');

      expect(voiceLearningGuidelines.length).toBeGreaterThan(100);
      expect(voiceLearningGuidelines).toContain('VOICE LEARNING INSIGHTS');
      expect(voiceLearningGuidelines).toContain('conversational');
      expect(voiceLearningGuidelines).toContain('85%');
    });
  });

  describe('Integration Readiness', () => {
    test('should meet all quality standards', async () => {
      const statusResponse = await fetch(`${API_BASE}/api/voice-learning/status`);
      const statusData = await statusResponse.json();
      
      const insightsResponse = await fetch(`${API_BASE}/api/voice-learning/insights`);
      const insightsData = await insightsResponse.json();

      // Calculate model confidence
      const avgScores = insightsData.insights.voice_profile.avgScores;
      const modelConfidence = Math.round(
        (avgScores.authenticity + avgScores.authority + avgScores.vulnerability) / 3
      );

      // Test all integration readiness criteria
      expect(statusData.success).toBe(true); // Voice data available
      expect(modelConfidence).toBeGreaterThanOrEqual(70); // Confidence acceptable
      expect(avgScores.authenticity).toBeGreaterThanOrEqual(75); // Authenticity threshold
      expect(avgScores.authority).toBeGreaterThanOrEqual(75); // Authority threshold
      expect(avgScores.vulnerability).toBeGreaterThanOrEqual(65); // Vulnerability threshold
      expect(statusData.status.database.total_analyses).toBeGreaterThan(0); // Has analysis data
    });

    test('should be production ready', async () => {
      const response = await fetch(`${API_BASE}/api/voice-learning/status`);
      const data = await response.json();

      expect(data.status.database.data_available).toBe(true);
      expect(data.status.voice_insights.avg_authenticity_score).toBeGreaterThanOrEqual(75);
      expect(data.status.voice_insights.avg_authority_score).toBeGreaterThanOrEqual(75);
    });
  });
});

describe('Voice Learning Performance', () => {
  test('should provide performance metrics', async () => {
    const response = await fetch(`${API_BASE}/api/voice-learning/status`);
    const data = await response.json();

    expect(data.meta).toBeDefined();
    expect(data.meta.generated_at).toBeDefined();
    expect(data.meta.api_version).toBe('1.0');
    expect(data.meta.system).toBe('voice_learning');
  });

  test('should have acceptable response times', async () => {
    const start = Date.now();
    const response = await fetch(`${API_BASE}/api/voice-learning/status`);
    const responseTime = Date.now() - start;

    expect(response.ok).toBe(true);
    expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
  });
});

// Helper to run specific test suites
if (require.main === module) {
  console.log('🧪 Running Voice Learning Integration Tests...');
  
  // This would be run with Jest in a real environment
  // For now, we'll export the test functions
  module.exports = {
    runVoiceLearningTests: () => {
      console.log('Voice Learning Integration Test Suite Ready');
      console.log('Run with: npm test -- voice-learning-integration.test.js');
    }
  };
}