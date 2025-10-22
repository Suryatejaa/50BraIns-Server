# Auth Service Specific Railway Variables
# These variables need to be set on the Auth Service specifically

Write-Host "Setting Auth Service specific variables..." -ForegroundColor Green

# Switch to auth service context (if using Railway CLI with service selection)
# railway service auth-service

# Core Configuration
railway variables set NODE_ENV=production
railway variables set PORT=4001
railway variables set SERVICE_NAME=auth-service

# Database Configuration  
railway variables set DATABASE_URL="postgresql://postgres.abolggvrzyklywnimwan:EPJXgq6%2Fk7HaH%2FP@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
railway variables set DIRECT_URL="postgresql://postgres.abolggvrzyklywnimwan:EPJXgq6%2Fk7HaH%2FP@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# RabbitMQ
railway variables set RABBITMQ_URL="amqps://mahifqgz:UTImWgOvCaa-95mb9DZL4X83mydMV9qt@armadillo.rmq.cloudamqp.com/mahifqgz"

# JWT Configuration (CRITICAL - Must match API Gateway)
railway variables set JWT_SECRET="50brains-prod-jwt-secret-a8f9d2e1c4b7a3f6d9e2c5b8a1f4d7e0c3b6d9e2f5a8c1b4d7e0a3f6c9b2e5a8"
railway variables set JWT_REFRESH_SECRET="50brains-prod-refresh-secret-f4d7e0a1c8b5d2e9f6a3c0b7d4e1a8f5c2b9d6e3a0f7c4b1d8e5a2b9c6d3e0f7"
railway variables set SESSION_SECRET="50brains-prod-session-secret-c0b7d4e1a8f5c2b9d6e3a0f7c4b1d8e5a2f9c6b3d0e7a4f1c8b5d2e9f6a3c0b7"

# JWT Token Expiry
railway variables set JWT_EXPIRES_IN=15m
railway variables set JWT_REFRESH_EXPIRES_IN=7d

# Cookie Configuration (THE FIX for cross-origin refresh tokens)
railway variables set ALLOW_CROSS_ORIGIN_COOKIES=true
railway variables set ALLOW_INSECURE_COOKIES=true
railway variables set COOKIE_DOMAIN=""

# Security Configuration
railway variables set BCRYPT_ROUNDS=12
railway variables set RATE_LIMIT_WINDOW_MS=900000
railway variables set RATE_LIMIT_MAX_REQUESTS=1000

# CORS Configuration for Auth Service
railway variables set CORS_CREDENTIALS=true
railway variables set CORS_ORIGINS="http://localhost:5173,http://localhost:5174,https://50brains.vercel.app,https://50brains.com,https://www.50brains.com,https://app.50brains.com"

# Monitoring
railway variables set ENABLE_MONITORING=true
railway variables set HEALTH_CHECK_TIMEOUT=5000
railway variables set LOG_LEVEL=info

Write-Host "Auth Service variables set successfully!" -ForegroundColor Green
Write-Host "Now restart the Auth Service on Railway." -ForegroundColor Yellow