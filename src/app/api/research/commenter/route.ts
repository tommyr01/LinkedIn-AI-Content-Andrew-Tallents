import { NextRequest, NextResponse } from 'next/server'
import { linkedInScraper, extractUsernameFromLinkedInUrl } from '../../../../lib/linkedin-scraper'
import { icpScorer, ProspectProfile } from '../../../../lib/icp-scorer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Researching LinkedIn commenter...')

    // Check required environment variables
    if (!process.env.RAPIDAPI_KEY) {
      return NextResponse.json({ 
        error: 'Missing required RapidAPI configuration' 
      }, { status: 500 })
    }

    const body = await request.json()
    const { profileUrl, name, headline } = body

    if (!profileUrl) {
      return NextResponse.json({ 
        error: 'Missing required profileUrl parameter' 
      }, { status: 400 })
    }

    console.log(`📡 Researching profile: ${profileUrl}`)

    // Extract username from LinkedIn URL
    const username = extractUsernameFromLinkedInUrl(profileUrl)
    if (!username) {
      return NextResponse.json({ 
        error: 'Invalid LinkedIn profile URL' 
      }, { status: 400 })
    }

    // Check cache first (optional - implement later)
    // For now, fetch fresh data each time

    // Fetch LinkedIn profile data
    const profileData = await linkedInScraper.getProfile(username)
    
    if (!profileData.success) {
      throw new Error(profileData.message || 'Failed to fetch LinkedIn profile')
    }

    // Score the profile using ICP criteria
    const prospectProfile: ProspectProfile = icpScorer.createProspectProfile(profileData, profileUrl)
    
    console.log(`✅ Research completed for ${prospectProfile.name}`)
    console.log(`📊 ICP Score: ${prospectProfile.icpScore.totalScore} (${prospectProfile.icpScore.category})`)

    // TODO: Cache the result in Airtable "Researched Prospects" table
    // This would help avoid duplicate API calls and provide research history

    return NextResponse.json({
      success: true,
      prospect: prospectProfile,
      meta: {
        researchedAt: new Date().toISOString(),
        source: 'linkedin-comment',
        cached: false
      }
    })

  } catch (error: any) {
    console.error('Error researching commenter:', error)
    
    // Handle specific LinkedIn API errors
    if (error.message?.includes('LinkedIn API error')) {
      return NextResponse.json({ 
        error: 'Failed to fetch LinkedIn profile data',
        details: error.message
      }, { status: 502 })
    }

    // Handle rate limiting
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      return NextResponse.json({ 
        error: 'LinkedIn API rate limit exceeded. Please try again later.',
        details: error.message
      }, { status: 429 })
    }

    return NextResponse.json({ 
      error: 'Failed to research commenter',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Handle GET requests for cached research results
    const searchParams = request.nextUrl.searchParams
    const profileUrl = searchParams.get('profileUrl')

    if (!profileUrl) {
      return NextResponse.json({ 
        error: 'Missing required profileUrl parameter' 
      }, { status: 400 })
    }

    // TODO: Check cache in Airtable for existing research
    // For now, return not found to trigger fresh research

    return NextResponse.json({
      success: false,
      cached: false,
      message: 'No cached research found'
    }, { status: 404 })

  } catch (error: any) {
    console.error('Error fetching cached research:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch cached research',
      details: error.message
    }, { status: 500 })
  }
}