# Start Credit Service Script
Write-Host "Starting Credit Service..." -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Please copy .env.example to .env and configure your settings." -ForegroundColor Yellow
    Write-Host "Copying .env.example to .env..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Generate Prisma client if needed
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

# Run database migrations in development
if ($env:NODE_ENV -eq "production") {
    Write-Host "Production mode - skipping migrations" -ForegroundColor Yellow
} else {
    Write-Host "Running database migrations..." -ForegroundColor Yellow
    npx prisma migrate dev --name init
}

# Start the service
Write-Host "Starting Credit Service on port 4005..." -ForegroundColor Green
node src/index.js
