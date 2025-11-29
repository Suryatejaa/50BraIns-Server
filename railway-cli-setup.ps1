# Railway CLI Independent Service Deployment Setup
Write-Host "Railway CLI Service Setup" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

# Function to connect a service to Railway CLI
function Connect-RailwayService {
    param(
        [string]$ServicePath,
        [string]$ServiceName
    )
    
    Write-Host ""
    Write-Host "Setting up $ServiceName..." -ForegroundColor Cyan
    
    if (Test-Path $ServicePath) {
        Push-Location $ServicePath
        
        Write-Host "   Current directory: $(Get-Location)" -ForegroundColor Gray
        Write-Host "   Run this command:" -ForegroundColor Yellow
        Write-Host "   railway link" -ForegroundColor White
        Write-Host "   Then select your $ServiceName from the list" -ForegroundColor Gray
        
        Pop-Location
    } else {
        Write-Host "   ❌ Path not found: $ServicePath" -ForegroundColor Red
    }
}

# Function to show deployment commands
function Show-IndependentDeployCommands {
    Write-Host ""
    Write-Host "Independent Deployment Commands:" -ForegroundColor Green
    Write-Host ""
    
    $services = @(
        @{ Path = "api-gateway"; Name = "API Gateway"; Port = "3000" },
        @{ Path = "services\auth-service"; Name = "Auth Service"; Port = "4001" },
        @{ Path = "services\user-service"; Name = "User Service"; Port = "4003" },
        @{ Path = "services\gig-service"; Name = "Gig Service"; Port = "4002" },
        @{ Path = "services\notification-service"; Name = "Notification Service"; Port = "4004" },
        @{ Path = "services\websocket-gateway"; Name = "WebSocket Gateway"; Port = "4005" }
    )
    
    foreach ($service in $services) {
        Write-Host "🔹 $($service.Name) (Port $($service.Port)):" -ForegroundColor Cyan
        Write-Host "   cd $($service.Path)" -ForegroundColor White
        Write-Host "   railway up" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Function to disable auto-deploy
function Disable-AutoDeploy {
    Write-Host ""
    Write-Host "Disable Auto-Deploy Instructions:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "For each service in Railway Dashboard:" -ForegroundColor Gray
    Write-Host "   1. Go to service Settings" -ForegroundColor White
    Write-Host "   2. Go to 'Source' tab" -ForegroundColor White
    Write-Host "   3. Disconnect the GitHub repository" -ForegroundColor White
    Write-Host "   4. Or disable 'Auto Deploy' option" -ForegroundColor White
    Write-Host ""
    Write-Host "This prevents automatic deployment on git push" -ForegroundColor Gray
}

# Main execution
Write-Host "Setting up Railway CLI for independent deployments..." -ForegroundColor Blue

# Show services to connect
Write-Host ""
Write-Host "Services to connect to Railway CLI:" -ForegroundColor Yellow

$services = @(
    @{ Path = "api-gateway"; Name = "API Gateway" },
    @{ Path = "services\auth-service"; Name = "Auth Service" },
    @{ Path = "services\user-service"; Name = "User Service" },
    @{ Path = "services\gig-service"; Name = "Gig Service" },
    @{ Path = "services\notification-service"; Name = "Notification Service" },
    @{ Path = "services\websocket-gateway"; Name = "WebSocket Gateway" }
)

foreach ($service in $services) {
    Connect-RailwayService -ServicePath $service.Path -ServiceName $service.Name
}

Disable-AutoDeploy
Show-IndependentDeployCommands

Write-Host ""
Write-Host "Setup Steps:" -ForegroundColor Green
Write-Host "   1. Install Railway CLI: npm install -g @railway/cli" -ForegroundColor White
Write-Host "   2. Login: railway login" -ForegroundColor White
Write-Host "   3. Link each service directory to its Railway service" -ForegroundColor White
Write-Host "   4. Disable auto-deploy in Railway dashboard" -ForegroundColor White
Write-Host "   5. Deploy independently using 'railway up'" -ForegroundColor White

Write-Host ""
Write-Host "✅ Railway CLI setup guide completed!" -ForegroundColor Green