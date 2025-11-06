# Delivery Feature Migration Instructions

## Current Error
```
TypeError: Cannot read properties of undefined (reading 'findMany')
```

This error occurs because the `gigDelivery` table doesn't exist in the database yet, so Prisma doesn't have the model available.

## Solution Steps

### 1. Run Database Migration
Execute the delivery tables SQL script in Supabase:

```sql
-- Run this in Supabase SQL Editor
-- File: add-delivery-tables.sql
```

### 2. Update Prisma Schema
Pull the latest database schema:
```bash
cd services/gig-service
npx prisma db pull
```

### 3. Generate Prisma Client
Generate the updated Prisma client:
```bash
npx prisma generate
```

### 4. Restart Services
Restart the gig service:
```bash
# Stop the service
# Restart using your preferred method (Docker, PM2, etc.)
```

## Verification

After completing the migration, test the delivery submission:

```bash
curl -X POST "http://localhost:4001/api/applications/{appId}/submit-delivery" \
-H "Content-Type: application/json" \
-H "x-user-id: {userId}" \
-d '{
  "title": "Test Delivery",
  "description": "Test delivery submission",
  "fileUrl": "https://example.com/test-file.jpg",
  "fileName": "test-file.jpg",
  "notes": "Test notes"
}'
```

## Error Handling Added

The code now includes comprehensive error handling:

1. **Schema Check**: Detects if delivery tables don't exist
2. **Helpful Error Response**: Returns specific migration instructions
3. **Graceful Degradation**: Service continues to work for other features
4. **Detailed Logging**: Logs schema errors for debugging

## Response When Tables Don't Exist

```json
{
  "success": false,
  "error": "Delivery feature is not available yet. Database schema migration is required.",
  "details": {
    "action": "Please run the delivery schema migration first",
    "instructions": [
      "1. Run the SQL script: add-delivery-tables.sql in Supabase",
      "2. Run: npx prisma db pull", 
      "3. Run: npx prisma generate",
      "4. Restart the service"
    ]
  }
}
```

## Next Steps

1. **Immediate**: Run the migration scripts
2. **Update Prisma**: Pull schema and regenerate client
3. **Test**: Verify delivery submission works
4. **Deploy**: Update production with migrated schema

The delivery feature will be fully functional once the database schema is updated!