# 🎬 Crew Bid Management API Documentation

## Overview
The Crew Bid Management API provides endpoints for crew members to manage their project bids, track statistics, and handle bid lifecycle operations.

## Base URL
```
http://localhost:3000/api/crew
```

## Authentication
All endpoints require JWT authentication:
```
Authorization: Bearer <access_token>
```

---

## 📋 Endpoints

### 1. **GET /api/crew/bids**
Get user's bids with filtering, sorting, and pagination.

**Query Parameters:**
- `status` (optional): Filter by bid status (`PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`, `EXPIRED`)
- `sortBy` (optional): Sort order (`recent`, `amount`, `deadline`) - Default: `recent`
- `page` (optional): Page number - Default: `1`
- `limit` (optional): Items per page - Default: `20`
- `search` (optional): Search in project title and description

**Example Request:**
```bash
GET /api/crew/bids?status=PENDING&sortBy=amount&page=1&limit=10&search=video
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "bids": [
      {
        "id": "bid-123",
        "projectId": "gig-456",
        "projectTitle": "Video Editor Needed for YouTube Channel",
        "clientName": "john_doe",
        "bidAmount": 5000,
        "proposedDuration": "5 days",
        "message": "I have 5 years of experience in video editing...",
        "status": "PENDING",
        "submittedAt": "2025-01-15T10:00:00Z",
        "responseAt": null,
        "projectDeadline": "2025-02-01T10:00:00Z",
        "projectBudget": {
          "min": 4000,
          "max": 6000,
          "type": "FIXED"
        },
        "attachments": ["https://portfolio.com/work1"],
        "skills": ["After Effects", "Premiere Pro"],
        "equipment": ["Professional Camera", "Lighting Kit"],
        "location": "Remote",
        "isRemote": true,
        "expiresAt": "2025-01-22T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 2. **GET /api/crew/bids/stats**
Get user's bid statistics and performance metrics.

**Example Request:**
```bash
GET /api/crew/bids/stats
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalBids": 25,
    "pendingBids": 8,
    "acceptedBids": 12,
    "rejectedBids": 3,
    "successRate": 48.0,
    "avgResponseTime": 24.5,
    "totalValue": 75000
  }
}
```

**Statistics Explanation:**
- `totalBids`: Total number of bids submitted
- `pendingBids`: Number of bids awaiting response
- `acceptedBids`: Number of accepted bids
- `rejectedBids`: Number of rejected bids
- `successRate`: Percentage of accepted bids (rounded to 1 decimal)
- `avgResponseTime`: Average response time in hours (rounded to 1 decimal)
- `totalValue`: Total value of accepted bids in credits

---

### 3. **PATCH /api/crew/bids/:id/withdraw**
Withdraw a pending bid.

**Path Parameters:**
- `id`: Bid ID

**Example Request:**
```bash
PATCH /api/crew/bids/bid-123/withdraw
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Bid withdrawn successfully",
  "data": {
    "id": "bid-123",
    "status": "WITHDRAWN"
  }
}
```

**Error Responses:**
- `404`: Bid not found
- `403`: Not authorized to withdraw this bid
- `400`: Only pending bids can be withdrawn

---

### 4. **GET /api/crew/bids/:id**
Get detailed information about a specific bid.

**Path Parameters:**
- `id`: Bid ID

**Example Request:**
```bash
GET /api/crew/bids/bid-123
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "bid-123",
    "projectId": "gig-456",
    "projectTitle": "Video Editor Needed for YouTube Channel",
    "clientName": "john_doe",
    "bidAmount": 5000,
    "proposedDuration": "5 days",
    "message": "I have 5 years of experience in video editing...",
    "status": "PENDING",
    "submittedAt": "2025-01-15T10:00:00Z",
    "responseAt": null,
    "projectDeadline": "2025-02-01T10:00:00Z",
    "projectBudget": {
      "min": 4000,
      "max": 6000,
      "type": "FIXED"
    },
    "attachments": ["https://portfolio.com/work1"],
    "skills": ["After Effects", "Premiere Pro"],
    "equipment": ["Professional Camera", "Lighting Kit"],
    "location": "Remote",
    "isRemote": true,
    "expiresAt": "2025-01-22T10:00:00Z"
  }
}
```

---

### 5. **PUT /api/crew/bids/:id**
Update a pending bid.

**Path Parameters:**
- `id`: Bid ID

**Request Body:**
```json
{
  "proposal": "Updated proposal text...",
  "quotedPrice": 5500,
  "estimatedTime": "6 days",
  "portfolio": ["https://new-portfolio.com/work1"],
  "equipment": ["Updated equipment list"]
}
```

**Example Request:**
```bash
PUT /api/crew/bids/bid-123
Content-Type: application/json

{
  "proposal": "Updated proposal with more details...",
  "quotedPrice": 5500,
  "estimatedTime": "6 days"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Bid updated successfully",
  "data": {
    "id": "bid-123",
    "proposal": "Updated proposal with more details...",
    "quotedPrice": 5500,
    "estimatedTime": "6 days",
    "updatedAt": "2025-01-16T10:00:00Z"
  }
}
```

---

## 🔄 Status Values

### Bid Statuses:
- `PENDING`: Awaiting client response
- `ACCEPTED`: Bid accepted by client
- `REJECTED`: Bid rejected by client
- `WITHDRAWN`: Bid withdrawn by crew member
- `EXPIRED`: Bid expired (project deadline passed)

### Sort Options:
- `recent`: Sort by submission date (newest first)
- `amount`: Sort by bid amount (highest first)
- `deadline`: Sort by project deadline (earliest first)

---

## 🚀 Integration with Client

These endpoints are designed to work seamlessly with the client's `my-bids` page:

1. **Bid Listing**: `GET /api/crew/bids` provides all necessary data for the bid cards
2. **Statistics**: `GET /api/crew/bids/stats` powers the stats cards at the top
3. **Bid Actions**: `PATCH /api/crew/bids/:id/withdraw` enables bid withdrawal
4. **Filtering**: Query parameters support all client filtering needs
5. **Pagination**: Built-in pagination for large bid lists

---

## 🔧 Error Handling

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP Status Codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

---

## 📊 Event Publishing

The following events are published to RabbitMQ for integration with other services:

- `application_withdrawn`: When a bid is withdrawn
  ```json
  {
    "applicationId": "bid-123",
    "gigId": "gig-456",
    "applicantId": "user-789",
    "gigOwnerId": "user-101",
    "gigTitle": "Video Editor Needed"
  }
  ```

---

## 🎯 Usage Examples

### Get All Pending Bids:
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/crew/bids?status=PENDING"
```

### Get Bid Statistics:
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/crew/bids/stats"
```

### Withdraw a Bid:
```bash
curl -X PATCH \
     -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/crew/bids/bid-123/withdraw"
```

### Search Bids:
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3000/api/crew/bids?search=video&sortBy=amount"
```

---

## ✅ Implementation Status

- ✅ **GET /api/crew/bids** - Complete with filtering, sorting, pagination
- ✅ **GET /api/crew/bids/stats** - Complete with comprehensive statistics
- ✅ **PATCH /api/crew/bids/:id/withdraw** - Complete with validation
- ✅ **GET /api/crew/bids/:id** - Complete with detailed bid information
- ✅ **PUT /api/crew/bids/:id** - Complete with update functionality
- ✅ **API Gateway Integration** - Routes configured at `/api/crew/*`
- ✅ **Authentication** - JWT required for all endpoints
- ✅ **Error Handling** - Comprehensive error responses
- ✅ **Event Publishing** - RabbitMQ integration for bid withdrawals
- ✅ **Data Transformation** - Client-compatible response format 