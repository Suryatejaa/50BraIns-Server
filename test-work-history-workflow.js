// Test comprehensive work history recording workflow
// Run: node test-work-history-workflow.js

const axios = require('axios');

const GIG_SERVICE_URL = process.env.GIG_SERVICE_URL || 'http://localhost:4003';
const WORK_HISTORY_SERVICE_URL = process.env.WORK_HISTORY_SERVICE_URL || 'http://localhost:4006';
const REPUTATION_SERVICE_URL = process.env.REPUTATION_SERVICE_URL || 'http://localhost:4007';

// Test user IDs
const BRAND_USER_ID = '587aee4b-8852-43f2-8c5d-13af06ea680c';
const CREATOR_USER_ID = '5dacf5a1-1867-4ccf-8714-980b7d127aa9';

async function testCompleteWorkflow() {
    console.log('🚀 Starting comprehensive work history workflow test...\n');

    try {
        // Step 1: Create a test gig
        console.log('📝 Step 1: Creating a test gig...');
        const gigResponse = await axios.post(`${GIG_SERVICE_URL}/api/gigs`, {
            title: 'Test Work History Workflow Gig',
            description: 'A test gig to verify complete work history recording',
            budgetMin: 1000,
            budgetMax: 2000,
            budgetType: 'fixed',
            roleRequired: 'Content Creator',
            experienceLevel: 'intermediate',
            skillsRequired: ['content creation', 'social media'],
            category: 'CONTENT_CREATION',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }, {
            headers: {
                'x-user-id': BRAND_USER_ID,
                'x-user-email': 'brand@test.com',
                'x-user-roles': 'USER,BRAND'
            }
        });

        const gigId = gigResponse.data.data.id;
        console.log(`✅ Created gig: ${gigId}\n`);

        // Step 2: Apply to the gig
        console.log('📋 Step 2: Applying to the gig...');
        const applicationResponse = await axios.post(`${GIG_SERVICE_URL}/api/gigs/${gigId}/apply`, {
            applicantType: 'user',
            proposal: 'I am perfect for this job and will deliver high-quality work',
            quotedPrice: 1500,
            estimatedTime: '3-5 days',
            upiId: 'creator@paytm',
            portfolio: []
        }, {
            headers: {
                'x-user-id': CREATOR_USER_ID,
                'x-user-email': 'creator@test.com',
                'x-user-roles': 'USER,INFLUENCER'
            }
        });

        const applicationId = applicationResponse.data.data.id;
        console.log(`✅ Applied to gig, application ID: ${applicationId}\n`);

        // Step 3: Accept the application (Brand approves)
        console.log('👍 Step 3: Accepting the application...');
        await axios.post(`${GIG_SERVICE_URL}/api/gigs/applications/${applicationId}/approve`, {}, {
            headers: {
                'x-user-id': BRAND_USER_ID,
                'x-user-email': 'brand@test.com',
                'x-user-roles': 'USER,BRAND'
            }
        });
        console.log(`✅ Application approved\n`);

        // Wait for events to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 4: Submit work
        console.log('📤 Step 4: Submitting work...');
        const submissionResponse = await axios.post(`${GIG_SERVICE_URL}/api/gigs/${gigId}/submit`, {
            submissionTitle: 'Completed Content Creation Work',
            submissionDescription: 'I have completed all the required content as per specifications',
            submittedFiles: [
                'https://example.com/content1.pdf',
                'https://example.com/content2.mp4'
            ],
            notes: 'All deliverables completed on time and within budget'
        }, {
            headers: {
                'x-user-id': CREATOR_USER_ID,
                'x-user-email': 'creator@test.com',
                'x-user-roles': 'USER,INFLUENCER'
            }
        });

        const submissionId = submissionResponse.data.data.id;
        console.log(`✅ Work submitted, submission ID: ${submissionId}\n`);

        // Step 5: Review and approve the submission (Brand reviews)
        console.log('⭐ Step 5: Reviewing and approving the submission...');
        await axios.post(`${GIG_SERVICE_URL}/api/submissions/${submissionId}/review`, {
            status: 'APPROVED',
            feedback: 'Excellent work! Very satisfied with the quality and delivery.',
            rating: 5
        }, {
            headers: {
                'x-user-id': BRAND_USER_ID,
                'x-user-email': 'brand@test.com',
                'x-user-roles': 'USER,BRAND'
            }
        });
        console.log(`✅ Submission approved with 5-star rating\n`);

        // Wait for all events to process
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 6: Check work history
        console.log('📊 Step 6: Checking work history...');
        try {
            const workHistoryResponse = await axios.get(`${WORK_HISTORY_SERVICE_URL}/api/summary/user/${CREATOR_USER_ID}`);
            console.log('✅ Work history retrieved:');
            console.log(JSON.stringify(workHistoryResponse.data, null, 2));
        } catch (error) {
            console.log('❌ Work history check failed:', error.response?.data || error.message);
        }

        // Step 7: Check reputation score
        console.log('\n🏆 Step 7: Checking reputation score...');
        try {
            const reputationResponse = await axios.get(`${REPUTATION_SERVICE_URL}/api/reputation/${CREATOR_USER_ID}`);
            console.log('✅ Reputation data retrieved:');
            console.log(JSON.stringify(reputationResponse.data, null, 2));
        } catch (error) {
            console.log('❌ Reputation check failed:', error.response?.data || error.message);
        }

        console.log('\n🎉 Workflow test completed successfully!');

    } catch (error) {
        console.error('❌ Workflow test failed:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Test workflow with rejection
async function testRejectionWorkflow() {
    console.log('\n🔄 Testing rejection workflow...\n');

    try {
        // Create gig
        const gigResponse = await axios.post(`${GIG_SERVICE_URL}/api/gigs`, {
            title: 'Test Rejection Workflow Gig',
            description: 'A test gig to verify rejection handling',
            budgetMin: 500,
            budgetMax: 1000,
            budgetType: 'fixed',
            roleRequired: 'Designer',
            category: 'DESIGN'
        }, {
            headers: {
                'x-user-id': BRAND_USER_ID,
                'x-user-email': 'brand@test.com',
                'x-user-roles': 'USER,BRAND'
            }
        });

        const gigId = gigResponse.data.data.id;
        console.log(`✅ Created rejection test gig: ${gigId}`);

        // Apply to gig
        const applicationResponse = await axios.post(`${GIG_SERVICE_URL}/api/gigs/${gigId}/apply`, {
            applicantType: 'user',
            proposal: 'Test application for rejection',
            quotedPrice: 750,
            estimatedTime: '2-3 days',
            upiId: 'creator@paytm'
        }, {
            headers: {
                'x-user-id': CREATOR_USER_ID,
                'x-user-email': 'creator@test.com',
                'x-user-roles': 'USER,INFLUENCER'
            }
        });

        const applicationId = applicationResponse.data.data.id;
        console.log(`✅ Applied to rejection test gig: ${applicationId}`);

        // Reject the application
        await axios.post(`${GIG_SERVICE_URL}/api/gigs/applications/${applicationId}/reject`, {
            reason: 'Not suitable for this project'
        }, {
            headers: {
                'x-user-id': BRAND_USER_ID,
                'x-user-email': 'brand@test.com',
                'x-user-roles': 'USER,BRAND'
            }
        });

        console.log(`✅ Application rejected successfully`);

        console.log('\n✅ Rejection workflow test completed!');

    } catch (error) {
        console.error('❌ Rejection workflow test failed:', error.response?.data || error.message);
    }
}

// Run both tests
async function runAllTests() {
    await testCompleteWorkflow();
    await testRejectionWorkflow();
}

runAllTests();