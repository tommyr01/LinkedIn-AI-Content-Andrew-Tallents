#!/usr/bin/env node

/**
 * Test script to fetch LinkedIn posts and insert them into Supabase
 * Tests the complete pipeline from LinkedIn API to database storage
 */

const https = require('https');

// Configuration
const RAPIDAPI_KEY = '05dfd3892bmsh240571b650016b1p11c9ffjsnf258ff227896';
const RAPIDAPI_HOST = 'linkedin-scraper-api-real-time-fast-affordable.p.rapidapi.com';

// You'll need to add these to your .env.local file
const SUPABASE_URL = process.env.SUPABASE_URL || 'your_supabase_url_here';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

/**
 * Fetch LinkedIn posts for a user
 */
function fetchLinkedInPosts(username, pageNumber = 1) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: RAPIDAPI_HOST,
      port: null,
      path: `/profile/posts?username=${username}&page_number=${pageNumber}`,
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY
      }
    };

    const req = https.request(options, function (res) {
      const chunks = [];

      res.on('data', function (chunk) {
        chunks.push(chunk);
      });

      res.on('end', function () {
        try {
          const body = Buffer.concat(chunks);
          const data = JSON.parse(body.toString());
          resolve(data);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', function (error) {
      reject(error);
    });

    req.end();
  });
}

/**
 * Transform LinkedIn API response to match our Supabase schema
 */
function transformPostData(posts) {
  return posts.map(post => {
    // Parse posted_at timestamp
    let postedAt = null;
    if (post.posted_at && post.posted_at.timestamp) {
      postedAt = new Date(post.posted_at.timestamp).toISOString();
    }

    // Handle media information
    let documentTitle = null;
    let documentPageCount = null;
    let documentUrl = null;
    let documentThumbnail = null;

    if (post.document) {
      documentTitle = post.document.title;
      documentPageCount = post.document.page_count;
      documentUrl = post.document.url;
      documentThumbnail = post.document.thumbnail;
    }

    return {
      urn: post.urn,
      full_urn: post.full_urn,
      posted_at: postedAt,
      text: post.text,
      url: post.url,
      post_type: post.post_type || 'regular',
      
      // Author information
      author_first_name: post.author?.first_name,
      author_last_name: post.author?.last_name,
      author_headline: post.author?.headline,
      author_username: post.author?.username,
      author_profile_url: post.author?.profile_url,
      author_profile_picture: post.author?.profile_picture,
      
      // Engagement stats
      total_reactions: post.stats?.total_reactions || 0,
      like_count: post.stats?.like || 0,
      support_count: post.stats?.support || 0,
      love_count: post.stats?.love || 0,
      insight_count: post.stats?.insight || 0,
      celebrate_count: post.stats?.celebrate || 0,
      comments_count: post.stats?.comments || 0,
      reposts_count: post.stats?.reposts || 0,
      
      // Document/Media info
      document_title: documentTitle,
      document_page_count: documentPageCount,
      document_url: documentUrl,
      document_thumbnail: documentThumbnail,
      
      // Metadata
      last_synced_at: new Date().toISOString()
    };
  });
}

/**
 * Insert posts into Supabase database
 */
async function insertPostsToSupabase(posts) {
  const supabase = createSupabaseClient();
  
  console.log(`Attempting to insert ${posts.length} posts into Supabase...`);
  
  const { data, error } = await supabase
    .from('linkedin_posts')
    .upsert(posts, { 
      onConflict: 'urn',
      ignoreDuplicates: false 
    })
    .select();

  if (error) {
    console.error('Error inserting posts:', error);
    throw error;
  }

  console.log(`Successfully inserted/updated ${data.length} posts`);
  return data;
}

/**
 * Create Supabase client (simplified version for testing)
 */
function createSupabaseClient() {
  // For a real implementation, you'd use the @supabase/supabase-js package
  // This is a simplified mock for testing purposes
  return {
    from: (table) => ({
      upsert: async (data, options) => {
        console.log(`Mock: Would insert ${data.length} records into ${table}`);
        console.log('Sample data:', JSON.stringify(data[0], null, 2));
        return { data: data, error: null };
      }
    })
  };
}

/**
 * Main test function
 */
async function main() {
  try {
    console.log('🚀 Starting LinkedIn to Supabase test...\n');
    
    // Step 1: Fetch LinkedIn posts
    console.log('📡 Fetching LinkedIn posts for andrewtallents...');
    const linkedinData = await fetchLinkedInPosts('andrewtallents', 1);
    
    if (!linkedinData || !Array.isArray(linkedinData)) {
      throw new Error('Invalid response from LinkedIn API');
    }
    
    console.log(`✅ Fetched ${linkedinData.length} posts from LinkedIn\n`);
    
    // Step 2: Transform data for Supabase
    console.log('🔄 Transforming data for Supabase schema...');
    const transformedPosts = transformPostData(linkedinData);
    console.log(`✅ Transformed ${transformedPosts.length} posts\n`);
    
    // Step 3: Insert into Supabase
    console.log('💾 Inserting posts into Supabase...');
    const insertedPosts = await insertPostsToSupabase(transformedPosts);
    console.log(`✅ Successfully processed ${insertedPosts.length} posts\n`);
    
    // Step 4: Display summary
    console.log('📊 SUMMARY:');
    console.log(`- Posts fetched: ${linkedinData.length}`);
    console.log(`- Posts transformed: ${transformedPosts.length}`);
    console.log(`- Posts inserted: ${insertedPosts.length}`);
    
    // Show sample data structure
    console.log('\n📋 Sample transformed post:');
    console.log(JSON.stringify(transformedPosts[0], null, 2));
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main();
}

module.exports = {
  fetchLinkedInPosts,
  transformPostData,
  insertPostsToSupabase
};