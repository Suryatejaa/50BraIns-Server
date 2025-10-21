// Test script to verify work submission notifications are working
const axios = require('axios');

const BASE_URL = 'http://localhost:4003'; // Gig service
const NOTIFICATION_URL = 'http://localhost:4009'; // Notification service

// Test configuration
const TEST_CONFIG = {
    // Use existing user IDs - replace with actual IDs from your database
    BRAND_USER_ID: 'cm2qwcxpw0000v14b24t0bqge', // Replace with actual brand user ID
    CREATOR_USER_ID: 'cm2qwczwv0002v14bbc9idsjh', // Replace with actual creator user ID
    GIG_ID: '', // Will be filled after creating gig
    APPLICATION_ID: '', // Will be filled after applying
    SUBMISSION_ID: '' // Will be filled after submitting work
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkNotifications(userId, step) {
    try {
        const response = await axios.get(`${NOTIFICATION_URL}/notifications/${userId}`);
        console.log(`\n📨 [${step}] Notifications for user ${userId}:`);

        if (response.data.success && response.data.data.notifications.length > 0) {
            response.data.data.notifications.slice(0, 3).forEach(notification => {
                console.log(`   🔔 ${notification.title}: ${notification.message}`);
            });
        } else {
            console.log(`   ❌ No notifications found`);
        }
    } catch (error) {
        console.log(`   ⚠️ Could not fetch notifications: ${error.message}`);
    }
}

async function testWorkSubmissionFlow() {
    console.log('🧪 Testing Work Submission Notification Flow...\n');

    try {
        // Step 1: Create a test gig
        console.log('📝 Step 1: Creating test gig...');
        const gigData = {
            title: 'Test Notification Gig',
            description: 'This is a test gig to verify notifications',
            category: 'test',
            roleRequired: 'content-creator',
            budgetMin: 1000,
            budgetMax: 2000,
            gigType: 'REMOTE'
        };

        const createGigResponse = await axios.post(`${BASE_URL}/gigs`, gigData, {
            headers: { 'x-user-id': TEST_CONFIG.BRAND_USER_ID }
        });

        if (createGigResponse.data.success) {
            TEST_CONFIG.GIG_ID = createGigResponse.data.data.id;
            console.log(`✅ Gig created with ID: ${TEST_CONFIG.GIG_ID}`);
        } else {
            throw new Error('Failed to create gig');
        }

        await sleep(1000);
        await checkNotifications(TEST_CONFIG.BRAND_USER_ID, 'After Gig Creation');

        // Step 2: Apply to the gig
        console.log('\n📋 Step 2: Applying to gig...');
        const applicationData = {
            proposal: 'I would like to work on this test gig',
            applicantType: 'user'
        };

        const applyResponse = await axios.post(`${BASE_URL}/gigs/${TEST_CONFIG.GIG_ID}/apply`, applicationData, {
            headers: { 'x-user-id': TEST_CONFIG.CREATOR_USER_ID }
        });

        if (applyResponse.data.success) {
            console.log('✅ Applied to gig successfully');
        }

        await sleep(1000);
        await checkNotifications(TEST_CONFIG.BRAND_USER_ID, 'Brand - After Application');
        await checkNotifications(TEST_CONFIG.CREATOR_USER_ID, 'Creator - After Application');

        // Step 3: Accept the application
        console.log('\n🎯 Step 3: Accepting application...');

        // First get the applications
        const applicationsResponse = await axios.get(`${BASE_URL}/gigs/${TEST_CONFIG.GIG_ID}/applications`, {
            headers: { 'x-user-id': TEST_CONFIG.BRAND_USER_ID }
        });

        if (applicationsResponse.data.success && applicationsResponse.data.data.length > 0) {
            TEST_CONFIG.APPLICATION_ID = applicationsResponse.data.data[0].id;

            const acceptResponse = await axios.post(`${BASE_URL}/applications/${TEST_CONFIG.APPLICATION_ID}/accept`, {}, {
                headers: { 'x-user-id': TEST_CONFIG.BRAND_USER_ID }
            });

            if (acceptResponse.data.success) {
                console.log('✅ Application accepted successfully');
            }
        }

        await sleep(1000);
        await checkNotifications(TEST_CONFIG.CREATOR_USER_ID, 'Creator - After Acceptance');

        // Step 4: Submit work
        console.log('\n📤 Step 4: Submitting work...');
        const workData = {
            title: 'Test Work Submission',
            description: 'This is a test work submission to verify notifications',
            deliverables: [
                {
                    type: 'content',
                    description: 'Test deliverable',
                    content: 'This is test content'
                }
            ]
        };

        const submitResponse = await axios.post(`${BASE_URL}/gigs/${TEST_CONFIG.GIG_ID}/submit`, workData, {
            headers: { 'x-user-id': TEST_CONFIG.CREATOR_USER_ID }
        });

        if (submitResponse.data.success) {
            TEST_CONFIG.SUBMISSION_ID = submitResponse.data.data.id;
            console.log(`✅ Work submitted with ID: ${TEST_CONFIG.SUBMISSION_ID}`);
        }

        await sleep(2000); // Wait a bit longer for notifications to process
        await checkNotifications(TEST_CONFIG.BRAND_USER_ID, 'Brand - After Work Submission');
        await checkNotifications(TEST_CONFIG.CREATOR_USER_ID, 'Creator - After Work Submission');

        // Step 5: Review the submission
        console.log('\n⭐ Step 5: Reviewing submission...');
        const reviewData = {
            status: 'APPROVED',
            feedback: 'Great work! This looks perfect.',
            rating: 5
        };

        const reviewResponse = await axios.post(`${BASE_URL}/submissions/${TEST_CONFIG.SUBMISSION_ID}/review`, reviewData, {
            headers: { 'x-user-id': TEST_CONFIG.BRAND_USER_ID }
        });

        if (reviewResponse.data.success) {
            console.log('✅ Submission reviewed successfully');
        }

        await sleep(2000); // Wait for notifications to process
        await checkNotifications(TEST_CONFIG.CREATOR_USER_ID, 'Creator - After Review');
        await checkNotifications(TEST_CONFIG.BRAND_USER_ID, 'Brand - After Review');

        console.log('\n🎉 Test completed! Check the notifications above to verify the flow is working.');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testWorkSubmissionFlow().catch(console.error);