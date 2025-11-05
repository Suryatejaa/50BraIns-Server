# Client-Side Chat Integration Guide

## Overview
This guide provides complete instructions for integrating the gig chat feature into your client application. The chat system enables real-time communication between gig owners and approved applicants using REST APIs and WebSocket connections.

## Table of Contents
1. [Quick Start](#quick-start)
2. [API Integration](#api-integration)
3. [WebSocket Integration](#websocket-integration)
4. [React Components](#react-components)
5. [State Management](#state-management)
6. [UI/UX Guidelines](#uiux-guidelines)
7. [Error Handling](#error-handling)
8. [Testing](#testing)

## Quick Start

### Prerequisites
- Authentication system (JWT tokens)
- WebSocket support in your framework
- HTTP client (axios, fetch, etc.)

### Basic Setup
```javascript
// 1. Install dependencies (if using npm packages)
npm install socket.io-client // or native WebSocket
npm install axios

// 2. Environment configuration
const API_BASE_URL = 'http://localhost:3001'; // Gig service
const WS_URL = 'ws://localhost:4000/ws'; // WebSocket gateway
```

## API Integration

### Authentication Headers
All API requests require authentication:

```javascript
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});
```

### Chat API Client

```javascript
class ChatAPI {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
  }

  // Get or create chat for application
  async getChatByApplication(applicationId) {
    const response = await fetch(`${this.baseURL}/chat/application/${applicationId}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get user's chat list
  async getChatList(status = 'all') {
    const response = await fetch(`${this.baseURL}/chat/?status=${status}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Send message
  async sendMessage(chatId, messageData) {
    const response = await fetch(`${this.baseURL}/chat/${chatId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(messageData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get chat messages with pagination
  async getMessages(chatId, page = 1, limit = 50, before = null) {
    const params = new URLSearchParams({ page, limit });
    if (before) params.append('before', before);
    
    const response = await fetch(`${this.baseURL}/chat/${chatId}/messages?${params}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get unread count
  async getUnreadCount() {
    const response = await fetch(`${this.baseURL}/chat/unread/count`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Update chat status (gig owner only)
  async updateChatStatus(chatId, isActive) {
    const response = await fetch(`${this.baseURL}/chat/${chatId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isActive })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
}

// Export singleton instance
export const chatAPI = new ChatAPI();
```

## WebSocket Integration

### WebSocket Manager

```javascript
class ChatWebSocketManager {
  constructor(url = 'ws://localhost:4000/ws') {
    this.url = url;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageHandlers = new Map();
    this.typingTimeouts = new Map();
  }

  // Connect to WebSocket
  connect(token) {
    try {
      this.ws = new WebSocket(`${this.url}?token=${token}&serviceType=gig-chat`);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  }

  // Connection opened
  handleOpen(event) {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Subscribe to gig chat
    this.send({
      type: 'subscribe_gig_chat'
    });
  }

  // Handle incoming messages
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'gig_chat_message':
          this.handleChatMessage(data);
          break;
          
        case 'gig_chat_typing':
          this.handleTypingIndicator(data);
          break;
          
        case 'connected':
          console.log('WebSocket service connected:', data.serviceType);
          break;
          
        case 'subscribed':
          console.log('Subscribed to gig chat');
          break;
          
        case 'error':
          console.error('WebSocket error:', data.message);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
      
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  // Handle chat message
  handleChatMessage(data) {
    const handler = this.messageHandlers.get('chat_message');
    if (handler) {
      handler(data);
    }
  }

  // Handle typing indicator
  handleTypingIndicator(data) {
    const { chatId, isTyping, senderId } = data;
    
    // Clear existing timeout
    const timeoutKey = `${chatId}-${senderId}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey));
      this.typingTimeouts.delete(timeoutKey);
    }
    
    // Call handler
    const handler = this.messageHandlers.get('typing_indicator');
    if (handler) {
      handler(data);
    }
    
    // Auto-hide typing indicator after 3 seconds
    if (isTyping) {
      const timeout = setTimeout(() => {
        if (handler) {
          handler({ ...data, isTyping: false });
        }
        this.typingTimeouts.delete(timeoutKey);
      }, 3000);
      
      this.typingTimeouts.set(timeoutKey, timeout);
    }
  }

  // Connection closed
  handleClose(event) {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnected = false;
    
    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
        this.connect(localStorage.getItem('token'));
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  // Handle errors
  handleError(error) {
    console.error('WebSocket error:', error);
  }

  // Send message
  send(data) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, message not sent:', data);
    }
  }

  // Send typing indicator
  sendTypingIndicator(chatId, recipientId, isTyping) {
    this.send({
      type: 'gig_chat_typing',
      chatId,
      recipientId,
      isTyping
    });
  }

  // Register message handler
  onMessage(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  // Remove message handler
  offMessage(type) {
    this.messageHandlers.delete(type);
  }

  // Disconnect
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const chatWebSocket = new ChatWebSocketManager();
```

## React Components

### Chat Hook

```javascript
import { useState, useEffect, useCallback } from 'react';
import { chatAPI } from '../api/chat';
import { chatWebSocket } from '../services/websocket';

export const useChat = (applicationId) => {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  // Load chat
  const loadChat = useCallback(async () => {
    if (!applicationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await chatAPI.getChatByApplication(applicationId);
      setChat(response.data.chat);
      setMessages(response.data.messages || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  // Load more messages
  const loadMoreMessages = useCallback(async (before) => {
    if (!chat?.id) return;
    
    try {
      const response = await chatAPI.getMessages(chat.id, 1, 20, before);
      const newMessages = response.data.messages;
      
      setMessages(prev => [...newMessages, ...prev]);
      return response.data.pagination.hasMore;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [chat?.id]);

  // Send message
  const sendMessage = useCallback(async (messageText, messageType = 'text') => {
    if (!chat?.id || !messageText.trim()) return;
    
    try {
      const response = await chatAPI.sendMessage(chat.id, {
        message: messageText.trim(),
        messageType
      });
      
      // Message will be added via WebSocket
      return response.data.message;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [chat?.id]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping) => {
    if (!chat?.id) return;
    
    const recipientId = chat.userRole === 'gig_owner' 
      ? chat.participantInfo.applicant.id 
      : chat.participantInfo.gigOwner.id;
    
    chatWebSocket.sendTypingIndicator(chat.id, recipientId, isTyping);
  }, [chat]);

  // WebSocket message handlers
  useEffect(() => {
    const handleChatMessage = (data) => {
      if (data.chatId === chat?.id) {
        setMessages(prev => [...prev, data.message]);
        
        // Update last message in chat
        setChat(prev => ({
          ...prev,
          lastMessageAt: data.message.createdAt
        }));
      }
    };

    const handleTypingIndicator = (data) => {
      if (data.chatId === chat?.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.isTyping) {
            newSet.add(data.senderId);
          } else {
            newSet.delete(data.senderId);
          }
          return newSet;
        });
      }
    };

    chatWebSocket.onMessage('chat_message', handleChatMessage);
    chatWebSocket.onMessage('typing_indicator', handleTypingIndicator);

    return () => {
      chatWebSocket.offMessage('chat_message');
      chatWebSocket.offMessage('typing_indicator');
    };
  }, [chat?.id]);

  // Load chat on mount
  useEffect(() => {
    loadChat();
  }, [loadChat]);

  return {
    chat,
    messages,
    loading,
    error,
    typingUsers,
    unreadCount,
    sendMessage,
    sendTyping,
    loadMoreMessages,
    refetch: loadChat
  };
};
```

### Chat List Component

```jsx
import React, { useState, useEffect } from 'react';
import { chatAPI } from '../api/chat';

export const ChatList = ({ onChatSelect, selectedChatId }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadChats();
  }, [filter]);

  const loadChats = async () => {
    setLoading(true);
    try {
      const response = await chatAPI.getChatList(filter);
      setChats(response.data.chats);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLastMessage = (lastMessage) => {
    if (!lastMessage) return 'No messages yet';
    return lastMessage.message.length > 50 
      ? lastMessage.message.substring(0, 50) + '...'
      : lastMessage.message;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h3>Gig Chats</h3>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Chats</option>
          <option value="active">Active</option>
          <option value="readonly">Read Only</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading chats...</div>
      ) : (
        <div className="chat-items">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${selectedChatId === chat.id ? 'selected' : ''} ${!chat.isActive ? 'readonly' : ''}`}
              onClick={() => onChatSelect(chat)}
            >
              <div className="chat-item-header">
                <h4 className="gig-title">{chat.gigTitle}</h4>
                <span className="chat-time">
                  {chat.lastMessageAt && formatTime(chat.lastMessageAt)}
                </span>
              </div>
              
              <div className="chat-item-body">
                <p className="last-message">{formatLastMessage(chat.lastMessage)}</p>
                <div className="chat-badges">
                  <span className={`role-badge ${chat.userRole}`}>
                    {chat.userRole === 'gig_owner' ? 'Owner' : 'Applicant'}
                  </span>
                  {!chat.isActive && (
                    <span className="status-badge readonly">Read Only</span>
                  )}
                  {chat.unreadCount > 0 && (
                    <span className="unread-badge">{chat.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {chats.length === 0 && (
            <div className="empty-state">
              <p>No chats available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

### Chat Interface Component

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';

export const ChatInterface = ({ applicationId, onClose }) => {
  const {
    chat,
    messages,
    loading,
    error,
    typingUsers,
    sendMessage,
    sendTyping,
    loadMoreMessages
  } = useChat(applicationId);

  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicators
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(false);
    }, 1000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageText.trim() || !chat?.isActive) return;

    try {
      await sendMessage(messageText);
      setMessageText('');
      
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        sendTyping(false);
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || messages.length === 0) return;
    
    setLoadingMore(true);
    const oldestMessage = messages[0];
    const hasMore = await loadMoreMessages(oldestMessage.id);
    setLoadingMore(false);
    
    if (!hasMore) {
      console.log('No more messages to load');
    }
  };

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isOwnMessage = (message) => {
    // Assuming you have current user context
    return message.senderId === getCurrentUserId();
  };

  if (loading) {
    return <div className="chat-loading">Loading chat...</div>;
  }

  if (error) {
    return <div className="chat-error">Error: {error}</div>;
  }

  if (!chat) {
    return <div className="chat-error">Chat not found</div>;
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="chat-info">
          <h3>{chat.gigTitle}</h3>
          <span className="participant-role">
            You are the {chat.userRole === 'gig_owner' ? 'Gig Owner' : 'Applicant'}
          </span>
        </div>
        <div className="chat-actions">
          {!chat.isActive && (
            <span className="readonly-badge">Read Only</span>
          )}
          <button onClick={onClose} className="close-button">×</button>
        </div>
      </div>

      <div 
        ref={messagesContainerRef}
        className="messages-container"
        onScroll={(e) => {
          if (e.target.scrollTop === 0) {
            handleLoadMore();
          }
        }}
      >
        {loadingMore && (
          <div className="loading-more">Loading more messages...</div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${isOwnMessage(message) ? 'own' : 'other'}`}
          >
            <div className="message-content">
              <p>{message.message}</p>
              <span className="message-time">
                {formatMessageTime(message.createdAt)}
              </span>
            </div>
          </div>
        ))}

        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            <span>Typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-input-form">
        <div className="input-container">
          <input
            type="text"
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            placeholder={
              chat.isActive 
                ? "Type your message..." 
                : "This chat is read-only"
            }
            disabled={!chat.isActive}
            className="message-input"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || !chat.isActive}
            className="send-button"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

// Helper function - replace with your actual user context
const getCurrentUserId = () => {
  // Return current user ID from your auth context
  return localStorage.getItem('userId');
};
```

### Application Integration Component

```jsx
import React, { useState } from 'react';
import { ChatInterface } from './ChatInterface';

export const ApplicationChatButton = ({ application, gig }) => {
  const [showChat, setShowChat] = useState(false);

  // Check if chat is available for this application
  const isChatAvailable = () => {
    const validStatuses = ['APPROVED', 'SUBMITTED', 'CLOSED'];
    return validStatuses.includes(application.status);
  };

  if (!isChatAvailable()) {
    return null; // Don't show chat button if not available
  }

  return (
    <>
      <button
        onClick={() => setShowChat(true)}
        className="chat-button"
      >
        💬 Chat with {application.userRole === 'gig_owner' ? 'Applicant' : 'Gig Owner'}
      </button>

      {showChat && (
        <div className="chat-overlay">
          <ChatInterface
            applicationId={application.id}
            onClose={() => setShowChat(false)}
          />
        </div>
      )}
    </>
  );
};
```

## State Management

### Redux/Context Example

```javascript
// Chat Context
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { chatWebSocket } from '../services/websocket';

const ChatContext = createContext();

const chatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_UNREAD_COUNT':
      return { ...state, unreadCount: action.payload };
    
    case 'INCREMENT_UNREAD':
      return { ...state, unreadCount: state.unreadCount + 1 };
    
    case 'DECREMENT_UNREAD':
      return { 
        ...state, 
        unreadCount: Math.max(0, state.unreadCount - action.payload) 
      };
    
    case 'SET_CONNECTION_STATUS':
      return { ...state, connected: action.payload };
    
    default:
      return state;
  }
};

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, {
    unreadCount: 0,
    connected: false
  });

  useEffect(() => {
    // Connect WebSocket on mount
    const token = localStorage.getItem('token');
    if (token) {
      chatWebSocket.connect(token);
    }

    // Handle connection status
    const handleConnectionChange = (connected) => {
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: connected });
    };

    // Handle new messages for unread count
    const handleNewMessage = (data) => {
      // Increment unread count if message is not from current user
      const currentUserId = localStorage.getItem('userId');
      if (data.message.senderId !== currentUserId) {
        dispatch({ type: 'INCREMENT_UNREAD' });
      }
    };

    chatWebSocket.onMessage('chat_message', handleNewMessage);

    return () => {
      chatWebSocket.disconnect();
      chatWebSocket.offMessage('chat_message');
    };
  }, []);

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useGlobalChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useGlobalChat must be used within ChatProvider');
  }
  return context;
};
```

## UI/UX Guidelines

### CSS Styles

```css
/* Chat List Styles */
.chat-list {
  width: 300px;
  height: 100%;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.chat-list-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.chat-item:hover {
  background-color: #f8f9fa;
}

.chat-item.selected {
  background-color: #e3f2fd;
}

.chat-item.readonly {
  opacity: 0.7;
}

.chat-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.gig-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: #1976d2;
}

.chat-time {
  font-size: 12px;
  color: #666;
}

.last-message {
  font-size: 13px;
  color: #666;
  margin: 0 0 8px 0;
}

.chat-badges {
  display: flex;
  gap: 8px;
  align-items: center;
}

.role-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  text-transform: uppercase;
  font-weight: 600;
}

.role-badge.gig_owner {
  background-color: #e8f5e8;
  color: #2e7d32;
}

.role-badge.applicant {
  background-color: #fff3e0;
  color: #f57c00;
}

.status-badge.readonly {
  background-color: #ffebee;
  color: #c62828;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
}

.unread-badge {
  background-color: #f44336;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

/* Chat Interface Styles */
.chat-interface {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f8f9fa;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  max-width: 70%;
}

.message.own {
  align-self: flex-end;
}

.message.other {
  align-self: flex-start;
}

.message-content {
  padding: 8px 12px;
  border-radius: 12px;
  position: relative;
}

.message.own .message-content {
  background-color: #1976d2;
  color: white;
}

.message.other .message-content {
  background-color: #e0e0e0;
  color: #333;
}

.message-time {
  font-size: 10px;
  opacity: 0.7;
  margin-left: 8px;
}

.typing-indicator {
  align-self: flex-start;
  padding: 8px 12px;
  background-color: #f0f0f0;
  border-radius: 12px;
  font-style: italic;
  color: #666;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.message-input-form {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.input-container {
  display: flex;
  gap: 8px;
}

.message-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  outline: none;
}

.message-input:focus {
  border-color: #1976d2;
}

.send-button {
  padding: 8px 16px;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

.send-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.readonly-badge {
  background-color: #ffebee;
  color: #c62828;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
}

/* Overlay for modal chat */
.chat-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.chat-overlay .chat-interface {
  width: 800px;
  height: 600px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* Responsive design */
@media (max-width: 768px) {
  .chat-overlay .chat-interface {
    width: 95%;
    height: 90%;
  }
  
  .chat-list {
    width: 100%;
  }
  
  .message {
    max-width: 85%;
  }
}
```

## Error Handling

### Error Boundary Component

```jsx
import React from 'react';

export class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chat Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="chat-error-boundary">
          <h3>Something went wrong with the chat</h3>
          <p>Please refresh the page or try again later.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Error Handling Utils

```javascript
export const handleChatError = (error, context) => {
  console.error(`Chat Error [${context}]:`, error);
  
  // Handle specific error types
  if (error.message?.includes('403')) {
    return 'You do not have permission to access this chat';
  }
  
  if (error.message?.includes('404')) {
    return 'Chat not found or application not approved';
  }
  
  if (error.message?.includes('400')) {
    return 'Invalid request. Please check your input.';
  }
  
  if (error.name === 'NetworkError') {
    return 'Network error. Please check your connection.';
  }
  
  return 'An unexpected error occurred. Please try again.';
};
```

## Testing

### Unit Tests Example

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '../components/ChatInterface';
import { chatAPI } from '../api/chat';

// Mock the API
jest.mock('../api/chat');

describe('ChatInterface', () => {
  beforeEach(() => {
    chatAPI.getChatByApplication.mockResolvedValue({
      data: {
        chat: {
          id: 'chat-1',
          gigTitle: 'Test Gig',
          isActive: true,
          userRole: 'applicant'
        },
        messages: []
      }
    });
  });

  test('renders chat interface', async () => {
    render(<ChatInterface applicationId="app-1" onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Gig')).toBeInTheDocument();
    });
  });

  test('sends message when form is submitted', async () => {
    chatAPI.sendMessage.mockResolvedValue({
      data: { message: { id: 'msg-1', message: 'Hello' } }
    });

    render(<ChatInterface applicationId="app-1" onClose={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Gig')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(chatAPI.sendMessage).toHaveBeenCalledWith('chat-1', {
        message: 'Hello',
        messageType: 'text'
      });
    });
  });

  test('disables input when chat is read-only', async () => {
    chatAPI.getChatByApplication.mockResolvedValue({
      data: {
        chat: {
          id: 'chat-1',
          gigTitle: 'Test Gig',
          isActive: false, // Read-only
          userRole: 'applicant'
        },
        messages: []
      }
    });

    render(<ChatInterface applicationId="app-1" onClose={() => {}} />);
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText('This chat is read-only');
      expect(input).toBeDisabled();
    });
  });
});
```

### Integration Test Example

```javascript
import { render, screen } from '@testing-library/react';
import { ChatProvider } from '../context/ChatContext';
import { App } from '../App';

describe('Chat Integration', () => {
  test('shows unread count in navigation', async () => {
    render(
      <ChatProvider>
        <App />
      </ChatProvider>
    );
    
    // Test would verify unread count appears in navigation
    // This depends on your app structure
  });
});
```

## Performance Optimization

### Message Virtualization

```javascript
import { FixedSizeList as List } from 'react-window';

export const VirtualizedMessageList = ({ messages, height }) => {
  const MessageItem = ({ index, style }) => {
    const message = messages[index];
    
    return (
      <div style={style}>
        <div className={`message ${isOwnMessage(message) ? 'own' : 'other'}`}>
          <div className="message-content">
            <p>{message.message}</p>
            <span className="message-time">
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <List
      height={height}
      itemCount={messages.length}
      itemSize={60} // Approximate message height
      className="virtualized-messages"
    >
      {MessageItem}
    </List>
  );
};
```

### Message Caching

```javascript
// Simple message cache
class MessageCache {
  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(chatId, messages) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(chatId, {
      messages,
      timestamp: Date.now()
    });
  }

  get(chatId) {
    const cached = this.cache.get(chatId);
    if (!cached) return null;
    
    // Cache expires after 5 minutes
    const isExpired = Date.now() - cached.timestamp > 5 * 60 * 1000;
    if (isExpired) {
      this.cache.delete(chatId);
      return null;
    }
    
    return cached.messages;
  }

  clear() {
    this.cache.clear();
  }
}

export const messageCache = new MessageCache();
```

## Deployment Considerations

### Environment Configuration

```javascript
// config/chat.js
export const chatConfig = {
  development: {
    apiUrl: 'http://localhost:3001',
    wsUrl: 'ws://localhost:4000/ws',
    reconnectInterval: 1000,
    maxReconnectAttempts: 5
  },
  production: {
    apiUrl: 'https://api.yourdomain.com',
    wsUrl: 'wss://ws.yourdomain.com/ws',
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  }
};

export const getChatConfig = () => {
  return chatConfig[process.env.NODE_ENV] || chatConfig.development;
};
```

### Service Worker for Offline Support

```javascript
// sw-chat.js
self.addEventListener('sync', event => {
  if (event.tag === 'chat-sync') {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  const pendingMessages = await getStoredPendingMessages();
  
  for (const message of pendingMessages) {
    try {
      await sendMessageToServer(message);
      await removePendingMessage(message.id);
    } catch (error) {
      console.error('Failed to sync message:', error);
    }
  }
}
```

This comprehensive guide covers all aspects of integrating the chat feature into your client application. The implementation is modular, scalable, and follows React best practices while providing real-time functionality through WebSocket integration.