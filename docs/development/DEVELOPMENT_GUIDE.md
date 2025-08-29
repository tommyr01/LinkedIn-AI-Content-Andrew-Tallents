# LinkedIn AI Content Generator - Development Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Common Deployment Errors & Solutions](#common-deployment-errors--solutions)
3. [Next.js Specific Issues](#nextjs-specific-issues)
4. [API Integration Challenges](#api-integration-challenges)
5. [UI/UX Development Patterns](#uiux-development-patterns)
6. [Best Practices Checklist](#best-practices-checklist)
7. [Quick Start Template](#quick-start-template)
8. [Troubleshooting Guide](#troubleshooting-guide)

---

## Project Overview

### Technology Stack
- **Frontend**: Next.js 14 with App Router
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Database**: Airtable (pivot from original Supabase plan)
- **AI**: OpenAI GPT-4 for content generation
- **Automation**: Lindy webhooks for LinkedIn posting
- **Deployment**: Vercel with automatic GitHub integration

### Architecture Decisions
- **Monorepo → Standard Structure**: Initially tried monorepo structure, caused deployment issues
- **Client-side → Server-side**: Redirect handling needed server-side approach
- **Full Storage → Immediate Use**: Pivoted to copy-paste workflow for faster deployment

---

## Common Deployment Errors & Solutions

### 1. GitHub Push Protection Error
**Problem**: Real API keys in `.env.example` file
```
remote: Push declined due to detection of secret in the following locations:
remote: .env.example:1
```

**Solution**:
- Never put real API keys in `.env.example`
- Use placeholder values: `OPENAI_API_KEY=your_openai_key_here`
- Add `.env.local` to `.gitignore`

### 2. Vercel Next.js Detection Issues
**Problem**: Monorepo structure prevented Vercel from detecting Next.js
```
Error: No Next.js application found in repository
```

**Solution**:
- Use standard Next.js structure (not monorepo)
- Place `package.json` in root directory
- Ensure `next.config.js` is in root

### 3. Lockfile Synchronization Error
**Problem**: `pnpm-lock.yaml` out of sync with `package.json`
```
Error: Lockfile is out of sync with package.json
```

**Solution**:
```bash
rm pnpm-lock.yaml
pnpm install
```

### 4. Build Compilation Errors
**Problem**: TypeScript compilation failures
- Missing function exports
- Type mismatches
- Import/export issues

**Solution**:
- Always run `npm run build` locally before pushing
- Fix TypeScript errors immediately
- Use proper type annotations

---

## Next.js Specific Issues

### 1. Homepage 404 Error
**Problem**: Client-side redirect not working in production
```javascript
// This doesn't work reliably in production
export default function HomePage() {
  redirect('/dashboard')
}
```

**Solution**:
- Use proper landing page with client-side navigation
- Add fallback content and manual navigation
- Consider server-side redirects via `vercel.json`

### 2. Build-time vs Runtime Errors
**Problem**: APIs called during build process cause errors
```
Error: OPENAI_API_KEY environment variable is missing
```

**Solution**:
- Move client creation inside request handlers
- Use conditional client creation
- Add proper error handling for missing environment variables

### 3. Static vs Dynamic Pages
**Problem**: Pages with API calls marked as static cause build errors

**Solution**:
- Use dynamic imports for API-dependent components
- Implement proper loading states
- Handle API failures gracefully

### 4. App Router Structure
**Correct Structure**:
```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Homepage
│   ├── dashboard/
│   │   ├── layout.tsx      # Dashboard layout
│   │   ├── page.tsx        # Dashboard home
│   │   └── content/
│   │       └── page.tsx    # Content generator
│   └── api/
│       └── content/
│           └── generate/
│               └── route.ts # API route
└── components/
    └── ui/                 # UI components
```

---

## API Integration Challenges

### 1. OpenAI Response Parsing
**Problem**: OpenAI returns JSON as text string, not parsed JSON
```javascript
// This fails when OpenAI returns markdown-wrapped JSON
const response = JSON.parse(openaiResponse)
```

**Solution**:
```javascript
// Multi-step parsing with cleanup
const cleanResponse = (text) => {
  return text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
}

try {
  parsedResponse = JSON.parse(response)
} catch (error) {
  const cleaned = cleanResponse(response)
  parsedResponse = JSON.parse(cleaned)
}
```

### 2. Airtable Compatibility Issues
**Problem**: Node.js compatibility errors in build
```
TypeError: Expected signal to be an instanceof AbortSignal
```

**Solution**:
- Use conditional client creation
- Handle errors gracefully
- Add fallback behavior when Airtable unavailable

### 3. Environment Variable Handling
**Problem**: Missing environment variables cause build failures

**Solution**:
```javascript
// Always check for environment variables
const createClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required')
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}
```

### 4. JSON Response Validation
**Problem**: AI responses don't always match expected format

**Solution**:
```javascript
// Always validate and provide fallbacks
const validateResponse = (response) => {
  if (!response?.variations || !Array.isArray(response.variations)) {
    return { variations: createFallbackVariations() }
  }
  return response
}
```

---

## UI/UX Development Patterns

### 1. shadcn/ui Component Setup
**Installation**:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input
```

**Missing Components**: Create manually in `src/components/ui/`

### 2. Component Architecture
```typescript
// Always use proper TypeScript interfaces
interface ContentVariation {
  content: string
  hashtags: string[]
  estimated_voice_score: number
}

// Use proper error handling
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### 3. User Experience Patterns
- **Loading States**: Always show loading during API calls
- **Error Handling**: Provide meaningful error messages
- **Copy Functionality**: Use `navigator.clipboard.writeText()`
- **Toast Notifications**: Provide immediate feedback

---

## Best Practices Checklist

### Pre-Development
- [ ] Plan API structure and data flow
- [ ] Choose appropriate tech stack
- [ ] Set up project structure correctly
- [ ] Configure environment variables

### During Development
- [ ] Test build locally: `npm run build`
- [ ] Fix TypeScript errors immediately
- [ ] Handle API errors gracefully
- [ ] Add proper loading states
- [ ] Test with and without environment variables

### Pre-Deployment
- [ ] Remove real API keys from committed files
- [ ] Test build process locally
- [ ] Verify all routes work correctly
- [ ] Check TypeScript compilation
- [ ] Test with production environment

### Post-Deployment
- [ ] Set up environment variables in Vercel
- [ ] Test all functionality in production
- [ ] Monitor error logs
- [ ] Document any issues found

---

## Quick Start Template

### 1. Project Setup
```bash
# Create Next.js project
npx create-next-app@latest my-app --typescript --tailwind --app

# Add shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input

# Install additional dependencies
npm install openai zod sonner
```

### 2. Environment Variables
```bash
# .env.local
OPENAI_API_KEY=your_openai_key_here
AIRTABLE_API_KEY=your_airtable_key_here
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_TABLE_ID=your_table_id
```

### 3. Basic Structure
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   └── api/
│       └── generate/
│           └── route.ts
├── components/
│   └── ui/
└── lib/
    └── utils.ts
```

### 4. API Route Template
```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    if (!body.topic) {
      return NextResponse.json({ error: 'Topic required' }, { status: 400 })
    }
    
    // Process request
    const result = await processRequest(body)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

## Troubleshooting Guide

### Build Errors
1. **TypeScript Errors**: Run `npm run build` locally to catch early
2. **Missing Imports**: Check all import statements
3. **Environment Variables**: Ensure they're not required at build time

### Runtime Errors
1. **API Failures**: Add proper error handling and fallbacks
2. **Client/Server Mismatches**: Use `'use client'` directive appropriately
3. **Hydration Issues**: Ensure server and client render the same content

### Deployment Issues
1. **404 Errors**: Check routing structure and redirects
2. **Build Failures**: Remove build-time dependencies on environment variables
3. **Function Timeouts**: Optimize API calls and add timeouts

### Common Fixes
```bash
# Fix lockfile issues
rm pnpm-lock.yaml && pnpm install

# Fix build issues
npm run build

# Fix TypeScript issues
npm run type-check
```

---

## Lessons Learned

### Key Takeaways
1. **Start Simple**: Begin with basic functionality, add complexity gradually
2. **Test Locally**: Always test builds and deployments locally first
3. **Handle Errors**: Assume APIs will fail and plan accordingly
4. **Environment Variables**: Keep them secure and provide fallbacks
5. **User Experience**: Prioritize immediate value over perfect features

### Success Patterns
- **Iterative Development**: Build, test, deploy, repeat
- **Graceful Degradation**: App works even when some features fail
- **Clear Error Messages**: Help users understand what went wrong
- **Immediate Feedback**: Provide loading states and confirmations

### Avoid These Mistakes
- Don't commit real API keys
- Don't assume APIs will always return expected formats
- Don't ignore TypeScript errors
- Don't skip local testing
- Don't overcomplicate initial architecture

---

*This guide represents lessons learned from building the LinkedIn AI Content Generator. Use it as a reference for future projects to avoid common pitfalls and accelerate development.*