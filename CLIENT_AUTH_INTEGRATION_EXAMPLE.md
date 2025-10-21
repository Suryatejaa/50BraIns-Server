# Client Authentication Integration Example

This shows how to integrate the WebSocket Gateway with your existing authentication system.

## 🔐 Authentication Context Integration

### Create `src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  // Add other user properties
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in (e.g., from localStorage, cookies, etc.)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for existing auth token
        const token = localStorage.getItem('authToken');
        if (token) {
          // Validate token with your backend
          const response = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('authToken');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const { user: userData, token } = await response.json();
      
      // Store token
      localStorage.setItem('authToken', token);
      setUser(userData);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

## 🔐 Protected WebSocket Gateway Hook

### Create `src/hooks/useProtectedWebSocketGateway.ts`

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketGatewayService, WebSocketMessage } from '../services/websocket-gateway.service';
import { useAuth } from '../contexts/AuthContext';

interface UseProtectedWebSocketGatewayOptions {
  gatewayUrl?: string;
  autoConnect?: boolean;
}

export function useProtectedWebSocketGateway({
  gatewayUrl = 'ws://localhost:4000',
  autoConnect = true
}: UseProtectedWebSocketGatewayOptions = {}) {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsServiceRef = useRef<WebSocketGatewayService | null>(null);
  const messageHandlersRef = useRef<Set<(message: WebSocketMessage) => void>>(new Set());

  // Initialize WebSocket service when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if user is not authenticated
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
        wsServiceRef.current = null;
      }
      setIsConnected(false);
      setIsConnecting(false);
      return;
    }

    // Create new WebSocket service for authenticated user
    wsServiceRef.current = new WebSocketGatewayService({
      url: gatewayUrl,
      userId: user.id,
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

    // Cleanup on unmount or when user changes
    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
      }
    };
  }, [user?.id, isAuthenticated, gatewayUrl, autoConnect]);

  // Connect to WebSocket Gateway
  const connect = useCallback(async () => {
    if (!wsServiceRef.current || isConnecting || !isAuthenticated) return;

    try {
      setIsConnecting(true);
      setError(null);
      await wsServiceRef.current.connect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(false);
    }
  }, [isConnecting, isAuthenticated]);

  // Disconnect from WebSocket Gateway
  const disconnect = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
    }
  }, []);

  // Subscribe to notifications
  const subscribeToNotifications = useCallback(() => {
    if (wsServiceRef.current && isConnected && isAuthenticated) {
      try {
        wsServiceRef.current.subscribeToNotifications();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to subscribe to notifications');
      }
    }
  }, [isConnected, isAuthenticated]);

  // Unsubscribe from notifications
  const unsubscribeFromNotifications = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.unsubscribeFromNotifications();
    }
  }, []);

  // Subscribe to clan chat
  const subscribeToClanChat = useCallback((clanId: string) => {
    if (wsServiceRef.current && isConnected && isAuthenticated) {
      try {
        wsServiceRef.current.subscribeToClanChat(clanId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to subscribe to clan chat');
      }
    }
  }, [isConnected, isAuthenticated]);

  // Unsubscribe from clan chat
  const unsubscribeFromClanChat = useCallback((clanId: string) => {
    if (wsServiceRef.current) {
      wsServiceRef.current.unsubscribeFromClanChat(clanId);
    }
  }, []);

  // Send chat message
  const sendChatMessage = useCallback((clanId: string, content: string, messageType?: string) => {
    if (wsServiceRef.current && isConnected && isAuthenticated) {
      try {
        wsServiceRef.current.sendChatMessage(clanId, content, messageType);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send chat message');
      }
    }
  }, [isConnected, isAuthenticated]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((clanId: string, isTyping: boolean) => {
    if (wsServiceRef.current && isConnected && isAuthenticated) {
      wsServiceRef.current.sendTypingIndicator(clanId, isTyping);
    }
  }, [isConnected, isAuthenticated]);

  // Mark message as read
  const markMessageAsRead = useCallback((messageId: string, clanId: string) => {
    if (wsServiceRef.current && isConnected && isAuthenticated) {
      wsServiceRef.current.markMessageAsRead(messageId, clanId);
    }
  }, [isConnected, isAuthenticated]);

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
    // Authentication state
    isAuthenticated,
    user,
    
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

## 🔐 Updated Clan Chat Component with Authentication

### Update `src/components/ClanChat/ClanChat.tsx`

```typescript
import React, { useEffect, useState, useRef } from 'react';
import { useProtectedWebSocketGateway } from '../../hooks/useProtectedWebSocketGateway';

interface ClanChatProps {
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

export function ClanChat({ clanId }: ClanChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize protected WebSocket Gateway
  const {
    user,
    isAuthenticated,
    isConnected,
    error,
    subscribeToClanChat,
    unsubscribeFromClanChat,
    sendChatMessage,
    sendTypingIndicator,
    markMessageAsRead,
    addMessageHandler
  } = useProtectedWebSocketGateway({
    gatewayUrl: 'ws://localhost:4000',
    autoConnect: true
  });

  // Subscribe to clan chat when connected and authenticated
  useEffect(() => {
    if (isConnected && isAuthenticated && clanId) {
      subscribeToClanChat(clanId);
      
      // Cleanup on unmount
      return () => {
        unsubscribeFromClanChat(clanId);
      };
    }
  }, [isConnected, isAuthenticated, clanId, subscribeToClanChat, unsubscribeFromClanChat]);

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
    if (!newMessage.trim() || !isConnected || !isAuthenticated) return;

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

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Please log in to access clan chat</p>
      </div>
    );
  }

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
        <p className="text-sm text-gray-600">Logged in as: {user?.username}</p>
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
            className={`flex ${message.userId === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                message.userId === user?.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <div className="text-sm font-medium mb-1">
                {message.userId === user?.id ? 'You' : message.userId}
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
            disabled={!isConnected || !isAuthenticated}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isConnected || !isAuthenticated}
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

## 🔐 Updated Clan Page with Authentication

### Update `src/app/clan/[id]/page.tsx`

```typescript
'use client';

import React from 'react';
import { ClanChat } from '../../../components/ClanChat/ClanChat';
import { useAuth } from '../../../contexts/AuthContext';

interface ClanPageProps {
  params: {
    id: string;
  };
}

export default function ClanPage({ params }: ClanPageProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const clanId = params.id;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to access clan features</p>
          {/* Add your login component here */}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg h-96">
        <ClanChat clanId={clanId} />
      </div>
    </div>
  );
}
```

## 🔐 App Layout with Authentication Provider

### Update `src/app/layout.tsx`

```typescript
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationHandler } from '../components/NotificationHandler/NotificationHandler';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <NotificationHandler />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## 🔐 Updated Notification Handler with Authentication

### Update `src/components/NotificationHandler/NotificationHandler.tsx`

```typescript
import React, { useEffect } from 'react';
import { useProtectedWebSocketGateway } from '../../hooks/useProtectedWebSocketGateway';

interface NotificationHandlerProps {
  onNotification?: (notification: any) => void;
}

export function NotificationHandler({ onNotification }: NotificationHandlerProps) {
  const {
    isAuthenticated,
    isConnected,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    addMessageHandler
  } = useProtectedWebSocketGateway({
    gatewayUrl: 'ws://localhost:4000',
    autoConnect: true
  });

  // Subscribe to notifications when connected and authenticated
  useEffect(() => {
    if (isConnected && isAuthenticated) {
      subscribeToNotifications();
      
      return () => {
        unsubscribeFromNotifications();
      };
    }
  }, [isConnected, isAuthenticated, subscribeToNotifications, unsubscribeFromNotifications]);

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

## 🎯 Key Benefits of Authentication Integration

1. **Automatic Connection Management**: WebSocket connects only when user is authenticated
2. **Security**: No unauthorized WebSocket connections
3. **User Context**: Access to user information throughout the WebSocket lifecycle
4. **Clean Disconnection**: Automatically disconnects when user logs out
5. **Reconnection**: Automatically reconnects when user logs back in
6. **Type Safety**: Full TypeScript support with user context

## 🔧 Usage Example

```typescript
// In any component that needs WebSocket functionality
function MyComponent() {
  const { user, isAuthenticated, isConnected } = useProtectedWebSocketGateway();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  if (!isConnected) {
    return <div>Connecting...</div>;
  }
  
  return <div>Connected as {user?.username}</div>;
}
```

This authentication integration ensures that your WebSocket Gateway is only accessible to authenticated users and provides a seamless experience with your existing auth system!
