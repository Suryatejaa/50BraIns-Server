const axios = require('axios');

// Configuration
const config = {
    gigService: 'http://localhost:4004',
    creditService: 'http://localhost:4005',
    workHistoryService: 'http://localhost:4006'
};

// Test data for simplified submission
const testSubmission = {
    title: "Social Media Campaign Delivered",
    description: "Created 5 Instagram posts with captions and hashtags for brand launch",
    deliverables: [
        {
            type: "social_post",
            platform: "instagram",
            content: "Exciting new product launch! 🚀 Check out our latest innovation that's changing the game. #NewProduct #Innovation #BrandLaunch",
            url: "https://instagram.com/p/example1",
            description: "Instagram post with product launch announcement"
        },
        {
            type: "social_post",
            platform: "tiktok",
            content: "Behind the scenes of our product development journey. From idea to reality! 💡 #BehindTheScenes #ProductDevelopment",
            url: "https://tiktok.com/@example/video/123",
            description: "Behind the scenes TikTok video"
        },
        {
            type: "image",
            platform: "instagram",
            file: "product_launch_banner.jpg",
            description: "Product launch banner image"
        }
    ],
    notes: "All posts follow brand guidelines and are optimized for engagement"
};

class SimplifiedSubmissionTester {
    constructor() {
        this.gigId = "test_gig_123";
        this.submissionId = null;
    }

    async testSimplifiedSubmission() {
        console.log('🧪 === TESTING SIMPLIFIED SUBMISSION ===\n');

        try {
            // Test 1: Submit work with simplified structure
            await this.testSubmitWork();

            // Test 2: Verify submission was created
            await this.testVerifySubmission();

            // Test 3: Test different deliverable types
            await this.testDeliverableTypes();

            console.log('\n✅ All simplified submission tests PASSED!');

        } catch (error) {
            console.error('\n❌ Test failed:', error.message);
            throw error;
        }
    }

    async testSubmitWork() {
        console.log('📤 Test 1: Submitting work with simplified structure...');

        try {
            const response = await axios.post(
                `${config.gigService}/gigs/${this.gigId}/submit`,
                testSubmission,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': 'test_worker_123'
                    }
                }
            );

            if (response.data.success) {
                this.submissionId = response.data.data.id;
                console.log(`✅ Work submitted successfully! Submission ID: ${this.submissionId}`);
                console.log(`   Title: ${response.data.data.title}`);
                console.log(`   Deliverables: ${response.data.data.deliverables.length} items`);
            } else {
                throw new Error('Submission failed: ' + response.data.error);
            }

        } catch (error) {
            throw new Error(`Failed to submit work: ${error.response?.data?.error || error.message}`);
        }
    }

    async testVerifySubmission() {
        console.log('\n🔍 Test 2: Verifying submission structure...');

        try {
            const response = await axios.get(
                `${config.gigService}/gigs/${this.gigId}/submissions`,
                {
                    headers: {
                        'x-user-id': 'test_brand_456'
                    }
                }
            );

            if (response.data.success) {
                const submission = response.data.data.find(s => s.id === this.submissionId);
                if (submission) {
                    console.log('✅ Submission verified successfully!');
                    console.log(`   Title: ${submission.title}`);
                    console.log(`   Description: ${submission.description}`);
                    console.log(`   Deliverables: ${submission.deliverables.length} items`);

                    // Verify deliverable structure
                    submission.deliverables.forEach((deliverableString, index) => {
                        try {
                            const deliverable = JSON.parse(deliverableString);
                            console.log(`   Deliverable ${index + 1}:`);
                            console.log(`     Type: ${deliverable.type}`);
                            console.log(`     Platform: ${deliverable.platform ? '✓' : '✗'}`);
                            console.log(`     Content: ${deliverable.content ? '✓' : '✗'}`);
                            console.log(`     URL: ${deliverable.url ? '✓' : '✗'}`);
                            console.log(`     File: ${deliverable.file ? '✓' : '✗'}`);
                            console.log(`     Description: ${deliverable.description ? '✓' : '✗'}`);
                        } catch (error) {
                            console.log(`   Deliverable ${index + 1}: Failed to parse JSON`);
                        }
                    });
                } else {
                    throw new Error('Submission not found in list');
                }
            } else {
                throw new Error('Failed to fetch submissions');
            }

        } catch (error) {
            throw new Error(`Failed to verify submission: ${error.response?.data?.error || error.message}`);
        }
    }

    async testDeliverableTypes() {
        console.log('\n📦 Test 3: Testing different deliverable types...');

        const testDeliverables = [
            {
                type: "social_post",
                platform: "instagram",
                content: "Test social media content",
                url: "https://instagram.com/p/test1",
                description: "Instagram social media post"
            },
            {
                type: "image",
                platform: "pinterest",
                file: "test_image.jpg",
                description: "Pinterest image file"
            },
            {
                type: "video",
                platform: "youtube",
                content: "Test video content description",
                url: "https://youtube.com/watch?v=test",
                description: "YouTube video"
            },
            {
                type: "content",
                platform: "linkedin",
                content: "This is a test content piece with some text content that should be captured properly.",
                description: "LinkedIn article"
            }
        ];

        const testSubmissionData = {
            title: "Test Different Deliverable Types",
            description: "Testing various deliverable formats",
            deliverables: testDeliverables,
            notes: "Test submission for deliverable type validation"
        };

        try {
            const response = await axios.post(
                `${config.gigService}/gigs/${this.gigId}/submit`,
                testSubmissionData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': 'test_worker_123'
                    }
                }
            );

            if (response.data.success) {
                console.log('✅ Different deliverable types tested successfully!');
                console.log(`   New submission ID: ${response.data.data.id}`);
                console.log(`   Deliverables processed: ${response.data.data.deliverables.length}`);
            } else {
                throw new Error('Deliverable type test failed: ' + response.data.error);
            }

        } catch (error) {
            throw new Error(`Failed to test deliverable types: ${error.response?.data?.error || error.message}`);
        }
    }

    async testValidationErrors() {
        console.log('\n❌ Test 4: Testing validation errors...');

        const invalidSubmissions = [
            {
                title: "", // Empty title
                description: "Test description",
                deliverables: [{ type: "social_post", content: "Test content" }]
            },
            {
                title: "Test Title",
                description: "", // Empty description
                deliverables: [{ type: "social_post", content: "Test content" }]
            },
            {
                title: "Test Title",
                description: "Test description",
                deliverables: [] // Empty deliverables
            },
            {
                title: "Test Title",
                description: "Test description",
                deliverables: [{ type: "social_post" }] // Missing content, url, and file
            }
        ];

        for (let i = 0; i < invalidSubmissions.length; i++) {
            try {
                await axios.post(
                    `${config.gigService}/gigs/${this.gigId}/submit`,
                    invalidSubmissions[i],
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'x-user-id': 'test_worker_123'
                        }
                    }
                );
                console.log(`❌ Test ${i + 1} should have failed but didn't`);
            } catch (error) {
                if (error.response?.status === 400) {
                    console.log(`✅ Test ${i + 1} correctly rejected: ${error.response.data.error}`);
                } else {
                    console.log(`⚠️ Test ${i + 1} failed with unexpected error: ${error.message}`);
                }
            }
        }
    }
}

// Run the test
async function main() {
    const tester = new SimplifiedSubmissionTester();

    try {
        await tester.testSimplifiedSubmission();
        console.log('\n🎯 Simplified submission API is working correctly!');
    } catch (error) {
        console.error('\n💥 Test execution failed:', error.message);
        process.exit(1);
    }
}

// Export for use in other test files
module.exports = SimplifiedSubmissionTester;

// Run if this file is executed directly
if (require.main === module) {
    main();
}
