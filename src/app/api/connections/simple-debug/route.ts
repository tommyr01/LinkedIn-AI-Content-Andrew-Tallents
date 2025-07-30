import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  console.log('🔍 Simple debug endpoint called')
  
  try {
    const searchParams = request.nextUrl.searchParams
    const step = searchParams.get('step') || '1'
    
    console.log(`Testing step: ${step}`)
    
    // Step 1: Basic environment check
    if (step === '1') {
      const envCheck = {
        hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
        rapidApiKeyLength: process.env.RAPIDAPI_KEY?.length || 0,
        hasAirtableApiKey: !!process.env.AIRTABLE_API_KEY,
        hasAirtableBaseId: !!process.env.AIRTABLE_BASE_ID,
        hasConnectionPostsTableId: !!process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID,
        connectionPostsTableId: process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID
      }
      
      console.log('Environment check:', envCheck)
      
      return NextResponse.json({
        success: true,
        message: 'Environment check complete',
        data: envCheck
      })
    }
    
    // Step 2: Test LinkedIn scraper import
    if (step === '2') {
      console.log('Testing LinkedIn scraper import...')
      const { linkedInScraper } = await import('@/lib/linkedin-scraper')
      
      return NextResponse.json({
        success: true,
        message: 'LinkedIn scraper imported successfully',
        data: { scraperLoaded: !!linkedInScraper }
      })
    }
    
    // Step 3: Test Airtable import
    if (step === '3') {
      console.log('Testing Airtable import...')
      const { createConnectionPosts } = await import('@/lib/airtable-http')
      
      return NextResponse.json({
        success: true,
        message: 'Airtable functions imported successfully',
        data: { airtableFunctionLoaded: !!createConnectionPosts }
      })
    }
    
    // Step 4: Test simple LinkedIn API call
    if (step === '4') {
      console.log('Testing LinkedIn API call...')
      const { linkedInScraper } = await import('@/lib/linkedin-scraper')
      
      try {
        const posts = await linkedInScraper.getAllPosts('andrewtallents', 1)
        return NextResponse.json({
          success: true,
          message: 'LinkedIn API test successful',
          data: {
            postsCount: posts.length,
            firstPost: posts[0] ? {
              id: posts[0].id,
              textPreview: posts[0].text?.substring(0, 50)
            } : null
          }
        })
      } catch (linkedinError: any) {
        return NextResponse.json({
          success: false,
          message: 'LinkedIn API test failed',
          error: linkedinError.message
        })
      }
    }
    
    // Step 5: Test simple Airtable creation
    if (step === '5') {
      console.log('Testing Airtable creation...')
      const { createConnectionPosts } = await import('@/lib/airtable-http')
      
      const testPost = [{
        'Post URN': 'simple-test-' + Date.now(),
        'Post Text': 'Simple test post',
        'Posted Date': new Date().toISOString(),
        'Likes': 5,
        'Comments Count': 1
        // Note: Not including Connection field for this basic test
      }]
      
      try {
        const result = await createConnectionPosts(testPost)
        return NextResponse.json({
          success: true,
          message: 'Airtable creation test successful',
          data: {
            recordsCreated: result.length,
            recordIds: result.map(r => r.id)
          }
        })
      } catch (airtableError: any) {
        return NextResponse.json({
          success: false,
          message: 'Airtable creation test failed',
          error: airtableError.message,
          details: {
            statusCode: airtableError.statusCode,
            name: airtableError.name
          }
        })
      }
    }
    
    return NextResponse.json({
      success: false,
      message: 'Invalid step. Use steps 1-5.',
      availableSteps: [
        '1: Environment check',
        '2: LinkedIn scraper import test',
        '3: Airtable import test', 
        '4: LinkedIn API test',
        '5: Airtable creation test'
      ]
    })
    
  } catch (error: any) {
    console.error('Simple debug error:', error)
    return NextResponse.json({
      success: false,
      message: 'Debug endpoint error',
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    }, { status: 500 })
  }
}