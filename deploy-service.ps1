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
        Write-Host "Unknown service: $ServiceKey" -ForegroundColor Red
        return
    }
    
    Write-Host ""
    Write-Host "Deploying $($serviceInfo.Name)..." -ForegroundColor Cyan
    Write-Host "   Path: $($serviceInfo.Path)" -ForegroundColor Gray
    
    if (Test-Path $serviceInfo.Path) {
        Push-Location $serviceInfo.Path
        
        Write-Host "   Starting deployment..." -ForegroundColor Blue
        $env:RAILWAY_DOCKERFILE_PATH = "Dockerfile"
        railway up --detach
        
        Pop-Location
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   $($serviceInfo.Name) deployed successfully!" -ForegroundColor Green
        } else {
            Write-Host "   $($serviceInfo.Name) deployment failed!" -ForegroundColor Red
        }
    } else {
        Write-Host "   Path not found: $($serviceInfo.Path)" -ForegroundColor Red
    }
}

Write-Host "Railway Independent Service Deployment" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

if ($Service -eq "all") {
    Write-Host ""
    Write-Host "Available services:" -ForegroundColor Yellow
    foreach ($key in $services.Keys) {
        Write-Host "   $key - $($services[$key].Name)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "Usage: .\deploy-independent.ps1 [service-name]" -ForegroundColor Cyan
} else {
    Deploy-Service $Service
}