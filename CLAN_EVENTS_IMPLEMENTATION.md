# Clan Events Implementation

## Overview
This document outlines the implementation of clan-related events that are published to the notification service to ensure users receive real-time notifications for clan activities.

## Events Implemented

### 1. Clan Creation Events
**Triggered when:** A new clan is created
**Events Published:**
- `clan.created` - When a clan is created
- `clan.member.joined` - When the clan owner is automatically added as a member

**Location:** `services/clan-service/src/controllers/clanController.js` - `createClan` method

```javascript
// Publish clan creation event
try {
    await rabbitmqService.publishClanCreated(newClan);
    await rabbitmqService.publishMemberJoined(newClan.id, req.user.id, 'HEAD');
} catch (error) {
    console.error('Failed to publish clan events:', error);
    // Don't fail the request if event publishing fails
}
```

### 2. Join Request Events
**Triggered when:** A user submits a request to join a clan
**Events Published:**
- `clan.join_request.submitted` - When a join request is submitted

**Location:** `services/clan-service/src/controllers/clanController.js` - `requestToJoinClan` method

```javascript
// Publish join request event
try {
    await rabbitmqService.publishJoinRequest(clanId, userId, message);
} catch (error) {
    console.error('Failed to publish join request event:', error);
    // Don't fail the request if event publishing fails
}
```

### 3. Join Request Approval Events
**Triggered when:** A clan head approves a join request
**Events Published:**
- `clan.join_request.approved` - When a join request is approved
- `clan.member.joined` - When the approved user is added to the clan

**Location:** `services/clan-service/src/controllers/memberController.js` - `approveJoinRequest` method

```javascript
// Publish events
try {
    await rabbitmqService.publishJoinRequestApproved(clanId, joinRequest.userId, userId);
    await rabbitmqService.publishMemberJoined(clanId, joinRequest.userId, 'MEMBER');
} catch (error) {
    console.error('Failed to publish approval events:', error);
    // Don't fail the request if event publishing fails
}
```

### 4. Join Request Rejection Events
**Triggered when:** A clan head rejects a join request
**Events Published:**
- `clan.join_request.rejected` - When a join request is rejected

**Location:** `services/clan-service/src/controllers/memberController.js` - `rejectJoinRequest` method

```javascript
// Publish rejection event
try {
    await rabbitmqService.publishJoinRequestRejected(clanId, joinRequest.userId, userId, reason);
} catch (error) {
    console.error('Failed to publish rejection event:', error);
    // Don't fail the request if event publishing fails
}
```

## Event Data Structure

### Clan Created Event
```javascript
{
    clanId: string,
    clanName: string,
    clanHeadId: string,
    visibility: string,
    category: string
}
```

### Member Joined Event
```javascript
{
    clanId: string,
    userId: string,
    clanName: string,
    role: string,
    joinedAt: string
}
```

### Join Request Submitted Event
```javascript
{
    clanId: string,
    userId: string,
    clanName: string,
    clanHeadId: string,
    message: string,
    submittedAt: string
}
```

### Join Request Approved Event
```javascript
{
    clanId: string,
    userId: string,
    clanName: string,
    approvedBy: string,
    approvedAt: string
}
```

### Join Request Rejected Event
```javascript
{
    clanId: string,
    userId: string,
    clanName: string,
    rejectedBy: string,
    reason: string,
    rejectedAt: string
}
```

## Notification Service Integration

### Event Bindings
The notification service is configured to listen for clan events via RabbitMQ bindings in `services/notification-service/src/utils/rabbitmq.js`:

```javascript
// Bind to Clan Service events  
await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.member.joined');
await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.invitation.sent');
await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.member.role_changed');
await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.join_request.submitted');
await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.join_request.approved');
await this.channel.bindQueue('notifications.clan.events', 'brains_events', 'clan.join_request.rejected');
```

### Event Handlers
The notification service includes handlers for all clan events in `services/notification-service/src/consumers/notificationConsumer.js`:

1. **`handleClanJoined`** - Handles member join notifications
2. **`handleClanInvited`** - Handles invitation notifications
3. **`handleClanRoleChanged`** - Handles role change notifications
4. **`handleClanJoinRequestSubmitted`** - Handles join request submission notifications
5. **`handleClanJoinRequestApproved`** - Handles join request approval notifications
6. **`handleClanJoinRequestRejected`** - Handles join request rejection notifications

### Notification Types
Each event handler creates appropriate in-app notifications and may send emails:

- **In-app notifications** - Stored in the database and displayed in the UI
- **Email notifications** - Sent via email service for important events

## RabbitMQ Configuration

### Clan Service RabbitMQ Service
Located in `services/clan-service/src/services/rabbitmqService.js`:

- **Exchange:** `brains_events` (for publishing clan events)
- **Connection:** Uses environment variable `RABBITMQ_URL` or defaults to `amqp://localhost:5672`
- **Event Publishing:** Uses `publishEvent` method with routing keys

### Notification Service RabbitMQ Service
Located in `services/notification-service/src/utils/rabbitmq.js`:

- **Exchange:** `brains_events` (for consuming clan events)
- **Queue:** `notifications.clan.events`
- **Event Processing:** Routes events to appropriate handlers

## Testing

### Manual Testing
Use the provided test script `test-clan-events.js` to verify event publishing:

```bash
node test-clan-events.js
```

### Expected Behavior
1. **Clan Creation:** Should trigger notifications for the clan owner
2. **Join Request:** Should notify both the requester and clan head
3. **Join Approval:** Should notify the approved user
4. **Join Rejection:** Should notify the rejected user

## Error Handling

### Event Publishing Failures
All event publishing is wrapped in try-catch blocks to prevent API failures:

```javascript
try {
    await rabbitmqService.publishEvent('event.type', eventData);
} catch (error) {
    console.error('Failed to publish event:', error);
    // Don't fail the request if event publishing fails
}
```

### Service Resilience
- Clan service continues to function even if RabbitMQ is unavailable
- Notification service gracefully handles missing event data
- Failed notifications are logged but don't break the system

## Monitoring

### Logs to Watch
- Clan service: Look for "Failed to publish clan events" messages
- Notification service: Look for "Error handling clan" messages
- RabbitMQ: Check connection status and queue depths

### Health Checks
- Clan service: `http://localhost:4003/health`
- Notification service: `http://localhost:4005/health`
- RabbitMQ: Check if exchanges and queues are properly bound

## Future Enhancements

### Potential Additions
1. **Clan Invitation Events** - When members are invited
2. **Clan Role Change Events** - When member roles are updated
3. **Clan Member Removal Events** - When members are removed
4. **Clan Deletion Events** - When clans are deleted

### Performance Optimizations
1. **Event Batching** - Batch multiple events for efficiency
2. **Event Filtering** - Only send notifications for important events
3. **User Preferences** - Allow users to configure notification preferences

## Conclusion

The clan events implementation ensures that all major clan activities trigger appropriate notifications, providing users with real-time feedback about clan-related activities. The system is designed to be resilient and maintain functionality even when event publishing fails. 