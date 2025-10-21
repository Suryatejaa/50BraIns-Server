const axios = require('axios');

// Configuration
const config = {
    gigService: 'http://localhost:4004',
    creditService: 'http://localhost:4005',
    workHistoryService: 'http://localhost:4006',
    userService: 'http://localhost:4002'
};

// Test data
const testData = {
    gig: {
        title: "Create Social Media Content for Brand Campaign",
        description: "Need engaging social media posts for our new product launch",
        category: "Content Creation",
        budgetMin: 100,
        budgetMax: 200,
        requiredSkills: ["Copywriting", "Social Media", "Graphic Design"],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    worker: {
        id: "worker_user_123",
        name: "John Content Creator",
        skills: ["Copywriting", "Social Media", "Graphic Design"]
    },
    brand: {
        id: "brand_user_456",
        name: "TechBrand Inc"
    }
};

class GigDeliveryWorkflowTester {
    constructor() {
        this.gigId = null;
        this.applicationId = null;
        this.submissionId = null;
        this.workHistoryId = null;
        this.creditTransactionId = null;
    }

    async runCompleteWorkflow() {
        console.log('🚀 Starting Complete Gig Delivery Workflow Test\n');

        try {
            // Step 1: Create a gig
            await this.createGig();

            // Step 2: Worker applies to gig
            await this.workerAppliesToGig();

            // Step 3: Brand accepts application
            await this.brandAcceptsApplication();

            // Step 4: Worker submits completed work
            await this.workerSubmitsWork();

            // Step 5: Brand reviews and approves work
            await this.brandApprovesWork();

            // Step 6: Verify credit rewards
            await this.verifyCreditRewards();

            // Step 7: Verify work history
            await this.verifyWorkHistory();

            console.log('\n✅ Complete Gig Delivery Workflow Test PASSED!');
            this.printSummary();

        } catch (error) {
            console.error('\n❌ Workflow Test FAILED:', error.message);
            this.printSummary();
            throw error;
        }
    }

    async createGig() {
        console.log('📝 Step 1: Creating Gig...');

        try {
            const response = await axios.post(`${config.gigService}/gig`, {
                ...testData.gig,
                postedById: testData.brand.id,
                status: 'OPEN'
            });

            this.gigId = response.data.data.id;
            console.log(`✅ Gig created with ID: ${this.gigId}`);

        } catch (error) {
            throw new Error(`Failed to create gig: ${error.response?.data?.error || error.message}`);
        }
    }

    async workerAppliesToGig() {
        console.log('📋 Step 2: Worker Applying to Gig...');

        try {
            const response = await axios.post(`${config.gigService}/applications`, {
                gigId: this.gigId,
                applicantId: testData.worker.id,
                applicantType: 'user',
                proposal: "I'll create engaging social media content that aligns with your brand voice",
                quotedPrice: 150,
                estimatedDelivery: "5 days"
            });

            this.applicationId = response.data.data.id;
            console.log(`✅ Application submitted with ID: ${this.applicationId}`);

        } catch (error) {
            throw new Error(`Failed to submit application: ${error.response?.data?.error || error.message}`);
        }
    }

    async brandAcceptsApplication() {
        console.log('✅ Step 3: Brand Accepting Application...');

        try {
            const response = await axios.post(`${config.gigService}/applications/${this.applicationId}/accept`, {
                message: "Great proposal! Looking forward to working with you."
            });

            console.log(`✅ Application accepted, gig assigned to worker`);

        } catch (error) {
            throw new Error(`Failed to accept application: ${error.response?.data?.error || error.message}`);
        }
    }

    async workerSubmitsWork() {
        console.log('📤 Step 4: Worker Submitting Completed Work...');

        try {
            const response = await axios.post(`${config.gigService}/gigs/${this.gigId}/submit`, {
                title: "Social Media Campaign Content Delivered",
                description: "Created 5 engaging social media posts with captions and hashtags",
                deliverables: [
                    {
                        type: "social_post",
                        platform: "Instagram",
                        content: "Exciting new product launch! 🚀",
                        url: "https://instagram.com/p/example1"
                    },
                    {
                        type: "social_post",
                        platform: "Twitter",
                        content: "Game-changing innovation coming soon! 💡",
                        url: "https://twitter.com/status/example2"
                    }
                ],
                notes: "All content follows brand guidelines and is optimized for engagement"
            });

            this.submissionId = response.data.data.id;
            console.log(`✅ Work submitted with ID: ${this.submissionId}`);

        } catch (error) {
            throw new Error(`Failed to submit work: ${error.response?.data?.error || error.message}`);
        }
    }

    async brandApprovesWork() {
        console.log('🔍 Step 5: Brand Reviewing and Approving Work...');

        try {
            const response = await axios.post(`${config.gigService}/submissions/${this.submissionId}/review`, {
                status: 'APPROVED',
                rating: 5,
                feedback: "Excellent work! The content perfectly captures our brand voice and the engagement metrics look great. Will definitely work together again!"
            });

            console.log(`✅ Work approved with 5-star rating`);

        } catch (error) {
            throw new Error(`Failed to approve work: ${error.response?.data?.error || error.message}`);
        }
    }

    async verifyCreditRewards() {
        console.log('💰 Step 6: Verifying Credit Rewards...');

        try {
            // Wait a moment for async processing
            await this.sleep(2000);

            // Check worker's wallet balance
            const walletResponse = await axios.get(`${config.creditService}/credits/wallet`, {
                headers: { 'x-user-id': testData.worker.id }
            });

            const wallet = walletResponse.data.data.wallet;
            console.log(`✅ Worker wallet balance: ${wallet.balance} credits`);

            // Check recent transactions
            const transactionsResponse = await axios.get(`${config.creditService}/credits/transactions`, {
                headers: { 'x-user-id': testData.worker.id }
            });

            const gigCompletionTransaction = transactionsResponse.data.data.transactions.find(
                tx => tx.type === 'GIG_COMPLETION' && tx.relatedId === this.gigId
            );

            if (gigCompletionTransaction) {
                this.creditTransactionId = gigCompletionTransaction.id;
                console.log(`✅ Credit reward transaction found: ${gigCompletionTransaction.amount} credits awarded`);
                console.log(`   Transaction ID: ${this.creditTransactionId}`);
            } else {
                throw new Error('Credit reward transaction not found');
            }

        } catch (error) {
            throw new Error(`Failed to verify credit rewards: ${error.response?.data?.error || error.message}`);
        }
    }

    async verifyWorkHistory() {
        console.log('📚 Step 7: Verifying Work History...');

        try {
            // Wait a moment for async processing
            await this.sleep(2000);

            // Check worker's work history
            const workHistoryResponse = await axios.get(`${config.workHistoryService}/work-history/user/${testData.worker.id}`);

            const workRecords = workHistoryResponse.data.data.workHistory;
            const completedGigRecord = workRecords.find(record => record.gigId === this.gigId);

            if (completedGigRecord) {
                this.workHistoryId = completedGigRecord.id;
                console.log(`✅ Work history record created with ID: ${this.workHistoryId}`);
                console.log(`   Title: ${completedGigRecord.title}`);
                console.log(`   Rating: ${completedGigRecord.clientRating}/5`);
                console.log(`   Category: ${completedGigRecord.category}`);
                console.log(`   Skills: ${completedGigRecord.skills.join(', ')}`);
            } else {
                throw new Error('Work history record not found');
            }

        } catch (error) {
            throw new Error(`Failed to verify work history: ${error.response?.data?.error || error.message}`);
        }
    }

    printSummary() {
        console.log('\n📊 Test Summary:');
        console.log('================');
        console.log(`Gig ID: ${this.gigId || 'N/A'}`);
        console.log(`Application ID: ${this.applicationId || 'N/A'}`);
        console.log(`Submission ID: ${this.submissionId || 'N/A'}`);
        console.log(`Work History ID: ${this.workHistoryId || 'N/A'}`);
        console.log(`Credit Transaction ID: ${this.creditTransactionId || 'N/A'}`);

        if (this.gigId && this.applicationId && this.submissionId && this.workHistoryId && this.creditTransactionId) {
            console.log('\n🎯 All workflow steps completed successfully!');
            console.log('✅ Gig created and assigned');
            console.log('✅ Work submitted and reviewed');
            console.log('✅ Credits awarded to worker');
            console.log('✅ Work history record created');
            console.log('✅ User account boosted with credits');
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the test
async function main() {
    const tester = new GigDeliveryWorkflowTester();

    try {
        await tester.runCompleteWorkflow();
    } catch (error) {
        console.error('\n💥 Test execution failed:', error.message);
        process.exit(1);
    }
}

// Export for use in other test files
module.exports = GigDeliveryWorkflowTester;

// Run if this file is executed directly
if (require.main === module) {
    main();
}
