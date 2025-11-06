# Delivery Feature Migration - Complete Instructions

## Current Status
The delivery feature is implemented in code but needs database schema migration to work properly.

## Migration Steps

### Step 1: Fix Database Tables (Run in Supabase SQL Editor)

```sql
-- Run the fix-delivery-table-names.sql script
-- This will either rename existing tables or create new ones with correct names
```

**Copy and run the content of `fix-delivery-table-names.sql` in your Supabase SQL Editor.**

### Step 2: Restart Gig Service
After running the SQL script, restart the gig service:

```bash
# Stop the service
# Restart using your normal process

# For PM2 (if using):
pm2 restart gig-service

# For manual restart:
# Stop the current process and start again
```

### Step 3: Verify Migration
Test the delivery endpoints:

```bash
# Test submit delivery endpoint
curl -X POST http://localhost:4003/api/gigs/{gig-id}/submit-delivery \
  -H "Content-Type: application/json" \
  -H "x-user-id: {user-id}" \
  -d '{
    "title": "Test Delivery",
    "description": "Test delivery description",
    "fileUrl": "https://example.com/file.pdf",
    "fileName": "test.pdf"
  }'
```

## What Was Fixed

1. **Table Name Mismatch**: 
   - SQL script created tables with plural names (`gigDeliveries`, `gigDeliveryCleanups`)
   - Prisma schema expected singular names (`gigDelivery`, `gigDeliveryCleanup`)
   - Fixed by updating Prisma schema to match singular table names

2. **Prisma Client Generation**: 
   - Regenerated Prisma client with correct table mappings
   - Now includes `GigDeliveryStatus` and `GigDeliveryCleanupStatus` enums

3. **Error Handling**: 
   - Added comprehensive error handling in application controller
   - Graceful degradation when tables don't exist yet

## Features Now Available

- **Submit Delivery**: `POST /api/gigs/:id/submit-delivery`
- **Review Delivery**: `POST /api/gigs/deliveries/:id/review`
- **Get Gig Deliveries**: `GET /api/gigs/:id/deliveries`
- **Version Management**: Max 3 deliveries per application
- **File Cleanup**: Automatic cleanup after 24 hours
- **Notifications**: Brand and creator notifications for delivery events

## Delivery Workflow

1. Creator submits delivery files for brand review
2. Brand reviews and approves/rejects/requests revision
3. If approved, creator can post content publicly and submit final URL
4. System automatically cleans up private files after 24 hours

The feature is now ready to use once the database migration is completed!