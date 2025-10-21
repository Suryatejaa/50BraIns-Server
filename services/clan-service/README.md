# Clan Service V1 - Professional Microservice Architecture

A simplified but professionally structured clan service for V1 implementation, following industry-standard microservice patterns.

## 🏗️ Architecture Overview

This service follows a clean, layered architecture pattern:

```
┌─────────────────┐
│   Controllers   │  ← HTTP request/response handling
├─────────────────┤
│    Services     │  ← Business logic and data operations
├─────────────────┤
│   Database      │  ← Prisma ORM and PostgreSQL
└─────────────────┘
```

### Directory Structure

```
src/
├── controllers/          # HTTP request handlers
│   ├── health.controller.js
│   ├── clan.controller.js
│   └── ...
├── services/            # Business logic layer
│   ├── database.service.js
│   ├── clan.service.js
│   ├── clanMember.service.js
│   └── message.service.js
├── routes/              # Express route definitions
│   ├── health.js
│   ├── clans.js
│   ├── members.js
│   └── messages.js
├── middleware/          # Custom middleware
│   └── auth.js
├── utils/               # Utility functions
└── index.js            # Service entry point
```

## 🚀 Features

### Core Functionality (V1)
- **Clan Management**: Create, read, update, delete clans
- **Membership**: Join, leave, role management
- **Chat System**: Basic messaging within clans
- **Gig Sharing**: Members can share gigs with their clan
- **Reputation System**: Automatic clan scoring based on member scores

### Professional Standards
- **Clean Architecture**: Separation of concerns
- **Service Layer**: Business logic isolation
- **Middleware**: Authentication and authorization
- **Error Handling**: Comprehensive error management
- **Database Transactions**: Data consistency
- **Health Checks**: Service monitoring
- **Graceful Shutdown**: Proper resource cleanup

## 📋 API Endpoints

### Health Checks
```
GET  /health              - Basic health check
GET  /health/detailed     - Detailed health with metrics
```

### Clans
```
GET    /clans                    - List all clans (with filtering)
GET    /clans/feed              - Enhanced clan feed
GET    /clans/featured          - Featured clans
GET    /clans/my                - User's clans
GET    /clans/:id               - Get clan details
POST   /clans                   - Create clan
PUT    /clans/:id               - Update clan
DELETE /clans/:id               - Delete clan
```

### Members
```
GET    /members/:clanId         - Get clan members
POST   /members/:clanId/join    - Join clan
POST   /members/:clanId/leave   - Leave clan
PUT    /members/:clanId/:userId/role    - Update member role
DELETE /members/:clanId/:userId - Remove member
```

### Messages & Chat
```
GET    /clans/:id/messages      - Get clan messages
POST   /clans/:id/messages      - Send message
POST   /clans/:id/share-gig     - Share gig with clan
GET    /clans/:id/shared-gigs   - Get shared gigs
GET    /clans/:id/message-stats - Message statistics
DELETE /clans/:id/messages/:messageId - Delete message
```

### Reputation
```
POST   /clans/:id/update-reputation - Update clan reputation
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/clan_service"
PORT=4003
NODE_ENV=development
```

### 3. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate
```

### 4. Start Service
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start with nodemon (development)
npm start            # Start service (production)
npm test             # Run tests
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

### Code Structure Guidelines

#### Controllers
- Handle HTTP requests/responses
- Input validation
- Error response formatting
- No business logic

#### Services
- Business logic implementation
- Database operations
- Data transformation
- Reusable across controllers

#### Middleware
- Authentication
- Authorization
- Request validation
- Logging/monitoring

#### Routes
- Endpoint definitions
- Middleware chaining
- Route organization

## 🗄️ Database Schema

### Core Tables
- **clans**: Clan information and metadata
- **clan_members**: Membership relationships
- **clan_messages**: Chat messages and gig sharing

### Key Features
- Proper indexing for performance
- Foreign key constraints
- JSON fields for flexible metadata
- Timestamp tracking

## 🔐 Authentication & Authorization

### Authentication
- Header-based: `x-user-id`
- JWT support: `Authorization: Bearer <token>`

### Authorization Levels
- **Public**: Clan listing, basic info
- **Authenticated**: Join/leave, messaging
- **Member**: Clan-specific operations
- **Owner/Admin**: Clan management

## 📊 Monitoring & Health

### Health Endpoints
- Basic health check for load balancers
- Detailed health with database status
- Memory usage and uptime metrics

### Logging
- Structured logging for production
- Error tracking and monitoring
- Request/response logging

## 🚀 Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4003
CMD ["npm", "start"]
```

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Service port (default: 4003)
- `NODE_ENV`: Environment (development/production)

## 🧪 Testing

### Test Structure
```
test/
├── unit/           # Unit tests for services
├── integration/    # API endpoint tests
└── e2e/           # End-to-end tests
```

### Running Tests
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## 🔄 Integration Points

### External Services
- **User Service**: User authentication and profiles
- **Reputation Service**: Member score updates
- **Gig Service**: Gig information for sharing

### Events
- Member join/leave events
- Clan creation/deletion events
- Message activity events

## 📈 Performance Considerations

### Database
- Proper indexing on frequently queried fields
- Connection pooling
- Query optimization

### Caching
- Redis integration for frequently accessed data
- Response caching for public endpoints

### Rate Limiting
- API rate limiting for abuse prevention
- Per-user and per-endpoint limits

## 🛡️ Security

### Input Validation
- Request body validation
- Parameter sanitization
- SQL injection prevention (Prisma)

### CORS Configuration
- Configurable origins
- Method restrictions
- Header controls

### Helmet Security
- Security headers
- Content Security Policy
- XSS protection

## 📝 API Documentation

### Request/Response Format
```json
{
  "success": true,
  "data": {...},
  "error": null
}
```

### Error Responses
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional context"
}
```

### Pagination
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

## 🤝 Contributing

### Code Standards
- ESLint configuration
- Prettier formatting
- Conventional commit messages
- Pull request reviews

### Development Workflow
1. Create feature branch
2. Implement changes
3. Add tests
4. Update documentation
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
- Create GitHub issue
- Check documentation
- Review logs and health endpoints

---

**Built with ❤️ by the 50BraIns Team**
