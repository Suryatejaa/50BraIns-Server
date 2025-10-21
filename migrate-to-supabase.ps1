# Supabase Migration Script
# This script helps migrate all services from local PostgreSQL to Supabase

Write-Host "🚀 Starting migration to Supabase..." -ForegroundColor Green

# IMPORTANT: Using secure password prompt
# Option 1: Hardcode password (quick but less secure) - COMMENTED OUT
# $SUPABASE_DB_URL_TEMPLATE = "postgresql://postgres:YOUR_PASSWORD@db.qicmqmstnpzunoomyxhu.supabase.co:5432/postgres?schema="

# Option 2: Prompt for password (more secure) - ACTIVE
Write-Host "Enter your Supabase database password when prompted..." -ForegroundColor Yellow
$PASSWORD = Read-Host "Supabase Database Password" -AsSecureString
$PLAIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($PASSWORD))
$SUPABASE_DB_URL_TEMPLATE = "postgresql://postgres:$PLAIN_PASSWORD@db.qicmqmstnpzunoomyxhu.supabase.co:5432/postgres?schema="

Write-Host "Password received. Starting migration..." -ForegroundColor Green
Write-Host ""

# List of services with databases
$services = @(
    @{name="auth-service"; db="brains_auth"},
    @{name="user-service"; db="brains_user"},
    @{name="gig-service"; db="brains_gig"},
    @{name="clan-service"; db="brains_clan"},
    @{name="credit-service"; db="brains_credit"},
    @{name="notification-service"; db="brains_notification"},
    @{name="social-media-service"; db="brains_social"},
    @{name="work-history-service"; db="brains_work_history"},
    @{name="reputation-service"; db="brains_reputation"}
)

Write-Host "Services to migrate:" -ForegroundColor Cyan
foreach ($service in $services) {
    Write-Host "  - $($service.name) -> $($service.db)" -ForegroundColor White
}
Write-Host ""

$choice = Read-Host "Do you want to continue? (y/N)"
if ($choice -ne "y" -and $choice -ne "Y") {
    Write-Host "Migration cancelled." -ForegroundColor Red
    exit
}

# Step 1: Backup current .env files
Write-Host "📋 Step 1: Backing up current .env files..." -ForegroundColor Blue
foreach ($service in $services) {
    $servicePath = "services\$($service.name)"
    if (Test-Path "$servicePath\.env") {
        Copy-Item "$servicePath\.env" "$servicePath\.env.backup" -Force
        Write-Host "  ✅ Backed up $($service.name)\.env" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  No .env file found for $($service.name)" -ForegroundColor Yellow
    }
}

# Step 2: Update DATABASE_URL in each service
Write-Host ""
Write-Host "📝 Step 2: Updating DATABASE_URL in each service..." -ForegroundColor Blue
foreach ($service in $services) {
    $servicePath = "services\$($service.name)"
    $envFile = "$servicePath\.env"
    
    if (Test-Path $envFile) {
        # Read current .env file
        $content = Get-Content $envFile
        
        # Update DATABASE_URL
        $newDatabaseUrl = "$SUPABASE_DB_URL_TEMPLATE$($service.name)"
        
        # Replace DATABASE_URL line
        $updatedContent = $content | ForEach-Object {
            if ($_ -match "^DATABASE_URL=") {
                "DATABASE_URL=$newDatabaseUrl"
            } else {
                $_
            }
        }
        
        # Write back to file
        $updatedContent | Set-Content $envFile
        Write-Host "  ✅ Updated DATABASE_URL for $($service.name)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  No .env file found for $($service.name)" -ForegroundColor Yellow
    }
}

# Step 3: Run migrations for each service
Write-Host ""
Write-Host "🗄️  Step 3: Running Prisma migrations for each service..." -ForegroundColor Blue
foreach ($service in $services) {
    $servicePath = "services\$($service.name)"
    
    if (Test-Path "$servicePath\prisma\schema.prisma") {
        Write-Host "  🔄 Migrating $($service.name)..." -ForegroundColor Cyan
        
        Push-Location $servicePath
        
        try {
            # Generate Prisma client
            Write-Host "    Generating Prisma client..." -ForegroundColor Gray
            npx prisma generate
            
            # Run migrations
            Write-Host "    Running migrations..." -ForegroundColor Gray
            npx prisma migrate deploy
            
            Write-Host "  ✅ Successfully migrated $($service.name)" -ForegroundColor Green
        }
        catch {
            Write-Host "  ❌ Failed to migrate $($service.name): $($_.Exception.Message)" -ForegroundColor Red
        }
        finally {
            Pop-Location
        }
    } else {
        Write-Host "  ⚠️  No Prisma schema found for $($service.name)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎉 Migration to Supabase completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test each service to ensure database connections work" -ForegroundColor White
Write-Host "2. Update your production environment variables" -ForegroundColor White
Write-Host "3. Consider setting up connection pooling in Supabase" -ForegroundColor White
Write-Host "4. Update any CI/CD pipelines with new database URLs" -ForegroundColor White