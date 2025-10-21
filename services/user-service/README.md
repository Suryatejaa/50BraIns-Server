# User Service

This microservice **collaborates** with the Auth Service to provide high-performance user discovery, search, and analytics for the 50BraIns Influencer Marketing Platform. Instead of duplicating functionality, it focuses on handling resource-intensive operations and providing cached, optimized access to user data.

## Purpose & Collaboration Strategy

The User Service works alongside the Auth Service to:

- **Reduce load** on the Auth Service by handling read-heavy operations
- **Maintain data consistency** through real-time synchronization
- **Provide specialized features** like advanced search, analytics, and discovery
- **Cache frequently accessed data** for better performance

### Division of Responsibilities

**Auth Service handles:**

- User registration and authentication
- Profile creation and updates
- Password management and security
- Session management
- User permissions and roles

**User Service handles:**

- High-performance user search and discovery
- Public profile views (cached)
- User analytics and insights
- Trending/popular user lists
- Search trends and recommendations

## Features

- **High-Performance Search:** Optimized search across all user types with advanced filters
- **Public Profile Cache:** Fast access to public user profiles
- **Analytics & Insights:** User popularity, profile views, search trends
- **Data Synchronization:** Real-time sync with Auth Service
- **Discovery Features:** Trending influencers, popular brands, crew recommendations

## API Endpoints

### Search & Discovery

- `GET /search/users` - Advanced user search with filters
- `GET /search/influencers` - Search influencers by niche, platform, followers
- `GET /search/brands` - Search brands by industry, type, location
- `GET /search/crew` - Search crew by skills, experience, availability

### Public Profiles (Cached)

- `GET /public/users/:userId` - Get public user profile (cached)
- `GET /public/influencers/:userId` - Get public influencer profile
- `GET /public/brands/:userId` - Get public brand profile
- `GET /public/crew/:userId` - Get public crew profile

### Analytics & Insights

- `GET /analytics/trending-influencers` - Get trending influencers
- `GET /analytics/popular-brands` - Get popular brands
- `GET /analytics/search-trends` - Get search trends
- `GET /analytics/profile-views/:userId` - Get profile view analytics (protected)
- `GET /analytics/user-insights/:userId` - Get user insights (protected)

### Data Synchronization (Internal)

- `POST /sync/user-updated` - Handle user update from Auth Service
- `POST /sync/user-created` - Handle new user from Auth Service
- `POST /sync/user-deleted` - Handle user deletion from Auth Service
- `POST /sync/sync-all-users` - Manual full sync (admin only)
- `GET /sync/sync-status` - Get sync health status (admin only)

## Getting Started

### Prerequisites

- Node.js v16+
- PostgreSQL database
- API Gateway service running
- Auth Service running

### Environment Setup

Create a `.env` file based on `.env.example`:

```
PORT=4002
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/50brains_userdb?schema=public"
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
LOG_LEVEL=debug
AUTH_SERVICE_URL=http://localhost:4001
GATEWAY_URL=http://localhost:3000
MEDIA_SERVICE_URL=http://localhost:4005
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Apply database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

## Architecture

This service follows clean architecture principles:

- **Controllers:** Handle HTTP requests and responses
- **Services:** Contain business logic
- **Routes:** Define API endpoints and middleware
- **Middleware:** Handle authentication, authorization, and error handling
- **Config:** Service configuration
- **Utils:** Utility functions and helpers

## Database

This service uses Prisma ORM with PostgreSQL. The schema includes:

- User model (shared with Auth Service)
- UserSettings model (specific to User Service)

## Authentication & Authorization

This service relies on the Auth Service for authentication. It verifies JWT tokens and enforces roles-based access control.

## Health Check

A health check endpoint is available at `/health` to monitor service status.

## API Gateway Integration

The User Service is integrated with the API Gateway using the following routes:

- `/api/users/*` - Mapped to the User Service `/users/*` endpoints
- `/api/profiles/*` - Mapped to the User Service `/profiles/*` endpoints
- `/api/search/*` - Mapped to the User Service `/search/*` endpoints

The API Gateway handles cross-cutting concerns like:

- CORS (Cross-Origin Resource Sharing)
- Rate limiting
- Request validation
- Authentication token validation
- Circuit breaking and retry logic
- Health monitoring

## Deployment

For production deployment, set the NODE_ENV to 'production' and update environment variables accordingly.

### Docker Deployment

The service can be deployed using Docker:

```bash
# Build the Docker image
docker build -t 50brains-user-service .

# Run the container
docker run -p 4002:4002 --env-file .env 50brains-user-service
```

For development with Docker Compose:

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up

# Start only the user service
docker-compose -f docker-compose.dev.yml up user-service
```
