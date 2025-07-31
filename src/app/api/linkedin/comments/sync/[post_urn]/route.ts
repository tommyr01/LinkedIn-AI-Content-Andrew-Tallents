import { NextRequest, NextResponse } from 'next/server'
import { supabaseLinkedIn, type LinkedInComment } from '@/lib/supabase-linkedin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RapidAPICommentsResponse {
  success: boolean
  message: string
  data: {
    post: {
      id: string
      url: string
    }
    comments: LinkedInComment[]
    total: number
    meta: {
      pageNumber: number
      sortOrder: string
      commentsCount: number
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { post_urn: string } }
) {
  try {
    const postUrn = params.post_urn
    console.log(`🔄 Starting comments sync for post: ${postUrn}`)

    if (!process.env.RAPIDAPI_KEY || !process.env.RAPIDAPI_HOST) {
      return NextResponse.json({ 
        error: 'Missing RapidAPI configuration' 
      }, { status: 500 })
    }

    // Get the post to extract LinkedIn URL
    const post = await supabaseLinkedIn.getPostByUrn(postUrn)
    if (!post) {
      return NextResponse.json({ 
        error: 'Post not found in database' 
      }, { status: 404 })
    }

    const postUrl = post.url
    console.log(`📡 Fetching comments for URL: ${postUrl}`)

    // Fetch comments from RapidAPI
    const rapidApiUrl = `https://${process.env.RAPIDAPI_HOST}/post/comments?post_url=${encodeURIComponent(postUrl)}&page_number=1&sort_order=Most%20relevant`
    
    const response = await fetch(rapidApiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': process.env.RAPIDAPI_HOST,
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('RapidAPI comments error:', response.status, errorText)
      
      if (response.status === 429) {
        return NextResponse.json({ 
          error: 'Rate limit exceeded. Please try again later.',
          details: errorText
        }, { status: 429 })
      }
      
      throw new Error(`RapidAPI request failed: ${response.status} - ${errorText}`)
    }

    const data: RapidAPICommentsResponse = await response.json()
    
    if (!data.success) {
      throw new Error(`RapidAPI returned error: ${data.message}`)
    }

    const comments = data.data.comments || []
    console.log(`✅ Fetched ${comments.length} comments`)

    // Process and save comments
    const results = []
    let newComments = 0
    let updatedComments = 0
    let researchedProfiles = 0
    let errors = 0

    for (const comment of comments) {
      try {
        // Save comment to database
        const savedComment = await supabaseLinkedIn.upsertComment(comment, postUrn)
        
        // Research the comment author for ICP scoring
        let prospectProfile = null
        try {
          prospectProfile = await supabaseLinkedIn.researchCommentAuthor(comment)
          if (prospectProfile) {
            researchedProfiles++
            
            // Update comment with ICP scoring
            await supabaseLinkedIn.upsertComment({
              ...comment,
              icp_score: prospectProfile.icpScore.totalScore,
              icp_category: prospectProfile.icpScore.category,
              icp_breakdown: prospectProfile.icpScore.breakdown,
              icp_tags: prospectProfile.icpScore.tags,
              icp_reasoning: prospectProfile.icpScore.reasoning,
              profile_researched: true,
              research_completed_at: new Date().toISOString()
            } as any, postUrn)
          }
        } catch (researchError: any) {
          console.warn(`⚠️ Profile research failed for ${comment.author.name}:`, researchError.message)
        }

        results.push({
          comment_id: comment.comment_id,
          author: comment.author.name,
          status: 'processed',
          icp_score: prospectProfile?.icpScore.totalScore || null,
          icp_category: prospectProfile?.icpScore.category || null,
          engagement: comment.stats.total_reactions
        })

        newComments++
        console.log(`✅ Processed comment from ${comment.author.name} (ICP: ${prospectProfile?.icpScore.totalScore || 'N/A'})`)
        
      } catch (error: any) {
        console.error(`❌ Error processing comment ${comment.comment_id}:`, error.message)
        errors++
        
        results.push({
          comment_id: comment.comment_id,
          author: comment.author.name,
          status: 'error',
          error: error.message
        })
      }
    }

    // Update post comments count
    try {
      await supabaseLinkedIn.upsertPost({
        ...post,
        stats: {
          ...post,
          comments: comments.length
        }
      } as any)
    } catch (updateError) {
      console.warn('Failed to update post comment count:', updateError)
    }

    const summary = {
      postUrn,
      totalComments: comments.length,
      newComments,
      updatedComments,
      researchedProfiles,
      errors,
      highValueProspects: results.filter(r => r.icp_score && r.icp_score >= 60).length
    }

    console.log('📈 Comments Sync Summary:', summary)

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${comments.length} comments`,
      data: {
        postUrn,
        comments: results,
        summary,
        highValueProspects: results.filter(r => r.icp_score && r.icp_score >= 60),
        nextActions: [
          'Review high-value prospects',
          'Generate engagement responses',
          'Add qualified leads to connections'
        ]
      }
    })

  } catch (error: any) {
    console.error('❌ LinkedIn comments sync failed:', error)
    
    return NextResponse.json({ 
      success: false,
      error: 'LinkedIn comments sync failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// GET endpoint for checking comments sync status
export async function GET(
  request: NextRequest,
  { params }: { params: { post_urn: string } }
) {
  try {
    const postUrn = params.post_urn
    
    // Get comments from database
    const comments = await supabaseLinkedIn.getCommentsByPostUrn(postUrn)
    
    const stats = {
      totalComments: comments.length,
      researchedProfiles: comments.filter(c => c.profile_researched).length,
      highValueProspects: comments.filter(c => c.icp_score && c.icp_score >= 60).length,
      avgIcpScore: comments.length > 0 
        ? Math.round(comments.filter(c => c.icp_score).reduce((sum, c) => sum + (c.icp_score || 0), 0) / comments.filter(c => c.icp_score).length)
        : 0
    }

    return NextResponse.json({
      success: true,
      data: {
        postUrn,
        stats,
        recentComments: comments.slice(0, 10).map(comment => ({
          comment_id: comment.comment_id,
          author: comment.author_name,
          text: comment.text.substring(0, 150) + '...',
          posted_at: comment.posted_at,
          icp_score: comment.icp_score,
          icp_category: comment.icp_category,
          total_reactions: comment.total_reactions
        })),
        prospects: comments
          .filter(c => c.icp_score && c.icp_score >= 60)
          .map(c => ({
            name: c.author_name,
            headline: c.author_headline,
            profile_url: c.author_profile_url,
            icp_score: c.icp_score,
            icp_category: c.icp_category,
            icp_tags: c.icp_tags
          }))
      }
    })
    
  } catch (error: any) {
    console.error('Error getting comments sync status:', error)
    
    return NextResponse.json({ 
      error: 'Failed to get comments sync status',
      details: error.message 
    }, { status: 500 })
  }
}