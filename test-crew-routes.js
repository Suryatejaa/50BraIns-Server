const axios = require('axios');

const API_GATEWAY_URL = 'http://localhost:3000';
const DIRECT_GIG_SERVICE_URL = 'http://localhost:4004';

async function testCrewRoutes() {
    try {
        console.log('🧪 Testing Crew Routes...\n');

        // Test headers for authenticated request
        const headers = {
            'Content-Type': 'application/json',
            'x-user-id': 'test-user-123',
            'Authorization': 'Bearer test-token'
        };

        // Test 1: Direct call to gig service
        console.log('📝 Test 1: Direct call to gig service /crew/bids...');
        try {
            const directResponse = await axios.get(`${DIRECT_GIG_SERVICE_URL}/crew/bids`, { headers });
            console.log('✅ Direct gig service call successful');
            console.log('   Status:', directResponse.status);
            console.log('   Response:', directResponse.data);
        } catch (directError) {
            console.log('❌ Direct gig service call failed');
            console.log('   Error:', directError.response?.data || directError.message);
        }

        console.log('');

        // Test 2: Call through API Gateway
        console.log('📝 Test 2: Call through API Gateway /api/crew/bids...');
        try {
            const gatewayResponse = await axios.get(`${API_GATEWAY_URL}/api/crew/bids`, { headers });
            console.log('✅ API Gateway call successful');
            console.log('   Status:', gatewayResponse.status);
            console.log('   Response:', gatewayResponse.data);
        } catch (gatewayError) {
            console.log('❌ API Gateway call failed');
            console.log('   Status:', gatewayError.response?.status);
            console.log('   Error:', gatewayError.response?.data || gatewayError.message);
        }

        console.log('');

        // Test 3: Check if other gig routes work through gateway
        console.log('📝 Test 3: Testing other gig routes through gateway...');

        const testRoutes = [
            '/api/gig',
            '/api/my/posted',
            '/api/applications/received'
        ];

        for (const route of testRoutes) {
            try {
                const response = await axios.get(`${API_GATEWAY_URL}${route}`, { headers });
                console.log(`✅ ${route} - Status: ${response.status}`);
            } catch (error) {
                console.log(`❌ ${route} - Status: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Test setup failed:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure both services are running:');
            console.log('   - API Gateway on port 3000');
            console.log('   - Gig Service on port 4004');
        }
    }
}

testCrewRoutes();
