# Add Terms Agreement Column Migration Script
# This script adds the isAgreedToTermsAndRefundPolicy column to the authUsers table

Write-Host "🔄 Adding isAgreedToTermsAndRefundPolicy column to authUsers table..." -ForegroundColor Yellow

# Check if we're in the correct directory
if (-not (Test-Path "services/auth-service")) {
    Write-Host "❌ Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]*?)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
    Write-Host "✅ Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    exit 1
}

# Get database URL
$databaseUrl = $env:DATABASE_URL
if (-not $databaseUrl) {
    Write-Host "❌ DATABASE_URL not found in environment variables" -ForegroundColor Red
    exit 1
}

# Run the migration SQL
try {
    Write-Host "🚀 Running migration SQL..." -ForegroundColor Cyan
    
    # Use psql to run the migration
    $sqlContent = Get-Content "add-terms-agreement-column.sql" -Raw
    $sqlContent | psql $databaseUrl
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host "📋 Column 'isAgreedToTermsAndRefundPolicy' has been added to authUsers table" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error running migration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Generate new Prisma client for auth-service
Write-Host "🔄 Generating Prisma client for auth-service..." -ForegroundColor Yellow
Push-Location "services/auth-service"
try {
    npx prisma generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Auth-service Prisma client generated successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to generate auth-service Prisma client" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error generating auth-service Prisma client: $($_.Exception.Message)" -ForegroundColor Red
}
Pop-Location

# Generate new Prisma client for user-service
Write-Host "🔄 Generating Prisma client for user-service..." -ForegroundColor Yellow
Push-Location "services/user-service"
try {
    npx prisma generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ User-service Prisma client generated successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to generate user-service Prisma client" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error generating user-service Prisma client: $($_.Exception.Message)" -ForegroundColor Red
}
Pop-Location

Write-Host ""
Write-Host "🎉 Migration completed!" -ForegroundColor Green
Write-Host "📝 Summary:" -ForegroundColor Cyan
Write-Host "   • Added 'isAgreedToTermsAndRefundPolicy' column to authUsers table" -ForegroundColor White
Write-Host "   • Updated auth-service schema and validation" -ForegroundColor White
Write-Host "   • Updated user-service schema" -ForegroundColor White
Write-Host "   • Registration now requires terms agreement" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Note: Existing users have been set to 'agreed' for backward compatibility" -ForegroundColor Yellow
Write-Host "    You may want to review this in the SQL file if needed" -ForegroundColor Yellow