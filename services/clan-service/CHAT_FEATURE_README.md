# 🏛️ Clan Chat Feature Implementation

## Overview

This document describes the implementation of a real-time chat feature for clans in the 50BraIns platform. The chat system uses WebSockets for real-time communication and integrates with RabbitMQ for event publishing.

## Features

### ✅ Implemented Features

1. **Real-time Chat**: Instant messaging between clan members
2. **WebSocket Connections**: Persistent connections for real-time updates
3. **Message Persistence**: All messages are stored in the database
4. **Typing Indicators**: Shows when someone is typing
5. **Read Receipts**: Tracks message read status
6. **System Messages**: Automated announcements and notifications
7. **Connection Management**: Handles multiple users and clans
8. **Health Monitoring**: Connection statistics and health checks
9. **RabbitMQ Integration**: Event publishing for other services
10. **Fallback Support**: Graceful degradation when services are unavailable

### 🔄 Message Types

- **TEXT**: Regular chat messages
- **GIG_SHARE**: Shared gig information
- **ANNOUNCEMENT**: System announcements
- **TYPING**: Typing indicators
- **READ**: Read receipts

## Architecture

### Components

1. **WebSocket Service** (`websocket.service.js`)
   - Manages WebSocket connections
   - Handles message routing
   - Broadcasts to clan members

2. **Message Service** (`message.service.js`)
   - Database operations for messages
   - Message validation and storage
   - Message retrieval and statistics

3. **RabbitMQ Service** (`rabbitmq.service.js`)
   - Event publishing
   - Integration with other services

4. **Health Controller** (`health.controller.js`)
   - WebSocket connection monitoring
   - Service health checks

### Data Flow

```
Client → WebSocket → Message Service → Database
                ↓
            RabbitMQ → Other Services
                ↓
            Broadcast → All Clan Members
```

## API Endpoints

### WebSocket Connection
```
ws://localhost:4003/ws?userId={userId}&clanId={clanId}
```

### Health Checks
```
GET /health                    # Basic health check
GET /health/detailed          # Detailed health with memory usage
GET /health/websocket         # WebSocket connection statistics
```

### Message Management
```
GET    /clans/{clanId}/messages           # Get clan messages
POST   /clans/{clanId}/messages           # Send message
DELETE /clans/{clanId}/messages/{msgId}   # Delete message
GET    /clans/{clanId}/message-stats      # Message statistics
```

## WebSocket Message Format

### Client to Server

#### Chat Message
```json
{
  "type": "chat",
  "content": "Hello clan!",
  "messageType": "TEXT"
}
```

#### Typing Indicator
```json
{
  "type": "typing",
  "isTyping": true
}
```

#### Read Receipt
```json
{
  "type": "read",
  "messageId": "msg_123"
}
```

### Server to Client

#### Connection Confirmation
```json
{
  "type": "connection",
  "title": "🔌 Connected",
  "message": "Connected to clan chat",
  "userId": "user123",
  "clanId": "clan456",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Chat Message
```json
{
  "type": "chat",
  "id": "msg_123",
  "content": "Hello clan!",
  "messageType": "TEXT",
  "userId": "user123",
  "clanId": "clan456",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Recent Messages
```json
{
  "type": "recent_messages",
  "messages": [...],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Setup and Installation

### Prerequisites

1. Node.js (v14 or higher)
2. PostgreSQL database
3. RabbitMQ server (optional, for full functionality)

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/clan_service"

# RabbitMQ (optional)
RABBITMQ_URL="amqp://admin:admin123@localhost:5672"
RABBITMQ_EXCHANGE="brains_events"

# Logging
LOG_LEVEL="INFO"  # ERROR, WARN, INFO, DEBUG

# Service
PORT=4003
NODE_ENV="development"
```

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Database setup**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

3. **Start the service**
   ```bash
   npm start
   ```

## Testing

### Test Client

Use the provided HTML test client (`test-websocket.html`) to test the chat functionality:

1. Open the HTML file in a browser
2. Enter a User ID and Clan ID
3. Click Connect
4. Start chatting!

### Manual Testing

1. **Connect to WebSocket**
   ```bash
   # Using wscat (install with: npm install -g wscat)
   wscat -c "ws://localhost:4003/ws?userId=user123&clanId=clan456"
   ```

2. **Send a message**
   ```json
   {"type": "chat", "content": "Hello clan!", "messageType": "TEXT"}
   ```

3. **Check health**
   ```bash
   curl http://localhost:4003/health/websocket
   ```

## Monitoring and Debugging

### Health Checks

- **Basic Health**: `/health` - Service status and database connectivity
- **Detailed Health**: `/health/detailed` - Memory usage, environment info
- **WebSocket Health**: `/health/websocket` - Connection statistics

### Logging

The service uses structured logging with different levels:

```bash
# Set log level
export LOG_LEVEL=DEBUG

# View logs
tail -f logs/clan-service.log
```

### Connection Statistics

Monitor active connections and usage:

```bash
curl http://localhost:4003/health/websocket | jq '.websocket.connections'
```

## Security Considerations

1. **Authentication**: WebSocket connections require valid userId and clanId
2. **Authorization**: Users can only access clans they're members of
3. **Input Validation**: All messages are validated before processing
4. **Rate Limiting**: Consider implementing rate limiting for message sending
5. **Message Encryption**: Consider encrypting sensitive messages

## Performance Optimization

1. **Connection Pooling**: WebSocket connections are managed efficiently
2. **Message Batching**: Consider batching multiple messages
3. **Database Indexing**: Ensure proper indexes on clanId and createdAt
4. **Memory Management**: Regular cleanup of inactive connections

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if the service is running on port 4003
   - Verify userId and clanId parameters
   - Check firewall settings

2. **Messages Not Broadcasting**
   - Verify RabbitMQ connection
   - Check database connectivity
   - Review WebSocket service logs

3. **High Memory Usage**
   - Check for memory leaks in connections
   - Monitor active connection count
   - Review message storage

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=DEBUG
npm start
```

## Future Enhancements

### Planned Features

1. **File Sharing**: Support for images, documents, and media
2. **Message Reactions**: Like, heart, and other reactions
3. **Message Threading**: Reply to specific messages
4. **Push Notifications**: Mobile push notifications
5. **Message Search**: Full-text search capabilities
6. **Message Encryption**: End-to-end encryption
7. **Voice/Video Chat**: Real-time audio/video communication
8. **Message Scheduling**: Schedule messages for later

### Scalability Improvements

1. **Redis Integration**: Caching and session management
2. **Load Balancing**: Multiple WebSocket servers
3. **Message Queuing**: Async message processing
4. **Database Sharding**: Horizontal scaling for large clans

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Test with multiple concurrent users
5. Monitor performance impact

## Support

For issues and questions:

1. Check the logs for error messages
2. Review the health endpoints
3. Test with the provided test client
4. Check database connectivity
5. Verify RabbitMQ status

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Author**: 50BraIns Development Team
