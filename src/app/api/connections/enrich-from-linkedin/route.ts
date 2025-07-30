import { NextRequest, NextResponse } from 'next/server'
import { linkedInScraper, extractUsernameFromLinkedInUrl } from '@/lib/linkedin-scraper'
import { createConnection } from '@/lib/airtable-http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let usernameToUse = ''
  let createRecord = true
  
  try {
    const body = await request.json()
    const { username, linkedinUrl, createRecord: shouldCreate = true } = body
    createRecord = shouldCreate

    if (!username && !linkedinUrl) {
      return NextResponse.json({ 
        error: 'Either username or linkedinUrl is required' 
      }, { status: 400 })
    }

    // Extract username from URL if provided
    usernameToUse = username || extractUsernameFromLinkedInUrl(linkedinUrl)
    
    if (!usernameToUse) {
      return NextResponse.json({ 
        error: 'Invalid LinkedIn URL or username' 
      }, { status: 400 })
    }

    console.log(`🔍 Enriching profile for username: ${usernameToUse}`)

    // Fetch LinkedIn profile data
    const profile = await linkedInScraper.getProfile(usernameToUse)
    console.log(`✅ LinkedIn profile fetched successfully:`, {
      name: profile.data.basic_info.fullname,
      company: profile.data.basic_info.current_company,
      hasProfilePicture: !!profile.data.basic_info.profile_picture_url
    })
    
    // Map to Airtable fields
    const mappedData = linkedInScraper.mapToAirtableFields(profile)
    console.log(`🗂️ Mapped ${Object.keys(mappedData).length} fields for Airtable:`, {
      'Full Name': mappedData['Full Name'],
      'Current Company': mappedData['Current Company'],
      'Title': mappedData['Title'],
      'Follower Count': mappedData['Follower Count'],
      'Start Date': mappedData['Start Date']
    })

    // Handle profile picture separately if needed
    const profilePictureAttachment = await linkedInScraper.getProfilePictureAsAttachment(
      profile.data.basic_info.profile_picture_url
    )
    console.log(`📸 Profile picture attachment:`, profilePictureAttachment ? 'Created' : 'None')

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

      console.log(`📝 Creating Airtable record with ${Object.keys(fieldsToCreate).length} fields...`)
      console.log(`🎯 Sample fields to create:`, {
        'Full Name': fieldsToCreate['Full Name'],
        'Current Company': fieldsToCreate['Current Company'],
        'Follower Count': fieldsToCreate['Follower Count'],
        hasProfilePicture: !!fieldsToCreate['Profile Picture URL']
      })

      try {
        airtableRecord = await createConnection(fieldsToCreate)
        console.log(`🎉 Airtable record created successfully:`, {
          id: airtableRecord.id,
          createdTime: airtableRecord.createdTime
        })
      } catch (airtableError: any) {
        console.error(`💥 Airtable creation failed:`, {
          message: airtableError.message,
          fieldsAttempted: Object.keys(fieldsToCreate),
          sampleFields: fieldsToCreate
        })
        throw new Error(`Airtable creation failed: ${airtableError.message}`)
      }
    } else {
      console.log(`ℹ️ Skipping Airtable creation (createRecord = false)`)
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
    console.error('Error enriching LinkedIn profile:', {
      message: error.message,
      stack: error.stack,
      username: usernameToUse,
      hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
      hasAirtableConfig: !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID),
      createRecord
    })
    
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
      errorMessage = 'LinkedIn API configuration error - RapidAPI key not found'
      statusCode = 500
    } else if (error.message.includes('AIRTABLE')) {
      errorMessage = 'Airtable configuration error'
      statusCode = 500
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        originalError: error.message,
        username: usernameToUse,
        hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
        rapidApiKeyLength: process.env.RAPIDAPI_KEY?.length,
        hasAirtableConfig: !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID && process.env.AIRTABLE_CONNECTIONS_TABLE_ID)
      } : undefined
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