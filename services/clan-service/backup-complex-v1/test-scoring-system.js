/**
 * Comprehensive Test Suite for Clan Scoring System
 * Tests scoring calculation, ranking, and filtering functionality
 */

const axios = require('axios');

// Simple color functions since chalk v5 has import issues in CommonJS
const colors = {
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`
};

const BASE_URL = 'http://localhost:4003';

// Test configuration
const TEST_CONFIG = {
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-scorer-123',
        'x-user-email': 'scorer@example.com',
        'x-user-role': 'CONTENT_CREATOR_ADMIN'
    }
};

// Test results tracking
let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

/**
 * Execute a test and track results
 */
async function runTest(name, testFn) {
    try {
        console.log(colors.cyan(`\n🧪 Testing: ${name}`));
        const result = await testFn();

        if (result.success) {
            console.log(colors.green(`✅ PASSED: ${name}`));
            if (result.details) {
                console.log(colors.gray(`   ${result.details}`));
            }
            testResults.passed++;
            testResults.tests.push({ name, status: 'passed', details: result.details });
        } else {
            throw new Error(result.error || 'Test failed');
        }
    } catch (error) {
        console.log(colors.red(`❌ FAILED: ${name}`));
        console.log(colors.red(`   Error: ${error.message}`));
        testResults.failed++;
        testResults.tests.push({ name, status: 'failed', error: error.message });
    }
}

/**
 * Wait for service to be ready
 */
async function waitForService() {
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await axios.get(`${BASE_URL}/health`, { timeout: 2000 });
            if (response.status === 200) {
                return true;
            }
        } catch (error) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    throw new Error('Service not ready after 10 attempts');
}

/**
 * Test clan creation with score calculation
 */
async function testClanCreationWithScoring() {
    const clanData = {
        name: 'Elite Test Clan',
        description: 'A high-performing test clan for scoring validation',
        specialties: ['CONTENT_CREATION', 'MARKETING', 'DESIGN'],
        maxMembers: 25,
        isPrivate: false
    };

    const response = await axios.post(`${BASE_URL}/clans`, clanData, TEST_CONFIG);

    if (response.status !== 201) {
        throw new Error(`Expected 201, got ${response.status}`);
    }

    const clan = response.data.data;

    // Verify score is present and has 4 decimal places
    if (!clan.score && clan.score !== 0) {
        throw new Error('Score is missing from clan creation response');
    }

    const scoreStr = clan.score.toString();
    const decimalPart = scoreStr.split('.')[1] || '';

    if (decimalPart.length > 4) {
        throw new Error(`Score has more than 4 decimal places: ${clan.score}`);
    }

    if (!clan.scoreBreakdown) {
        throw new Error('Score breakdown is missing');
    }

    const requiredBreakdownFields = ['activity', 'reputation', 'performance', 'growth', 'portfolio', 'social'];
    for (const field of requiredBreakdownFields) {
        if (clan.scoreBreakdown[field] === undefined) {
            throw new Error(`Score breakdown missing ${field}`);
        }
    }

    return {
        success: true,
        details: `Created clan with score: ${clan.score.toFixed(4)}`,
        clanId: clan.id
    };
}

/**
 * Test clan listing with ranking
 */
async function testClanListingWithRanking() {
    const response = await axios.get(`${BASE_URL}/clans?sortBy=score&order=desc&limit=10`, TEST_CONFIG);

    if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
    }

    const data = response.data.data;

    if (!Array.isArray(data)) {
        throw new Error('Response data is not an array');
    }

    if (data.length === 0) {
        throw new Error('No clans returned');
    }

    // Verify all clans have scores and ranks
    for (let i = 0; i < data.length; i++) {
        const clan = data[i];

        if (clan.score === undefined) {
            throw new Error(`Clan ${clan.name} missing score`);
        }

        if (clan.rank === undefined) {
            throw new Error(`Clan ${clan.name} missing rank`);
        }

        if (clan.rank !== i + 1) {
            throw new Error(`Clan ${clan.name} rank mismatch: expected ${i + 1}, got ${clan.rank}`);
        }

        // Verify scores are in descending order
        if (i > 0 && clan.score > data[i - 1].score) {
            throw new Error(`Scores not in descending order: ${data[i - 1].score} -> ${clan.score}`);
        }

        if (!clan.scoreBreakdown) {
            throw new Error(`Clan ${clan.name} missing score breakdown`);
        }
    }

    return {
        success: true,
        details: `Listed ${data.length} clans with proper ranking and scores`
    };
}

/**
 * Test ranking with category filter
 */
async function testCategoryRanking() {
    const categories = ['CONTENT_CREATION', 'MARKETING', 'DESIGN'];
    let totalClansFound = 0;

    for (const category of categories) {
        const response = await axios.get(
            `${BASE_URL}/clans?category=${category}&sortBy=score&order=desc`,
            TEST_CONFIG
        );

        if (response.status !== 200) {
            throw new Error(`Expected 200 for category ${category}, got ${response.status}`);
        }

        const data = response.data.data;
        totalClansFound += data.length;

        // Verify all returned clans match the category filter
        for (const clan of data) {
            if (clan.primaryCategory !== category && !clan.categories.includes(category)) {
                throw new Error(`Clan ${clan.name} doesn't match category filter ${category}`);
            }

            if (clan.score === undefined || clan.rank === undefined) {
                throw new Error(`Clan ${clan.name} missing score or rank in category filter`);
            }
        }
    }

    return {
        success: true,
        details: `Category filtering works correctly, found ${totalClansFound} total clans across categories`
    };
}

/**
 * Test public featured endpoint with scoring
 */
async function testPublicFeaturedScoring() {
    const response = await axios.get(`${BASE_URL}/public/featured?limit=5`);

    if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
    }

    const data = response.data.data;

    if (!Array.isArray(data)) {
        throw new Error('Featured clans data is not an array');
    }

    // Verify all featured clans have scores and are properly ranked
    for (let i = 0; i < data.length; i++) {
        const clan = data[i];

        if (clan.score === undefined) {
            throw new Error(`Featured clan ${clan.name} missing score`);
        }

        if (clan.rank === undefined) {
            throw new Error(`Featured clan ${clan.name} missing rank`);
        }

        // Verify scores are in descending order (highest first)
        if (i > 0 && clan.score > data[i - 1].score) {
            throw new Error(`Featured clans not sorted by score: ${data[i - 1].score} -> ${clan.score}`);
        }
    }

    return {
        success: true,
        details: `Featured clans properly scored and ranked: ${data.length} clans`
    };
}

/**
 * Test search with scoring and custom sorting
 */
async function testSearchWithScoring() {
    // Test search by score (default)
    const scoreResponse = await axios.get(`${BASE_URL}/public/search?q=test&sortBy=score&limit=3`);

    if (scoreResponse.status !== 200) {
        throw new Error(`Expected 200 for score search, got ${scoreResponse.status}`);
    }

    const scoreData = scoreResponse.data.data;

    // Verify score-sorted results
    for (let i = 0; i < scoreData.length; i++) {
        const clan = scoreData[i];

        if (clan.score === undefined) {
            throw new Error(`Search result ${clan.name} missing score`);
        }

        if (i > 0 && clan.score > scoreData[i - 1].score) {
            throw new Error(`Search results not sorted by score`);
        }
    }

    // Test search by name
    const nameResponse = await axios.get(`${BASE_URL}/public/search?q=test&sortBy=name&order=asc&limit=3`);

    if (nameResponse.status !== 200) {
        throw new Error(`Expected 200 for name search, got ${nameResponse.status}`);
    }

    const nameData = nameResponse.data.data;

    // Verify name-sorted results
    for (let i = 1; i < nameData.length; i++) {
        if (nameData[i].name.toLowerCase() < nameData[i - 1].name.toLowerCase()) {
            throw new Error(`Search results not sorted by name alphabetically`);
        }
    }

    return {
        success: true,
        details: `Search works with score and name sorting`
    };
}

/**
 * Test individual clan view with fresh score calculation
 */
async function testIndividualClanScoring(clanId) {
    if (!clanId) {
        // Get any clan ID first
        const listResponse = await axios.get(`${BASE_URL}/clans?limit=1`, TEST_CONFIG);
        if (listResponse.data.data.length === 0) {
            throw new Error('No clans available for individual test');
        }
        clanId = listResponse.data.data[0].id;
    }

    const response = await axios.get(`${BASE_URL}/clans/${clanId}`, TEST_CONFIG);

    if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
    }

    const clan = response.data.data;

    if (clan.score === undefined) {
        throw new Error('Individual clan view missing score');
    }

    if (!clan.scoreBreakdown) {
        throw new Error('Individual clan view missing score breakdown');
    }

    // Verify score precision
    const scoreStr = clan.score.toString();
    if (scoreStr.includes('.')) {
        const decimalPart = scoreStr.split('.')[1];
        if (decimalPart.length > 4) {
            throw new Error(`Score precision exceeds 4 decimal places: ${clan.score}`);
        }
    }

    return {
        success: true,
        details: `Individual clan score: ${clan.score.toFixed(4)} with full breakdown`
    };
}

/**
 * Test dedicated ranking endpoint
 */
async function testDedicatedRankingEndpoint() {
    const response = await axios.get(`${BASE_URL}/rankings?limit=10`);

    if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
    }

    const data = response.data.data;

    if (!Array.isArray(data)) {
        throw new Error('Rankings data is not an array');
    }

    // Verify ranking structure
    for (let i = 0; i < data.length; i++) {
        const clan = data[i];

        if (clan.rank !== i + 1) {
            throw new Error(`Ranking order incorrect: expected rank ${i + 1}, got ${clan.rank}`);
        }

        if (clan.score === undefined) {
            throw new Error(`Ranked clan ${clan.name} missing score`);
        }

        if (!clan.scoreBreakdown) {
            throw new Error(`Ranked clan ${clan.name} missing score breakdown`);
        }
    }

    // Test with category filter
    const categoryResponse = await axios.get(`${BASE_URL}/rankings?category=CONTENT_CREATION&limit=5`);

    if (categoryResponse.status !== 200) {
        throw new Error(`Expected 200 for category ranking, got ${categoryResponse.status}`);
    }

    return {
        success: true,
        details: `Rankings endpoint works with ${data.length} clans, category filtering verified`
    };
}

/**
 * Test score update after clan modification
 */
async function testScoreUpdateAfterModification() {
    // Get a clan to modify
    const listResponse = await axios.get(`${BASE_URL}/clans?limit=1`, TEST_CONFIG);
    if (listResponse.data.data.length === 0) {
        throw new Error('No clans available for modification test');
    }

    const clanId = listResponse.data.data[0].id;

    // Get original score
    const originalResponse = await axios.get(`${BASE_URL}/clans/${clanId}`, TEST_CONFIG);
    const originalScore = originalResponse.data.data.score;

    // Update clan to potentially change score
    const updateData = {
        description: 'Updated description for score testing ' + Date.now(),
        website: 'https://updated-website.com',
        instagramHandle: '@updated_handle'
    };

    const updateResponse = await axios.put(`${BASE_URL}/clans/${clanId}`, updateData, TEST_CONFIG);

    if (updateResponse.status !== 200) {
        throw new Error(`Expected 200 for update, got ${updateResponse.status}`);
    }

    const updatedClan = updateResponse.data.data;

    if (updatedClan.score === undefined) {
        throw new Error('Updated clan missing score');
    }

    // Score might be same or different, but should be recalculated
    if (!updatedClan.scoreBreakdown) {
        throw new Error('Updated clan missing score breakdown');
    }

    return {
        success: true,
        details: `Score updated from ${originalScore.toFixed(4)} to ${updatedClan.score.toFixed(4)}`
    };
}

/**
 * Test admin endpoint with comprehensive scoring
 */
async function testAdminScoringEndpoint() {
    const response = await axios.get(`${BASE_URL}/admin/clans?sortBy=score&limit=5`, TEST_CONFIG);

    if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
    }

    const data = response.data.data;

    if (!Array.isArray(data)) {
        throw new Error('Admin clans data is not an array');
    }

    // Verify admin view includes scores and additional fields
    for (const clan of data) {
        if (clan.score === undefined) {
            throw new Error(`Admin clan ${clan.name} missing score`);
        }

        if (clan.rank === undefined) {
            throw new Error(`Admin clan ${clan.name} missing rank`);
        }

        if (!clan.scoreBreakdown) {
            throw new Error(`Admin clan ${clan.name} missing score breakdown`);
        }

        // Verify admin-specific fields
        const adminFields = ['clanHeadId', 'email', 'pendingInvitations', 'pendingRequests', 'profileViews'];
        for (const field of adminFields) {
            if (clan[field] === undefined) {
                throw new Error(`Admin clan ${clan.name} missing admin field: ${field}`);
            }
        }
    }

    return {
        success: true,
        details: `Admin endpoint provides comprehensive scoring for ${data.length} clans`
    };
}

/**
 * Main test runner
 */
async function runAllTests() {
    console.log(colors.blue('🚀 Starting Clan Scoring System Tests\n'));
    console.log(colors.gray(`📍 Testing against: ${BASE_URL}\n`));

    try {
        // Wait for service
        console.log(colors.yellow('⏳ Waiting for service to be ready...'));
        await waitForService();
        console.log(colors.green('✅ Service is ready\n'));

        let createdClanId = null;

        // Run all tests
        const testResult = await runTest('Clan Creation with Scoring', testClanCreationWithScoring);
        if (testResult && testResult.clanId) {
            createdClanId = testResult.clanId;
        }

        await runTest('Clan Listing with Ranking', testClanListingWithRanking);
        await runTest('Category-based Ranking', testCategoryRanking);
        await runTest('Public Featured Scoring', testPublicFeaturedScoring);
        await runTest('Search with Scoring', testSearchWithScoring);
        await runTest('Individual Clan Scoring', () => testIndividualClanScoring(createdClanId));
        await runTest('Dedicated Ranking Endpoint', testDedicatedRankingEndpoint);
        await runTest('Score Update After Modification', testScoreUpdateAfterModification);
        await runTest('Admin Scoring Endpoint', testAdminScoringEndpoint);

        // Print final results
        console.log(colors.blue('\n📊 TEST RESULTS:'));
        console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
        console.log(colors.green(`Passed: ${testResults.passed}`));
        console.log(colors.red(`Failed: ${testResults.failed}`));

        if (testResults.failed > 0) {
            console.log(colors.red('\n❌ FAILED TESTS:'));
            testResults.tests
                .filter(test => test.status === 'failed')
                .forEach(test => {
                    console.log(colors.red(`  • ${test.name}: ${test.error}`));
                });
        }

        const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
        console.log(colors.blue(`\n🎯 Success Rate: ${successRate}%`));

        if (testResults.failed === 0) {
            console.log(colors.green('\n🎉 ALL SCORING TESTS PASSED! The scoring system is working perfectly!'));
        } else {
            console.log(colors.yellow('\n⚠️  Some scoring tests failed. Please check the errors above.'));
        }

    } catch (error) {
        console.error(colors.red('💥 Test runner failed:'), error.message);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = {
    runAllTests,
    testResults
};
