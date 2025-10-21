# 50BraIns Influencer Marketing Platform - Complete API Documentation

## 🌐 Service Information

- **Auth Service URL**: `http://localhost:4001`
- **User Service URL**: `http://localhost:4002`
- **API Gateway URL**: `http://localhost:3000/api`
- **Primary Services**: Auth Service & User Service (Express.js)
- **Auth Port**: 4001
- **User Port**: 4002
- **Gateway Port**: 3000

---

## 📋 All Available Routes

### 🔐 Authentication Routes (`/auth`)

| Method | Endpoint                | Description                  | Auth Required | Body/Params                                                  |
| ------ | ----------------------- | ---------------------------- | ------------- | ------------------------------------------------------------ |
| `POST` | `/auth/register`        | User registration (Enhanced) | ❌ No         | Enhanced registration with roles-specific fields (see below) |
| `POST` | `/auth/login`           | User login                   | ❌ No         | `{ email, password, rememberMe? }`                           |
| `POST` | `/auth/refresh`         | Refresh JWT tokens           | ❌ No         | Requires refresh token in cookies                            |
| `POST` | `/auth/logout`          | User logout                  | ✅ JWT        | -                                                            |
| `GET`  | `/auth/profile`         | Get current user profile     | ✅ JWT        | -                                                            |
| `POST` | `/auth/change-password` | Change user password         | ✅ JWT        | `{ currentPassword, newPassword }`                           |
| `GET`  | `/auth/health`          | Auth service health check    | ❌ No         | -                                                            |

---

### 👤 User Management Routes (`/users`)

| Method | Endpoint                | Description              | Auth Required | Body/Params                                 |
| ------ | ----------------------- | ------------------------ | ------------- | ------------------------------------------- |
| `GET`  | `/users/profile`        | Get current user profile | ✅ JWT        | -                                           |
| `PUT`  | `/users/profile`        | Update user profile      | ✅ JWT        | roles-specific fields based on account type |
| `GET`  | `/users/public/:userId` | Get public user profile  | ✅ JWT        | `:userId` param                             |

**Note**: User management routes are planned for the upcoming User Service. Current auth service focuses on authentication and basic profile access.

---

### 🛡️ Admin Routes (`/admin`)

_Requires ADMIN, MODERATOR, or SUPER_ADMIN roles_

#### User Management

| Method   | Endpoint                      | Description                   | Auth Required  | Body/Params                                                                |
| -------- | ----------------------------- | ----------------------------- | -------------- | -------------------------------------------------------------------------- | ---------- | --------- | -------------------- | ------------------- | ----- | ------------------------ |
| `GET`    | `/admin/users`                | List all users with filtering | ✅ JWT + roles | Query: `search`, `roles`, `status`, `page`, `limit`, `sortBy`, `sortOrder` |
| `GET`    | `/admin/users/:userId`        | Get specific user details     | ✅ JWT + roles | `:userId` param                                                            |
| `PUT`    | `/admin/users/:userId/roles`  | Update user roles             | ✅ JWT + ADMIN | `{ roles: "USER                                                            | INFLUENCER | BRAND     | CREW                 | MODERATOR           | ADMIN | SUPER_ADMIN", reason? }` |
| `PUT`    | `/admin/users/:userId/status` | Update user status            | ✅ JWT + roles | `{ status: "ACTIVE                                                         | INACTIVE   | SUSPENDED | PENDING_VERIFICATION | BANNED", reason? }` |
| `POST`   | `/admin/users/:userId/ban`    | Ban user                      | ✅ JWT + roles | `{ reason, duration? }`                                                    |
| `POST`   | `/admin/users/:userId/unban`  | Unban user                    | ✅ JWT + roles | `{ reason }`                                                               |
| `DELETE` | `/admin/users/:userId`        | Delete user                   | ✅ JWT + ADMIN | `:userId` param                                                            |

#### System Monitoring

| Method | Endpoint               | Description              | Auth Required  | Body/Params                                   |
| ------ | ---------------------- | ------------------------ | -------------- | --------------------------------------------- |
| `GET`  | `/admin/stats`         | Get system statistics    | ✅ JWT + roles | Query: `timeRange`, `startDate`, `endDate`    |
| `GET`  | `/admin/activity-logs` | Get admin activity logs  | ✅ JWT + roles | Query: `limit`, `offset`, `adminId`, `action` |
| `GET`  | `/admin/health`        | Get system health status | ✅ JWT + roles | -                                             |

**Note**: Admin routes are planned for the upcoming Admin Service. Current auth service provides basic user authentication and roles management.

---

### 🔍 User Service Routes (`/search`, `/public`, `/analytics`, `/sync`)

**Service**: User Service (Port 4002) - Read-only operations for user discovery, search, and analytics

#### Public Profile Routes (No Authentication)

| Method | Endpoint                      | Description                    | Auth Required | Body/Params     |
| ------ | ----------------------------- | ------------------------------ | ------------- | --------------- |
| `GET`  | `/public/users/:userId`       | Get public user profile        | ❌ No         | `:userId` param |
| `GET`  | `/public/influencers/:userId` | Get public influencer profile  | ❌ No         | `:userId` param |
| `GET`  | `/public/brands/:userId`      | Get public brand profile       | ❌ No         | `:userId` param |
| `GET`  | `/public/crew/:userId`        | Get public crew member profile | ❌ No         | `:userId` param |

#### Search & Discovery Routes (Authentication Required)

| Method | Endpoint              | Description                  | Auth Required | Body/Params                                                    |
| ------ | --------------------- | ---------------------------- | ------------- | -------------------------------------------------------------- |
| `GET`  | `/search/users`       | Search across all user types | ✅ JWT        | Query: `q`, `roles`, `location`, `page`, `limit`               |
| `GET`  | `/search/influencers` | Search for influencers       | ✅ JWT        | Query: `q`, `niche`, `platform`, `minFollowers`, `location`    |
| `GET`  | `/search/brands`      | Search for brands            | ✅ JWT        | Query: `q`, `industry`, `budget`, `location`                   |
| `GET`  | `/search/crew`        | Search for crew members      | ✅ JWT        | Query: `q`, `skills`, `experience`, `location`, `availability` |

#### Analytics Routes (Mixed Authentication)

| Method | Endpoint                           | Description                | Auth Required | Body/Params                    |
| ------ | ---------------------------------- | -------------------------- | ------------- | ------------------------------ |
| `GET`  | `/analytics/trending-influencers`  | Get trending influencers   | ❌ No         | Query: `limit`, `timeRange`    |
| `GET`  | `/analytics/popular-brands`        | Get popular brands         | ❌ No         | Query: `limit`, `timeRange`    |
| `GET`  | `/analytics/search-trends`         | Get platform search trends | ❌ No         | Query: `timeRange`, `category` |
| `GET`  | `/analytics/profile-views/:userId` | Get profile view analytics | ✅ JWT        | `:userId` param                |
| `GET`  | `/analytics/user-insights/:userId` | Get detailed user insights | ✅ JWT        | `:userId` param                |

#### Data Synchronization Routes (Admin Only)

| Method | Endpoint                  | Description                         | Auth Required  | Body/Params        |
| ------ | ------------------------- | ----------------------------------- | -------------- | ------------------ |
| `POST` | `/sync/user-updated`      | Webhook for user updates from auth  | 🔧 Service     | User update data   |
| `POST` | `/sync/user-created`      | Webhook for user creation from auth | 🔧 Service     | User creation data |
| `POST` | `/sync/user-deleted`      | Webhook for user deletion from auth | 🔧 Service     | User deletion data |
| `POST` | `/sync/sync-all-users`    | Manual sync all users               | ✅ JWT + ADMIN | -                  |
| `POST` | `/sync/sync-user/:userId` | Manual sync single user             | ✅ JWT + ADMIN | `:userId` param    |
| `GET`  | `/sync/sync-status`       | Get synchronization status          | ✅ JWT + ADMIN | -                  |

---

## 🔄 API Gateway Routes (`http://localhost:3000/api`)

All routes are also available through the API Gateway with automatic proxy:

| Pattern            | Proxied To                          | Description                    |
| ------------------ | ----------------------------------- | ------------------------------ |
| `/api/auth/*`      | `http://localhost:4001/auth/*`      | Authentication routes          |
| `/api/users/*`     | `http://localhost:4001/users/*`     | User management routes         |
| `/api/admin/*`     | `http://localhost:4001/admin/*`     | Admin routes                   |
| `/api/search/*`    | `http://localhost:4002/search/*`    | User search & discovery routes |
| `/api/public/*`    | `http://localhost:4002/public/*`    | Public profile routes          |
| `/api/analytics/*` | `http://localhost:4002/analytics/*` | Analytics & insights routes    |
| `/api/sync/*`      | `http://localhost:4002/sync/*`      | Data synchronization routes    |

---

## 🏗️ Microservices Architecture

### Service Responsibilities

#### Auth Service (Port 4001)

- **Primary roles**: User authentication, authorization, and account management
- **Database Access**: Read/Write operations on user data
- **Key Features**:
  - User registration and login
  - JWT token management
  - Password management
  - roles-based access control
  - Profile management (CRUD operations)
  - Admin user management

#### User Service (Port 4002)

- **Primary roles**: User discovery, search, analytics, and public profiles
- **Database Access**: Read-only operations on shared user data
- **Key Features**:
  - High-performance user search
  - Public profile serving
  - User discovery and filtering
  - Analytics and insights
  - Trending users and content
  - Data synchronization with auth service

### Database Architecture

- **Shared Database**: Both services use the same PostgreSQL database (`brains_auth`)
- **Single Source of Truth**: User data exists only once, managed by auth-service
- **No Data Duplication**: User-service reads from the same tables
- **Optimized Performance**: User-service optimized for read operations and search

### Service Communication

- **API Gateway**: Centralized routing and load balancing
- **Webhooks**: Auth-service notifies user-service of data changes
- **Shared Database**: Real-time data consistency
- **JWT Validation**: Shared authentication mechanism

---

## 🔑 Authentication & Authorization

### JWT Authentication

- **Access Token**: 15 minutes expiry, stored in httpOnly cookie
- **Refresh Token**: 7 days expiry, stored in httpOnly cookie
- **Header**: `Authorization: Bearer <token>` (for direct service calls)
- **Cookies**: Automatic for browser-based requests

### roles-Based Access

- **USER**: Basic user access to own profile and discovery features
- **INFLUENCER**: User access + content creator features and campaign participation
- **BRAND**: User access + campaign creation and management features
- **CREW**: User access + service offerings and collaboration features
- **MODERATOR**: Admin access to user management (except delete) and content moderation
- **ADMIN**: Full admin access including user deletion and system management
- **SUPER_ADMIN**: Complete system access with all administrative privileges

---

## 🎯 Enhanced Registration System

### Account Types Supported

| roles         | Description                                   | Target Users                        | Admin Access |
| ------------- | --------------------------------------------- | ----------------------------------- | ------------ |
| `USER`        | Basic platform user                           | General users, consumers            | ❌ No        |
| `INFLUENCER`  | Content creators & social media personalities | Bloggers, YouTubers, Instagrammers  | ❌ No        |
| `BRAND`       | Companies looking for marketing campaigns     | Businesses, startups, agencies      | ❌ No        |
| `CREW`        | Creative professionals (behind camera)        | Editors, photographers, designers   | ❌ No        |
| `MODERATOR`   | Community moderators                          | Trusted users with admin privileges | ✅ Limited   |
| `ADMIN`       | Platform administrators                       | System administrators               | ✅ Full      |
| `SUPER_ADMIN` | System super administrators                   | Root level administrators           | ✅ Complete  |

### Registration Body Structure

#### Basic Fields (Required for All)

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "roles": "USER|INFLUENCER|BRAND|CREW|MODERATOR|ADMIN|SUPER_ADMIN"
}
```

#### Optional Common Fields

```json
{
  "phone": "9876543210",
  "location": "Mumbai, India",
  "bio": "Brief description about yourself",
  "website": "https://example.com",
  "instagramHandle": "username",
  "youtubeHandle": "channelname",
  "twitterHandle": "handle",
  "linkedinHandle": "profile"
}
```

#### INFLUENCER roles Fields

```json
{
  "roles": "INFLUENCER",
  "contentCategories": ["fashion", "lifestyle", "travel", "food"],
  "primaryNiche": "fashion",
  "primaryPlatform": "instagram",
  "instagramHandle": "alexcreator",
  "bio": "Fashion and lifestyle content creator"
}
```

**Available Platform Options**: `instagram`, `youtube`, `twitter`, `linkedin`

#### BRAND roles Fields

```json
{
  "roles": "BRAND",
  "companyName": "Brand Company Ltd",
  "companyType": "startup",
  "industry": "E-commerce",
  "gstNumber": "29ABCDE1234F1Z5",
  "companyWebsite": "https://brandcompany.com",
  "marketingBudget": "2lakh-10lakh",
  "targetAudience": ["millennials", "fashion-conscious", "urban"],
  "campaignTypes": ["product-launch", "brand-awareness"],
  "designationTitle": "Marketing Manager"
}
```

**Company Type Options**: `startup`, `sme`, `enterprise`, `agency`  
**Marketing Budget Options**: `under-50k`, `50k-2lakh`, `2lakh-10lakh`, `10lakh+`

#### CREW roles Fields

```json
{
  "roles": "CREW",
  "crewSkills": [
    "video editing",
    "motion graphics",
    "color grading",
    "sound design"
  ],
  "experienceLevel": "advanced",
  "equipmentOwned": [
    "Professional Camera",
    "DJI Drone",
    "Audio Equipment",
    "Lighting Kit"
  ],
  "portfolioUrl": "https://alexrodriguez.portfolio.com",
  "hourlyRate": 2500,
  "availability": "freelance",
  "workStyle": "hybrid",
  "specializations": ["music videos", "commercial ads", "social media content"]
}
```

**Experience Level Options**: `beginner`, `intermediate`, `advanced`, `expert`  
**Availability Options**: `full-time`, `part-time`, `freelance`, `project-based`  
**Work Style Options**: `remote`, `on-location`, `hybrid`

---

## ⚠️ Validation Rules & Error Handling

### Password Requirements

- **Minimum Length**: 8 characters
- **Must Include**:
  - At least one uppercase letter (A-Z)
  - At least one lowercase letter (a-z)
  - At least one number (0-9)
  - At least one special character (@$!%\*?&)

### Phone Number Format

- **Pattern**: Indian mobile numbers starting with 6-9
- **Format**: 10 digits (e.g., `9876543210`)

### GST Number Format (Brand Registration)

- **Pattern**: Valid Indian GST format
- **Example**: `29ABCDE1234F1Z5`

### Email Validation

- **Format**: Standard email format validation
- **Uniqueness**: Email must be unique across the platform

### Common Error Responses

#### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Request validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    }
  ]
}
```

#### 409 Conflict - Duplicate Email

```json
{
  "success": false,
  "error": "Conflict",
  "message": "Email already exists"
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid credentials"
}
```

#### 403 Forbidden - Insufficient roles

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Insufficient permissions for this action"
}
```

---

## 📝 Request/Response Examples

### Enhanced Registration Examples

#### INFLUENCER Registration

````bash
POST /auth/register
{
  "email": "alex.creator@example.com",
  "password": "TestPass123!",
  "firstName": "Alex",
  "lastName": "Creator",
  "phone": "9876543210",
  "location": "Mumbai, India",
  "roles": "INFLUENCER",
  "instagramHandle": "alexcreator",
  "contentCategories": ["fashion", "lifestyle", "travel"],
  "primaryNiche": "fashion",
  "primaryPlatform": "instagram",
  "bio": "Fashion and lifestyle content creator"
}
```#### BRAND Registration
```bash
POST /auth/register
{
  "email": "sarah@brandcompany.com",
  "password": "BrandPass123!",
  "firstName": "Sarah",
  "lastName": "Marketing",
  "phone": "9123456789",
  "location": "Delhi, India",
  "roles": "BRAND",
  "companyName": "Brand Company Ltd",
  "companyType": "startup",
  "industry": "E-commerce",
  "marketingBudget": "2lakh-10lakh",
  "targetAudience": ["millennials", "fashion-conscious", "urban"],
  "campaignTypes": ["product-launch", "brand-awareness"],
  "designationTitle": "Marketing Manager",
  "companyWebsite": "https://brandcompany.com"
}
````

#### CREW Registration

```bash
POST /auth/register
{
  "email": "alex.videoeditor@example.com",
  "password": "CrewPass123!",
  "firstName": "Alex",
  "lastName": "Rodriguez",
  "phone": "9567890123",
  "location": "Goa, India",
  "roles": "CREW",
  "bio": "Professional video editor and motion graphics designer with 5+ years experience",
  "instagramHandle": "alex_edits",
  "youtubeHandle": "AlexEditingTutorials",
  "crewSkills": ["video editing", "motion graphics", "color grading", "sound design"],
  "experienceLevel": "advanced",
  "equipmentOwned": ["Professional Camera", "DJI Drone", "Audio Equipment", "Lighting Kit"],
  "portfolioUrl": "https://alexrodriguez.portfolio.com",
  "hourlyRate": 2500,
  "availability": "freelance",
  "workStyle": "hybrid",
  "specializations": ["music videos", "commercial ads", "social media content"]
}
```

### Authentication

```bash
# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "rememberMe": true
}

# Response
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": "INFLUENCER",
      "status": "ACTIVE"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### User Management (Admin)

```bash
# Get all users (Admin)
GET /admin/users?search=john&roles=INFLUENCER&limit=10&page=1

# Update user roles (Admin)
PUT /admin/users/user123/roles
{
  "roles": "MODERATOR",
  "reason": "Promoted for community management"
}

# Ban user (Admin)
POST /admin/users/user123/ban
{
  "reason": "Community guidelines violation",
  "duration": "7d"
}
```

### System Stats

```bash
# Get system statistics
GET /admin/stats?timeRange=7d

Response:
{
  "users": {
    "total": 150,
    "active": 120,
    "inactive": 30,
    "verified": 100,
    "newInPeriod": 15
  },
  "sessions": {
    "activeSessions": 85
  },
  "roles": {
    "USER": 20,
    "INFLUENCER": 80,
    "BRAND": 25,
    "CREW": 40,
    "MODERATOR": 3,
    "ADMIN": 2
  },
  "accountTypes": {
    "totalInfluencers": 80,
    "totalBrands": 25,
    "totalCrew": 40,
    "verifiedAccounts": 85
  }
}
```

---

## 🚀 Testing Routes

### Health Check

```powershell
# PowerShell - Check Auth Service Health
Invoke-RestMethod -Uri "http://localhost:4001/health" -Method GET

# PowerShell - Check API Gateway Health
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET

# Response: 200 OK
{
  "status": "ok",
  "timestamp": "2025-06-23T12:00:00.000Z",
  "service": "auth-service",
  "version": "1.0.0"
}
```

### Test Registration (PowerShell)

```powershell
# Test INFLUENCER Registration
$body = @{
    email = "test.influencer@example.com"
    password = "TestPass123!"
    firstName = "Test"
    lastName = "Influencer"
    roles = "INFLUENCER"
    phone = "9876543210"
    location = "Mumbai, India"
    contentCategories = @("fashion", "lifestyle")
    primaryNiche = "fashion"
    primaryPlatform = "instagram"
    instagramHandle = "testinfluencer"
    bio = "Test influencer account"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
```

```powershell
# Test Login
$loginBody = @{
    email = "test.influencer@example.com"
    password = "TestPass123!"
    rememberMe = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
```

### Test User Service (PowerShell)

```powershell
# Test Public Profile (No Auth Required)
Invoke-RestMethod -Uri "http://localhost:3000/api/public/users/user123" -Method GET

# Test Search Influencers (Requires Auth)
$headers = @{
    "Authorization" = "Bearer $accessToken"
}
Invoke-RestMethod -Uri "http://localhost:3000/api/search/influencers?q=fashion&location=Mumbai" -Method GET -Headers $headers

# Test Analytics - Trending Influencers (No Auth Required)
Invoke-RestMethod -Uri "http://localhost:3000/api/analytics/trending-influencers?limit=5" -Method GET
```

### Service URLs

#### Auth Service

- **Service URL**: `http://localhost:4001`
- **All routes**: Available directly on port 4001

#### User Service

- **Service URL**: `http://localhost:4002`
- **All routes**: Available directly on port 4002

### API Gateway Access

- **Gateway URL**: `http://localhost:3000/api`
- **Proxied routes**: All routes available with `/api` prefix

---

**Total Routes**: 44 endpoints across 6 main modules (Auth, Users, Admin, Health, Search, Public, Analytics, Sync)

---

## 🚧 Upcoming Features

### Planned Services & Routes

#### User Service (✅ Implemented)

- **Search & Discovery**: Advanced user search with filters for roles, skills, location, and more
- **Public Profiles**: Non-authenticated access to public user information
- **Analytics & Insights**: Platform trends, user insights, and performance metrics
- **Data Synchronization**: Real-time sync with auth-service for data consistency

#### Campaign Service (Planned)

- **Campaign Creation**: Brand campaign creation and management
- **Application System**: Influencer applications and selection process
- **Performance Tracking**: Campaign analytics and reporting

#### Payment Service (Planned)

- **Payment Integration**: Secure payment processing for campaigns
- **Wallet System**: User wallets and transaction management
- **Invoice Generation**: Automated billing and invoicing

#### Notification Service (Planned)

- **Real-time Notifications**: WebSocket-based notifications
- **Email Templates**: Automated email campaigns and alerts
- **Push Notifications**: Mobile app push notification support

---

🔐 **50BraIns Influencer Marketing Platform - Complete API Documentation**
