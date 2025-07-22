import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'
import { createAirtableClient } from '@/lib/airtable'

const CommentGenerationSchema = z.object({
  postId: z.string(), // Airtable record ID for the influencer post
  postContent: z.string().optional(), // If not provided, will fetch from Airtable
  influencerName: z.string().optional(), // If not provided, will fetch from Airtable
  commentStyle: z.enum(['professional', 'engaging', 'thoughtful', 'supportive']).optional().default('professional'),
  maxLength: z.number().min(20).max(500).optional().default(200),
  includeCall2Action: z.boolean().optional().default(false),
  andrew_voice: z.boolean().optional().default(false) // Use Andrew's voice or generic
})

// Andrew Tallents' voice characteristics for comments
const ANDREW_VOICE_PROMPT = `
You are commenting as Andrew Tallents, a seasoned CEO coach and leadership expert with 20+ years of executive experience. Your commenting style is:

VOICE CHARACTERISTICS:
- Authentic and conversational, not corporate-speak
- Supportive and encouraging while offering practical insights
- Draws from real executive experience without being preachy
- Uses "I" statements when sharing experience: "In my experience..." "I've found that..."
- Asks thoughtful questions that provoke reflection
- Keeps comments concise but impactful
- Sometimes shares brief, relevant anecdotes from coaching or executive work

COMMENT APPROACH:
- Lead with appreciation/acknowledgment of the post
- Add a practical insight or perspective
- Often end with a thoughtful question or invitation to connect
- Avoid generic praise - be specific about what resonated
- Reference leadership, team dynamics, or growth when relevant

TONE: Professional yet personable, experienced but not condescending, coaching-oriented

AVOID:
- Generic comments like "Great post!" or "Thanks for sharing"
- Overly salesy or promotional language
- Buzzwords and corporate jargon
- Long-winded responses
- Making the comment about yourself rather than adding value

EXAMPLES OF ANDREW'S STYLE:
- "This resonates deeply. I've seen so many leaders struggle with delegation - it's often about trust, not capability. What's helped you build that trust with your team?"
- "The point about vulnerability in leadership is spot on. In my coaching work, I find executives who embrace this create the strongest cultures. Have you noticed a shift in team dynamics since adopting this approach?"
- "Powerful insight about the isolation of leadership. I often remind my clients that seeking support isn't weakness - it's strategic. What resources have been most valuable in your leadership journey?"
`

const GENERIC_PROFESSIONAL_PROMPT = `
You are generating a professional LinkedIn comment that adds value to the conversation. Your style should be:

- Professional yet approachable
- Insightful and thoughtful
- Supportive of the original post
- Brief but meaningful
- Avoids generic responses

Focus on:
- Acknowledging a specific point from the post
- Adding a complementary insight or perspective
- Ending with engagement (question, invitation to discuss, etc.)

Keep comments between 50-200 characters unless specifically requested otherwise.
`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      postId,
      postContent: providedContent,
      influencerName: providedName,
      commentStyle,
      maxLength,
      includeCall2Action,
      andrew_voice
    } = CommentGenerationSchema.parse(body)

    let postContent = providedContent
    let influencerName = providedName

    // If content not provided, fetch from Airtable
    if (!postContent || !influencerName) {
      const airtable = createAirtableClient()
      
      try {
        const posts = await airtable.getInfluencerPosts({
          filterByFormula: `RECORD_ID() = "${postId}"`,
          maxRecords: 1
        })

        if (posts.length === 0) {
          return NextResponse.json(
            { error: 'Post not found' },
            { status: 404 }
          )
        }

        const post = posts[0]
        postContent = post.fields['Content'] || ''
        
        // Get influencer name if we have the link
        if (post.fields['Influencer'] && post.fields['Influencer'].length > 0) {
          const influencers = await airtable.getInfluencers({
            filterByFormula: `RECORD_ID() = "${post.fields['Influencer'][0]}"`,
            maxRecords: 1
          })
          
          if (influencers.length > 0) {
            influencerName = influencers[0].fields['Name']
          }
        }

      } catch (airtableError) {
        console.error('Failed to fetch post from Airtable:', airtableError)
        return NextResponse.json(
          { error: 'Failed to fetch post details' },
          { status: 500 }
        )
      }
    }

    if (!postContent) {
      return NextResponse.json(
        { error: 'Post content is required' },
        { status: 400 }
      )
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Prepare the prompt
    const basePrompt = andrew_voice ? ANDREW_VOICE_PROMPT : GENERIC_PROFESSIONAL_PROMPT
    
    const styleInstructions = {
      professional: "Keep the tone professional and business-focused.",
      engaging: "Make the comment engaging and conversational to encourage discussion.",
      thoughtful: "Provide a thoughtful, reflective response that adds depth.",
      supportive: "Be encouraging and supportive while adding value."
    }

    const systemPrompt = `${basePrompt}

STYLE: ${styleInstructions[commentStyle]}
MAX LENGTH: ${maxLength} characters
${includeCall2Action ? 'Include a subtle call-to-action or invitation to connect.' : 'Focus purely on adding value to the conversation.'}
${influencerName ? `You are commenting on a post by ${influencerName}.` : ''}

Generate 3 different comment variations that follow these guidelines.`

    const userPrompt = `Generate professional LinkedIn comments for this post:

"${postContent}"

Requirements:
- Generate exactly 3 different comment variations
- Each comment should be unique in approach but consistent in quality
- Stay within ${maxLength} characters per comment
- ${andrew_voice ? 'Use Andrew Tallents voice and style' : 'Use professional business voice'}
- Style: ${commentStyle}

Return as JSON array with this structure:
{
  "comments": [
    {
      "text": "comment text here",
      "approach": "brief description of the approach",
      "length": character_count
    }
  ]
}`

    // Generate comments
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8, // Allow for creative variation
      max_tokens: 1000,
    })

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      throw new Error('No response from OpenAI')
    }

    // Parse the response
    let commentData
    try {
      commentData = JSON.parse(responseContent)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseContent)
      
      // Fallback: treat response as single comment
      commentData = {
        comments: [{
          text: responseContent.trim(),
          approach: 'Generated comment',
          length: responseContent.length
        }]
      }
    }

    // Validate and clean comments
    const comments = commentData.comments?.map((comment: any, index: number) => ({
      text: comment.text?.trim() || `Generated comment ${index + 1}`,
      approach: comment.approach || `Approach ${index + 1}`,
      length: comment.text?.length || 0,
      voice: andrew_voice ? 'andrew' : 'generic',
      style: commentStyle
    })) || []

    // Save to Airtable if valid comments were generated
    if (comments.length > 0) {
      try {
        const airtable = createAirtableClient()
        await airtable.createGeneratedComment({
          'Post': [postId],
          'Comment Variations': JSON.stringify(comments),
          'Posted Status': false,
          'Created': new Date().toISOString(),
        })
      } catch (airtableError) {
        console.error('Failed to save comments to Airtable:', airtableError)
        // Continue anyway - comments were generated successfully
      }
    }

    // Calculate quality scores (simple heuristic)
    const qualityScores = comments.map((comment: { text: string; length: number }) => {
      let score = 70 // Base score
      
      // Length appropriateness
      if (comment.length >= 50 && comment.length <= maxLength * 0.8) score += 10
      
      // Avoid generic phrases
      const genericPhrases = ['great post', 'thanks for sharing', 'very interesting']
      const hasGeneric = genericPhrases.some(phrase => 
        comment.text.toLowerCase().includes(phrase)
      )
      if (!hasGeneric) score += 10
      
      // Has question or engagement
      if (comment.text.includes('?') || comment.text.includes('What') || comment.text.includes('How')) {
        score += 10
      }
      
      // Personal touch (for Andrew's voice)
      if (andrew_voice && (comment.text.includes('experience') || comment.text.includes('I\'ve'))) {
        score += 5
      }
      
      return Math.min(score, 100)
    })

    return NextResponse.json({
      success: true,
      postId,
      comments: comments.map((comment, index) => ({
        ...comment,
        qualityScore: qualityScores[index],
        id: `comment_${Date.now()}_${index}`
      })),
      metadata: {
        influencerName,
        postPreview: postContent.substring(0, 100) + '...',
        generatedAt: new Date().toISOString(),
        model: 'gpt-4',
        voice: andrew_voice ? 'andrew_tallents' : 'professional',
        style: commentStyle
      }
    })

  } catch (error) {
    console.error('Comment generation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET method to retrieve generated comments for a post
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const airtable = createAirtableClient()
    const comments = await airtable.getGeneratedComments({
      filterByFormula: `FIND("${postId}", ARRAYJOIN({Post}))`,
      sort: [{ field: 'Created', direction: 'desc' }],
      maxRecords: 10
    })

    const parsedComments = comments.map(comment => ({
      id: comment.id,
      variations: JSON.parse(comment.fields['Comment Variations'] || '[]'),
      selectedComment: comment.fields['Selected Comment'],
      posted: comment.fields['Posted Status'],
      postedAt: comment.fields['Posted At'],
      createdAt: comment.fields['Created']
    }))

    return NextResponse.json({
      success: true,
      postId,
      comments: parsedComments
    })

  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}