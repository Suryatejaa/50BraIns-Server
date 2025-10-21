# 🧠 50BraIns Server API Documentation

## Overview

The 50BraIns Server is a comprehensive **Creator Economy Platform** built with microservices architecture, featuring an Express-powered API Gateway that centralizes routing, CORS handling, security, and authentication for all services.

**Base URL**: `http://localhost:3000`  
**Version**: 1.0.0  
**Status**: Production Ready ✅  
**Total Services**: 9 Microservices + API Gateway

### **Platform Purpose**
50BraIns is a **LinkedIn meets Fiverr** platform for the creator economy, enabling:
- **Brands** to find and hire verified creators for marketing campaigns
- **Creators** to showcase work, build reputation, and earn money
- **Teams (Clans)** to collaborate on larger projects and share success
- **Freelancers** to offer specialized creative services

---

## 🏗️ Architecture

```
Frontend (React/React Native) → API Gateway (Port 3000) → Microservices
                               ├── CORS Handling          ├── Auth Service (Port 4001)
                               ├── Authentication         ├── User Service (Port 4002)  
                               ├── Rate Limiting          ├── Clan Service (Port 4003)
                               ├── Request Routing        ├── Gig Service (Port 4004)
                               ├── Security Headers       ├── Credit Service (Port 4005)
                               └── Error Handling         ├── Reputation Service (Port 4006)
                                                         ├── Work History Service (Port 4007)
                                                         ├── Social Media Service (Port 4008)
                                                         └── Notification Service (Port 4009)
```

### **Service Responsibilities**
| Service | Port | Purpose |
|---------|------|---------|
| **API Gateway** | 3000 | Centralized routing, CORS, authentication, rate limiting |
| **Auth Service** | 4001 | User authentication, JWT management, security |
| **User Service** | 4002 | User profiles, discovery, search, analytics |
| **Clan Service** | 4003 | Team formation, collaboration, member management |
| **Gig Service** | 4004 | Project marketplace, applications, submissions |
| **Credit Service** | 4005 | Virtual currency, payments, boosts |
| **Reputation Service** | 4006 | Scoring system, leaderboards, achievements |
| **Work History Service** | 4007 | Portfolio tracking, skill assessment, achievements |
| **Social Media Service** | 4008 | Multi-platform integration, analytics |
| **Notification Service** | 4009 | Multi-channel communication hub |

---

## 🌐 API Gateway Routes

### **Route Mapping**
```typescript
// Public Routes (No Authentication Required)
'/health'                       → API Gateway health check
'/api-docs'                     → API documentation

// Authentication Routes
'/api/auth/*'                   → auth-service:4001
'/api/auth/health'              → auth-service:4001/health

// Public Data Access (No Authentication)
'/api/public/*'                 → user-service:4002 (Public profiles)
'/api/analytics/trending-*'     → user-service:4002 (Public analytics)
'/api/reputation/*'             → reputation-service:4006 (Public reputation)
'/api/portfolio/*'              → work-history-service:4007 (Public portfolios)
'/api/credit/public/*'          → credit-service:4005 (Public pricing)

// Protected Routes (Authentication Required)
'/api/user/*'                   → user-service:4002
'/api/clan/*'                   → clan-service:4003
'/api/gig/*'                    → gig-service:4004
'/api/credit/*'                 → credit-service:4005
'/api/work-history/*'           → work-history-service:4007
'/api/social-media/*'           → social-media-service:4008
'/api/notifications/*'          → notification-service:4009

// Admin Routes (Admin Role Required)
'/api/admin/*'                  → Distributed across services
```

### **Global Headers Required**
```typescript
interface GlobalHeaders {
  'Content-Type': 'application/json';
  'Accept': 'application/json';
  // For authenticated requests:
  'Authorization': 'Bearer <JWT_TOKEN>';
}
```

### **Standard Response Format**
```typescript
// Success Response
interface APISuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

// Error Response  
interface APIErrorResponse {
  success: false;
  error: string;
  message: string;
  timestamp: string;
  requestId?: string;
}
```

### Health & Monitoring

#### Gateway Health Check

- **Endpoint**: `GET /health`
- **Description**: Check API Gateway health and all service status
- **Authentication**: None required
- **Response**:

```json
{
  "status": "healthy",
  "timestamp": "2025-07-01T12:00:00.000Z",
  "uptime": 746.411,
  "environment": "development", 
  "version": "1.0.0",
  "services": {
    "auth": { "url": "http://localhost:4001", "status": "connected" },
    "user": { "url": "http://localhost:4002", "status": "connected" },
    "clan": { "url": "http://localhost:4003", "status": "connected" },
    "gig": { "url": "http://localhost:4004", "status": "connected" },
    "credit": { "url": "http://localhost:4005", "status": "connected" },
    "reputation": { "url": "http://localhost:4006", "status": "connected" },
    "workHistory": { "url": "http://localhost:4007", "status": "connected" },
    "socialMedia": { "url": "http://localhost:4008", "status": "connected" },
    "notification": { "url": "http://localhost:4009", "status": "connected" }
  }
}
```

#### API Documentation

- **Endpoint**: `GET /api-docs`
- **Description**: Get comprehensive API documentation and available endpoints
- **Authentication**: None required
    "user": {
      "url": "http://localhost:4002",
      "status": "unknown"
    }
  }
}
```

#### Metrics

- **Endpoint**: `GET /metrics`
- **Description**: Get API Gateway metrics and performance data
- **Authentication**: None required

---

## 🔐 Authentication Service (Port 4001)

The Authentication Service handles all user authentication, authorization, and security management for the 50BraIns platform.

### **Core Features**
- ✅ User registration with email verification
- ✅ JWT token-based authentication with refresh tokens  
- ✅ Role-based access control (RBAC)
- ✅ Password reset and security management
- ✅ Admin user management
- ✅ Account verification and status management
- ✅ Security logging and monitoring

### **User Roles**
- **USER**: Basic platform access
- **INFLUENCER**: Content creators and influencers
- **BRAND**: Companies and brands
- **CREW**: Behind-the-scenes creative professionals
- **ADMIN**: Platform administrators
- **SUPER_ADMIN**: Full system access

### Public Authentication Routes

#### User Registration

- **Endpoint**: `POST /api/auth/register`
- **Description**: Register a new user account with email verification
- **Rate Limit**: Applied (5 requests per 15 minutes)
- **Request Body**:

```json
{
  "email": "creator@example.com",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "INFLUENCER",
  "agreeToTerms": true,
  "agreeToPrivacyPolicy": true
}
```

- **Success Response** (201):

```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "data": {
    "userId": "cm4k8x9y10000abc123def456",
    "email": "creator@example.com",
    "status": "PENDING_VERIFICATION"
  }
}
```

#### User Login

- **Endpoint**: `POST /api/auth/login`
- **Description**: Authenticate user and receive access tokens
- **Rate Limit**: Applied (5 attempts per 15 minutes)
- **Request Body**:

```json
{
  "email": "creator@example.com",
  "password": "SecurePassword123!",
  "rememberMe": true
}
```

- **Success Response** (200):

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "cm4k8x9y10000abc123def456",
      "email": "creator@example.com", 
      "firstName": "John",
      "lastName": "Doe",
      "userType": "INFLUENCER",
      "roles": ["USER", "INFLUENCER"],
      "isVerified": true,
      "status": "ACTIVE"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

#### Token Refresh

- **Endpoint**: `POST /api/auth/refresh`
- **Description**: Refresh access token using refresh token
- **Request Body**:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Password Reset Request

- **Endpoint**: `POST /api/auth/forgot-password`
- **Description**: Request password reset email
- **Request Body**:

```json
{
  "email": "creator@example.com"
}
```

#### Email Verification

- **Endpoint**: `GET /api/auth/verify-email/:token`
- **Description**: Verify user email with verification token

#### Auth Service Health

- **Endpoint**: `GET /api/auth/health`
- **Description**: Check authentication service health
- **Response**:

```json
{
  "status": "OK",
  "timestamp": "2025-07-01T12:00:00.000Z",
  "uptime": 94.885,
  "environment": "development",
  "version": "1.0.0"
}
```

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isEmailVerified": false
    },
    "token": "jwt_token_here"
  }
}
```

#### User Login

- **Endpoint**: `POST /api/auth/login`
- **Description**: Authenticate user and receive access token
- **Rate Limit**: Applied
- **Request Body**:

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

- **Response** (Success):

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

- **Response** (Error):

```json
{
  "success": false,
  "error": {
    "statusCode": 401,
    "code": "AUTH_ERROR",
    "isOperational": true
  },
  "message": "Invalid credentials"
}
```

#### Token Refresh

- **Endpoint**: `POST /api/auth/refresh`
- **Description**: Refresh access token using refresh token
- **Rate Limit**: Applied
- **Request Body**:

```json
{
  "refreshToken": "refresh_token_here"
}
```

#### Password Reset Request

- **Endpoint**: `POST /api/auth/forgot-password`
- **Description**: Request password reset email
- **Rate Limit**: Applied
- **Request Body**:

```json
{
  "email": "user@example.com"
}
```

#### Email Verification

- **Endpoint**: `GET /api/auth/verify-email/:token`
- **Description**: Verify user email with token
- **Parameters**:
  - `token`: Email verification token

#### Auth Service Health

- **Endpoint**: `GET /api/auth/health`
- **Description**: Check authentication service health
- **Authentication**: None required
- **Response**:

```json
{
  "status": "OK",
  "timestamp": "2025-06-23T05:38:41.263Z",
  "uptime": 94.885,
  "environment": "development",
  "version": "1.0.0",
  "memory": {
    "used": "19 MB",
    "total": "20 MB"
  }
}
```

### Protected Routes (Authentication Required)

All protected routes require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

#### User Logout

- **Endpoint**: `POST /api/auth/logout`
- **Description**: Logout user and invalidate current session
- **Authentication**: Required

#### Logout All Sessions

- **Endpoint**: `POST /api/auth/logout-all`
- **Description**: Logout user from all devices/sessions
- **Authentication**: Required

#### Get User Profile

- **Endpoint**: `GET /api/auth/profile`
- **Description**: Get current user profile information
- **Authentication**: Required
- **Response**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isEmailVerified": true,
      "createdAt": "2025-06-23T00:00:00.000Z",
      "updatedAt": "2025-06-23T00:00:00.000Z"
    }
  }
}
```

#### Validate Token

- **Endpoint**: `GET /api/auth/validate`
- **Description**: Validate current JWT token
- **Authentication**: Required

#### Change Password

- **Endpoint**: `POST /api/auth/change-password`
- **Description**: Change user password
- **Authentication**: Required
- **Request Body**:

```json
{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

### Two-Factor Authentication (2FA) Routes

#### Setup 2FA

- **Endpoint**: `POST /api/auth/2fa/setup`
- **Description**: Setup two-factor authentication
- **Authentication**: Required

#### Verify 2FA

- **Endpoint**: `POST /api/auth/2fa/verify`
- **Description**: Verify 2FA code
- **Authentication**: Required

#### Disable 2FA

- **Endpoint**: `POST /api/auth/2fa/disable`
- **Description**: Disable two-factor authentication
- **Authentication**: Required

---

## User Service Routes

All user service routes are proxied through the API Gateway with the `/api` prefix and focus on read-only operations for user discovery, search, and analytics.

### Public Routes (No Authentication Required)

#### Get Public User Profile

- **Endpoint**: `GET /api/public/users/:userId`
- **Description**: Get public profile information for any user
- **Authentication**: None required
- **Parameters**:
  - `userId`: User ID to fetch profile for
- **Response**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "bio": "Content creator and influencer",
      "location": "Mumbai, India",
      "profilePicture": "https://...",
      "roles": "INFLUENCER",
      "publicFields": {
        "contentCategories": ["fashion", "lifestyle"],
        "primaryNiche": "fashion"
      }
    }
  }
}
```

#### Get Public Influencer Profile

- **Endpoint**: `GET /api/public/influencers/:userId`
- **Description**: Get detailed public profile for influencers
- **Authentication**: None required

#### Get Public Brand Profile

- **Endpoint**: `GET /api/public/brands/:userId`
- **Description**: Get detailed public profile for brands
- **Authentication**: None required

#### Get Public Crew Profile

- **Endpoint**: `GET /api/public/crew/:userId`
- **Description**: Get detailed public profile for crew members
- **Authentication**: None required

### Search Routes (Authentication Required)

#### Search Users

- **Endpoint**: `GET /api/search/users`
- **Description**: Search across all user types with filters
- **Authentication**: Required
- **Query Parameters**:
  - `q`: Search query
  - `roles`: Filter by user roles
  - `location`: Filter by location
  - `page`: Page number
  - `limit`: Results per page

#### Search Influencers

- **Endpoint**: `GET /api/search/influencers`
- **Description**: Search specifically for influencers
- **Authentication**: Required
- **Query Parameters**:
  - `q`: Search query
  - `niche`: Filter by content category
  - `platform`: Filter by primary platform
  - `minFollowers`: Minimum follower count
  - `location`: Filter by location

#### Search Brands

- **Endpoint**: `GET /api/search/brands`
- **Description**: Search for brand profiles
- **Authentication**: Required

#### Search Crew

- **Endpoint**: `GET /api/search/crew`
- **Description**: Search for crew members by skills
- **Authentication**: Required

### Analytics Routes (Mixed Authentication)

#### Get Trending Influencers

- **Endpoint**: `GET /api/analytics/trending-influencers`
- **Description**: Get trending influencer profiles
- **Authentication**: None required

#### Get Popular Brands

- **Endpoint**: `GET /api/analytics/popular-brands`
- **Description**: Get popular brand profiles
- **Authentication**: None required

#### Get Search Trends

- **Endpoint**: `GET /api/analytics/search-trends`
- **Description**: Get platform search trends and insights
- **Authentication**: None required

#### Get Profile Views

- **Endpoint**: `GET /api/analytics/profile-views/:userId`
- **Description**: Get profile view analytics for a specific user
- **Authentication**: Required

#### Get User Insights

- **Endpoint**: `GET /api/analytics/user-insights/:userId`
- **Description**: Get detailed analytics and insights for a user
- **Authentication**: Required

### Sync Routes (Admin Only)

#### Handle User Updates

- **Endpoint**: `POST /api/sync/user-updated`
- **Description**: Webhook endpoint for auth-service to notify of user changes
- **Authentication**: Service-to-service

#### Manual Sync All Users

- **Endpoint**: `POST /api/sync/sync-all-users`
- **Description**: Manually trigger sync of all users from auth-service
- **Authentication**: Required (Admin only)

#### Get Sync Status

- **Endpoint**: `GET /api/sync/sync-status`
- **Description**: Get current synchronization status
- **Authentication**: Required (Admin only)

---

## Error Responses

### Standard Error Format

All API errors follow this format:

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "code": "ERROR_CODE",
    "isOperational": true
  },
  "message": "Human readable error message",
  "timestamp": "2025-06-23T05:47:03.889Z",
  "requestId": "unique_request_id"
}
```

### Common Error Codes

| Status Code | Error Code            | Description                    |
| ----------- | --------------------- | ------------------------------ |
| 400         | `VALIDATION_ERROR`    | Request validation failed      |
| 401         | `AUTH_ERROR`          | Authentication failed          |
| 403         | `FORBIDDEN`           | Access denied                  |
| 404         | `NOT_FOUND`           | Resource not found             |
| 429         | `RATE_LIMIT_EXCEEDED` | Too many requests              |
| 500         | `INTERNAL_ERROR`      | Internal server error          |
| 502         | `SERVICE_UNAVAILABLE` | Downstream service unavailable |

---

## Security Features

### CORS (Cross-Origin Resource Sharing)

- **Centralized**: Handled at API Gateway level
- **Allowed Origins**: Configurable per environment
- **Credentials**: Supported for authenticated requests

### Security Headers

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Origin-Agent-Cluster: ?1`
- `Referrer-Policy: no-referrer`
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-DNS-Prefetch-Control: off`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 0`

### Rate Limiting

- **Global**: 10,000 requests per 15 minutes per IP
- **Auth Routes**: Additional rate limiting applied
- **Headers**: Rate limit information in response headers

### Request Validation

- **JSON Schema**: Request body validation
- **Sanitization**: Input sanitization for security
- **Size Limits**: Request size limitations

---

## Service Ports

| Service      | Port | Status     |
| ------------ | ---- | ---------- |
| API Gateway  | 3000 | ✅ Running |
| Auth Service | 4001 | ✅ Running |
| User Service | 4002 | ✅ Running |

---

## Development Information

### Environment Variables

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
AUTH_SERVICE_URL=http://localhost:4001
USER_SERVICE_URL=http://localhost:4002
```

### Service Health Monitoring

The API Gateway provides health checks for all connected services and can be monitored via the `/health` endpoint.

### Logging

- **Request Logging**: All requests logged with unique IDs
- **Error Logging**: Comprehensive error logging with stack traces
- **Performance Monitoring**: Response times and metrics tracking

---

## Future Services

This documentation will be updated as new microservices are added to the 50BraIns platform:

- **Content Service** (Coming Soon)
- **Campaign Service** (Coming Soon)
- **Payment Service** (Coming Soon)
- **Notification Service** (Coming Soon)

---

## Support

For API support and questions, please refer to the development team or create an issue in the project repository.

**Last Updated**: June 23, 2025
**API Version**: 1.0.0
**Gateway Version**: 1.0.0
