# 50BraIns Platform Architecture

## Overview

This is a scalable, enterprise-grade microservices platform built with NestJS, TypeScript, and Prisma. The system uses cookie-based JWT authentication and follows a clean, maintainable architecture.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │  Auth Service   │
│                 │◄──►│                 │◄──►│                 │
│  (React/Next)   │    │   Port: 3000    │    │   Port: 4001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Other Services │    │   PostgreSQL    │
                       │                 │    │   Database      │
                       │  (Future)       │    │                 │
                       └─────────────────┘    └─────────────────┘
```

## Services

### 1. API Gateway (`api-gateway/`)

**Port:** 3000  
**Purpose:** Entry point for all client requests, handles routing, authentication middleware

#### Key Features:

- Cookie-based JWT authentication middleware
- Request routing to microservices
- CORS handling
- Global validation
- Health checks

#### File Structure:

```
api-gateway/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts          # Root module
│   ├── middleware/
│   │   └── authMiddleware.ts  # JWT cookie authentication
│   ├── config/
│   │   └── cors.ts           # CORS configuration
│   ├── health/
│   │   └── health.controller.ts
│   ├── proxy/
│   │   └── proxy.controller.ts
│   └── routes/
│       └── gateway.controller.ts
├── .env
└── package.json
```

### 2. Auth Service (`services/auth-service/`)

**Port:** 4001  
**Purpose:** User authentication, authorization, and profile management

#### Key Features:

- User registration and login
- JWT token generation and validation
- Cookie-based authentication
- User profile CRUD operations
- Password hashing with bcrypt
- Refresh token rotation

#### File Structure:

```
auth-service/
├── src/
│   ├── main.ts                # Application entry point
│   ├── app.module.ts         # Root module
│   ├── auth/
│   │   ├── auth.controller.ts # Auth endpoints
│   │   ├── auth.service.ts   # Auth business logic
│   │   ├── jwt.strategy.ts   # JWT strategy
│   │   └── dto/              # Data Transfer Objects
│   │       ├── register.dto.ts
│   │       ├── login.dto.ts
│   │       └── refresh-token.dto.ts
│   ├── users/
│   │   ├── users.controller.ts # User CRUD endpoints
│   │   ├── users.service.ts   # User business logic
│   │   └── dto/               # User DTOs
│   │       ├── create-user.dto.ts
│   │       └── update-profile.dto.ts
│   ├── prisma/
│   │   └── prisma.service.ts # Database service
│   ├── config/
│   │   └── database.config.ts
│   └── common/
│       └── guards/
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/
├── .env
├── .env.enterprise
└── package.json
```

## Authentication Flow

### 1. Login/Register Flow

```
1. Client → API Gateway → Auth Service (POST /auth/login)
2. Auth Service validates credentials
3. Auth Service generates JWT tokens
4. Auth Service sets httpOnly cookies (accessToken, refreshToken)
5. Response flows back with cookies set
```

### 2. Protected Route Flow

```
1. Client → API Gateway (with cookies)
2. API Gateway → AuthMiddleware reads cookies
3. AuthMiddleware → Auth Service (POST /auth/protected)
4. Auth Service validates JWT from cookie
5. Auth Service returns user data
6. AuthMiddleware injects user into req.user
7. Request continues to target service
```

### 3. Token Refresh Flow

```
1. API Gateway detects expired access token
2. AuthMiddleware → Auth Service (POST /auth/refresh)
3. Auth Service validates refresh token
4. Auth Service generates new tokens
5. Auth Service updates cookies
6. Request retried with new tokens
```

## API Endpoints

### Auth Service (`http://localhost:4001`)

```
POST   /auth/register         # User registration
POST   /auth/login           # User login
POST   /auth/refresh         # Refresh tokens
POST   /auth/logout          # Logout (single session)
POST   /auth/logout-all      # Logout all sessions
POST   /auth/protected       # Validate token (internal)
GET    /health               # Health check

GET    /users/profile        # Get user profile
PUT    /users/profile        # Update user profile
GET    /users/:id            # Get user by ID
PUT    /users/:id            # Update user by ID
DELETE /users/:id            # Delete user
```

### API Gateway (`http://localhost:3000/api`)

```
GET    /gateway/health       # Gateway health
GET    /gateway/test         # Test endpoint
ALL    /auth/*              # Proxy to Auth Service
ALL    /users/*             # Proxy to Auth Service (protected)
```

## Database Schema

### User Model (PostgreSQL via Prisma)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  username     String   @unique
  firstName    String?
  lastName     String?
  passwordHash String
  phone        String?
  bio          String?
  website      String?
  location     String?
  birthDate    DateTime?
  profileImage String?
  coverImage   String?
  isVerified   Boolean  @default(false)
  isActive     Boolean  @default(true)
  roles         roles     @default(USER)

  // Timestamps
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lastLoginAt  DateTime?

  // Refresh tokens
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum roles {
  USER
  ADMIN
  MODERATOR
}
```

## Environment Configuration

### Auth Service (`.env`)

```env
NODE_ENV=development
PORT=4001
APP_NAME="Auth Service"

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/auth_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="15m"
REFRESH_JWT_SECRET="your-refresh-secret-key"
REFRESH_JWT_EXPIRES_IN="7d"

# Cookies
COOKIE_SECRET="your-cookie-secret"

# CORS
CORS_ORIGIN="http://localhost:3000"
```

### API Gateway (`.env`)

```env
NODE_ENV=development
PORT=3000

# Services
AUTH_SERVICE_URL=http://localhost:4001

# CORS
CORS_ORIGIN=http://localhost:3001
```

## Development Workflow

### 1. Setup and Installation

```bash
# Install dependencies
cd api-gateway && npm install
cd ../services/auth-service && npm install

# Setup database
cd services/auth-service
npx prisma generate
npx prisma db push
```

### 2. Development

```bash
# Terminal 1: Start Auth Service
cd services/auth-service
npm run start:dev

# Terminal 2: Start API Gateway
cd api-gateway
npm run start:dev
```

### 3. Database Management

```bash
# View database
cd services/auth-service
npx prisma studio

# Run migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset
```

### 4. Testing

```bash
# Test auth endpoints
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"test","password":"Test123!"}'

# Test protected routes
curl -X GET http://localhost:3000/api/users/profile \
  -H "Cookie: accessToken=your-jwt-token"
```

## Production Deployment

### 1. Build

```bash
# Build both services
cd api-gateway && npm run build
cd ../services/auth-service && npm run build
```

### 2. Start Production

```bash
# Start Auth Service
cd services/auth-service && npm run start:prod

# Start API Gateway
cd api-gateway && npm run start:prod
```

### 3. Docker (Optional)

```bash
# Build and start with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## Best Practices

### 1. Code Organization

- **Single Responsibility:** Each service has a clear, focused purpose
- **Domain-Driven Design:** Code organized by business domains (auth, users)
- **Layered Architecture:** Controllers → Services → Repositories
- **DTOs for Validation:** All input/output uses typed DTOs

### 2. Security

- **JWT in HttpOnly Cookies:** Prevents XSS attacks
- **CORS Configuration:** Restricts cross-origin requests
- **Password Hashing:** Using bcrypt with salt rounds
- **Token Rotation:** Refresh tokens are rotated on use

### 3. Scalability

- **Microservices Ready:** Easy to split into separate deployments
- **Database per Service:** Each service can have its own database
- **Stateless Design:** Services don't store session state
- **Middleware Pattern:** Authentication handled at gateway level

### 4. Maintainability

- **TypeScript Strict Mode:** Catch errors at compile time
- **Consistent File Structure:** Predictable organization
- **Environment Configuration:** Easy to configure for different environments
- **Clear Separation:** Gateway handles routing, services handle business logic

## Future Enhancements

### Phase 1: Core Features

- ✅ User authentication and authorization
- ✅ Cookie-based JWT auth
- ✅ User profile management
- ✅ API Gateway with middleware

### Phase 2: Production Features

- [ ] Rate limiting and throttling
- [ ] Logging and monitoring
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Admin user management

### Phase 3: Enterprise Features

- [ ] Multi-factor authentication
- [ ] OAuth2 integration
- [ ] roles-based permissions
- [ ] API versioning
- [ ] Caching with Redis
- [ ] Background job processing

### Phase 4: Platform Features

- [ ] User marketplace profiles
- [ ] Content management
- [ ] Payment integration
- [ ] Notification service
- [ ] Analytics and reporting

## Troubleshooting

### Common Issues

1. **CORS Errors**

   - Check `CORS_ORIGIN` in environment files
   - Ensure `credentials: true` is set

2. **Authentication Failures**

   - Verify JWT secrets match between services
   - Check cookie settings (httpOnly, sameSite)

3. **Database Connection Issues**

   - Verify `DATABASE_URL` in `.env`
   - Run `npx prisma generate` after schema changes

4. **Port Conflicts**
   - Auth Service: 4001
   - API Gateway: 3000
   - Ensure ports are not in use

### Debugging

1. **Enable Debug Logging**

   ```bash
   # Start with debug mode
   npm run start:debug
   ```

2. **Database Inspection**

   ```bash
   # Open Prisma Studio
   npx prisma studio
   ```

3. **Health Checks**
   - Auth Service: `http://localhost:4001/health`
   - API Gateway: `http://localhost:3000/api/gateway/health`

This architecture provides a solid foundation for a scalable, maintainable creative marketplace platform while maintaining the flexibility to add new features and services as needed.
