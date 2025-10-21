# 🚀 WebSocket Gateway Deployment Checklist

This checklist will help you deploy the WebSocket Gateway service and integrate it with your client.

## ✅ Phase 1: Deploy WebSocket Gateway Service

### 1. Start WebSocket Gateway
```bash
cd services/websocket-gateway
npm install
npm run dev
```

**Expected Output:**
```
🚀 WebSocket Gateway Service Started!
🔌 WebSocket: ws://localhost:4000/ws
✅ Connected to RabbitMQ
```

### 2. Verify WebSocket Gateway Health
```bash
curl http://localhost:4000/health
curl http://localhost:4000/health/websocket
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "WebSocket Gateway",
  "timestamp": "2025-01-20T...",
  "websocket": "ws://localhost:4000/ws",
  "websocketHealth": "http://localhost:4000/health/websocket"
}
```

### 3. Test with HTML Client
Open `services/websocket-gateway/test-gateway.html` in your browser and test:
- ✅ Connect to WebSocket Gateway
- ✅ Subscribe to notifications
- ✅ Subscribe to clan chat
- ✅ Send test messages

## ✅ Phase 2: Update Backend Services

### 1. Remove WebSocket from Clan Service
```bash
cd services/clan-service
```

**Files to modify:**
- `src/index.js` - Remove WebSocket initialization
- `src/controllers/health.controller.js` - Remove WebSocket health
- `src/routes/health.js` - Remove WebSocket route

**Files to delete:**
- `src/services/websocket.service.js`

### 2. Remove WebSocket from API Gateway
```bash
cd api-gateway
```

**Files to modify:**
- Remove WebSocket proxy logic
- Keep only REST API routing

### 3. Verify Services Still Work
```bash
# Test Clan Service
curl http://localhost:4003/health

# Test API Gateway
curl http://localhost:3000/health
```

## ✅ Phase 3: Client Integration

### 1. Create Client Files
Create these files in your client app:

**Required Files:**
- `src/services/websocket-gateway.service.ts`
- `src/hooks/useWebSocketGateway.ts`
- `src/components/ClanChat/ClanChat.tsx`
- `src/components/NotificationHandler/NotificationHandler.tsx`

**Optional Files (for auth integration):**
- `src/contexts/AuthContext.tsx`
- `src/hooks/useProtectedWebSocketGateway.ts`

### 2. Update Environment Variables
Create `.env.local` in your client root:
```bash
NEXT_PUBLIC_WEBSOCKET_GATEWAY_URL=ws://localhost:4000
```

### 3. Test Client Integration
1. Navigate to a clan page
2. Check browser console for WebSocket connection logs
3. Verify chat functionality works
4. Test notifications (if implemented)

## ✅ Phase 4: Production Deployment

### 1. Environment Configuration
Update `.env` files for production:
```bash
# WebSocket Gateway
PORT=4000
RABBITMQ_URL=amqp://your-rabbitmq-url
CLAN_SERVICE_URL=https://your-clan-service-url
NOTIFICATION_SERVICE_URL=https://your-notification-service-url

# Client
NEXT_PUBLIC_WEBSOCKET_GATEWAY_URL=wss://your-domain.com:4000
```

### 2. SSL/TLS Configuration
For production, ensure WebSocket Gateway uses WSS:
```javascript
// In WebSocket Gateway
const wsUrl = process.env.NODE_ENV === 'production' 
  ? `wss://${process.env.DOMAIN}:${port}/ws`
  : `ws://localhost:${port}/ws`;
```

### 3. Load Balancer Configuration
Configure your load balancer to:
- Route WebSocket traffic to port 4000
- Handle WebSocket upgrade requests
- Maintain sticky sessions for WebSocket connections

## 🔍 Troubleshooting

### Common Issues & Solutions

#### 1. WebSocket Connection Failed
**Symptoms:** Client can't connect to WebSocket Gateway
**Solutions:**
- Check if WebSocket Gateway is running on port 4000
- Verify firewall settings
- Check browser console for connection errors

#### 2. RabbitMQ Connection Failed
**Symptoms:** WebSocket Gateway can't connect to RabbitMQ
**Solutions:**
- Ensure RabbitMQ is running
- Check RabbitMQ connection URL
- Verify RabbitMQ credentials

#### 3. Client Not Receiving Messages
**Symptoms:** Connected but no messages
**Solutions:**
- Check subscription messages are sent correctly
- Verify message handlers are registered
- Check WebSocket Gateway logs for message routing

#### 4. Authentication Issues
**Symptoms:** WebSocket connects but user not recognized
**Solutions:**
- Verify userId is passed correctly in connection URL
- Check authentication middleware in WebSocket Gateway
- Ensure user exists in your user service

## 📊 Monitoring & Health Checks

### 1. WebSocket Gateway Health
```bash
# Basic health
curl http://localhost:4000/health

# Detailed WebSocket stats
curl http://localhost:4000/health/websocket
```

### 2. Client Connection Monitoring
Monitor these metrics in your client:
- Connection status
- Message delivery success rate
- Reconnection attempts
- Subscription status

### 3. Log Analysis
Key log patterns to monitor:
- `✅ Connected to WebSocket Gateway`
- `🔔 Subscribed to notifications`
- `🏛️ Subscribed to clan chat`
- `❌ WebSocket error`

## 🎯 Success Criteria

Your deployment is successful when:

1. ✅ WebSocket Gateway runs on port 4000
2. ✅ Client connects to single WebSocket endpoint
3. ✅ Clan chat messages are sent and received
4. ✅ Notifications are delivered in real-time
5. ✅ No duplicate WebSocket connections
6. ✅ Automatic reconnection works
7. ✅ Health endpoints return healthy status

## 🚨 Rollback Plan

If issues arise, you can quickly rollback:

1. **Stop WebSocket Gateway**: `cd services/websocket-gateway && npm stop`
2. **Restore Clan Service WebSocket**: Revert clan service changes
3. **Restore API Gateway WebSocket**: Revert API gateway changes
4. **Client Fallback**: Use original multiple WebSocket connections

## 📞 Support

If you encounter issues:

1. Check the logs in each service
2. Verify all services are running
3. Test with the HTML test client first
4. Check network connectivity between services
5. Verify RabbitMQ is accessible

## 🎉 Next Steps

After successful deployment:

1. **Monitor Performance**: Track message delivery times
2. **Scale Up**: Add more WebSocket Gateway instances if needed
3. **Add Features**: Implement typing indicators, read receipts
4. **Security**: Add JWT token validation to WebSocket connections
5. **Analytics**: Track WebSocket usage and performance metrics

---

**Remember:** Test thoroughly in development before deploying to production. The WebSocket Gateway is designed to be a drop-in replacement for your existing WebSocket infrastructure.
