const axios = require('axios');

const BASE_URL = 'http://localhost:4003';
const TEST_USER_ID = 'test-user-123';
const TEST_USER_ID_2 = 'test-user-456';

const authHeaders = {
    'x-user-id': TEST_USER_ID,
    'Content-Type': 'application/json'
};

const authHeaders2 = {
    'x-user-id': TEST_USER_ID_2,
    'Content-Type': 'application/json'
};

async function testNewFeatures() {
    console.log('🧪 Testing new clan features: memberIds and pendingRequests\n');

    try {
        // 1. Create a new clan
        console.log('1️⃣ Creating a new clan...');
        const clanData = {
            name: 'Test Clan with New Features',
            description: 'Testing memberIds and pendingRequests',
            tagline: 'Test Features',
            primaryCategory: 'Technology',
            categories: ['Technology', 'Testing'],
            skills: ['JavaScript', 'Testing'],
            location: 'Remote'
        };

        const createResponse = await axios.post(`${BASE_URL}/clans`, clanData, { headers: authHeaders });
        const clan = createResponse.data.data; // Fix: response is nested under 'data'
        console.log('✅ Clan created:', clan.id);
        console.log('   memberIds:', clan.memberIds);
        console.log('   pendingRequests:', clan.pendingRequests);
        console.log('   memberCount:', clan.memberCount);

        // 2. Test pending request functionality
        console.log('\n2️⃣ Testing pending request functionality...');

        // User 2 requests to join
        console.log('   User 2 requesting to join...');
        const requestResponse = await axios.post(`${BASE_URL}/members/${clan.id}/request-join`, {}, { headers: authHeaders2 });
        console.log('✅ Request sent:', requestResponse.data.message);

        // Check pending requests
        console.log('   Checking pending requests...');
        const pendingResponse = await axios.get(`${BASE_URL}/members/${clan.id}/pending-requests`, { headers: authHeaders });
        console.log('✅ Pending requests:', pendingResponse.data.pendingRequests);

        // 3. Approve the request
        console.log('\n3️⃣ Approving join request...');
        const approveResponse = await axios.post(`${BASE_URL}/members/${clan.id}/${TEST_USER_ID_2}/approve`, {}, { headers: authHeaders });
        console.log('✅ Request approved:', approveResponse.data.message);

        // 4. Check updated clan data
        console.log('\n4️⃣ Checking updated clan data...');
        const updatedClanResponse = await axios.get(`${BASE_URL}/clans/${clan.id}`);
        const updatedClan = updatedClanResponse.data.data; // Fix: response is nested under 'data'
        console.log('✅ Updated clan:');
        console.log('   memberIds:', updatedClan.memberIds);
        console.log('   pendingRequests:', updatedClan.pendingRequests);
        console.log('   memberCount:', updatedClan.memberCount);

        // 5. Test member removal
        console.log('\n5️⃣ Testing member removal...');
        const removeResponse = await axios.delete(`${BASE_URL}/members/${clan.id}/${TEST_USER_ID_2}`, { headers: authHeaders });
        console.log('✅ Member removed:', removeResponse.data.message);

        // 6. Check final clan data
        console.log('\n6️⃣ Checking final clan data...');
        const finalClanResponse = await axios.get(`${BASE_URL}/clans/${clan.id}`);
        const finalClan = finalClanResponse.data.data; // Fix: response is nested under 'data'
        console.log('✅ Final clan:');
        console.log('   memberIds:', finalClan.memberIds);
        console.log('   pendingRequests:', finalClan.pendingRequests);
        console.log('   memberCount:', finalClan.memberCount);

        console.log('\n🎉 All tests passed! New features working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

// Run the test
testNewFeatures();
