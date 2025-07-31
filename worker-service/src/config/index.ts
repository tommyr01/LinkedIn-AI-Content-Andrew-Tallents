import { config } from 'dotenv'
import { z } from 'zod'
import type { WorkerConfig } from '../types'

// Load environment variables
config()

const configSchema = z.object({
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  FIRECRAWL_API_KEY: z.string().min(1, 'FIRECRAWL_API_KEY is required'),
  PERPLEXITY_API_KEY: z.string().min(1, 'PERPLEXITY_API_KEY is required'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  WORKER_CONCURRENCY: z.string().transform(Number).pipe(z.number().min(1).max(10)).default('3'),
  MAX_JOB_ATTEMPTS: z.string().transform(Number).pipe(z.number().min(1).max(5)).default('3'),
  RAPIDAPI_KEY: z.string().optional()
})

const parseConfig = () => {
  try {
    const rawConfig = {
      REDIS_URL: process.env.REDIS_URL,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
      LOG_LEVEL: process.env.LOG_LEVEL,
      NODE_ENV: process.env.NODE_ENV,
      WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY,
      MAX_JOB_ATTEMPTS: process.env.MAX_JOB_ATTEMPTS,
      RAPIDAPI_KEY: process.env.RAPIDAPI_KEY
    }

    const validatedConfig = configSchema.parse(rawConfig)
    
    return {
      redis: {
        url: validatedConfig.REDIS_URL
      },
      supabase: {
        url: validatedConfig.SUPABASE_URL,
        serviceKey: validatedConfig.SUPABASE_SERVICE_ROLE_KEY
      },
      openai: {
        apiKey: validatedConfig.OPENAI_API_KEY,
        model: 'gpt-4-turbo-preview'
      },
      research: {
        firecrawl: {
          apiKey: validatedConfig.FIRECRAWL_API_KEY
        },
        perplexity: {
          apiKey: validatedConfig.PERPLEXITY_API_KEY
        },
        rapidapi: {
          apiKey: validatedConfig.RAPIDAPI_KEY
        }
      },
      worker: {
        concurrency: validatedConfig.WORKER_CONCURRENCY,
        maxJobAttempts: validatedConfig.MAX_JOB_ATTEMPTS
      },
      logging: {
        level: validatedConfig.LOG_LEVEL
      },
      environment: validatedConfig.NODE_ENV
    } as WorkerConfig & { environment: string }
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:')
      error.errors.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`)
      })
    } else {
      console.error('Failed to load configuration:', error)
    }
    process.exit(1)
  }
}

export const appConfig = parseConfig()

export default appConfig