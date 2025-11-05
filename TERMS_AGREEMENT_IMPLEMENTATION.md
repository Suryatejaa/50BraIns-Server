# Terms and Refund Policy Agreement Implementation

## Overview
Added mandatory terms and refund policy agreement functionality to the registration process. Users must now explicitly agree to the Terms of Service and Refund Policy to create an account.

## Database Changes

### New Column Added
```sql
ALTER TABLE "authUsers" 
ADD COLUMN "isAgreedToTermsAndRefundPolicy" BOOLEAN DEFAULT false;
```

**Column Details:**
- **Name**: `isAgreedToTermsAndRefundPolicy`
- **Type**: `BOOLEAN`
- **Default**: `false`
- **Nullable**: `true` (for backward compatibility with existing users)
- **Purpose**: Track user agreement to Terms of Service and Refund Policy

## Schema Updates

### Auth Service Schema (`services/auth-service/prisma/schema.prisma`)
```prisma
model User {
  // ... existing fields
  isAgreedToTermsAndRefundPolicy Boolean? @default(false)
  // ... remaining fields
}
```

### User Service Schema (`services/user-service/prisma/schema.prisma`)
```prisma
model User {
  // ... existing fields
  isAgreedToTermsAndRefundPolicy Boolean @default(false)
  // ... remaining fields
}
```

## API Changes

### Registration Endpoint
**Endpoint**: `POST /register`

**Updated Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "username",
  "roles": ["USER"],
  "instagramHandle": "@username",
  "isAgreedToTermsAndRefundPolicy": true  // ← NEW REQUIRED FIELD
}
```

**Validation Rules:**
- **Required**: `true`
- **Type**: `boolean`
- **Valid Values**: Must be `true` (explicit agreement required)
- **Error Message**: "You must agree to the Terms of Service and Refund Policy to create an account"

### Validation Schema
```javascript
isAgreedToTermsAndRefundPolicy: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must agree to the Terms of Service and Refund Policy to create an account',
    'any.required': 'Agreement to Terms of Service and Refund Policy is required'
})
```

## Service Layer Changes

### Auth Service Registration Logic
```javascript
// Validate terms and refund policy agreement
if (!userData.isAgreedToTermsAndRefundPolicy) {
    throw new ValidationError('You must agree to the Terms of Service and Refund Policy to create an account');
}

// Include in user creation data
const createData = {
    // ... existing fields
    isAgreedToTermsAndRefundPolicy: userData.isAgreedToTermsAndRefundPolicy,
    // ... remaining fields
};
```

## Migration

### Database Migration
Run the provided migration script:
```bash
.\add-terms-agreement-migration.ps1
```

**Migration Steps:**
1. Adds the new column to `authUsers` table
2. Sets existing users to `true` for backward compatibility
3. Regenerates Prisma clients for both services

### Manual Migration (Alternative)
```sql
-- Add the column
ALTER TABLE "authUsers" 
ADD COLUMN "isAgreedToTermsAndRefundPolicy" BOOLEAN DEFAULT false;

-- Update existing users (optional)
UPDATE "authUsers" 
SET "isAgreedToTermsAndRefundPolicy" = true 
WHERE "createdAt" < NOW();

-- Add documentation comment
COMMENT ON COLUMN "authUsers"."isAgreedToTermsAndRefundPolicy" IS 'Indicates if user has agreed to Terms of Service and Refund Policy during registration';
```

## Frontend Integration

### Registration Form Updates Required
Frontend applications must be updated to include the terms agreement:

```html
<!-- Example checkbox for terms agreement -->
<input 
  type="checkbox" 
  id="terms-agreement" 
  name="isAgreedToTermsAndRefundPolicy" 
  required 
/>
<label for="terms-agreement">
  I agree to the <a href="/terms">Terms of Service</a> 
  and <a href="/refund-policy">Refund Policy</a>
</label>
```

```javascript
// Example frontend validation
const registrationData = {
  email: formData.email,
  password: formData.password,
  username: formData.username,
  roles: formData.roles,
  instagramHandle: formData.instagramHandle,
  isAgreedToTermsAndRefundPolicy: formData.termsAgreement // Must be true
};
```

## Error Handling

### Common Error Responses

#### Missing Agreement Field
```json
{
  "success": false,
  "error": "Agreement to Terms of Service and Refund Policy is required",
  "code": "VALIDATION_ERROR",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Agreement Not True
```json
{
  "success": false,
  "error": "You must agree to the Terms of Service and Refund Policy to create an account",
  "code": "VALIDATION_ERROR",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Backward Compatibility

### Existing Users
- Existing users are automatically set to `agreed` via migration
- No impact on existing user accounts or functionality
- Existing API endpoints remain functional

### Database Schema
- Column is nullable for backward compatibility
- Default value is `false` for safety
- Migration handles existing data gracefully

## Testing

### Test Cases Required

#### Registration Tests
1. **Valid Registration with Agreement**
   ```javascript
   const validData = {
     email: "test@example.com",
     password: "SecurePass123!",
     isAgreedToTermsAndRefundPolicy: true
   };
   // Should succeed
   ```

2. **Registration without Agreement**
   ```javascript
   const invalidData = {
     email: "test@example.com",
     password: "SecurePass123!",
     isAgreedToTermsAndRefundPolicy: false
   };
   // Should fail with validation error
   ```

3. **Registration with Missing Agreement Field**
   ```javascript
   const invalidData = {
     email: "test@example.com",
     password: "SecurePass123!"
     // Missing isAgreedToTermsAndRefundPolicy
   };
   // Should fail with validation error
   ```

#### Database Tests
1. Verify column exists and has correct type
2. Verify default value behavior
3. Verify existing users have been updated (if migration run)

## Security Considerations

### Legal Compliance
- Explicit user consent is now tracked
- Audit trail available in database
- Timestamp of agreement via `createdAt` field

### Data Protection
- Agreement status is stored securely
- No sensitive legal text stored in database
- Clear boolean flag for compliance checks

## Implementation Checklist

- [x] ✅ Add column to auth-service schema
- [x] ✅ Add column to user-service schema  
- [x] ✅ Update registration validation schema
- [x] ✅ Update auth service registration logic
- [x] ✅ Create database migration script
- [x] ✅ Create documentation
- [ ] ⏳ Update frontend registration forms
- [ ] ⏳ Update API documentation
- [ ] ⏳ Add integration tests
- [ ] ⏳ Deploy and test

## Notes

### Important Considerations
1. **Legal Requirements**: Ensure Terms of Service and Refund Policy pages are accessible
2. **User Experience**: Clear messaging about what users are agreeing to
3. **Compliance**: Agreement timestamp via user creation date
4. **Migration**: Existing users set to agreed for continuity

### Future Enhancements
- Track agreement version/timestamp separately
- Allow re-agreement when terms change
- Audit log for terms updates
- Admin dashboard for agreement analytics