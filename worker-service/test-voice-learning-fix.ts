#!/usr/bin/env npx tsx

/**
 * Test script to validate voice learning diversity fixes
 * This will test the enhanced voice learning system to ensure it captures
 * Andrew's diverse writing patterns instead of falling back to templates
 */

import { voiceLearningEnhancedService } from './src/services/voice-learning-enhanced'
import { aiAgentsService } from './src/services/ai-agents'
import logger from './src/lib/logger'

async function testVoiceLearningDiversity() {
  console.log('🧪 Testing Voice Learning Diversity Improvements...\n')

  try {
    // Test 1: Generate enhanced voice model
    console.log('📊 Step 1: Testing voice model generation with diversity analysis...')
    const voiceModel = await voiceLearningEnhancedService.generateEnhancedVoiceModel()
    
    console.log('✅ Voice Model Generated:')
    console.log(`   - Dominant Tone: ${voiceModel.voiceProfile.dominantTone}`)
    console.log(`   - Opening Variety: ${voiceModel.voiceProfile.diversityMetrics?.openingVariety || 'N/A'} types`)
    console.log(`   - Closing Variety: ${voiceModel.voiceProfile.diversityMetrics?.closingVariety || 'N/A'} types`)
    console.log(`   - Authority Patterns: ${voiceModel.voiceProfile.diversityMetrics?.authorityPatterns?.length || 0}`)
    console.log(`   - Emotional Range: ${voiceModel.voiceProfile.diversityMetrics?.emotionalRange?.length || 0}`)
    console.log(`   - Guidelines Count: ${voiceModel.generationGuidelines.length}`)
    console.log(`   - Strength Factors: ${voiceModel.strengthFactors.length}`)
    
    // Test 2: Validate guidelines diversity
    console.log('\n📝 Step 2: Analyzing voice guidelines for diversity patterns...')
    const diversityKeywords = [
      'diverse', 'multiple', 'variety', 'various', 'different',
      'natural', 'organic', 'avoid rigid', 'don\'t always'
    ]
    
    const guidelinesText = voiceModel.generationGuidelines.join(' ').toLowerCase()
    const diversityScore = diversityKeywords.filter(keyword => 
      guidelinesText.includes(keyword)
    ).length
    
    console.log(`✅ Diversity Analysis:`)
    console.log(`   - Diversity keywords found: ${diversityScore}/${diversityKeywords.length}`)
    console.log(`   - Guidelines emphasize variety: ${diversityScore >= 3 ? 'YES' : 'NO'}`)
    
    // Show some sample guidelines
    console.log('\n📋 Sample Generated Guidelines:')
    voiceModel.generationGuidelines.slice(0, 3).forEach((guideline, i) => {
      console.log(`   ${i + 1}. ${guideline}`)
    })
    
    // Test 3: Generate test content with voice learning
    console.log('\n🎯 Step 3: Testing content generation with voice learning integration...')
    
    const testResearch = {
      idea_1: {
        concise_summary: 'Leadership burnout affecting UK CEOs despite business success',
        angle_approach: 'The hidden cost of achieving everything you wanted in business',
        details: 'Research shows 67% of successful CEOs report feeling empty despite hitting targets',
        relevance: 'Directly impacts Andrew\'s target audience of successful but struggling leaders'
      },
      idea_2: {
        concise_summary: 'Self-leadership as competitive advantage for founders',
        angle_approach: 'Why the best founders invest in themselves, not just their businesses',
        details: 'Companies with self-aware leaders show 23% higher performance',
        relevance: 'Connects to Andrew\'s core message about inner transformation'
      },
      idea_3: {
        concise_summary: 'Vulnerability in leadership creating stronger teams',
        angle_approach: 'The counterintuitive strength of admitting you don\'t have all the answers',
        details: 'Teams with vulnerable leaders report 47% higher trust and engagement',
        relevance: 'Aligns with Andrew\'s vulnerable yet authoritative voice'
      }
    }
    
    // Create enhanced voice guidelines
    const enhancedGuidelines = [
      `VOICE LEARNING INSIGHTS (Confidence: 85%):`,
      `- Dominant Tone: ${voiceModel.voiceProfile.dominantTone}`,
      `- Diversity Patterns: ${voiceModel.voiceProfile.diversityMetrics?.openingVariety || 3}+ opening styles, ${voiceModel.voiceProfile.diversityMetrics?.closingVariety || 3}+ closing patterns`,
      '',
      'LEARNED DIVERSE PATTERNS:',
      ...voiceModel.generationGuidelines.slice(0, 4),
      '',
      'AVOID TEMPLATES - USE NATURAL VARIETY:',
      '- Don\'t always start with "What if" - use multiple opening styles',
      '- Don\'t always use "I\'ve coached 100s" - vary authority establishment',
      '- Mix structures organically based on content topic',
      '- Use diverse closing patterns that fit naturally'
    ].join('\n')
    
    console.log(`✅ Enhanced Guidelines Created (${enhancedGuidelines.length} characters)`)
    
    // Generate content with voice learning
    const contentVariants = await aiAgentsService.generateAllVariations(
      'Leadership Self-Coaching',
      testResearch,
      enhancedGuidelines
    )
    
    console.log(`\n🎉 Generated ${contentVariants.length} content variants`)
    
    // Test 4: Analyze generated content for diversity
    console.log('\n🔍 Step 4: Analyzing generated content for diversity...')
    
    const templatePatterns = [
      'What if',
      'I\'ve coached 100s',
      'Control may have built your business',
      '♻️ Repost if',
      'Comment [WORD]'
    ]
    
    contentVariants.forEach((variant, index) => {
      const content = variant.content.body.toLowerCase()
      const templateMatches = templatePatterns.filter(pattern => 
        content.includes(pattern.toLowerCase())
      )
      
      const openingLine = variant.content.body.split('\n')[0]
      const closingLines = variant.content.body.split('\n').slice(-3).join(' ')
      
      console.log(`\n   📄 Variant ${index + 1} (${variant.agent_name}):`)
      console.log(`      - Voice Score: ${variant.content.estimated_voice_score}%`)
      console.log(`      - Template Matches: ${templateMatches.length}/${templatePatterns.length}`)
      console.log(`      - Opening: "${openingLine.slice(0, 60)}..."`)
      console.log(`      - Closing: "${closingLines.slice(-60)}"`)
      console.log(`      - Length: ${variant.content.body.length} characters`)
    })
    
    // Test 5: Overall assessment
    console.log('\n📈 Step 5: Overall Assessment...')
    
    const avgVoiceScore = Math.round(
      contentVariants.reduce((sum, v) => sum + v.content.estimated_voice_score, 0) / contentVariants.length
    )
    
    const totalTemplateMatches = contentVariants.reduce((sum, variant) => {
      const content = variant.content.body.toLowerCase()
      return sum + templatePatterns.filter(pattern => 
        content.includes(pattern.toLowerCase())
      ).length
    }, 0)
    
    const avgTemplateMatches = Math.round(totalTemplateMatches / contentVariants.length * 10) / 10
    
    console.log(`✅ Assessment Results:`)
    console.log(`   - Average Voice Score: ${avgVoiceScore}%`)
    console.log(`   - Average Template Matches: ${avgTemplateMatches}/${templatePatterns.length}`)
    console.log(`   - Diversity Improvement: ${avgTemplateMatches < 2 ? 'GOOD' : 'NEEDS WORK'}`)
    console.log(`   - Voice Learning Integration: ${diversityScore >= 3 ? 'SUCCESS' : 'PARTIAL'}`)
    
    // Success criteria
    const success = 
      avgVoiceScore >= 85 &&
      avgTemplateMatches < 2 &&
      diversityScore >= 3 &&
      contentVariants.length === 3
    
    console.log(`\n${success ? '🎉' : '⚠️'} Overall Result: ${success ? 'SUCCESS' : 'NEEDS IMPROVEMENT'}`)
    
    if (success) {
      console.log('\n✅ Voice learning system is now capturing and applying Andrew\'s diverse patterns!')
      console.log('   - Content shows structural variety')
      console.log('   - Templates are avoided in favor of natural flow')
      console.log('   - Voice authenticity is maintained at high level')
    } else {
      console.log('\n❌ Voice learning system still needs refinement:')
      if (avgVoiceScore < 85) console.log('   - Voice scores need improvement')
      if (avgTemplateMatches >= 2) console.log('   - Still too much template usage')
      if (diversityScore < 3) console.log('   - Guidelines need more diversity emphasis')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testVoiceLearningDiversity().then(() => {
  console.log('\n🏁 Voice learning diversity test completed!')
  process.exit(0)
}).catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})