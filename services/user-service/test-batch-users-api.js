// test-batch-users-api.js
// Simple test script to verify the batch users API endpoint

const testBatchUsersAPI = async () => {
    try {
        console.log('🧪 Testing batch users API endpoint...');

        // Test data - replace with actual user IDs from your database
        const testUserIds = [
            "4cb9a796-0cdc-49c4-b783-c9398ec0a9a7", // Replace with real user IDs
            "fake-user-id-123" // This should not be found
        ];

        const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:4005';

        console.log(`📡 Making request to: ${USER_SERVICE_URL}/internal/users/batch`);
        console.log(`📝 Requesting users: ${testUserIds.join(', ')}`);

        const response = await fetch(`${USER_SERVICE_URL}/internal/users/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Service': 'gig-service'
            },
            body: JSON.stringify({
                userIds: testUserIds
            })
        });

        console.log(`📊 Response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', errorText);
            return;
        }

        const result = await response.json();

        console.log('✅ Batch Users API Response:');
        console.log(`   - Success: ${result.success}`);
        console.log(`   - Users found: ${result.data.count}/${result.data.requested}`);
        console.log(`   - Users data:`, result.data.users.map(user => ({
            id: user.id,
            username: user.username,
            name: user.companyName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
            verified: user.emailVerified
        })));

        // Test empty array
        console.log('\n🧪 Testing empty array...');
        const emptyResponse = await fetch(`${USER_SERVICE_URL}/internal/users/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Service': 'gig-service'
            },
            body: JSON.stringify({
                userIds: []
            })
        });

        console.log(`📊 Empty array response status: ${emptyResponse.status}`);
        const emptyResult = await emptyResponse.json();
        console.log('📝 Empty array result:', emptyResult);

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// Run the test
if (require.main === module) {
    testBatchUsersAPI();
}

module.exports = { testBatchUsersAPI };