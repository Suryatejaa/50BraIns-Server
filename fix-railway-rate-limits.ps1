# Fix Railway Rate Limits - Emergency Update
Write-Host "🚨 Fixing Railway rate limits for immediate relief..." -ForegroundColor Red

# Update rate limits to be much more permissive
Write-Host "Setting AUTH_RATE_LIMIT_MAX to 5000..." -ForegroundColor Yellow
railway variables set AUTH_RATE_LIMIT_MAX=5000

Write-Host "Setting GLOBAL_RATE_LIMIT_MAX to 10000..." -ForegroundColor Yellow
railway variables set GLOBAL_RATE_LIMIT_MAX=10000

# Also add the cookie configuration variables if not already set
Write-Host "Adding missing cookie configuration variables..." -ForegroundColor Yellow
railway variables set ALLOW_CROSS_ORIGIN_COOKIES=true
railway variables set ALLOW_INSECURE_COOKIES=true
railway variables set COOKIE_DOMAIN=""

# JWT expiry settings
railway variables set JWT_EXPIRES_IN=15m
railway variables set JWT_REFRESH_EXPIRES_IN=7d

Write-Host "✅ Rate limits updated!" -ForegroundColor Green
Write-Host "🔄 Please restart your Railway services now:" -ForegroundColor Cyan
Write-Host "   1. Restart API Gateway" -ForegroundColor White
Write-Host "   2. Restart Auth Service" -ForegroundColor White
Write-Host "   3. Wait 2-3 minutes for deployment" -ForegroundColor White
Write-Host "   4. Try login again" -ForegroundColor White

# Show current variables for verification
Write-Host "`n📋 Current rate limit variables:" -ForegroundColor Cyan
railway variables | Select-String "RATE_LIMIT"