@echo off
echo 📬 Starting 50BraIns Notification Service...

REM Check if .env file exists
if not exist .env (
    echo ❌ .env file not found. Please copy .env.example to .env and configure it.
    pause
    exit /b 1
)

REM Check database connection and run migrations
echo 🔍 Checking database connection...
npx prisma migrate deploy
if errorlevel 1 (
    echo ❌ Database migration failed. Please check your DATABASE_URL.
    pause
    exit /b 1
)

REM Generate Prisma client
echo 🔧 Generating Prisma client...
npx prisma generate

REM Seed database if requested
if "%1"=="--seed" (
    echo 🌱 Seeding database with sample data...
    npm run prisma:seed
)

REM Start the service
echo 🚀 Starting Notification Service...
if "%NODE_ENV%"=="production" (
    npm start
) else (
    npm run dev
)
