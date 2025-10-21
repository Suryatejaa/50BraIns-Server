const axios = require('axios');

const BASE_URL = 'http://localhost:4003';
const TEST_USER_ID = 'test-user-123';

const authHeaders = {
    'x-user-id': TEST_USER_ID,
    'Content-Type': 'application/json'
};

async function testMyClans() {
    console.log('🧪 Testing getUserClans endpoint\n');

    try {
        // First create a clan to ensure user has memberships
        console.log('1️⃣ Creating a test clan...');
        const clanData = {
            name: 'Test Clan for My Clans',
            description: 'Testing getUserClans endpoint'
        };

        const createResponse = await axios.post(`${BASE_URL}/clans`, clanData, { headers: authHeaders });
        const clan = createResponse.data.data;
        console.log('✅ Clan created:', clan.id);

        // Now test getUserClans endpoint
        console.log('\n2️⃣ Testing getUserClans endpoint...');
        const myClansResponse = await axios.get(`${BASE_URL}/clans/my`, { headers: authHeaders });
        console.log('✅ My Clans response received');
        console.log('Response structure:', JSON.stringify(myClansResponse.data, null, 2));

        // Check if the new fields are present
        if (myClansResponse.data.data && myClansResponse.data.data.length > 0) {
            const firstClan = myClansResponse.data.data[0];
            console.log('\n3️⃣ Checking new fields in first clan:');
            console.log('   memberIds:', firstClan.memberIds);
            console.log('   pendingRequests:', firstClan.pendingRequests);
            console.log('   headId:', firstClan.headId);
            console.log('   admins:', firstClan.admins);
        }

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
testMyClans();
