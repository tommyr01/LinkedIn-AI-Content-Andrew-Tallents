# Local Development Setup

This guide will help you set up the LinkedIn AI Content application for local development.

## Prerequisites

- Node.js (v18 or higher)
- npm, yarn, or pnpm package manager
- Access to Supabase project and Redis instance

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or  
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.template .env.local
   ```
   
   Edit `.env.local` with your actual credentials:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_KEY` - Your Supabase service role key
   - `UPSTASH_REDIS_URL` - Your Redis connection URL
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `RAPIDAPI_KEY` - Your RapidAPI key for LinkedIn scraper

3. **Start development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Required for Core Functionality
- `SUPABASE_URL` - Database operations
- `SUPABASE_SERVICE_KEY` - Database admin access
- `UPSTASH_REDIS_URL` - Queue system
- `OPENAI_API_KEY` - Content generation

### Required for LinkedIn Features  
- `RAPIDAPI_KEY` - LinkedIn profile/post scraping

### Optional
- `FIRECRAWL_API_KEY` - Web content extraction
- `PERPLEXITY_API_KEY` - AI research
- `LINDY_WEBHOOK_URL` - Automation webhooks
- `N8N_COMMENT_WEBHOOK_URL` - Comment automation

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

## Development Features

### Performance Optimizations
The connection posts have been optimized with:
- Single JOIN query instead of N+1 queries
- Efficient data fetching from Supabase
- 200 post limit for better UX

### Database
- Uses Supabase for all data operations
- Connections stored in `linkedin_connections` table
- Posts stored in `connection_posts` table
- Automatic relationship joining for performance

### UI Features
- List view as default (better performance)
- Grid view option available
- Real-time stats and filtering
- Responsive design

## Troubleshooting

### Slow Loading Issues
If connection posts load slowly:
1. Check your Supabase connection
2. Verify the JOIN query optimization is working
3. Monitor network requests in browser dev tools

### Environment Issues
- Ensure all required environment variables are set
- Check that `.env.local` is not committed to git
- Verify Supabase and Redis connections are working

### Build Issues
- Run `npm run type-check` to catch TypeScript errors
- Run `npm run lint` to fix linting issues
- Clear `.next` folder and rebuild if needed

## Local vs Production

This local setup mirrors the production environment but:
- Uses `NODE_ENV=development`
- Includes additional debugging
- May have relaxed security settings
- Uses local storage for some features

## Need Help?

- Check the existing API endpoints in `/src/app/api/`
- Review component structure in `/src/components/`
- Test database queries in Supabase dashboard
- Monitor console logs for debugging information