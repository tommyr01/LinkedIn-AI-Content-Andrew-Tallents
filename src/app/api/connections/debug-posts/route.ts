import { NextRequest, NextResponse } from 'next/server'
import { linkedInScraper } from '@/lib/linkedin-scraper'
import { createConnectionPosts, ConnectionPostRecord } from '@/lib/airtable-http'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const username = searchParams.get('username') || 'andrewtallents'
    const connectionId = searchParams.get('connectionId') || 'rec123test' // Use a test connection ID
    const step = searchParams.get('step') || 'all'
    
    console.log(`🔍 Debugging posts for username: ${username}, step: ${step}`)
    
    const results: any = {
      configuration: {
        hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
        rapidApiKeyLength: process.env.RAPIDAPI_KEY?.length || 0,
        hasConnectionPostsTableId: !!process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID,
        connectionPostsTableId: process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID,
        hasAirtableConfig: !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID)
      }
    }
    
    // Step 1: Test LinkedIn Posts API
    if (step === 'all' || step === 'linkedin') {
      console.log(`📝 Step 1: Testing LinkedIn Posts API...`)
      try {
        const posts = await linkedInScraper.getAllPosts(username, 3) // Just get 3 posts for testing
        results.linkedinPosts = {
          success: true,
          count: posts.length,
          samplePost: posts[0] ? {
            urn: posts[0].urn,
            textPreview: posts[0].text?.substring(0, 100) + '...',
            engagement: {
              likes: posts[0].stats?.like,
              comments: posts[0].stats?.comments,
              reposts: posts[0].stats?.reposts
            },
            author: posts[0].author,
            hasMedia: !!posts[0].media
          } : null,
          allPosts: posts.map(p => ({
            urn: p.urn,
            preview: p.text?.substring(0, 50) + '...',
            posted_at: p.posted_at,
            engagement: `${p.stats?.like || 0}L, ${p.stats?.comments || 0}C, ${p.stats?.reposts || 0}S`
          }))
        }
        console.log(`✅ LinkedIn API success: ${posts.length} posts fetched`)
      } catch (linkedinError: any) {
        results.linkedinPosts = {
          success: false,
          error: linkedinError.message,
          stack: linkedinError.stack
        }
        console.error(`❌ LinkedIn API failed:`, linkedinError.message)
      }
    }
    
    // Step 2: Test Airtable Posts Creation
    if (step === 'all' || step === 'airtable') {
      console.log(`📝 Step 2: Testing Airtable Posts Creation...`)
      try {
        // Create a minimal test post with correct field names
        const testPosts: Partial<ConnectionPostRecord['fields']>[] = [{
          'Connection': [connectionId], // NOTE: You must add this field to your Airtable table
          'Post URN': 'test-post-' + Date.now(),
          'Full URN': 'test-full-urn-' + Date.now(),
          'Posted Date': new Date().toISOString(),
          'Post Type': 'Test',
          'Post Text': 'This is a test post to verify Airtable integration with correct field names',
          'Post URL': 'https://linkedin.com/posts/test',
          'Author First Name': 'Test',
          'Author Last Name': 'Author',
          'Username': username,
          'Author LinkedIn URL': 'https://linkedin.com/in/' + username,
          'Total Reactions': 13,
          'Likes': 10,
          'Comments Count': 2,
          'Reposts': 1,
          'Media Type': '',
          'Media URL': ''
        }]
        
        console.log(`🗂️ Attempting to create test post in Airtable...`)
        const createdPosts = await createConnectionPosts(testPosts)
        
        results.airtablePosts = {
          success: true,
          created: createdPosts.length,
          recordIds: createdPosts.map(p => p.id),
          sampleRecord: createdPosts[0]
        }
        console.log(`✅ Airtable success: ${createdPosts.length} posts created`)
      } catch (airtableError: any) {
        results.airtablePosts = {
          success: false,
          error: airtableError.message,
          stack: airtableError.stack
        }
        console.error(`❌ Airtable failed:`, airtableError.message)
      }
    }
    
    // Step 3: Test Full Integration
    if (step === 'all' || step === 'integration') {
      console.log(`📝 Step 3: Testing Full Integration...`)
      if (results.linkedinPosts?.success && results.airtablePosts?.success) {
        try {
          // Fetch real posts and try to save them
          const posts = await linkedInScraper.getAllPosts(username, 2)
          
          const connectionPosts: Partial<ConnectionPostRecord['fields']>[] = posts.map(post => {
            const mappedPost: Partial<ConnectionPostRecord['fields']> = {
              'Connection': [connectionId],
              'Post URN': post.urn || '',
              'Full URN': post.full_urn || '',
              'Posted Date': typeof post.posted_at === 'object' && post.posted_at?.date 
                ? post.posted_at.date 
                : (typeof post.posted_at === 'string' ? post.posted_at : ''),
              'Post Type': post.post_type || 'Post',
              'Post Text': post.text || '',
              'Post URL': post.url || '',
              'Author First Name': post.author?.first_name || '',
              'Author Last Name': post.author?.last_name || '',
              'Author Headline': post.author?.headline || '',
              'Username': post.author?.username || username,
              'Author LinkedIn URL': post.author?.profile_url || '',
              'Total Reactions': post.stats?.total_reactions || 0,
              'Likes': post.stats?.like || 0,
              'Support': post.stats?.support || 0,
              'Love': post.stats?.love || 0,
              'Insight': post.stats?.insight || 0,
              'Celebrate': post.stats?.celebrate || 0,
              'Comments Count': post.stats?.comments || 0,
              'Reposts': post.stats?.reposts || 0,
              'Media Type': post.media?.type || '',
              'Media URL': post.media?.url || '',
              'Media Thumbnail': post.media?.thumbnail || ''
            };
            
            // Handle Author Profile Picture as attachment
            if (post.author?.profile_picture && post.author.profile_picture !== '') {
              mappedPost['Author Profile Picture'] = [{
                url: post.author.profile_picture,
                filename: 'author-profile-picture.jpg',
                id: '',
                type: 'image/jpeg',
                size: 0
              }];
            }
            
            return mappedPost;
          })
          
          const fullResults = await createConnectionPosts(connectionPosts)
          results.fullIntegration = {
            success: true,
            postsProcessed: posts.length,
            recordsCreated: fullResults.length,
            recordIds: fullResults.map(r => r.id)
          }
          console.log(`✅ Full integration success: ${fullResults.length} real posts saved`)
        } catch (integrationError: any) {
          results.fullIntegration = {
            success: false,
            error: integrationError.message,
            stack: integrationError.stack
          }
          console.error(`❌ Full integration failed:`, integrationError.message)
        }
      } else {
        results.fullIntegration = {
          success: false,
          error: 'Prerequisites failed - LinkedIn or Airtable tests must pass first'
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Posts debugging complete for step: ${step}`,
      username,
      connectionId,
      results
    })
    
  } catch (error: any) {
    console.error('Error in posts debugging:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Posts debugging failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}