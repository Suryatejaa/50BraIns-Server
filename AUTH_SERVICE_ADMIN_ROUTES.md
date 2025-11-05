# Auth Service - Admin Routes Documentation

## Overview
The Auth Service now includes comprehensive admin routes for user management, analytics, and system monitoring. These routes provide administrators with full control over user accounts, ban/unban functionality, and detailed analytics tracking.

## Authentication & Authorization

### Admin Roles
- **ADMIN**: Basic admin privileges (can view, ban/unban users, access analytics)
- **MODERATOR**: Same privileges as ADMIN 
- **SUPER_ADMIN**: Full admin privileges (can assign roles, delete users)

### Route Protection
- All admin routes require authentication (`authenticate` middleware)
- Most admin routes require `requireAdmin` (ADMIN, MODERATOR, or SUPER_ADMIN roles)
- Sensitive operations require `requireSuperAdmin` (SUPER_ADMIN role only)

## Admin Routes

### User Management

#### GET `/admin/users`
**Description:** Get paginated list of all users with filtering and search
**Authorization:** Admin required
**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page
- `status` (string) - Filter by user status (ACTIVE, BANNED, etc.)
- `role` (string) - Filter by user role
- `search` (string) - Search in email, username, firstName, lastName
- `sortBy` (string, default: 'createdAt') - Sort field
- `sortOrder` (string, default: 'desc') - Sort direction
- `verified` (boolean) - Filter by email verification status
- `banned` (boolean) - Filter by ban status

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-id",
        "email": "user@example.com",
        "username": "username",
        "firstName": "John",
        "lastName": "Doe",
        "roles": ["USER"],
        "status": "ACTIVE",
        "emailVerified": true,
        "isActive": true,
        "isBanned": false,
        "banReason": null,
        "bannedAt": null,
        "createdAt": "2024-01-01T00:00:00Z",
        "lastLoginAt": "2024-01-01T12:00:00Z",
        "lastActiveAt": "2024-01-01T12:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### GET `/admin/users/:userId`
**Description:** Get detailed information about a specific user
**Authorization:** Admin required
**Parameters:**
- `userId` (string) - User ID to fetch

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "username": "username",
      // ... all user fields
      "refreshTokens": [
        {
          "id": "token-id",
          "createdAt": "2024-01-01T00:00:00Z",
          "lastUsedAt": "2024-01-01T12:00:00Z",
          "ipAddress": "192.168.1.1",
          "userAgent": "Mozilla/5.0..."
        }
      ],
      "adminLogs": [
        {
          "id": "log-id",
          "action": "BAN_USER",
          "reason": "Spam",
          "createdAt": "2024-01-01T12:00:00Z",
          "admin": {
            "id": "admin-id",
            "username": "admin",
            "email": "admin@example.com"
          }
        }
      ]
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### PUT `/admin/users/:userId/ban`
**Description:** Ban a user account
**Authorization:** Admin required
**Parameters:**
- `userId` (string) - User ID to ban

**Request Body:**
```json
{
  "reason": "Violation of terms of service",
  "duration": 24  // Optional: ban duration in hours, null for permanent
}
```

**Response:**
```json
{
  "success": true,
  "message": "User banned successfully",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "username": "username",
      "isBanned": true,
      "banReason": "Violation of terms of service",
      "bannedAt": "2024-01-01T12:00:00Z",
      "banExpiresAt": "2024-01-02T12:00:00Z"
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### PUT `/admin/users/:userId/unban`
**Description:** Unban a user account
**Authorization:** Admin required
**Parameters:**
- `userId` (string) - User ID to unban

**Request Body:**
```json
{
  "reason": "Ban appeal approved"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User unbanned successfully",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "username": "username",
      "isBanned": false,
      "status": "ACTIVE"
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### PUT `/admin/users/:userId/status`
**Description:** Update user status
**Authorization:** Admin required
**Parameters:**
- `userId` (string) - User ID to update

**Request Body:**
```json
{
  "status": "SUSPENDED",  // ACTIVE, INACTIVE, SUSPENDED, BANNED, PENDING_VERIFICATION
  "reason": "Account review"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User status updated successfully",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "username": "username",
      "status": "SUSPENDED"
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### PUT `/admin/users/:userId/roles`
**Description:** Update user roles
**Authorization:** Super Admin required
**Parameters:**
- `userId` (string) - User ID to update

**Request Body:**
```json
{
  "roles": ["USER", "INFLUENCER"],
  "reason": "Role upgrade"  // Optional
}
```

**Valid Roles:** USER, INFLUENCER, BRAND, CREW, MODERATOR, ADMIN, SUPER_ADMIN

**Response:**
```json
{
  "success": true,
  "message": "User roles updated successfully",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "username": "username",
      "roles": ["USER", "INFLUENCER"]
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### DELETE `/admin/users/:userId`
**Description:** Permanently delete a user account
**Authorization:** Super Admin required
**Parameters:**
- `userId` (string) - User ID to delete

**Request Body:**
```json
{
  "reason": "Account deletion request",
  "confirmDelete": true  // Required confirmation
}
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Analytics

#### GET `/admin/analytics/users`
**Description:** Get comprehensive user analytics
**Authorization:** Admin required
**Query Parameters:**
- `period` (string, default: '30d') - Analytics period: 7d, 30d, 90d, 1y

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 1000,
      "activeUsers": 750,
      "newUsers": 50,
      "verifiedUsers": 800,
      "bannedUsers": 10,
      "verificationRate": "80.00",
      "activityRate": "75.00"
    },
    "roleDistribution": {
      "USER": 800,
      "INFLUENCER": 150,
      "BRAND": 40,
      "CREW": 8,
      "ADMIN": 2
    },
    "statusDistribution": {
      "ACTIVE": 900,
      "PENDING_VERIFICATION": 80,
      "BANNED": 10,
      "SUSPENDED": 5,
      "INACTIVE": 5
    },
    "registrationTrend": [
      {
        "date": "2024-01-01",
        "count": 15
      }
    ],
    "period": "30d"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### GET `/admin/logs`
**Description:** Get admin action logs
**Authorization:** Admin required
**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page
- `action` (string) - Filter by action type
- `adminId` (string) - Filter by admin user ID
- `targetId` (string) - Filter by target user ID
- `startDate` (string) - Filter from date (ISO format)
- `endDate` (string) - Filter to date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-id",
        "action": "BAN_USER",
        "details": {
          "reason": "Spam",
          "duration": null,
          "banExpiresAt": null
        },
        "reason": "Spam",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2024-01-01T12:00:00Z",
        "admin": {
          "id": "admin-id",
          "username": "admin",
          "email": "admin@example.com"
        },
        "target": {
          "id": "user-id",
          "username": "user",
          "email": "user@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### System

#### GET `/admin/system/stats`
**Description:** Get system statistics and health metrics
**Authorization:** Admin required

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1000,
      "active24h": 150,
      "verified": 800,
      "banned": 10,
      "verificationRate": "80.00"
    },
    "tokens": {
      "activeRefreshTokens": 300
    },
    "activity": {
      "adminActions24h": 25
    },
    "uptime": 3600.5,
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Security Features

### Admin Action Logging
All admin actions are automatically logged to the `AdminLog` table with:
- Admin user ID and details
- Target user ID (if applicable)
- Action type and details
- Reason for action
- IP address and user agent
- Timestamp

### Permission Checks
- Admins cannot ban/modify other admin users (unless super admin)
- Only super admins can assign ADMIN or SUPER_ADMIN roles
- Only super admins can delete users
- All actions require proper role verification

### Cache Management
- User cache is automatically cleared when user data is modified
- Ensures immediate effect of bans, status changes, and role updates

## Error Handling

All routes return standardized error responses:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

Common error codes:
- `USER_NOT_FOUND` - User does not exist
- `INSUFFICIENT_PERMISSIONS` - Admin lacks required permissions
- `USER_ALREADY_BANNED` - Attempting to ban already banned user
- `USER_NOT_BANNED` - Attempting to unban non-banned user
- `VALIDATION_ERROR` - Invalid request data
- `CONFIRMATION_REQUIRED` - Delete confirmation missing

## Usage Examples

### Ban a user for 24 hours
```bash
curl -X PUT "http://localhost:3001/admin/users/user-123/ban" \
  -H "Authorization: Bearer admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Spam behavior",
    "duration": 24
  }'
```

### Get user analytics for last 7 days
```bash
curl -X GET "http://localhost:3001/admin/analytics/users?period=7d" \
  -H "Authorization: Bearer admin-jwt-token"
```

### Search for users by email
```bash
curl -X GET "http://localhost:3001/admin/users?search=john@example.com&page=1&limit=10" \
  -H "Authorization: Bearer admin-jwt-token"
```

### Update user roles (Super Admin only)
```bash
curl -X PUT "http://localhost:3001/admin/users/user-123/roles" \
  -H "Authorization: Bearer super-admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "roles": ["USER", "INFLUENCER"],
    "reason": "Role upgrade request approved"
  }'
```

## Integration Notes

1. **API Gateway**: Add these routes to the API Gateway routing configuration
2. **Frontend**: Use these endpoints to build admin dashboard interfaces
3. **Monitoring**: Admin logs provide full audit trail for compliance
4. **Caching**: Redis cache automatically manages user data consistency

The auth-service now provides complete admin functionality for user management, ban/unban operations, and comprehensive analytics tracking as requested.