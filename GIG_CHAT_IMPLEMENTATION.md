# Gig Chat Implementation Guide

## Overview
Complete chat system implementation for gig owners and approved applicants using microservice architecture with RabbitMQ messaging.

## Key Features
- ✅ **Access Control**: Only gig owners and approved applicants can chat
- ✅ **Read-Only Mode**: Chat becomes read-only when application is closed
- ✅ **Real-Time Messaging**: Via WebSocket with RabbitMQ event handling
- ✅ **Message Persistence**: All messages stored in database
- ✅ **Typing Indicators**: Real-time typing status
- ✅ **Message Pagination**: Efficient message loading
- ✅ **Microservice Architecture**: Proper service separation with RabbitMQ

## Architecture

### Services Integration
```
Gig Service (REST API) ──► RabbitMQ ──► WebSocket Gateway ──► Client
     │                     Events         Real-time          WebSocket
     └── Database ◄────────────────────────────────────────────────┘
     (PostgreSQL)                Message Persistence
```

### Key Components
1. **Gig Service**: Chat CRUD operations, business logic, database operations
2. **RabbitMQ**: Asynchronous messaging between services
3. **WebSocket Gateway**: Real-time message delivery to clients
4. **Database**: Message persistence with Prisma ORM

## Database Schema

### GigChat Table
```sql
CREATE TABLE "gigChats" (
    "id" TEXT PRIMARY KEY,
    "gigId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL UNIQUE, -- One chat per application
    "gigOwnerId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,     -- False = read-only mode
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now(),
    "lastMessageAt" TIMESTAMP DEFAULT now()
);
```

### GigChatMessage Table
```sql
CREATE TABLE "gigChatMessages" (
    "id" TEXT PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,          -- "gig_owner" or "applicant"
    "message" TEXT NOT NULL,
    "messageType" TEXT DEFAULT 'text',   -- "text", "file", "image"
    "fileUrl" TEXT,                      -- For file attachments
    "fileName" TEXT,                     -- Original filename
    "isEdited" BOOLEAN DEFAULT false,
    "editedAt" TIMESTAMP,
    "isRead" BOOLEAN DEFAULT false,
    "readAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT now(),
    "updatedAt" TIMESTAMP DEFAULT now()
);
```

## API Endpoints

### Chat Management

#### GET `/chat/application/:applicationId`
**Description**: Get or create chat for an application
**Access**: Gig owner or applicant only
**Prerequisites**: Application must be APPROVED, SUBMITTED, or CLOSED

**Response**:
```json
{
  "success": true,
  "data": {
    "chat": {
      "id": "chat-id",
      "gigId": "gig-id",
      "applicationId": "app-id",
      "isActive": true,
      "userRole": "gig_owner", // or "applicant"
      "gigTitle": "Video Editor Needed",
      "participantInfo": {
        "gigOwner": {
          "id": "owner-id",
          "name": "Brand Name"
        },
        "applicant": {
          "id": "applicant-id",
          "type": "user"
        }
      }
    },
    "messages": []
  }
}
```

#### GET `/chat/`
**Description**: Get user's chat list
**Query Parameters**: 
- `status`: `all`, `active`, `readonly`

**Response**:
```json
{
  "success": true,
  "data": {
    "chats": [
      {
        "id": "chat-id",
        "gigTitle": "Video Editor Needed",
        "gigStatus": "ASSIGNED",
        "applicationStatus": "APPROVED",
        "isActive": true,
        "userRole": "applicant",
        "lastMessage": {
          "message": "When can you start?",
          "senderId": "owner-id",
          "createdAt": "2024-01-01T12:00:00Z"
        },
        "unreadCount": 2,
        "lastMessageAt": "2024-01-01T12:00:00Z"
      }
    ]
  }
}
```

### Messaging

#### POST `/chat/:chatId/messages`
**Description**: Send a message
**Prerequisites**: Chat must be active (not read-only)

**Request Body**:
```json
{
  "message": "When do you need this completed?",
  "messageType": "text",
  "fileUrl": null,
  "fileName": null
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "msg-id",
      "chatId": "chat-id",
      "senderId": "user-id",
      "senderType": "applicant",
      "message": "When do you need this completed?",
      "messageType": "text",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

#### GET `/chat/:chatId/messages`
**Description**: Get chat messages with pagination
**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Messages per page (default: 50)
- `before`: Cursor for pagination

**Response**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-id",
        "senderId": "user-id",
        "senderType": "gig_owner",
        "message": "Looking forward to working with you!",
        "messageType": "text",
        "isRead": true,
        "createdAt": "2024-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "hasMore": false
    }
  }
}
```

### Utilities

#### GET `/chat/unread/count`
**Description**: Get total unread message count for user

**Response**:
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

#### PATCH `/chat/:chatId/status`
**Description**: Update chat status (gig owner only)
**Access**: Gig owner only

**Request Body**:
```json
{
  "isActive": false  // Set to read-only
}
```

## WebSocket Integration

### Real-Time Messaging

#### Message Broadcasting
When a message is sent via REST API, it's automatically broadcast to the recipient via WebSocket:

```javascript
// WebSocket message structure
{
  "type": "gig_chat_message",
  "chatId": "chat-id",
  "message": {
    "id": "msg-id",
    "senderId": "sender-id",
    "senderType": "gig_owner",
    "message": "Hello!",
    "createdAt": "2024-01-01T12:00:00Z"
  },
  "gigTitle": "Video Editor Needed",
  "senderRole": "gig_owner"
}
```

#### Typing Indicators
Real-time typing indicators between participants:

**Send Typing**:
```javascript
// WebSocket message to send
{
  "type": "gig_chat_typing",
  "chatId": "chat-id",
  "recipientId": "recipient-user-id",
  "isTyping": true
}
```

**Receive Typing**:
```javascript
// WebSocket message received
{
  "type": "gig_chat_typing",
  "chatId": "chat-id",
  "isTyping": true,
  "senderId": "sender-id",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Access Control Rules

### Chat Creation
- Chat is automatically created when first accessed
- Only available for applications with status: APPROVED, SUBMITTED, or CLOSED
- One chat per application (unique constraint)

### Chat Access
- **Gig Owner**: User who posted the gig (`gig.postedById`)
- **Applicant**: User who applied (`application.applicantId`)
- No other users can access the chat

### Chat Status
- **Active** (`isActive: true`): Both parties can send messages
- **Read-Only** (`isActive: false`): Messages can be viewed but not sent
- Automatically set to read-only when application status becomes CLOSED

### Message Permissions
- Users can only send messages in active chats
- Users can view all messages in chats they have access to
- Messages are automatically marked as read when chat is viewed

## Frontend Integration

### Chat List Component
```javascript
// Get user's chats
const response = await fetch('/chat/', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { chats } = response.data;
```

### Chat Interface
```javascript
// Get/create chat for application
const response = await fetch(`/chat/application/${applicationId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { chat, messages } = response.data;

// Send message
const sendMessage = async (message) => {
  await fetch(`/chat/${chatId}/messages`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });
};
```

### WebSocket Integration
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:4000/ws');

// Listen for chat messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'gig_chat_message') {
    // Update chat UI with new message
    addMessageToChat(data.chatId, data.message);
  }
  
  if (data.type === 'gig_chat_typing') {
    // Show/hide typing indicator
    updateTypingIndicator(data.chatId, data.isTyping, data.senderId);
  }
};

// Send typing indicator
const sendTyping = (isTyping) => {
  ws.send(JSON.stringify({
    type: 'gig_chat_typing',
    chatId: currentChatId,
    recipientId: otherUserId,
    isTyping
  }));
};
```

## Security Considerations

### Data Protection
- All messages are stored securely in the database
- Chat access is verified on every request
- No sensitive information is exposed in error messages

### Access Control
- Role-based access control ensures only participants can access chats
- Application status validation prevents unauthorized chat creation
- Read-only mode protects completed work discussions

### Rate Limiting
- Message sending should be rate-limited to prevent spam
- WebSocket connections are authenticated and validated

## Usage Examples

### Typical Chat Flow

1. **Application Approved**: Chat becomes available
2. **Initial Contact**: Gig owner or applicant sends first message
3. **Work Discussion**: Both parties discuss project details
4. **Work Completion**: Application status changes to CLOSED
5. **Read-Only Mode**: Chat becomes read-only for reference

### Common Use Cases

- **Project Clarification**: Discussing requirements and deliverables
- **Timeline Coordination**: Agreeing on deadlines and milestones
- **Feedback Exchange**: Sharing feedback on submitted work
- **Issue Resolution**: Addressing any problems during work

## Monitoring & Analytics

### Chat Metrics
- Track chat creation rate per gig type
- Monitor message volume and frequency
- Analyze chat usage patterns by user type

### Performance Monitoring
- WebSocket connection health
- Message delivery latency
- Database query performance

The chat feature provides a simple but effective communication channel for gig-related discussions while maintaining proper access controls and real-time capabilities.