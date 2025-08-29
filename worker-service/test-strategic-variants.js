const { aiAgentsService } = require('./dist/services/ai-agents.js');

// Mock research data for testing
const mockResearch = {
  idea_1: {
    concise_summary: 'Leadership burnout is affecting 70% of UK CEOs according to new research',
    angle_approach: 'How successful leaders are becoming victims of their own success',
    details: 'Study shows that founders who built companies to £50M+ are experiencing unprecedented burnout rates',
    relevance: 'Critical for established business leaders who feel trapped by their success'
  },
  idea_2: {
    concise_summary: 'Remote work is changing how executives lead their teams',
    angle_approach: 'The hidden leadership challenges of distributed teams',
    details: 'New management approaches needed for post-pandemic leadership effectiveness',
    relevance: 'Relevant for leaders managing hybrid and remote teams'
  },
  idea_3: {
    concise_summary: 'Self-leadership is the missing piece in traditional leadership development',
    angle_approach: 'Why external leadership training fails without internal work',
    details: 'Research indicates internal self-awareness is the key differentiator',
    relevance: 'Essential for leaders seeking sustainable personal and professional growth'
  }
};

// Test strategic variants generation
async function testStrategicVariants() {
  console.log('🧪 Testing Strategic Variants Generation...\n');
  
  try {
    const strategicVariants = ['performance', 'engagement', 'experimental'];
    const topic = 'Leadership Burnout and Self-Leadership';
    
    console.log(`📊 Generating ${strategicVariants.length} strategic variants for: "${topic}"`);
    console.log(`🎯 Variants: ${strategicVariants.join(', ')}\n`);
    
    const results = await aiAgentsService.generateStrategicVariants(
      topic,
      mockResearch,
      strategicVariants,
      'Test voice guidelines for strategic variants',
      null
    );
    
    console.log(`✅ Successfully generated ${results.length} strategic variants!\n`);
    
    results.forEach((result, index) => {
      console.log(`📝 VARIANT ${index + 1}: ${result.content.approach}`);
      console.log(`🤖 Agent: ${result.agent_name}`);
      console.log(`🎤 Voice Score: ${result.content.estimated_voice_score}%`);
      console.log(`⏱️  Generation Time: ${result.metadata.generation_time_ms}ms`);
      console.log(`🎯 Strategic Type: ${result.metadata.strategic_variant_type || 'N/A'}`);
      console.log(`📄 Content Preview: ${result.content.body.substring(0, 150)}...`);
      console.log('---\n');
    });
    
    // Verify each variant has unique characteristics
    const approaches = results.map(r => r.content.approach);
    const uniqueApproaches = [...new Set(approaches)];
    
    console.log('🔍 VERIFICATION:');
    console.log(`   - Generated variants: ${results.length}`);
    console.log(`   - Unique approaches: ${uniqueApproaches.length}`);
    console.log(`   - All unique: ${uniqueApproaches.length === results.length ? '✅ YES' : '❌ NO'}`);
    
    if (uniqueApproaches.length === results.length) {
      console.log('🎉 SUCCESS: All variants have unique strategic approaches!');
    } else {
      console.log('⚠️  WARNING: Some variants may be using the same approach');
      console.log('   Approaches found:', approaches);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testStrategicVariants();