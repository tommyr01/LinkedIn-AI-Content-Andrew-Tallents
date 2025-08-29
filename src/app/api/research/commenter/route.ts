import { NextRequest, NextResponse } from 'next/server'
import { linkedInScraper, extractUsernameFromLinkedInUrl } from '../../../../lib/linkedin-scraper'
import { SupabaseLinkedInService } from '../../../../lib/supabase-linkedin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Helper function to calculate tenure months from LinkedIn experience data
function calculateTenureMonths(linkedInData: any): number {
  // Find the current role (is_current: true)
  const currentExperience = linkedInData.data?.experience?.find((exp: any) => exp.is_current === true)
  
  if (!currentExperience?.duration) {
    return 0
  }
  
  // Parse duration string like "Feb 2023 - Present · 2 yrs 7 mos"
  const duration = currentExperience.duration
  
  // Extract the part after the "·" symbol
  const durationPart = duration.split('·')[1]?.trim()
  if (!durationPart) {
    return 0
  }
  
  let totalMonths = 0
  
  // Parse years (e.g., "2 yrs")
  const yearMatch = durationPart.match(/(\d+)\s*yrs?/)
  if (yearMatch) {
    totalMonths += parseInt(yearMatch[1]) * 12
  }
  
  // Parse months (e.g., "7 mos")
  const monthMatch = durationPart.match(/(\d+)\s*mos?/)
  if (monthMatch) {
    totalMonths += parseInt(monthMatch[1])
  }
  
  // If no years or months found, check for just "X mos" or "X yrs"
  if (totalMonths === 0) {
    if (durationPart.includes('mo')) {
      const singleMonthMatch = durationPart.match(/(\d+)/)
      if (singleMonthMatch) {
        totalMonths = parseInt(singleMonthMatch[1])
      }
    } else if (durationPart.includes('yr')) {
      const singleYearMatch = durationPart.match(/(\d+)/)
      if (singleYearMatch) {
        totalMonths = parseInt(singleYearMatch[1]) * 12
      }
    }
  }
  
  return totalMonths
}

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

    // First, fetch LinkedIn profile data to get the raw experience data
    const profileData = await linkedInScraper.getProfile(username)
    
    if (!profileData.success) {
      throw new Error(profileData.message || 'Failed to fetch LinkedIn profile')
    }

    // Initialize LinkedIn Supabase client for enhanced scoring
    const linkedInClient = new SupabaseLinkedInService()
    
    // Create mock comment to use the enhanced scoring system
    const mockComment = {
      author: {
        name: name || profileData.data.basic_info.fullname || 'Unknown',
        headline: headline || profileData.data.basic_info.headline || '',
        profile_url: profileUrl
      }
    }
    
    // Use enhanced lead scoring system
    const enhancedProfile = await linkedInClient.researchCommentAuthor(mockComment as any)
    
    if (!enhancedProfile) {
      throw new Error('Failed to research profile with enhanced scoring system')
    }
    
    console.log(`✅ Research completed for ${enhancedProfile.name}`)
    console.log(`📊 ICP Score: ${enhancedProfile.icpScore.totalScore} (${enhancedProfile.icpScore.category})`)

    // TODO: Cache the result in Airtable "Researched Prospects" table
    // This would help avoid duplicate API calls and provide research history

    // Calculate tenure months for display
    const tenureMonths = calculateTenureMonths(profileData)
    
    // Transform the enhanced breakdown format to the old format expected by UI
    const transformedBreakdown = {
      roleMatch: enhancedProfile.icpScore.breakdown?.role?.score || 0,
      companySize: enhancedProfile.icpScore.breakdown?.companySize?.score || 0,
      industry: enhancedProfile.icpScore.breakdown?.industry?.score || 0,
      tenure: enhancedProfile.icpScore.breakdown?.tenure?.score || 0,
      careerTransition: enhancedProfile.icpScore.breakdown?.recentTransition?.score || 0,
      leadership: enhancedProfile.icpScore.breakdown?.leadershipExperience?.score || 0,
      engagement: enhancedProfile.icpScore.breakdown?.engagementLevel?.score || 0
    }
    
    // Extract reasoning for each factor if needed
    const breakdownReasoning = Object.entries(enhancedProfile.icpScore.breakdown || {}).reduce((acc, [key, value]) => {
      if (value && typeof value === 'object' && 'reasoning' in value) {
        acc[key] = value.reasoning
      }
      return acc
    }, {} as Record<string, string>)
    
    return NextResponse.json({
      success: true,
      prospect: {
        ...enhancedProfile,
        tenureMonths,
        icpScore: {
          ...enhancedProfile.icpScore,
          breakdown: transformedBreakdown,
          breakdownReasoning // Keep reasoning separate for potential future use
        }
      },
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