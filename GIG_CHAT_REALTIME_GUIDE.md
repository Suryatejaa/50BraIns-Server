# Gig Chat Real-Time Implementation Guide

## 🚀 Current Issue Analysis

**Problem**: Messages are stored in database but not showing in chat window in real-time.

**Root Cause**: Missing WebSocket connection and event subscription on the client side.

## 📡 WebSocket Connection Setup

### 1. WebSocket Gateway Connection
```javascript
// Connect to WebSocket Gateway
const wsUrl = `ws://localhost:4000/ws?userId=${currentUserId}`;
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
    console.log('✅ Connected to WebSocket Gateway');
    
    // Subscribe to gig chat events
    ws.send(JSON.stringify({
        type: 'subscribe_gig_chat'
    }));
};
```

### 2. Handle Real-Time Messages
```javascript
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
        case 'gig_chat_message':
            // Add new message to chat window
            addMessageToChat(message);
            break;
            
        case 'gig_chat_typing':
            // Show/hide typing indicator
            updateTypingIndicator(message);
            break;
            
        case 'subscription_confirmed':
            console.log('✅ Subscribed to:', message.service);
            break;
    }
};
```

## 🔄 Required Client-Side Implementation

### 1. Chat Service (Frontend)
```javascript
class GigChatService {
    constructor() {
        this.ws = null;
        this.chatCallbacks = new Map(); // chatId -> callback
        this.currentUserId = null;
    }
    
    connect(userId) {
        this.currentUserId = userId;
        this.ws = new WebSocket(`ws://localhost:4000/ws?userId=${userId}`);
        
        this.ws.onopen = () => {
            // Subscribe to gig chat
            this.ws.send(JSON.stringify({
                type: 'subscribe_gig_chat'
            }));
        };
        
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected, attempting reconnect...');
            setTimeout(() => this.connect(userId), 3000);
        };
    }
    
    handleMessage(message) {
        switch (message.type) {
            case 'gig_chat_message':
                // Forward to appropriate chat window
                const callback = this.chatCallbacks.get(message.chatId);
                if (callback) {
                    callback(message);
                }
                break;
                
            case 'gig_chat_typing':
                // Handle typing indicators
                const typingCallback = this.chatCallbacks.get(message.chatId);
                if (typingCallback) {
                    typingCallback({
                        type: 'typing',
                        ...message
                    });
                }
                break;
        }
    }
    
    subscribeToChat(chatId, callback) {
        this.chatCallbacks.set(chatId, callback);
    }
    
    unsubscribeFromChat(chatId) {
        this.chatCallbacks.delete(chatId);
    }
    
    sendTyping(chatId, recipientId, isTyping) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'gig_chat_typing',
                chatId,
                recipientId,
                isTyping,
                senderId: this.currentUserId
            }));
        }
    }
}
```

### 2. Chat Component Integration
```javascript
// In your chat component
useEffect(() => {
    // Initialize WebSocket connection
    const chatService = new GigChatService();
    chatService.connect(currentUser.id);
    
    // Subscribe to this specific chat
    chatService.subscribeToChat(chatId, (message) => {
        if (message.type === 'typing') {
            setTypingUsers(prev => ({
                ...prev,
                [message.senderId]: message.isTyping
            }));
        } else {
            // Add new message to chat
            setMessages(prev => [...prev, message.message]);
        }
    });
    
    return () => {
        chatService.unsubscribeFromChat(chatId);
    };
}, [chatId, currentUser.id]);
```

## 🛠 API Endpoints (Already Working)

### 1. REST Endpoints
- ✅ `GET /api/chat/application/:applicationId` - Get or create chat
- ✅ `POST /api/chat/:chatId/message` - Send message  
- ✅ `GET /api/chat/:chatId/messages` - Get message history
- ✅ `GET /api/chat/user/chats` - Get user's chat list

### 2. WebSocket Events

#### Client → Server:
- `subscribe_gig_chat` - Subscribe to gig chat events
- `unsubscribe_gig_chat` - Unsubscribe from gig chat
- `gig_chat_typing` - Send typing indicator

#### Server → Client:
- `gig_chat_message` - New message received
- `gig_chat_typing` - Typing indicator
- `subscription_confirmed` - Subscription successful

## 🔥 RabbitMQ Events (Already Implemented)

The chat controller already publishes these events:

```javascript
// When message is sent (from chat.controller.js)
await sendChatNotification(recipientId, 'gig_chat_message', {
    chatId: chat.id,
    message: newMessage,
    gigTitle: chat.gig.title,
    senderRole: isGigOwner ? 'gig_owner' : 'applicant'
});
```

## ⚡ Quick Fix Implementation

### 1. Add to your chat component:
```javascript
import { useEffect, useState } from 'react';

const ChatComponent = ({ chatId, currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [ws, setWs] = useState(null);
    
    useEffect(() => {
        // Connect to WebSocket
        const websocket = new WebSocket(`ws://localhost:4000/ws?userId=${currentUser.id}`);
        
        websocket.onopen = () => {
            console.log('Connected to chat WebSocket');
            websocket.send(JSON.stringify({ type: 'subscribe_gig_chat' }));
        };
        
        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'gig_chat_message' && data.chatId === chatId) {
                // Add new message to chat in real-time
                setMessages(prev => [...prev, data.message]);
            }
        };
        
        setWs(websocket);
        
        return () => {
            websocket.close();
        };
    }, [currentUser.id, chatId]);
    
    const sendMessage = async (messageText) => {
        // Send via REST API (existing)
        const response = await fetch(`/api/chat/${chatId}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ message: messageText })
        });
        
        // Message will appear via WebSocket event
    };
    
    return (
        // Your chat UI
    );
};
```

## 🔧 Service Verification

### 1. Check if WebSocket Gateway is running:
```bash
# Check if port 4000 is open
netstat -an | findstr :4000
```

### 2. Test WebSocket connection:
```javascript
// Quick test in browser console
const ws = new WebSocket('ws://localhost:4000/ws?userId=test-user');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data));
```

## 🎯 Next Steps

1. **Immediate**: Add WebSocket connection to your chat component
2. **Short-term**: Implement typing indicators
3. **Long-term**: Add message status indicators (sent, delivered, read)

The backend is already set up correctly! The issue is purely on the client-side WebSocket integration.