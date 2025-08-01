#!/usr/bin/env node

/**
 * Production LinkedIn to Supabase Integration
 * Fetches LinkedIn posts and stores them in Supabase database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

// Configuration from environment variables
const config = {
  rapidapi: {
    key: process.env.RAPIDAPI_KEY,
    host: process.env.RAPIDAPI_HOST || 'linkedin-scraper-api-real-time-fast-affordable.p.rapidapi.com'
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
  }
};

// Validate configuration
function validateConfig() {
  const missing = [];
  
  if (!config.rapidapi.key) missing.push('RAPIDAPI_KEY');
  if (!config.supabase.url) missing.push('SUPABASE_URL');
  if (!config.supabase.anonKey) missing.push('SUPABASE_ANON_KEY');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Initialize Supabase client
let supabase;
try {
  validateConfig();
  supabase = createClient(config.supabase.url, config.supabase.anonKey);
} catch (error) {
  console.error('❌ Configuration error:', error.message);
  process.exit(1);
}

/**
 * Fetch LinkedIn posts for a user
 */
function fetchLinkedInPosts(username, pageNumber = 1) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: config.rapidapi.host,
      port: null,
      path: `/profile/posts?username=${username}&page_number=${pageNumber}`,
      headers: {
        'x-rapidapi-host': config.rapidapi.host,
        'x-rapidapi-key': config.rapidapi.key
      }
    };

    console.log(`📡 Fetching posts for ${username} (page ${pageNumber})...`);

    const req = https.request(options, function (res) {
      const chunks = [];

      res.on('data', function (chunk) {
        chunks.push(chunk);
      });

      res.on('end', function () {
        try {
          const body = Buffer.concat(chunks);
          const response = JSON.parse(body.toString());
          
          if (res.statusCode !== 200) {
            reject(new Error(`LinkedIn API error: ${res.statusCode} - ${response.message || 'Unknown error'}`));
            return;
          }
          
          // Extract posts from the response structure
          const posts = response.data?.posts || response.posts || response;
          resolve(posts);
        } catch (error) {
          reject(new Error(`Failed to parse LinkedIn API response: ${error.message}`));
        }
      });
    });

    req.on('error', function (error) {
      reject(new Error(`LinkedIn API request failed: ${error.message}`));
    });

    req.setTimeout(30000, () => {
      req.abort();
      reject(new Error('LinkedIn API request timeout'));
    });

    req.end();
  });
}

/**
 * Transform LinkedIn API response to match our Supabase schema
 */
function transformPostData(posts) {
  if (!Array.isArray(posts)) {
    throw new Error('Expected posts to be an array');
  }

  return posts.map(post => {
    try {
      // Parse posted_at timestamp
      let postedAt = null;
      if (post.posted_at && post.posted_at.timestamp) {
        postedAt = new Date(post.posted_at.timestamp).toISOString();
      }

      // Handle document information
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
        text: post.text ? post.text.substring(0, 10000) : null, // Limit text length
        url: post.url,
        post_type: post.post_type || 'regular',
        
        // Author information
        author_first_name: post.author?.first_name,
        author_last_name: post.author?.last_name,
        author_headline: post.author?.headline ? post.author.headline.substring(0, 500) : null,
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
    } catch (error) {
      console.warn(`⚠️  Warning: Failed to transform post ${post.urn}:`, error.message);
      return null;
    }
  }).filter(post => post !== null);
}

/**
 * Insert posts into Supabase database
 */
async function insertPostsToSupabase(posts) {
  if (!posts || posts.length === 0) {
    console.log('ℹ️  No posts to insert');
    return [];
  }

  console.log(`💾 Inserting ${posts.length} posts into Supabase...`);
  
  try {
    const { data, error } = await supabase
      .from('linkedin_posts')
      .upsert(posts, { 
        onConflict: 'urn',
        ignoreDuplicates: false 
      })
      .select('urn, author_username, posted_at, total_reactions');

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log(`✅ Successfully inserted/updated ${data.length} posts`);
    return data;
  } catch (error) {
    console.error('❌ Failed to insert posts:', error.message);
    throw error;
  }
}

/**
 * Record engagement history for tracking changes over time
 */
async function recordEngagementHistory(posts) {
  const historyRecords = posts.map(post => ({
    post_urn: post.urn,
    total_reactions: post.total_reactions,
    like_count: post.like_count,
    support_count: post.support_count,
    love_count: post.love_count,
    insight_count: post.insight_count,
    celebrate_count: post.celebrate_count,
    comments_count: post.comments_count,
    reposts_count: post.reposts_count,
    recorded_at: new Date().toISOString()
  }));

  console.log(`📈 Recording engagement history for ${historyRecords.length} posts...`);

  try {
    const { data, error } = await supabase
      .from('post_engagement_history')
      .insert(historyRecords)
      .select('post_urn, recorded_at');

    if (error) {
      console.error('❌ Failed to record engagement history:', error);
      throw error;
    }

    console.log(`✅ Recorded engagement history for ${data.length} posts`);
    return data;
  } catch (error) {
    console.error('❌ Failed to record engagement history:', error.message);
    throw error;
  }
}

/**
 * Fetch and process LinkedIn posts for a user
 */
async function processUserPosts(username, maxPages = 3) {
  const allPosts = [];
  let currentPage = 1;

  try {
    while (currentPage <= maxPages) {
      console.log(`\n📄 Processing page ${currentPage}/${maxPages}...`);
      
      const linkedinData = await fetchLinkedInPosts(username, currentPage);
      
      if (!linkedinData || !Array.isArray(linkedinData) || linkedinData.length === 0) {
        console.log(`ℹ️  No more posts found on page ${currentPage}`);
        break;
      }
      
      console.log(`✅ Fetched ${linkedinData.length} posts from page ${currentPage}`);
      allPosts.push(...linkedinData);
      
      currentPage++;
      
      // Add delay to be respectful to the API
      if (currentPage <= maxPages) {
        console.log('⏳ Waiting 2 seconds before next request...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (allPosts.length === 0) {
      console.log('ℹ️  No posts found for user');
      return { posts: [], inserted: [], history: [] };
    }

    console.log(`\n🔄 Transforming ${allPosts.length} total posts...`);
    const transformedPosts = transformPostData(allPosts);
    console.log(`✅ Successfully transformed ${transformedPosts.length} posts`);

    // Insert posts into database
    const insertedPosts = await insertPostsToSupabase(transformedPosts);
    
    // Record engagement history
    const historyRecords = await recordEngagementHistory(transformedPosts);

    return {
      posts: transformedPosts,
      inserted: insertedPosts,
      history: historyRecords
    };

  } catch (error) {
    console.error('❌ Error processing user posts:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const username = process.argv[2] || 'andrewtallents';
  const maxPages = parseInt(process.argv[3]) || 2;

  console.log('🚀 LinkedIn to Supabase Integration Starting...\n');
  console.log(`👤 Target user: ${username}`);
  console.log(`📄 Max pages: ${maxPages}\n`);

  try {
    const result = await processUserPosts(username, maxPages);
    
    console.log('\n📊 FINAL SUMMARY:');
    console.log(`- Total posts processed: ${result.posts.length}`);
    console.log(`- Posts inserted/updated: ${result.inserted.length}`);
    console.log(`- History records created: ${result.history.length}`);
    
    if (result.inserted.length > 0) {
      console.log('\n📋 Sample inserted posts:');
      result.inserted.slice(0, 3).forEach((post, index) => {
        console.log(`${index + 1}. ${post.urn} (${post.total_reactions} reactions)`);
      });
    }
    
    console.log('\n✅ Integration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Integration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  fetchLinkedInPosts,
  transformPostData,
  insertPostsToSupabase,
  recordEngagementHistory,
  processUserPosts
};