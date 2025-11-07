# Debug Refresh Token Issue

## Current Issue Analysis
Based on the production logs, the issue is:
- ✅ Cookies are transmitted correctly
- ✅ JWT verification passes  
- ❌ Token not found in database

## Most Likely Causes

### 1. Database Connection Mismatch
- Login might be writing to different database than refresh is reading from
- Check if `DATABASE_URL` is consistent across services

### 2. Token Cleanup Job Running Too Aggressively 
- Tokens being deleted immediately after creation
- Check for automatic cleanup processes

### 3. Transaction Rollback
- Token creation might be rolling back due to error after commit

## Client-Side Debug Steps

### 1. Check Cookie Storage
```javascript
// In browser console after login
console.log('All cookies:', document.cookie);
console.log('Refresh token present:', document.cookie.includes('refreshToken'));

// Check cookie attributes
document.cookie.split(';').forEach(cookie => {
    if (cookie.includes('refreshToken')) {
        console.log('Refresh token cookie:', cookie);
    }
});
```

### 2. Test Refresh Token Immediately After Login
```javascript
// Right after successful login, try refresh
fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json'
    }
})
.then(res => res.json())
.then(data => console.log('Immediate refresh result:', data))
.catch(err => console.error('Immediate refresh error:', err));
```

### 3. Check Network Tab
- Look at login response Set-Cookie headers
- Look at refresh request Cookie headers
- Verify domain and path settings

### 4. Test Different Timing
```javascript
// Test refresh after different delays
const testRefreshAfterDelay = (delay) => {
    setTimeout(() => {
        fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
        })
        .then(res => res.json())
        .then(data => console.log(`Refresh after ${delay}ms:`, data));
    }, delay);
};

// Test immediately, after 1s, 5s, 10s
testRefreshAfterDelay(0);
testRefreshAfterDelay(1000);
testRefreshAfterDelay(5000);
testRefreshAfterDelay(10000);
```

## Expected Debug Output After Deploy

After the latest deployment, you should see in production logs:

### During Login:
```
[PROD-DEBUG] Login - Creating refresh token in database
[PROD-DEBUG] Login - Token length: 257
[PROD-DEBUG] Login - User ID: user-id-here
[PROD-DEBUG] Login - Token record created with ID: record-id
[PROD-DEBUG] Login - Token stored successfully
```

### During Refresh:
```
[PROD-DEBUG] Auth Service - Database URL prefix: postgresql://...
[PROD-DEBUG] Auth Service - Token record found: true/false
[PROD-DEBUG] Auth Service - Total refresh tokens in DB: number
[PROD-DEBUG] Auth Service - User exists: true/false
```

## Next Steps Based on Logs

1. **If login shows token creation but refresh shows count=0**:
   - Database transaction rollback issue
   - Check for errors after token creation

2. **If login shows token creation and refresh shows count>0 but token not found**:
   - Token mismatch (encoding/special characters)
   - Database connection pointing to different instance

3. **If user doesn't exist during refresh**:
   - JWT contains wrong user ID
   - Database user table sync issue

## Quick Fixes to Try

### Fix 1: Force Database Sync
In production console:
```sql
SELECT COUNT(*) FROM "authRefreshTokens";
SELECT * FROM "authRefreshTokens" ORDER BY "createdAt" DESC LIMIT 5;
```

### Fix 2: Test with Manual Token
Create a simple test endpoint that creates and immediately looks up a token.