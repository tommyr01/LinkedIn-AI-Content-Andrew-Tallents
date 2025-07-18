# Lindy Webhook Setup Guide

## Overview

This guide explains how to set up Lindy webhooks for LinkedIn posting and commenting automation.

## Webhook Endpoints

### 1. Post to LinkedIn
**Endpoint**: `POST /webhooks/linkedin/post`

**Payload**:
```json
{
  "content": "Your LinkedIn post content here",
  "hashtags": ["#leadership", "#coaching"],
  "mentions": ["@username"],
  "scheduledTime": "2024-01-15T10:00:00Z",
  "authorId": "andrew-tallents",
  "postId": "unique-post-id"
}
```

**Response**:
```json
{
  "success": true,
  "jobId": "job-123456"
}
```

### 2. Comment on LinkedIn
**Endpoint**: `POST /webhooks/linkedin/comment`

**Payload**:
```json
{
  "comment": "Great insights! Thanks for sharing.",
  "postUrl": "https://linkedin.com/posts/activity-id",
  "authorId": "andrew-tallents",
  "connectionId": "connection-123"
}
```

**Response**:
```json
{
  "success": true,
  "jobId": "job-789012"
}
```

## Lindy Configuration

### 1. Create Lindy Agent for LinkedIn Posting

```yaml
name: LinkedIn Post Publisher
description: Posts content to LinkedIn on behalf of Andrew
triggers:
  - webhook: /webhooks/linkedin/post
actions:
  - linkedin_post:
      account: andrew-tallents
      content: "{{webhook.content}}"
      hashtags: "{{webhook.hashtags}}"
      mentions: "{{webhook.mentions}}"
      schedule: "{{webhook.scheduledTime}}"
```

### 2. Create Lindy Agent for LinkedIn Commenting

```yaml
name: LinkedIn Comment Publisher
description: Comments on LinkedIn posts on behalf of Andrew
triggers:
  - webhook: /webhooks/linkedin/comment
actions:
  - linkedin_comment:
      account: andrew-tallents
      post_url: "{{webhook.postUrl}}"
      comment: "{{webhook.comment}}"
```

## Webhook Callbacks

Lindy will send status updates back to your app:

### Success Callback
```json
{
  "type": "linkedin.post.completed",
  "jobId": "job-123456",
  "data": {
    "linkedin_post_id": "activity-6789012345",
    "published_at": "2024-01-15T10:00:00Z",
    "post_url": "https://linkedin.com/posts/activity-6789012345"
  }
}
```

### Error Callback
```json
{
  "type": "linkedin.post.failed",
  "jobId": "job-123456",
  "error": "LinkedIn API rate limit exceeded",
  "retry_after": 3600
}
```

## Environment Variables

Set these in your `.env.local` file:

```bash
LINDY_WEBHOOK_URL=https://your-lindy-webhook-url.com
LINDY_WEBHOOK_TOKEN=your_lindy_webhook_token
```

## Testing the Integration

### 1. Test Post Publishing
```bash
curl -X POST http://localhost:3000/api/linkedin/post \
  -H "Content-Type: application/json" \
  -d '{
    "postId": "test-post-123",
    "content": "Testing LinkedIn integration with Lindy!",
    "hashtags": ["#test", "#automation"]
  }'
```

### 2. Test Comment Publishing
```bash
curl -X POST http://localhost:3000/api/linkedin/comment \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Great post! Thanks for sharing.",
    "postUrl": "https://linkedin.com/posts/test-activity",
    "connectionId": "connection-123"
  }'
```

## Error Handling

The integration includes:
- Automatic retry logic for failed requests
- Job status polling to track completion
- Proper error messages and logging
- Rate limit handling

## Security Considerations

1. **Webhook Authentication**: All webhook calls include authentication tokens
2. **Signature Verification**: Incoming webhooks are verified using signatures
3. **Rate Limiting**: Built-in rate limiting to prevent abuse
4. **Content Validation**: All content is validated before sending to Lindy

## Monitoring

Monitor webhook activity through:
- Application logs
- Lindy dashboard
- Database job tracking
- Error alerting system

## Next Steps

1. Set up your Lindy account and agents
2. Configure webhook URLs in Lindy
3. Test the integration with sample posts
4. Monitor initial posting activity
5. Scale to full production usage