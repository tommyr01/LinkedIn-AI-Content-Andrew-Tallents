#!/bin/bash

# Quick test for the most likely issue - OpenAI connection
# Update this URL with your actual Railway URL

RAILWAY_URL="https://linkedin-ai-content-andrew-tallents-production.up.railway.app"

echo "🔍 Quick OpenAI Connection Test"
echo "Testing: $RAILWAY_URL/debug/openai"
echo ""

curl -s "$RAILWAY_URL/debug/openai" | jq .

echo ""
echo "💡 If this test fails, the issue is likely:"
echo "  - Missing OPENAI_API_KEY in Railway environment"
echo "  - Invalid OpenAI API key"
echo "  - Wrong OpenAI model specified"
echo "  - Rate limiting or billing issues"