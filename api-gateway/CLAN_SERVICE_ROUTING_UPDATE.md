# Clan Service Routing Update - API Gateway

## Overview
This document outlines the updates made to the API Gateway to properly route requests to the newly restructured clan service.

## Changes Made

### 1. Updated Route Configuration (`api-gateway/src/app.js`)

#### Clan Service Routes
```javascript
// Clan service routes
app.use('/api/members', authMiddleware, proxyMiddleware('clan')); // Clan member management
app.use('/api/clans', proxyMiddleware('clan')); // Main clan operations (public and protected)
app.use('/api/clan', authMiddleware, proxyMiddleware('clan')); // Legacy clan routes
app.use('/api/clans/my', authMiddleware, proxyMiddleware('clan')); // User's own clans
```

**Key Changes:**
- Added `/api/clans` route for main clan operations (no auth middleware - allows public access)
- Kept `/api/clan` for legacy compatibility (with auth middleware)
- Maintained existing member management routes

#### Health Check Routes
```javascript
// Health check routes for all services
app.use('/api/clan/health', proxyMiddleware('clan')); // Legacy health endpoint
app.use('/api/clans/health', proxyMiddleware('clan')); // New clan service health endpoint
```

### 2. Updated Proxy Middleware (`api-gateway/src/middleware/proxy.js`)

#### Enhanced Path Rewriting for Clan Service
```javascript
if (serviceName === 'clan') {
    // Handle new clan service routes
    if (path.startsWith('/api/clans')) {
        const remainingPath = path.substring('/api/clans'.length);
        const newPath = `/clans${remainingPath}` || '/clans';

        logger.debug(`Clan service path rewrite: ${path} -> ${newPath}`, {
            service: serviceName,
            route: '/api/clans',
            requestId: req.requestId
        });
        return newPath;
    }
    
    // ... existing route handling
}
```

**Path Rewriting Examples:**
- `/api/clans` → `/clans`
- `/api/clans/feed` → `/clans/feed`
- `/api/clans/123` → `/clans/123`
- `/api/clans/123/messages` → `/clans/123/messages`
- `/api/clans/123/share-gig` → `/clans/123/share-gig`

### 3. Updated API Documentation

#### New Endpoints Added
```javascript
endpoints: {
    // ... existing endpoints
    clan: '/api/clan/*',      // Legacy clan routes
    clans: '/api/clans/*',    // New main clan routes
    // ... other endpoints
}
```

## Route Mapping

### Public Routes (No Authentication Required)
| Gateway Route | Clan Service Route | Description |
|---------------|-------------------|-------------|
| `GET /api/clans` | `GET /clans` | Get all clans |
| `GET /api/clans/feed` | `GET /clans/feed` | Get clan feed |
| `GET /api/clans/featured` | `GET /clans/featured` | Get featured clans |
| `GET /api/clans/:id` | `GET /clans/:id` | Get specific clan |

### Protected Routes (Authentication Required)
| Gateway Route | Clan Service Route | Description |
|---------------|-------------------|-------------|
| `POST /api/clans` | `POST /clans` | Create new clan |
| `PUT /api/clans/:id` | `PUT /clans/:id` | Update clan |
| `DELETE /api/clans/:id` | `DELETE /clans/:id` | Delete clan |
| `GET /api/clans/my` | `GET /clans/my` | Get user's clans |

### Member Management Routes
| Gateway Route | Clan Service Route | Description |
|---------------|-------------------|-------------|
| `GET /api/members/:clanId` | `GET /members/:clanId` | Get clan members |
| `POST /api/members/:clanId/join` | `POST /members/:clanId/join` | Join clan |
| `POST /api/members/:clanId/leave` | `POST /members/:clanId/leave` | Leave clan |
| `PUT /api/members/:clanId/:userId/role` | `PUT /members/:clanId/:userId/role` | Update member role |
| `DELETE /api/members/:clanId/:userId` | `DELETE /members/:clanId/:userId` | Remove member |

### Message and Chat Routes
| Gateway Route | Clan Service Route | Description |
|---------------|-------------------|-------------|
| `GET /api/clans/:id/messages` | `GET /clans/:id/messages` | Get clan messages |
| `POST /api/clans/:id/messages` | `POST /clans/:id/messages` | Send message |
| `POST /api/clans/:id/share-gig` | `POST /clans/:id/share-gig` | Share gig with clan |
| `GET /api/clans/:id/shared-gigs` | `GET /clans/:id/shared-gigs` | Get shared gigs |
| `GET /api/clans/:id/message-stats` | `GET /clans/:id/message-stats` | Get message statistics |
| `DELETE /api/clans/:id/messages/:messageId` | `DELETE /clans/:id/messages/:messageId` | Delete message |

## Benefits of the New Structure

### 1. **Cleaner Route Organization**
- Main clan operations under `/api/clans`
- Member management under `/api/members`
- Messages nested under `/api/clans/:id`

### 2. **Better Public Access**
- Public clan information accessible without authentication
- Protected operations still require proper authentication
- Clear separation between public and private endpoints

### 3. **Improved Developer Experience**
- Intuitive route structure
- Consistent with REST conventions
- Easy to understand and maintain

### 4. **Backward Compatibility**
- Legacy `/api/clan` routes still supported
- Existing integrations continue to work
- Gradual migration path available

## Testing the New Routes

### Health Check
```bash
curl http://localhost:3000/api/clans/health
```

### Public Clan Feed
```bash
curl http://localhost:3000/api/clans/feed
```

### Get All Clans
```bash
curl http://localhost:3000/api/clans
```

### Create Clan (Protected)
```bash
curl -X POST http://localhost:3000/api/clans \
  -H "x-user-id: 123" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Clan", "description": "A test clan"}'
```

## Migration Notes

### For Frontend Developers
- Update API calls from `/api/clan/*` to `/api/clans/*` for new features
- Legacy routes will continue to work
- New routes provide better organization and public access

### For Backend Developers
- Clan service now has a cleaner, layered architecture
- Routes are properly organized by functionality
- Authentication middleware is applied appropriately

### For API Consumers
- Public clan information is now accessible without authentication
- Protected operations require proper user identification
- Route structure is more intuitive and RESTful

## Future Considerations

### 1. **Route Deprecation**
- Consider deprecating legacy `/api/clan` routes in future versions
- Provide migration guides for API consumers
- Monitor usage to determine deprecation timeline

### 2. **Additional Features**
- Consider adding clan analytics routes
- Implement clan search and filtering
- Add clan recommendation endpoints

### 3. **Performance Optimization**
- Implement caching for public clan data
- Add rate limiting for clan creation
- Consider CDN for clan images and media

## Conclusion

The API Gateway has been successfully updated to support the new clan service structure. The changes provide:

- ✅ Better route organization
- ✅ Improved public access
- ✅ Backward compatibility
- ✅ Cleaner API structure
- ✅ Enhanced developer experience

All clan service routes are now properly configured and ready for use with the restructured clan service.
