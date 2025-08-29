#!/usr/bin/env tsx

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { supabaseService } from './src/services/supabase.js';

async function testAuthenticGeneration() {
  console.log('🎯 TESTING AUTHENTIC CONTENT GENERATION WITH LINKEDIN RAG');
  console.log('=========================================================\n');

  try {
    // Create Redis connection
    const redis = new IORedis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 3,
    });

    // Create queue connection
    const contentQueue = new Queue('content-generation', {
      connection: redis,
    });

    console.log('📝 Adding content generation job with LinkedIn RAG...');

    // Add job to queue
    const job = await contentQueue.add('generate-content', {
      topic: 'Remote team leadership challenges',
      context: 'How to maintain accountability and connection with distributed teams',
      targetAudience: 'CEOs and founders',
      contentGoal: 'engagement_and_education',
      useStrategicVariants: true,
      variantTypes: ['performance_focused', 'engagement_driven', 'experimental_insight']
    });

    console.log(`✅ Job added with ID: ${job.id}`);
    console.log('⏳ Waiting for job to complete...\n');

    // Wait for job completion
    const result = await job.waitUntilFinished(redis, 120000); // 2 minute timeout

    console.log('🎉 CONTENT GENERATION COMPLETED!');
    console.log('=====================================\n');

    // Display results
    if (result?.variants) {
      result.variants.forEach((variant: any, index: number) => {
        console.log(`📄 VARIANT ${index + 1} (${variant.variant_type || 'unknown'}):`);
        console.log(`Voice Match: ${variant.metadata?.voice_match_percentage || 'N/A'}%`);
        console.log(`Opening Style: ${variant.metadata?.opening_style || 'N/A'}`);
        console.log('─'.repeat(50));
        
        // Extract opening lines
        const content = variant.content?.body || '';
        const lines = content.split('\n').filter(line => line.trim());
        const opening = lines.slice(0, 3).join(' ').substring(0, 200) + '...';
        
        console.log(`OPENING: "${opening}"`);
        console.log('\n');
      });

      // Analysis
      const openings = result.variants.map((v: any) => {
        const content = v.content?.body || '';
        const lines = content.split('\n').filter(line => line.trim());
        return lines[0] || '';
      });

      console.log('🔍 AUTHENTICITY ANALYSIS:');
      console.log('==========================');
      
      const hasPhilosophical = openings.some(opening => 
        opening.toLowerCase().includes('what if') || 
        opening.toLowerCase().includes('what happens when')
      );
      
      const hasGenericKilling = openings.some(opening => 
        opening.toLowerCase().includes('is killing your') ||
        opening.toLowerCase().includes('stop destroying your') ||
        opening.toLowerCase().includes('stop letting')
      );

      console.log(`✅ Has Andrew's philosophical questions: ${hasPhilosophical ? 'YES' : 'NO'}`);
      console.log(`❌ Has generic "killing" patterns: ${hasGenericKilling ? 'YES' : 'NO'}`);
      
      const uniqueOpenings = new Set(openings.map(o => o.substring(0, 50))).size;
      console.log(`🎯 Opening diversity: ${uniqueOpenings}/${openings.length} unique patterns`);

    } else {
      console.log('❌ No variants found in result');
      console.log('Result:', JSON.stringify(result, null, 2));
    }

    await redis.quit();

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuthenticGeneration();