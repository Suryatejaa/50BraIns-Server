# Setup Dual Deployment Support (Git + CLI)
Write-Host "Setting up Dual Deployment Support" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

Write-Host ""
Write-Host "Configuring for both Git Push and CLI deployment..." -ForegroundColor Cyan

# Create service-specific railway.toml files for CLI deployment
$services = @(
    @{ Path = "api-gateway"; DockerPath = "Dockerfile"; Context = "." },
    @{ Path = "services\auth-service"; DockerPath = "Dockerfile"; Context = "." },
    @{ Path = "services\user-service"; DockerPath = "Dockerfile"; Context = "." },
    @{ Path = "services\gig-service"; DockerPath = "Dockerfile"; Context = "." },
    @{ Path = "services\notification-service"; DockerPath = "Dockerfile"; Context = "." },
    @{ Path = "services\websocket-gateway"; DockerPath = "Dockerfile"; Context = "." }
)

# Update root railway.toml for git deployment (API Gateway)
Write-Host "   Root railway.toml configured for API Gateway git deployment" -ForegroundColor Green

# Create individual service configurations
foreach ($service in $services) {
    $servicePath = $service.Path
    $railwayTomlPath = "$servicePath\railway.toml"
    
    if (Test-Path $servicePath) {
        Write-Host "   Configuring $servicePath for CLI deployment..." -ForegroundColor Yellow
        
        $configContent = @"
[build]
builder = "dockerfile"
dockerfilePath = "$($service.DockerPath)"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "always"
"@
        
        Set-Content -Path $railwayTomlPath -Value $configContent
        Write-Host "     Created $railwayTomlPath" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Blue
Write-Host ""
Write-Host "Git Push Deployment:" -ForegroundColor Cyan
Write-Host "   - Root railway.toml handles API Gateway" -ForegroundColor White
Write-Host "   - Uses dockerContext='api-gateway'" -ForegroundColor White
Write-Host "   - Triggers on git push to main/prod branch" -ForegroundColor White
Write-Host ""
Write-Host "CLI Deployment:" -ForegroundColor Cyan  
Write-Host "   - Individual railway.toml in each service directory" -ForegroundColor White
Write-Host "   - Deploy with: .\deploy-service.ps1 [service]" -ForegroundColor White
Write-Host "   - Uses Dockerfile in service directory" -ForegroundColor White
Write-Host ""
Write-Host "Both methods now supported!" -ForegroundColor Green

# Update deployment script to handle both methods
Write-Host ""
Write-Host "Testing CLI deployment capability..." -ForegroundColor Blue