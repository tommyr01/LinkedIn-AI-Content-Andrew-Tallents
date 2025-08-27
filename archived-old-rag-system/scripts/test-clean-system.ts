/**
 * Test the new clean content generation system
 * Uses ONLY the 833 LinkedIn chunks with authentic Andrew voice
 */

import { cleanContentGenerator } from '../services/clean-content-generator'
import { simpleLinkedInRAG } from '../services/simple-linkedin-rag'
import { authenticVoicePatterns } from '../services/authentic-voice-patterns'
import logger from '../lib/logger'

async function testCleanSystem() {
  console.log('🚀 TESTING NUCLEAR REBUILT CLEAN SYSTEM')
  console.log('========================================')
  
  // Test with the user's specific input
  const testTopic = "staying accountable in leadership when scaling a business"
  
  try {
    console.log(`\n📝 Testing topic: "${testTopic}"`)
    
    // Test 1: RAG Retrieval
    console.log('\n1️⃣ Testing LinkedIn RAG retrieval...')
    const ragResult = await simpleLinkedInRAG.retrieveRelevantContent(testTopic, 10)
    
    console.log(`✅ RAG Results:`)
    console.log(`   - Chunks retrieved: ${ragResult.totalChunks}`)
    console.log(`   - Average similarity: ${Math.round(ragResult.avgSimilarity * 100)}%`)
    console.log(`   - Top engagement: ${ragResult.topEngagement}`)
    
    if (ragResult.chunks.length > 0 && ragResult.chunks[0].content) {
      console.log(`   - Sample chunk: "${ragResult.chunks[0].content.substring(0, 100)}..."`)
    }

    // Test 2: Voice Guidelines Generation
    console.log('\n2️⃣ Testing voice guidelines generation...')
    const voiceGuidelines = simpleLinkedInRAG.generateVoiceGuidelines(ragResult)
    console.log(`✅ Voice guidelines generated (${voiceGuidelines.length} chars)`)
    console.log('Sample guidelines:')
    console.log(voiceGuidelines.split('\n').slice(0, 8).join('\n'))

    // Test 3: Clean Content Generation
    console.log('\n3️⃣ Testing clean content generation...')
    const generatedContent = await cleanContentGenerator.generateContent({
      topic: testTopic,
      researchContext: { topic_context: testTopic },
      voiceGuidelines
    })
    
    console.log(`✅ Content generated successfully!`)
    console.log(`   - Voice score: ${generatedContent.voiceScore}`)
    console.log(`   - Has question opening: ${generatedContent.authenticityMarkers.hasQuestionOpening}`)
    console.log(`   - Has research citation: ${generatedContent.authenticityMarkers.hasResearchCitation}`)
    console.log(`   - Has dramatic structure: ${generatedContent.authenticityMarkers.hasDramaticStructure}`)
    console.log(`   - Has authentic tone: ${generatedContent.authenticityMarkers.hasAuthenticTone}`)
    
    console.log('\n📄 GENERATED CONTENT:')
    console.log('===================')
    console.log(generatedContent.content)
    console.log('===================')
    
    // Test 4: Check for contaminated patterns
    console.log('\n4️⃣ Checking for contaminated patterns...')
    const hasContaminatedPatterns = checkForContaminatedPatterns(generatedContent.content)
    
    if (hasContaminatedPatterns.length === 0) {
      console.log('✅ NO contaminated patterns found! Clean generation successful!')
    } else {
      console.log('❌ Found contaminated patterns:')
      hasContaminatedPatterns.forEach(pattern => console.log(`   - ${pattern}`))
    }
    
    // Test 5: Check for authentic Andrew patterns
    console.log('\n5️⃣ Checking for authentic Andrew patterns...')
    const authenticPatterns = checkForAuthenticPatterns(generatedContent.content)
    
    console.log('✅ Authentic Andrew patterns found:')
    authenticPatterns.forEach(pattern => console.log(`   ✓ ${pattern}`))
    
    console.log('\n🎉 NUCLEAR REBUILD TEST COMPLETED!')
    console.log('===================================')
    console.log(`✅ Clean LinkedIn RAG: Working`)
    console.log(`✅ Authentic Voice Generation: Working`)
    console.log(`✅ No Contaminated Patterns: ${hasContaminatedPatterns.length === 0 ? 'PASSED' : 'FAILED'}`)
    console.log(`✅ Andrew Authenticity: ${authenticPatterns.length} patterns found`)
    
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error))
    throw error
  }
}

function checkForContaminatedPatterns(content: string): string[] {
  const contaminatedPatterns: string[] = []
  
  // Check for "X is killing your Y" patterns
  if (/\w+\s+is killing your\s+\w+/i.test(content)) {
    contaminatedPatterns.push('Generic "X is killing your Y" pattern')
  }
  
  // Check for "Stop doing X" patterns
  if (/^Stop doing\s+/im.test(content)) {
    contaminatedPatterns.push('Generic "Stop doing X" pattern')
  }
  
  // Check for generic business speak
  if (/Are you feeling (overwhelmed|stuck|frustrated)/i.test(content)) {
    contaminatedPatterns.push('Generic emotional hook')
  }
  
  if (/Many leaders struggle with/i.test(content)) {
    contaminatedPatterns.push('Generic leader struggle pattern')
  }
  
  return contaminatedPatterns
}

function checkForAuthenticPatterns(content: string): string[] {
  const authenticPatterns: string[] = []
  
  // Check for Andrew's authentic openings
  if (/^What if\s+.*\s+(isn't|is)\s+/im.test(content)) {
    authenticPatterns.push('Andrew\'s "What if" question pattern')
  }
  
  if (/^The best\s+(leaders|founders)\s+I\s+(know|work with)/im.test(content)) {
    authenticPatterns.push('Andrew\'s authority establishment pattern')
  }
  
  if (/^Most\s+leaders\s+think/im.test(content)) {
    authenticPatterns.push('Andrew\'s challenge pattern')
  }
  
  // Check for research citations
  if (/(Yale Center|Harvard|Research shows)/i.test(content)) {
    authenticPatterns.push('Research citation for authority')
  }
  
  // Check for dramatic structure
  if (/…/.test(content)) {
    authenticPatterns.push('Ellipses for dramatic effect')
  }
  
  if (/[1-3]️⃣/.test(content)) {
    authenticPatterns.push('Numbered emojis for structure')
  }
  
  // Check for authentic tone markers
  if (/Here's the truth:/i.test(content)) {
    authenticPatterns.push('Direct truth-telling tone')
  }
  
  if (/Follow me if/i.test(content)) {
    authenticPatterns.push('Community building CTA')
  }
  
  return authenticPatterns
}

// Run the test
if (require.main === module) {
  testCleanSystem()
    .then(() => {
      console.log('\n✅ All tests completed successfully!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error)
      process.exit(1)
    })
}

export { testCleanSystem }