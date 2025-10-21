const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:4000/api';
const TEST_USER_TOKEN = process.env.TEST_TOKEN || 'your-test-token-here';

const headers = {
    'Authorization': `Bearer ${TEST_USER_TOKEN}`,
    'Content-Type': 'application/json'
};

// Test functions
async function testSearchInfluencers() {
    console.log('\n🔍 Testing Search Influencers...');

    const searchParams = {
        query: '',
        primaryNiche: '',
        primaryPlatform: 'INSTAGRAM',
        location: '',
        followersMin: 1000,
        followersMax: 50000,
        page: 1,
        limit: 5
    };

    const queryString = new URLSearchParams(
        Object.entries(searchParams).filter(([_, value]) => value !== '')
    ).toString();

    try {
        const response = await axios.get(`${API_BASE_URL}/search/influencers?${queryString}`, { headers });

        console.log('✅ Search Influencers Response:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Found: ${response.data.data.results.length} influencers`);
        console.log(`   Total: ${response.data.data.pagination.total}`);

        // Show first result if available
        if (response.data.data.results.length > 0) {
            const influencer = response.data.data.results[0];
            console.log(`   First Result: ${influencer.firstName} ${influencer.lastName} (@${influencer.username})`);
            console.log(`                 Platform: ${influencer.primaryPlatform}`);
            console.log(`                 Niche: ${influencer.primaryNiche}`);
        }

    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
    }
}

async function testSearchCrew() {
    console.log('\n🔍 Testing Search Crew Members...');

    const searchParams = {
        query: '',
        experienceLevel: 'INTERMEDIATE',
        availability: '',
        workStyle: '',
        skills: 'photography,videography',
        location: '',
        hourlyRateMin: 20,
        hourlyRateMax: 100,
        page: 1,
        limit: 5
    };

    const queryString = new URLSearchParams(
        Object.entries(searchParams).filter(([_, value]) => value !== '')
    ).toString();

    try {
        const response = await axios.get(`${API_BASE_URL}/search/crew?${queryString}`, { headers });

        console.log('✅ Search Crew Response:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Found: ${response.data.data.results.length} crew members`);
        console.log(`   Total: ${response.data.data.pagination.total}`);

        // Show first result if available
        if (response.data.data.results.length > 0) {
            const crew = response.data.data.results[0];
            console.log(`   First Result: ${crew.firstName} ${crew.lastName} (@${crew.username})`);
            console.log(`                 Experience: ${crew.experienceLevel}`);
            console.log(`                 Skills: ${crew.crewSkills?.join(', ') || 'N/A'}`);
            console.log(`                 Rate: $${crew.hourlyRate}/hr`);
        }

    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
    }
}

async function testSearchUsers() {
    console.log('\n🔍 Testing General User Search...');

    const searchParams = {
        query: 'photo',
        roles: 'INFLUENCER,CREW',
        location: '',
        page: 1,
        limit: 5
    };

    const queryString = new URLSearchParams(
        Object.entries(searchParams).filter(([_, value]) => value !== '')
    ).toString();

    try {
        const response = await axios.get(`${API_BASE_URL}/search/users?${queryString}`, { headers });

        console.log('✅ Search Users Response:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Found: ${response.data.data.results.length} users`);
        console.log(`   Total: ${response.data.data.pagination.total}`);

        // Show results
        response.data.data.results.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (@${user.username})`);
            console.log(`      Roles: ${user.roles?.join(', ') || 'N/A'}`);
            console.log(`      Location: ${user.location || 'N/A'}`);
        });

    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
    }
}

async function testSearchBrands() {
    console.log('\n🔍 Testing Search Brands...');

    const searchParams = {
        query: '',
        industry: 'TECHNOLOGY',
        companyType: '',
        location: '',
        page: 1,
        limit: 5
    };

    const queryString = new URLSearchParams(
        Object.entries(searchParams).filter(([_, value]) => value !== '')
    ).toString();

    try {
        const response = await axios.get(`${API_BASE_URL}/search/brands?${queryString}`, { headers });

        console.log('✅ Search Brands Response:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Found: ${response.data.data.results.length} brands`);
        console.log(`   Total: ${response.data.data.pagination.total}`);

        // Show first result if available
        if (response.data.data.results.length > 0) {
            const brand = response.data.data.results[0];
            console.log(`   First Result: ${brand.companyName || brand.firstName + ' ' + brand.lastName}`);
            console.log(`                 Industry: ${brand.industry}`);
            console.log(`                 Type: ${brand.companyType}`);
        }

    } catch (error) {
        console.log('❌ Error:', error.response?.data || error.message);
    }
}

// Main execution
async function runSearchTests() {
    console.log('🚀 Testing 50BraIns Search API Routes');
    console.log('=====================================');

    if (TEST_USER_TOKEN === 'your-test-token-here') {
        console.log('❗ Please set a valid TEST_TOKEN environment variable');
        console.log('   Example: $env:TEST_TOKEN="your-actual-jwt-token"; node test-search-routes.js');
        return;
    }

    await testSearchInfluencers();
    await testSearchCrew();
    await testSearchUsers();
    await testSearchBrands();

    console.log('\n✅ Search API tests completed!');
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
runSearchTests().catch(console.error);