// test-internal-api-gateway.js
// Test script to verify internal API calls work through the gateway

const testInternalGatewayRoutes = async () => {
    try {
        console.log('🧪 Testing internal API gateway routes...');

        const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

        // Test 1: Internal user service call (single user)
        console.log('\n📡 Test 1: Internal single user fetch');
        const testUserId = "4cb9a796-0cdc-49c4-b783-c9398ec0a9a7"; // Replace with real user ID

        const singleUserResponse = await fetch(`${GATEWAY_URL}/api/internal/users/${testUserId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Service': 'gig-service'
            }
        });

        console.log(`   Status: ${singleUserResponse.status}`);
        if (singleUserResponse.ok) {
            const singleUserResult = await singleUserResponse.json();
            console.log('   ✅ Single user fetch successful');
            console.log(`   User: ${singleUserResult.data?.user?.username || 'N/A'}`);
        } else {
            const errorText = await singleUserResponse.text();
            console.log('   ❌ Single user fetch failed:', errorText);
        }

        // Test 2: Internal user service call (batch users)
        console.log('\n📡 Test 2: Internal batch users fetch');
        const testUserIds = [testUserId, "fake-user-id-123"];

        const batchUsersResponse = await fetch(`${GATEWAY_URL}/api/internal/users/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Service': 'gig-service'
            },
            body: JSON.stringify({
                userIds: testUserIds
            })
        });

        console.log(`   Status: ${batchUsersResponse.status}`);
        if (batchUsersResponse.ok) {
            const batchResult = await batchUsersResponse.json();
            console.log('   ✅ Batch users fetch successful');
            console.log(`   Found: ${batchResult.data?.count || 0}/${batchResult.data?.requested || 0} users`);
        } else {
            const errorText = await batchUsersResponse.text();
            console.log('   ❌ Batch users fetch failed:', errorText);
        }

        // Test 3: Test direct service URL (should also work)
        console.log('\n📡 Test 3: Direct service call (bypass gateway)');
        const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:4005';

        const directResponse = await fetch(`${USER_SERVICE_URL}/internal/users/${testUserId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Internal-Service': 'gig-service'
            }
        });

        console.log(`   Direct service status: ${directResponse.status}`);
        if (directResponse.ok) {
            const directResult = await directResponse.json();
            console.log('   ✅ Direct service call successful');
            console.log(`   User: ${directResult.data?.user?.username || 'N/A'}`);
        } else {
            const errorText = await directResponse.text();
            console.log('   ❌ Direct service call failed:', errorText);
        }

        console.log('\n✅ Internal API gateway tests completed');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// Run the test
if (require.main === module) {
    testInternalGatewayRoutes();
}

module.exports = { testInternalGatewayRoutes };