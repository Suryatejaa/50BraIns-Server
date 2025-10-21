const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:4000/api';
const TEST_USER_TOKEN = process.env.TEST_TOKEN || 'your-test-token-here';

const headers = {
    'Authorization': `Bearer ${TEST_USER_TOKEN}`,
    'Content-Type': 'application/json'
};

// Test global user search
async function testGlobalUserSearch() {
    console.log('🔍 Testing Global User Search');
    console.log('============================');

    // Test 1: Search without query (get all users)
    console.log('\n1️⃣ Get all users (no search query)');
    try {
        const response1 = await axios.get(`${API_BASE_URL}/search/users?page=1&limit=5`, { headers });
        console.log(`   ✅ Found ${response1.data.data.results.length} users`);
        console.log(`   📊 Total users: ${response1.data.data.pagination.total}`);

        response1.data.data.results.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (@${user.username})`);
            console.log(`      Roles: ${user.roles?.join(', ')}`);
        });
    } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 2: Search by first name
    console.log('\n2️⃣ Search by first name: "john"');
    try {
        const response2 = await axios.get(`${API_BASE_URL}/search/users?query=john&page=1&limit=5`, { headers });
        console.log(`   ✅ Found ${response2.data.data.results.length} users`);

        response2.data.data.results.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (@${user.username})`);
            console.log(`      Roles: ${user.roles?.join(', ')}`);
        });
    } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 3: Search by username
    console.log('\n3️⃣ Search by username: "user"');
    try {
        const response3 = await axios.get(`${API_BASE_URL}/search/users?query=user&page=1&limit=5`, { headers });
        console.log(`   ✅ Found ${response3.data.data.results.length} users`);

        response3.data.data.results.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (@${user.username})`);
            console.log(`      Roles: ${user.roles?.join(', ')}`);
        });
    } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 4: Search with partial name
    console.log('\n4️⃣ Search partial name: "an"');
    try {
        const response4 = await axios.get(`${API_BASE_URL}/search/users?query=an&page=1&limit=3`, { headers });
        console.log(`   ✅ Found ${response4.data.data.results.length} users`);

        response4.data.data.results.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (@${user.username})`);
            console.log(`      Roles: ${user.roles?.join(', ')}`);
        });
    } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }
}

// Show API usage examples
function showAPIExamples() {
    console.log('\n📋 Global User Search API Usage:');
    console.log('=================================');

    console.log('\\n🔍 API Endpoint:');
    console.log('GET /api/search/users');

    console.log('\\n📝 Query Parameters:');
    console.log('- query: Search firstName, lastName, username (optional)');
    console.log('- page: Page number (default: 1)');
    console.log('- limit: Results per page (default: 10)');

    console.log('\\n💡 Example API Calls:');
    console.log('GET /api/search/users                     # Get all users');
    console.log('GET /api/search/users?query=john          # Search for "john"');
    console.log('GET /api/search/users?query=user1         # Search for "user1"');
    console.log('GET /api/search/users?query=sarah&limit=5 # Search "sarah", limit 5');

    console.log('\\n📊 Response Format:');
    console.log('```json');
    console.log('{');
    console.log('  "success": true,');
    console.log('  "data": {');
    console.log('    "results": [');
    console.log('      {');
    console.log('        "id": "123",');
    console.log('        "firstName": "John",');
    console.log('        "lastName": "Doe",');
    console.log('        "username": "johndoe",');
    console.log('        "profilePicture": "url",');
    console.log('        "bio": "...",');
    console.log('        "location": "New York",');
    console.log('        "roles": ["INFLUENCER", "CREW"]');
    console.log('      }');
    console.log('    ],');
    console.log('    "pagination": {');
    console.log('      "total": 25,');
    console.log('      "page": 1,');
    console.log('      "limit": 10,');
    console.log('      "pages": 3');
    console.log('    }');
    console.log('  }');
    console.log('}');
    console.log('```');
}

// Main execution
async function runTests() {
    if (TEST_USER_TOKEN === 'your-test-token-here') {
        console.log('❗ Please set a valid TEST_TOKEN environment variable');
        console.log('   Example: $env:TEST_TOKEN="your-actual-jwt-token"; node test-global-search.js');
        showAPIExamples();
        return;
    }

    await testGlobalUserSearch();
    showAPIExamples();

    console.log('\\n✅ Global user search tests completed!');
    console.log('\\n🎯 Summary: Simple search by firstName, lastName, username only');
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run tests
runTests().catch(console.error);