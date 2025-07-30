import { NextRequest, NextResponse } from 'next/server'
import { linkedInScraper, extractUsernameFromLinkedInUrl } from '@/lib/linkedin-scraper'
import { createConnection } from '@/lib/airtable-http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, linkedinUrl, createRecord = true } = body

    if (!username && !linkedinUrl) {
      return NextResponse.json({ 
        error: 'Either username or linkedinUrl is required' 
      }, { status: 400 })
    }

    // Extract username from URL if provided
    const usernameToUse = username || extractUsernameFromLinkedInUrl(linkedinUrl)
    
    if (!usernameToUse) {
      return NextResponse.json({ 
        error: 'Invalid LinkedIn URL or username' 
      }, { status: 400 })
    }

    console.log(`Enriching profile for username: ${usernameToUse}`)

    // Fetch LinkedIn profile data
    const profile = await linkedInScraper.getProfile(usernameToUse)
    
    // Map to Airtable fields
    const mappedData = linkedInScraper.mapToAirtableFields(profile)

    // Handle profile picture separately if needed
    const profilePictureAttachment = await linkedInScraper.getProfilePictureAsAttachment(
      profile.data.basic_info.profile_picture_url
    )

    let airtableRecord = null;
    
    if (createRecord) {
      // Create the connection in Airtable
      const fieldsToCreate = {
        ...mappedData,
        // Add profile picture as attachment if available
        ...(profilePictureAttachment && {
          'Profile Picture URL': [profilePictureAttachment]
        })
      }

      airtableRecord = await createConnection(fieldsToCreate)
      console.log('Created Airtable record:', airtableRecord.id)
    }

    // Return enriched data and Airtable record
    return NextResponse.json({
      success: true,
      message: 'Profile enriched successfully',
      linkedinData: profile.data.basic_info,
      mappedData,
      airtableRecord,
      profilePictureUrl: profile.data.basic_info.profile_picture_url
    })

  } catch (error: any) {
    console.error('Error enriching LinkedIn profile:', error)
    
    // Provide helpful error messages
    let errorMessage = 'Failed to enrich LinkedIn profile'
    let statusCode = 500

    if (error.message.includes('LinkedIn API error: 404')) {
      errorMessage = 'LinkedIn profile not found. Please check the username.'
      statusCode = 404
    } else if (error.message.includes('LinkedIn API error: 429')) {
      errorMessage = 'Rate limit exceeded. Please try again later.'
      statusCode = 429
    } else if (error.message.includes('Missing RAPIDAPI_KEY')) {
      errorMessage = 'LinkedIn API configuration error'
      statusCode = 500
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: statusCode })
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get('username')
  
  if (!username) {
    return NextResponse.json({ 
      error: 'Username parameter is required' 
    }, { status: 400 })
  }

  try {
    // Just fetch and return the data without creating a record
    const profile = await linkedInScraper.getProfile(username)
    const mappedData = linkedInScraper.mapToAirtableFields(profile)

    return NextResponse.json({
      success: true,
      message: 'Profile data retrieved successfully',
      linkedinData: profile.data.basic_info,
      mappedData,
      rawProfile: process.env.NODE_ENV === 'development' ? profile : undefined
    })
  } catch (error: any) {
    console.error('Error fetching LinkedIn profile:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch LinkedIn profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 })
  }
}