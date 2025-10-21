const axios = require('axios');

const BASE_URL = 'http://localhost:4003';
const TEST_USER_ID = 'test-user-123';

const authHeaders = {
    'x-user-id': TEST_USER_ID,
    'Content-Type': 'application/json'
};

async function simpleTest() {
    console.log('🧪 Simple test of clan service\n');

    try {
        // Test health endpoint
        console.log('1️⃣ Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check passed:', healthResponse.data);

        // Test creating a clan
        console.log('\n2️⃣ Testing clan creation...');
        const clanData = {
            name: 'Simple Test Clan',
            description: 'A simple test clan'
        };

        const createResponse = await axios.post(`${BASE_URL}/clans`, clanData, { headers: authHeaders });
        console.log('✅ Clan created successfully');
        console.log('Response:', JSON.stringify(createResponse.data, null, 2));

    } catch (error) {
        console.error('❌ Test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Run the test
simpleTest();
