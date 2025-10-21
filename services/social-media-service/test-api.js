const axios = require('axios');

const BASE_URL = 'http://localhost:4008';

async function testSocialMediaService() {
    console.log('🧪 Testing Social Media Service...\n');

    try {
        // Test 1: Health Check
        console.log('1. Testing health check...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health check:', healthResponse.data);

        // Test 2: Link an Instagram account
        console.log('\n2. Testing account linking...');
        const linkData = {
            userId: 'test-user-123',
            platform: 'instagram',
            username: 'johndoe',
            profileUrl: 'https://instagram.com/johndoe'
        };
        const linkResponse = await axios.post(`${BASE_URL}/api/social-media/link`, linkData);
        console.log('✅ Account linked:', linkResponse.data);

        // Test 3: Link a YouTube account
        console.log('\n3. Testing YouTube account linking...');
        const youtubeData = {
            userId: 'test-user-123',
            platform: 'youtube',
            username: 'johndoechannel',
            profileUrl: 'https://youtube.com/@johndoechannel'
        };
        const youtubeResponse = await axios.post(`${BASE_URL}/api/social-media/link`, youtubeData);
        console.log('✅ YouTube account linked:', youtubeResponse.data);

        // Test 4: Get linked accounts
        console.log('\n4. Testing get linked accounts...');
        const accountsResponse = await axios.get(`${BASE_URL}/api/social-media/test-user-123`);
        console.log('✅ Linked accounts:', accountsResponse.data);

        // Test 5: Sync account stats
        console.log('\n5. Testing account sync...');
        const syncResponse = await axios.put(`${BASE_URL}/api/social-media/sync/instagram/test-user-123`);
        console.log('✅ Account synced:', syncResponse.data);

        // Test 6: Get analytics
        console.log('\n6. Testing analytics...');
        const analyticsResponse = await axios.get(`${BASE_URL}/api/social-media/analytics/test-user-123`);
        console.log('✅ Analytics:', analyticsResponse.data);

        // Test 7: Get platform stats
        console.log('\n7. Testing platform statistics...');
        const statsResponse = await axios.get(`${BASE_URL}/api/social-media/stats/platform`);
        console.log('✅ Platform stats:', statsResponse.data);

        console.log('\n🎉 All tests passed! Social Media Service is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the tests
testSocialMediaService();
