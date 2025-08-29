import { NextRequest, NextResponse } from 'next/server'
import { linkedInScraper, extractUsernameFromLinkedInUrl } from '../../../../lib/linkedin-scraper'
import { createConnection, createConnectionPosts, ConnectionPostRecord } from '../../../../lib/airtable-http'
import { createEnhancedLeadScoringEngine, EnhancedResearchData } from '../../../../lib/lead-scoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let usernameToUse = ''
  let createRecord = true
  let performLeadScoring = true
  
  try {
    const body = await request.json()
    const { 
      username, 
      linkedinUrl, 
      createRecord: shouldCreate = true,
      leadScoring: shouldScore = true 
    } = body
    createRecord = shouldCreate
    performLeadScoring = shouldScore

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

    // Fetch LinkedIn posts for enhanced analysis
    let linkedInPosts: any[] = []
    try {
      console.log(`📊 Fetching LinkedIn posts for enhanced lead scoring...`)
      linkedInPosts = await linkedInScraper.getAllPosts(usernameToUse, 50) // Last 50 posts for analysis
      console.log(`📊 Fetched ${linkedInPosts.length} posts for analysis`)
    } catch (postsError) {
      console.warn(`⚠️ Could not fetch posts for ${usernameToUse}:`, postsError)
      // Continue without posts - scoring will still work
    }
    
    // Map to Airtable fields
    const mappedData = linkedInScraper.mapToAirtableFields(profile)
    console.log(`🗂️ Mapped ${Object.keys(mappedData).length} fields for Airtable:`, {
      'Full Name': mappedData['Full Name'],
      'Current Company': mappedData['Current Company'],
      'Title': mappedData['Title'],
      'Follower Count': mappedData['Follower Count'],
      'Start Date': mappedData['Start Date']
    })

    // Enhanced Lead Scoring Analysis
    let leadScoringResult = null
    if (performLeadScoring) {
      try {
        console.log(`🎯 Performing enhanced lead scoring analysis...`)
        
        // Convert LinkedIn data to enhanced research data format
        const researchData: EnhancedResearchData = mapLinkedInDataToResearchData(profile, linkedInPosts)
        
        // Create enhanced lead scoring engine
        const scoringEngine = createEnhancedLeadScoringEngine()
        
        // Calculate comprehensive ICP score with psychographic analysis
        leadScoringResult = await scoringEngine.calculateICPScore(researchData, linkedInPosts)
        
        console.log(`🎯 Lead scoring completed:`, {
          score: leadScoringResult.totalScore,
          recommendation: leadScoringResult.recommendation,
          tags: leadScoringResult.tags,
          urgencyLevel: leadScoringResult.urgencyLevel,
          hasPsychographicProfile: !!leadScoringResult.psychographicProfile
        })
        
      } catch (scoringError: any) {
        console.error(`🚨 Lead scoring failed:`, scoringError.message)
        // Continue with enrichment even if scoring fails
      }
    }

    // Handle profile picture as attachment
    const profilePictureUrl = profile.data.basic_info.profile_picture_url
    console.log(`📸 Profile picture URL: ${profilePictureUrl ? 'Found' : 'Not found'}`)

    let airtableRecord = null;
    
    if (createRecord) {
      console.log(`🎯 Creating enriched Airtable record with lead scoring data...`)
      
      const safeFields: Record<string, any> = {
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
        
        // GROUP A: Date + URLs
        'Start Date': mappedData['Start Date'] || '',
        'Company LinkedIn URL': mappedData['Company LinkedIn URL'] || '',
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

      // Add enhanced lead scoring fields if available
      if (leadScoringResult) {
        safeFields['Lead Score'] = leadScoringResult.totalScore
        safeFields['Lead Recommendation'] = leadScoringResult.recommendation
        safeFields['Lead Tags'] = leadScoringResult.tags.join(', ')
        safeFields['Urgency Level'] = leadScoringResult.urgencyLevel
        
        // Add psychographic insights if available
        if (leadScoringResult.psychographicProfile) {
          safeFields['Leadership Style'] = leadScoringResult.psychographicProfile.leadershipStyle
          safeFields['Challenge Awareness'] = Math.round((leadScoringResult.psychographicProfile.challengeAwareness || 0) * 100)
          safeFields['Coaching Receptivity'] = Math.round((leadScoringResult.psychographicProfile.coachingReceptivity || 0) * 100)
        }
        
        // Add scoring breakdown as notes
        const breakdownNotes = Object.entries(leadScoringResult.breakdown)
          .map(([factor, data]: [string, { score: number; reasoning: string }]) => 
            `${factor}: ${data.score}/100 - ${data.reasoning}`)
          .join('\n')
        safeFields['Scoring Breakdown'] = breakdownNotes.substring(0, 10000) // Truncate if too long
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
      
      console.log(`📝 Creating Airtable record with ${Object.keys(fieldsToCreate).length} enriched fields including lead scoring:`)
      console.log(`    - Basic profile fields: ${Object.keys(safeFields).filter(k => !k.includes('Lead') && !k.includes('Scoring')).length}`)
      if (leadScoringResult) {
        console.log(`    - Lead scoring fields: ${Object.keys(safeFields).filter(k => k.includes('Lead') || k.includes('Scoring') || k.includes('Urgency')).length}`)
        console.log(`    - Lead Score: ${leadScoringResult.totalScore}/100 (${leadScoringResult.recommendation})`)
        console.log(`    - Tags: ${leadScoringResult.tags.join(', ')}`)
      }

      try {
        airtableRecord = await createConnection(fieldsToCreate)
        console.log(`🎉 Enhanced Airtable record created successfully:`, {
          id: airtableRecord.id,
          hasFields: !!airtableRecord.fields,
          fieldCount: Object.keys(airtableRecord.fields || {}).length,
          leadScore: leadScoringResult?.totalScore
        })

        // After successful connection creation, fetch and save posts
        if (airtableRecord?.id) {
          console.log(`🚀 Triggering posts fetch for connection: ${airtableRecord.id}`)
          await fetchAndSaveConnectionPosts(usernameToUse, airtableRecord.id, linkedInPosts)
          console.log(`✅ Posts fetch completed`)
        }
      } catch (airtableError: any) {
        console.error(`💥 Airtable creation failed:`, {
          message: airtableError.message,
          statusCode: airtableError.statusCode,
          airtableError: airtableError.error,
          fieldsAttempted: Object.keys(fieldsToCreate)
        })
        
        // More specific error message based on Airtable error
        let specificError = 'Airtable creation failed'
        if (airtableError.message.includes('INVALID_MULTIPLE_CHOICE_OPTIONS')) {
          specificError = 'Invalid field value - check dropdown/select field options'
        } else if (airtableError.message.includes('UNKNOWN_FIELD_NAME')) {
          specificError = 'Field name not found in Airtable schema - may need to add lead scoring fields'
        } else if (airtableError.message.includes('INVALID_VALUE_FOR_COLUMN')) {
          specificError = 'Invalid data type for field'
        }
        
        throw new Error(`${specificError}: ${airtableError.message}`)
      }
    } else {
      console.log(`ℹ️ Skipping Airtable creation (createRecord = false)`)
    }

    // Return comprehensive enriched data with lead scoring
    const response = {
      success: true,
      message: 'Profile enriched successfully with enhanced lead scoring',
      linkedinData: profile.data.basic_info,
      mappedData,
      airtableRecord,
      profilePictureUrl: profile.data.basic_info.profile_picture_url,
      
      // Enhanced lead scoring results
      leadScoring: leadScoringResult ? {
        enabled: true,
        score: leadScoringResult.totalScore,
        recommendation: leadScoringResult.recommendation,
        tags: leadScoringResult.tags,
        urgencyLevel: leadScoringResult.urgencyLevel,
        breakdown: leadScoringResult.breakdown,
        psychographicProfile: leadScoringResult.psychographicProfile,
        postsAnalyzed: linkedInPosts.length
      } : { 
        enabled: false, 
        reason: performLeadScoring ? 'Scoring failed' : 'Scoring disabled'  
      },
      
      // Posts information
      postsEnabled: !!process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID,
      postsMessage: process.env.AIRTABLE_CONNECTION_POSTS_TABLE_ID 
        ? `Posts fetching completed - analyzed ${linkedInPosts.length} posts` 
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
      createRecord,
      leadScoring: performLeadScoring
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
      errorMessage = 'Airtable configuration error - may need lead scoring fields in schema'
      statusCode = 500
    }

    return NextResponse.json({ 
      error: errorMessage,
      originalError: error.message,
      details: {
        username: usernameToUse,
        hasRapidApiKey: !!process.env.RAPIDAPI_KEY,
        rapidApiKeyLength: process.env.RAPIDAPI_KEY?.length,
        hasAirtableConfig: !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID && process.env.AIRTABLE_CONNECTIONS_TABLE_ID),
        createRecord,
        leadScoring: performLeadScoring,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    }, { status: statusCode })
  }
}

// Helper function to convert LinkedIn profile data to enhanced research data format
function mapLinkedInDataToResearchData(profile: any, posts: any[]): EnhancedResearchData {
  const basicInfo = profile.data.basic_info
  const experience = profile.data.experience || []
  const currentJob = experience.find((exp: any) => exp.is_current) || experience[0]

  // Calculate tenure from start date if available
  let tenure: number | undefined
  if (currentJob?.start_date) {
    const startDate = new Date(currentJob.start_date.year, 
      getMonthNumber(currentJob.start_date.month) - 1, 1)
    const now = new Date()
    tenure = (now.getFullYear() - startDate.getFullYear()) * 12 + 
             (now.getMonth() - startDate.getMonth())
  }

  return {
    profile: {
      name: basicInfo.fullname || '',
      profileUrl: `https://linkedin.com/in/${basicInfo.public_identifier}`,
      headline: basicInfo.headline || '',
      location: basicInfo.location?.full || '',
      summary: basicInfo.about || '',
      followerCount: basicInfo.follower_count || 0,
      connectionCount: basicInfo.connection_count || 0
    },
    currentRole: currentJob ? {
      title: currentJob.title || '',
      company: currentJob.company || basicInfo.current_company || '',
      companyId: currentJob.company_id || basicInfo.current_company_urn || '',
      startDate: currentJob.start_date ? 
        `${currentJob.start_date.year}-${getMonthNumber(currentJob.start_date.month).toString().padStart(2, '0')}-01` : 
        undefined,
      tenure,
      isCurrentRole: currentJob.is_current || false
    } : undefined,
    companyInfo: {
      name: basicInfo.current_company || currentJob?.company || '',
      industry: '', // Not directly available from current API
      linkedinUrl: basicInfo.current_company_url || currentJob?.company_linkedin_url || ''
    },
    experience: experience.map((exp: any) => ({
      title: exp.title || '',
      company: exp.company || '',
      companyId: exp.company_id || '',
      duration: exp.duration || '',
      isCurrentRole: exp.is_current || false,
      startDate: exp.start_date ? {
        year: exp.start_date.year,
        month: exp.start_date.month
      } : undefined
    })),
    recentActivity: {
      posts: posts.length,
      engagement: posts.length > 0 ? 'active' : 'low',
      topics: extractTopicsFromPosts(posts)
    }
  }
}

// Helper function to extract topics from posts
function extractTopicsFromPosts(posts: any[]): string[] {
  if (!posts || posts.length === 0) return []
  
  const topics = new Set<string>()
  const leadershipTopics = [
    'leadership', 'team', 'culture', 'vision', 'strategy',
    'growth', 'transformation', 'performance', 'results',
    'coaching', 'development', 'mentoring', 'innovation',
    'management', 'executive', 'success'
  ]
  
  posts.forEach(post => {
    const text = (post.text || '').toLowerCase()
    leadershipTopics.forEach(topic => {
      if (text.includes(topic)) {
        topics.add(topic)
      }
    })
  })
  
  return Array.from(topics).slice(0, 10) // Return top 10 topics
}

// Helper function to convert month name to number
function getMonthNumber(monthName: string): number {
  const months: { [key: string]: number } = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
  }
  return months[monthName] || 1
}

// Enhanced helper function to fetch and save connection posts with lead scoring context
async function fetchAndSaveConnectionPosts(
  username: string, 
  connectionId: string,
  existingPosts?: any[]
): Promise<void> {
  console.log(`🟢 [POSTS-ENTRY] Enhanced posts function with lead scoring context! Parameters:`, { 
    username, 
    connectionId, 
    hasExistingPosts: !!existingPosts,
    existingPostsCount: existingPosts?.length || 0
  });
  
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

    // Use existing posts if available (already fetched for lead scoring), otherwise fetch fresh
    let posts = existingPosts
    if (!posts || posts.length === 0) {
      console.log(`📡 [POSTS-DEBUG] Fetching posts from LinkedIn API (not cached from scoring)...`);
      posts = await linkedInScraper.getAllPosts(username, 100);
      console.log(`📊 [POSTS-DEBUG] LinkedIn API response: ${posts.length} posts fetched for ${username}`);
    } else {
      console.log(`📊 [POSTS-DEBUG] Using cached posts from lead scoring: ${posts.length} posts for ${username}`);
    }

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

    // Map posts to Airtable format using correct field names
    console.log(`🗂️ [POSTS-DEBUG] Mapping ${posts.length} posts to Airtable format with enhanced metadata...`);
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
        console.log(`🔍 [POSTS-DEBUG] First mapped post with enhanced data:`, mappedPost);
      }
      
      return mappedPost;
    });

    console.log(`📝 [POSTS-DEBUG] Attempting to save ${connectionPosts.length} enhanced posts to Airtable...`);
    
    // Save posts to Airtable
    const createdPosts = await createConnectionPosts(connectionPosts);
    console.log(`✅ [POSTS-DEBUG] SUCCESS! Created ${createdPosts.length} connection posts in Airtable with enhanced metadata`);
    
    // Log some record IDs for verification
    const recordIds = createdPosts.slice(0, 3).map(p => p.id);
    console.log(`🆔 [POSTS-DEBUG] Sample record IDs created:`, recordIds);

  } catch (postsError: any) {
    // Enhanced error logging
    console.error(`💥 [POSTS-DEBUG] FAILED to fetch/save enhanced posts for ${username}:`, {
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
    console.log(`⚠️ [POSTS-DEBUG] Connection created successfully but enhanced posts fetching failed for ${username}`);
  }
}

// GET endpoint for testing enhanced functionality
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get('username')
  const includeScoring = searchParams.get('scoring') !== 'false'
  
  if (!username) {
    return NextResponse.json({ 
      error: 'Username parameter is required' 
    }, { status: 400 })
  }

  try {
    // Just fetch and return the data without creating a record
    const profile = await linkedInScraper.getProfile(username)
    const mappedData = linkedInScraper.mapToAirtableFields(profile)
    
    let leadScoringResult = null
    let linkedInPosts: any[] = []
    
    if (includeScoring) {
      try {
        // Fetch posts for scoring
        linkedInPosts = await linkedInScraper.getAllPosts(username, 25)
        
        // Perform lead scoring
        const researchData = mapLinkedInDataToResearchData(profile, linkedInPosts)
        const scoringEngine = createEnhancedLeadScoringEngine()
        leadScoringResult = await scoringEngine.calculateICPScore(researchData, linkedInPosts)
      } catch (scoringError) {
        console.warn('Lead scoring failed in GET endpoint:', scoringError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile data retrieved successfully with enhanced analysis',
      linkedinData: profile.data.basic_info,
      mappedData,
      leadScoring: leadScoringResult,
      postsAnalyzed: linkedInPosts.length,
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