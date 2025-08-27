import { voiceLearningEnhanced } from '../services/voice-learning-enhanced'
import { aiAgentsService } from '../services/ai-agents'
import logger from '../lib/logger'

async function testPodcastVoiceIntegration() {
  logger.info('🎙️ Testing podcast voice integration...')

  try {
    // Test 1: Get voice context for a business topic
    console.log('\n=== TEST 1: Getting Voice Context for Business Topic ===')
    const voiceContext = await voiceLearningEnhanced.getVoiceContextForGeneration(
      'linkedin_post',
      ['leadership', 'burnout', 'founders'],
      ['confrontational', 'opening', 'storytelling', 'authority']
    )

    console.log('📊 Voice Context Results:')
    console.log(`- Patterns Found: ${voiceContext.relevantPatterns.length}`)
    console.log(`- Example Segments: ${voiceContext.exampleSegments.length}`)
    console.log(`- Guidelines Length: ${voiceContext.voiceGuidelines.length} characters`)
    console.log(`- Authenticity Boosts: ${voiceContext.authenticityBoosts.join(', ')}`)

    // Show some patterns
    console.log('\n🎯 Top Voice Patterns:')
    voiceContext.relevantPatterns.slice(0, 3).forEach((pattern, i) => {
      console.log(`${i + 1}. [${pattern.pattern_type}] "${pattern.pattern_text.substring(0, 100)}..."`)
      console.log(`   - Confidence: ${pattern.confidence_score}`)
      console.log(`   - Tone: ${pattern.emotional_tone}`)
    })

    // Show example segments
    console.log('\n🗣️ Andrew Speaking Examples:')
    voiceContext.exampleSegments.slice(0, 2).forEach((segment, i) => {
      console.log(`${i + 1}. "${segment.substring(0, 150)}..."`)
    })

    // Test 2: Get voice learning statistics
    console.log('\n=== TEST 2: Voice Learning Statistics ===')
    const stats = await voiceLearningEnhanced.getVoiceLearningStats()
    console.log('📈 Voice Data Statistics:')
    console.log(`- Total Segments: ${stats.totalSegments}`)
    console.log(`- Total Patterns: ${stats.totalPatterns}`)
    console.log(`- Average Confidence: ${(stats.avgConfidenceScore * 100).toFixed(1)}%`)
    console.log('- Pattern Breakdown:', stats.patternBreakdown)

    // Test 3: Test voice guidelines integration with AI agents
    console.log('\n=== TEST 3: Testing Voice Guidelines Integration ===')
    
    // Create mock research data
    const mockResearch = {
      idea_1: {
        concise_summary: "Micromanagement is destroying team performance and founder mental health",
        angle_approach: "Challenge conventional 'hands-on' leadership with research-backed alternatives",
        details: "Studies show 73% of teams perform worse under micromanagement, yet founders continue this pattern",
        relevance: "Perfect for Andrew's anti-burnout message and self-leadership focus"
      },
      idea_2: {
        concise_summary: "Remote work reveals leadership gaps in delegation and trust",
        angle_approach: "Expose how crisis leadership becomes permanent toxic patterns",
        details: "Harvard research indicates remote work amplifies existing trust issues",
        relevance: "Addresses core self-leadership challenges for scaling founders"
      },
      idea_3: {
        concise_summary: "High-performing founders are burning out from control addiction",
        angle_approach: "Confront the 'successful but empty' epidemic among CEOs",
        details: "Yale studies link control behaviors to founder anxiety and team turnover",
        relevance: "Directly targets Andrew's core audience of successful but struggling leaders"
      }
    }

    // Test AI generation with podcast voice guidelines
    logger.info('Generating content with podcast voice integration...')
    const aiResults = await aiAgentsService.generateAllVariations(
      'Micromanagement is killing founder success',
      mockResearch,
      voiceContext.voiceGuidelines
    )

    console.log(`\n🤖 AI Generation Results: ${aiResults.length} variants created`)
    
    aiResults.forEach((result, i) => {
      console.log(`\n--- Variant ${i + 1}: ${result.agent_name} ---`)
      console.log(`Voice Score: ${result.content.estimated_voice_score}/100`)
      console.log(`Content Length: ${result.content.body.length} characters`)
      console.log(`Preview: "${result.content.body.substring(0, 200)}..."`)
      
      // Check for Andrew's signature patterns
      const hasConfrontationalOpening = /^[A-Z][^.!?]*\s+(is killing|Stop doing|This is why)/i.test(result.content.body)
      const hasResearch = /Yale|Harvard|Research (shows|from)|Studies (show|indicate)/i.test(result.content.body)
      const hasAuthority = /The best founders I work with|Top performers/i.test(result.content.body)
      const hasDramaticStructure = /…|[1-3]️⃣|💡|➡️/.test(result.content.body)
      
      console.log('✅ Andrew Authenticity Checks:')
      console.log(`   - Confrontational Opening: ${hasConfrontationalOpening ? '✅' : '❌'}`)
      console.log(`   - Research Citations: ${hasResearch ? '✅' : '❌'}`)
      console.log(`   - Authority Phrases: ${hasAuthority ? '✅' : '❌'}`)
      console.log(`   - Dramatic Structure: ${hasDramaticStructure ? '✅' : '❌'}`)
    })

    // Test 4: Search for specific patterns
    console.log('\n=== TEST 4: Pattern Search Functionality ===')
    const searchResults = await voiceLearningEnhanced.searchVoicePatterns('confrontational', 5)
    console.log(`🔍 Search Results for 'confrontational': ${searchResults.length} patterns`)
    
    searchResults.slice(0, 2).forEach((pattern, i) => {
      console.log(`${i + 1}. "${pattern.pattern_text.substring(0, 100)}..."`)
      console.log(`   - Context: ${pattern.usage_context}`)
    })

    console.log('\n🎉 Podcast Voice Integration Test Completed Successfully!')
    console.log('\n📊 INTEGRATION SUMMARY:')
    console.log(`✅ Voice patterns retrieved: ${voiceContext.relevantPatterns.length}`)
    console.log(`✅ Podcast segments used: ${voiceContext.exampleSegments.length}`)
    console.log(`✅ AI variants generated: ${aiResults.length}`)
    console.log(`✅ Average voice score: ${(aiResults.reduce((sum, r) => sum + r.content.estimated_voice_score, 0) / aiResults.length).toFixed(1)}/100`)
    
    // Calculate improvement from baseline
    const baselineScore = 65 // Previous authenticity score
    const currentAvgScore = aiResults.reduce((sum, r) => sum + r.content.estimated_voice_score, 0) / aiResults.length
    const improvement = currentAvgScore - baselineScore
    
    console.log(`📈 AUTHENTICITY IMPROVEMENT: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)} points (from ${baselineScore} to ${currentAvgScore.toFixed(1)})`)
    
    if (currentAvgScore >= 85) {
      console.log('🏆 TARGET ACHIEVED: 8.5+/10 authenticity score reached!')
    } else {
      console.log(`🎯 TARGET PROGRESS: ${((currentAvgScore / 85) * 100).toFixed(1)}% towards 8.5/10 goal`)
    }

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Podcast voice integration test failed')
    console.error('❌ Test failed:', error)
  }
}

// Run if called directly
if (require.main === module) {
  testPodcastVoiceIntegration()
}

export { testPodcastVoiceIntegration }