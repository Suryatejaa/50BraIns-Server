/**
 * Quick Test Script for Individual Clan Service Endpoints
 * Use this for testing specific endpoints without running the full suite
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const CLAN_SERVICE_URL = 'http://localhost:4003';

// Test credentials
const TEST_USER = {
    email: 'user1@gmail.com',
    password: 'Surya@123',
    name: 'User1'
};

let authToken = null;

// Utility functions
const log = (message, data = null) => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🔍 ${message}`);
    if (data) {
        console.log('📊 Response:', JSON.stringify(data, null, 2));
    }
    console.log(`${'='.repeat(50)}`);
};

const logError = (message, error) => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`❌ ${message}`);
    console.log('🚨 Error:', error.response?.data || error.message);
    console.log(`${'='.repeat(50)}`);
};

const logSuccess = (message) => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ ${message}`);
    console.log(`${'='.repeat(50)}`);
};

// Authentication
const authenticate = async () => {
    try {
        log(`Authenticating user: ${TEST_USER.name}`);
        
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });

        if (response.data.success) {
            const { accessToken, user } = response.data.data;
            authToken = {
                accessToken,
                userId: user.id,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'x-user-id': user.id
                }
            };
            logSuccess(`✅ ${TEST_USER.name} authenticated successfully`);
            return true;
        } else {
            logError('Authentication failed', response.data);
            return false;
        }
    } catch (error) {
        logError('Authentication error', error);
        return false;
    }
};

// Individual test functions
const testHealth = async () => {
    try {
        log('Testing Health Endpoints');
        
        // Direct clan service health
        const directHealth = await axios.get(`${CLAN_SERVICE_URL}/health`);
        log('Direct Clan Service Health:', directHealth.data);
        
        // API Gateway clan health
        const gatewayHealth = await axios.get(`${BASE_URL}/api/clans/health`);
        log('API Gateway Clan Health:', gatewayHealth.data);
        
        logSuccess('Health endpoints working');
        return true;
    } catch (error) {
        logError('Health test failed', error);
        return false;
    }
};

const testPublicEndpoints = async () => {
    try {
        log('Testing Public Endpoints');
        
        const endpoints = [
            { name: 'All Clans', url: '/api/clans' },
            { name: 'Clan Feed', url: '/api/clans/feed' },
            { name: 'Featured Clans', url: '/api/clans/featured' }
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await axios.get(`${BASE_URL}${endpoint.url}`);
                log(`${endpoint.name}:`, response.data);
            } catch (error) {
                logError(`${endpoint.name} failed`, error);
            }
        }
        
        logSuccess('Public endpoints tested');
        return true;
    } catch (error) {
        logError('Public endpoints test failed', error);
        return false;
    }
};

const testClanCreation = async () => {
    try {
        if (!authToken) {
            log('Skipping clan creation - not authenticated');
            return false;
        }
        
        log('Testing Clan Creation');
        
        const clanData = {
            name: 'Quick Test Clan',
            description: 'A clan created by quick test script',
            tagline: 'Quick Testing',
            visibility: 'PUBLIC',
            primaryCategory: 'Testing',
            categories: ['Testing', 'Development'],
            skills: ['JavaScript', 'Testing'],
            location: 'Remote',
            timezone: 'UTC',
            maxMembers: 10
        };
        
        const response = await axios.post(`${BASE_URL}/api/clans`, clanData, {
            headers: authToken.headers
        });
        
        if (response.data.success) {
            log('Clan Created:', response.data);
            logSuccess('Clan creation working');
            return response.data.clan.id;
        } else {
            logError('Clan creation failed', response.data);
            return false;
        }
    } catch (error) {
        logError('Clan creation test failed', error);
        return false;
    }
};

const testGetClan = async (clanId) => {
    try {
        if (!clanId) {
            log('Skipping get clan - no clan ID');
            return false;
        }
        
        log(`Testing Get Clan: ${clanId}`);
        
        const response = await axios.get(`${BASE_URL}/api/clans/${clanId}`);
        
        if (response.data.success) {
            log('Clan Retrieved:', response.data);
            logSuccess('Get clan working');
            return true;
        } else {
            logError('Get clan failed', response.data);
            return false;
        }
    } catch (error) {
        logError('Get clan test failed', error);
        return false;
    }
};

const testClanUpdate = async (clanId) => {
    try {
        if (!clanId || !authToken) {
            log('Skipping clan update - no clan ID or not authenticated');
            return false;
        }
        
        log(`Testing Clan Update: ${clanId}`);
        
        const updateData = {
            tagline: 'Updated by Quick Test',
            description: 'Updated description from quick test'
        };
        
        const response = await axios.put(`${BASE_URL}/api/clans/${clanId}`, updateData, {
            headers: authToken.headers
        });
        
        if (response.data.success) {
            log('Clan Updated:', response.data);
            logSuccess('Clan update working');
            return true;
        } else {
            logError('Clan update failed', response.data);
            return false;
        }
    } catch (error) {
        logError('Clan update test failed', error);
        return false;
    }
};

const testClanDeletion = async (clanId) => {
    try {
        if (!clanId || !authToken) {
            log('Skipping clan deletion - no clan ID or not authenticated');
            return false;
        }
        
        log(`Testing Clan Deletion: ${clanId}`);
        
        const response = await axios.delete(`${BASE_URL}/api/clans/${clanId}`, {
            headers: authToken.headers
        });
        
        if (response.data.success) {
            log('Clan Deleted:', response.data);
            logSuccess('Clan deletion working');
            return true;
        } else {
            logError('Clan deletion failed', response.data);
            return false;
        }
    } catch (error) {
        logError('Clan deletion test failed', error);
        return false;
    }
};

// Main quick test runner
const runQuickTest = async () => {
    console.log('\n🚀 Starting Quick Clan Service Tests');
    console.log('='.repeat(60));
    
    try {
        // Test 1: Health
        await testHealth();
        
        // Test 2: Public endpoints
        await testPublicEndpoints();
        
        // Test 3: Authentication
        const authSuccess = await authenticate();
        
        if (authSuccess) {
            // Test 4: Clan creation
            const clanId = await testClanCreation();
            
            if (clanId) {
                // Test 5: Get clan
                await testGetClan(clanId);
                
                // Test 6: Update clan
                await testClanUpdate(clanId);
                
                // Test 7: Delete clan (cleanup)
                await testClanDeletion(clanId);
            }
        }
        
        logSuccess('Quick test completed!');
        
    } catch (error) {
        console.error('❌ Quick test error:', error);
    }
};

// Export functions for individual testing
module.exports = {
    runQuickTest,
    testHealth,
    testPublicEndpoints,
    authenticate,
    testClanCreation,
    testGetClan,
    testClanUpdate,
    testClanDeletion
};

// Run if executed directly
if (require.main === module) {
    runQuickTest().catch(console.error);
}
