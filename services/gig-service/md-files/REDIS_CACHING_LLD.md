# Redis Caching LLD for Gig Service

## 🏗️ Architecture Overview

This document outlines the Low-Level Design for implementing Redis caching in the Gig Service. The design focuses on performance optimization, data consistency, and maintainability.

## 🔑 Central Key Naming Convention

### Primary Entity Keys
```
gig:{gigId}                    # Individual gig data
user:{userId}                  # User profile data (cached from user-service)
application:{applicationId}    # Individual application data
submission:{submissionId}      # Individual submission data
assignment:{assignmentId}      # Gig assignment data
```

### Relationship Keys
```
user_gigs:{userId}             # User's posted gigs list
user_applications:{userId}     # User's applications list
user_drafts:{userId}           # User's draft gigs list
gig_applications:{gigId}       # Applications for a specific gig
gig_submissions:{gigId}        # Submissions for a specific gig
applicant_applications:{applicantId}  # Applications by applicant
```

### Query Cache Keys
```
search:{hash}                  # Search results cache
featured_gigs                  # Featured gigs list
categories                     # Available categories
popular_skills                 # Popular skills list
gig_stats:{userId}             # User's gig statistics
```

### Aggregation Keys
```
stats:gigs:daily              # Daily gig statistics
stats:applications:daily      # Daily application statistics
leaderboard:creators          # Top gig creators
leaderboard:applicants        # Top applicants
```

### Session Keys
```
session:gig_views:{userId}    # Recently viewed gigs
session:search_history:{userId}  # Search history
session:draft_autosave:{userId}:{gigId}  # Auto-saved draft data
```

## 🕒 TTL Strategy

### Entity Data (Medium-term cache)
- **Individual Entities**: 1 hour (3600s)
- **User Profiles**: 30 minutes (1800s)
- **Statistics**: 15 minutes (900s)

### List Data (Short-term cache)
- **User Lists**: 10 minutes (600s)
- **Search Results**: 5 minutes (300s)
- **Featured Content**: 30 minutes (1800s)

### Aggregations (Long-term cache)
- **Daily Stats**: 6 hours (21600s)
- **Categories/Skills**: 24 hours (86400s)
- **Leaderboards**: 1 hour (3600s)

### Session Data (Very short-term)
- **View History**: 2 hours (7200s)
- **Search History**: 1 hour (3600s)
- **Auto-save Drafts**: 30 minutes (1800s)

## 🔄 Cache Invalidation Strategy

### Event-Based Invalidation
1. **Gig Events**
   - CREATE: Invalidate user_gigs, featured_gigs, search results
   - UPDATE: Invalidate gig:{id}, related lists
   - DELETE: Invalidate gig:{id}, all related data
   - STATUS_CHANGE: Invalidate gig:{id}, user stats

2. **Application Events**
   - CREATE: Invalidate gig_applications, user_applications
   - UPDATE: Invalidate application:{id}, related lists
   - ACCEPT/REJECT: Invalidate gig stats, user stats

3. **Submission Events**
   - CREATE: Invalidate gig_submissions, gig stats
   - REVIEW: Invalidate submission:{id}, user stats

### Cascade Invalidation Rules
```
Gig Update → [gig:{id}, user_gigs:{postedById}, gig_applications:{id}, search results]
Application Status → [application:{id}, gig_applications:{gigId}, user_applications:{applicantId}, stats]
User Profile Update → [user:{id}, all user_* lists, leaderboards]
```

## 📊 Performance Monitoring

### Cache Metrics to Track
- Hit Rate per key pattern
- Miss Rate per controller method
- Average response time improvement
- Memory usage by key pattern
- Invalidation frequency

### Alert Thresholds
- Hit Rate < 70% for entity cache
- Hit Rate < 50% for list cache
- Response time regression > 20%
- Memory usage > 80% of allocated

## 🛡️ Cache Safety & Consistency

### Cache-Aside Pattern
1. Check cache first
2. If miss, query database
3. Store result in cache with TTL
4. Return data

### Write-Through for Critical Data
- Gig status changes
- Application status changes
- Payment-related updates

### Graceful Degradation
- Continue operation if Redis is down
- Log cache errors without breaking functionality
- Automatic retry with exponential backoff

## 🎯 Implementation Phases

### Phase 1: Foundation (Week 1)
- Redis service setup for gig-service
- Central cache manager implementation
- Key generator and TTL manager
- Basic entity caching (gigs, applications)

### Phase 2: Controller Integration (Week 2)
- GigController caching implementation
- ApplicationController caching implementation
- Performance monitoring integration

### Phase 3: Advanced Features (Week 3)
- List and query caching
- Search result caching
- Statistics and aggregation caching

### Phase 4: Optimization (Week 4)
- Event-based invalidation
- Performance tuning
- Monitoring and alerting setup

## 🔧 Technical Implementation Details

### Cache Manager Interface
```javascript
class CacheManager {
  // Entity operations
  async getEntity(type, id, fallbackFn)
  async setEntity(type, id, data, ttl)
  async invalidateEntity(type, id)
  
  // List operations  
  async getList(key, fallbackFn)
  async setList(key, data, ttl)
  async invalidateList(key)
  
  // Pattern operations
  async invalidatePattern(pattern)
  async invalidateRelated(entityType, entityId)
}
```

### Controller Integration Pattern
```javascript
// Before (direct DB call)
const gig = await this.prisma.gig.findUnique({ where: { id } });

// After (with caching)
const gig = await this.cacheManager.getEntity('gig', id, async () => {
  return await this.prisma.gig.findUnique({ where: { id } });
});
```

### Event-Driven Invalidation
```javascript
// After gig update
await this.cacheManager.invalidateRelated('gig', gigId);
await this.publishEvent('GIG_UPDATED', { gigId, postedById });
```

## 📈 Expected Performance Improvements

### Database Load Reduction
- Read queries: 60-80% reduction
- Complex aggregations: 90% reduction
- User dashboard loads: 70% reduction

### Response Time Improvements
- Individual gig fetch: 200ms → 20ms
- User gig lists: 500ms → 50ms
- Search queries: 800ms → 100ms
- Dashboard stats: 1000ms → 100ms

### Scalability Benefits
- Reduced database connection pressure
- Better concurrent user handling
- Improved system reliability during peak loads

## 🚨 Risks & Mitigation

### Data Consistency Risks
- **Risk**: Stale cache data
- **Mitigation**: Event-driven invalidation + reasonable TTLs

### Memory Usage Risks  
- **Risk**: Redis memory exhaustion
- **Mitigation**: TTL enforcement + LRU eviction policy

### Complexity Risks
- **Risk**: Cache invalidation bugs
- **Mitigation**: Comprehensive testing + gradual rollout

### Dependency Risks
- **Risk**: Redis service failure
- **Mitigation**: Graceful degradation + circuit breaker pattern

## 🧪 Testing Strategy

### Unit Tests
- Cache manager functionality
- Key generation logic
- TTL and invalidation logic

### Integration Tests
- Controller cache integration
- Event-driven invalidation
- Fallback behavior

### Performance Tests
- Load testing with/without cache
- Memory usage monitoring
- Hit rate validation

### End-to-End Tests
- Complete user workflows
- Data consistency validation
- Edge case handling
