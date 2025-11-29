# 🚂 Railway Deployment Guide for 50BraIns Microservices

## 🚨 **SOLUTION FOR THE BUILD ERROR**

The issue `failed to read dockerfile: open api-gateway/Dockerfile: no such file or directory` occurs because Railway is trying to build from the wrong directory. Here's how to fix it:

## 🔧 **Fixed Configuration**

### 1. **Individual Service Deployment**

Each service now has its own `railway.toml` in its directory:

```
📁 50BraIns-Server/
├── 📁 api-gateway/
│   ├── Dockerfile ✅
│   └── railway.toml ✅
├── 📁 services/
│   ├── 📁 auth-service/
│   │   ├── Dockerfile ✅
│   │   └── railway.toml ✅
│   ├── 📁 gig-service/
│   │   ├── Dockerfile ✅
│   │   └── railway.toml ✅
│   └── 📁 user-service/
│       ├── Dockerfile ✅
│       └── railway.toml ✅
```

### 2. **Deployment Methods**

#### **Option A: Automated Script (Recommended)**
```powershell
# Deploy all services
.\deploy-railway.ps1 -All

# Deploy core services only
.\deploy-railway.ps1 -Core

# Deploy specific service
.\deploy-railway.ps1 -Service gig-service
```

#### **Option B: Manual Railway CLI**
```bash
# Deploy API Gateway
cd api-gateway
railway up

# Deploy Auth Service
cd services/auth-service
railway up

# Deploy Gig Service
cd services/gig-service
railway up

# Deploy User Service
cd services/user-service
railway up
```

#### **Option C: Railway Dashboard**
1. Create separate Railway projects for each service
2. Connect each project to the specific subdirectory
3. Set build settings:
   - **Root Directory**: `api-gateway` (for API Gateway)
   - **Root Directory**: `services/auth-service` (for Auth Service)
   - **Root Directory**: `services/gig-service` (for Gig Service)
   - etc.

## 🏗️ **Build Process Improvements**

### Enhanced Dockerfiles
- ✅ Include `npm run build` during Docker build
- ✅ Validate environment and syntax
- ✅ Generate Prisma clients safely
- ✅ Optimize for production (remove dev dependencies)

### Build Steps in Each Dockerfile:
```dockerfile
# Install all dependencies first
RUN npm ci

# Copy source code
COPY src ./src/
COPY prisma ./prisma/

# Run our new build process
RUN npm run build:production

# Remove dev dependencies for smaller image
RUN npm ci --only=production
```

## 🎯 **Quick Fix Steps**

### 1. **For Existing Railway Projects:**
```bash
# Update build settings in Railway dashboard
Root Directory: api-gateway          # For API Gateway project
Root Directory: services/auth-service # For Auth Service project
Root Directory: services/gig-service  # For Gig Service project
```

### 2. **For New Deployments:**
```powershell
# Use the deployment script
.\deploy-railway.ps1 -Core
```

### 3. **Environment Variables (Set these in Railway):**
```bash
# Required for all services
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-jwt-secret

# Service-specific
RAZORPAY_KEY_ID=rzp_...        # For gig-service
RAZORPAY_KEY_SECRET=...        # For gig-service
CLOUDINARY_URL=cloudinary://... # For auth-service
```

## 🔍 **Troubleshooting**

### Build Error: "No such file or directory"
- **Cause**: Railway looking in wrong directory
- **Fix**: Set correct root directory or use deployment scripts

### Build Error: "npm run build not found"
- **Cause**: Old package.json without build scripts
- **Fix**: Already fixed - all services now have build scripts

### Prisma Generation Errors
- **Cause**: File permission issues on Windows
- **Fix**: Using `build:prisma-safe` with graceful fallback

### Health Check Failures
- **Cause**: Wrong port or missing `/health` endpoint
- **Fix**: Ensure each service exposes correct port and health endpoint

## 📊 **Service Status**

| Service | Port | Status | Railway Config |
|---------|------|--------|----------------|
| API Gateway | 3000 | ✅ Ready | `api-gateway/railway.toml` |
| Auth Service | 4001 | ✅ Ready | `services/auth-service/railway.toml` |
| Gig Service | 4002 | ✅ Ready | `services/gig-service/railway.toml` |
| User Service | 4003 | ✅ Ready | `services/user-service/railway.toml` |
| Notification Service | 4004 | ✅ Ready | `services/notification-service/railway.toml` |
| WebSocket Gateway | 4005 | ✅ Ready | `services/websocket-gateway/railway.toml` |

## 🚀 **Next Steps**

1. **Deploy core services first:**
   ```powershell
   .\deploy-railway.ps1 -Core
   ```

2. **Set environment variables in Railway dashboard**

3. **Test each service health endpoint:**
   ```
   https://your-api-gateway.railway.app/health
   https://your-auth-service.railway.app/health
   ```

4. **Deploy remaining services:**
   ```powershell
   .\deploy-railway.ps1 -Service notification-service
   .\deploy-railway.ps1 -Service websocket-gateway
   ```

## 🎉 **Benefits of New Setup**

- ✅ **Build Validation**: Catch errors before deployment
- ✅ **Individual Deployments**: Deploy services independently  
- ✅ **Automated Scripts**: Easy deployment with PowerShell script
- ✅ **Production Optimized**: Smaller Docker images
- ✅ **Health Checks**: Better monitoring and reliability
- ✅ **Prisma Safety**: Handles Windows file lock issues

Your Railway deployment errors should now be completely resolved! 🎯