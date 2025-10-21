const axios = require('axios');

async function testCorrectEndpoint() {
    try {
        console.log('🧪 Testing the correct /applications/received endpoint...\n');

        // Test headers that would come from API Gateway
        const headers = {
            'x-user-id': '123e4567-e89b-12d3-a456-426614174000',
            'x-user-email': 'creator@example.com',
            'x-user-role': 'user',
            'Content-Type': 'application/json'
        };

        console.log('Testing direct gig service endpoint...');
        console.log('URL: http://localhost:4004/applications/received');
        console.log('Headers:', headers);

        const response = await axios.get('http://localhost:4004/applications/received', {
            headers
        });

        console.log('\n✅ Success!');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));

        // Test API Gateway endpoint (if gateway is running)
        console.log('\n🌐 Testing through API Gateway...');
        try {
            const gatewayResponse = await axios.get('http://localhost:3000/api/applications/received', {
                headers: {
                    'Authorization': 'Bearer dummy-token', // Would be real JWT in production
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ API Gateway Success!');
            console.log('Status:', gatewayResponse.status);
            console.log('Response:', JSON.stringify(gatewayResponse.data, null, 2));
        } catch (gatewayError) {
            console.log('⚠️ API Gateway test failed (expected if gateway not running)');
            if (gatewayError.response) {
                console.log('Gateway Error Status:', gatewayError.response.status);
                console.log('Gateway Error:', gatewayError.response.data);
            } else {
                console.log('Gateway Error:', gatewayError.message);
            }
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

testCorrectEndpoint();
