# WebSocket Gateway Service

A unified WebSocket gateway service that handles all real-time communications including notifications, clan chat, and future services.

## 🚀 **Features**

- **Unified WebSocket Connection**: Single WebSocket endpoint for all real-time features
- **Service Routing**: Routes messages to appropriate services (notifications, clan chat, etc.)
- **RabbitMQ Integration**: Uses RabbitMQ for message queuing and event publishing
- **Connection Management**: Handles connection lifecycle, reconnections, and cleanup
- **Health Monitoring**: Built-in health checks and connection statistics
- **Scalable Architecture**: Designed for easy extension with new services

## 🏗️ **Architecture**

```
Client (Single WebSocket Connection)
           ↓
   WebSocket Gateway (Port 4000)
           ↓
    ┌─────────────┬─────────────┐
    │Notification │  Clan Chat  │
    │  Service    │   Service   │
    └─────────────┴─────────────┘
           ↓
       RabbitMQ
```

## 📡 **WebSocket Endpoints**

### **Connection URL**
```
ws://localhost:4000/ws?userId={userId}
```

### **Message Types**

#### **Client → Server**
- `subscribe_notifications` - Subscribe to notifications
- `unsubscribe_notifications` - Unsubscribe from notifications
- `subscribe_clan_chat` - Subscribe to clan chat
- `unsubscribe_clan_chat` - Unsubscribe from clan chat
- `chat` - Send chat message
- `typing` - Send typing indicator
- `notification_ack` - Acknowledge notification
- `ping` - Keep connection alive

#### **Server → Client**
- `connected` - Connection confirmed
- `subscription_confirmed` - Service subscription confirmed
- `notification` - Incoming notification
- `chat` - Incoming chat message
- `message_sent` - Chat message confirmation
- `error` - Error message
- `pong` - Response to ping

## 🔧 **Setup & Installation**

### **Prerequisites**
- Node.js 16+
- RabbitMQ running on localhost:5672
- Port 4000 available

### **Installation**
```bash
cd services/websocket-gateway
npm install
```

### **Environment Configuration**
```bash
cp env.example .env
# Edit .env with your configuration
```

### **Running the Service**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📊 **Health Checks**

### **Basic Health**
```bash
curl http://localhost:4000/health
```

### **WebSocket Health**
```bash
curl http://localhost:4000/health/websocket
```

## 🔌 **Client Integration**

### **Basic Connection**
```javascript
class WebSocketClient {
    constructor() {
        this.ws = null;
        this.userId = null;
    }
    
    connect(userId) {
        this.userId = userId;
        const wsUrl = `ws://localhost:4000/ws?userId=${userId}`;
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('Connected to WebSocket Gateway');
            this.subscribeToServices();
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
    }
    
    subscribeToServices() {
        // Subscribe to notifications
        this.send({
            type: 'subscribe_notifications'
        });
        
        // Subscribe to clan chat
        this.send({
            type: 'subscribe_clan_chat',
            clanId: 'your-clan-id'
        });
    }
    
    sendChatMessage(content, clanId) {
        this.send({
            type: 'chat',
            content,
            clanId,
            messageType: 'TEXT'
        });
    }
    
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
    
    handleMessage(data) {
        switch(data.type) {
            case 'notification':
                this.onNotificationReceived?.(data);
                break;
            case 'chat':
                this.onChatMessageReceived?.(data);
                break;
            case 'connected':
                console.log('Connection confirmed:', data.message);
                break;
            case 'error':
                console.error('Server error:', data.message);
                break;
        }
    }
}
```

## 🔄 **Migration from Existing Services**

### **Step 1: Update Client**
- Change WebSocket URL from `ws://localhost:4003/ws` to `ws://localhost:4000/ws`
- Remove separate WebSocket connections for notifications and chat
- Use single connection with service subscriptions

### **Step 2: Update Clan Service**
- Remove WebSocket handling from clan service
- Keep only REST API endpoints
- Ensure RabbitMQ events are published correctly

### **Step 3: Update Notification Service**
- Remove WebSocket handling from notification service
- Keep only REST API endpoints
- Ensure RabbitMQ events are published correctly

## 📈 **Monitoring & Debugging**

### **Connection Statistics**
The service provides real-time connection statistics:
- Total connections
- Active connections
- Users by service
- Service subscription counts

### **Logging**
Structured logging with different levels:
- `ERROR` - Error conditions
- `WARN` - Warning conditions
- `INFO` - General information
- `DEBUG` - Debug information

### **RabbitMQ Events**
Monitor these RabbitMQ events:
- `clan.message.sent` - Chat messages
- `clan.typing` - Typing indicators
- `notification.acknowledged` - Notification acknowledgments

## 🚀 **Future Extensions**

### **New Service Integration**
To add a new service:

1. **Create Service Class**
```javascript
class NewService {
    async subscribe(userId, callback) {
        // Implementation
    }
    
    async unsubscribe(userId) {
        // Implementation
    }
}
```

2. **Add to WebSocket Gateway**
```javascript
// In websocket.gateway.js
this.newService = new NewService();

// Add message handling
case 'subscribe_new_service':
    await this.handleNewServiceSubscription(ws, message, userId);
    break;
```

3. **Update Client Protocol**
```javascript
// Client subscription
{
    type: 'subscribe_new_service',
    serviceId: 'service-123'
}
```

### **Authentication & Authorization**
Future versions will include:
- JWT token validation
- User permission checks
- Rate limiting
- Connection throttling

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Connection Refused**
- Check if port 4000 is available
- Verify RabbitMQ is running
- Check firewall settings

#### **Messages Not Received**
- Verify service subscriptions
- Check RabbitMQ connection
- Review message routing keys

#### **High Memory Usage**
- Monitor connection count
- Check for memory leaks
- Review log levels

### **Debug Mode**
Set `LOG_LEVEL=DEBUG` in `.env` for detailed logging.

## 📝 **API Reference**

### **HTTP Endpoints**
- `GET /` - Service information
- `GET /health` - Basic health check
- `GET /health/websocket` - WebSocket statistics

### **WebSocket Events**
See the "Message Types" section above for complete event documentation.

## 🤝 **Contributing**

1. Follow the existing code structure
2. Add comprehensive logging
3. Include error handling
4. Update documentation
5. Test thoroughly

## 📄 **License**

MIT License - see LICENSE file for details.
