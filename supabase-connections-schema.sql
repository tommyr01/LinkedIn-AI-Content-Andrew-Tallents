-- LinkedIn Connections Migration to Supabase
-- Execute this SQL in your Supabase SQL Editor

-- Create linkedin_connections table
CREATE TABLE linkedin_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Basic profile info
  full_name text NOT NULL,
  first_name text,
  last_name text,
  headline text,
  username text,
  about text,
  
  -- Profile media
  profile_picture_url text,
  background_picture_url text,
  
  -- Location & metadata
  full_location text,
  hashtags text,
  
  -- Profile flags
  is_creator boolean DEFAULT false,
  is_influencer boolean DEFAULT false,
  is_premium boolean DEFAULT false,
  show_follower_count boolean DEFAULT true,
  
  -- LinkedIn identifiers
  urn text,
  
  -- Engagement metrics
  follower_count integer DEFAULT 0,
  connection_count integer DEFAULT 0,
  
  -- Company information
  current_company text,
  title text,
  company_location text,
  duration text,
  start_date timestamp with time zone,
  is_current boolean DEFAULT true,
  company_linkedin_url text,
  current_company_urn text,
  
  -- Metadata
  last_synced_at timestamp with time zone DEFAULT NOW(),
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Create connection_posts table
CREATE TABLE connection_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid REFERENCES linkedin_connections(id) ON DELETE CASCADE,
  
  -- Post identification
  post_urn text UNIQUE NOT NULL,
  full_urn text,
  
  -- Post timing
  posted_date timestamp with time zone,
  relative_posted text,
  
  -- Post content
  post_type text DEFAULT 'regular',
  post_text text,
  post_url text,
  
  -- Author details
  author_first_name text,
  author_last_name text,
  author_headline text,
  username text,
  author_linkedin_url text,
  author_profile_picture text,
  
  -- Engagement metrics
  total_reactions integer DEFAULT 0,
  likes integer DEFAULT 0,
  support integer DEFAULT 0,
  love integer DEFAULT 0,
  insight integer DEFAULT 0,
  celebrate integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  reposts integer DEFAULT 0,
  
  -- Media information
  media_type text,
  media_url text,
  media_thumbnail text,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT NOW()
);

-- Create performance indexes
CREATE INDEX idx_linkedin_connections_username ON linkedin_connections(username);
CREATE INDEX idx_linkedin_connections_company ON linkedin_connections(current_company);
CREATE INDEX idx_linkedin_connections_synced ON linkedin_connections(last_synced_at);
CREATE INDEX idx_connection_posts_connection_id ON connection_posts(connection_id);
CREATE INDEX idx_connection_posts_urn ON connection_posts(post_urn);
CREATE INDEX idx_connection_posts_posted_date ON connection_posts(posted_date DESC);

-- Create partial unique index for username (only enforced when username is not null and not empty)
CREATE UNIQUE INDEX idx_linkedin_connections_username_unique 
ON linkedin_connections(username) 
WHERE username IS NOT NULL AND username != '';

-- Enable Row Level Security
ALTER TABLE linkedin_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Allow full access to authenticated users" ON linkedin_connections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users" ON connection_posts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON linkedin_connections TO authenticated;
GRANT ALL ON connection_posts TO authenticated;
GRANT USAGE ON SEQUENCE linkedin_connections_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE connection_posts_id_seq TO authenticated;