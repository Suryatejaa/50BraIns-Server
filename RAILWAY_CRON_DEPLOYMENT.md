# Railway Deployment Guide for 50BraIns Cron Jobs

## Overview
The 50BraIns platform uses automated cron jobs for daily payout processing. This system is optimized for Railway's container-based deployment environment.

## Architecture

### Local Development
- Uses simple `node-cron` scheduler
- Single instance, no leader election needed
- Direct controller method calls

### Railway Production  
- Uses leader election to prevent duplicate processing
- Multiple container instances coordinate through database
- Automatic failover if leader instance goes down

## Railway-Specific Features

### 1. Leader Election System
- Only one instance processes cron jobs at a time
- Database-backed coordination (`cron_leader` table)
- Automatic leadership handover during restarts

### 2. Heartbeat Monitoring
- Leader sends heartbeat every 30 seconds
- Followers monitor for leadership opportunities
- 5-minute timeout for leadership takeover

### 3. Instance Identification
- Uses `RAILWAY_REPLICA_ID` environment variable
- Fallback to timestamp-based ID for local development

## Database Requirements

### Migration Required
Run this SQL to add the leader election table:

```sql
CREATE TABLE IF NOT EXISTS cron_leader (
    id VARCHAR(50) PRIMARY KEY,
    instance_id VARCHAR(100) NOT NULL,
    last_heartbeat DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_heartbeat (last_heartbeat),
    INDEX idx_instance (instance_id)
);
```

## Environment Variables

### Required for Railway
```bash
RAILWAY_ENVIRONMENT=production  # Enables Railway-optimized scheduler
RAILWAY_REPLICA_ID=auto         # Set by Railway automatically
```

### Optional Configuration
```bash
CRON_TIMEZONE=Asia/Kolkata      # Default timezone for jobs
CRON_PAYOUT_TIME=0 2 * * *      # Daily at 2:00 AM IST
```

## Cron Job Schedule

| Job | Schedule | Purpose |
|-----|----------|---------|
| Daily Payouts | 2:00 AM IST | Process 24h+ old approved submissions |
| Leadership Heartbeat | Every 30s | Maintain leader election |
| Pending Check | Every hour | Monitor pending payouts (logging only) |

## API Endpoints

### Admin Endpoints
```bash
# Check cron status
GET /admin/cron/status

# Manually trigger payouts (leader only)
POST /admin/cron/trigger-payouts

# Check pending payouts
GET /admin/payouts/pending?days=1

# Process daily payouts manually
POST /admin/payouts/process-daily
```

## Monitoring & Logging

### Key Log Messages
- `👑 Instance X elected as leader` - Leadership acquired
- `📍 Instance X is not the leader` - Follower mode
- `🕐 Starting scheduled daily payout processing` - Cron job started
- `✅ Daily payout processing completed` - Success with metrics
- `❌ Lost leadership` - Leadership transferred

### Health Checks
The cron scheduler integrates with the existing `/health` endpoint and includes:
- Leader election status
- Job execution health
- Next scheduled run times

## Deployment Checklist

### Before Deploying
1. ✅ Run database migration for `cron_leader` table
2. ✅ Set `RAILWAY_ENVIRONMENT=production` 
3. ✅ Verify timezone settings
4. ✅ Test payout controller endpoints

### After Deployment
1. Check logs for leadership election
2. Verify only one instance shows as leader
3. Monitor first scheduled run at 2:00 AM IST
4. Test manual trigger endpoint

## Troubleshooting

### Multiple Leaders
If multiple instances claim leadership:
- Check database connectivity
- Verify `cron_leader` table exists
- Look for clock synchronization issues

### No Leader Elected
- Check database permissions
- Verify table migration completed
- Restart all instances to reset election

### Missed Cron Jobs
- Check leader instance health
- Verify timezone configuration
- Monitor container restart patterns

## Testing Commands

### Local Testing
```bash
# Run manual payout processing
npm run cron:daily-payouts

# Check pending payouts
npm run cron:check-pending
```

### Railway Testing
```bash
# Check cron status via API
curl https://your-railway-url.com/admin/cron/status

# Trigger manual payout (requires admin auth)
curl -X POST https://your-railway-url.com/admin/cron/trigger-payouts \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Performance Considerations

### Database Load
- Leader election queries run every 30 seconds
- Heartbeat updates are lightweight (single row)
- Consider adding database indexes if needed

### Container Resources
- Cron scheduler has minimal memory footprint
- Leader election adds ~50ms to startup time
- Heartbeat uses ~1 KB/minute bandwidth

## Fallback Strategy

If cron system fails:
1. Manual processing via admin endpoints
2. Standalone script execution on server
3. External cron service (GitHub Actions, etc.)

The system is designed to be resilient and self-healing, with automatic leader re-election and comprehensive logging for debugging.