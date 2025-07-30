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

    // Handle profile picture as attachment
    const profilePictureUrl = profile.data.basic_info.profile_picture_url
    console.log(`📸 Profile picture URL: ${profilePictureUrl ? 'Found' : 'Not found'}`)

    let airtableRecord = null;
    
    if (createRecord) {
      // GRADUALLY ADDING MORE FIELDS: Starting with essential + safe text fields
      console.log(`🎯 Using expanded but safe field set...`)
      
      const safeFields = {
        // Essential fields (these work)
        'Full Name': mappedData['Full Name'] || 'Unknown',
        'Username': mappedData['Username'] || '',
        'Current Company': mappedData['Current Company'] || '',
        'Title': mappedData['Title'] || '',
        
        // Additional safe text fields (these work)
        'First Name': mappedData['First Name'] || '',
        'Last Name': mappedData['Last Name'] || '',
        'Headline': mappedData['Headline'] || '',
        'Full Location': mappedData['Full Location'] || '',
        
        // Numbers (these work)
        'Follower Count': Number(mappedData['Follower Count']) || 0,
        'Connection Count': Number(mappedData['Connection Count']) || 0,
        
        // GROUP A: Date + URLs (Background Picture URL handled separately as attachment)
        'Start Date': mappedData['Start Date'] || '',
        'Company LinkedIn URL': mappedData['Company LinkedIn URL'] || '',
        // 'Background Picture URL' is handled separately as an attachment field
        'URN': mappedData['URN'] || '',
        'Current Company URN': mappedData['Current Company URN'] || '',
        
        // GROUP B: Boolean fields
        'Is Creator': Boolean(mappedData['Is Creator']),
        'Is Influencer': Boolean(mappedData['Is Influencer']), 
        'Is Premium': Boolean(mappedData['Is Premium']),
        'Is Current': Boolean(mappedData['Is Current']),
        
        // GROUP C: Long text fields
        'About': mappedData['About'] ? String(mappedData['About']).substring(0, 10000) : '',
        'Hashtags': mappedData['Hashtags'] || ''
      }
      
      // Only include fields that have actual values
      const fieldsToCreate: any = {}
      for (const [key, value] of Object.entries(safeFields)) {
        if (value !== null && value !== undefined && value !== '') {
          fieldsToCreate[key] = value
        }
      }
      
      // Handle attachment fields
      const backgroundPictureUrl = mappedData['Background Picture URL']
      if (backgroundPictureUrl && backgroundPictureUrl !== '') {
        console.log(`📸 Adding Background Picture URL as attachment`)
        fieldsToCreate['Background Picture URL'] = [{
          url: backgroundPictureUrl,
          filename: 'background-picture.jpg'
        }]
      }
      
      // Handle Profile Picture URL as attachment
      if (profilePictureUrl && profilePictureUrl !== '') {
        console.log(`📸 Adding Profile Picture URL as attachment`)
        fieldsToCreate['Profile Picture URL'] = [{
          url: profilePictureUrl,
          filename: 'profile-picture.jpg'
        }]
      }
      
      console.log(`📝 Creating Airtable record with ${Object.keys(fieldsToCreate).length} safe fields:`, fieldsToCreate)

      try {
        airtableRecord = await createConnection(fieldsToCreate)
        console.log(`🎉 Airtable record created successfully:`, {
          id: airtableRecord.id,
          hasFields: !!airtableRecord.fields,
          fieldCount: Object.keys(airtableRecord.fields || {}).length
        })
      } catch (airtableError: any) {
        console.error(`💥 Airtable creation failed:`, {
          message: airtableError.message,
          statusCode: airtableError.statusCode,
          airtableError: airtableError.error,
          fieldsAttempted: Object.keys(fieldsToCreate),
          fieldValues: Object.fromEntries(
            Object.entries(fieldsToCreate).map(([key, value]) => [
              key, 
              typeof value === 'object' ? `[${typeof value}]` : String(value).substring(0, 50)
            ])
          )
        })
        
        // More specific error message based on Airtable error
        let specificError = 'Airtable creation failed'
        if (airtableError.message.includes('INVALID_MULTIPLE_CHOICE_OPTIONS')) {
          specificError = 'Invalid field value - check dropdown/select field options'
        } else if (airtableError.message.includes('UNKNOWN_FIELD_NAME')) {
          specificError = 'Field name not found in Airtable schema'
        } else if (airtableError.message.includes('INVALID_VALUE_FOR_COLUMN')) {
          specificError = 'Invalid data type for field'
        } else if (airtableError.message.includes('NOT_A_VALID_ATTACHMENT')) {
          specificError = 'Profile picture attachment error'
        }
        
        throw new Error(`${specificError}: ${airtableError.message}`)
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
      originalError: error.message, // Always include original error for debugging
      details: {
        username: usernameToUse,
        hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
        rapidApiKeyLength: process.env.RAPIDAPI_KEY?.length,
        hasAirtableConfig: !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID && process.env.AIRTABLE_CONNECTIONS_TABLE_ID),
        createRecord,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
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