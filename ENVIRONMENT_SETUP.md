# Environment Setup Guide

## Required Environment Variables

### Supabase Configuration
For async content generation to work properly, you need both the anon key and service role key:

```bash
# Public Supabase configuration (safe for frontend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Service role key (REQUIRED for async content generation)
# ⚠️  IMPORTANT: This bypasses Row Level Security - only use on server-side
# Get this from: Supabase Dashboard > Settings > API > Project API keys > service_role
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Why the Service Role Key is Required

The async content generation system uses a worker service that needs to:
1. Create database jobs with queue_job_id mapping
2. Store generated content drafts
3. Update job status and progress

These operations require bypassing Row Level Security (RLS) policies, which is only possible with the service role key.

### Deployment Requirements

**Vercel Deployment:**
Add the `SUPABASE_SERVICE_ROLE_KEY` environment variable in your Vercel project settings.

**Railway Worker Service:**
Add the `SUPABASE_SERVICE_ROLE_KEY` environment variable in your Railway project settings.

### Other Required Variables

See `.env.local` for the complete list of required environment variables including:
- Redis/Upstash configuration
- OpenAI API key
- Airtable configuration (if using connection management)

### Database Schema Requirements

Ensure your Supabase database has the `queue_job_id` column added to the `content_jobs` table:

```sql
ALTER TABLE content_jobs ADD COLUMN queue_job_id TEXT;
```

This column links Redis queue jobs to database job records.