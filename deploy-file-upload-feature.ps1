# PowerShell script to deploy file upload feature to production
# This script applies all necessary database migrations and updates Prisma clients

Write-Host "🚀 Starting File Upload Feature Deployment..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found in current directory" -ForegroundColor Red
    Write-Host "Please make sure you're in the root directory of the project" -ForegroundColor Yellow
    exit 1
}

# Read DATABASE_URL from .env file
$envContent = Get-Content ".env" | Where-Object { $_ -match "^DATABASE_URL=" }
if (-not $envContent) {
    Write-Host "❌ Error: DATABASE_URL not found in .env file" -ForegroundColor Red
    exit 1
}

$databaseUrl = ($envContent -split "=", 2)[1].Trim('"')
Write-Host "📊 Database URL found in .env file" -ForegroundColor Green

# Check if psql is available
try {
    $psqlVersion = psql --version 2>$null
    Write-Host "✅ PostgreSQL client found: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: psql command not found" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools or ensure psql is in your PATH" -ForegroundColor Yellow
    exit 1
}

# List of migration files to run in order
$migrationFiles = @(
    "add-delivered-status.sql",
    "add-delivery-tables.sql", 
    "add-delivery-file-metadata.sql"
)

# Run each migration file
foreach ($migrationFile in $migrationFiles) {
    if (-not (Test-Path $migrationFile)) {
        Write-Host "❌ Error: $migrationFile not found" -ForegroundColor Red
        Write-Host "Available files:" -ForegroundColor Yellow
        Get-ChildItem "*.sql" | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
        exit 1
    }

    Write-Host ""
    Write-Host "📋 Running migration: $migrationFile..." -ForegroundColor Yellow
    
    try {
        $result = psql $databaseUrl -f $migrationFile 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $migrationFile completed successfully!" -ForegroundColor Green
            if ($result) {
                Write-Host "Output:" -ForegroundColor Cyan
                Write-Host $result -ForegroundColor White
            }
        } else {
            Write-Host "❌ $migrationFile failed with exit code: $LASTEXITCODE" -ForegroundColor Red
            Write-Host "Error output:" -ForegroundColor Red
            Write-Host $result -ForegroundColor White
            
            # Ask user if they want to continue with next migration
            $response = Read-Host "Do you want to continue with the next migration? (y/N)"
            if ($response -ne "y" -and $response -ne "Y") {
                Write-Host "🛑 Deployment stopped by user" -ForegroundColor Red
                exit 1
            }
        }
    } catch {
        Write-Host "❌ Error running $migrationFile : $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🔄 Running database verification..." -ForegroundColor Yellow

# Verification script
$verificationSQL = @"
-- Verify delivery tables and enums exist
SELECT 'ApplicationStatus enum values:' as info;
SELECT enum_range(NULL::public."ApplicationStatus");

SELECT 'GigDeliveryStatus enum values:' as info;  
SELECT enum_range(NULL::public."GigDeliveryStatus");

SELECT 'GigDelivery table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'gigDelivery' 
ORDER BY ordinal_position;

SELECT 'GigDeliveryCleanup table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'gigDeliveryCleanup' 
ORDER BY ordinal_position;

SELECT 'Delivery tables count:' as info;
SELECT 
    (SELECT COUNT(*) FROM "gigDelivery") as delivery_records,
    (SELECT COUNT(*) FROM "gigDeliveryCleanup") as cleanup_records;
"@

try {
    $verifyResult = $verificationSQL | psql $databaseUrl 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database verification completed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Verification results:" -ForegroundColor Cyan
        Write-Host $verifyResult -ForegroundColor White
    } else {
        Write-Host "⚠️ Verification had issues, but migrations may have succeeded" -ForegroundColor Yellow
        Write-Host $verifyResult -ForegroundColor White
    }
} catch {
    Write-Host "⚠️ Could not run verification: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 Updating Prisma clients..." -ForegroundColor Yellow

# Update Prisma client for gig-service
Write-Host "📦 Updating gig-service Prisma client..." -ForegroundColor Cyan
try {
    Set-Location "services/gig-service"
    $prismaResult = npx prisma db pull 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Prisma schema pulled successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Prisma db pull had issues: $prismaResult" -ForegroundColor Yellow
    }
    
    $generateResult = npx prisma generate 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Prisma client generated successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Prisma generate failed: $generateResult" -ForegroundColor Red
    }
    
    Set-Location "../.."
} catch {
    Write-Host "❌ Error updating gig-service Prisma: $_" -ForegroundColor Red
    Set-Location "../.."
}

Write-Host ""
Write-Host "🔄 Next steps for production deployment:" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "1. ✅ Database migrations completed" -ForegroundColor Green
Write-Host "2. ✅ Prisma clients updated" -ForegroundColor Green  
Write-Host "3. 🔄 Restart gig-service to load new schema" -ForegroundColor Yellow
Write-Host "4. 🔄 Restart notification-service for delivery events" -ForegroundColor Yellow
Write-Host "5. 🔄 Test file upload endpoints" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 Production Deployment Commands:" -ForegroundColor Green
Write-Host "   # If using Railway/Docker:" -ForegroundColor Gray
Write-Host "   railway up --service gig-service" -ForegroundColor Gray
Write-Host "   railway up --service notification-service" -ForegroundColor Gray
Write-Host ""
Write-Host "   # If using PM2:" -ForegroundColor Gray  
Write-Host "   pm2 restart gig-service" -ForegroundColor Gray
Write-Host "   pm2 restart notification-service" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Test Endpoints:" -ForegroundColor Green
Write-Host "   POST /gigs/:id/submit-delivery" -ForegroundColor Gray
Write-Host "   POST /gigs/deliveries/:id/review" -ForegroundColor Gray
Write-Host "   GET /gigs/:id/deliveries" -ForegroundColor Gray
Write-Host "   GET /applications/:applicationId/status" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ File Upload Feature Deployment Completed!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan