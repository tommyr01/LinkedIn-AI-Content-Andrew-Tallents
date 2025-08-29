# Automatic LinkedIn Post Syncing System

## Overview

This system automatically syncs Andrew's LinkedIn posts twice daily to keep the AI content generation system's training data fresh and up-to-date. It's built using BullMQ for reliable job scheduling and includes comprehensive monitoring and error handling.

## Features

✅ **Automated Scheduling**: Runs twice daily at 6 AM and 1 PM UK time (5 AM and 12 PM UTC during GMT)  
✅ **Error Handling**: Automatic retries with exponential backoff  
✅ **Monitoring**: Real-time metrics, alerts, and health checks  
✅ **Manual Triggers**: API endpoints for testing and manual execution  
✅ **Voice Learning Integration**: Automatically triggers voice analysis for new posts  
✅ **Production-Ready**: Robust error handling and logging  

## System Architecture

### Components

1. **Scheduler Service** (`src/services/scheduler.ts`)
   - Manages repeatable jobs using BullMQ cron patterns
   - Schedules LinkedIn sync twice daily (6 AM & 1 PM UK time)
   - Schedules voice learning analysis weekly (Sundays 10 AM UTC)

2. **LinkedIn Sync Service** (`src/services/linkedin-sync.ts`)
   - HTTP client for calling the main app's sync API
   - Health checks and timeout handling
   - Automatic voice analysis triggering

3. **Scheduled Sync Worker** (`src/workers/scheduled-sync.ts`)
   - Processes sync jobs from the queue
   - Progress tracking and error handling
   - Integration with monitoring service

4. **Monitoring Service** (`src/services/sync-monitor.ts`)
   - Tracks sync performance metrics
   - Alert system for failures and anomalies
   - Health status reporting

5. **API Endpoints** (`src/routes/sync-monitor.ts`)
   - RESTful API for monitoring and control
   - Manual sync triggers
   - Metrics and health endpoints

## Scheduled Jobs

### LinkedIn Posts Sync
- **Schedule**: `0 5,12 * * *` (6 AM and 1 PM UK time - 5 AM and 12 PM UTC during GMT)
- **Function**: Fetches latest LinkedIn posts from RapidAPI
- **Duration**: ~30-60 seconds (depending on API response)
- **Retry**: Up to 3 attempts with exponential backoff
- **Voice Analysis**: Automatically triggered for new posts

### Voice Learning Analysis  
- **Schedule**: `0 10 * * 0` (Sundays at 10 AM UTC)
- **Function**: Analyzes recent posts for voice patterns
- **Duration**: ~5-10 seconds
- **Retry**: Up to 2 attempts

## API Endpoints

All endpoints are available on the worker service (default port 3002):

### Status & Monitoring
```bash
# Get sync system status
GET /api/sync/status

# Get sync job history
GET /api/sync/jobs?status=completed&limit=10

# Get health status
GET /api/sync/health

# Get detailed metrics
GET /api/sync/metrics

# Get upcoming scheduled runs
GET /api/sync/next-runs
```

### Control & Management
```bash
# Trigger manual sync
POST /api/sync/trigger
{
  "type": "linkedin_posts_sync",
  "username": "andrewtallents"
}

# Configure alerts
POST /api/sync/alerts/config
{
  "alertType": "consecutive_failures",
  "enabled": true,
  "threshold": 3
}

# Reset job metrics
POST /api/sync/metrics/reset
{
  "jobName": "linkedin-posts-sync-twice-daily"
}
```

## Monitoring & Alerts

### Health Status Levels
- **🟢 Healthy**: All systems operational, success rate > 80%
- **🟡 Warning**: 1-2 consecutive failures, monitoring closely
- **🔴 Critical**: 3+ consecutive failures, immediate attention needed

### Alert Types
1. **Consecutive Failures**: Triggered after 3 failed attempts
2. **Success Rate**: Alerts if success rate drops below 80%
3. **Duration**: Alerts if jobs take longer than 5 minutes
4. **No Runs**: Alerts if no jobs run for 24+ hours

### Monitoring Metrics
- Total runs, success/failure counts
- Average job duration
- Success rate percentage
- Consecutive failure tracking
- Last run timestamps

## Environment Configuration

Required environment variables:

```bash
# Main app URL for sync API calls
MAIN_APP_URL=http://localhost:3000
# or
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Redis for queue management (inherited from main worker config)
REDIS_URL=redis://localhost:6379

# All other existing worker service variables...
```

## Development Testing

### Manual Sync Trigger
```bash
curl -X POST http://localhost:3002/api/sync/trigger \
  -H "Content-Type: application/json" \
  -d '{"type": "linkedin_posts_sync", "username": "andrewtallents"}'
```

### Check Status
```bash
curl http://localhost:3002/api/sync/status | jq '.'
```

### View Metrics
```bash
curl http://localhost:3002/api/sync/metrics | jq '.'
```

### Check Health
```bash
curl http://localhost:3002/api/sync/health | jq '.'
```

## Production Deployment

### Scaling Considerations
- Sync jobs run sequentially to respect API rate limits
- Each sync processes 2-3 pages of posts (configurable)
- Built-in delays between API requests (3 seconds)

### Error Handling
- **Network Issues**: Automatic retries with backoff
- **API Rate Limits**: Graceful handling, continues with existing data
- **Partial Failures**: Continues processing, tracks errors
- **Service Unavailable**: Retry logic with exponential backoff

### Logging
All sync activities are logged with structured data:
- Job start/completion times
- Success/failure status
- Error details and retry attempts
- Performance metrics

## Integration Points

### Voice Learning System
- New posts automatically trigger voice analysis
- Analysis results feed back into content generation
- Weekly comprehensive analysis for pattern detection

### Main Application
- Synced posts appear in "My Posts" page
- Updated engagement metrics
- Fresh training data for AI agents

### Database Updates
- Post performance analytics
- Voice learning data
- Engagement metrics tracking

## Troubleshooting

### Common Issues

**Sync Jobs Failing**
1. Check main app availability (`MAIN_APP_URL`)
2. Verify RapidAPI credentials in main app
3. Check Redis connection
4. Review error logs in worker service

**No Jobs Running**
1. Verify scheduler initialization in logs
2. Check Redis queue health
3. Ensure worker service is running
4. Check for timezone issues (all times in UTC)

**Performance Issues**
1. Monitor job duration metrics
2. Check API response times
3. Verify network connectivity
4. Review rate limiting logs

### Debug Commands
```bash
# Check worker service status
curl http://localhost:3002/health

# View queue status
curl http://localhost:3002/debug

# Check Redis connectivity
redis-cli ping

# View recent logs
tail -f logs/worker.log | grep sync
```

## Future Enhancements

### Planned Features
- **Smart Scheduling**: Adjust timing based on Andrew's posting patterns  
- **Notification Integration**: Slack/email alerts for failures
- **Performance Analytics**: Detailed sync performance tracking
- **Multi-user Support**: Sync multiple LinkedIn profiles
- **Batch Processing**: Bulk sync operations for historical data

### Monitoring Improvements
- **Dashboard**: Real-time sync status visualization
- **Alerting**: Integration with monitoring services (Sentry, DataDog)
- **Metrics Export**: Prometheus/Grafana integration
- **Historical Analysis**: Long-term sync performance trends

## Technical Details

### Queue Configuration
```typescript
// Twice daily LinkedIn sync
{
  repeat: {
    pattern: '0 5,12 * * *',
    tz: 'UTC'
  },
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 30000
  }
}
```

### Error Recovery
- Failed jobs retry after 30 seconds (first attempt)
- Exponential backoff for subsequent retries
- Maximum 3 attempts per job
- Failed jobs preserved for debugging

### Rate Limiting
- 3-second delay between API requests
- Maximum 3 pages per sync (configurable)
- Respects LinkedIn/RapidAPI rate limits
- Graceful handling of rate limit errors

---

## Summary

The automatic LinkedIn post syncing system ensures Andrew's AI content generation always has fresh, up-to-date training data. It runs reliably twice daily, handles errors gracefully, and provides comprehensive monitoring to maintain system health.

**Next sync runs:**
- Today at 1:00 PM UK time (12:00 PM UTC)
- Tomorrow at 6:00 AM UK time (5:00 AM UTC)  
- Voice analysis: Sunday at 10:00 AM UTC

The system is production-ready and requires no manual intervention for normal operation.