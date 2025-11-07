# Production Refresh Token Fix Guide

## 🔧 **Cookie Configuration Issues Fixed**

### **Environment Variables Required**

Add these to your production environment:

```bash
# Cookie Domain Configuration
COOKIE_DOMAIN=.50brains.in  # Or your actual domain

# Ensure these are set correctly
NODE_ENV=production
```

### **Common Production Issues & Solutions**

#### **1. Domain Mismatch**
```bash
# If your production domain is different:
COOKIE_DOMAIN=.yourdomain.com
# OR remove domain restriction entirely:
COOKIE_DOMAIN=
```

#### **2. HTTPS Requirements**
- Ensure your production site uses HTTPS
- `secure: true` requires HTTPS connection
- `sameSite: 'none'` requires HTTPS

#### **3. Railway/Vercel/Netlify Deployment**
```bash
# For Railway:
COOKIE_DOMAIN=.railway.app
# OR leave empty for automatic domain detection
COOKIE_DOMAIN=

# For custom domains:
COOKIE_DOMAIN=.yourdomain.com
```

### **Debugging Production Issues**

#### **Check Cookie Logs**
Look for these console outputs in production:
```
🍪 Cookie Configuration: { domain: '.50brains.in', secure: true, ... }
🍪 Login cookies set: { refreshTokenCookie: 'Set', ... }
🔄 Refresh Token Debug: { cookieNames: ['refreshToken', 'accessToken'], ... }
```

#### **If Cookies Are Missing**
1. **Domain Issue**: Check `actualDomain` vs `domain` in logs
2. **HTTPS Issue**: Verify `secure: true` with HTTPS connection
3. **SameSite Issue**: Cross-origin requests need `sameSite: 'none'`

#### **Browser Developer Tools**
1. Open DevTools → Application → Cookies
2. Check if `refreshToken` cookie exists
3. Verify domain and secure flags

### **Quick Fixes**

#### **Fix 1: Remove Domain Restriction**
```bash
COOKIE_DOMAIN=
```

#### **Fix 2: Allow HTTP in Production (if needed)**
```javascript
secure: false  // Only if you can't use HTTPS
```

#### **Fix 3: Use Lax SameSite**
```javascript
sameSite: 'lax'  // If cross-origin isn't needed
```

### **Testing Commands**

#### **Test Cookie Setting**
```bash
curl -X POST https://your-api.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}' \
  -c cookies.txt -v
```

#### **Test Cookie Reading**
```bash
curl -X POST https://your-api.com/auth/refresh \
  -b cookies.txt -v
```

### **Railway Environment Setup**
```bash
# Set in Railway environment variables
railway variables set COOKIE_DOMAIN=.railway.app
railway variables set NODE_ENV=production
```

## 🚀 **Updated Code Features**

✅ **Configurable cookie domain** via `COOKIE_DOMAIN` env var
✅ **Enhanced debugging** with host/origin logging  
✅ **Consistent cookie options** across login/refresh/register
✅ **Production-safe defaults** with fallbacks

The refresh token should now work correctly in production!