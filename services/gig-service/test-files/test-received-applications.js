const axios = require('axios');

const BASE_URL = 'http://localhost:4004';

// Test the received applications endpoint
async function testReceivedApplications() {
    try {
        console.log('🧪 Testing GET /applications/received endpoint...\n');

        // Test with mock authentication headers (as would come from API Gateway)
        const headers = {
            'x-user-id': '123e4567-e89b-12d3-a456-426614174000',
            'x-user-email': 'creator@example.com',
            'x-user-role': 'user',
            'Content-Type': 'application/json'
        };

        console.log('Making request with headers:', headers);

        const response = await axios.get(`${BASE_URL}/applications/received`, {
            headers
        });

        console.log('\n✅ Response Status:', response.status);
        console.log('✅ Response Data:');
        console.log(JSON.stringify(response.data, null, 2));

        // Test pagination parameters
        console.log('\n🧪 Testing with pagination parameters...');
        const paginatedResponse = await axios.get(`${BASE_URL}/applications/received?page=1&limit=5`, {
            headers
        });

        console.log('✅ Paginated Response:');
        console.log(JSON.stringify(paginatedResponse.data, null, 2));

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

// Test without authentication headers
async function testWithoutAuth() {
    try {
        console.log('\n🧪 Testing without authentication headers (should fail)...\n');

        const response = await axios.get(`${BASE_URL}/applications/received`);
        console.log('⚠️ Unexpected success:', response.data);

    } catch (error) {
        console.log('✅ Correctly rejected unauthorized request');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', error.response.data);
        }
    }
}

// Run tests
async function runTests() {
    console.log('🎯 Testing Received Applications Endpoint');
    console.log('==========================================\n');

    await testReceivedApplications();
    await testWithoutAuth();

    console.log('\n✅ All tests completed!');
}

runTests();
