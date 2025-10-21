@echo off
echo Starting Credit Service...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Navigate to credit service directory
cd /d "%~dp0"

REM Check if package.json exists
if not exist "package.json" (
    echo Error: package.json not found in current directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Generate Prisma client
echo Generating Prisma client...
npx prisma generate
if %errorlevel% neq 0 (
    echo Warning: Prisma generate failed, continuing anyway...
)

REM Start the service
echo.
echo ======================================
echo    🚀 Starting Credit Service
echo ======================================
echo Port: 4005
echo Environment: %NODE_ENV%
echo.

node index.js

REM If the service stops, wait for user input
if %errorlevel% neq 0 (
    echo.
    echo Service stopped with error code: %errorlevel%
    pause
) else (
    echo.
    echo Service stopped normally
    pause
)
