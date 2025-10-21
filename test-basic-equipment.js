const axios = require('axios');

async function testBasicEquipmentRoute() {
    try {
        console.log('🧪 Testing Basic Equipment Route Access...\n');

        const headers = {
            'Content-Type': 'application/json',
            'x-user-id': 'test-crew-user-123'
        };

        // Test simple GET request to equipment endpoint
        console.log('📝 Testing: GET /equipment (direct user service)...');
        try {
            const response = await axios.get('http://localhost:4002/equipment', { headers });
            console.log(`✅ Equipment route accessible - Status: ${response.status}`);
            console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        } catch (error) {
            if (error.response) {
                console.log(`❌ Equipment route error - Status: ${error.response.status}`);
                console.log(`   Error: ${error.response.data?.message || error.response.statusText}`);
                console.log(`   Full response: ${JSON.stringify(error.response.data, null, 2)}`);
            } else {
                console.log(`❌ Network error: ${error.message}`);
            }
        }

        console.log('\n📝 Testing: GET /health (sanity check)...');
        try {
            const healthResponse = await axios.get('http://localhost:4002/health');
            console.log(`✅ Health check - Status: ${healthResponse.status}`);
        } catch (error) {
            console.log(`❌ Health check failed: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Test setup failed:', error.message);
    }
}

testBasicEquipmentRoute();
