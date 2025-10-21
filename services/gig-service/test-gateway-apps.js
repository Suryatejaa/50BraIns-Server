const axios = require('axios');

async function testApplicationsEndpoint() {
    console.log('🧪 Testing /api/applications/received through API Gateway...\n');

    try {
        // Test with dummy JWT token (would need real auth in production)
        const response = await axios.get('http://localhost:3000/api/applications/received', {
            headers: {
                'Authorization': 'Bearer dummy-token',
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ API Gateway Success!');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('⚠️ Expected error (authentication required):');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Error:', error.response.data);
        } else {
            console.log('Connection Error:', error.message);
        }
    }
}

// Wait a bit for API Gateway to start, then test
setTimeout(testApplicationsEndpoint, 3000);
