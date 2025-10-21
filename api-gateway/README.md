# 50BraIns API Gateway

A high-performance Express.js-based API Gateway for the 50BraIns microservices architecture.

## Features

🚀 **High Performance**

- Clustering support for multi-core utilization
- Connection pooling and keep-alive optimization
- Response compression and caching
- Efficient memory management

🔒 **Security**

- Comprehensive CORS handling
- Rate limiting and DDoS protection
- Request sanitization (XSS, NoSQL injection)
- Security headers with Helmet
- JWT token validation

🌐 **Routing & Load Balancing**

- Dynamic service discovery
- Health check monitoring
- Failover and circuit breaker patterns
- Request/response transformation

📊 **Monitoring & Logging**

- Real-time performance monitoring
- Structured logging with Winston
- Request tracing and metrics
- Health check endpoints

## Architecture

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client    │───▶│   API Gateway   │───▶│  Auth Service   │
│ (Frontend)  │    │ (Port: 3000)    │    │ (Port: 4001)    │
└─────────────┘    └─────────────────┘    └─────────────────┘
                           │
                           ▼
                   ┌─────────────────┐
                   │  Other Services │
                   │ (Future Ports)  │
                   └─────────────────┘
```

## Quick Start

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Environment Setup**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Development Mode**

   ```bash
   npm run dev
   ```

4. **Production Mode**
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

- `PORT` - Gateway port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `AUTH_SERVICE_URL` - Auth service URL
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT secret for token validation
- `CORS_ORIGINS` - Allowed CORS origins
- `RATE_LIMIT_WINDOW` - Rate limit window (ms)
- `RATE_LIMIT_MAX` - Max requests per window

### Service Configuration

Services are configured in `src/config/services.js`:

```javascript
{
  auth: {
    url: 'http://localhost:4001',
    prefix: '/api/auth',
    timeout: 30000
  }
}
```

## API Routes

All requests to the gateway are proxied to appropriate services:

- `GET /health` - Gateway health check
- `GET /metrics` - Performance metrics
- `/api/auth/*` - Proxied to Auth Service
- `/api/users/*` - Proxied to User Service (future)
- `/api/admin/*` - Proxied to Admin Service (future)

## CORS Configuration

The gateway handles all CORS policies centrally:

```javascript
{
  origin: ['http://localhost:3000', 'https://app.50brains.com'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
}
```

## Performance Features

- **Clustering**: Utilizes all CPU cores
- **Compression**: Gzip compression for responses
- **Caching**: Redis-based response caching
- **Keep-Alive**: Persistent connections to services
- **Rate Limiting**: Configurable rate limits per IP/user

## Monitoring

Access real-time monitoring at `/status` when the gateway is running.

## Security

- All requests are sanitized for XSS and NoSQL injection
- Security headers applied via Helmet
- Rate limiting prevents abuse
- JWT tokens validated before proxying
- CORS policies enforced

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Docker Support

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass

## License

MIT - 50BraIns Team
