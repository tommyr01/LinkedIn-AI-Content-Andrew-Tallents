import { NextRequest, NextResponse } from 'next/server'
import { linkedInScraper, extractUsernameFromLinkedInUrl } from '@/lib/linkedin-scraper'
import { createConnection, createConnectionPosts, ConnectionPostRecord } from '@/lib/airtable-http'

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

        // DEBUG: Check if we should trigger posts
        console.log(`🔍 [CONNECTION-DEBUG] Checking posts trigger conditions:`, {
          hasAirtableRecord: !!airtableRecord,
          airtableRecordId: airtableRecord?.id,
          username: usernameToUse,
          shouldTriggerPosts: !!(airtableRecord?.id)
        })

        // After successful connection creation, fetch and save posts
        if (airtableRecord?.id) {
          console.log(`🚀 [CONNECTION-DEBUG] Triggering posts fetch for connection: ${airtableRecord.id}`)
          await fetchAndSaveConnectionPosts(usernameToUse, airtableRecord.id)
          console.log(`✅ [CONNECTION-DEBUG] Posts fetch completed (check above for results)`)
        } else {
          console.log(`⚠️ [CONNECTION-DEBUG] Posts fetch skipped - no airtable record ID`)
        }
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
    const response = {
      success: true,
      message: 'Profile enriched successfully',
      linkedinData: profile.data.basic_info,
      mappedData,
      airtableRecord,
      profilePictureUrl: profile.data.basic_info.profile_picture_url,
      postsEnabled: !!process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID,
      postsMessage: process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID 
        ? 'Posts fetching initiated in background' 
        : 'Posts fetching disabled (AIRTABLE_CONNECTION_POSTS_TABLE_ID not configured)'
    };

    return NextResponse.json(response)

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

// Helper function to fetch and save connection posts  
async function fetchAndSaveConnectionPosts(username: string, connectionId: string): Promise<void> {
  console.log(`🟢 [POSTS-ENTRY] Posts function called! Parameters:`, { username, connectionId });
  console.log(`🚀 [POSTS-DEBUG] Starting posts fetch for username: ${username}, connection: ${connectionId}`);
  
  try {
    // Enhanced configuration logging
    console.log(`🔧 [POSTS-DEBUG] Configuration check:`, {
      hasConnectionPostsTableId: !!process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID,
      connectionPostsTableId: process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID,
      hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
      hasAirtableConfig: !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID),
      username,
      connectionId
    });
    
    // Check if connection posts table ID is configured
    if (!process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID) {
      console.log(`⚠️ [POSTS-DEBUG] AIRTABLE_CONNECTION_POSTS_TABLE_ID not configured, skipping posts fetch`);
      return;
    }

    console.log(`📡 [POSTS-DEBUG] Fetching posts from LinkedIn API...`);
    // Fetch posts from LinkedIn API
    const posts = await linkedInScraper.getAllPosts(username, 100);
    console.log(`📊 [POSTS-DEBUG] LinkedIn API response: ${posts.length} posts fetched for ${username}`);

    if (posts.length === 0) {
      console.log(`ℹ️ [POSTS-DEBUG] No posts found for ${username} - this might indicate an API issue`);
      return;
    }

    // Log first post details for debugging
    const firstPost = posts[0];
    console.log(`🔍 [POSTS-DEBUG] First post sample:`, {
      urn: firstPost?.urn,
      textPreview: firstPost?.text?.substring(0, 100),
      posted_at: firstPost?.posted_at,
      engagement: {
        likes: firstPost?.stats?.like,
        comments: firstPost?.stats?.comments,
        reposts: firstPost?.stats?.reposts
      },
      author: firstPost?.author
    });

    // Map posts to Airtable format using correct field names based on actual API response
    console.log(`🗂️ [POSTS-DEBUG] Mapping ${posts.length} posts to Airtable format...`);
    const connectionPosts: Partial<ConnectionPostRecord['fields']>[] = posts.map((post, index) => {
      const mappedPost: Partial<ConnectionPostRecord['fields']> = {
        // Connection linking
        'Connection': [connectionId],
        
        // Post identification - using actual API field names
        'Post URN': post.urn || '',
        'Full URN': post.full_urn || '',
        
        // Dates - handle both object and string formats from LinkedIn API
        'Posted Date': typeof post.posted_at === 'object' && post.posted_at?.date 
          ? post.posted_at.date 
          : (typeof post.posted_at === 'string' ? post.posted_at : ''),
        'Relative Posted': typeof post.posted_at === 'object' && post.posted_at?.relative 
          ? post.posted_at.relative 
          : '',
        
        // Post details - using actual API field names
        'Post Type': post.post_type || 'Post',
        'Post Text': post.text || '',
        'Post URL': post.url || '',
        
        // Author details - now available in API response
        'Author First Name': post.author?.first_name || '',
        'Author Last Name': post.author?.last_name || '',
        'Author Headline': post.author?.headline || '',
        'Username': post.author?.username || username,
        'Author LinkedIn URL': post.author?.profile_url || '',
        
        // Engagement metrics - using actual stats structure
        'Total Reactions': post.stats?.total_reactions || 0,
        'Likes': post.stats?.like || 0,
        'Support': post.stats?.support || 0,
        'Love': post.stats?.love || 0,
        'Insight': post.stats?.insight || 0,
        'Celebrate': post.stats?.celebrate || 0,
        'Comments Count': post.stats?.comments || 0,
        'Reposts': post.stats?.reposts || 0,
        
        // Media - using actual media structure (single object, not array)
        'Media Type': post.media?.type || '',
        'Media URL': post.media?.url || '',
        'Media Thumbnail': post.media?.thumbnail || ''
      };
      
      // Handle Author Profile Picture as attachment
      if (post.author?.profile_picture && post.author.profile_picture !== '') {
        mappedPost['Author Profile Picture'] = [{
          url: post.author.profile_picture,
          filename: 'author-profile-picture.jpg'
        }];
      }
      
      // Log first mapped post for debugging
      if (index === 0) {
        console.log(`🔍 [POSTS-DEBUG] First mapped post (with actual API structure):`, mappedPost);
      }
      
      return mappedPost;
    });

    console.log(`📝 [POSTS-DEBUG] Attempting to save ${connectionPosts.length} posts to Airtable...`);
    
    // Save posts to Airtable
    const createdPosts = await createConnectionPosts(connectionPosts);
    console.log(`✅ [POSTS-DEBUG] SUCCESS! Created ${createdPosts.length} connection posts in Airtable`);
    
    // Log some record IDs for verification
    const recordIds = createdPosts.slice(0, 3).map(p => p.id);
    console.log(`🆔 [POSTS-DEBUG] Sample record IDs created:`, recordIds);

  } catch (postsError: any) {
    // Enhanced error logging
    console.error(`💥 [POSTS-DEBUG] FAILED to fetch/save posts for ${username}:`, {
      errorMessage: postsError.message,
      errorName: postsError.name,
      statusCode: postsError.statusCode,
      connectionId,
      username,
      hasConnectionPostsTableId: !!process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID,
      connectionPostsTableId: process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID,
      stack: postsError.stack?.split('\n').slice(0, 5) // First 5 lines of stack
    });
    
    // Try to identify specific error types
    let errorType = 'Unknown error';
    if (postsError.message.includes('LinkedIn API error')) {
      errorType = 'LinkedIn API Error';
    } else if (postsError.message.includes('Airtable')) {
      errorType = 'Airtable API Error';
    } else if (postsError.message.includes('RAPIDAPI_KEY')) {
      errorType = 'Missing RapidAPI Key';
    } else if (postsError.message.includes('AIRTABLE_CONNECTION_POSTS_TABLE_ID')) {
      errorType = 'Missing Airtable Posts Table ID';
    }
    
    console.log(`🏷️ [POSTS-DEBUG] Error type identified: ${errorType}`);
    console.log(`⚠️ [POSTS-DEBUG] Connection created successfully but posts fetching failed for ${username}`);
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