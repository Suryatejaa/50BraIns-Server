# Work History Service

The Work History Service is the **source of truth** for creator achievements and portfolio tracking in the 50BraIns platform. It records, verifies, and manages all completed work records, skill proficiencies, achievements, and portfolio items.

## 🎯 Purpose

This service serves as the foundation for the reputation system by:
- Recording completed work with detailed metrics
- Tracking skill development and proficiency levels
- Managing achievement systems and badges
- Building comprehensive creator portfolios
- Providing verified work history for reputation calculations

## 🏗 Architecture

### Core Components

1. **Work Records**: Complete history of finished gigs with ratings and delivery metrics
2. **Portfolio Items**: Visual proof of work linked to specific projects
3. **Achievement System**: Automated and manual achievement tracking
4. **Skill Proficiency**: Dynamic skill level calculation based on work history
5. **Work Summaries**: Aggregated statistics and performance metrics

### Data Models

- **WorkRecord**: Completed gigs with client feedback and delivery metrics
- **PortfolioItem**: Visual/document proof linked to work records
- **Achievement**: Earned badges, milestones, and certifications
- **SkillProficiency**: Calculated skill levels and experience
- **WorkSummary**: Aggregated user statistics and performance metrics
- **WorkEvent**: Audit trail of all work-related activities

## 🚀 Features

### Work History Management
- Automatic recording from gig completion events
- Client rating and feedback integration
- Delivery time and budget tracking
- Verification system for work authenticity

### Portfolio System
- Linked portfolio items to work records
- Public/private visibility controls
- Category-based organization
- Showcase generation for best work

### Achievement Engine
- Automatic milestone detection
- Quality-based badge awards
- Skill specialization tracking
- Custom achievement creation

### Analytics & Insights
- Work performance statistics
- Skill development tracking
- Category and trend analysis
- Leaderboard systems

## 📡 API Endpoints

### Work History
- `GET /api/work-history/user/:userId` - Get user's work history
- `GET /api/work-history/user/:userId/summary` - Get work summary with reputation
- `GET /api/work-history/user/:userId/skills` - Get skill proficiencies
- `GET /api/work-history/user/:userId/statistics` - Get detailed analytics
- `GET /api/work-history/record/:workRecordId` - Get specific work record
- `PUT /api/work-history/record/:workRecordId/verify` - Update verification status

### Portfolio
- `GET /api/portfolio/user/:userId` - Get user's portfolio items
- `GET /api/portfolio/item/:itemId` - Get specific portfolio item
- `GET /api/portfolio/showcase/:userId` - Get portfolio showcase
- `GET /api/portfolio/categories/:userId` - Get portfolio by categories

### Achievements
- `GET /api/achievements/user/:userId` - Get user's achievements
- `GET /api/achievements/leaderboard/:type` - Get achievement leaderboards
- `GET /api/achievements/stats/overview` - Get platform achievement stats
- `POST /api/achievements/manual` - Award manual achievement (admin)
- `DELETE /api/achievements/:achievementId` - Revoke achievement (admin)

### Summary & Analytics
- `GET /api/summary/user/:userId` - Get comprehensive user summary
- `GET /api/summary/leaderboards` - Get various leaderboards
- `GET /api/summary/platform-stats` - Get platform-wide statistics
- `GET /api/summary/trending` - Get trending skills and categories

## 🔌 Integration

### Event-Driven Architecture

The service consumes events from other services via RabbitMQ:

#### Consumed Events
- `gig.completed` - Records new work completion
- `gig.rated` - Updates work record with client rating
- `gig.delivered` - Logs delivery events
- `user.portfolio.updated` - Tracks portfolio changes

#### Published Events
- `work.completed` - Notifies reputation service of new work
- `achievement.earned` - Notifies of new achievements
- `work.verification.updated` - Notifies of verification changes

### Service Dependencies
- **Reputation Service**: Sends work completion and achievement data
- **Gig Service**: Receives completion and rating events
- **User Service**: May receive portfolio update events
- **API Gateway**: Routes external requests

## 🗄 Database Schema

### Key Tables
- `work_records` - Core work completion data
- `portfolio_items` - Visual proof of work
- `achievements` - Earned achievements and badges
- `skill_proficiencies` - Calculated skill levels
- `work_summaries` - Aggregated user statistics
- `work_events` - Audit trail of activities

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- RabbitMQ message broker
- Redis cache

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Setup environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup database**:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Start the service**:
   ```bash
   npm start
   ```

### Development Mode
```bash
npm run dev
```

### Database Commands
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Reset database
npm run prisma:reset

# Open Prisma Studio
npm run prisma:studio
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 4007 |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `RABBITMQ_URL` | RabbitMQ connection string | amqp://localhost:5672 |
| `REDIS_URL` | Redis connection string | redis://localhost:6379 |
| `REPUTATION_SERVICE_URL` | Reputation service URL | http://localhost:4006 |
| `LOG_LEVEL` | Logging level | info |

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:4007/health
```

### Logging
- **Error logs**: `logs/error.log`
- **Combined logs**: `logs/combined.log`
- **Audit logs**: `logs/audit.log`

### Metrics
- Work completion rates
- Achievement distribution
- Skill progression tracking
- Portfolio engagement metrics

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🔒 Security

### Data Protection
- Input validation with Joi
- SQL injection prevention via Prisma
- Rate limiting on all endpoints
- Audit logging for sensitive operations

### Authentication
- JWT token validation (when auth middleware is added)
- Role-based access control for admin functions
- User data isolation

## 📈 Performance

### Caching Strategy
- Work summaries cached in Redis (1 hour)
- Leaderboards cached and updated incrementally
- Skill proficiencies cached per user

### Database Optimization
- Indexed columns for common queries
- Pagination for large datasets
- Efficient joins and aggregations

## 🔄 Deployment

### Docker
```bash
# Build image
docker build -t work-history-service .

# Run container
docker run -p 4007:4007 work-history-service
```

### Environment Setup
1. Configure PostgreSQL database
2. Setup RabbitMQ with required exchanges
3. Configure Redis for caching
4. Set environment variables
5. Run database migrations

## 🤝 Contributing

1. Follow existing code patterns
2. Add tests for new features
3. Update documentation
4. Use conventional commit messages
5. Ensure proper error handling

## 📝 License

MIT License - see LICENSE file for details

---

**Work History Service** - The foundation of creator credibility in the 50BraIns ecosystem.
