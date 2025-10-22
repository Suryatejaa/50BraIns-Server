# Railway Environment Setup Instructions

## Problem Summary
The refresh token mechanism works locally but fails on Railway due to:
1. **JWT Secret Mismatch**: Local uses dev secrets, Railway uses production secrets
2. **Cookie Security**: Railway's `secure=true` and `sameSite=strict` block localhost requests
3. **Cross-Origin Issues**: Browser blocks cookies between HTTPS (Railway) and HTTP (localhost)

## Solution Applied

### 1. Updated Auth Service Cookie Configuration
- Modified `services/auth-service/src/controllers/auth.controller.js`
- Added conditional cookie settings based on environment variables:
  - `ALLOW_CROSS_ORIGIN_COOKIES=true` → `sameSite=none` (allows cross-origin)
  - `ALLOW_INSECURE_COOKIES=true` → `secure=false` (allows HTTP localhost)

### 2. Created Railway Environment Configuration
- File: `railway-env-updated.txt`
- Contains all necessary environment variables for cross-origin development

## Railway Setup Steps

### Step 1: Update Auth Service Environment Variables
Set these variables in your Railway Auth Service:

```bash
# Core Configuration
NODE_ENV=production
PORT=4001

# Database (your existing connection)
DATABASE_URL="postgresql://postgres.qicmqmstnpzunoomyxhu:MSvz7VNg9jz18iY4@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.qicmqmstnpzunoomyxhu:MSvz7VNg9jz18iY4@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# JWT Secrets (your existing production secrets)
JWT_SECRET=a8f9d2e1c4b7a3f6d9e2c5b8a1f4d7e0c3b6d9e2f5a8c1b4d7e0a3f6c9b2e5a8
JWT_REFRESH_SECRET=f4d7e0a1c8b5d2e9f6a3c0b7d4e1a8f5c2b9d6e3a0f7c4b1d8e5a2b9c6d3e0f7

# Cookie Configuration for Cross-Origin Development
ALLOW_CROSS_ORIGIN_COOKIES=true
ALLOW_INSECURE_COOKIES=true
COOKIE_DOMAIN=

# CORS Configuration
CORS_CREDENTIALS=true
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,https://50brains.vercel.app

# RabbitMQ
RABBITMQ_URL=amqps://mahifqgz:UTImWgOvCaa-95mb9DZL4X83mydMV9qt@armadillo.rmq.cloudamqp.com/mahifqgz
```

### Step 2: Update API Gateway Environment Variables
Set these variables in your Railway API Gateway:

```bash
# CORS Configuration
CORS_CREDENTIALS=true
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,https://50brains.vercel.app,https://50brains.com,https://www.50brains.com,https://app.50brains.com

# Rate Limiting (more permissive for development)
GLOBAL_RATE_LIMIT_MAX=10000
AUTH_RATE_LIMIT_MAX=5000

# JWT Secrets (must match auth service)
JWT_SECRET=a8f9d2e1c4b7a3f6d9e2c5b8a1f4d7e0c3b6d9e2f5a8c1b4d7e0a3f6c9b2e5a8
JWT_REFRESH_SECRET=f4d7e0a1c8b5d2e9f6a3c0b7d4e1a8f5c2b9d6e3a0f7c4b1d8e5a2b9c6d3e0f7
```

### Step 3: Restart Services
1. Restart Auth Service on Railway
2. Restart API Gateway on Railway
3. Wait for deployments to complete

### Step 4: Test the Fix
1. Clear browser cookies for your frontend
2. Login through your frontend (localhost:5174)
3. Wait for access token to expire (15 minutes) or manually test refresh
4. Verify that refresh tokens work without CORS errors

## Security Notes

⚠️ **Important**: These settings are for development testing only!

- `ALLOW_CROSS_ORIGIN_COOKIES=true` allows cookies to be sent cross-origin
- `ALLOW_INSECURE_COOKIES=true` allows cookies over HTTP (localhost)
- For production frontends on HTTPS domains, set both to `false`

## Alternative Solutions

If you prefer not to compromise security settings:

### Option 1: Use localStorage Instead of Cookies
Modify frontend to store tokens in localStorage and send via Authorization header

### Option 2: Development Domain
Set up a development subdomain that uses HTTPS:
- `https://dev.50brains.com` 
- Point to localhost via /etc/hosts or local DNS

### Option 3: Token Bridge
Create a simple token exchange endpoint that converts between development and production secrets

## Verification Commands

Test the refresh endpoint:
```bash
# After login, extract refresh token from response and test:
curl -X POST https://your-auth-service.railway.app/api/auth/refresh \
  -H "Content-Type: application/json" \
  -b "refreshToken=YOUR_REFRESH_TOKEN" \
  -d '{}'
```

Check CORS headers:
```bash
curl -X OPTIONS https://your-api-gateway.railway.app/api/auth/refresh \
  -H "Origin: http://localhost:5174" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

The fix should resolve the refresh token mechanism while maintaining reasonable security for a development environment.