const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // API Gateway URL

// Test with different user ID formats
const testUserIds = [
    'cf2e0a3f-df3b-4cfb-ada5-c3dc6aa32117', // UUID format (what frontend sends)
    'test-user-123', // String format (what we've been testing with)
    'cmeeajyrd0001pws03gswb011' // CUID format (clan ID format)
];

async function testDifferentUserIds() {
    console.log('🧪 Testing different user ID formats for clan permissions\n');

    for (const userId of testUserIds) {
        console.log(`\n🔍 Testing with User ID: ${userId}`);
        
        const authHeaders = {
            'x-user-id': userId,
            'Content-Type': 'application/json'
        };

        try {
            // Test getting pending requests
            const response = await axios.get(`${BASE_URL}/api/clans/cmeeajyrd0001pws03gswb011/join-requests`, { headers: authHeaders });
            console.log(`✅ SUCCESS! Status: ${response.status}`);
            console.log(`   Response: ${JSON.stringify(response.data)}`);
        } catch (error) {
            console.log(`❌ FAILED: ${error.response?.data?.error || error.message}`);
        }
    }

    console.log('\n🎯 Analysis:');
    console.log('   - If UUID format works, the issue is elsewhere');
    console.log('   - If only test-user-123 works, there\'s a format mismatch');
    console.log('   - If none work, there\'s a deeper permission issue');
}

testDifferentUserIds();
