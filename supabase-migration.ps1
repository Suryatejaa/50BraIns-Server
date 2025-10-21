Write-Host "Starting migration to Supabase..." -ForegroundColor Green

# Get password securely
$PASSWORD = Read-Host "Enter your Supabase database password" -AsSecureString
$PLAIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($PASSWORD))
$SUPABASE_DB_URL_TEMPLATE = "postgresql://postgres:$PLAIN_PASSWORD@db.qicmqmstnpzunoomyxhu.supabase.co:5432/postgres?schema="

Write-Host "Password received. Starting migration..." -ForegroundColor Green

# List of services
$services = @(
    @{name="auth-service"},
    @{name="user-service"},
    @{name="gig-service"},
    @{name="clan-service"},
    @{name="credit-service"},
    @{name="notification-service"},
    @{name="social-media-service"},
    @{name="work-history-service"},
    @{name="reputation-service"}
)

Write-Host "Services to migrate:" -ForegroundColor Cyan
foreach ($service in $services) {
    Write-Host "  - $($service.name)" -ForegroundColor White
}

$choice = Read-Host "Continue? (y/N)"
if ($choice -ne "y" -and $choice -ne "Y") {
    Write-Host "Migration cancelled." -ForegroundColor Red
    exit
}

# Backup .env files
Write-Host "Backing up .env files..." -ForegroundColor Blue
foreach ($service in $services) {
    $servicePath = "services\$($service.name)"
    if (Test-Path "$servicePath\.env") {
        Copy-Item "$servicePath\.env" "$servicePath\.env.backup" -Force
        Write-Host "  Backed up $($service.name)" -ForegroundColor Green
    } else {
        Write-Host "  No .env file for $($service.name)" -ForegroundColor Yellow
    }
}

# Update DATABASE_URL
Write-Host "Updating DATABASE_URL in each service..." -ForegroundColor Blue
foreach ($service in $services) {
    $servicePath = "services\$($service.name)"
    $envFile = "$servicePath\.env"
    
    if (Test-Path $envFile) {
        $content = Get-Content $envFile
        $newDatabaseUrl = "$SUPABASE_DB_URL_TEMPLATE$($service.name)"
        
        $updatedContent = $content | ForEach-Object {
            if ($_ -match "^DATABASE_URL=") {
                "DATABASE_URL=$newDatabaseUrl"
            } else {
                $_
            }
        }
        
        $updatedContent | Set-Content $envFile
        Write-Host "  Updated $($service.name)" -ForegroundColor Green
    } else {
        Write-Host "  No .env file for $($service.name)" -ForegroundColor Yellow
    }
}

# Run migrations
Write-Host "Running Prisma migrations..." -ForegroundColor Blue
foreach ($service in $services) {
    $servicePath = "services\$($service.name)"
    
    if (Test-Path "$servicePath\prisma\schema.prisma") {
        Write-Host "  Migrating $($service.name)..." -ForegroundColor Cyan
        
        Push-Location $servicePath
        
        try {
            Write-Host "    Generating Prisma client..." -ForegroundColor Gray
            npx prisma generate
            
            Write-Host "    Running migrations..." -ForegroundColor Gray
            npx prisma migrate deploy
            
            Write-Host "  Successfully migrated $($service.name)" -ForegroundColor Green
        }
        catch {
            Write-Host "  Failed to migrate $($service.name)" -ForegroundColor Red
            Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        finally {
            Pop-Location
        }
    } else {
        Write-Host "  No Prisma schema for $($service.name)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Migration completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test each service" -ForegroundColor White
Write-Host "2. Update production environment variables" -ForegroundColor White