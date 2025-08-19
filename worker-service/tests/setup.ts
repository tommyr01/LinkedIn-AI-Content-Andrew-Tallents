import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Mock process.env for tests
beforeAll(() => {
  // Set test environment variables with defaults
  process.env.NODE_ENV = 'test'
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key'
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
  process.env.PORT = '3001'
  process.env.LOG_LEVEL = 'silent'
  
  // Mock console methods in test environment
  if (process.env.NODE_ENV === 'test') {
    console.log = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
  }
})

// Clean up after all tests
afterAll(() => {
  vi.clearAllMocks()
})

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks()
})