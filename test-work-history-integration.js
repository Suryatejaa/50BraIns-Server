// Test script to verify work history integration when gig is completed
const axios = require('axios');

const GIG_SERVICE_URL = 'http://localhost:4004'; // Corrected port for gig service
const WORK_HISTORY_SERVICE_URL = 'http://localhost:4007'; // Work history service port

// Test configuration
const TEST_CONFIG = {
    BRAND_USER_ID: 'cm2qwcxpw0000v14b24t0bqge', // Replace with actual brand user ID
    CREATOR_USER_ID: 'cm2qwczwv0002v14bbc9idsjh', // Replace with actual creator user ID
    GIG_ID: '',
    APPLICATION_ID: '',
    SUBMISSION_ID: ''
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkWorkHistory(userId, step) {
    try {
        const response = await axios.get(`${WORK_HISTORY_SERVICE_URL}/work-history/${userId}`);
        console.log(`\n📊 [${step}] Work History for user ${userId}:`);

        if (response.data.success && response.data.data.workHistory.length > 0) {
            response.data.data.workHistory.slice(0, 3).forEach(work => {
                console.log(`   🎯 ${work.title} (${work.category}) - Rating: ${work.clientRating}/5`);
                console.log(`   📅 Completed: ${new Date(work.completedAt).toLocaleDateString()}`);
                console.log(`   🎨 Skills: ${work.skills.join(', ')}`);
                console.log(`   📋 Portfolio Items: ${work.portfolioItems.length}`);
            });
        } else {
            console.log(`   ❌ No work history found`);
        }
    } catch (error) {
        console.log(`   ⚠️ Could not fetch work history: ${error.message}`);
    }
}

async function checkWorkSummary(userId, step) {
    try {
        const response = await axios.get(`${WORK_HISTORY_SERVICE_URL}/work-history/${userId}/summary`);
        console.log(`\n📈 [${step}] Work Summary for user ${userId}:`);

        if (response.data.success) {
            const summary = response.data.data.summary;
            console.log(`   🎯 Total Projects: ${summary.totalProjects}`);
            console.log(`   ✅ Completed Projects: ${summary.completedProjects}`);
            console.log(`   ⭐ Average Rating: ${summary.averageRating}/5`);
            console.log(`   ⏰ On-time Delivery Rate: ${summary.onTimeDeliveryRate}%`);
            console.log(`   🏆 Top Skills: ${summary.topSkills.join(', ')}`);
        } else {
            console.log(`   ❌ No work summary found`);
        }
    } catch (error) {
        console.log(`   ⚠️ Could not fetch work summary: ${error.message}`);
    }
}

async function testGigCompletionWorkHistory() {
    console.log('🧪 Testing Gig Completion → Work History Integration...\n');

    try {
        // Step 1: Create a test gig
        console.log('📝 Step 1: Creating test gig...');
        const gigData = {
            title: 'Work History Test Gig',
            description: 'This gig tests work history integration',
            category: 'content-creation',
            roleRequired: 'content-creator',
            budgetMin: 2000,
            budgetMax: 3000,
            skillsRequired: ['writing', 'creativity', 'social-media'],
            gigType: 'REMOTE'
        };

        const createGigResponse = await axios.post(`${GIG_SERVICE_URL}/gigs`, gigData, {
            headers: { 'x-user-id': TEST_CONFIG.BRAND_USER_ID }
        });

        if (createGigResponse.data.success) {
            TEST_CONFIG.GIG_ID = createGigResponse.data.data.id;
            console.log(`✅ Gig created with ID: ${TEST_CONFIG.GIG_ID}`);
        } else {
            throw new Error('Failed to create gig');
        }

        // Step 2: Apply to the gig
        console.log('\n📋 Step 2: Applying to gig...');
        const applicationData = {
            proposal: 'I will create excellent content for this work history test',
            applicantType: 'user'
        };

        await axios.post(`${GIG_SERVICE_URL}/gigs/${TEST_CONFIG.GIG_ID}/apply`, applicationData, {
            headers: { 'x-user-id': TEST_CONFIG.CREATOR_USER_ID }
        });

        // Step 3: Accept the application
        console.log('\n🎯 Step 3: Accepting application...');
        const applicationsResponse = await axios.get(`${GIG_SERVICE_URL}/gigs/${TEST_CONFIG.GIG_ID}/applications`, {
            headers: { 'x-user-id': TEST_CONFIG.BRAND_USER_ID }
        });

        if (applicationsResponse.data.success && applicationsResponse.data.data.length > 0) {
            TEST_CONFIG.APPLICATION_ID = applicationsResponse.data.data[0].id;

            await axios.post(`${GIG_SERVICE_URL}/applications/${TEST_CONFIG.APPLICATION_ID}/accept`, {}, {
                headers: { 'x-user-id': TEST_CONFIG.BRAND_USER_ID }
            });
            console.log('✅ Application accepted successfully');
        }

        // Step 4: Submit work
        console.log('\n📤 Step 4: Submitting work...');
        const workData = {
            title: 'Work History Test Content',
            description: 'High-quality content created for work history testing',
            deliverables: [
                {
                    type: 'content',
                    description: 'Blog post about work history integration',
                    content: 'This is a comprehensive blog post about work history...'
                },
                {
                    type: 'image',
                    description: 'Infographic about the process',
                    url: 'https://example.com/infographic.png'
                }
            ]
        };

        const submitResponse = await axios.post(`${GIG_SERVICE_URL}/gigs/${TEST_CONFIG.GIG_ID}/submit`, workData, {
            headers: { 'x-user-id': TEST_CONFIG.CREATOR_USER_ID }
        });

        if (submitResponse.data.success) {
            TEST_CONFIG.SUBMISSION_ID = submitResponse.data.data.id;
            console.log(`✅ Work submitted with ID: ${TEST_CONFIG.SUBMISSION_ID}`);
        }

        // Check work history before approval (should be empty)
        await sleep(1000);
        await checkWorkHistory(TEST_CONFIG.CREATOR_USER_ID, 'Before Approval');
        await checkWorkSummary(TEST_CONFIG.CREATOR_USER_ID, 'Before Approval');

        // Step 5: Approve the submission (this should trigger work history creation)
        console.log('\n⭐ Step 5: Approving submission (completing gig)...');
        const reviewData = {
            status: 'APPROVED',
            feedback: 'Excellent work! The content exceeded expectations.',
            rating: 5
        };

        const reviewResponse = await axios.post(`${GIG_SERVICE_URL}/submissions/${TEST_CONFIG.SUBMISSION_ID}/review`, reviewData, {
            headers: { 'x-user-id': TEST_CONFIG.BRAND_USER_ID }
        });

        if (reviewResponse.data.success) {
            console.log('✅ Submission approved successfully (GIG COMPLETED!)');
        }

        // Wait for work history events to be processed
        console.log('\n⏳ Waiting for work history events to be processed...');
        await sleep(5000);

        // Check work history after completion
        await checkWorkHistory(TEST_CONFIG.CREATOR_USER_ID, 'After Gig Completion');
        await checkWorkSummary(TEST_CONFIG.CREATOR_USER_ID, 'After Gig Completion');

        console.log('\n🎉 Test completed! Check above to see if work history was created properly.');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testGigCompletionWorkHistory().catch(console.error);