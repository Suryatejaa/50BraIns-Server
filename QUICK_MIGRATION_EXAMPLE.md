# Quick Migration Example - Gig Service

## 1. Get your Supabase Database URL

From your Supabase project dashboard:
- Go to Settings > Database
- Copy the "Connection string" under "Connection pooling"
- It should look like:
```
postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

## 2. Update gig-service .env file

Current:
```env
DATABASE_URL=postgresql://postgres:Surya@2001@localhost:5432/brains_gig?schema=public
```

Replace with (example):
```env
DATABASE_URL=postgresql://postgres.abcdefghijklmnop:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres?schema=gig_service
```

## 3. Run migration

```bash
cd services/gig-service
npx prisma generate
npx prisma migrate deploy
```

## 4. Test the service

```bash
# Start the gig service
npm start
# or if using nodemon
npm run dev
```

## 5. Verify in Supabase

- Go to Supabase Dashboard > Table Editor
- You should see all your tables created
- Check that the schema is properly set up

That's it! Repeat this process for all 9 services.