# 50BraIns Database Migration Guide

This directory contains separate migration scripts for each service to make database setup more manageable and easier to execute.

## 🗂️ Migration Files

| File | Description | Dependencies |
|------|-------------|--------------|
| `00-create-enums.sql` | Creates all enum types | **Run FIRST** |
| `01-auth-service.sql` | Auth service tables | After `00` |
| `02-user-service.sql` | User service tables | After `00` |
| `03-gig-service.sql` | Gig service tables | After `00` |
| `04-clan-service.sql` | Clan service tables | After `00` |
| `05-credit-service.sql` | Credit service tables | After `00` |
| `06-notification-service.sql` | Notification service tables | After `00` |
| `07-reputation-service.sql` | Reputation service tables | After `00` |
| `08-work-history-service.sql` | Work history service tables | After `00` |
| `09-social-media-service.sql` | Social media service tables | After `00` |
| `10-create-indexes.sql` | All performance indexes | After `01-09` |
| `11-create-foreign-keys.sql` | All foreign key constraints | After `01-10` |

## 📋 Execution Order

### Option 1: Run All (Recommended)
```bash
# Execute in order:
1. 00-create-enums.sql
2. 01-auth-service.sql
3. 02-user-service.sql
4. 03-gig-service.sql
5. 04-clan-service.sql
6. 05-credit-service.sql
7. 06-notification-service.sql
8. 07-reputation-service.sql
9. 08-work-history-service.sql
10. 09-social-media-service.sql
11. 10-create-indexes.sql
12. 11-create-foreign-keys.sql
```

### Option 2: Run Individual Services
```bash
# Minimum required:
1. 00-create-enums.sql (ALWAYS FIRST)

# Then run only the services you need:
# For auth service only:
2. 01-auth-service.sql

# For user service only:
2. 02-user-service.sql
3. 10-create-indexes.sql (user service indexes)
4. 11-create-foreign-keys.sql (user service FKs)
```

## 🚀 How to Execute

### In Supabase SQL Editor:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste each script content
3. Execute in the correct order
4. Wait for "SUCCESS" message before proceeding to next script

### Via Command Line (if using psql):
```bash
psql -h your-host -U your-user -d your-database -f 00-create-enums.sql
psql -h your-host -U your-user -d your-database -f 01-auth-service.sql
# ... continue with other files
```

## ✅ Verification

After running all scripts, verify the setup:

```sql
-- Check if all enum types exist
SELECT typname FROM pg_type WHERE typname LIKE '%Status' OR typname LIKE '%Type' OR typname = 'EquipmentCondition';

-- Check if all tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check if all indexes exist
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;

-- Check if all foreign keys exist
SELECT conname FROM pg_constraint WHERE contype = 'f' ORDER BY conname;
```

## 🎯 Service Coverage

- ✅ **Auth Service**: Authentication, refresh tokens, admin logs
- ✅ **User Service**: Analytics, search history, favorites, equipment
- ✅ **Gig Service**: Gigs, applications, submissions, assignments, milestones, tasks
- ✅ **Clan Service**: Clans, members, messages
- ✅ **Credit Service**: Wallets, transactions, boosts, packages, payments
- ✅ **Notification Service**: Notifications, templates, preferences, logs
- ✅ **Reputation Service**: Scores, clan reputations, history, leaderboards
- ✅ **Work History Service**: Records, portfolio, achievements, skills, summaries
- ✅ **Social Media Service**: Accounts, snapshots

## 🔧 Features

- **Safe Execution**: Uses `CREATE TABLE IF NOT EXISTS` and proper exception handling
- **Enum Safety**: Safe enum creation with duplicate handling
- **Atomic Operations**: Each script is self-contained
- **Performance Optimized**: Comprehensive indexes for all query patterns
- **Referential Integrity**: Proper foreign key constraints
- **camelCase Compatible**: All columns use camelCase for Prisma compatibility

## 🆘 Troubleshooting

If you encounter errors:

1. **Enum already exists**: The scripts handle this safely - ignore the error
2. **Table already exists**: Scripts use `IF NOT EXISTS` - safe to re-run
3. **Foreign key errors**: Ensure you've run table creation scripts before foreign keys
4. **Column errors**: Make sure enum creation (`00-create-enums.sql`) ran successfully first

## 📝 Notes

- Your existing `authUsers` table will not be affected
- All scripts preserve existing data
- Scripts can be re-run safely without data loss
- Each script reports "SUCCESS" when completed