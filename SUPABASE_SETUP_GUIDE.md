# Supabase Setup Instructions

## If your project is paused:
1. Go to https://supabase.com/dashboard
2. Find your project
3. Click "Resume" or "Unpause"
4. Wait for the project to start (may take 1-2 minutes)

## If your project is deleted or you need a new one:
1. Go to https://supabase.com/dashboard
2. Click "New project"
3. Choose organization and name
4. Set database password
5. Select region (preferably close to your location)
6. Wait for setup to complete

## Get new connection details:
1. Go to Settings → Database
2. Copy the connection string
3. Update all .env files in your services

## Update .env files:
Replace DATABASE_URL in these files:
- services/auth-service/.env
- services/user-service/.env
- services/gig-service/.env
- services/clan-service/.env
- services/credit-service/.env
- services/notification-service/.env
- services/reputation-service/.env
- services/work-history-service/.env
- services/social-media-service/.env

## Run migrations after connection is restored:
```bash
# Run these in order:
npx prisma db execute --file ../../migrations/00-create-enums.sql
npx prisma db execute --file ../../migrations/08-work-history-service.sql
npx prisma db execute --file ../../migrations/10-create-indexes.sql
```