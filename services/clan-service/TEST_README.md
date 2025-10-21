# 🧪 Clan Service Route Testing Guide

This directory contains a comprehensive test script that tests **ALL** clan service endpoints using the provided credentials.

## 📋 Test Coverage

The test script covers **every single endpoint** in the clan service:

### 🔓 Public Endpoints (No Authentication Required)
- `GET /api/clans` - Get all clans
- `GET /api/clans/feed` - Get clan feed
- `GET /api/clans/featured` - Get featured clans
- `GET /api/clans/health` - Service health check

### 🔐 Protected Endpoints (Authentication Required)
- `POST /api/clans` - Create new clan
- `GET /api/clans/:id` - Get clan by ID
- `PUT /api/clans/:id` - Update clan
- `DELETE /api/clans/:id` - Delete clan
- `GET /api/clans/my` - Get user's clans

### 👥 Clan Membership Endpoints
- `GET /api/members/:clanId` - Get clan members
- `POST /api/members/:clanId/join` - Join clan
- `POST /api/members/:clanId/leave` - Leave clan
- `PUT /api/members/:clanId/:userId/role` - Update member role
- `DELETE /api/members/:clanId/:userId` - Remove member

### 💬 Clan Messaging Endpoints
- `GET /api/clans/:clanId/messages` - Get clan messages
- `POST /api/clans/:clanId/messages` - Send message
- `POST /api/clans/:clanId/share-gig` - Share gig
- `GET /api/clans/:clanId/shared-gigs` - Get shared gigs
- `GET /api/clans/:clanId/message-stats` - Get message stats
- `DELETE /api/clans/:clanId/messages/:messageId` - Delete message

### 📊 Reputation & Analytics
- `POST /api/clans/:clanId/update-reputation` - Update clan reputation

## 🚀 How to Run the Tests

### Prerequisites
1. **API Gateway** must be running on `http://localhost:3000`
2. **Clan Service** must be running on `http://localhost:4003`
3. **Auth Service** must be running and accessible through the gateway
4. **Database** must be properly configured and running

### Quick Start
```bash
# Navigate to clan service directory
cd services/clan-service

# Install dependencies (if not already done)
npm install

# Run the comprehensive test suite
npm run test:routes
```

### Alternative: Direct Execution
```bash
# Run directly with Node.js
node test-clan-routes.js
```

## 🔑 Test Credentials Used

The script automatically tests with these three user accounts:

| User | Email | Password | Purpose |
|------|-------|----------|---------|
| Surya | `surya@gmail.com` | `Surya@123!` | Primary test user |
| Comfort | `comfortsgents@gmail.com` | `Surya@123` | Secondary test user |
| User1 | `user1@gmail.com` | `Surya@123` | Tertiary test user |

## 📊 What the Test Does

1. **Authentication Testing** - Tests login for all three users
2. **Health Check** - Verifies both direct service and API Gateway health
3. **Public Endpoints** - Tests all public routes without authentication
4. **Clan Lifecycle** - Creates, reads, updates, and deletes a test clan
5. **Membership Management** - Tests joining, leaving, and role management
6. **Messaging System** - Tests text messages, gig sharing, and message stats
7. **Cleanup** - Removes test data to keep the system clean

## 📈 Test Results

The script provides detailed output including:
- ✅ Success indicators for each test
- ❌ Error details for failed tests
- 📊 Response data for successful operations
- 🎯 Final summary with pass/fail counts and success rate

## 🐛 Troubleshooting

### Common Issues

1. **Service Not Running**
   ```
   ❌ Error: connect ECONNREFUSED 127.0.0.1:3000
   ```
   **Solution**: Start the API Gateway with `npm start` in the api-gateway directory

2. **Authentication Failed**
   ```
   ❌ Authentication failed for User1
   ```
   **Solution**: Ensure the auth service is running and the user credentials are correct

3. **Database Connection Issues**
   ```
   ❌ PrismaClientInitializationError
   ```
   **Solution**: Check database connection and run `npm run db:setup`

4. **Port Already in Use**
   ```
   ❌ Error: listen EADDRINUSE :::4003
   ```
   **Solution**: Stop any existing clan service instances or change the port

### Debug Mode
To see more detailed error information, you can modify the script to include:
```javascript
// Add this to see full error details
console.log('Full error:', error);
console.log('Response status:', error.response?.status);
console.log('Response headers:', error.response?.headers);
```

## 🔧 Customization

### Adding New Tests
To add tests for new endpoints:

1. Create a new test function:
   ```javascript
   const testNewEndpoint = async (user) => {
       try {
           // Your test logic here
           return true;
       } catch (error) {
           logError('New endpoint test failed', error);
           return false;
       }
   };
   ```

2. Add it to the main test runner:
   ```javascript
   // Test X: New Endpoint
   if (firstUser) {
       testResults.total++;
       if (await testNewEndpoint(firstUser)) {
           testResults.passed++;
       } else {
           testResults.failed++;
       }
   }
   ```

### Testing Different Data
Modify the `TEST_CLAN_DATA` object to test with different clan configurations:
```javascript
const TEST_CLAN_DATA = {
    name: 'Custom Test Clan',
    description: 'Your custom description',
    // ... other fields
};
```

## 📝 Expected Output

When all tests pass, you should see:
```
🎉 ALL TESTS PASSED! Clan service is working perfectly!
```

When some tests fail, you'll see:
```
⚠️  2 test(s) failed. Check the logs above for details.
```

## 🎯 Next Steps

After running the tests:
1. **Review Results** - Check which endpoints are working and which need attention
2. **Fix Issues** - Address any failed tests by checking the error logs
3. **Verify Frontend** - Test the frontend integration with the working endpoints
4. **Monitor Logs** - Watch for any new issues as the system is used

---

**Happy Testing! 🚀**
