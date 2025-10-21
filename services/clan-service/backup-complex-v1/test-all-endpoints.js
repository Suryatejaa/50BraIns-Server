#!/usr/bin/env node

/**
 * Comprehensive Test Script for Clan Service
 * Tests all endpoints and functionality
 */

const axios = require('axios');

// Handle both chalk v4 and v5
let chalk;
try {
    chalk = require('chalk');
    if (typeof chalk.red !== 'function') {
        // Chalk v5 ESM format, fallback to basic console colors
        chalk = {
            red: (text) => `\x1b[31m${text}\x1b[0m`,
            green: (text) => `\x1b[32m${text}\x1b[0m`,
            yellow: (text) => `\x1b[33m${text}\x1b[0m`,
            blue: (text) => `\x1b[34m${text}\x1b[0m`,
            cyan: (text) => `\x1b[36m${text}\x1b[0m`,
            white: (text) => `\x1b[37m${text}\x1b[0m`
        };
    }
} catch (error) {
    // Fallback if chalk is not available
    chalk = {
        red: (text) => text,
        green: (text) => text,
        yellow: (text) => text,
        blue: (text) => text,
        cyan: (text) => text,
        white: (text) => text
    };
}

const BASE_URL = 'http://localhost:4003';
let TEST_RESULTS = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
};

// Test data
const TEST_USER = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'CONTENT_CREATOR'
};

const TEST_ADMIN = {
    id: 'admin-user-123',
    email: 'admin@example.com',
    role: 'ADMIN'
};

let CREATED_CLAN_ID = null;

// Helper function to simulate API Gateway headers
function getUserHeaders(user = TEST_USER) {
    return {
        'x-user-id': user.id,
        'x-user-email': user.email,
        'x-user-role': user.role,
        'Content-Type': 'application/json'
    };
}

async function runTest(testName, testFunction) {
    TEST_RESULTS.total++;
    console.log(chalk.blue(`\n🧪 Testing: ${testName}`));

    try {
        await testFunction();
        TEST_RESULTS.passed++;
        console.log(chalk.green(`✅ PASSED: ${testName}`));
    } catch (error) {
        TEST_RESULTS.failed++;
        TEST_RESULTS.errors.push({ test: testName, error: error.message });
        console.log(chalk.red(`❌ FAILED: ${testName}`));
        console.log(chalk.red(`   Error: ${error.message}`));
    }
}

// Test Functions
async function testHealthEndpoints() {
    // Basic health check
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    if (healthResponse.status !== 200) throw new Error('Health check failed');

    // Detailed health check
    const detailedResponse = await axios.get(`${BASE_URL}/health/detailed`);
    if (detailedResponse.status !== 200) throw new Error('Detailed health check failed');

    console.log(chalk.cyan(`   Health Status: ${detailedResponse.data.status}`));
}

async function testPublicEndpoints() {
    // Get featured clans
    const featuredResponse = await axios.get(`${BASE_URL}/public/featured`);
    if (featuredResponse.status !== 200) throw new Error('Featured clans endpoint failed');

    // Search clans
    const searchResponse = await axios.get(`${BASE_URL}/public/search?q=test&limit=10`);
    if (searchResponse.status !== 200) throw new Error('Search clans endpoint failed');

    console.log(chalk.cyan(`   Featured clans: ${featuredResponse.data.data.length}`));
}

async function testCreateClan() {
    const clanData = {
        name: 'Test Clan',
        description: 'A test clan for automation testing',
        specialties: ['CONTENT_CREATION', 'MARKETING'],
        maxMembers: 10,
        isPrivate: false
    };

    const response = await axios.post(`${BASE_URL}/clans`, clanData, {
        headers: getUserHeaders()
    });

    if (response.status !== 201) throw new Error('Create clan failed');

    CREATED_CLAN_ID = response.data.data.id;
    console.log(chalk.cyan(`   Created clan ID: ${CREATED_CLAN_ID}`));
}

async function testGetClans() {
    const response = await axios.get(`${BASE_URL}/clans`, {
        headers: getUserHeaders()
    });

    if (response.status !== 200) throw new Error('Get clans failed');
    console.log(chalk.cyan(`   Total clans: ${response.data.data.length}`));
}

async function testGetClanById() {
    if (!CREATED_CLAN_ID) throw new Error('No clan ID available for testing');

    const response = await axios.get(`${BASE_URL}/clans/${CREATED_CLAN_ID}`, {
        headers: getUserHeaders()
    });

    if (response.status !== 200) throw new Error('Get clan by ID failed');
    console.log(chalk.cyan(`   Clan name: ${response.data.data.name}`));
}

async function testUpdateClan() {
    if (!CREATED_CLAN_ID) throw new Error('No clan ID available for testing');

    const updateData = {
        description: 'Updated test clan description'
    };

    const response = await axios.put(`${BASE_URL}/clans/${CREATED_CLAN_ID}`, updateData, {
        headers: getUserHeaders()
    });

    if (response.status !== 200) throw new Error('Update clan failed');
    console.log(chalk.cyan(`   Updated description`));
}

async function testClanMembers() {
    if (!CREATED_CLAN_ID) throw new Error('No clan ID available for testing');

    // Get clan members
    const membersResponse = await axios.get(`${BASE_URL}/members/clan/${CREATED_CLAN_ID}`, {
        headers: getUserHeaders()
    });

    if (membersResponse.status !== 200) throw new Error('Get clan members failed');
    console.log(chalk.cyan(`   Clan members: ${membersResponse.data.data.length}`));
}

async function testInviteClanMember() {
    if (!CREATED_CLAN_ID) throw new Error('No clan ID available for testing');

    const inviteData = {
        email: 'invited@example.com',
        role: 'MEMBER',
        message: 'Join our test clan!'
    };

    const response = await axios.post(`${BASE_URL}/members/invite`, inviteData, {
        headers: getUserHeaders(),
        params: { clanId: CREATED_CLAN_ID }
    });

    if (response.status !== 201) throw new Error('Invite clan member failed');
    console.log(chalk.cyan(`   Invitation sent`));
}

async function testAnalyticsEndpoints() {
    if (!CREATED_CLAN_ID) throw new Error('No clan ID available for testing');

    // Get clan analytics
    const analyticsResponse = await axios.get(`${BASE_URL}/analytics/clan/${CREATED_CLAN_ID}`, {
        headers: getUserHeaders()
    });

    if (analyticsResponse.status !== 200) throw new Error('Get clan analytics failed');
    console.log(chalk.cyan(`   Analytics retrieved`));
}

async function testAdminEndpoints() {
    // Get all clans (admin)
    const response = await axios.get(`${BASE_URL}/admin/clans`, {
        headers: getUserHeaders(TEST_ADMIN)
    });

    if (response.status !== 200) throw new Error('Admin get all clans failed');
    console.log(chalk.cyan(`   Admin view - Total clans: ${response.data.data.length}`));
}

async function testErrorHandling() {
    try {
        // Test with invalid clan ID
        await axios.get(`${BASE_URL}/clans/invalid-id`, {
            headers: getUserHeaders()
        });
        throw new Error('Should have thrown error for invalid clan ID');
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log(chalk.cyan(`   Error handling works correctly`));
        } else {
            throw error;
        }
    }
}

async function testUnauthorizedAccess() {
    try {
        // Test without headers
        await axios.get(`${BASE_URL}/clans`);
        throw new Error('Should have thrown error for unauthorized access');
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log(chalk.cyan(`   Authorization works correctly`));
        } else {
            throw error;
        }
    }
}

async function testDeleteClan() {
    if (!CREATED_CLAN_ID) throw new Error('No clan ID available for testing');

    const response = await axios.delete(`${BASE_URL}/clans/${CREATED_CLAN_ID}`, {
        headers: getUserHeaders()
    });

    if (response.status !== 200) throw new Error('Delete clan failed');
    console.log(chalk.cyan(`   Clan deleted successfully`));
}

// Main test runner
async function runAllTests() {
    console.log(chalk.yellow('🚀 Starting Clan Service Comprehensive Tests\n'));
    console.log(chalk.yellow(`📍 Testing against: ${BASE_URL}\n`));

    // Wait for service to be ready
    console.log(chalk.blue('⏳ Waiting for service to be ready...'));
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Run tests in order
    await runTest('Health Endpoints', testHealthEndpoints);
    await runTest('Public Endpoints', testPublicEndpoints);
    await runTest('Create Clan', testCreateClan);
    await runTest('Get Clans', testGetClans);
    await runTest('Get Clan by ID', testGetClanById);
    await runTest('Update Clan', testUpdateClan);
    await runTest('Clan Members', testClanMembers);
    await runTest('Invite Clan Member', testInviteClanMember);
    await runTest('Analytics Endpoints', testAnalyticsEndpoints);
    await runTest('Admin Endpoints', testAdminEndpoints);
    await runTest('Error Handling', testErrorHandling);
    await runTest('Unauthorized Access', testUnauthorizedAccess);
    await runTest('Delete Clan', testDeleteClan);

    // Print results
    console.log(chalk.yellow('\n📊 TEST RESULTS:'));
    console.log(chalk.white(`Total Tests: ${TEST_RESULTS.total}`));
    console.log(chalk.green(`Passed: ${TEST_RESULTS.passed}`));
    console.log(chalk.red(`Failed: ${TEST_RESULTS.failed}`));

    if (TEST_RESULTS.failed > 0) {
        console.log(chalk.red('\n❌ FAILED TESTS:'));
        TEST_RESULTS.errors.forEach(({ test, error }) => {
            console.log(chalk.red(`  • ${test}: ${error}`));
        });
    }

    const successRate = ((TEST_RESULTS.passed / TEST_RESULTS.total) * 100).toFixed(1);
    console.log(chalk.yellow(`\n🎯 Success Rate: ${successRate}%`));

    if (TEST_RESULTS.failed === 0) {
        console.log(chalk.green('\n🎉 ALL TESTS PASSED! Clan Service is working perfectly!\n'));
    } else {
        console.log(chalk.red('\n⚠️  Some tests failed. Please check the errors above.\n'));
    }
}

// Run tests if called directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error(chalk.red('💥 Test runner failed:'), error.message);
        process.exit(1);
    });
}

module.exports = { runAllTests };
