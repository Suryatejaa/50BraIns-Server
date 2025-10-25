# Notification Testing Guide

## Test Case 1: Application Approval Notification (FIXED)
```bash
# First, get an application ID that's pending
curl -X GET "http://localhost:4003/api/gigs/applications/received" \
  -H "x-user-id: YOUR_BRAND_USER_ID" \
  -H "x-user-email: brand@example.com" \
  -H "x-user-roles: USER,BRAND"

# Then approve an application (replace with actual application ID)
curl -X POST "http://localhost:4003/api/gigs/applications/APPLICATION_ID/approve" \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_BRAND_USER_ID" \
  -H "x-user-email: brand@example.com" \
  -H "x-user-roles: USER,BRAND"
```

## Test Case 2: Work Review Notification (SHOULD WORK)
```bash
# Review a work submission (replace with actual submission ID)
curl -X POST "http://localhost:4003/api/gigs/submissions/SUBMISSION_ID/review" \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_BRAND_USER_ID" \
  -H "x-user-email: brand@example.com" \
  -H "x-user-roles: USER,BRAND" \
  -d '{
    "status": "APPROVED",
    "rating": 5,
    "feedback": "Great work! Very satisfied with the delivery."
  }'
```

## Test Case 3: Check Notification Service Logs
```bash
# Monitor notification service logs in real-time
Get-Content "D:\project\50brains\50BraIns-Server\services\notification-service\logs\combined4.log" -Wait -Tail 20

# Or check recent logs
Get-Content "D:\project\50brains\50BraIns-Server\services\notification-service\logs\combined4.log" | Select-Object -Last 50
```

## Expected Notification Events

### Application Approval Flow:
1. **Gig Service publishes**: `application_approved_notification`
2. **Notification Service receives**: Event via RabbitMQ
3. **Handler called**: `handleApplicationApprovedNotification`
4. **Result**: Applicant gets "🎉 Application Approved!" notification

### Work Review Flow:
1. **Gig Service publishes**: `submission_reviewed_notification`
2. **Notification Service receives**: Event via RabbitMQ  
3. **Handler called**: `handleSubmissionReviewedNotification`
4. **Result**: Applicant gets review result notification

## Debug Checklist

### If notifications still not working:
1. **Check RabbitMQ connection**: Services connected to RabbitMQ?
2. **Check event publishing**: Are events being published by gig service?
3. **Check event routing**: Are events reaching notification service queues?
4. **Check handler execution**: Are notification handlers being called?
5. **Check database**: Are notifications being created in the database?

### Key Log Patterns to Look For:
```
✅ [Notification Service] Application approved notification processed successfully
❌ [Notification Service] Error handling application approved notification
🔍 [Notification Service] Processing event with routing key: "application_approved_notification"
📨 [Notification Service] Handling application_approved_notification event
```