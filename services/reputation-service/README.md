# 🎯 50BraIns Reputation Service

## Overview
The **Reputation Service** is the heart of the 50BraIns ecosystem, providing centralized reputation scoring, tier management, and leaderboard functionality. This service processes events from all platform activities and maintains a comprehensive scoring system that drives user engagement and recognition.

## 🌟 Key Features

### Core Functionality
- **Real-time Reputation Scoring**: Dynamic calculation based on user activities
- **Multi-tier Ranking System**: Bronze → Silver → Gold → Platinum → Diamond → Legend
- **Achievement Badges**: Unlockable rewards for specific accomplishments
- **Comprehensive Leaderboards**: Global, tier-based, creator, client, and clan rankings
- **Score History Tracking**: Complete audit trail of reputation changes
- **Event-driven Updates**: Automatic score updates from platform activities
- **Clan Reputation Management**: Aggregate scoring for clan performance
- **Performance Analytics**: Detailed statistics and insights

### Advanced Features
- **Configurable Scoring**: Database-driven scoring configuration
- **Score Decay System**: Gradual score reduction for inactive users
- **Bonus Scoring**: Additional points for exceptional performance
- **Rising Stars Detection**: Identify rapidly improving users
- **Cache Optimization**: Redis-powered leaderboard caching
- **Scheduled Tasks**: Automated maintenance and recalculation
- **Emergency Controls**: Manual override capabilities for moderation

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Message Queue**: RabbitMQ for event processing
- **Cache**: Redis for leaderboard optimization
- **Logging**: Winston for comprehensive logging
- **Scheduling**: Node-cron for periodic tasks

### Service Structure
```
reputation-service/
├── src/
│   ├── services/           # Core business logic
│   │   ├── scoringEngine.js      # Reputation calculation engine
│   │   ├── eventProcessor.js     # RabbitMQ event handling
│   │   └── leaderboardService.js # Leaderboard management
│   ├── routes/             # API endpoints
│   │   └── reputation.js         # Reputation API routes
│   ├── utils/              # Helper utilities
│   │   └── scheduledTasks.js     # Cron job management
│   └── server.js           # Main application entry
├── prisma/
│   └── schema.prisma       # Database schema
├── logs/                   # Application logs
└── package.json           # Dependencies and scripts
```

## 📊 Reputation Scoring System

### Base Score Components
- **Gig Completion**: 10 points per completed gig
- **Gig Posting**: 2 points per posted gig
- **Boost Received**: 5 points per boost received
- **Boost Given**: 1 point per boost given
- **Profile Views**: 0.1 points per profile view
- **Connections**: 1 point per connection made
- **Clan Contributions**: 3 points per contribution

### Rating Multiplier
- Average rating × 20 (significant impact on total score)

### Bonus Scoring
- **Application Success Bonus**: +15 points (≥80% success rate)
- **Fast Response Bonus**: +5 points (≤4 hours response time)
- **On-time Completion Bonus**: +10 points (≥95% completion rate)
- **Verification Bonus**: +50 points (one-time verification)

### Tier System
| Tier | Minimum Score | Benefits |
|------|---------------|----------|
| **Legend** | 15,000+ | Maximum visibility, exclusive features |
| **Diamond** | 5,000+ | Premium features, priority support |
| **Platinum** | 1,500+ | Enhanced visibility, special badges |
| **Gold** | 500+ | Increased visibility, basic perks |
| **Silver** | 100+ | Standard features, recognition |
| **Bronze** | 0+ | Basic platform access |

## 🎖️ Achievement Badges

### Available Badges
- **🏆 Century Creator**: Complete 100 gigs
- **👑 Legendary Creator**: Complete 500 gigs
- **⭐ Excellence Master**: Maintain 4.8+ average rating
- **💎 Quality Professional**: Maintain 4.5+ average rating
- **❤️ Community Favorite**: Receive 50+ boosts
- **🤝 Reliable Partner**: 90%+ application success rate
- **⏰ Deadline Champion**: 98%+ on-time completion rate
- **⚡ Lightning Responder**: <2 hours average response time
- **✅ Verified Creator**: Complete verification process

## 🚀 API Endpoints

### User Reputation
```
GET /api/reputation/:userId              # Get user reputation
POST /api/reputation/:userId/recalculate # Recalculate user score
GET /api/reputation/:userId/history      # Get score history
GET /api/reputation/:userId/activity     # Get activity log
```

### Leaderboards
```
GET /api/reputation/leaderboard/global   # Global leaderboard
GET /api/reputation/leaderboard/tier     # Tier-specific leaderboards
GET /api/reputation/leaderboard/creators # Top creators
GET /api/reputation/leaderboard/clients  # Top clients
GET /api/reputation/leaderboard/rising   # Rising stars
GET /api/reputation/leaderboard/clans    # Clan rankings
```

### System Management
```
GET /api/reputation/stats/overview       # System statistics
POST /api/reputation/leaderboard/refresh # Refresh cache
GET /api/reputation/badges/available     # Available badges
```

## 🔄 Event Processing

### Consumed Events
The service listens for events from all platform services:

#### Gig Events
- `gig.completed` - Gig completion (major score boost)
- `gig.posted` - New gig posted
- `gig.rated` - Gig rating received
- `gig.application.accepted` - Application accepted

#### Boost Events
- `boost.received` - Boost received from another user
- `boost.given` - Boost given to another user

#### User Events
- `user.profile.viewed` - Profile view received
- `user.connection.made` - New connection established
- `user.verified` - User verification completed

#### Clan Events
- `clan.contribution` - Contribution to clan activities

### Published Events
The service can publish reputation milestone events:
- `reputation.tier.changed` - User tier promotion/demotion
- `reputation.badge.earned` - New badge unlocked
- `reputation.milestone.reached` - Score milestones

## ⚙️ Configuration

### Environment Variables
```env
# Service Configuration
PORT=4006
NODE_ENV=production
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/reputation_db

# RabbitMQ
RABBITMQ_URL=amqp://localhost

# Redis
REDIS_URL=redis://localhost:6379

# Scoring Configuration
SCORE_GIG_COMPLETED=10
SCORE_GIG_POSTED=2
SCORE_BOOST_RECEIVED=5
SCORE_BOOST_GIVEN=1
SCORE_RATING_MULTIPLIER=20
SCORE_PROFILE_VIEW=0.1
SCORE_CONNECTION=1

# Tier Thresholds
TIER_LEGEND_MIN=15000
TIER_DIAMOND_MIN=5000
TIER_PLATINUM_MIN=1500
TIER_GOLD_MIN=500
TIER_SILVER_MIN=100
TIER_BRONZE_MIN=0

# Feature Flags
ENABLE_SCORE_DECAY=true
ENABLE_CRON_JOBS=true
DECAY_RATE=0.02
DECAY_INTERVAL_DAYS=30

# Maintenance
LOG_RETENTION_DAYS=90
HISTORY_RETENTION_DAYS=180
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- RabbitMQ 3.8+

### Installation Steps
```bash
# Navigate to service directory
cd services/reputation-service

# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push

# Start the service
npm start
```

### Development Mode
```bash
# Start in development mode
npm run dev

# Run database migrations
npx prisma migrate dev

# View database
npx prisma studio
```

## 📈 Monitoring & Maintenance

### Health Checks
The service provides comprehensive health monitoring:
- Database connectivity
- RabbitMQ connection status
- Redis availability
- Service uptime

### Scheduled Tasks
- **Leaderboard Cache Update**: Every 5 minutes
- **Score Recalculation**: Daily at 2 AM
- **Score Decay Application**: Daily at 3 AM
- **Clan Reputation Update**: Hourly
- **Log Cleanup**: Weekly on Sundays
- **Weekly Reports**: Sunday at 4 AM

### Performance Optimization
- **Redis Caching**: Leaderboards cached for 5 minutes
- **Batch Processing**: Score updates processed in batches
- **Database Indexing**: Optimized queries for large datasets
- **Connection Pooling**: Efficient database connections

## 🔒 Security & Data Protection

### Security Measures
- **Rate Limiting**: 1000 requests per 15 minutes per IP
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Sanitized error responses
- **CORS Protection**: Configurable origin restrictions
- **Helmet.js**: Security headers implementation

### Data Privacy
- **Audit Trails**: Complete score change history
- **Data Retention**: Configurable log retention policies
- **Anonymization**: User data protection in logs
- **Backup Strategy**: Regular database backups

## 🧪 Testing

### Test Coverage
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:scoring
npm run test:events
npm run test:leaderboards

# Test coverage report
npm run test:coverage
```

### Test Categories
- **Unit Tests**: Individual component testing
- **Integration Tests**: Service interaction testing
- **Performance Tests**: Load and stress testing
- **API Tests**: Endpoint functionality testing

## 📋 API Response Examples

### User Reputation Response
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "username": "creativepro",
    "finalScore": 2847.5,
    "tier": "GOLD",
    "badges": ["QUALITY_PROFESSIONAL", "VERIFIED_CREATOR"],
    "metrics": {
      "gigsCompleted": 45,
      "averageRating": 4.7,
      "boostsReceived": 28
    },
    "ranking": {
      "global": { "rank": 156, "type": "global" },
      "tier": { "rank": 23, "type": "tier" }
    }
  }
}
```

### Leaderboard Response
```json
{
  "success": true,
  "data": {
    "type": "global",
    "users": [
      {
        "rank": 1,
        "userId": "top_creator",
        "username": "EliteCreator",
        "finalScore": 18450.0,
        "tier": "LEGEND",
        "badges": ["LEGENDARY_CREATOR", "EXCELLENCE_MASTER"]
      }
    ],
    "total": 1247,
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🤝 Contributing

### Development Guidelines
1. Follow existing code patterns and structure
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Use proper error handling and logging
5. Optimize for performance and scalability

### Code Standards
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message standards
- **JSDoc**: Function documentation

## 📞 Support & Contact

For technical support or questions about the Reputation Service:
- **Technical Issues**: Create an issue in the repository
- **Feature Requests**: Submit enhancement proposals
- **Documentation**: Update README for improvements
- **Performance**: Monitor service metrics and logs

---

**The Reputation Service is the heart of 50BraIns - driving engagement, recognition, and community growth through sophisticated scoring and ranking systems.**
