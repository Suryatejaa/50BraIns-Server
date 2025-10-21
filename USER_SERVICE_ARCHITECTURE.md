# User Service - Auth Service Collaboration Architecture

## Overview

This document outlines the collaborative architecture between the Auth Service and User Service, designed to maintain data consistency while reducing load on the Auth Service.

## Architecture Strategy

### Problem Solved

- Auth Service was handling both authentication/authorization AND user discovery/search
- High-volume read operations (search, public profiles) were impacting auth performance
- Need for specialized analytics and user insights

### Solution

- **Auth Service**: Continues to be the source of truth for user data
- **User Service**: Provides high-performance read operations and analytics
- **Data Sync**: Real-time synchronization maintains consistency

## Data Flow

```
┌─────────────────┐    User Updates    ┌─────────────────┐
│   Auth Service  │ ─────────────────► │  User Service   │
│                 │                    │                 │
│ • User CRUD     │ ◄── Profile Views ── │ • Search Cache  │
│ • Authentication│    & Analytics      │ • Analytics     │
│ • Sessions      │                    │ • Public Views  │
└─────────────────┘                    └─────────────────┘
        │                                       │
        └── /api/auth/users/* ──── API Gateway ── /api/search/* ──┘
                                                   /api/public/*
                                                   /api/analytics/*
```

## Synchronization Strategy

### Real-time Sync

1. **User Created**: Auth Service calls `POST /sync/user-created`
2. **User Updated**: Auth Service calls `POST /sync/user-updated`
3. **User Deleted**: Auth Service calls `POST /sync/user-deleted`

### Batch Sync (Fallback)

- Manual sync endpoints for admins
- Health monitoring for sync status
- Stale data detection and alerts

## Database Design

### Auth Service (Source of Truth)

```sql
users {
  id, email, username, firstName, lastName,
  password, roles, status, ...all user fields
}
```

### User Service (Cache + Analytics)

```sql
user_cache {
  id, email, username, firstName, lastName,
  ...public fields, search_score, profile_views, last_sync_at
}

user_analytics {
  user_id, profile_views, search_appearances,
  popularity_score, engagement_score
}

search_history {
  search_query, search_type, result_count, created_at
}
```

## API Routing via Gateway

### Auth Service Routes

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/users/profile` - Get own profile
- `PATCH /api/auth/users/profile` - Update profile
- `GET /api/auth/users/sessions` - Manage sessions

### User Service Routes

- `GET /api/search/influencers` - Search influencers
- `GET /api/public/users/:id` - Public profile (cached)
- `GET /api/analytics/trending-influencers` - Trending data
- `POST /api/sync/user-updated` - Sync webhook (internal)

## Benefits

1. **Performance**: Search operations don't impact auth performance
2. **Scalability**: User Service can be scaled independently
3. **Specialized Features**: Analytics, trending, recommendations
4. **Data Consistency**: Real-time sync ensures accuracy
5. **Fault Tolerance**: Fallback sync mechanisms

## Implementation Notes

### Auth Service Changes Needed

1. Add webhook calls to User Service on user operations
2. Create internal endpoints for bulk user export
3. Add User Service URL to environment config

### User Service Features

1. High-performance search with indexing
2. Profile view tracking and analytics
3. Search trend analysis
4. User ranking and popularity scoring
5. Favorites/bookmarking system

## Environment Variables

### Auth Service

```bash
USER_SERVICE_URL=http://localhost:4002
USER_SERVICE_WEBHOOK_SECRET=your-webhook-secret
```

### User Service

```bash
AUTH_SERVICE_URL=http://localhost:4001
DATABASE_URL=postgresql://user:pass@localhost:5432/userdb
```

## Monitoring

- Sync health endpoints
- Cache freshness monitoring
- Analytics data validation
- Performance metrics comparison

This architecture ensures the Auth Service can focus on its core responsibilities while the User Service provides enhanced discovery and analytics capabilities.
