# Test Script for Railway Refresh Token Fix
Write-Host "Testing Railway Refresh Token Mechanism..." -ForegroundColor Green

# Test URLs - Update these with your actual Railway URLs
$API_GATEWAY_URL = "https://api-gateway-production-c8bc.up.railway.app"
$AUTH_SERVICE_URL = "https://auth-service-production-XXXX.up.railway.app"

Write-Host "`n1. Testing CORS preflight for refresh endpoint..." -ForegroundColor Cyan

# Test CORS preflight
$corsTest = curl -X OPTIONS "$API_GATEWAY_URL/api/auth/refresh" `
    -H "Origin: http://localhost:5174" `
    -H "Access-Control-Request-Method: POST" `
    -H "Access-Control-Request-Headers: Content-Type" `
    -v 2>&1

Write-Host "CORS Test Result:" -ForegroundColor Yellow
Write-Host $corsTest

Write-Host "`n2. Testing auth service health..." -ForegroundColor Cyan

# Test health endpoint
$healthTest = curl "$API_GATEWAY_URL/api/auth/health" -v 2>&1
Write-Host "Health Test Result:" -ForegroundColor Yellow
Write-Host $healthTest

Write-Host "`n3. Manual refresh token test..." -ForegroundColor Cyan
Write-Host "To test refresh token manually:" -ForegroundColor Yellow
Write-Host "1. Login through your frontend (localhost:5174)" -ForegroundColor White
Write-Host "2. Check browser dev tools -> Application -> Cookies" -ForegroundColor White
Write-Host "3. Look for 'refreshToken' cookie from your Railway domain" -ForegroundColor White
Write-Host "4. Use the following curl command with the actual token:" -ForegroundColor White

Write-Host "`nCurl command template:" -ForegroundColor Cyan
Write-Host "curl -X POST $API_GATEWAY_URL/api/auth/refresh \" -ForegroundColor Gray
Write-Host "  -H 'Content-Type: application/json' \" -ForegroundColor Gray
Write-Host "  -H 'Origin: http://localhost:5174' \" -ForegroundColor Gray
Write-Host "  -b 'refreshToken=YOUR_ACTUAL_REFRESH_TOKEN_HERE' \" -ForegroundColor Gray
Write-Host "  -v" -ForegroundColor Gray

Write-Host "`n4. Environment variables check..." -ForegroundColor Cyan
Write-Host "Make sure these variables are set on Railway:" -ForegroundColor Yellow
Write-Host "✓ ALLOW_CROSS_ORIGIN_COOKIES=true" -ForegroundColor Green
Write-Host "✓ ALLOW_INSECURE_COOKIES=true" -ForegroundColor Green  
Write-Host "✓ CORS_CREDENTIALS=true" -ForegroundColor Green
Write-Host "✓ CORS_ORIGINS includes http://localhost:5174" -ForegroundColor Green
Write-Host "✓ AUTH_RATE_LIMIT_MAX >= 5000" -ForegroundColor Green

Write-Host "`n5. Expected success indicators:" -ForegroundColor Cyan
Write-Host "✓ No CORS errors in browser console" -ForegroundColor Green
Write-Host "✓ Response includes Access-Control-Allow-Credentials: true" -ForegroundColor Green
Write-Host "✓ Response includes Set-Cookie headers" -ForegroundColor Green
Write-Host "✓ Status 200 with new access token" -ForegroundColor Green

Write-Host "`nTest completed. Check the results above." -ForegroundColor Green