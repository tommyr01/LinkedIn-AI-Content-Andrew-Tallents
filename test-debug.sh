#!/bin/bash

# Debug test script for Railway worker service
# Usage: chmod +x test-debug.sh && ./test-debug.sh

# Update this with your actual Railway URL
RAILWAY_URL="https://linkedin-ai-content-andrew-tallents-production.up.railway.app"

echo "🚀 Testing Railway Worker Service Debug Endpoints"
echo "URL: $RAILWAY_URL"
echo ""

# Test 1: Health check
echo "1️⃣ Testing health endpoint..."
curl -s "$RAILWAY_URL/health" | jq . || echo "❌ Health check failed"
echo ""

# Test 2: Environment check
echo "2️⃣ Testing environment variables..."
curl -s "$RAILWAY_URL/debug/env" | jq . || echo "❌ Environment check failed"
echo ""

# Test 3: OpenAI connection test
echo "3️⃣ Testing OpenAI connection..."
curl -s "$RAILWAY_URL/debug/openai" | jq . || echo "❌ OpenAI test failed"
echo ""

# Test 4: Redis connection test
echo "4️⃣ Testing Redis connection..."
curl -s "$RAILWAY_URL/debug/redis" | jq . || echo "❌ Redis test failed"
echo ""

# Test 5: Simple AI agents test (most important)
echo "5️⃣ Testing Simple AI Agents (no historical context)..."
curl -s -X POST "$RAILWAY_URL/debug/ai-agents-simple" \
  -H "Content-Type: application/json" \
  -d '{"topic": "leadership challenges"}' | jq . || echo "❌ Simple AI agents test failed"
echo ""

# Test 6: Complex AI agents test
echo "6️⃣ Testing Complex AI Agents (with historical context)..."
curl -s -X POST "$RAILWAY_URL/debug/ai-agents" \
  -H "Content-Type: application/json" \
  -d '{"topic": "leadership challenges"}' | jq . || echo "❌ Complex AI agents test failed"
echo ""

# Test 8: Production data test (MOST IMPORTANT)
echo "8️⃣ Testing with REAL production data (sequential AI agents)..."
curl -s -X POST "$RAILWAY_URL/debug/production-data" \
  -H "Content-Type: application/json" \
  -d '{"topic": "leadership challenges"}' | jq . || echo "❌ Production data test failed"
echo ""

echo "🏁 Debug tests completed!"
echo ""
echo "💡 Next steps based on results:"
echo "- If OpenAI test fails: Check API key in Railway environment"
echo "- If Simple AI agents work but Complex ones fail: Issue is in historical context"
echo "- If both AI agent tests fail: Issue is in basic OpenAI integration"
echo "- Check Railway logs for detailed error messages"