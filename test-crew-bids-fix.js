const axios = require('axios');

const API_GATEWAY_URL = 'http://localhost:3000';
const DIRECT_GIG_SERVICE_URL = 'http://localhost:4004';

async function testCrewBidsEndpoint() {
    try {
        console.log('🧪 Testing Crew Bids Endpoint...\n');

        const headers = {
            'Content-Type': 'application/json',
            'x-user-id': 'test-user-123'
        };

        // Test 1: Direct call to gig service
        console.log('📝 Test 1: Direct call to gig service /crew/bids...');
        try {
            const directResponse = await axios.get(`${DIRECT_GIG_SERVICE_URL}/crew/bids`, { headers });
            console.log('✅ Direct gig service call successful');
            console.log('   Status:', directResponse.status);
            console.log('   Success:', directResponse.data.success);
            console.log('   Data keys:', Object.keys(directResponse.data.data || {}));
        } catch (directError) {
            console.log('❌ Direct gig service call failed');
            console.log('   Status:', directError.response?.status);
            console.log('   Error:', directError.response?.data?.message || directError.message);

            if (directError.response?.data?.error) {
                console.log('   Error details:', directError.response.data.error);
            }
        }

        console.log('');

        // Test 2: Call through API Gateway
        console.log('📝 Test 2: Call through API Gateway /api/crew/bids...');
        try {
            const gatewayResponse = await axios.get(`${API_GATEWAY_URL}/api/crew/bids`, { headers });
            console.log('✅ API Gateway call successful');
            console.log('   Status:', gatewayResponse.status);
            console.log('   Success:', gatewayResponse.data.success);
            console.log('   Data keys:', Object.keys(gatewayResponse.data.data || {}));
        } catch (gatewayError) {
            console.log('❌ API Gateway call failed');
            console.log('   Status:', gatewayError.response?.status);
            console.log('   Error:', gatewayError.response?.data?.message || gatewayError.message);

            if (gatewayError.response?.data?.error) {
                console.log('   Error details:', gatewayError.response.data.error);
            }
        }

        console.log('');

        // Test 3: Test other crew endpoints
        console.log('📝 Test 3: Testing other crew endpoints...');

        const crewEndpoints = [
            '/crew/bids/stats',
            // We can't test these without valid IDs:
            // '/crew/bids/123',
            // '/crew/bids/123/withdraw'
        ];

        for (const endpoint of crewEndpoints) {
            try {
                const response = await axios.get(`${API_GATEWAY_URL}/api${endpoint}`, { headers });
                console.log(`✅ ${endpoint} - Status: ${response.status} - Success: ${response.data.success}`);
            } catch (error) {
                console.log(`❌ ${endpoint} - Status: ${error.response?.status} - Error: ${error.response?.data?.message || error.message}`);
            }
        }

        console.log('\n🎯 Test Summary:');
        console.log('   - Fixed Prisma validation errors by using correct field names');
        console.log('   - Updated all crew methods to use header-based user authentication');
        console.log('   - Removed references to non-existent schema fields');
        console.log('   - Crew routes should now work properly through API Gateway');

    } catch (error) {
        console.error('❌ Test setup failed:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure both services are running:');
            console.log('   - API Gateway on port 3000');
            console.log('   - Gig Service on port 4004');
        }
    }
}

testCrewBidsEndpoint();
