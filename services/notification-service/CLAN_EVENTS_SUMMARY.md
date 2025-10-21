# 🏛️ Clan Events - Notification Service Support

This document outlines all the clan events that are now supported by the notification service, including real-time notifications via WebSocket and RabbitMQ event processing.

## 📋 Supported Clan Events

### 1. **Clan Creation & Management**
- **`clan.created`** - When a new clan is created
  - Notifies: Clan creator
  - Message: "Your clan has been created and is now live. Start inviting members and building your community!"

### 2. **Member Management**
- **`clan.member.joined`** - When a user joins a clan
  - Notifies: New member + Clan head
  - Message: "Welcome to the Clan!" + "New Clan Member!"

- **`clan.member.left`** - When a user leaves a clan
  - Notifies: Clan head
  - Message: "Clan Member Left"

- **`clan.member.removed`** - When a member is removed from a clan
  - Notifies: Removed member
  - Message: "Clan Membership Ended"

### 3. **Join Request Workflow**
- **`clan.join.request`** - When someone requests to join a clan
  - Notifies: Clan head + All admins
  - Message: "New Join Request"

- **`clan.join.request.approved`** - When a join request is approved
  - Notifies: Approved user
  - Message: "Join Request Approved!"

- **`clan.join.request.rejected`** - When a join request is rejected
  - Notifies: Rejected user
  - Message: "Join Request Update"

### 4. **Role & Permission Changes**
- **`clan.member.role.updated`** - When a member's role changes
  - Notifies: Member whose role changed
  - Message: "Role Updated"

- **`clan.admin.added`** - When someone is promoted to admin
  - Notifies: New admin
  - Message: "Admin Role Granted"

- **`clan.admin.removed`** - When someone loses admin role
  - Notifies: Former admin
  - Message: "Admin Role Removed"

### 5. **Ownership Changes**
- **`clan.ownership.transferred`** - When clan ownership is transferred
  - Notifies: New owner + Old owner
  - Message: "Clan Ownership Transferred"

### 6. **Communication & Content**
- **`clan.message.sent`** - When messages are sent in clan (especially gig sharing)
  - Notifies: All clan members (except sender)
  - Message: "New Gig Shared in Clan" (for gig sharing)

### 7. **Reputation & Analytics**
- **`clan.reputation.updated`** - When clan reputation score changes
  - Notifies: Clan head
  - Message: "Clan Reputation Updated"

### 8. **General Updates**
- **`clan.updated`** - When clan information is updated
  - Notifies: All clan members (except updater)
  - Message: "Clan Updated"

## 🔌 WebSocket Support

### Notification WebSocket
- **Endpoint**: `/api/notifications/ws?userId={userId}`
- **Purpose**: Real-time notifications for all clan events
- **Features**: Fallback mode when notification service is unavailable

### Clan WebSocket
- **Endpoint**: `/api/clans/ws?userId={userId}&clanId={clanId}`
- **Purpose**: Real-time clan-specific updates and events
- **Features**: Fallback mode when clan service is unavailable

## 🐰 RabbitMQ Event Routing

### Exchange
- **Name**: `brains_events`
- **Type**: `topic`

### Routing Keys
All clan events use the pattern `clan.{event_type}` for routing:

```
clan.created
clan.member.joined
clan.member.left
clan.join.request
clan.join.request.approved
clan.join.request.rejected
clan.member.role.updated
clan.member.removed
clan.admin.added
clan.admin.removed
clan.ownership.transferred
clan.message.sent
clan.reputation.updated
clan.updated
```

### Queue Binding
- **Queue**: `notifications.clan.events`
- **Bindings**: All clan event routing keys
- **TTL**: 7 days
- **Durability**: Persistent

## 📱 Frontend Integration

### Connection Examples

```javascript
// Connect to notifications
const notificationWs = new WebSocket('ws://localhost:3000/api/notifications/ws?userId=123');

// Connect to specific clan
const clanWs = new WebSocket('ws://localhost:3000/api/clans/ws?userId=123&clanId=clan456');
```

### Event Handling

```javascript
notificationWs.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    
    if (notification.category === 'CLAN') {
        // Handle clan-specific notifications
        showClanNotification(notification);
    }
};

clanWs.onmessage = (event) => {
    const clanEvent = JSON.parse(event.data);
    // Handle real-time clan updates
    handleClanEvent(clanEvent);
};
```

## 🚀 Benefits

1. **Real-time Updates**: Instant notifications for all clan activities
2. **Comprehensive Coverage**: All major clan operations are covered
3. **Scalable Architecture**: RabbitMQ ensures reliable event delivery
4. **Fallback Support**: WebSocket connections work even when services are down
5. **Rich Metadata**: Each notification includes relevant context and data
6. **User Experience**: Users stay informed about clan activities without refreshing

## 🔧 Configuration

### Environment Variables
```bash
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
RABBITMQ_EXCHANGE=brains_events
RABBITMQ_QUEUE_CLAN=clan_events
```

### Service URLs
```bash
NOTIFICATION_SERVICE_URL=http://localhost:4009
CLAN_SERVICE_URL=http://localhost:4003
```

## 📊 Monitoring

### Logs
All clan events are logged with detailed information:
- Event type and data
- Notification creation status
- WebSocket delivery status
- Error handling and fallback usage

### Metrics
- Event processing rates
- WebSocket connection counts
- Notification delivery success rates
- Fallback mode usage

---

**Note**: This notification system ensures that all clan members stay informed about important clan activities in real-time, enhancing collaboration and community engagement.
