@echo off
echo Starting Credit Service...

REM Check if .env file exists
if not exist .env (
    echo Warning: .env file not found. Please copy .env.example to .env and configure your settings.
    echo Copying .env.example to .env...
    copy .env.example .env
)

REM Install dependencies if node_modules doesn't exist
if not exist node_modules (
    echo Installing dependencies...
    npm install
)

REM Generate Prisma client if needed
echo Generating Prisma client...
npx prisma generate

REM Run database migrations in development
if "%NODE_ENV%"=="production" (
    echo Production mode - skipping migrations
) else (
    echo Running database migrations...
    npx prisma migrate dev --name init
)

REM Start the service
echo Starting Credit Service on port 4005...
node src/index.js

pause
