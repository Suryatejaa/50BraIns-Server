# Profile Update System Implementation

## 🎯 Overview

This implementation adds comprehensive profile update functionality with enhanced security measures, including:

- **Username Updates**: With 15-day restriction to prevent abuse
- **Email Updates**: With OTP verification for security
- **Enhanced Rate Limiting**: To protect Resend free tier quota
- **Event-Driven Sync**: Real-time synchronization between auth-service and user-service
- **Cache Invalidation**: Immediate visibility of updates

## 📋 Features Implemented

### 1. Database Schema Updates
- ✅ Added `lastUsernameUpdated` field to track username change timestamps
- ✅ Added `EMAIL_UPDATE` to OTPPurpose enum for email change verification

### 2. Enhanced OTP Rate Limiting
```javascript
// Protection for Resend free tier
Daily Limit: 50 OTPs per email (production), 100 (development)
Hourly Limit: 10 OTPs per email (production), 20 (development)
Cooldown: 15 minutes after 3 failed attempts
```

### 3. Username Update System
- **Restriction**: Can only be updated once every 15 days
- **Validation**: Username uniqueness check
- **Pattern**: Letters, numbers, periods, underscores, hyphens only
- **Length**: 3-30 characters
- **Event Publishing**: Syncs with user-service automatically

### 4. Email Update System
- **Two-Step Process**: Initiate → Verify with OTP
- **OTP Verification**: Sent to new email address
- **Security**: Checks if new email is already in use
- **Auto-Verification**: New email is marked as verified after OTP process
- **Event Publishing**: Syncs with user-service automatically

## 🛠 API Endpoints

### Username Update
```http
PUT /auth/profile/username
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "username": "new_username"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Username updated successfully",
  "data": {
    "username": "new_username",
    "lastUsernameUpdated": "2025-10-31T16:30:00.000Z"
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": "Username can only be updated once every 15 days. Please wait 12 more days."
}
```

### Email Update - Step 1: Initiate
```http
POST /auth/profile/email/initiate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "newEmail": "newemail@example.com"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "OTP sent to new email address. Please verify to complete email update.",
  "data": {
    "newEmail": "newemail@example.com",
    "nextStep": "verify_email_update_otp"
  }
}
```

### Email Update - Step 2: Complete
```http
POST /auth/profile/email/complete
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "newEmail": "newemail@example.com",
  "otp": "123456"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Email updated successfully",
  "data": {
    "email": "newemail@example.com",
    "emailVerified": true,
    "emailVerifiedAt": "2025-10-31T16:30:00.000Z"
  }
}
```

## 🔒 Security Features

### 1. Username Update Restrictions
- **15-Day Cooldown**: Prevents frequent username changes
- **Uniqueness Check**: Ensures username isn't already taken
- **Same Value Check**: Prevents unnecessary updates

### 2. Email Update Security
- **OTP Verification**: Confirms ownership of new email
- **Availability Check**: Ensures email isn't already in use
- **Rate Limiting**: Prevents OTP spam

### 3. Enhanced Rate Limiting
```javascript
// Resend Free Tier Protection
- 15-minute cooldown after 3 failed attempts
- Hourly limit: 10-20 OTPs per email
- Daily limit: 50-100 OTPs per email
- Production vs development limits
```

## 🔄 Event-Driven Architecture

### Published Events

#### Username Update Event
```javascript
{
  eventType: 'user.username_updated',
  data: {
    userId: 'user-id',
    email: 'user@example.com',
    oldUsername: 'old_username',
    newUsername: 'new_username',
    updatedAt: '2025-10-31T16:30:00.000Z'
  }
}
```

#### Email Update Event
```javascript
{
  eventType: 'user.email_updated',
  data: {
    userId: 'user-id',
    oldEmail: 'old@example.com',
    newEmail: 'new@example.com',
    emailVerified: true,
    updatedAt: '2025-10-31T16:30:00.000Z'
  }
}
```

### User-Service Synchronization
- **Real-time Sync**: Events automatically sync changes to user-service
- **Cache Invalidation**: Clears cached user data for immediate visibility
- **Error Handling**: Robust error handling with proper logging

## 📧 Email Templates

The system uses the existing email template system with:
- **EMAIL_UPDATE** purpose for OTP emails
- **Professional Branding**: Uses verified domains (mail.50brains.in)
- **Responsive Design**: Mobile-friendly HTML templates
- **Fallback Templates**: Graceful degradation if template files fail

## 🧪 Testing

### Username Update Test
```bash
curl -X PUT http://localhost:4001/auth/profile/username \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user_123"}'
```

### Email Update Test
```bash
# Step 1: Initiate
curl -X POST http://localhost:4001/auth/profile/email/initiate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newEmail": "test@example.com"}'

# Step 2: Complete (use OTP from email)
curl -X POST http://localhost:4001/auth/profile/email/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newEmail": "test@example.com", "otp": "123456"}'
```

## 🚀 Deployment Notes

### Environment Variables
No new environment variables required. The system uses existing:
- `EMAIL_PROVIDER=resend` (or `smtp`)
- `RESEND_API_KEY` for Resend integration
- `RABBITMQ_URL` for event publishing

### Database Migration
The schema changes are automatically applied through Prisma:
- `lastUsernameUpdated` field added to User model
- `EMAIL_UPDATE` added to OTPPurpose enum

### Service Dependencies
- **Auth Service**: Core implementation
- **User Service**: Event consumption and sync
- **RabbitMQ**: Event messaging
- **Email Service**: OTP delivery (Resend/AWS SES)

## 📊 Monitoring

### Key Metrics to Monitor
- Username update frequency per user
- Email update success/failure rates
- OTP delivery rates and failures
- Rate limiting trigger frequency
- Event processing latency

### Error Scenarios
- Username cooldown violations
- Email already in use
- OTP verification failures
- Rate limiting triggers
- Event publishing failures

## 🔧 Maintenance

### Regular Tasks
- Monitor OTP usage against provider limits
- Review rate limiting effectiveness
- Check event processing health
- Validate cache invalidation patterns

### Performance Considerations
- Username uniqueness checks are indexed
- Cache invalidation is targeted by user pattern
- Event publishing is non-blocking
- Rate limiting uses efficient database queries

## 🎉 Summary

This implementation provides:
✅ **Secure Profile Updates** with proper validation and restrictions
✅ **Enhanced Rate Limiting** to protect email provider quotas
✅ **Real-time Synchronization** between services via events
✅ **Professional Email Delivery** with verified domains
✅ **Comprehensive Error Handling** and logging
✅ **Cache Management** for immediate data visibility
✅ **Production-Ready** security and performance features