# Debug Guide for AI Agent Failures

## Current Status
✅ Railway deployment successful  
✅ Research and historical analysis working  
❌ AI agents failing during content generation  

## Quick Debug Steps

### 1. Find Your Railway URL
- Go to your Railway dashboard
- Look for your service URL (should be something like `https://your-service-name-production.up.railway.app`)

### 2. Test OpenAI Connection (Most Likely Issue)
Open in browser or run in terminal:
```bash
curl https://YOUR-RAILWAY-URL/debug/openai
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "OpenAI connection successful",
  "testResult": "OpenAI connection test successful",
  "model": "gpt-4",
  "hasApiKey": true
}
```

**If it fails**, the response will show the exact error and you'll know the issue is:
- Missing `OPENAI_API_KEY` in Railway environment variables
- Invalid API key
- Model access issues (GPT-4 not available)
- Rate limiting or billing problems

### 3. Test Simple AI Agents
```bash
curl -X POST https://YOUR-RAILWAY-URL/debug/ai-agents-simple \
  -H "Content-Type: application/json" \
  -d '{"topic": "leadership challenges"}'
```

**If this works but the main system fails**, the issue is in the historical context processing.

### 4. Check Environment Variables
```bash
curl https://YOUR-RAILWAY-URL/debug/env
```

This will show which API keys are present (without revealing the actual keys).

## Quick Fix Scripts

### Option 1: Run the test scripts
```bash
# Update the URL in the script first
./quick-test.sh
# or
./test-debug.sh
```

### Option 2: Manual browser test
1. Open: `https://YOUR-RAILWAY-URL/debug/openai`
2. Look at the response
3. If successful, try: `https://YOUR-RAILWAY-URL/debug/env`

## Common Issues and Solutions

### Issue 1: OpenAI API Key Missing
**Error:** `"hasApiKey": false`  
**Solution:** Add `OPENAI_API_KEY` to Railway environment variables

### Issue 2: Wrong Model
**Error:** Model not available  
**Solution:** Change model from `gpt-4` to `gpt-3.5-turbo` in Railway environment

### Issue 3: Rate Limiting
**Error:** Rate limit exceeded  
**Solution:** Check OpenAI billing and usage limits

### Issue 4: Historical Context Issues
**Symptoms:** Simple AI agents work, complex ones fail  
**Solution:** Historical context is too long or malformed

## Railway Environment Variables to Check
- `OPENAI_API_KEY` - Your OpenAI API key
- `OPENAI_MODEL` - Should be `gpt-3.5-turbo` or `gpt-4`
- `FIRECRAWL_API_KEY` - For research (working based on logs)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` - Database (working)
- `REDIS_URL` - Queue system (working)

## Next Steps After Testing
1. Run the debug tests above
2. Check the specific error messages
3. Fix the identified issue (likely OpenAI configuration)
4. Test again with a simple content generation job