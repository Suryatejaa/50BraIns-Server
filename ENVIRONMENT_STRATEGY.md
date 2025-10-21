# 🔄 Environment Strategy for Local vs Supabase Development

## ✅ **All Schemas Updated!**

I've updated all Prisma schemas with prefixed table names:

### **Updated Mappings:**
- ✅ **Auth Service**: `users` → `auth_users`, `refresh_tokens` → `auth_refresh_tokens`, `admin_logs` → `auth_admin_logs`
- ✅ **User Service**: `users` → `auth_users` (shared), `search_history` → `user_search_history`, `equipment` → `user_equipment`
- ✅ **Gig Service**: `applications` → `gig_applications`, `submissions` → `gig_submissions`
- ✅ **Credit Service**: `boost_records` → `credit_boost_records`, `payment_records` → `credit_payment_records`
- ✅ **Notification Service**: `email_templates` → `notification_email_templates`
- ✅ **Reputation Service**: All tables prefixed with `reputation_`
- ✅ **Work History Service**: All tables prefixed with `work_`
- ✅ **Clan Service**: No changes needed (already clear names)
- ✅ **Social Media Service**: No changes needed (already clear names)

## 🏠 **For Local Development - You Have 3 Options:**

### **Option 1: Environment-Based Schema Files (Recommended)**

Create separate schema files for different environments:

```bash
# In each service/prisma/ directory:
schema.local.prisma     # Maps to non-prefixed tables for local PostgreSQL
schema.cloud.prisma     # Maps to prefixed tables for Supabase (current schemas)
```

**How to implement:**
1. Copy current `schema.prisma` to `schema.cloud.prisma`
2. Create `schema.local.prisma` with original table names:
   ```prisma
   model User {
     // ... same fields
     @@map("users")  // No prefix for local
   }
   ```

3. Use environment-specific schema:
   ```bash
   # For local development
   npx prisma generate --schema=./prisma/schema.local.prisma
   npx prisma db push --schema=./prisma/schema.local.prisma
   
   # For Supabase deployment
   npx prisma generate --schema=./prisma/schema.cloud.prisma
   npx prisma db push --schema=./prisma/schema.cloud.prisma
   ```

### **Option 2: Environment Variables in Schema**

Use environment variables in your schema mappings:

```prisma
model User {
  // ... fields
  @@map(env("USER_TABLE_NAME"))
}
```

**Environment files:**
```bash
# .env.local
USER_TABLE_NAME="users"
APPLICATION_TABLE_NAME="applications"

# .env.production
USER_TABLE_NAME="auth_users"
APPLICATION_TABLE_NAME="gig_applications"
```

### **Option 3: Keep Current Setup (Simplest)**

**Use the same prefixed schemas everywhere and create matching tables locally:**

Run this SQL in your local PostgreSQL to create prefixed tables:
```sql
-- Create the same prefixed tables locally
CREATE TABLE auth_users AS SELECT * FROM users WHERE false;
CREATE TABLE auth_refresh_tokens AS SELECT * FROM refresh_tokens WHERE false;
-- ... etc for all tables
```

## 🚀 **Recommended Approach: Option 1**

I recommend **Option 1** because:
- ✅ **Clean separation** between environments
- ✅ **No confusion** about which environment you're using
- ✅ **Easy switching** between local and cloud
- ✅ **No environment variables** to manage
- ✅ **Local development stays familiar** with original table names

## 📋 **Implementation Steps for Option 1:**

### **Step 1: Backup Current Schemas**
```bash
# In each service directory
cp prisma/schema.prisma prisma/schema.cloud.prisma
```

### **Step 2: Create Local Schemas**
For each service, create `schema.local.prisma` with original table names:

**Example for auth-service:**
```prisma
model User {
  // ... same fields as current
  @@map("users")  // Original table name
}

model RefreshToken {
  // ... same fields as current
  @@map("refresh_tokens")  // Original table name
}
```

### **Step 3: Update Scripts**
Create npm scripts in each service's `package.json`:

```json
{
  "scripts": {
    "db:generate:local": "prisma generate --schema=./prisma/schema.local.prisma",
    "db:generate:cloud": "prisma generate --schema=./prisma/schema.cloud.prisma",
    "db:push:local": "prisma db push --schema=./prisma/schema.local.prisma",
    "db:push:cloud": "prisma db push --schema=./prisma/schema.cloud.prisma",
    "db:studio:local": "prisma studio --schema=./prisma/schema.local.prisma",
    "db:studio:cloud": "prisma studio --schema=./prisma/schema.cloud.prisma"
  }
}
```

### **Step 4: Workflow Commands**

**For Local Development:**
```bash
cd services/auth-service
npm run db:generate:local
npm run db:push:local
npm start
```

**For Supabase Deployment:**
```bash
cd services/auth-service
npm run db:generate:cloud
# Tables already exist from SQL script
npm start
```

## 🎯 **Quick Answer to Your Question:**

> "If I want to work in local env do I need to change the mapping again?"

**With Option 1 (Recommended): No!** 
- You'll have separate schema files for each environment
- Just use the local schema file for local development
- Your code remains exactly the same

**With Current Setup: Yes**
- You'd need to change all `@@map()` directives back to original names
- Then change them again when deploying to Supabase

## 🔧 **Next Steps:**

1. **Try the current setup first** - Your local PostgreSQL with prefixed tables
2. **If you prefer original table names locally** - Implement Option 1
3. **Your service code never changes** - Only schema mappings change

## ✨ **Benefits:**

- 🎯 **Same codebase** works in both environments
- 🔄 **Easy environment switching**
- 🛡️ **No accidental deployments** to wrong environment
- 🧹 **Clean local development** with familiar table names
- 🚀 **Production-ready** Supabase deployment

Would you like me to help set up Option 1 with the separate schema files?