/**
 * Single Webinar Processing Script
 * 
 * Process one webinar at a time to avoid timeouts
 */

import { WebinarProcessor } from './process-webinars'
import logger from '../lib/logger'

async function processSingleWebinar() {
  const webinarId = process.argv[2]
  
  if (!webinarId) {
    console.log('Usage: npx tsx src/scripts/process-single-webinar.ts <webinar-id>')
    console.log('')
    console.log('Available webinar IDs:')
    console.log('Leadership Team Coaching: 8883ec44-c23d-44ec-8bae-f3e456858393')
    console.log('Sustainable Self-Leadership: af361954-f776-4429-8539-bcb14fa0b074')
    process.exit(1)
  }

  const processor = new WebinarProcessor()
  
  try {
    console.log(`🚀 Processing webinar: ${webinarId}`)
    
    // Get webinar
    const { data: webinar, error } = await require('../services/supabase').supabaseService.client
      .from('podcast_episodes')
      .select('*')
      .eq('id', webinarId)
      .single()

    if (error || !webinar) {
      throw new Error(`Webinar not found: ${webinarId}`)
    }

    console.log(`📋 Title: ${webinar.title}`)
    console.log(`📏 Content Length: ${webinar.transcript_raw?.length || 0}`)

    // Process webinar
    const result = await processor['processWebinar'](webinar)
    
    if (result.success) {
      console.log('✅ Processing completed successfully!')
      console.log(`📊 Chunks created: ${result.chunksCreated}`)
      console.log(`🏷️  Topic: ${result.topic}`)
    } else {
      console.log('❌ Processing failed!')
      console.log(`Error: ${result.error}`)
    }

  } catch (error) {
    console.error('💥 Processing failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  processSingleWebinar().catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}