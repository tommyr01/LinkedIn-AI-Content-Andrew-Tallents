# API Specifications - LinkedIn Content Generation Enhancement

## Overview
This document defines all API endpoints required for the enhanced LinkedIn content generation system. The API extends the existing Next.js application with new endpoints for performance analysis, voice learning, multi-variant generation, and performance feedback.

## API Architecture

### Base Configuration
- **Base URL**: `https://your-domain.com/api`
- **Authentication**: JWT tokens via Supabase Auth
- **Rate Limiting**: 100 requests per minute per user
- **Response Format**: JSON with consistent error handling
- **API Version**: v1 (versioned via headers)

### Common Response Structure
```typescript
// Success Response
interface APISuccess<T> {
  success: true;
  data: T;
  metadata?: {
    timestamp: string;
    requestId: string;
    processingTime?: number;
  };
}

// Error Response
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    requestId: string;
  };
}
```

## Authentication & Authorization

### Headers Required
```typescript
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-API-Version: v1
```

### Permission Levels
- **User**: Access to own data and content generation
- **Admin**: System-wide metrics and user management
- **Service**: Internal service-to-service communication

## API Endpoints

### 1. Historical Analysis APIs

#### POST /api/content/historical-analysis
**Purpose**: Trigger analysis of user's historical posts

```typescript
// Request
interface HistoricalAnalysisRequest {
  userId?: string; // Optional, defaults to authenticated user
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  forceRefresh?: boolean; // Ignore cached results
  options?: {
    minEngagementThreshold?: number;
    includeComments?: boolean;
    analysisDepth?: 'basic' | 'detailed';
  };
}

// Response
interface HistoricalAnalysisResponse {
  analysisId: string;
  status: 'started' | 'completed';
  postsAnalyzed: number;
  patternsIdentified: number;
  topPerformers: HistoricalPost[];
  insights: {
    bestPerformingContent: string[];
    optimalPostingTimes: TimeRange[];
    engagementDrivers: string[];
  };
  completedAt?: string;
}
```

#### GET /api/content/performance-insights
**Purpose**: Retrieve cached performance insights

```typescript
// Query Parameters
interface InsightsQuery {
  category?: 'high_performer' | 'underperformer' | 'trending' | 'experimental';
  dateRange?: string; // '7d', '30d', '90d', 'all'
  limit?: number;
  offset?: number;
}

// Response
interface PerformanceInsightsResponse {
  insights: PerformanceInsight[];
  summary: {
    totalPosts: number;
    averageEngagement: number;
    topPerformingTopics: string[];
    improvementOpportunities: string[];
  };
  cacheInfo: {
    lastUpdated: string;
    validUntil: string;
  };
}

interface PerformanceInsight {
  type: 'pattern' | 'timing' | 'content' | 'engagement';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  supportingData: any;
}
```

#### GET /api/content/performance-patterns
**Purpose**: Get identified performance patterns

```typescript
// Response
interface PerformancePatternsResponse {
  patterns: PerformancePattern[];
  statistics: {
    totalPatterns: number;
    avgConfidenceScore: number;
    mostEffectivePattern: string;
  };
}

interface PerformancePattern {
  id: string;
  name: string;
  type: 'structural' | 'linguistic' | 'temporal' | 'engagement';
  elements: PatternElement[];
  successCorrelation: number;
  confidenceScore: number;
  usageCount: number;
  effectiveness: number | null;
}
```

### 2. Voice Learning APIs

#### POST /api/content/voice-analysis
**Purpose**: Train or update voice models

```typescript
// Request
interface VoiceAnalysisRequest {
  contentType: 'post' | 'comment';
  forceRetrain?: boolean;
  options?: {
    minSamples?: number;
    includeHistorical?: boolean;
    analysisDepth?: 'basic' | 'detailed';
  };
}

// Response
interface VoiceAnalysisResponse {
  modelId: string;
  contentType: 'post' | 'comment';
  trainingResults: {
    samplesProcessed: number;
    accuracyScore: number;
    modelVersion: number;
    trainingDuration: number;
  };
  voiceCharacteristics: {
    toneProfile: ToneProfile;
    vocabularyPatterns: string[];
    structuralPreferences: StructuralPreference[];
    authenticityThresholds: AuthenticityThresholds;
  };
}
```

#### GET /api/content/voice-models/{type}
**Purpose**: Retrieve voice model information

```typescript
// Path Parameters
type: 'post' | 'comment'

// Response
interface VoiceModelResponse {
  model: {
    id: string;
    contentType: 'post' | 'comment';
    version: number;
    accuracy: number;
    lastTrained: string;
    trainingDataCount: number;
  };
  characteristics: VoiceCharacteristics;
  performance: {
    averageAuthenticityScore: number;
    successRate: number;
    lastValidation: string;
  };
}
```

#### POST /api/content/authenticity-check
**Purpose**: Check authenticity score for content

```typescript
// Request
interface AuthenticityCheckRequest {
  content: string;
  contentType: 'post' | 'comment';
  modelVersion?: number;
}

// Response
interface AuthenticityCheckResponse {
  authenticityScore: number; // 0-100
  confidence: number;
  analysis: {
    toneMatch: number;
    vocabularyMatch: number;
    structureMatch: number;
    overallMatch: number;
  };
  deviations: {
    factor: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }[];
  recommendations: string[];
}
```

### 3. Content Generation APIs

#### POST /api/content/generate-variants
**Purpose**: Generate three content variants with different strategies

```typescript
// Request
interface GenerateVariantsRequest {
  topic: string;
  contentType?: 'post' | 'comment';
  context?: {
    targetAudience?: string;
    industryFocus?: string;
    callToAction?: string;
    tone?: 'professional' | 'casual' | 'authoritative';
  };
  constraints?: {
    maxLength?: number;
    includeHashtags?: boolean;
    includeEmojis?: boolean;
    linkedinFormatting?: boolean;
  };
  options?: {
    useExperimentalApproaches?: boolean;
    emphasizeEngagement?: boolean;
    prioritizeAuthenticity?: boolean;
  };
}

// Response
interface GenerateVariantsResponse {
  jobId: string;
  variants: [
    ContentVariant, // Performance-Optimized
    ContentVariant, // Engagement-Focused
    ContentVariant  // Experimental
  ];
  metadata: {
    generationTime: number;
    modelsUsed: string[];
    patternsApplied: string[];
  };
}

interface ContentVariant {
  content: string;
  strategy: 'performance' | 'engagement' | 'experimental';
  authenticityScore: number;
  predictedMetrics: {
    engagementRate: number;
    confidence: number;
    expectedLikes: number;
    expectedComments: number;
    expectedShares: number;
  };
  appliedPatterns: string[];
  optimizationNotes: string[];
  hashtags: string[];
}
```

#### GET /api/content/job/{id}
**Purpose**: Get generation job status and results

```typescript
// Path Parameters
id: string // Job UUID

// Response
interface GenerationJobResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  topic: string;
  variants?: ContentVariant[];
  error?: string;
  processingTime?: number;
  createdAt: string;
  completedAt?: string;
}
```

#### POST /api/content/optimize-content
**Purpose**: Get optimization suggestions for existing content

```typescript
// Request
interface OptimizeContentRequest {
  content: string;
  targetMetrics?: {
    increaseEngagement?: boolean;
    improveAuthenticity?: boolean;
    optimizeForPlatform?: boolean;
  };
}

// Response
interface OptimizeContentResponse {
  originalScore: number;
  optimizedContent: string;
  improvements: {
    category: string;
    originalValue: number;
    optimizedValue: number;
    improvement: number;
  }[];
  suggestions: {
    type: 'addition' | 'modification' | 'removal';
    description: string;
    impact: 'high' | 'medium' | 'low';
  }[];
}
```

### 4. Performance Feedback APIs

#### POST /api/content/performance-feedback
**Purpose**: Submit performance data for published content

```typescript
// Request
interface PerformanceFeedbackRequest {
  generationJobId: string;
  variantIndex: number; // 0, 1, or 2
  publishedContent: string;
  linkedinPostId?: string;
  actualMetrics: {
    views?: number;
    likes: number;
    comments: number;
    shares: number;
    clickThroughs?: number;
    engagementRate?: number;
  };
  publicationDate: string;
  trackingComplete?: boolean;
}

// Response
interface PerformanceFeedbackResponse {
  feedbackId: string;
  predictionAccuracy: {
    likesAccuracy: number;
    commentsAccuracy: number;
    sharesAccuracy: number;
    overallAccuracy: number;
  };
  learningInsights: {
    successfulPatterns: string[];
    underperformingElements: string[];
    unexpectedOutcomes: string[];
  };
  modelUpdates: {
    patternsUpdated: number;
    voiceModelAdjustments: string[];
  };
}
```

#### GET /api/content/learning-insights
**Purpose**: Get system learning insights over time

```typescript
// Query Parameters
interface LearningInsightsQuery {
  timeframe?: '7d' | '30d' | '90d' | 'all';
  metricType?: 'accuracy' | 'effectiveness' | 'trends';
}

// Response
interface LearningInsightsResponse {
  summary: {
    totalFeedback: number;
    averageAccuracy: number;
    improvementTrend: number;
    lastUpdated: string;
  };
  insights: {
    accuracyTrends: TimeSeries[];
    patternEffectiveness: PatternEffectivenessData[];
    contentPerformanceTrends: TimeSeries[];
    recommendedAdjustments: string[];
  };
}
```

### 5. Queue Management APIs

#### GET /api/content/queue-stats
**Purpose**: Get queue system status and statistics

```typescript
// Response
interface QueueStatsResponse {
  queues: {
    [queueName: string]: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      avgProcessingTime: number;
    };
  };
  workers: {
    active: number;
    idle: number;
    total: number;
  };
  system: {
    healthy: boolean;
    lastHeartbeat: string;
    memoryUsage: number;
  };
}
```

#### POST /api/content/test-job-flow
**Purpose**: Test complete job processing flow (development only)

```typescript
// Request
interface TestJobFlowRequest {
  testType: 'simple' | 'complex' | 'error';
  parameters?: any;
}

// Response
interface TestJobFlowResponse {
  testId: string;
  stages: {
    [stageName: string]: {
      status: 'pending' | 'completed' | 'failed';
      duration?: number;
      result?: any;
    };
  };
  overallStatus: 'completed' | 'failed';
  totalDuration: number;
}
```

## Error Handling

### Standard Error Codes
```typescript
const API_ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'AUTH_001',
  FORBIDDEN: 'AUTH_002',
  TOKEN_EXPIRED: 'AUTH_003',
  
  // Validation Errors
  INVALID_REQUEST: 'VAL_001',
  MISSING_REQUIRED_FIELD: 'VAL_002',
  INVALID_FORMAT: 'VAL_003',
  
  // Business Logic Errors
  INSUFFICIENT_HISTORICAL_DATA: 'BIZ_001',
  VOICE_MODEL_NOT_TRAINED: 'BIZ_002',
  GENERATION_FAILED: 'BIZ_003',
  PATTERN_NOT_FOUND: 'BIZ_004',
  
  // System Errors
  EXTERNAL_SERVICE_ERROR: 'SYS_001',
  DATABASE_ERROR: 'SYS_002',
  QUEUE_ERROR: 'SYS_003',
  TIMEOUT_ERROR: 'SYS_004',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_001',
} as const;
```

### Error Response Examples
```typescript
// Validation Error
{
  success: false,
  error: {
    code: "VAL_002",
    message: "Missing required field 'topic'",
    details: {
      field: "topic",
      required: true,
      received: null
    }
  },
  metadata: {
    timestamp: "2025-08-19T10:30:00Z",
    requestId: "req_123456789"
  }
}

// Business Logic Error
{
  success: false,
  error: {
    code: "BIZ_001",
    message: "Insufficient historical data for analysis",
    details: {
      postsFound: 5,
      minimumRequired: 25,
      suggestion: "Please import more historical posts or lower the minimum threshold"
    }
  },
  metadata: {
    timestamp: "2025-08-19T10:30:00Z",
    requestId: "req_123456789"
  }
}
```

## Rate Limiting

### Rate Limit Configuration
```typescript
const RATE_LIMITS = {
  // Content generation (expensive operations)
  'POST /api/content/generate-variants': {
    limit: 10,
    window: '1h',
    message: 'Content generation limited to 10 requests per hour'
  },
  
  // Analysis operations (moderate cost)
  'POST /api/content/historical-analysis': {
    limit: 5,
    window: '1h',
    message: 'Historical analysis limited to 5 requests per hour'
  },
  
  // General API access
  '*': {
    limit: 100,
    window: '1m',
    message: 'General API access limited to 100 requests per minute'
  }
};
```

### Rate Limit Headers
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1635724800
X-RateLimit-RetryAfter: 3600
```

## Webhooks (Future Enhancement)

### Webhook Events
```typescript
interface WebhookEvent {
  id: string;
  type: 'generation.completed' | 'analysis.completed' | 'performance.updated';
  data: any;
  timestamp: string;
  userId: string;
}

// Example: Generation completed
{
  id: "evt_123456",
  type: "generation.completed",
  data: {
    jobId: "job_789",
    variants: [...],
    processingTime: 25000
  },
  timestamp: "2025-08-19T10:30:00Z",
  userId: "user_456"
}
```

## Testing

### Test Endpoints (Development Only)
```typescript
// Test OpenAI connection
GET /api/debug/openai

// Test database connectivity
GET /api/debug/database

// Test queue system
GET /api/debug/queue

// Test complete flow
POST /api/debug/test-flow
```

### API Testing Strategy
1. **Unit Tests**: Test individual endpoint logic
2. **Integration Tests**: Test database and external service integration
3. **Load Tests**: Test performance under load
4. **End-to-End Tests**: Test complete user workflows

## Security Considerations

### Input Validation
- All inputs validated with Zod schemas
- Content length limits enforced
- SQL injection prevention
- XSS protection for content display

### Authentication
- JWT token validation on all protected endpoints
- Role-based access control
- Request signing for service-to-service communication

### Data Protection
- Sensitive data encrypted in transit and at rest
- Personal information handled according to privacy policies
- Audit logging for all data access

## Performance Considerations

### Caching Strategy
- Redis caching for frequently accessed patterns and insights
- CDN caching for static responses
- Database query result caching

### Optimization
- Database query optimization with proper indexing
- Pagination for large result sets
- Asynchronous processing for expensive operations
- Response compression for large payloads

---

**Document Status**: Ready for Implementation
**Last Updated**: 2025-08-19
**API Version**: v1
**Next Review**: Post Phase 1 implementation
**Dependencies**: Database schema, authentication system, queue infrastructure