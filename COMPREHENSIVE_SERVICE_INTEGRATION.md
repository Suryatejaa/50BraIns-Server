# Comprehensive Service Integration Guide

## Overview
This document outlines how the **Gig Service**, **Work History Service**, and **Reputation Service** work together to create a comprehensive gig lifecycle tracking and reputation management system.

## Architecture Flow

```
Gig Service ──────┐
                  ├── RabbitMQ Events ──→ Work History Service
                  │                            │
                  └─────────────────────────────┼──→ Reputation Service
                                                │
Work History ──────────── RabbitMQ Events ────┘
```

## Event Flow and Integration

### 1. Application Lifecycle Events

#### 1.1 Gig Application Created
- **Publisher:** Gig Service
- **Exchange:** `gig_events`
- **Routing Key:** `gig.application.created`
- **Consumers:** Work History Service, Reputation Service

**Event Data:**
```json
{
  "applicationId": "app_123",
  "gigId": "gig_456",
  "applicantId": "user_789",
  "applicantType": "INDIVIDUAL",
  "quotedPrice": 750,
  "estimatedTime": 5,
  "proposal": "I can create a professional logo...",
  "createdAt": "2024-01-01T10:00:00Z",
  "gigData": {
    "title": "Logo Design",
    "category": "DESIGN",
    "skills": ["logo-design", "illustrator"]
  }
}
```

**Processing:**
- **Work History:** Logs application submission event
- **Reputation:** Awards 1 point for active participation

#### 1.2 Application Accepted/Rejected
- **Routing Keys:** `gig.application.accepted` / `gig.application.rejected`
- **Processing:**
  - **Work History:** Records application outcome
  - **Reputation:** Updates application success metrics, adjusts reliability score

### 2. Work Submission Lifecycle

#### 2.1 Work Submitted
- **Routing Key:** `gig.work.submitted`
- **Processing:**
  - **Work History:** Logs work submission with file details
  - **Reputation:** Awards 3 points for completing and submitting work

#### 2.2 Submission Reviewed
- **Routing Key:** `gig.submission.reviewed`
- **Processing:**
  - **Work History:** Records review status and feedback
  - **Reputation:** Awards/deducts points based on approval/rejection

### 3. Gig Completion

#### 3.1 Gig Completed
- **Routing Key:** `gig.completed`
- **Processing:**
  - **Work History:** Creates final work record with comprehensive data
  - **Reputation:** Major reputation update (10+ points) based on rating and performance

## Service-Specific Responsibilities

### Gig Service
1. **Event Publishing:**
   - Publishes to `gig_events` exchange for lifecycle tracking
   - Publishes to `reputation_events` exchange for reputation-specific events

2. **New API Endpoints:**
   ```javascript
   POST /api/gigs/:gigId/submissions/:submissionId/submit-work
   POST /api/gigs/:gigId/submissions/:submissionId/review
   ```

### Work History Service
1. **Event Consumption:**
   - Listens to all gig lifecycle events
   - Creates comprehensive work tracking records
   - Updates user analytics and achievements

2. **Reputation Integration:**
   - Notifies reputation service of completed work
   - Reports achievements and milestones
   - Provides work verification status

### Reputation Service
1. **Enhanced Event Processing:**
   - Processes both `gig_events` and `reputation_events`
   - Handles comprehensive lifecycle scoring
   - Updates user reputation at each stage

2. **Comprehensive Scoring:**
   ```javascript
   const scoring = {
     'gig.application.created': 1,      // Active participation
     'gig.application.accepted': 5,     // Selection success
     'gig.work.submitted': 3,           // Work completion
     'gig.submission.reviewed': 2-5,    // Based on approval/rating
     'gig.completed': 10+               // Major completion bonus
   };
   ```

## Database Schema Integration

### Work History Service Tables
```sql
-- Work records with comprehensive data
WorkRecord {
  id, userId, gigId, clientId,
  title, description, category, skills,
  completedAt, deliveryTime, budgetRange,
  actualBudget, clientRating, clientFeedback,
  onTimeDelivery, withinBudget, portfolioItems
}

-- Event logs for audit trail
WorkEvent {
  id, userId, workRecordId, eventType,
  eventData, createdAt
}
```

### Reputation Service Tables
```sql
-- User reputation scores
ReputationScore {
  userId, totalScore, reliabilityScore,
  qualityScore, communicationScore, timelinessScore,
  overallRating, level, badges, lastUpdated
}

-- Activity logging for transparency
ActivityLog {
  userId, action, impact, pointsAwarded,
  metadata, createdAt
}

-- Score change history
ScoreHistory {
  userId, previousScore, newScore, scoreDelta,
  changeReason, eventId, eventData
}
```

## API Integration Points

### 1. User Profile Enhancement
```javascript
GET /api/users/:userId/profile
// Returns combined data from all services:
{
  "user": { /* user data */ },
  "workHistory": {
    "completedGigs": 25,
    "totalEarnings": 15000,
    "topSkills": ["design", "development"],
    "achievements": [/* achievement list */]
  },
  "reputation": {
    "totalScore": 1250,
    "level": "GOLD",
    "rank": 156,
    "badges": ["Quality Master", "Fast Delivery"]
  }
}
```

### 2. Gig Application Enhancement
```javascript
POST /api/gigs/:gigId/apply
// Now includes work history and reputation context
{
  "proposal": "...",
  "quotedPrice": 500,
  "estimatedTime": 7,
  "relevantWork": [/* from work history */],
  "credibilityScore": /* from reputation */
}
```

## Event Monitoring and Testing

### 1. Test Script Usage
```bash
# Test comprehensive integration
node test-reputation-integration.js

# Test specific workflow
node test-work-history-workflow.js
```

### 2. Monitoring Dashboard
- **RabbitMQ Management:** Monitor event flow between services
- **Logs:** Check each service for proper event processing
- **Database:** Verify data consistency across services

## Environment Configuration

### Required Environment Variables
```bash
# RabbitMQ Configuration (all services)
RABBITMQ_URL=amqp://localhost:5672

# Service URLs for inter-service communication
WORK_HISTORY_SERVICE_URL=http://localhost:4005
REPUTATION_SERVICE_URL=http://localhost:4006
GIG_SERVICE_URL=http://localhost:4003

# Database URLs (service-specific)
WORK_HISTORY_DATABASE_URL=postgresql://...
REPUTATION_DATABASE_URL=postgresql://...
```

## Best Practices

### 1. Event Publishing
- Always include comprehensive `gigData` in events
- Use consistent timestamp formats (ISO 8601)
- Include correlation IDs for tracing

### 2. Error Handling
- Services should continue functioning if others are down
- Use circuit breaker patterns for external calls
- Log all event processing for debugging

### 3. Data Consistency
- Each service maintains its own data integrity
- Use event sourcing principles for audit trails
- Implement eventual consistency patterns

## Troubleshooting

### Common Issues
1. **Events not flowing:** Check RabbitMQ connection and exchange bindings
2. **Missing reputation updates:** Verify routing keys match between services
3. **Incomplete work records:** Ensure all required fields in gig events
4. **Score calculation errors:** Check event data format and required fields

### Debug Commands
```bash
# Check RabbitMQ queues
rabbitmqctl list_queues

# Monitor service logs
docker logs gig-service
docker logs work-history-service  
docker logs reputation-service

# Test database connections
node -e "const {PrismaClient} = require('./services/work-history-service/prisma/generated/work-history-client'); new PrismaClient().$connect().then(() => console.log('Connected')).catch(console.error)"
```

## Performance Considerations

### 1. Event Processing
- Use prefetch limits on RabbitMQ consumers
- Implement batch processing for high-volume events
- Monitor queue depths and processing latency

### 2. Database Optimization
- Index frequently queried fields (userId, gigId, createdAt)
- Use connection pooling for database access
- Implement read replicas for analytics queries

### 3. Caching Strategy
- Cache reputation scores for frequently accessed users
- Use Redis for session data and temporary calculations
- Implement cache invalidation on score updates

This integration creates a robust, event-driven system where user actions in the gig workflow automatically update both work history and reputation, providing comprehensive tracking and scoring across the entire platform.