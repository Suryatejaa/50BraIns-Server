# Disable Railway Git Auto-Deployment
Write-Host "Disabling Railway Git Auto-Deployment" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

Write-Host ""
Write-Host "The build error you're seeing is from git auto-deployment, not CLI deployment." -ForegroundColor Red
Write-Host "Railway is still connected to your git repository and trying to build on every push." -ForegroundColor Red

Write-Host ""
Write-Host "To fix this, you need to:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Go to Railway Dashboard:" -ForegroundColor White
Write-Host "   https://railway.app/project/6199170c-d7c9-4e43-970d-076890dd893c" -ForegroundColor Gray
Write-Host ""
Write-Host "2. For EACH service (api-gateway, auth-service, etc.):" -ForegroundColor White
Write-Host "   - Click on the service" -ForegroundColor Gray
Write-Host "   - Go to Settings tab" -ForegroundColor Gray
Write-Host "   - Go to 'Source' section" -ForegroundColor Gray
Write-Host "   - Click 'Disconnect' to disconnect from GitHub" -ForegroundColor Gray
Write-Host "   OR" -ForegroundColor Yellow
Write-Host "   - Disable 'Auto Deploy' toggle" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Alternative - Use Railway CLI to disconnect:" -ForegroundColor White
Write-Host ""

$services = @(
    "api-gateway",
    "auth-service", 
    "user-service",
    "gig-service",
    "notification-service",
    "websocket-gateway"
)

foreach ($service in $services) {
    Write-Host "   railway service disconnect $service" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "After disconnecting from git:" -ForegroundColor Green
Write-Host "   - No more automatic builds on git push" -ForegroundColor White
Write-Host "   - Only CLI deployments will work" -ForegroundColor White
Write-Host "   - Use .\deploy-service.ps1 [service] to deploy" -ForegroundColor White

Write-Host ""
Write-Host "Current Status:" -ForegroundColor Blue
Write-Host "   CLI Deployment: WORKING (Railpack)" -ForegroundColor Green
Write-Host "   Git Deployment: FAILING (looking for wrong paths)" -ForegroundColor Red
Write-Host ""
Write-Host "Solution: Disable git deployment, use CLI only!" -ForegroundColor Yellow