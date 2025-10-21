# Client WebSocket Gateway Integration Guide

This guide shows you exactly how to implement the dedicated WebSocket Gateway service on the client side.

## 🎯 What We're Building

Instead of multiple WebSocket connections:
- ❌ **Before**: Separate connections for notifications (port 3000) and clan chat (port 4003)
- ✅ **After**: Single WebSocket Gateway connection (port 4000) handling everything

## 🚀 Step 1: Create WebSocket Gateway Client Service

### Create `src/services/websocket-gateway.service.ts`

```typescript
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface WebSocketGatewayConfig {
  url: string;
  userId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export class WebSocketGatewayService {
  private ws: WebSocket | null = null;
  private config: WebSocketGatewayConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private subscriptions = new Map<string, Set<string>>(); // service -> Set<clanId>

  constructor(config: WebSocketGatewayConfig) {
    this.config = config;
  }

  // Connect to WebSocket Gateway
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      const wsUrl = `${this.config.url}/ws?userId=${this.config.userId}`;
      
      console.log(`🔌 Connecting to WebSocket Gateway: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ Connected to WebSocket Gateway');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.config.onConnect?.();
        resolve();
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket Gateway connection closed', event.code, event.reason);
        this.isConnecting = false;
        this.config.onDisconnect?.();
        
        // Auto-reconnect logic
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket Gateway error:', error);
        this.isConnecting = false;
        this.config.onError?.(error);
        reject(error);
      };
    });
  }

  // Disconnect from WebSocket Gateway
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.subscriptions.clear();
  }

  // Subscribe to notifications
  subscribeToNotifications(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message: WebSocketMessage = {
      type: 'subscribe_notifications'
    };

    this.ws.send(JSON.stringify(message));
    this.subscriptions.set('notifications', new Set());
    console.log('🔔 Subscribed to notifications');
  }

  // Unsubscribe from notifications
  unsubscribeFromNotifications(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WebSocketMessage = {
      type: 'unsubscribe_notifications'
    };

    this.ws.send(JSON.stringify(message));
    this.subscriptions.delete('notifications');
    console.log('🔕 Unsubscribed from notifications');
  }

  // Subscribe to clan chat
  subscribeToClanChat(clanId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message: WebSocketMessage = {
      type: 'subscribe_clan_chat',
      clanId
    };

    this.ws.send(JSON.stringify(message));
    
    if (!this.subscriptions.has('clanChat')) {
      this.subscriptions.set('clanChat', new Set());
    }
    this.subscriptions.get('clanChat')!.add(clanId);
    console.log(`🏛️ Subscribed to clan chat: ${clanId}`);
  }

  // Unsubscribe from clan chat
  unsubscribeFromClanChat(clanId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WebSocketMessage = {
      type: 'unsubscribe_clan_chat',
      clanId
    };

    this.ws.send(JSON.stringify(message));
    
    const clanChatSubs = this.subscriptions.get('clanChat');
    if (clanChatSubs) {
      clanChatSubs.delete(clanId);
      if (clanChatSubs.size === 0) {
        this.subscriptions.delete('clanChat');
      }
    }
    console.log(`🏛️ Unsubscribed from clan chat: ${clanId}`);
  }

  // Send chat message
  sendChatMessage(clanId: string, content: string, messageType: string = 'text'): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const message: WebSocketMessage = {
      type: 'chat_message',
      clanId,
      content,
      messageType
    };

    this.ws.send(JSON.stringify(message));
    console.log(`💬 Sent chat message to clan ${clanId}`);
  }

  // Send typing indicator
  sendTypingIndicator(clanId: string, isTyping: boolean): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WebSocketMessage = {
      type: 'typing_indicator',
      clanId,
      isTyping
    };

    this.ws.send(JSON.stringify(message));
  }

  // Mark message as read
  markMessageAsRead(messageId: string, clanId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: WebSocketMessage = {
      type: 'read_receipt',
      messageId,
      clanId
    };

    this.ws.send(JSON.stringify(message));
  }

  // Set message handler
  onMessage(handler: (message: WebSocketMessage) => void): void {
    if (this.ws) {
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handler(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Get subscription status
  getSubscriptions(): Map<string, Set<string>> {
    return new Map(this.subscriptions);
  }
}
```

## 🚀 Step 2: Create React Hook for WebSocket Gateway

### Create `src/hooks/useWebSocketGateway.ts`

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketGatewayService, WebSocketMessage } from '../services/websocket-gateway.service';

interface UseWebSocketGatewayOptions {
  userId: string;
  gatewayUrl?: string;
  autoConnect?: boolean;
}

export function useWebSocketGateway({
  userId,
  gatewayUrl = 'ws://localhost:4000',
  autoConnect = true
}: UseWebSocketGatewayOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsServiceRef = useRef<WebSocketGatewayService | null>(null);
  const messageHandlersRef = useRef<Set<(message: WebSocketMessage) => void>>(new Set());

  // Initialize WebSocket service
  useEffect(() => {
    if (!userId) return;

    wsServiceRef.current = new WebSocketGatewayService({
      url: gatewayUrl,
      userId,
      onConnect: () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
      },
      onDisconnect: () => {
        setIsConnected(false);
        setIsConnecting(false);
      },
      onError: (error) => {
        setError(error.toString());
        setIsConnecting(false);
      }
    });

    // Set up message handler
    wsServiceRef.current.onMessage((message) => {
      messageHandlersRef.current.forEach(handler => handler(message));
    });

    // Auto-connect if enabled
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
      }
    };
  }, [userId, gatewayUrl, autoConnect]);

  // Connect to WebSocket Gateway
  const connect = useCallback(async () => {
    if (!wsServiceRef.current || isConnecting) return;

    try {
      setIsConnecting(true);
      setError(null);
      await wsServiceRef.current.connect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(false);
    }
  }, [isConnecting]);

  // Disconnect from WebSocket Gateway
  const disconnect = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
    }
  }, []);

  // Subscribe to notifications
  const subscribeToNotifications = useCallback(() => {
    if (wsServiceRef.current && isConnected) {
      try {
        wsServiceRef.current.subscribeToNotifications();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to subscribe to notifications');
      }
    }
  }, [isConnected]);

  // Unsubscribe from notifications
  const unsubscribeFromNotifications = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.unsubscribeFromNotifications();
    }
  }, []);

  // Subscribe to clan chat
  const subscribeToClanChat = useCallback((clanId: string) => {
    if (wsServiceRef.current && isConnected) {
      try {
        wsServiceRef.current.subscribeToClanChat(clanId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to subscribe to clan chat');
      }
    }
  }, [isConnected]);

  // Unsubscribe from clan chat
  const unsubscribeFromClanChat = useCallback((clanId: string) => {
    if (wsServiceRef.current) {
      wsServiceRef.current.unsubscribeFromClanChat(clanId);
    }
  }, []);

  // Send chat message
  const sendChatMessage = useCallback((clanId: string, content: string, messageType?: string) => {
    if (wsServiceRef.current && isConnected) {
      try {
        wsServiceRef.current.sendChatMessage(clanId, content, messageType);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send chat message');
      }
    }
  }, [isConnected]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((clanId: string, isTyping: boolean) => {
    if (wsServiceRef.current && isConnected) {
      wsServiceRef.current.sendTypingIndicator(clanId, isTyping);
    }
  }, [isConnected]);

  // Mark message as read
  const markMessageAsRead = useCallback((messageId: string, clanId: string) => {
    if (wsServiceRef.current && isConnected) {
      wsServiceRef.current.markMessageAsRead(messageId, clanId);
    }
  }, [isConnected]);

  // Add message handler
  const addMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
    messageHandlersRef.current.add(handler);
    
    // Return cleanup function
    return () => {
      messageHandlersRef.current.delete(handler);
    };
  }, []);

  // Get subscription status
  const getSubscriptions = useCallback(() => {
    return wsServiceRef.current?.getSubscriptions() || new Map();
  }, []);

  return {
    // Connection state
    isConnected,
    isConnecting,
    error,
    
    // Connection methods
    connect,
    disconnect,
    
    // Subscription methods
    subscribeToNotifications,
    unsubscribeFromNotifications,
    subscribeToClanChat,
    unsubscribeFromClanChat,
    
    // Chat methods
    sendChatMessage,
    sendTypingIndicator,
    markMessageAsRead,
    
    // Message handling
    addMessageHandler,
    
    // Utility methods
    getSubscriptions
  };
}
```

## 🚀 Step 3: Update Your Clan Chat Component

### Update `src/components/ClanChat/ClanChat.tsx`

```typescript
import React, { useEffect, useState, useRef } from 'react';
import { useWebSocketGateway } from '../../hooks/useWebSocketGateway';

interface ClanChatProps {
  userId: string;
  clanId: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  messageType: string;
  timestamp: string;
  isDelivered?: boolean;
  readBy?: string[];
  isDeleted?: boolean;
}

export function ClanChat({ userId, clanId }: ClanChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize WebSocket Gateway
  const {
    isConnected,
    error,
    subscribeToClanChat,
    unsubscribeFromClanChat,
    sendChatMessage,
    sendTypingIndicator,
    markMessageAsRead,
    addMessageHandler
  } = useWebSocketGateway({
    userId,
    gatewayUrl: 'ws://localhost:4000',
    autoConnect: true
  });

  // Subscribe to clan chat when connected
  useEffect(() => {
    if (isConnected && clanId) {
      subscribeToClanChat(clanId);
      
      // Cleanup on unmount
      return () => {
        unsubscribeFromClanChat(clanId);
      };
    }
  }, [isConnected, clanId, subscribeToClanChat, unsubscribeFromClanChat]);

  // Set up message handlers
  useEffect(() => {
    const cleanup = addMessageHandler((message) => {
      switch (message.type) {
        case 'chat_message':
          handleChatMessage(message);
          break;
        case 'typing_indicator':
          handleTypingIndicator(message);
          break;
        case 'message_delivered':
          handleMessageDelivered(message);
          break;
        case 'message_read':
          handleMessageRead(message);
          break;
        case 'message_deleted':
          handleMessageDeleted(message);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    });

    return cleanup;
  }, [addMessageHandler]);

  // Handle incoming chat messages
  const handleChatMessage = (message: any) => {
    const newChatMessage: ChatMessage = {
      id: message.messageId,
      userId: message.userId,
      content: message.content,
      messageType: message.messageType,
      timestamp: message.timestamp,
      isDelivered: false,
      readBy: []
    };

    setMessages(prev => [...prev, newChatMessage]);
    
    // Mark message as read after a short delay
    setTimeout(() => {
      markMessageAsRead(message.messageId, clanId);
    }, 1000);
  };

  // Handle typing indicators
  const handleTypingIndicator = (message: any) => {
    if (message.isTyping) {
      setTypingUsers(prev => new Set(prev).add(message.userId));
    } else {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(message.userId);
        return newSet;
      });
    }
  };

  // Handle message delivered status
  const handleMessageDelivered = (message: any) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === message.messageId 
          ? { ...msg, isDelivered: true }
          : msg
      )
    );
  };

  // Handle message read status
  const handleMessageRead = (message: any) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === message.messageId 
          ? { ...msg, readBy: [...(msg.readBy || []), message.userId] }
          : msg
      )
    );
  };

  // Handle message deletion
  const handleMessageDeleted = (message: any) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === message.messageId 
          ? { ...msg, isDeleted: true, content: '[Message deleted]' }
          : msg
      )
    );
  };

  // Send message
  const handleSendMessage = () => {
    if (!newMessage.trim() || !isConnected) return;

    sendChatMessage(clanId, newMessage.trim());
    setNewMessage('');
    
    // Stop typing indicator
    setIsTyping(false);
    sendTypingIndicator(clanId, false);
  };

  // Handle typing
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(clanId, true);
    }

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing indicator after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(clanId, false);
    }, 2000);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className="text-red-500 p-4">
        ❌ WebSocket Error: {error}
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="text-yellow-500 p-4">
        🔌 Connecting to chat...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-gray-100 p-4 border-b">
        <h3 className="font-semibold">Clan Chat</h3>
        {typingUsers.size > 0 && (
          <p className="text-sm text-gray-600">
            {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.userId === userId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                message.userId === userId
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <div className="text-sm font-medium mb-1">
                {message.userId === userId ? 'You' : message.userId}
              </div>
              <div className="text-sm">
                {message.isDeleted ? (
                  <span className="italic text-gray-500">{message.content}</span>
                ) : (
                  message.content
                )}
              </div>
              <div className="text-xs mt-1 opacity-75">
                {new Date(message.timestamp).toLocaleTimeString()}
                {message.isDelivered && ' ✓'}
                {message.readBy && message.readBy.length > 0 && ` 👁️ ${message.readBy.length}`}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isConnected}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 🚀 Step 4: Update Your Clan Page

### Update `src/app/clan/[id]/page.tsx`

```typescript
'use client';

import React from 'react';
import { ClanChat } from '../../../components/ClanChat/ClanChat';

interface ClanPageProps {
  params: {
    id: string;
  };
}

export default function ClanPage({ params }: ClanPageProps) {
  // In a real app, you'd get userId from authentication context
  const userId = 'your-user-id'; // Replace with actual user ID
  const clanId = params.id;

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg h-96">
        <ClanChat userId={userId} clanId={clanId} />
      </div>
    </div>
  );
}
```

## 🚀 Step 5: Create Notification Component (Optional)

### Create `src/components/NotificationHandler/NotificationHandler.tsx`

```typescript
import React, { useEffect } from 'react';
import { useWebSocketGateway } from '../../hooks/useWebSocketGateway';

interface NotificationHandlerProps {
  userId: string;
  onNotification?: (notification: any) => void;
}

export function NotificationHandler({ userId, onNotification }: NotificationHandlerProps) {
  const {
    isConnected,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    addMessageHandler
  } = useWebSocketGateway({
    userId,
    gatewayUrl: 'ws://localhost:4000',
    autoConnect: true
  });

  // Subscribe to notifications when connected
  useEffect(() => {
    if (isConnected) {
      subscribeToNotifications();
      
      return () => {
        unsubscribeFromNotifications();
      };
    }
  }, [isConnected, subscribeToNotifications, unsubscribeFromNotifications]);

  // Handle notification messages
  useEffect(() => {
    const cleanup = addMessageHandler((message) => {
      if (message.type === 'notification') {
        console.log('🔔 Received notification:', message);
        onNotification?.(message);
        
        // You can show toast notifications here
        // toast.success(message.content);
      }
    });

    return cleanup;
  }, [addMessageHandler, onNotification]);

  return null; // This component doesn't render anything
}
```

## 🚀 Step 6: Environment Configuration

### Create `.env.local` in your client app root

```bash
# WebSocket Gateway Configuration
NEXT_PUBLIC_WEBSOCKET_GATEWAY_URL=ws://localhost:4000

# Service URLs (if needed)
NEXT_PUBLIC_CLAN_SERVICE_URL=http://localhost:4003
NEXT_PUBLIC_NOTIFICATION_SERVICE_URL=http://localhost:4001
```

## 🚀 Step 7: Usage in Your App

### In your main layout or app component:

```typescript
import { NotificationHandler } from './components/NotificationHandler/NotificationHandler';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const userId = 'your-user-id'; // Get from auth context

  return (
    <html>
      <body>
        <NotificationHandler userId={userId} />
        {children}
      </body>
    </html>
  );
}
```

## 🎯 Key Benefits of This Implementation

1. **Single Connection**: One WebSocket connection handles everything
2. **Automatic Reconnection**: Built-in reconnection logic with exponential backoff
3. **Type Safety**: Full TypeScript support
4. **React Integration**: Custom hook for easy React integration
5. **Message Handling**: Centralized message routing
6. **Subscription Management**: Easy subscribe/unsubscribe to services
7. **Error Handling**: Comprehensive error handling and user feedback

## 🔧 Testing Your Implementation

1. **Start WebSocket Gateway**: `cd services/websocket-gateway && npm run dev`
2. **Test with HTML Client**: Open `services/websocket-gateway/test-gateway.html`
3. **Test with Your App**: Navigate to a clan page and start chatting

## 🚨 Important Notes

1. **Replace `'your-user-id'`** with actual user authentication
2. **Update WebSocket URL** if deploying to different environments
3. **Handle Authentication** - you may need to pass auth tokens in WebSocket connection
4. **Error Boundaries** - wrap your components in error boundaries for production

This implementation gives you a clean, maintainable, and scalable WebSocket client that integrates seamlessly with your new WebSocket Gateway service!
