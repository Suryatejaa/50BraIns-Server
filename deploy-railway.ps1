# 50BraIns Railway Deployment Script (PowerShell)
param(
    [string]$Service = "",
    [switch]$All = $false,
    [switch]$Core = $false
)

Write-Host "50BraIns Railway Deployment Script" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Function to deploy a service
function Deploy-Service {
    param(
        [string]$ServiceName,
        [string]$ServicePath
    )
    
    Write-Host ""
    Write-Host "Deploying $ServiceName..." -ForegroundColor Blue
    Write-Host "   Path: $ServicePath" -ForegroundColor Gray
    
    Push-Location $ServicePath
    
    # Check if railway.toml exists
    if (!(Test-Path "railway.toml")) {
        Write-Host "No railway.toml found in $ServicePath" -ForegroundColor Red
        Pop-Location
        return $false
    }
    
    # Check if Dockerfile exists
    if (!(Test-Path "Dockerfile")) {
        Write-Host "No Dockerfile found in $ServicePath" -ForegroundColor Red
        Pop-Location
        return $false
    }
    
    # Deploy to Railway
    Write-Host "   Deploying $ServiceName to Railway..." -ForegroundColor Yellow
    try {
        railway up
        Write-Host "   $ServiceName deployed successfully!" -ForegroundColor Green
        Pop-Location
        return $true
    }
    catch {
        Write-Host "   Failed to deploy $ServiceName : $_" -ForegroundColor Red
        Pop-Location
        return $false
    }
}

# Check if Railway CLI is installed
try {
    $railwayVersion = railway --version 2>$null
    if (!$railwayVersion) {
        throw "Railway CLI not found"
    }
}
catch {
    Write-Host "Railway CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g @railway/cli" -ForegroundColor Yellow
    Write-Host "   railway login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Checking Railway authentication..." -ForegroundColor Blue
try {
    railway whoami
}
catch {
    Write-Host "Not authenticated with Railway. Please run: railway login" -ForegroundColor Red
    exit 1
}

# Service deployment logic
if ($All) {
    Write-Host ""
    Write-Host "Deploying all services..." -ForegroundColor Green
    
    $services = @(
        @("API Gateway", "api-gateway"),
        @("Auth Service", "services\auth-service"),
        @("Gig Service", "services\gig-service"),
        @("User Service", "services\user-service"),
        @("Notification Service", "services\notification-service"),
        @("WebSocket Gateway", "services\websocket-gateway")
    )
    
    $success = $true
    foreach ($service in $services) {
        if (!(Deploy-Service $service[0] $service[1])) {
            $success = $false
        }
    }
    
    if ($success) {
        Write-Host ""
        Write-Host "All services deployed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Some services failed to deploy. Check logs above." -ForegroundColor Yellow
    }
}
elseif ($Core) {
    Write-Host ""
    Write-Host "Deploying core services..." -ForegroundColor Green
    
    $coreServices = @(
        @("API Gateway", "api-gateway"),
        @("Auth Service", "services\auth-service"),
        @("Gig Service", "services\gig-service"),
        @("User Service", "services\user-service")
    )
    
    $success = $true
    foreach ($service in $coreServices) {
        if (!(Deploy-Service $service[0] $service[1])) {
            $success = $false
        }
    }
    
    if ($success) {
        Write-Host ""
        Write-Host "Core services deployed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Some core services failed to deploy. Check logs above." -ForegroundColor Yellow
    }
}
elseif ($Service) {
    $serviceMap = @{
        "api-gateway" = @("API Gateway", "api-gateway")
        "auth-service" = @("Auth Service", "services\auth-service")
        "gig-service" = @("Gig Service", "services\gig-service")
        "user-service" = @("User Service", "services\user-service")
        "notification-service" = @("Notification Service", "services\notification-service")
        "websocket-gateway" = @("WebSocket Gateway", "services\websocket-gateway")
    }
    
    if ($serviceMap.ContainsKey($Service)) {
        $serviceInfo = $serviceMap[$Service]
        Deploy-Service $serviceInfo[0] $serviceInfo[1]
    } else {
        Write-Host "Invalid service name. Available services:" -ForegroundColor Red
        $serviceMap.Keys | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
    }
}
else {
    Write-Host ""
    Write-Host "Usage examples:" -ForegroundColor Yellow
    Write-Host "   .\deploy-railway.ps1 -All                    # Deploy all services" -ForegroundColor Gray
    Write-Host "   .\deploy-railway.ps1 -Core                   # Deploy core services only" -ForegroundColor Gray
    Write-Host "   .\deploy-railway.ps1 -Service api-gateway    # Deploy specific service" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Available services:" -ForegroundColor Yellow
    Write-Host "   - api-gateway" -ForegroundColor Gray
    Write-Host "   - auth-service" -ForegroundColor Gray
    Write-Host "   - gig-service" -ForegroundColor Gray
    Write-Host "   - user-service" -ForegroundColor Gray
    Write-Host "   - notification-service" -ForegroundColor Gray
    Write-Host "   - websocket-gateway" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Deployment script completed!" -ForegroundColor Green