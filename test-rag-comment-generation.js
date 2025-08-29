/**
 * Test script for RAG-powered comment generation webhook
 * 
 * This script tests the complete fallback chain:
 * 1. RAG API (localhost:8000)
 * 2. n8n webhook (if configured)
 * 3. Enhanced mock response
 * 
 * Usage: node test-rag-comment-generation.js
 */

const fetch = require('node-fetch');

const TEST_CASES = [
  {
    name: "Leadership Post Test",
    postContent: "Leadership isn't about having all the answers. It's about asking the right questions and creating an environment where your team can thrive. The best leaders I've worked with are curious, humble, and focused on developing others.",
    authorName: "Sarah Johnson",
    postId: "test_leadership_001"
  },
  {
    name: "Innovation Post Test", 
    postContent: "Innovation in business isn't just about technology - it's about reimagining processes, challenging assumptions, and fostering a culture where creative solutions can emerge. The companies that adapt fastest will thrive in the next decade.",
    authorName: "Michael Chen",
    postId: "test_innovation_002"
  },
  {
    name: "Team Building Post Test",
    postContent: "Building high-performing teams requires more than just hiring talented people. It's about creating psychological safety, establishing clear communication channels, and aligning everyone around shared goals and values.",
    authorName: "Jennifer Martinez",
    postId: "test_teams_003"
  }
];

async function testCommentGeneration() {
  console.log('🚀 Testing RAG-powered comment generation webhook...\n');
  
  const webhookUrl = 'http://localhost:3000/api/generate-comment-webhook';
  
  for (const testCase of TEST_CASES) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log(`Author: ${testCase.authorName}`);
    console.log(`Post Preview: ${testCase.postContent.substring(0, 100)}...`);
    console.log('─'.repeat(80));
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postContent: testCase.postContent,
          authorName: testCase.authorName,
          postId: testCase.postId,
          postUrl: `https://linkedin.com/posts/${testCase.postId}`
        })
      });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`Error Details: ${errorText}`);
        continue;
      }
      
      const result = await response.json();
      
      console.log(`✅ Success! Method: ${result.metadata?.method?.toUpperCase()}`);
      console.log(`⏱️  Processing Time: ${processingTime}ms (Server: ${result.metadata?.processingTime}ms)`);
      console.log(`🔄 Fallback Used: ${result.fallback ? 'Yes' : 'No'}`);
      
      if (result.metadata?.sources?.length > 0) {
        console.log(`📚 Context Sources: ${result.metadata.sources.length}`);
      }
      
      if (result.metadata?.contextUsed?.length > 0) {
        console.log(`🎯 Context Items Used: ${result.metadata.contextUsed.length}`);
      }
      
      console.log(`\n💬 Generated Comment:`);
      console.log(`"${result.generatedComment}"`);
      
      // Analyze comment quality
      const commentLength = result.generatedComment.length;
      const hasQuestion = result.generatedComment.includes('?');
      const hasPersonalTouch = result.generatedComment.toLowerCase().includes('experience') || 
                             result.generatedComment.toLowerCase().includes('i\'ve') ||
                             result.generatedComment.toLowerCase().includes('in my');
      const hasSpecificReference = !result.generatedComment.toLowerCase().includes('great post') &&
                                 !result.generatedComment.toLowerCase().includes('thanks for sharing');
      
      console.log(`\n📊 Quality Indicators:`);
      console.log(`   Length: ${commentLength} characters ${commentLength >= 50 && commentLength <= 300 ? '✅' : '⚠️'}`);
      console.log(`   Has Question: ${hasQuestion ? '✅' : '❌'}`);
      console.log(`   Personal Touch: ${hasPersonalTouch ? '✅' : '❌'}`);
      console.log(`   Specific (not generic): ${hasSpecificReference ? '✅' : '❌'}`);
      
      if (result.error) {
        console.log(`⚠️  Processing Error: ${result.error}`);
      }
      
    } catch (error) {
      console.error(`❌ Request Failed: ${error.message}`);
    }
    
    console.log('═'.repeat(80));
  }
  
  console.log('\n🏁 Testing completed!');
  
  // Test the RAG API directly
  console.log('\n🔍 Testing RAG API directly...');
  await testRAGAPIDirect();
}

async function testRAGAPIDirect() {
  try {
    const response = await fetch('http://localhost:8000/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test connection - can you generate a brief LinkedIn comment?',
        conversation_id: 'test_direct',
        stream: false
      })
    });
    
    if (response.ok) {
      console.log('✅ RAG API is accessible and responding');
      const result = await response.text();
      console.log(`📝 Sample response: ${result.substring(0, 100)}...`);
    } else {
      console.log(`⚠️  RAG API responded with status: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ RAG API connection failed: ${error.message}`);
    console.log('   Make sure the RAG system is running on localhost:8000');
  }
}

// Run the tests
if (require.main === module) {
  testCommentGeneration().catch(console.error);
}

module.exports = { testCommentGeneration };