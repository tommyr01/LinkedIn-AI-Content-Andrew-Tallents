import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import logger from '../lib/logger'

export interface ValidatedRequest<T = any> extends Request {
  validatedBody: T
  validatedQuery: any
  validatedParams: any
}

/**
 * Create validation middleware for request body
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: ValidatedRequest<T>, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.body)
      req.validatedBody = result
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn({
          path: req.path,
          method: req.method,
          validationErrors: error.errors,
          requestId: req.headers['x-request-id'] || 'unknown'
        }, 'Request body validation failed')

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          error_type: 'validation_error',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          })),
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        })
      }

      next(error)
    }
  }
}

/**
 * Create validation middleware for query parameters
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: ValidatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.query)
      req.validatedQuery = result
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn({
          path: req.path,
          method: req.method,
          validationErrors: error.errors,
          requestId: req.headers['x-request-id'] || 'unknown'
        }, 'Request query validation failed')

        return res.status(400).json({
          success: false,
          error: 'Query parameter validation failed',
          error_type: 'validation_error',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          })),
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        })
      }

      next(error)
    }
  }
}

/**
 * Validation schemas for strategic content generation
 */
export const strategicContentSchema = z.object({
  topic: z.string().min(5, 'Topic must be at least 5 characters').max(200, 'Topic must be less than 200 characters'),
  platform: z.enum(['linkedin', 'twitter', 'facebook', 'instagram']).default('linkedin'),
  voiceGuidelines: z.string().max(1000, 'Voice guidelines must be less than 1000 characters').optional(),
  postType: z.string().max(50, 'Post type must be less than 50 characters').optional(),
  tone: z.string().max(50, 'Tone must be less than 50 characters').optional(),
  userId: z.string().max(100, 'User ID must be less than 100 characters').optional()
})

export const analyticsQuerySchema = z.object({
  timeframe: z.string().regex(/^\d+$/, 'Timeframe must be a number').transform(Number).refine(n => n >= 1 && n <= 365, 'Timeframe must be between 1 and 365 days').default('30'),
  metric: z.enum(['viral_score', 'engagement_rate', 'comment_rate', 'share_rate']).default('viral_score')
})

export const insightsQuerySchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(200, 'Topic must be less than 200 characters').optional(),
  timeframe: z.string().regex(/^\d+$/, 'Timeframe must be a number').transform(Number).refine(n => n >= 1 && n <= 365, 'Timeframe must be between 1 and 365 days').default('90')
})

export const voiceEvolutionQuerySchema = z.object({
  period: z.string().regex(/^\d+$/, 'Period must be a number').transform(Number).refine(n => n >= 1 && n <= 24, 'Period must be between 1 and 24 months').default('12'),
  metric: z.enum(['authenticity', 'authority', 'vulnerability', 'engagement_potential']).default('authenticity')
})

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(maxRequests: number = 100, windowMs: number = 60000) {
  const requests = new Map<string, { count: number; resetTime: number }>()

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip || 'unknown'
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < windowStart) {
        requests.delete(key)
      }
    }

    const current = requests.get(identifier)
    
    if (!current) {
      requests.set(identifier, { count: 1, resetTime: now + windowMs })
      return next()
    }

    if (current.resetTime < now) {
      // Reset the window
      requests.set(identifier, { count: 1, resetTime: now + windowMs })
      return next()
    }

    if (current.count >= maxRequests) {
      logger.warn({
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        requestId: req.headers['x-request-id'] || 'unknown'
      }, 'Rate limit exceeded')

      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        error_type: 'rate_limit_exceeded',
        message: `Maximum ${maxRequests} requests per ${windowMs / 1000} seconds exceeded`,
        retry_after: Math.ceil((current.resetTime - now) / 1000),
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      })
    }

    current.count++
    next()
  }
}

/**
 * Request ID middleware
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  req.headers['x-request-id'] = requestId
  res.set('X-Request-ID', requestId as string)
  next()
}

/**
 * Error handling middleware
 */
export function errorHandlerMiddleware(error: any, req: Request, res: Response, next: NextFunction) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined
  
  logger.error({
    path: req.path,
    method: req.method,
    error: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown',
    body: req.body,
    query: req.query
  }, 'Unhandled error in API route')

  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    error_type: 'internal_error',
    message: isDevelopment ? errorMessage : 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    request_id: req.headers['x-request-id'] || 'unknown',
    ...(isDevelopment && { stack: errorStack })
  })
}

/**
 * Request logging middleware
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()
  
  // Log incoming request
  logger.info({
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    requestId: req.headers['x-request-id'] || 'unknown'
  }, 'Incoming API request')

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const level = res.statusCode >= 400 ? 'warn' : 'info'
    
    logger[level]({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.headers['x-request-id'] || 'unknown'
    }, 'API request completed')
  })

  next()
}