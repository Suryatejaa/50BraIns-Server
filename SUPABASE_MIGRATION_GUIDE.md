# 🚀 Supabase Migration Guide

This guide will help you migrate all your microservices from local PostgreSQL to Supabase.

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Create a New Project**: Create a new project in Supabase dashboard
3. **Get Connection Details**: From Project Settings > Database

## Step 1: Get Your Supabase Connection Details

From your Supabase project dashboard, go to **Settings > Database** and note:

- **Project URL**: `https://YOUR_PROJECT_REF.supabase.co`
- **Database URL**: `postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
- **Anon Key**: Your public anon key
- **Service Role Key**: Your service role key (keep secret!)

## Step 2: Services to Migrate

The following services have databases that need migration:

- `auth-service` → Database: `brains_auth`
- `user-service` → Database: `brains_user`  
- `gig-service` → Database: `brains_gig`
- `clan-service` → Database: `brains_clan`
- `credit-service` → Database: `brains_credit`
- `notification-service` → Database: `brains_notification`
- `social-media-service` → Database: `brains_social`
- `work-history-service` → Database: `brains_work_history`
- `reputation-service` → Database: `brains_reputation`

## Step 3: Update Database URLs

For each service, you'll need to create separate databases in Supabase. You can either:

### Option A: Use Single Database with Schemas (Recommended)
Update each service's `.env` file with:
```
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres?schema=SERVICE_NAME
```

### Option B: Create Separate Supabase Projects (More Isolation)
Create a separate Supabase project for each service.

## Step 4: Run the Migration

Use the PowerShell script provided:

```powershell
# Make sure you're in the project root
cd D:\project\50brains\50BraIns-Server

# Run the migration script
.\migrate-to-supabase.ps1
```

## Step 5: Manual Steps for Each Service

If you prefer manual migration:

```bash
# For each service directory
cd services/SERVICE_NAME

# 1. Update .env file with new DATABASE_URL
# 2. Generate Prisma client
npx prisma generate

# 3. Run migrations
npx prisma migrate deploy

# 4. (Optional) Seed data if you have seeders
npx prisma db seed
```

## Step 6: Environment Variables to Update

For each service, update these in `.env`:

```env
# Database (Replace with your Supabase URL)
DATABASE_URL=postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres?schema=public

# Optional: Add Supabase-specific configs
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

## Step 7: Testing

After migration, test each service:

```bash
# Start individual services to test
cd services/auth-service && npm start
cd services/user-service && npm start
cd services/gig-service && npm start
# ... etc
```

## Step 8: Production Considerations

1. **Connection Pooling**: Enable connection pooling in Supabase
2. **Row Level Security**: Consider enabling RLS for sensitive tables
3. **Backup Strategy**: Set up automated backups
4. **Monitoring**: Enable database monitoring in Supabase
5. **SSL**: Ensure SSL connections are enforced

## Common Issues and Solutions

### Issue: "Too many connections"
**Solution**: Enable connection pooling in Supabase or reduce Prisma connection pool size:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Pooled connection
  directUrl = env("DIRECT_URL")        // Direct connection
}
```

Add to your database service:
```javascript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Reduce connection pool
  connectionLimit: 5
})
```

### Issue: Migration failures
**Solution**: Run migrations one service at a time and check logs.

### Issue: Schema conflicts
**Solution**: Use different schemas for each service or separate databases.

## Rollback Plan

If you need to rollback:

1. Restore `.env.backup` files:
```bash
# For each service
cp services/SERVICE_NAME/.env.backup services/SERVICE_NAME/.env
```

2. Restart services to reconnect to local PostgreSQL

## Security Notes

- Never commit Supabase credentials to version control
- Use environment variables for all sensitive data
- Consider using different Supabase projects for dev/staging/prod
- Enable Row Level Security where appropriate