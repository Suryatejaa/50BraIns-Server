# Credit Service

A comprehensive microservice for managing virtual credits, boosts, and monetization features in the 50BraIns platform.

## Features

- **Virtual Currency System**: Complete credit wallet management
- **Boost System**: Profile, Gig, and Clan boosting functionality
- **Payment Integration**: Razorpay and Stripe payment gateways
- **Inter-Service Communication**: Seamless integration with other microservices
- **Admin Controls**: Comprehensive administration and analytics
- **Security**: JWT authentication, rate limiting, and CORS protection

## Architecture

- **Framework**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Payment Gateways**: Razorpay (primary), Stripe (secondary)
- **Port**: 4005
- **API Gateway Integration**: `/api/credit/*` endpoints

## Database Schema

### Models
- **CreditWallet**: User credit balances and wallet information
- **CreditTransaction**: All credit-related transactions
- **BoostRecord**: Boost history and status tracking
- **CreditPackage**: Available credit packages for purchase
- **PaymentRecord**: Payment gateway transaction records
- **ContributionRecord**: Clan contribution tracking

### Enums
- **TransactionType**: PURCHASE, BOOST, CONTRIBUTION, REFUND, BONUS
- **BoostType**: PROFILE, GIG, CLAN
- **TransactionStatus**: PENDING, COMPLETED, FAILED, CANCELLED
- **PaymentStatus**: PENDING, COMPLETED, FAILED, REFUNDED

## API Endpoints

### Public Endpoints (No Authentication)
- `GET /api/public/packages` - Get available credit packages
- `GET /api/public/boost-pricing` - Get boost pricing information

### Protected Endpoints (Authentication Required)
- `POST /api/credits/purchase` - Purchase credit packages
- `POST /api/credits/boost-profile` - Boost user profile
- `POST /api/credits/boost-gig` - Boost specific gig
- `POST /api/credits/boost-clan` - Boost clan visibility
- `POST /api/credits/clan-contribute` - Contribute credits to clan
- `GET /api/credits/wallet` - Get user wallet information
- `GET /api/credits/transactions` - Get transaction history

### Admin Endpoints (Admin Authentication Required)
- `GET /api/admin/statistics` - Get system-wide credit statistics

### Health Endpoints
- `GET /health` - Complete health check
- `GET /health/ready` - Readiness check for Kubernetes
- `GET /health/live` - Liveness check for Kubernetes

## Installation

1. **Clone and navigate to the service:**
   ```bash
   cd services/credit-service
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Setup database:**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. **Start the service:**
   ```bash
   npm start
   # or
   node src/index.js
   # or use the provided scripts
   ./start.bat        # Windows Batch
   ./start.ps1        # PowerShell
   ```

## Environment Configuration

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/credits_db"

# Payment Gateways
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
STRIPE_SECRET_KEY=your-stripe-secret-key

# Service URLs
USER_SERVICE_URL=http://localhost:4002
GIG_SERVICE_URL=http://localhost:4004
CLAN_SERVICE_URL=http://localhost:4003

# Configuration
CREDIT_TO_INR_RATE=1
PLATFORM_COMMISSION_RATE=0.15
PROFILE_BOOST_COST=50
GIG_BOOST_COST=100
CLAN_BOOST_COST=75
```

## Docker Support

Build and run with Docker:

```bash
# Build image
docker build -t credit-service .

# Run container
docker run -p 4005:4005 --env-file .env credit-service
```

## API Gateway Integration

Add to API Gateway configuration:

```javascript
const routes = [
  {
    path: '/api/credit',
    target: 'http://localhost:4005/api',
    changeOrigin: true,
    timeout: 30000
  }
];
```

## Service Communication

The Credit Service communicates with:

- **User Service**: Profile boost verification
- **Gig Service**: Gig boost application
- **Clan Service**: Clan boost and contribution handling
- **API Gateway**: Authentication and request routing

## Business Logic

### Credit Purchase Flow
1. User selects credit package
2. Payment gateway order creation
3. Payment processing and verification
4. Credit wallet update
5. Transaction record creation

### Boost System Flow
1. Boost request validation
2. Credit deduction from wallet
3. External service boost application
4. Boost record creation
5. Transaction logging

### Clan Contribution Flow
1. Contribution amount validation
2. Credit transfer processing
3. Clan service notification
4. Contribution record creation

## Security Features

- **JWT Authentication**: Token-based user authentication
- **Rate Limiting**: Request throttling protection
- **CORS Configuration**: Cross-origin request handling
- **Helmet Security**: HTTP security headers
- **Input Validation**: Comprehensive request validation
- **Database Transactions**: Atomic operation guarantees

## Monitoring and Health

- **Health Checks**: Database and service health monitoring
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Request timing and resource usage
- **Graceful Shutdown**: Clean service termination

## Testing

```bash
# Run tests (when implemented)
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
```

## Development

### Project Structure
```
src/
├── controllers/     # Business logic controllers
├── services/        # External service integrations
├── middleware/      # Authentication and validation
├── routes/          # API route definitions
└── index.js         # Main application file

prisma/
├── schema.prisma    # Database schema definition
└── migrations/      # Database migration files
```

### Development Workflow
1. Make changes to source code
2. Test with local database
3. Update API documentation
4. Run integration tests
5. Deploy to staging environment

## Support

For technical support or questions about the Credit Service, please refer to the main project documentation or contact the development team.

## License

This service is part of the 50BraIns platform and follows the project's licensing terms.
