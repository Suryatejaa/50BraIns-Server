# 🚨 PRODUCTION DATABASE SAFETY CHECKLIST

## Pre-Production Safety Measures

### 1. **Environment Separation**
- [ ] **Never run production commands in local development**
- [ ] **Always test in staging environment first**
- [ ] **Use different database URLs for different environments**
- [ ] **Color-code your terminals** (red for prod, green for dev)

### 2. **Transaction Safety**
```sql
-- ALWAYS wrap dangerous operations in transactions
BEGIN;
  -- Test with SELECT first
  SELECT COUNT(*) FROM table WHERE condition;
  -- If count looks right, then UPDATE
  -- UPDATE table SET column = value WHERE condition;
  -- Check results again
  -- SELECT * FROM table WHERE condition LIMIT 10;
-- Only COMMIT if everything looks correct
-- ROLLBACK; -- if something went wrong
```

### 3. **Backup Before Major Operations**
```bash
# Always backup before mass operations
pg_dump -h hostname -U username -t table_name database > backup_$(date +%Y%m%d_%H%M%S).sql

# For Supabase, export from dashboard or use:
# supabase db dump --local > backup.sql
```

### 4. **WHERE Clause Validation**
```sql
-- ❌ NEVER DO THIS:
UPDATE users SET roles = new_roles;

-- ✅ ALWAYS DO THIS:
UPDATE users SET roles = new_roles WHERE specific_condition;

-- ✅ Test with SELECT first:
SELECT id, email, roles FROM users WHERE specific_condition;
```

## Emergency Response Plan

### If You Made a Mistake:

#### Step 1: **IMMEDIATE RESPONSE** (within 30 seconds)
```sql
-- If transaction is still open:
ROLLBACK;

-- If already committed, immediately run emergency rollback:
SELECT emergency_role_rollback(); -- (using the function we created)
```

#### Step 2: **ASSESS DAMAGE** (within 2 minutes)
```sql
-- Check how many users were affected:
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE 'ADMIN' = ANY(roles)) as admin_users,
  COUNT(*) FILTER (WHERE 'SUPER_ADMIN' = ANY(roles)) as super_admin_users
FROM "authUsers";

-- Find recently modified users:
SELECT id, email, roles, "updatedAt" 
FROM "authUsers" 
WHERE "updatedAt" > NOW() - INTERVAL '10 minutes'
ORDER BY "updatedAt" DESC;
```

#### Step 3: **RESTORE FROM BACKUP** (if needed)
```bash
# Restore specific table from backup:
psql -h hostname -U username -d database < backup_file.sql

# Or restore specific columns:
# You'd need the backup commands we created above
```

## Additional Safety Tools

### 1. **Admin Role Assignment Function** (Use instead of direct UPDATE)
```sql
-- Safe way to assign roles:
SELECT assign_admin_roles('admin@yourdomain.com', ARRAY['USER','ADMIN']);

-- This function validates:
-- - User exists and is unique
-- - Role combinations are valid
-- - Required roles are present
-- - Logs all changes
```

### 2. **Regular Monitoring**
```sql
-- Run this weekly to detect anomalies:
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE 'ADMIN' = ANY(roles)) as admin_count,
  COUNT(*) FILTER (WHERE array_length(roles, 1) > 3) as suspicious_users
FROM "authUsers";

-- Should show: total_users=many, admin_count=2-5, suspicious_users=0
```

### 3. **Audit Trail Setup**
```sql
-- Create audit table for tracking role changes:
CREATE TABLE user_role_audit (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  user_email TEXT,
  old_roles TEXT[],
  new_roles TEXT[],
  changed_by TEXT,
  changed_at TIMESTAMP DEFAULT NOW(),
  change_reason TEXT
);

-- Trigger to automatically log role changes (recommended)
```

## Money/Payment Safety

### For Financial Operations:
1. **ALWAYS use staging environment with test money first**
2. **Implement confirmation dialogs in admin interfaces**
3. **Require two-factor authentication for admin actions**
4. **Set up alerts for large financial operations**
5. **Implement daily reconciliation reports**
6. **Never run financial operations without WHERE clauses**

### Example Safe Payment Query:
```sql
-- ❌ DANGEROUS:
UPDATE payments SET status = 'RELEASED';

-- ✅ SAFE:
BEGIN;
SELECT COUNT(*) FROM payments 
WHERE id = 'specific-payment-id' AND status = 'HELD_ESCROW';
-- Should return 1

UPDATE payments 
SET status = 'RELEASED', released_at = NOW()
WHERE id = 'specific-payment-id' AND status = 'HELD_ESCROW';
-- Should affect 1 row

SELECT id, status, released_at FROM payments 
WHERE id = 'specific-payment-id';
-- Verify the change

COMMIT; -- Only if everything looks correct
```

## Tools to Implement

1. **Admin Interface with Confirmations**
2. **Staging Environment Mirror**
3. **Automated Backups Before Operations**
4. **Role Change Audit Logging**
5. **Emergency Rollback Scripts**
6. **Monitoring Dashboards**

Remember: **When in doubt, don't execute. Test in staging first!** 🛡️