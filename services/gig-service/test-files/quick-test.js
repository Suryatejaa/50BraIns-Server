const axios = require('axios');

async function quickTest() {
    try {
        // First check if service is running
        console.log('🔍 Checking if gig service is running...');

        const healthResponse = await axios.get('http://localhost:4004/health');
        console.log('✅ Service is running:', healthResponse.data);

        // Test the new endpoint
        console.log('\n🧪 Testing /applications/received endpoint...');

        const headers = {
            'x-user-id': '123e4567-e89b-12d3-a456-426614174000',
            'x-user-email': 'creator@example.com',
            'x-user-role': 'user'
        };

        const response = await axios.get('http://localhost:4004/applications/received', {
            headers
        });

        console.log('✅ Endpoint Response:', response.status);
        console.log('📄 Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

quickTest();
