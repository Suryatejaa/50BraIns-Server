# Quick Railway Service Deploy Script
param(
    [string]$Service = "all"
)

$services = @{
    "gateway" = @{ Path = "api-gateway"; Name = "API Gateway" }
    "auth" = @{ Path = "services\auth-service"; Name = "Auth Service" }
    "user" = @{ Path = "services\user-service"; Name = "User Service" }  
    "gig" = @{ Path = "services\gig-service"; Name = "Gig Service" }
    "notification" = @{ Path = "services\notification-service"; Name = "Notification Service" }
    "websocket" = @{ Path = "services\websocket-gateway"; Name = "WebSocket Gateway" }
}

function Deploy-Service {
    param($ServiceKey)
    
    $serviceInfo = $services[$ServiceKey]
    if (-not $serviceInfo) {
        Write-Host "❌ Unknown service: $ServiceKey" -ForegroundColor Red
        return
    }
    
    Write-Host ""
    Write-Host "🚀 Deploying $($serviceInfo.Name)..." -ForegroundColor Cyan
    Write-Host "   Path: $($serviceInfo.Path)" -ForegroundColor Gray
    
    if (Test-Path $serviceInfo.Path) {
        Push-Location $serviceInfo.Path
        
        # Check if linked to Railway
        $status = railway status 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   ⚠️  Not linked to Railway. Run 'railway link' first." -ForegroundColor Yellow
            Pop-Location
            return
        }
        
        # Deploy the service
        Write-Host "   📦 Starting deployment..." -ForegroundColor Blue
        railway up --detach
        
        Pop-Location
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $($serviceInfo.Name) deployed successfully!" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $($serviceInfo.Name) deployment failed!" -ForegroundColor Red
        }
    } else {
        Write-Host "   ❌ Path not found: $($serviceInfo.Path)" -ForegroundColor Red
    }
}

# Main execution
Write-Host "Railway Independent Service Deployment" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

if ($Service -eq "all") {
    Write-Host ""
    Write-Host "Available services to deploy:" -ForegroundColor Yellow
    foreach ($key in $services.Keys) {
        Write-Host "   $key - $($services[$key].Name)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Usage examples:" -ForegroundColor Cyan
    Write-Host "   .\deploy-independent.ps1 gateway" -ForegroundColor White
    Write-Host "   .\deploy-independent.ps1 auth" -ForegroundColor White
    Write-Host "   .\deploy-independent.ps1 gig" -ForegroundColor White
} else {
    Deploy-Service $Service
}

Write-Host ""
Write-Host "To link a service to Railway:" -ForegroundColor Blue
Write-Host "   cd [service-directory]" -ForegroundColor White
Write-Host "   railway link" -ForegroundColor White
Write-Host "   [Select your project and service]" -ForegroundColor Gray