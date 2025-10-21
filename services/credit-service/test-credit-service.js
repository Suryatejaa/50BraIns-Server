const axios = require('axios');

const BASE_URL = 'http://localhost:4005';
const API_URL = `${BASE_URL}/api/credits`;

// Test user data (you would get this from auth service)
const testUser = {
    id: 'test-user-123',
    email: 'testuser@example.com',
    token: 'your-jwt-token-here' // Replace with actual JWT token
};

// Mock JWT token for testing (replace with real token)
const authHeaders = {
    'Authorization': `Bearer ${testUser.token}`,
    'Content-Type': 'application/json'
};

class CreditServiceTester {
    constructor() {
        this.testResults = [];
    }

    async runTest(testName, testFunction) {
        console.log(`\n🧪 Running test: ${testName}`);
        try {
            const result = await testFunction();
            console.log(`✅ ${testName}: PASSED`);
            this.testResults.push({ name: testName, status: 'PASSED', result });
            return result;
        } catch (error) {
            console.log(`❌ ${testName}: FAILED`);
            console.error('Error:', error.response?.data || error.message);
            this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
            return null;
        }
    }

    async testHealthCheck() {
        const response = await axios.get(`${BASE_URL}/health`);
        console.log('Health check response:', response.data);
        return response.data;
    }

    async testGetWallet() {
        const response = await axios.get(`${API_URL}/wallet`, { headers: authHeaders });
        console.log('Wallet data:', response.data);
        return response.data;
    }

    async testPurchaseCredits() {
        const purchaseData = {
            packageId: 'test-package-1',
            credits: 100,
            amount: 999, // ₹9.99
            paymentGateway: 'razorpay'
        };

        const response = await axios.post(`${API_URL}/purchase`, purchaseData, { headers: authHeaders });
        console.log('Purchase response:', response.data);
        return response.data;
    }

    async testBoostProfile() {
        const boostData = {
            duration: 24 // 24 hours
        };

        const response = await axios.post(`${API_URL}/boost/profile`, boostData, { headers: authHeaders });
        console.log('Profile boost response:', response.data);
        return response.data;
    }

    async testBoostGig() {
        const boostData = {
            gigId: 'test-gig-123',
            duration: 12 // 12 hours
        };

        const response = await axios.post(`${API_URL}/boost/gig`, boostData, { headers: authHeaders });
        console.log('Gig boost response:', response.data);
        return response.data;
    }

    async testBoostClan() {
        const boostData = {
            clanId: 'test-clan-123',
            duration: 48 // 48 hours
        };

        const response = await axios.post(`${API_URL}/boost/clan`, boostData, { headers: authHeaders });
        console.log('Clan boost response:', response.data);
        return response.data;
    }

    async testContributeToClan() {
        const contributionData = {
            clanId: 'test-clan-123',
            amount: 25 // 25 credits
        };

        const response = await axios.post(`${API_URL}/contribute/clan`, contributionData, { headers: authHeaders });
        console.log('Clan contribution response:', response.data);
        return response.data;
    }

    async testGetTransactions() {
        const response = await axios.get(`${API_URL}/transactions`, { headers: authHeaders });
        console.log('Transactions:', response.data);
        return response.data;
    }

    async testGetBoosts() {
        const response = await axios.get(`${API_URL}/boosts`, { headers: authHeaders });
        console.log('User boosts:', response.data);
        return response.data;
    }

    async testInvalidRequests() {
        // Test invalid boost duration
        try {
            await axios.post(`${API_URL}/boost/profile`, { duration: 0 }, { headers: authHeaders });
        } catch (error) {
            console.log('Expected validation error for invalid duration:', error.response?.status);
        }

        // Test insufficient credits (assuming user has less than 1000 credits)
        try {
            await axios.post(`${API_URL}/boost/clan`, {
                clanId: 'test-clan-123',
                duration: 168 // 1 week - very expensive
            }, { headers: authHeaders });
        } catch (error) {
            console.log('Expected insufficient credits error:', error.response?.status);
        }

        // Test invalid gig ID
        try {
            await axios.post(`${API_URL}/boost/gig`, {
                gigId: 'non-existent-gig',
                duration: 12
            }, { headers: authHeaders });
        } catch (error) {
            console.log('Expected gig not found error:', error.response?.status);
        }
    }

    async runAllTests() {
        console.log('🚀 Starting Credit Service Tests');
        console.log('======================================');

        // Basic tests
        await this.runTest('Health Check', () => this.testHealthCheck());
        await this.runTest('Get Wallet', () => this.testGetWallet());

        // Purchase tests (Note: These will create payment orders but won't complete without real payment)
        await this.runTest('Purchase Credits', () => this.testPurchaseCredits());

        // Boost tests (Note: These may fail if user has insufficient credits)
        await this.runTest('Boost Profile', () => this.testBoostProfile());
        await this.runTest('Boost Gig', () => this.testBoostGig());
        await this.runTest('Boost Clan', () => this.testBoostClan());

        // Contribution tests
        await this.runTest('Contribute to Clan', () => this.testContributeToClan());

        // Data retrieval tests
        await this.runTest('Get Transactions', () => this.testGetTransactions());
        await this.runTest('Get Boosts', () => this.testGetBoosts());

        // Error case tests
        await this.runTest('Invalid Requests', () => this.testInvalidRequests());

        // Print summary
        this.printSummary();
    }

    printSummary() {
        console.log('\n📊 TEST SUMMARY');
        console.log('================');

        const passed = this.testResults.filter(t => t.status === 'PASSED').length;
        const failed = this.testResults.filter(t => t.status === 'FAILED').length;

        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${(passed / this.testResults.length * 100).toFixed(1)}%`);

        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(t => t.status === 'FAILED')
                .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
        }

        console.log('\n💡 Notes:');
        console.log('- Purchase tests create payment orders but don\'t complete payments');
        console.log('- Boost tests may fail if user has insufficient credits');
        console.log('- Make sure to update the JWT token before running tests');
        console.log('- External service calls (User, Gig, Clan) may fail in isolation');
    }
}

// Usage instructions
if (require.main === module) {
    console.log(`
🧪 Credit Service API Tester
============================

Before running tests, make sure:
1. Credit service is running on port 4005
2. Database is connected and migrated
3. RabbitMQ is running (optional for basic tests)
4. Update the JWT token in the testUser object above

To run tests:
node test-credit-service.js

To run specific tests, modify the runAllTests() method.
    `);

    // Uncomment to run tests automatically
    // const tester = new CreditServiceTester();
    // tester.runAllTests();
}

module.exports = CreditServiceTester;
