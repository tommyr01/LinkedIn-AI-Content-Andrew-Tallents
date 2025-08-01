import { NextRequest, NextResponse } from 'next/server'
import { linkedInScraper, extractUsernameFromLinkedInUrl } from '../../../../../lib/linkedin-scraper'
import { supabaseLinkedIn } from '../../../../../lib/supabase-linkedin'

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

    // Check if Supabase connection is available
    if (!supabaseLinkedIn) {
      return NextResponse.json({
        error: 'Supabase connection not available',
        details: 'Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables'
      }, { status: 500 })
    }

    // Fetch LinkedIn profile data
    const profile = await linkedInScraper.getProfile(usernameToUse)
    console.log(`✅ LinkedIn profile fetched successfully:`, {
      name: profile.data.basic_info.fullname,
      company: profile.data.basic_info.current_company,
      hasProfilePicture: !!profile.data.basic_info.profile_picture_url
    })
    
    // Map to Supabase fields using exact column names
    const connectionData = mapLinkedInProfileToSupabase(profile.data)
    console.log(`🗂️ Mapped profile data for Supabase:`, {
      'Full Name': connectionData.full_name,
      'Current Company': connectionData.current_company,
      'Title': connectionData.title,
      'Follower Count': connectionData.follower_count,
      'Username': connectionData.username,
      'Start Date': connectionData.start_date
    })

    let supabaseRecord = null
    
    if (createRecord) {
      console.log(`💾 Creating Supabase connection record...`)
      
      try {
        supabaseRecord = await supabaseLinkedIn.upsertConnection(connectionData)
        console.log(`🎉 Supabase connection created successfully:`, {
          id: supabaseRecord.id,
          username: supabaseRecord.username,
          fullName: supabaseRecord.full_name
        })

        // After successful connection creation, fetch and save posts
        if (supabaseRecord?.id) {
          console.log(`🚀 Triggering posts fetch for connection: ${supabaseRecord.id}`)
          await fetchAndSaveConnectionPosts(usernameToUse, supabaseRecord.id)
          console.log(`✅ Posts fetch completed`)
        }
      } catch (supabaseError: any) {
        console.error(`💥 Supabase creation failed:`, {
          message: supabaseError.message,
          username: usernameToUse
        })
        
        throw new Error(`Supabase creation failed: ${supabaseError.message}`)
      }
    } else {
      console.log(`ℹ️ Skipping Supabase creation (createRecord = false)`)
    }

    // Return enriched data and Supabase record
    const response = {
      success: true,
      message: 'Profile enriched successfully',
      linkedinData: profile.data.basic_info,
      mappedData: connectionData,
      supabaseRecord,
      profilePictureUrl: profile.data.basic_info.profile_picture_url,
      postsEnabled: true,
      postsMessage: 'Posts fetching completed for Supabase'
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Error enriching LinkedIn profile:', {
      message: error.message,
      stack: error.stack,
      username: usernameToUse,
      hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
      hasSupabaseConfig: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
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
    } else if (error.message.includes('Supabase')) {
      errorMessage = 'Supabase configuration error'
      statusCode = 500
    }

    return NextResponse.json({ 
      error: errorMessage,
      originalError: error.message,
      details: {
        username: usernameToUse,
        hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
        rapidApiKeyLength: process.env.RAPIDAPI_KEY?.length,
        hasSupabaseConfig: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        createRecord,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    }, { status: statusCode })
  }
}

// Helper function to map LinkedIn profile to Supabase connection format
function mapLinkedInProfileToSupabase(profileData: any) {
  const profile = profileData.basic_info || profileData
  const experience = profileData.experience || []
  
  // Find current job from experience array
  const currentJob = experience.find((exp: any) => exp.is_current) || experience[0]
  
  // Format start date if available
  let startDate = ''
  if (currentJob?.start_date) {
    const year = currentJob.start_date.year
    const month = currentJob.start_date.month
    // Convert month name to number if needed
    const monthNumber = getMonthNumber(month)
    startDate = `${year}-${monthNumber.toString().padStart(2, '0')}-01`
  }
  
  // Extract hashtags - handle both array and string formats
  let hashtags = ''
  if (profile.creator_hashtags) {
    hashtags = Array.isArray(profile.creator_hashtags) 
      ? profile.creator_hashtags.join(', ')
      : profile.creator_hashtags
  }
  
  return {
    full_name: profile.fullname || 'Unknown',
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    headline: profile.headline || '',
    username: profile.public_identifier || '', // Use public_identifier, not username
    profile_picture_url: profile.profile_picture_url || '',
    about: profile.about || '',
    full_location: profile.location?.full || '',
    hashtags: hashtags,
    is_creator: profile.is_creator || false,
    is_influencer: profile.is_influencer || false,
    is_premium: profile.is_premium || false,
    show_follower_count: profile.show_follower_count !== false,
    background_picture_url: profile.background_picture_url || '',
    urn: profile.urn || '',
    follower_count: profile.follower_count || 0,
    connection_count: profile.connection_count || 0,
    current_company: profile.current_company || currentJob?.company || '',
    title: currentJob?.title || '', // Get title from experience
    company_location: currentJob?.location || '',
    duration: currentJob?.duration || '',
    start_date: startDate,
    is_current: currentJob?.is_current || false,
    company_linkedin_url: profile.current_company_url || currentJob?.company_linkedin_url || '', // Use current_company_url
    current_company_urn: profile.current_company_urn || ''
  }
}

// Helper function to convert month name to number
function getMonthNumber(monthName: string): number {
  if (!monthName) return 1
  const months: { [key: string]: number } = {
    'Jan': 1, 'January': 1,
    'Feb': 2, 'February': 2,
    'Mar': 3, 'March': 3,
    'Apr': 4, 'April': 4,
    'May': 5,
    'Jun': 6, 'June': 6,
    'Jul': 7, 'July': 7,
    'Aug': 8, 'August': 8,
    'Sep': 9, 'September': 9,
    'Oct': 10, 'October': 10,
    'Nov': 11, 'November': 11,
    'Dec': 12, 'December': 12
  }
  return months[monthName] || 1
}

// Helper function to fetch and save connection posts  
async function fetchAndSaveConnectionPosts(username: string, connectionId: string): Promise<void> {
  console.log(`🟢 Starting posts fetch for username: ${username}, connection: ${connectionId}`)
  
  try {
    if (!supabaseLinkedIn) {
      console.log(`⚠️ Supabase not available, skipping posts fetch`)
      return
    }

    console.log(`📡 Fetching posts from LinkedIn API...`)
    // Fetch posts from LinkedIn API (limit to 50 for connections)
    const posts = await linkedInScraper.getAllPosts(username, 50)
    console.log(`📊 LinkedIn API response: ${posts.length} posts fetched for ${username}`)

    if (posts.length === 0) {
      console.log(`ℹ️ No posts found for ${username}`)
      return
    }

    // Log first post details for debugging
    const firstPost = posts[0]
    console.log(`🔍 First post sample:`, {
      urn: firstPost?.urn,
      textPreview: firstPost?.text?.substring(0, 100),
      posted_at: firstPost?.posted_at,
      engagement: {
        likes: firstPost?.stats?.like,
        comments: firstPost?.stats?.comments,
        reposts: firstPost?.stats?.reposts
      }
    })

    // Save posts to Supabase
    console.log(`💾 Saving ${posts.length} posts to Supabase...`)
    let savedCount = 0
    
    for (const post of posts) {
      try {
        await supabaseLinkedIn.upsertConnectionPost(connectionId, post)
        savedCount++
      } catch (postError: any) {
        console.error(`Failed to save post ${post.urn}:`, postError.message)
        // Continue with other posts
      }
    }
    
    console.log(`✅ Successfully saved ${savedCount}/${posts.length} connection posts`)

  } catch (postsError: any) {
    console.error(`💥 Failed to fetch/save posts for ${username}:`, {
      errorMessage: postsError.message,
      connectionId,
      username
    })
    
    console.log(`⚠️ Connection created successfully but posts fetching failed for ${username}`)
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
    const mappedData = mapLinkedInProfileToSupabase(profile.data)

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