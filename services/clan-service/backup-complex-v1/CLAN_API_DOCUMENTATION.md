# Clan Service API Documentation

## Overview
The Clan Service provides comprehensive clan management functionality including creation, member management, rankings, and analytics.

## Base URL
```
http://localhost:4003
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Clan Management

### Get All Clans
**GET** `/api/clan`

Get all clans with filtering, sorting, and pagination.

**Query Parameters:**
- `category` (string, optional): Filter by category
- `location` (string, optional): Filter by location
- `visibility` (string, optional): Filter by visibility (PUBLIC, PRIVATE, INVITE_ONLY)
- `isVerified` (boolean, optional): Filter by verification status
- `minMembers` (number, optional): Minimum member count
- `maxMembers` (number, optional): Maximum member count
- `sortBy` (string, optional): Sort by field (score, name, createdAt, reputationScore, totalGigs, averageRating)
- `order` (string, optional): Sort order (asc, desc)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "clans": [
      {
        "id": "clan_id",
        "name": "Clan Name",
        "slug": "clan-slug",
        "description": "Clan description",
        "tagline": "Clan tagline",
        "visibility": "PUBLIC",
        "isVerified": true,
        "clanHeadId": "user_id",
        "email": "clan@example.com",
        "website": "https://clan.com",
        "instagramHandle": "clan_handle",
        "twitterHandle": "clan_handle",
        "linkedinHandle": "clan-handle",
        "requiresApproval": true,
        "isPaidMembership": false,
        "membershipFee": null,
        "maxMembers": 50,
        "primaryCategory": "Technology",
        "categories": ["Technology", "Design"],
        "skills": ["JavaScript", "React"],
        "location": "New York",
        "timezone": "America/New_York",
        "totalGigs": 25,
        "completedGigs": 20,
        "totalRevenue": 50000,
        "averageRating": 4.5,
        "reputationScore": 850,
        "portfolioImages": ["image1.jpg", "image2.jpg"],
        "portfolioVideos": ["video1.mp4"],
        "showcaseProjects": ["project1", "project2"],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "_count": {
          "members": 15,
          "portfolio": 8,
          "reviews": 12
        },
        "members": [...],
        "portfolio": [...],
        "reviews": [...],
        "analytics": {...}
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### Get Clan Feed
**GET** `/api/clans/feed`

Get enhanced clan feed with reputation integration and advanced filtering.

**Query Parameters:** Same as Get All Clans

**Response:** Same structure as Get All Clans with enhanced scoring

### Get Single Clan
**GET** `/api/clan/:clanId`

Get detailed information about a specific clan.

**Path Parameters:**
- `clanId` (string, required): Clan ID

**Response:**
```json
{
  "success": true,
  "data": {
    "clan": {
      // Same structure as above with full details
    }
  }
}
```

### Create Clan
**POST** `/api/clan`

Create a new clan.

**Request Body:**
```json
{
  "name": "Clan Name",
  "slug": "clan-slug",
  "description": "Clan description",
  "tagline": "Clan tagline",
  "visibility": "PUBLIC",
  "email": "clan@example.com",
  "website": "https://clan.com",
  "instagramHandle": "clan_handle",
  "twitterHandle": "clan_handle",
  "linkedinHandle": "clan-handle",
  "requiresApproval": true,
  "isPaidMembership": false,
  "membershipFee": null,
  "maxMembers": 50,
  "primaryCategory": "Technology",
  "categories": ["Technology", "Design"],
  "skills": ["JavaScript", "React"],
  "location": "New York",
  "timezone": "America/New_York"
}
```

**Validation Rules:**
- `name`: 2-50 characters, required
- `slug`: 2-30 characters, lowercase letters, numbers, hyphens only, required, unique
- `description`: max 500 characters, optional
- `tagline`: max 100 characters, optional
- `visibility`: PUBLIC, PRIVATE, or INVITE_ONLY, default: PUBLIC
- `email`: valid email format, optional
- `website`: valid URL format, optional
- `instagramHandle`: letters, numbers, dots, underscores, max 30 chars, optional
- `twitterHandle`: letters, numbers, underscores, max 15 chars, optional
- `linkedinHandle`: letters, numbers, hyphens, max 100 chars, optional
- `membershipFee`: 0-10000, required if isPaidMembership is true
- `maxMembers`: 1-1000, default: 50
- `categories`: max 10 items, each max 50 chars
- `skills`: max 20 items, each max 50 chars

**Response:**
```json
{
  "success": true,
  "data": {
    "clan": {
      // Created clan object
    }
  }
}
```

### Update Clan
**PUT** `/api/clan/:clanId`

Update an existing clan.

**Path Parameters:**
- `clanId` (string, required): Clan ID

**Request Body:** Same as Create Clan (all fields optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "clan": {
      // Updated clan object
    }
  }
}
```

### Delete Clan
**DELETE** `/api/clan/:clanId`

Delete a clan (only clan head can delete).

**Path Parameters:**
- `clanId` (string, required): Clan ID

**Response:**
```json
{
  "success": true,
  "message": "Clan deleted successfully"
}
```

---

## Member Management

### Get Clan Members
**GET** `/api/members/:clanId`

Get all members of a clan.

**Path Parameters:**
- `clanId` (string, required): Clan ID

**Response:**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "member_id",
        "userId": "user_id",
        "clanId": "clan_id",
        "role": "MEMBER",
        "customRole": "Developer",
        "permissions": ["INVITE_MEMBERS", "EDIT_CLAN_INFO"],
        "status": "ACTIVE",
        "isCore": true,
        "gigsParticipated": 5,
        "revenueGenerated": 10000,
        "contributionScore": 750,
        "joinedAt": "2024-01-01T00:00:00Z",
        "lastActiveAt": "2024-01-01T00:00:00Z",
        "user": {
          "id": "user_id",
          "name": "User Name",
          "email": "user@example.com",
          "avatar": "avatar.jpg"
        }
      }
    ]
  }
}
```

### Invite Member
**POST** `/api/members/invite`

Invite a user to join the clan.

**Request Body:**
```json
{
  "clanId": "clan_id",
  "invitedUserId": "user_id",
  "invitedEmail": "user@example.com",
  "role": "MEMBER",
  "customRole": "Developer",
  "message": "Join our amazing clan!"
}
```

**Validation Rules:**
- `clanId`: required
- `invitedUserId` OR `invitedEmail`: at least one required
- `role`: HEAD, CO_HEAD, ADMIN, SENIOR_MEMBER, MEMBER, or TRAINEE, default: MEMBER
- `customRole`: max 50 characters, optional
- `message`: max 500 characters, optional

**Response:**
```json
{
  "success": true,
  "data": {
    "invitation": {
      "id": "invitation_id",
      "clanId": "clan_id",
      "invitedUserId": "user_id",
      "invitedByUserId": "inviter_id",
      "invitedEmail": "user@example.com",
      "role": "MEMBER",
      "customRole": "Developer",
      "message": "Join our amazing clan!",
      "status": "PENDING",
      "expiresAt": "2024-02-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### Accept Invitation
**POST** `/api/members/invitations/:invitationId/accept`

Accept a clan invitation.

**Path Parameters:**
- `invitationId` (string, required): Invitation ID

**Response:**
```json
{
  "success": true,
  "data": {
    "member": {
      // New member object
    }
  }
}
```

### Remove Member
**DELETE** `/api/members/:clanId/members/:userId`

Remove a member from the clan.

**Path Parameters:**
- `clanId` (string, required): Clan ID
- `userId` (string, required): User ID

**Response:**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

### Update Member Role
**PUT** `/api/members/:clanId/members/:userId/role`

Update a member's role.

**Path Parameters:**
- `clanId` (string, required): Clan ID
- `userId` (string, required): User ID

**Request Body:**
```json
{
  "role": "ADMIN",
  "customRole": "Senior Developer"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "member": {
      // Updated member object
    }
  }
}
```

### Leave Clan
**POST** `/api/members/:clanId/leave`

Leave a clan.

**Path Parameters:**
- `clanId` (string, required): Clan ID

**Response:**
```json
{
  "success": true,
  "message": "Successfully left the clan"
}
```

---

## Rankings & Analytics

### Get Clan Rankings
**GET** `/api/rankings`

Get clan rankings with various metrics.

**Query Parameters:**
- `category` (string, optional): Filter by category
- `location` (string, optional): Filter by location
- `sortBy` (string, optional): Sort by (score, reputation, revenue, members)
- `limit` (number, optional): Number of results (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "rankings": [
      {
        "rank": 1,
        "clanId": "clan_id",
        "name": "Clan Name",
        "score": 950,
        "reputationScore": 850,
        "totalRevenue": 50000,
        "memberCount": 15,
        "averageRating": 4.5
      }
    ]
  }
}
```

### Get Clan Analytics
**GET** `/api/analytics/:clanId`

Get detailed analytics for a clan.

**Path Parameters:**
- `clanId` (string, required): Clan ID

**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "profileViews": 1250,
      "searchAppearances": 450,
      "contactClicks": 89,
      "gigApplications": 25,
      "gigWinRate": 0.8,
      "averageProjectValue": 2000,
      "clientRetentionRate": 0.85,
      "memberGrowthRate": 0.12,
      "memberRetentionRate": 0.95,
      "teamProductivity": 0.88,
      "marketRanking": 5,
      "categoryRanking": 2,
      "localRanking": 1,
      "socialEngagement": 0.75,
      "referralCount": 8
    }
  }
}
```

---

## Public Endpoints

### Get Public Clan Info
**GET** `/api/clan/public`

Get public clan information (no authentication required).

**Query Parameters:** Same as Get All Clans

**Response:** Same as Get All Clans

### Get Featured Clans
**GET** `/api/clan/public/featured`

Get featured clans for public display.

**Response:** Same as Get All Clans

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [
    {
      "field": "field_name",
      "message": "Field-specific error message",
      "type": "error_type"
    }
  ],
  "timestamp": "2024-01-01T00:00:00Z",
  "requestId": "request_id"
}
```

### Common Error Codes:
- `CLAN_NOT_FOUND`: Clan not found
- `CLAN_ALREADY_EXISTS`: Clan with slug already exists
- `CLAN_PERMISSION_DENIED`: Insufficient permissions
- `CLAN_MEMBER_NOT_FOUND`: User is not a member
- `CLAN_MEMBER_ALREADY_EXISTS`: User is already a member
- `CLAN_INVITATION_NOT_FOUND`: Invitation not found
- `CLAN_INVITATION_EXPIRED`: Invitation has expired
- `CLAN_MEMBER_LIMIT_REACHED`: Clan has reached member limit
- `VALIDATION_ERROR`: Input validation failed
- `INTERNAL_SERVER_ERROR`: Unexpected server error

---

## Rate Limiting

- **Public endpoints**: 100 requests per minute
- **Authenticated endpoints**: 1000 requests per minute
- **Admin endpoints**: 500 requests per minute

---

## Health Check

### Get Service Health
**GET** `/api/clan/health`

Check the health status of the clan service.

**Response:**
```json
{
  "status": "healthy",
  "service": "clan-service",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime": 3600,
  "dependencies": {
    "database": "connected",
    "rabbitmq": "connected"
  }
}
``` 