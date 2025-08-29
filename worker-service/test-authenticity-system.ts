import { authenticityValidator } from './src/services/authenticity-validator'
import { formattingEngine } from './src/services/formatting-engine'
import logger from './src/lib/logger'

/**
 * Test script to validate the new authenticity improvements
 */
async function testAuthenticitySystem() {
  console.log('🧪 Testing Voice Authenticity Improvements System\n')

  // Test content examples
  const testContents = [
    {
      name: 'Generic Business Content (Should Fail)',
      content: `Are you feeling overwhelmed by the demands of running your business? Many leaders struggle with finding the right balance between growth and sustainability. 

Here are some tips to help you manage your workload more effectively:

• Delegate tasks to your team
• Set clear priorities 
• Take breaks when needed
• Focus on what matters most

What strategies do you use to manage your business demands? Share your thoughts in the comments below.

Follow for more business tips!`
    },
    {
      name: 'Partially Authentic (Needs Formatting)',
      content: `Control is killing your growth. You think micromanaging shows leadership. But what it really shows is fear. 

The best founders I work with don't manage every detail. Research from Harvard Business School shows that leaders who delegate effectively see 23% higher revenue growth.

Most leaders do this. But the ones who thrive do something different.

Stop controlling everything.`
    },
    {
      name: 'Already Authentic Andrew Style',
      content: `Control is killing your growth.

And your team knows it.

You think micromanaging shows leadership.
But what it really shows… is fear.

💡 The best founders I work with don't manage every detail.
Research from Harvard Business School shows that leaders who delegate effectively see 23% higher revenue growth.

Here's the truth:

1️⃣ Micromanagement destroys trust
2️⃣ Your team stops thinking for themselves  
3️⃣ You become the bottleneck in your own success

Because when you control everything…
You control nothing.

That's not leadership.
That's survival.

-------------------------------------------------------
▶️ Follow me if you're a CEO or founder scaling fast and refusing to burn out doing it.

🧭 P.S. Subscribe to Self-Coaching for Leaders - my newsletter where I share the strategies that help leaders thrive without burning out.
♻️ Repost if this feels like something your network needs to hear.`
    }
  ]

  for (const testCase of testContents) {
    console.log(`\n📝 Testing: ${testCase.name}`)
    console.log('=' + '='.repeat(testCase.name.length + 10))
    
    try {
      // Step 1: Quick authenticity check
      console.log('\n1️⃣ Quick Authenticity Check:')
      const quickCheck = await authenticityValidator.quickAuthenticityCheck(testCase.content)
      console.log(`   Score: ${quickCheck.score}/100`)
      console.log(`   Passes: ${quickCheck.passes ? '✅ YES' : '❌ NO'}`)
      if (quickCheck.critical_issues.length > 0) {
        console.log(`   Issues: ${quickCheck.critical_issues.join(', ')}`)
      }

      // Step 2: Apply formatting if needed
      let finalContent = testCase.content
      if (!quickCheck.passes) {
        console.log('\n2️⃣ Applying Formatting Engine:')
        const formattingResult = await formattingEngine.applyAndrewFormatting(testCase.content)
        finalContent = formattingResult.formatted_content
        console.log(`   Structure Applied: ${formattingResult.structure_applied}`)
        console.log(`   Elements Added: ${formattingResult.elements_added.join(', ')}`)
        console.log(`   Authenticity Boost: +${formattingResult.authenticity_boost} points`)
        console.log(`   Confidence: ${Math.round(formattingResult.formatting_confidence * 100)}%`)
      } else {
        console.log('\n2️⃣ Formatting Engine: SKIPPED (already passes quick check)')
      }

      // Step 3: Full authenticity validation
      console.log('\n3️⃣ Full Authenticity Validation:')
      const fullValidation = await authenticityValidator.validateAuthenticity(finalContent)
      console.log(`   Passes "Fool Me" Test: ${fullValidation.passes_fool_me_test ? '✅ YES' : '❌ NO'}`)
      console.log(`   Overall Score: ${fullValidation.overall_authenticity_score}/100`)
      console.log(`   Confidence Level: ${Math.round(fullValidation.confidence_level * 100)}%`)
      
      console.log('\n   📊 Detailed Scoring:')
      console.log(`   • Surface vs Depth: ${fullValidation.depth_analysis.surface_vs_depth_score}/100`)
      console.log(`   • Psychological Insight: ${fullValidation.depth_analysis.psychological_insight_score}/100`)
      console.log(`   • Research Credibility: ${fullValidation.depth_analysis.research_credibility_score}/100`)
      console.log(`   • Vulnerability-Authority Balance: ${fullValidation.depth_analysis.vulnerability_authority_balance}/100`)
      
      console.log('\n   🎯 Voice Signature Analysis:')
      console.log(`   • Confrontational Edge: ${fullValidation.voice_signature_analysis.confrontational_edge_score}/100`)
      console.log(`   • Andrew Phrases: ${fullValidation.voice_signature_analysis.andrew_phrases_score}/100`)
      console.log(`   • Formatting Signature: ${fullValidation.voice_signature_analysis.formatting_signature_score}/100`)
      console.log(`   • CTA Authenticity: ${fullValidation.voice_signature_analysis.cta_authenticity_score}/100`)

      console.log('\n   💬 Validation Feedback:')
      fullValidation.validation_feedback.forEach((feedback, i) => {
        console.log(`   ${i + 1}. ${feedback}`)
      })

      if (fullValidation.improvement_recommendations.length > 0) {
        console.log('\n   🔧 Improvement Recommendations:')
        fullValidation.improvement_recommendations.slice(0, 3).forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`)
        })
      }

      // Step 4: Show formatted content if applied
      if (finalContent !== testCase.content) {
        console.log('\n4️⃣ Final Formatted Content:')
        console.log('---START---')
        console.log(finalContent)
        console.log('---END---')
      }

    } catch (error) {
      console.error(`❌ Error testing ${testCase.name}:`, error instanceof Error ? error.message : String(error))
    }

    console.log('\n' + '─'.repeat(80))
  }

  console.log('\n🎉 Authenticity System Testing Complete!')
  console.log('\nKey Improvements Implemented:')
  console.log('✅ Formatting Template Engine - Applies Andrew\'s signature structure')
  console.log('✅ Authenticity Validator - Validates "fool me" test compliance')
  console.log('✅ Enhanced Voice Pattern Analysis - Detects Andrew-specific patterns')
  console.log('✅ Content Pipeline Integration - Automatic authenticity enhancement')
  console.log('✅ Depth Scoring - Distinguishes surface advice from psychological insights')
}

// Run the test
testAuthenticitySystem()
  .then(() => {
    console.log('\n✅ Test completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })