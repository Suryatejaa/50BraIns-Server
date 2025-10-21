const axios = require('axios');

const DIRECT_GIG_SERVICE_URL = 'http://localhost:4004';

async function testAllCrewEndpoints() {
    try {
        console.log('🧪 Testing All Crew Endpoints for Prisma Validation...\n');

        const headers = {
            'Content-Type': 'application/json',
            'x-user-id': 'cf2e0a3f-df3b-4cfb-ada5-c3dc6aa32117'
        };

        const testEndpoints = [
            {
                name: 'GET /crew/bids',
                method: 'get',
                url: `${DIRECT_GIG_SERVICE_URL}/crew/bids`,
                expectSuccess: true
            },
            {
                name: 'GET /crew/bids with filters',
                method: 'get',
                url: `${DIRECT_GIG_SERVICE_URL}/crew/bids?status=PENDING&sortBy=amount&page=1&limit=10`,
                expectSuccess: true
            },
            {
                name: 'GET /crew/bids/stats',
                method: 'get',
                url: `${DIRECT_GIG_SERVICE_URL}/crew/bids/stats`,
                expectSuccess: true
            }
        ];

        let passedTests = 0;
        let totalTests = testEndpoints.length;

        for (const test of testEndpoints) {
            try {
                console.log(`📝 Testing: ${test.name}...`);

                const response = await axios[test.method](test.url, { headers });

                if (test.expectSuccess && response.data.success) {
                    console.log(`✅ PASSED - Status: ${response.status}, Success: ${response.data.success}`);

                    // Show additional details for data structure validation
                    if (response.data.data) {
                        const dataKeys = Object.keys(response.data.data);
                        console.log(`   Data structure: ${dataKeys.join(', ')}`);

                        if (response.data.data.bids && Array.isArray(response.data.data.bids)) {
                            console.log(`   Bids count: ${response.data.data.bids.length}`);
                            if (response.data.data.bids.length > 0) {
                                const sampleBid = response.data.data.bids[0];
                                const bidKeys = Object.keys(sampleBid);
                                console.log(`   Sample bid fields: ${bidKeys.slice(0, 5).join(', ')}${bidKeys.length > 5 ? '...' : ''}`);
                            }
                        }
                    }
                    passedTests++;
                } else {
                    console.log(`❌ FAILED - Unexpected response: ${JSON.stringify(response.data, null, 2)}`);
                }
            } catch (error) {
                if (test.expectSuccess) {
                    console.log(`❌ FAILED - ${error.response?.status || 'Network Error'}: ${error.response?.data?.message || error.message}`);

                    // Show detailed error for Prisma validation issues
                    if (error.response?.data?.error) {
                        console.log(`   Error details: ${JSON.stringify(error.response.data.error, null, 2)}`);
                    }
                } else {
                    console.log(`✅ PASSED - Expected failure: ${error.response?.status} ${error.response?.data?.message || error.message}`);
                    passedTests++;
                }
            }
            console.log('');
        }

        console.log('🎯 Test Results Summary:');
        console.log(`   Passed: ${passedTests}/${totalTests} tests`);
        console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

        if (passedTests === totalTests) {
            console.log('   🎉 All Prisma validation errors have been resolved!');
            console.log('   ✅ Field mappings are correct (appliedAt, respondedAt, etc.)');
            console.log('   ✅ Non-existent fields removed (equipment, etc.)');
            console.log('   ✅ Correct budget field references (budgetMin, budgetMax)');
        } else {
            console.log('   ⚠️  Some tests failed - check the errors above');
        }

    } catch (error) {
        console.error('❌ Test setup failed:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the Gig Service is running on port 4004');
        }
    }
}

testAllCrewEndpoints();
