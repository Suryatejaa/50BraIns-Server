# Migration Guide: WebSocket Gateway Integration

This guide helps you migrate from multiple WebSocket services to the unified WebSocket Gateway.

## 🎯 **Migration Overview**

**Before (Current State):**
- API Gateway: WebSocket on port 3000/4000 for notifications
- Clan Service: WebSocket on port 4003 for chat
- Multiple WebSocket connections per client

**After (Target State):**
- WebSocket Gateway: Single WebSocket on port 4000 for everything
- Services: Only REST APIs, no WebSocket handling
- Single WebSocket connection per client

## 🔄 **Step-by-Step Migration**

### **Phase 1: Deploy WebSocket Gateway**

1. **Start WebSocket Gateway Service**
   ```bash
   cd services/websocket-gateway
   npm install
   npm start
   ```

2. **Verify Gateway is Running**
   ```bash
   curl http://localhost:4000/health
   curl http://localhost:4000/health/websocket
   ```

3. **Test with Gateway Test Client**
   - Open `test-gateway.html` in browser
   - Connect to `ws://localhost:4000/ws`
   - Test notifications and clan chat subscriptions

### **Phase 2: Update Client Applications**

#### **Update WebSocket Connection URL**

**Old (Multiple Connections):**
```javascript
// Notifications
const notificationWs = new WebSocket('ws://localhost:3000/ws');

// Clan Chat
const clanChatWs = new WebSocket('ws://localhost:4003/ws?userId=123&clanId=456');
```

**New (Single Connection):**
```javascript
// Single WebSocket Gateway connection
const ws = new WebSocket('ws://localhost:4000/ws?userId=123');

// Subscribe to services after connection
ws.onopen = () => {
    // Subscribe to notifications
    ws.send(JSON.stringify({
        type: 'subscribe_notifications'
    }));
    
    // Subscribe to clan chat
    ws.send(JSON.stringify({
        type: 'subscribe_clan_chat',
        clanId: '456'
    }));
};
```

#### **Update Message Handling**

**Old (Separate Handlers):**
```javascript
// Notification WebSocket
notificationWs.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleNotification(data);
};

// Clan Chat WebSocket
clanChatWs.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleChatMessage(data);
};
```

**New (Unified Handler):**
```javascript
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'notification':
            handleNotification(data);
            break;
        case 'chat':
            handleChatMessage(data);
            break;
        case 'connected':
            console.log('Connected to gateway');
            break;
        case 'subscription_confirmed':
            console.log(`Subscribed to ${data.service}`);
            break;
        case 'error':
            console.error('Gateway error:', data.message);
            break;
    }
};
```

#### **Update Message Sending**

**Old (Direct to Services):**
```javascript
// Send chat message directly to clan service
clanChatWs.send(JSON.stringify({
    type: 'chat',
    content: 'Hello!',
    clanId: '456'
}));

// Send notification acknowledgment directly
notificationWs.send(JSON.stringify({
    type: 'ack',
    notificationId: '123'
}));
```

**New (Through Gateway):**
```javascript
// Send chat message through gateway
ws.send(JSON.stringify({
    type: 'chat',
    content: 'Hello!',
    clanId: '456',
    messageType: 'TEXT'
}));

// Send notification acknowledgment through gateway
ws.send(JSON.stringify({
    type: 'notification_ack',
    notificationId: '123'
}));
```

### **Phase 3: Update Service Implementations**

#### **Remove WebSocket Handling from Clan Service**

**Remove from `services/clan-service/src/index.js`:**
```javascript
// REMOVE these lines:
// const { WebSocketService } = require('./services/websocket.service');
// const wsService = new WebSocketService();
// app.locals.wsService = wsService;
// wsService.initialize(server);
// wsService.close();
```

**Remove from `services/clan-service/src/routes/health.js`:**
```javascript
// REMOVE this route:
// router.get('/websocket', HealthController.getWebSocketHealth);
```

**Remove from `services/clan-service/src/controllers/health.controller.js`:**
```javascript
// REMOVE this method:
// static getWebSocketHealth(req, res) { ... }
```

**Keep REST API endpoints:**
- `POST /clans/:clanId/messages` - Create message
- `GET /clans/:clanId/messages` - Get messages
- `POST /messages/:messageId/read` - Mark as read
- `DELETE /clans/:clanId/messages/:messageId` - Delete message

#### **Remove WebSocket Handling from Notification Service**

**Remove WebSocket server initialization**
**Keep REST API endpoints for notification management**

#### **Update RabbitMQ Event Publishing**

Ensure services publish events that the gateway can consume:

**Clan Service Events:**
```javascript
// Publish to RabbitMQ when message is created
await rabbitmqService.publishEvent('clan.message.sent', {
    userId: message.userId,
    clanId: message.clanId,
    content: message.content,
    messageId: message.id,
    timestamp: new Date().toISOString()
});

// Publish typing indicators
await rabbitmqService.publishEvent('clan.typing', {
    userId: userId,
    clanId: clanId,
    isTyping: isTyping,
    timestamp: new Date().toISOString()
});
```

**Notification Service Events:**
```javascript
// Publish to RabbitMQ when notification is created
await rabbitmqService.publishEvent('user.${userId}.notification', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    timestamp: new Date().toISOString()
});
```

### **Phase 4: Test and Validate**

1. **Test WebSocket Gateway**
   - Use `test-gateway.html` to verify connections
   - Test service subscriptions
   - Verify message routing

2. **Test Client Integration**
   - Update your main client application
   - Test notifications and chat functionality
   - Verify single WebSocket connection

3. **Test Service Communication**
   - Verify RabbitMQ events are published
   - Check gateway receives and routes events
   - Validate client receives correct messages

### **Phase 5: Cleanup**

1. **Remove WebSocket Dependencies**
   ```bash
   # From clan service
   cd services/clan-service
   npm uninstall ws
   
   # From notification service
   cd services/notification-service
   npm uninstall ws
   ```

2. **Remove WebSocket Files**
   - Delete `websocket.service.js` from clan service
   - Delete WebSocket-related routes and controllers
   - Remove WebSocket initialization code

3. **Update Documentation**
   - Update API documentation
   - Remove WebSocket endpoint references
   - Add gateway connection instructions

## 🔧 **Client Migration Examples**

### **React Component Example**

**Old Implementation:**
```jsx
import React, { useEffect, useState } from 'react';

function ClanChat({ userId, clanId }) {
    const [ws, setWs] = useState(null);
    const [messages, setMessages] = useState([]);
    
    useEffect(() => {
        // Direct connection to clan service
        const clanWs = new WebSocket(`ws://localhost:4003/ws?userId=${userId}&clanId=${clanId}`);
        
        clanWs.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'chat') {
                setMessages(prev => [...prev, data]);
            }
        };
        
        setWs(clanWs);
        
        return () => clanWs.close();
    }, [userId, clanId]);
    
    const sendMessage = (content) => {
        if (ws) {
            ws.send(JSON.stringify({
                type: 'chat',
                content,
                clanId
            }));
        }
    };
    
    // ... rest of component
}
```

**New Implementation:**
```jsx
import React, { useEffect, useState } from 'react';
import { useWebSocketGateway } from '../hooks/useWebSocketGateway';

function ClanChat({ userId, clanId }) {
    const [messages, setMessages] = useState([]);
    const { ws, isConnected, subscribe, unsubscribe } = useWebSocketGateway(userId);
    
    useEffect(() => {
        if (isConnected) {
            // Subscribe to clan chat
            subscribe('clan_chat', { clanId });
        }
        
        return () => {
            if (isConnected) {
                unsubscribe('clan_chat', { clanId });
            }
        };
    }, [isConnected, clanId, subscribe, unsubscribe]);
    
    useEffect(() => {
        if (ws) {
            ws.addEventListener('message', handleMessage);
            return () => ws.removeEventListener('message', handleMessage);
        }
    }, [ws]);
    
    const handleMessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chat' && data.clanId === clanId) {
            setMessages(prev => [...prev, data]);
        }
    };
    
    const sendMessage = (content) => {
        if (ws && isConnected) {
            ws.send(JSON.stringify({
                type: 'chat',
                content,
                clanId,
                messageType: 'TEXT'
            }));
        }
    };
    
    // ... rest of component
}
```

### **Custom Hook Example**

```javascript
// hooks/useWebSocketGateway.js
import { useState, useEffect, useCallback } from 'react';

export function useWebSocketGateway(userId) {
    const [ws, setWs] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [subscriptions, setSubscriptions] = useState(new Set());
    
    useEffect(() => {
        if (!userId) return;
        
        const gatewayWs = new WebSocket(`ws://localhost:4000/ws?userId=${userId}`);
        
        gatewayWs.onopen = () => {
            setIsConnected(true);
            setWs(gatewayWs);
        };
        
        gatewayWs.onclose = () => {
            setIsConnected(false);
            setWs(null);
            setSubscriptions.clear();
        };
        
        return () => {
            gatewayWs.close();
        };
    }, [userId]);
    
    const subscribe = useCallback((service, options = {}) => {
        if (!ws || !isConnected) return;
        
        let message;
        switch (service) {
            case 'notifications':
                message = { type: 'subscribe_notifications' };
                break;
            case 'clan_chat':
                message = { 
                    type: 'subscribe_clan_chat',
                    clanId: options.clanId
                };
                break;
            default:
                console.warn(`Unknown service: ${service}`);
                return;
        }
        
        ws.send(JSON.stringify(message));
        setSubscriptions(prev => new Set(prev).add(service));
    }, [ws, isConnected]);
    
    const unsubscribe = useCallback((service, options = {}) => {
        if (!ws || !isConnected) return;
        
        let message;
        switch (service) {
            case 'notifications':
                message = { type: 'unsubscribe_notifications' };
                break;
            case 'clan_chat':
                message = { 
                    type: 'unsubscribe_clan_chat',
                    clanId: options.clanId
                };
                break;
        }
        
        if (message) {
            ws.send(JSON.stringify(message));
            setSubscriptions(prev => {
                const newSet = new Set(prev);
                newSet.delete(service);
                return newSet;
            });
        }
    }, [ws, isConnected]);
    
    return {
        ws,
        isConnected,
        subscriptions: Array.from(subscriptions),
        subscribe,
        unsubscribe
    };
}
```

## 🚨 **Common Migration Issues**

### **Issue 1: Messages Not Received**
- **Cause**: Service not subscribed to gateway
- **Solution**: Ensure client sends subscription messages after connection

### **Issue 2: Connection Refused**
- **Cause**: Gateway not running on port 4000
- **Solution**: Start WebSocket Gateway service first

### **Issue 3: RabbitMQ Events Not Received**
- **Cause**: Incorrect routing keys or exchange setup
- **Solution**: Verify RabbitMQ configuration and routing keys

### **Issue 4: Duplicate Messages**
- **Cause**: Multiple subscriptions or old WebSocket connections
- **Solution**: Ensure old WebSocket services are stopped

## ✅ **Migration Checklist**

- [ ] WebSocket Gateway deployed and running
- [ ] Client updated to use gateway connection
- [ ] Service subscriptions implemented
- [ ] Message handling updated
- [ ] Old WebSocket services stopped
- [ ] RabbitMQ events verified
- [ ] End-to-end testing completed
- [ ] Documentation updated
- [ ] Old WebSocket code removed

## 🎉 **Benefits After Migration**

1. **Single WebSocket Connection** per client
2. **Centralized Connection Management**
3. **Easier Deployment** (one WebSocket port)
4. **Better Resource Utilization**
5. **Simplified Client Code**
6. **Easier to Add New Services**
7. **Better Monitoring and Debugging**

## 📞 **Support**

If you encounter issues during migration:
1. Check the WebSocket Gateway logs
2. Verify RabbitMQ connection
3. Test with `test-gateway.html`
4. Review the migration checklist
5. Check service health endpoints
