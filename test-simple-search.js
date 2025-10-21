const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:4000/api';
const TEST_USER_TOKEN = process.env.TEST_TOKEN || 'your-test-token-here';

const headers = {
    'Authorization': `Bearer ${TEST_USER_TOKEN}`,
    'Content-Type': 'application/json'
};

// Test search with username/names and skills
async function testSimpleSearch() {
    console.log('🔍 Testing Simple Search: Username/Names + Skills');
    console.log('================================================');

    // Test 1: Search by username/name only
    console.log('\n1️⃣ Search by username/name: "user1"');
    try {
        const response1 = await axios.get(`${API_BASE_URL}/search/users?query=user1&page=1&limit=5`, { headers });
        console.log(`   ✅ Found ${response1.data.data.results.length} users`);

        response1.data.data.results.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (@${user.username})`);
            console.log(`      Roles: ${user.roles?.join(', ')}`);
        });
    } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 2: Search crew members by skills only
    console.log('\n2️⃣ Search crew by skills: Photography + Videography');
    try {
        const response2 = await axios.get(`${API_BASE_URL}/search/crew?skills=Photography,Videography&page=1&limit=5`, { headers });
        console.log(`   ✅ Found ${response2.data.data.results.length} crew members`);

        response2.data.data.results.forEach((crew, index) => {
            console.log(`   ${index + 1}. ${crew.firstName} ${crew.lastName} (@${crew.username})`);
            console.log(`      Skills: ${crew.crewSkills?.join(', ') || 'N/A'}`);
            console.log(`      Rate: $${crew.hourlyRate || 'N/A'}/hr`);
        });
    } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 3: Combined search - username + skills
    console.log('\n3️⃣ Combined search: "photo" in name/bio + Photography skill');
    try {
        const response3 = await axios.get(`${API_BASE_URL}/search/crew?query=photo&skills=Photography&page=1&limit=5`, { headers });
        console.log(`   ✅ Found ${response3.data.data.results.length} crew members`);

        response3.data.data.results.forEach((crew, index) => {
            console.log(`   ${index + 1}. ${crew.firstName} ${crew.lastName} (@${crew.username})`);
            console.log(`      Bio: ${crew.bio?.substring(0, 50) || 'No bio'}...`);
            console.log(`      Skills: ${crew.crewSkills?.join(', ') || 'N/A'}`);
        });
    } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }

    // Test 4: Search with multiple skills
    console.log('\n4️⃣ Search crew with multiple skills: Photography, Videography, Editing');
    try {
        const response4 = await axios.get(`${API_BASE_URL}/search/crew?skills=Photography,Videography,Editing&page=1&limit=5`, { headers });
        console.log(`   ✅ Found ${response4.data.data.results.length} crew members`);

        response4.data.data.results.forEach((crew, index) => {
            console.log(`   ${index + 1}. ${crew.firstName} ${crew.lastName} (@${crew.username})`);
            console.log(`      Skills: ${crew.crewSkills?.join(', ') || 'N/A'}`);
        });
    } catch (error) {
        console.log('   ❌ Error:', error.response?.data?.message || error.message);
    }
}

// Example API calls for your frontend
function showAPIExamples() {
    console.log('\n📋 API Examples for Your Frontend:');
    console.log('=====================================');

    console.log('\n🔍 Search by username/name:');
    console.log('GET /api/search/users?query=john&page=1&limit=10');
    console.log('GET /api/search/crew?query=sarah&page=1&limit=10');

    console.log('\n🛠️ Search by skills:');
    console.log('GET /api/search/crew?skills=Photography&page=1&limit=10');
    console.log('GET /api/search/crew?skills=Photography,Videography&page=1&limit=10');
    console.log('GET /api/search/crew?skills=Photography,Videography,Editing&page=1&limit=10');

    console.log('\n🔄 Combined search:');
    console.log('GET /api/search/crew?query=john&skills=Photography,Editing&page=1&limit=10');

    console.log('\n📝 Key Points:');
    console.log('- query: searches firstName, lastName, username, bio');
    console.log('- skills: comma-separated list (Photography,Videography,Editing)');
    console.log('- Both can be used together or separately');
    console.log('- Case-insensitive search');
    console.log('- Returns paginated results');
}

// Main execution
async function runTests() {
    if (TEST_USER_TOKEN === 'your-test-token-here') {
        console.log('❗ Please set a valid TEST_TOKEN environment variable');
        console.log('   Example: $env:TEST_TOKEN="your-actual-jwt-token"; node test-simple-search.js');
        showAPIExamples();
        return;
    }

    await testSimpleSearch();
    showAPIExamples();

    console.log('\n✅ Simple search tests completed!');
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