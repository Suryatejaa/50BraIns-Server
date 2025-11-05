const axios = require('axios');

const API_GATEWAY_URL = 'http://localhost:3000';
const GIG_SERVICE_URL = 'http://localhost:4004';

// Test headers for authentication
const authHeaders = {
    'Authorization': 'Bearer dummy-jwt-token',
    'Content-Type': 'application/json'
};

const directHeaders = {
    'x-user-id': '123e4567-e89b-12d3-a456-426614174000',
    'x-user-email': 'test@example.com',
    'x-user-role': 'user',
    'Content-Type': 'application/json'
};

async function testRoute(gatewayUrl, directUrl, routeName) {
    console.log(`\n🧪 Testing ${routeName}...`);

    try {
        // Test direct service call first
        console.log(`  Direct: ${directUrl}`);
        const directResponse = await axios.get(directUrl, { headers: directHeaders });
        console.log(`  ✅ Direct Success: ${directResponse.status}`);

        // Test through API Gateway
        console.log(`  Gateway: ${gatewayUrl}`);
        try {
            const gatewayResponse = await axios.get(gatewayUrl, { headers: authHeaders });
            console.log(`  ✅ Gateway Success: ${gatewayResponse.status}`);
        } catch (gatewayError) {
            if (gatewayError.response) {
                console.log(`  ⚠️ Gateway Error: ${gatewayError.response.status} - ${gatewayError.response.data.error || gatewayError.response.data.message}`);
            } else {
                console.log(`  ❌ Gateway Connection Error: ${gatewayError.message}`);
            }
        }

    } catch (directError) {
        if (directError.response) {
            console.log(`  ❌ Direct Error: ${directError.response.status} - ${directError.response.data.error || directError.response.data.message}`);
        } else {
            console.log(`  ❌ Direct Connection Error: ${directError.message}`);
        }
    }
}

async function runAllTests() {
    console.log('🎯 Testing All Gig Service Routes');
    console.log('=====================================');

    const routes = [
        {
            name: 'Applications Received',
            gateway: `${API_GATEWAY_URL}/api/applications/received`,
            direct: `${GIG_SERVICE_URL}/applications/received`
        },
        {
            name: 'Gig Feed',
            gateway: `${API_GATEWAY_URL}/api/gig/feed`,
            direct: `${GIG_SERVICE_URL}/gig/feed`
        },
        {
            name: 'My Posted Gigs',
            gateway: `${API_GATEWAY_URL}/api/my/posted`,
            direct: `${GIG_SERVICE_URL}/my/posted`
        },
        {
            name: 'Submissions',
            gateway: `${API_GATEWAY_URL}/api/submissions`,
            direct: `${GIG_SERVICE_URL}/submissions`
        }
    ];

    for (const route of routes) {
        await testRoute(route.gateway, route.direct, route.name);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
    }

    console.log('\n✅ All tests completed!');
}

runAllTests();
