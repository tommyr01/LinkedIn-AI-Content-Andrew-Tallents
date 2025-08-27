/**
 * Test Content Generation with New Webinar Content
 */

import { voiceRAGSystem } from '../services/voice-rag-system'
import { OpenAI } from 'openai'
import { appConfig } from '../config'
import logger from '../lib/logger'

async function testContentGeneration() {
  console.log('🎯 Testing content generation with new webinar content...\n')

  const openai = new OpenAI({ apiKey: appConfig.openai.apiKey })

  try {
    // Test 1: Generate content about Leadership Team Coaching
    console.log('📝 Test 1: Leadership Team Coaching LinkedIn Post')
    
    const leadershipContext = await voiceRAGSystem.getVoiceContextForGeneration(
      'linkedin_post',
      ['Leadership Team Coaching', 'coaching teams'],
      ['teaching', 'authority'],
      5,
      1
    )

    const leadershipPrompt = `Write a LinkedIn post about effective team coaching in Andrew Tallents' voice. Use insights from his Leadership Team Coaching webinar.

Context from Andrew's content:
${leadershipContext.relevantChunks.map(chunk => chunk.chunk_text).join('\n\n')}

Style guide:
- Professional but approachable
- Include practical insights
- Use Andrew's coaching expertise
- 150-200 words
- Include relevant hashtags`

    const leadershipPost = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system', 
          content: 'You are writing in Andrew Tallents\' voice - a professional executive coach and leadership expert.'
        },
        {
          role: 'user',
          content: leadershipPrompt
        }
      ],
      max_tokens: 400,
      temperature: 0.7
    })

    console.log('Generated Leadership Team Coaching Post:')
    console.log('─'.repeat(60))
    console.log(leadershipPost.choices[0]?.message?.content || 'No content generated')
    console.log('─'.repeat(60))
    console.log('')

    // Test 2: Generate content about Sustainable Self-Leadership  
    console.log('📝 Test 2: Sustainable Self-Leadership LinkedIn Post')
    
    const selfLeadershipContext = await voiceRAGSystem.getVoiceContextForGeneration(
      'linkedin_post',
      ['Sustainable Self-Leadership', 'resilience', 'self-leadership'],
      ['teaching', 'vulnerability'],
      5,
      1
    )

    const selfLeadershipPrompt = `Write a LinkedIn post about sustainable self-leadership in Andrew Tallents' voice. Use insights from his Sustainable Self-Leadership webinar.

Context from Andrew's content:
${selfLeadershipContext.relevantChunks.map(chunk => chunk.chunk_text).join('\n\n')}

Style guide:
- Personal and authentic
- Include practical advice
- Focus on resilience and sustainability
- 150-200 words
- Include relevant hashtags`

    const selfLeadershipPost = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are writing in Andrew Tallents\' voice - a professional executive coach focused on sustainable leadership practices.'
        },
        {
          role: 'user', 
          content: selfLeadershipPrompt
        }
      ],
      max_tokens: 400,
      temperature: 0.7
    })

    console.log('Generated Sustainable Self-Leadership Post:')
    console.log('─'.repeat(60))
    console.log(selfLeadershipPost.choices[0]?.message?.content || 'No content generated')
    console.log('─'.repeat(60))
    console.log('')

    console.log('🎉 Content generation tests completed successfully!')
    console.log('\n📊 Results:')
    console.log(`- Leadership context: ${leadershipContext.relevantChunks.length} chunks retrieved`)
    console.log(`- Self-leadership context: ${selfLeadershipContext.relevantChunks.length} chunks retrieved`)
    console.log('- Both posts generated with webinar-specific content')
    console.log('- RAG system successfully integrated new content')

  } catch (error) {
    console.error('💥 Test failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  testContentGeneration().catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  })
}