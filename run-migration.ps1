# PowerShell script to run the database migration
# This script applies the profile update migration to add lastUsernameUpdated field

Write-Host "🚀 Starting Profile Update Migration..." -ForegroundColor Green

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

# Check if migration file exists
if (-not (Test-Path "fixed-migration.sql")) {
    Write-Host "❌ Error: fixed-migration.sql not found" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Running migration script..." -ForegroundColor Yellow

# Run the migration
try {
    $result = psql $databaseUrl -f "fixed-migration.sql" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Migration output:" -ForegroundColor Cyan
        Write-Host $result -ForegroundColor White
    } else {
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error output:" -ForegroundColor Red
        Write-Host $result -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "❌ Error running migration: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔄 Now running verification script..." -ForegroundColor Yellow

# Run verification
try {
    $verifyResult = psql $databaseUrl -f "verify-database-state.sql" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Verification completed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Verification results:" -ForegroundColor Cyan
        Write-Host $verifyResult -ForegroundColor White
    } else {
        Write-Host "⚠️ Verification failed, but migration may have succeeded" -ForegroundColor Yellow
        Write-Host $verifyResult -ForegroundColor White
    }
} catch {
    Write-Host "⚠️ Could not run verification: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔄 Next steps:" -ForegroundColor Green
Write-Host "1. Regenerate Prisma clients in both services:" -ForegroundColor White
Write-Host "   cd services/auth-service && npx prisma generate" -ForegroundColor Gray
Write-Host "   cd services/user-service && npx prisma generate" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Restart both services to pick up the new schema" -ForegroundColor White
Write-Host ""
Write-Host "✅ Profile update migration process completed!" -ForegroundColor Green