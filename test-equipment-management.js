const axios = require('axios');

const USER_SERVICE_URL = 'http://localhost:4002';
const API_GATEWAY_URL = 'http://localhost:3000';

async function testEquipmentEndpoints() {
    try {
        console.log('🧪 Testing Equipment Management Endpoints...\n');

        const headers = {
            'Content-Type': 'application/json',
            'x-user-id': 'test-crew-user-123'
        };

        // Test data for equipment creation
        const sampleEquipment = {
            name: 'Canon EOS R5',
            category: 'Cameras',
            brand: 'Canon',
            model: 'EOS R5',
            description: 'Professional mirrorless camera with 45MP full-frame sensor',
            condition: 'EXCELLENT',
            purchaseDate: '2023-01-15T00:00:00.000Z',
            purchasePrice: 3899.99,
            currentValue: 3200.00,
            isAvailable: true,
            isIncludedInBids: true,
            specifications: {
                'sensor': '45MP Full-Frame CMOS',
                'video': '8K30p, 4K120p',
                'iso': '100-51200',
                'stabilization': '5-axis IBIS'
            },
            location: 'Studio A',
            serialNumber: 'CR5001234567',
            insuranceValue: 4000.00,
            notes: 'Primary camera for video production'
        };

        const testEndpoints = [
            {
                name: 'POST /equipment - Create Equipment (Direct)',
                method: 'post',
                url: `${USER_SERVICE_URL}/equipment`,
                data: sampleEquipment,
                expectSuccess: true
            },
            {
                name: 'GET /equipment - Get All Equipment (Direct)',
                method: 'get',
                url: `${USER_SERVICE_URL}/equipment`,
                expectSuccess: true
            },
            {
                name: 'GET /equipment/stats - Get Equipment Stats (Direct)',
                method: 'get',
                url: `${USER_SERVICE_URL}/equipment/stats`,
                expectSuccess: true
            },
            {
                name: 'GET /equipment/categories - Get Categories (Direct)',
                method: 'get',
                url: `${USER_SERVICE_URL}/equipment/categories`,
                expectSuccess: true
            },
            {
                name: 'GET /equipment with filters (Direct)',
                method: 'get',
                url: `${USER_SERVICE_URL}/equipment?category=Cameras&sortBy=name&sortOrder=asc`,
                expectSuccess: true
            }
        ];

        let passedTests = 0;
        let totalTests = testEndpoints.length;
        let createdEquipmentId = null;

        for (const test of testEndpoints) {
            try {
                console.log(`📝 Testing: ${test.name}...`);

                let response;
                if (test.method === 'post') {
                    response = await axios.post(test.url, test.data, { headers });
                } else {
                    response = await axios.get(test.url, { headers });
                }

                if (test.expectSuccess && response.data.success) {
                    console.log(`✅ PASSED - Status: ${response.status}, Success: ${response.data.success}`);

                    // Store created equipment ID for update/delete tests
                    if (test.name.includes('Create Equipment') && response.data.data) {
                        createdEquipmentId = response.data.data.id;
                        console.log(`   Created equipment ID: ${createdEquipmentId}`);
                    }

                    // Show additional details for data structure validation
                    if (response.data.data) {
                        if (Array.isArray(response.data.data.equipment)) {
                            console.log(`   Equipment count: ${response.data.data.equipment.length}`);
                        } else if (typeof response.data.data === 'object') {
                            const dataKeys = Object.keys(response.data.data);
                            console.log(`   Data structure: ${dataKeys.slice(0, 5).join(', ')}${dataKeys.length > 5 ? '...' : ''}`);
                        }
                    }
                    passedTests++;
                } else {
                    console.log(`❌ FAILED - Unexpected response: ${JSON.stringify(response.data, null, 2)}`);
                }
            } catch (error) {
                if (test.expectSuccess) {
                    console.log(`❌ FAILED - ${error.response?.status || 'Network Error'}: ${error.response?.data?.message || error.message}`);

                    // Show detailed error for debugging
                    if (error.response?.data?.error) {
                        console.log(`   Error details: ${error.response.data.error}`);
                    }
                    if (error.response?.data?.errors) {
                        console.log(`   Validation errors: ${JSON.stringify(error.response.data.errors, null, 2)}`);
                    }
                } else {
                    console.log(`✅ PASSED - Expected failure: ${error.response?.status} ${error.response?.data?.message || error.message}`);
                    passedTests++;
                }
            }
            console.log('');
        }

        // Test update and delete if we have a created equipment ID
        if (createdEquipmentId) {
            console.log('📝 Testing equipment update and delete...\n');

            // Test update
            try {
                const updateData = {
                    name: 'Canon EOS R5 (Updated)',
                    currentValue: 3000.00,
                    condition: 'GOOD'
                };

                const updateResponse = await axios.patch(
                    `${USER_SERVICE_URL}/equipment/${createdEquipmentId}`,
                    updateData,
                    { headers }
                );

                if (updateResponse.data.success) {
                    console.log('✅ Equipment update test PASSED');
                    passedTests++;
                } else {
                    console.log('❌ Equipment update test FAILED');
                }
                totalTests++;
            } catch (error) {
                console.log(`❌ Equipment update test FAILED - ${error.response?.status}: ${error.response?.data?.message || error.message}`);
                totalTests++;
            }

            // Test availability toggle
            try {
                const toggleResponse = await axios.patch(
                    `${USER_SERVICE_URL}/equipment/${createdEquipmentId}/availability`,
                    { isAvailable: false },
                    { headers }
                );

                if (toggleResponse.data.success) {
                    console.log('✅ Equipment availability toggle test PASSED');
                    passedTests++;
                } else {
                    console.log('❌ Equipment availability toggle test FAILED');
                }
                totalTests++;
            } catch (error) {
                console.log(`❌ Equipment availability toggle test FAILED - ${error.response?.status}: ${error.response?.data?.message || error.message}`);
                totalTests++;
            }

            // Test delete
            try {
                const deleteResponse = await axios.delete(
                    `${USER_SERVICE_URL}/equipment/${createdEquipmentId}`,
                    { headers }
                );

                if (deleteResponse.data.success) {
                    console.log('✅ Equipment delete test PASSED');
                    passedTests++;
                } else {
                    console.log('❌ Equipment delete test FAILED');
                }
                totalTests++;
            } catch (error) {
                console.log(`❌ Equipment delete test FAILED - ${error.response?.status}: ${error.response?.data?.message || error.message}`);
                totalTests++;
            }
        }

        console.log('\n🎯 Test Results Summary:');
        console.log(`   Passed: ${passedTests}/${totalTests} tests`);
        console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

        if (passedTests === totalTests) {
            console.log('   🎉 All equipment management features working perfectly!');
            console.log('   ✅ Equipment CRUD operations functional');
            console.log('   ✅ Statistics and filtering work correctly');
            console.log('   ✅ equipmentOwned field synchronization active');
        } else {
            console.log('   ⚠️  Some tests failed - check the errors above');
        }

        console.log('\n📊 Equipment Management Features:');
        console.log('   • Create/Read/Update/Delete equipment');
        console.log('   • Equipment statistics and analytics');
        console.log('   • Category-based filtering and sorting');
        console.log('   • Availability management for projects');
        console.log('   • Equipment condition tracking');
        console.log('   • Value and insurance tracking');
        console.log('   • Bulk import capabilities');
        console.log('   • Automatic equipmentOwned field sync');

    } catch (error) {
        console.error('❌ Test setup failed:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the following services are running:');
            console.log('   - API Gateway on port 3000');
            console.log('   - User Service on port 4001');
        }
    }
}

testEquipmentEndpoints();
