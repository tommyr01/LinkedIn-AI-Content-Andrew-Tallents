# LinkedIn AI Content Worker

A standalone Node.js worker service that processes AI content generation jobs asynchronously using Redis queues and Supabase database.

## Architecture

- **Queue System**: Redis + BullMQ for reliable job processing
- **Database**: Supabase PostgreSQL for job tracking and results storage
- **AI Services**: OpenAI GPT-4 for content generation
- **Research APIs**: Firecrawl and Perplexity for content research
- **Logging**: Pino for structured logging

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys
   ```

3. **Development**:
   ```bash
   npm run dev
   ```

4. **Production**:
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

```env
# Redis Queue
REDIS_URL=redis://default:token@host:6379

# Supabase Database  
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# OpenAI API
OPENAI_API_KEY=sk-your_key

# Research APIs
FIRECRAWL_API_KEY=fc-your_key
PERPLEXITY_API_KEY=pplx-your_key

# Worker Configuration
WORKER_CONCURRENCY=3
MAX_JOB_ATTEMPTS=3
LOG_LEVEL=info
```

## Job Processing Flow

1. **Job Creation**: Main app creates job in queue with topic/platform
2. **Database Record**: Worker creates job record in Supabase
3. **Research Phase**: Gather context using Firecrawl/Perplexity APIs
4. **AI Generation**: 3 parallel agents generate content variations
5. **Results Storage**: Save drafts to Supabase with real-time updates
6. **Completion**: Mark job complete and notify frontend

## Project Structure

```
src/
├── config/          # Environment configuration
├── queue/           # Redis + BullMQ setup
├── services/        # Supabase, research, AI services
├── workers/         # Job processors
├── lib/             # Logging and utilities
└── types/           # TypeScript interfaces
```

## Monitoring

- Structured logging with Pino
- Queue metrics and health checks
- Automatic cleanup of completed jobs
- Graceful shutdown handling

## Deployment

Deploy to Railway, Render, or any Node.js hosting platform:

1. Set environment variables
2. Deploy from this directory
3. Start command: `npm start`

## Development

- `npm run dev` - Start with hot reload
- `npm run build` - TypeScript compilation
- `npm run lint` - ESLint check
- `npm test` - Run tests (when added)

## Integration

The worker integrates with the main Next.js app via:
- Shared Redis queue for job communication
- Shared Supabase database for results
- Real-time updates via Supabase subscriptions