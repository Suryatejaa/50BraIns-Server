# 🔄 Prisma Schema Update Guide for Supabase Migration

## 📋 **Overview**
This guide shows how to update your Prisma schemas to work with both local PostgreSQL and Supabase without changing any service code. The key is using Prisma's `@@map()` directive to map model names to the prefixed table names in Supabase.

## 🎯 **Strategy**
- **Keep your code unchanged** - All `prisma.user.findMany()` calls stay the same
- **Update only schema files** - Change `@@map()` directives to point to prefixed tables
- **Environment-based switching** - Use different schemas for local vs cloud

## 📝 **Required Schema Updates by Service**

### 🔐 **1. Auth Service** ✅ (Already Updated)
```prisma
model User {
  // ... all fields stay the same
  @@map("auth_users")  // Changed from "users"
}

model RefreshToken {
  // ... all fields stay the same
  @@map("auth_refresh_tokens")  // Changed from "refresh_tokens"
}

model AdminLog {
  // ... all fields stay the same
  @@map("auth_admin_logs")  // Changed from "admin_logs"
}
```

### 👤 **2. User Service**
```prisma
model User {
  // ... all fields stay the same
  @@map("auth_users")  // Shared table with auth service
}

model UserAnalytics {
  // ... all fields stay the same
  @@map("user_analytics")  // No change needed
}

model SearchHistory {
  // ... all fields stay the same
  @@map("user_search_history")  // Changed from "search_history"
}

model UserFavorite {
  // ... all fields stay the same
  @@map("user_favorites")  // No change needed
}

model UserBoostEvent {
  // ... all fields stay the same
  @@map("user_boost_events")  // No change needed
}

model UserCreditEvent {
  // ... all fields stay the same
  @@map("user_credit_events")  // No change needed
}

model Equipment {
  // ... all fields stay the same
  @@map("user_equipment")  // Changed from "equipment"
}
```

### 💼 **3. Gig Service**
```prisma
model Gig {
  // ... all fields stay the same
  @@map("gigs")  // No change needed
}

model Application {
  // ... all fields stay the same
  @@map("gig_applications")  // Changed from "applications"
}

model Submission {
  // ... all fields stay the same
  @@map("gig_submissions")  // Changed from "submissions"
}

model GigBoostEvent {
  // ... all fields stay the same
  @@map("gig_boost_events")  // No change needed
}

model GigCreditEvent {
  // ... all fields stay the same
  @@map("gig_credit_events")  // No change needed
}

model GigAssignment {
  // ... all fields stay the same
  @@map("gig_assignments")  // No change needed
}

model GigMilestone {
  // ... all fields stay the same
  @@map("gig_milestones")  // No change needed
}

model GigTask {
  // ... all fields stay the same
  @@map("gig_tasks")  // No change needed
}
```

### 👥 **4. Clan Service**
```prisma
model Clan {
  // ... all fields stay the same
  @@map("clans")  // No change needed
}

model ClanMember {
  // ... all fields stay the same
  @@map("clan_members")  // No change needed
}

model ClanMessage {
  // ... all fields stay the same
  @@map("clan_messages")  // No change needed
}
```

### 💳 **5. Credit Service**
```prisma
model CreditWallet {
  // ... all fields stay the same
  @@map("credit_wallets")  // No change needed
}

model CreditTransaction {
  // ... all fields stay the same
  @@map("credit_transactions")  // No change needed
}

model BoostRecord {
  // ... all fields stay the same
  @@map("credit_boost_records")  // Changed from "boost_records"
}

model CreditPackage {
  // ... all fields stay the same
  @@map("credit_packages")  // No change needed
}

model PaymentRecord {
  // ... all fields stay the same
  @@map("credit_payment_records")  // Changed from "payment_records"
}
```

### 🔔 **6. Notification Service**
```prisma
model Notification {
  // ... all fields stay the same
  @@map("notifications")  // No change needed
}

model EmailTemplate {
  // ... all fields stay the same
  @@map("notification_email_templates")  // Changed from "email_templates"
}

model NotificationPreference {
  // ... all fields stay the same
  @@map("notification_preferences")  // No change needed
}

model NotificationLog {
  // ... all fields stay the same
  @@map("notification_logs")  // No change needed
}
```

### ⭐ **7. Reputation Service**
```prisma
model ReputationScore {
  // ... all fields stay the same
  @@map("reputation_scores")  // No change needed
}

model ClanReputation {
  // ... all fields stay the same
  @@map("reputation_clan_reputations")  // Changed from "clan_reputations"
}

model ScoreHistory {
  // ... all fields stay the same
  @@map("reputation_score_history")  // Changed from "score_history"
}

model ActivityLog {
  // ... all fields stay the same
  @@map("reputation_activity_logs")  // Changed from "activity_logs"
}

model LeaderboardCache {
  // ... all fields stay the same
  @@map("reputation_leaderboard_cache")  // Changed from "leaderboard_cache"
}

model ScoreConfig {
  // ... all fields stay the same
  @@map("reputation_score_config")  // Changed from "score_config"
}
```

### 📊 **8. Work History Service**
```prisma
model WorkRecord {
  // ... all fields stay the same
  @@map("work_records")  // No change needed
}

model PortfolioItem {
  // ... all fields stay the same
  @@map("work_portfolio_items")  // Changed from "portfolio_items"
}

model Achievement {
  // ... all fields stay the same
  @@map("work_achievements")  // Changed from "achievements"
}

model SkillProficiency {
  // ... all fields stay the same
  @@map("work_skill_proficiencies")  // Changed from "skill_proficiencies"
}

model WorkSummary {
  // ... all fields stay the same
  @@map("work_summaries")  // No change needed
}

model WorkEvent {
  // ... all fields stay the same
  @@map("work_events")  // No change needed
}
```

### 📱 **9. Social Media Service**
```prisma
model SocialMediaAccount {
  // ... all fields stay the same
  @@map("social_media_accounts")  // No change needed
}

model SocialMediaSnapshot {
  // ... all fields stay the same
  @@map("social_media_snapshots")  // No change needed
}
```

## 🚀 **Implementation Steps**

### **Step 1: Update Schema Files**
Update each service's `schema.prisma` file with the new `@@map()` directives shown above.

### **Step 2: Regenerate Prisma Client**
After updating schemas, regenerate the Prisma client in each service:
```bash
cd services/auth-service
npx prisma generate

cd ../user-service
npx prisma generate

# Repeat for all services...
```

### **Step 3: No Code Changes Needed!**
Your existing service code continues to work unchanged:
```javascript
// This still works exactly the same way
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' }
});

const applications = await prisma.application.findMany({
  where: { gigId: 'some-gig-id' }
});
```

## 🔧 **Environment Switching (Optional)**

If you want to maintain both local and cloud schemas, you can:

### **Option A: Environment-based Schema Files**
- `schema.local.prisma` - Maps to non-prefixed tables for local dev
- `schema.cloud.prisma` - Maps to prefixed tables for Supabase
- Use different schema files based on NODE_ENV

### **Option B: Single Schema with Environment Variables**
```prisma
model User {
  // ... fields
  @@map(env("USER_TABLE_NAME"))  // Set in .env: USER_TABLE_NAME="auth_users"
}
```

## ✅ **Benefits of This Approach**

1. **Zero Code Changes** - All your service logic stays identical
2. **Seamless Switching** - Easy to switch between local and cloud
3. **Backward Compatible** - Can still work with local PostgreSQL
4. **Clean Separation** - Database structure separate from business logic
5. **Type Safety Maintained** - All Prisma types and autocompletion work

## 🎯 **Next Steps**

1. ✅ Auth service schema already updated
2. Update remaining 8 service schemas with new `@@map()` directives
3. Run `npx prisma generate` in each service
4. Run the Supabase SQL script to create prefixed tables
5. Test connection with updated schemas

## 📞 **Need Help?**

If you encounter any issues during the migration:
- Check that all foreign key references use the correct model names (not table names)
- Ensure `@@map()` directives match exactly with the SQL table names
- Verify that shared tables (like `auth_users`) use the same mapping across services

Your code will continue to work seamlessly across both environments! 🎉