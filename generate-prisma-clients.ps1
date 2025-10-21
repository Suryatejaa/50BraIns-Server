# Prisma Generate Script - PowerShell Version
# Regenerate Prisma clients for all services after schema changes

Write-Host "Starting Prisma client generation for all services..." -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Array of service directories
$services = @(
    "auth-service",
    "user-service", 
    "gig-service",
    "clan-service",
    "credit-service",
    "notification-service",
    "reputation-service",
    "work-history-service",
    "social-media-service"
)

# Initialize counters
$totalServices = $services.Count
$currentService = 0
$failedServices = @()
$successfulServices = @()

# Function to generate Prisma client for a service
function Invoke-PrismaGenerate {
    param(
        [string]$ServiceName,
        [int]$Index,
        [int]$Total
    )
    
    $servicePath = "services\$ServiceName"
    
    Write-Host ""
    Write-Host "[$($Index + 1)/$Total] Generating Prisma client for $ServiceName..." -ForegroundColor Yellow
    
    # Check if service directory exists
    if (-not (Test-Path $servicePath)) {
        Write-Host "Service directory not found: $servicePath" -ForegroundColor Red
        return @{ Success = $false; Error = "Directory not found" }
    }
    
    # Check if schema file exists
    $schemaPath = "$servicePath\prisma\schema.prisma"
    if (-not (Test-Path $schemaPath)) {
        Write-Host "Schema file not found: $schemaPath" -ForegroundColor Red
        return @{ Success = $false; Error = "Schema file not found" }
    }
    
    # Save current location
    $originalLocation = Get-Location
    
    try {
        # Change to service directory
        Set-Location $servicePath
        
        # Run prisma generate
        $result = & npx prisma generate 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully generated Prisma client for $ServiceName" -ForegroundColor Green
            return @{ Success = $true; Error = $null }
        } else {
            Write-Host "Failed to generate Prisma client for $ServiceName" -ForegroundColor Red
            Write-Host "Error output: $result" -ForegroundColor Red
            return @{ Success = $false; Error = "Generation failed: $result" }
        }
    }
    catch {
        Write-Host "Exception occurred while generating Prisma client for $ServiceName" -ForegroundColor Red
        Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Red
        return @{ Success = $false; Error = "Exception: $($_.Exception.Message)" }
    }
    finally {
        # Return to original location
        Set-Location $originalLocation
    }
}

# Main execution
Write-Host "Starting Prisma client generation..." -ForegroundColor Cyan
Write-Host ""

for ($i = 0; $i -lt $services.Count; $i++) {
    $service = $services[$i]
    $result = Invoke-PrismaGenerate -ServiceName $service -Index $i -Total $totalServices
    
    if ($result.Success) {
        $successfulServices += $service
    } else {
        $failedServices += @{ Service = $service; Error = $result.Error }
    }
    
    $currentService++
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Prisma client generation completed!" -ForegroundColor Cyan
Write-Host ""

# Summary
$successfulCount = $successfulServices.Count
$failedCount = $failedServices.Count

Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Successful: $successfulCount/$totalServices services" -ForegroundColor Green
Write-Host "  Failed: $failedCount/$totalServices services" -ForegroundColor $(if ($failedCount -gt 0) { "Red" } else { "Green" })

if ($failedCount -gt 0) {
    Write-Host ""
    Write-Host "Failed services:" -ForegroundColor Red
    foreach ($failure in $failedServices) {
        Write-Host "  - $($failure.Service): $($failure.Error)" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please check the errors above and fix any issues before running again." -ForegroundColor Yellow
    Write-Host "You can also run 'npx prisma generate' manually in each failed service directory." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host ""
    Write-Host "All Prisma clients generated successfully!" -ForegroundColor Green
    Write-Host "Your services are ready to connect to Supabase!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run the Supabase SQL script to create tables" -ForegroundColor White
    Write-Host "2. Update your .env files with Supabase connection strings" -ForegroundColor White
    Write-Host "3. Test your services with the new database setup" -ForegroundColor White
}