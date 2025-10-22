# Railway Environment Variables Update Script
# Run this script to add the missing variables for refresh token fix

Write-Host "Adding missing Railway environment variables for refresh token fix..." -ForegroundColor Green

# Cookie Configuration Variables (Critical for refresh token fix)
railway variables set ALLOW_CROSS_ORIGIN_COOKIES=true
railway variables set ALLOW_INSECURE_COOKIES=true
railway variables set COOKIE_DOMAIN=""

# JWT Token Expiry Configuration
railway variables set JWT_EXPIRES_IN=15m
railway variables set JWT_REFRESH_EXPIRES_IN=7d

# Update Rate Limits to be more permissive for development
railway variables set AUTH_RATE_LIMIT_MAX=5000
railway variables set GLOBAL_RATE_LIMIT_MAX=10000

# Additional Missing Service URLs
railway variables set CLAN_SERVICE_URL="http://clan-service.railway.internal:4003"
railway variables set CREDIT_SERVICE_URL="http://credit-service.railway.internal:4005"
railway variables set SOCIAL_MEDIA_SERVICE_URL="http://social-media-service.railway.internal:4008"

# Security Configuration
railway variables set RATE_LIMIT_WINDOW_MS=900000
railway variables set RATE_LIMIT_MAX_REQUESTS=1000

Write-Host "Environment variables added successfully!" -ForegroundColor Green
Write-Host "Please restart your Railway services for changes to take effect." -ForegroundColor Yellow

# Optional: Display current variables to verify
Write-Host "`nCurrent variables (verify the new ones are present):" -ForegroundColor Cyan
railway variables