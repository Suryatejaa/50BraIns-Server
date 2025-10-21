# set-railway-vars.ps1

# Common variables for all services
$DATABASE_URL = "postgresql://postgres.qicmqmstnpzunoomyxhu:MSvz7VNg9jz18iY4@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
$RABBITMQ_URL="amqps://mahifqgz:UTImWgOvCaa-95mb9DZL4X83mydMV9qt@armadillo.rmq.cloudamqp.com/mahifqgz"
$JWT_SECRET = "50brains-prod-jwt-secret-a8f9d2e1c4b7a3f6d9e2c5b8a1f4d7e0"
$JWT_REFRESH_SECRET = "50brains-prod-refresh-secret-f4d7e0a1c8b5d2e9f6a3c0b7d4e1a8f5"
$SESSION_SECRET = "50brains-prod-session-secret-c0b7d4e1a8f5c2b9d6e3a0f7c4b1d8e5"

# Services array (name:port)
$services = @(
    "api-gateway:4000",
    "auth-service:4001",
    "gig-service:4002",
    "user-service:4003",
    "reputation-service:4004",
    "notification-service:4005",
    "websocket-gateway:4006",
    "work-history-service:4007"
)

# Loop through each service
foreach ($service_info in $services) {
    $name, $port = $service_info -split ":"
    
    Write-Host "🚀 Setting variables for $name (Port: $port)" -ForegroundColor Cyan
    
    # Select service
    railway service $name
    
    # Set variables
    railway variables set NODE_ENV=production
    railway variables set DATABASE_URL="$DATABASE_URL"
    railway variables set RABBITMQ_URL="$RABBITMQ_URL"
    railway variables set JWT_SECRET="$JWT_SECRET"
    railway variables set JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
    railway variables set SESSION_SECRET="$SESSION_SECRET"
    railway variables set BCRYPT_ROUNDS=12
    railway variables set PORT=$port
    
    Write-Host "✅ $name configured" -ForegroundColor Green
    Write-Host ""
}

Write-Host "🎉 All services configured!" -ForegroundColor Green
