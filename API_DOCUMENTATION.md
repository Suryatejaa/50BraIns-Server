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

---

## 🔐 Authentication Service (Port 4001)

The Authentication Service handles all user authentication, authorization, and security management.

### **Key Features**
- ✅ User registration with email verification
- ✅ JWT token-based authentication with refresh tokens  
- ✅ Role-based access control (RBAC)
- ✅ Password reset and security management
- ✅ Admin user management
- ✅ Account verification and status management

### **User Roles**
- **USER**: Basic platform access
- **INFLUENCER**: Content creators and influencers
- **BRAND**: Companies and brands
- **CREW**: Behind-the-scenes creative professionals
- **ADMIN**: Platform administrators
- **SUPER_ADMIN**: Full system access

### Key Authentication Endpoints

#### User Registration
- **POST** `/api/auth/register` - Register new user account
#### User Login  
- **POST** `/api/auth/login` - Authenticate and get access tokens
#### Token Management
- **POST** `/api/auth/refresh` - Refresh access token
- **POST** `/api/auth/logout` - Logout and invalidate tokens
#### Password Management
- **POST** `/api/auth/forgot-password` - Request password reset
- **POST** `/api/auth/reset-password` - Reset password with token
#### Profile Management
- **GET** `/api/auth/profile` - Get current user profile
- **POST** `/api/auth/change-password` - Change user password
#### Admin Operations
- **GET** `/api/auth/admin/users` - List all users (Admin only)
- **PUT** `/api/auth/admin/users/:id/status` - Update user status (Admin only)

---

## 👤 User Service (Port 4002)

Handles user discovery, search, analytics, and public profile management.

### **Key Features**
- ✅ Public profile viewing
- ✅ Advanced user search and filtering
- ✅ User analytics and insights
- ✅ Profile performance tracking
- ✅ Data synchronization with auth service

### Key User Endpoints

#### Public Access
- **GET** `/api/public/users/:userId` - Get public user profile
- **GET** `/api/public/influencers/:userId` - Get public influencer profile
- **GET** `/api/public/brands/:userId` - Get public brand profile
#### Search & Discovery
- **GET** `/api/search/users` - Search all user types
- **GET** `/api/search/influencers` - Search influencers with filters
- **GET** `/api/search/brands` - Search brand profiles
#### Analytics
- **GET** `/api/analytics/trending-influencers` - Get trending creators
- **GET** `/api/analytics/popular-brands` - Get popular brands
- **GET** `/api/analytics/profile-views/:userId` - Profile view analytics

---

## 👥 Clan Service (Port 4003)

Manages team formation, collaboration, and community building.

### **Key Features**
- ✅ Clan creation and management
- ✅ Member invitation and management
- ✅ Collaboration workspaces
- ✅ Clan rankings and reputation
- ✅ Project coordination

### Key Clan Endpoints

#### Clan Management
- **POST** `/api/clan/create` - Create new clan
- **GET** `/api/clan/:clanId` - Get clan details
- **PUT** `/api/clan/:clanId` - Update clan information
#### Member Management  
- **POST** `/api/clan/:clanId/invite` - Invite new members
- **GET** `/api/members/:clanId` - Get clan members
- **PUT** `/api/members/:clanId/:userId/role` - Update member role
#### Public Access
- **GET** `/api/clan/public/featured` - Get featured clans
- **GET** `/api/rankings/clans` - Get clan leaderboard

---

## 💼 Gig Service (Port 4004)

Powers the project marketplace for gig creation, applications, and management.

### **Key Features**
- ✅ Gig creation and publishing
- ✅ Application management system
- ✅ Work submission and review
- ✅ Milestone tracking
- ✅ Rating and feedback system

### Key Gig Endpoints

#### Gig Management
- **POST** `/api/gig/create` - Create new gig
- **GET** `/api/gig/:gigId` - Get gig details
- **PUT** `/api/gig/:gigId` - Update gig information
#### Applications
- **POST** `/api/gig/:gigId/apply` - Apply for gig
- **GET** `/api/applications/my` - Get user's applications
- **PUT** `/api/applications/:applicationId/status` - Update application status
#### Work Submission
- **POST** `/api/submissions/:gigId` - Submit work for gig
- **GET** `/api/submissions/:gigId` - Get gig submissions
#### Public Access
- **GET** `/api/gig/public/featured` - Get featured gigs
- **GET** `/api/gig/public/categories` - Get gig categories

---

## 💰 Credit Service (Port 4005)

Manages virtual currency, payments, and boost systems.

### **Key Features**
- ✅ Virtual credit system
- ✅ Payment processing (Razorpay, Stripe)
- ✅ Profile and gig boosting
- ✅ Transaction history
- ✅ Credit packages and pricing

### Key Credit Endpoints

#### Credit Management
- **GET** `/api/credit/balance` - Get user credit balance
- **POST** `/api/credit/purchase` - Purchase credit packages
- **GET** `/api/credit/transactions` - Get transaction history
#### Boost System
- **POST** `/api/credit/boost/profile` - Boost user profile
- **POST** `/api/credit/boost/gig` - Boost gig visibility
- **GET** `/api/credit/boosts/active` - Get active boosts
#### Public Access
- **GET** `/api/credit/public/packages` - Get credit packages
- **GET** `/api/credit/public/boost-pricing` - Get boost pricing

---

## 🏆 Reputation Service (Port 4006)

Handles scoring system, leaderboards, and achievement tracking.

### **Key Features**
- ✅ Multi-dimensional reputation scoring
- ✅ Tier-based progression system
- ✅ Dynamic leaderboards
- ✅ Achievement badges
- ✅ Score history tracking

### Key Reputation Endpoints

#### Reputation Data
- **GET** `/api/reputation/:userId` - Get user reputation score
- **GET** `/api/reputation/:userId/history` - Get score history
- **GET** `/api/reputation/:userId/breakdown` - Get score breakdown
#### Leaderboards
- **GET** `/api/reputation/leaderboard/global` - Global leaderboard
- **GET** `/api/reputation/leaderboard/category/:category` - Category leaderboard
- **GET** `/api/reputation/leaderboard/clan/:clanId` - Clan leaderboard
#### Achievements
- **GET** `/api/reputation/badges/available` - Available achievement badges
- **GET** `/api/reputation/:userId/badges` - User's earned badges

---

## 📋 Work History Service (Port 4007)

Tracks portfolio, achievements, and professional development.

### **Key Features**
- ✅ Portfolio management
- ✅ Achievement tracking
- ✅ Skill assessment
- ✅ Work history analytics
- ✅ Performance summaries

### Key Work History Endpoints

#### Portfolio Management
- **GET** `/api/work-history/:userId/portfolio` - Get user portfolio
- **POST** `/api/work-history/portfolio/add` - Add portfolio item
- **PUT** `/api/work-history/portfolio/:itemId` - Update portfolio item
#### Achievements
- **GET** `/api/achievements/:userId` - Get user achievements
- **GET** `/api/achievements/categories` - Get achievement categories
#### Analytics
- **GET** `/api/summary/:userId` - Get user performance summary
- **GET** `/api/work-history/:userId/analytics` - Get detailed analytics

---

## 📱 Social Media Service (Port 4008)

Integrates with social media platforms for analytics and verification.

### **Key Features**
- ✅ Multi-platform integration (Instagram, YouTube, TikTok, Twitter)
- ✅ Real-time analytics synchronization
- ✅ Account verification
- ✅ Content performance tracking
- ✅ Audience insights

### Key Social Media Endpoints

#### Account Management
- **POST** `/api/social-media/connect` - Connect social media account
- **GET** `/api/social-media/:userId/accounts` - Get connected accounts
- **DELETE** `/api/social-media/disconnect/:accountId` - Disconnect account
#### Analytics
- **GET** `/api/social-media/:userId/analytics` - Get analytics overview
- **GET** `/api/social-media/:userId/insights` - Get audience insights
- **POST** `/api/social-media/sync/:accountId` - Sync account data

---

## 🔔 Notification Service (Port 4009)

Multi-channel communication hub for user engagement.

### **Key Features**
- ✅ Multi-channel delivery (In-app, Email, Push, SMS)
- ✅ Real-time notification system
- ✅ Email template engine
- ✅ User preference management
- ✅ Notification analytics

### Key Notification Endpoints

#### Notification Management
- **GET** `/api/notifications/:userId` - Get user notifications
- **GET** `/api/notifications/unread/:userId` - Get unread notifications
- **PATCH** `/api/notifications/mark-read/:id` - Mark notification as read
- **PATCH** `/api/notifications/mark-all-read/:userId` - Mark all as read
#### Preferences
- **GET** `/api/notifications/preferences/:userId` - Get notification preferences
- **PUT** `/api/notifications/preferences/:userId` - Update preferences
#### Analytics
- **GET** `/api/notifications/analytics/:userId` - Get notification analytics

---

## 🔒 Security Features

### CORS (Cross-Origin Resource Sharing)
- **Centralized**: Handled at API Gateway level
- **Allowed Origins**: `http://localhost:5173, http://localhost:3001, https://app.50brains.com`
- **Credentials**: Supported for authenticated requests

### Security Headers
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: cross-origin`
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`

### Rate Limiting
- **Global**: 10,000 requests per 15 minutes per IP (development)
- **Auth Routes**: 5 requests per 15 minutes for sensitive operations
- **Headers**: Rate limit information in response headers

### Request Validation
- **JSON Schema**: Request body validation
- **Sanitization**: Input sanitization for security
- **Size Limits**: 10MB request size limit

---

## ❌ Error Responses

### Standard Error Format
All API errors follow this format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "timestamp": "2025-07-01T12:00:00.000Z",
  "requestId": "unique_request_id"
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 401 | `AUTH_ERROR` | Authentication failed |
| 403 | `FORBIDDEN` | Access denied |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource conflict |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Internal server error |
| 502 | `SERVICE_UNAVAILABLE` | Downstream service unavailable |

---

## 🚀 Service Status

| Service | Port | Status | Health Check |
|---------|------|--------|--------------|
| **API Gateway** | 3000 | ✅ Running | `GET /health` |
| **Auth Service** | 4001 | ✅ Running | `GET /api/auth/health` |
| **User Service** | 4002 | ✅ Running | `GET /api/user/health` |
| **Clan Service** | 4003 | ✅ Running | `GET /api/clan/health` |
| **Gig Service** | 4004 | ✅ Running | `GET /api/gig/health` |
| **Credit Service** | 4005 | ✅ Running | `GET /api/credit/health` |
| **Reputation Service** | 4006 | ✅ Running | `GET /api/reputation/health` |
| **Work History Service** | 4007 | ✅ Running | `GET /api/work-history/health` |
| **Social Media Service** | 4008 | ✅ Running | `GET /api/social-media/health` |
| **Notification Service** | 4009 | ✅ Running | `GET /api/notifications/health` |

---

## 🛠️ Development Information

### Environment Variables
```env
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:5173,http://localhost:3001
JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
```

### Getting Started
1. **Install Dependencies**: `npm install`
2. **Setup Environment**: Copy `.env.example` to `.env`
3. **Start Services**: `npm run start:all`
4. **Verify Health**: `curl http://localhost:3000/health`

### Documentation
- **Full API Documentation**: [50BRAINS_BACKEND_API_DOCUMENTATION.md](./50BRAINS_BACKEND_API_DOCUMENTATION.md)
- **Platform Overview**: [50BRAINS_PLATFORM_OVERVIEW.md](./50BRAINS_PLATFORM_OVERVIEW.md)

---

**🎉 50BraIns Backend - Production Ready!**  
*Complete Creator Economy Platform Backend with 9 Microservices*
