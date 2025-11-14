// Test script for payment release flow
const axios = require('axios');

// Test environment URLs
const GIG_SERVICE_URL = process.env.GIG_SERVICE_URL || 'http://localhost:4003';

// Test user IDs
const BRAND_USER_ID = 'brand-test-user-123';
const CREATOR_USER_ID = 'creator-test-user-456';

async function testPaymentReleaseFlow() {
    try {
        console.log('🧪 Testing Payment Release Flow\n');

        // Step 1: Create a test gig
        console.log('📝 Step 1: Creating test gig...');
        const gigResponse = await axios.post(`${GIG_SERVICE_URL}/api/gigs`, {
            title: 'Test Payment Release Gig',
            description: 'A test gig to verify payment release functionality',
            budgetMin: 1000,
            budgetMax: 1500,
            budgetType: 'fixed',
            roleRequired: 'content-creator',
            category: 'content-creation',
            skillsRequired: ['video-editing', 'content-writing'],
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            agreedToTerms: true
        }, {
            headers: {
                'x-user-id': BRAND_USER_ID,
                'x-user-email': 'brand@test.com',
                'x-user-roles': 'USER,BRAND'
            }
        });

        const gigId = gigResponse.data.data.id;
        console.log(`✅ Test gig created: ${gigId}\n`);

        // Step 2: Apply to the gig
        console.log('🎯 Step 2: Applying to gig...');
        const applicationResponse = await axios.post(`${GIG_SERVICE_URL}/api/gigs/${gigId}/apply`, {
            quotedPrice: 1200,
            proposal: 'I can deliver high-quality content for your requirements',
            applicantType: 'user',
            upiId: 'creator@paytm', // This UPI ID will be used for payout
            agreedToTerms: true
        }, {
            headers: {
                'x-user-id': CREATOR_USER_ID,
                'x-user-email': 'creator@test.com',
                'x-user-roles': 'USER,INFLUENCER'
            }
        });

        const applicationId = applicationResponse.data.data.id;
        console.log(`✅ Application created: ${applicationId}`);
        console.log(`💰 Amount details:`, JSON.stringify(applicationResponse.data.data.amountDetails, null, 2));

        // Step 3: Brand approves application
        console.log('✅ Step 3: Brand approving application...');
        await axios.post(`${GIG_SERVICE_URL}/api/applications/${applicationId}/approve`, {}, {
            headers: {
                'x-user-id': BRAND_USER_ID,
                'x-user-email': 'brand@test.com',
                'x-user-roles': 'USER,BRAND'
            }
        });
        console.log('✅ Application approved\n');

        // Step 4: Create escrow payment
        console.log('💳 Step 4: Creating escrow payment...');
        const paymentResponse = await axios.post(`${GIG_SERVICE_URL}/api/applications/${applicationId}/payment/create`, {}, {
            headers: {
                'x-user-id': BRAND_USER_ID,
                'x-user-email': 'brand@test.com',
                'x-user-roles': 'USER,BRAND'
            }
        });

        const paymentData = paymentResponse.data.data;
        console.log('✅ Escrow payment created:');
        console.log(`   Payment ID: ${paymentData.paymentId}`);
        console.log(`   Order ID: ${paymentData.orderId}`);
        console.log(`   Creator will receive: ₹${paymentData.creatorAmount}`);
        console.log(`   Brand pays: ₹${paymentData.totalAmount}\n`);

        // Step 5: Simulate payment verification (manual)
        console.log('🔐 Step 5: Manually verifying payment...');
        await axios.post(`${GIG_SERVICE_URL}/api/applications/${applicationId}/payment/verify-manual`, {
            forceVerify: true
        }, {
            headers: {
                'x-user-id': BRAND_USER_ID,
                'x-user-email': 'brand@test.com',
                'x-user-roles': 'USER,BRAND'
            }
        });
        console.log('✅ Payment manually verified and held in escrow\n');

        // Step 6: Creator submits work
        console.log('📤 Step 6: Creator submitting work...');
        const submissionResponse = await axios.post(`${GIG_SERVICE_URL}/api/gigs/${gigId}/submit`, {
            title: 'Test Content Submission',
            description: 'High-quality content as per requirements',
            deliverables: [
                {
                    type: 'content',
                    content: 'Test content for the payment release flow',
                    description: 'Main deliverable content'
                }
            ]
        }, {
            headers: {
                'x-user-id': CREATOR_USER_ID,
                'x-user-email': 'creator@test.com',
                'x-user-roles': 'USER,INFLUENCER'
            }
        });

        const submissionId = submissionResponse.data.data.id;
        console.log(`✅ Work submitted: ${submissionId}\n`);

        // Step 7: Brand reviews and approves submission (This should trigger payment release)
        console.log('⭐ Step 7: Brand reviewing and approving submission...');
        const reviewResponse = await axios.post(`${GIG_SERVICE_URL}/api/submissions/${submissionId}/review`, {
            status: 'APPROVED',
            feedback: 'Excellent work! Payment should be released now.',
            rating: 5
        }, {
            headers: {
                'x-user-id': BRAND_USER_ID,
                'x-user-email': 'brand@test.com',
                'x-user-roles': 'USER,BRAND'
            }
        });

        console.log('🎉 Submission approved! Payment release details:');
        console.log(JSON.stringify(reviewResponse.data, null, 2));

        // Step 8: Check final payment status
        console.log('\n💰 Step 8: Checking final payment status...');
        const finalPaymentStatus = await axios.get(`${GIG_SERVICE_URL}/api/applications/${applicationId}/payment`, {
            headers: {
                'x-user-id': CREATOR_USER_ID,
                'x-user-email': 'creator@test.com',
                'x-user-roles': 'USER,INFLUENCER'
            }
        });

        console.log('📊 Final Payment Status:');
        console.log(JSON.stringify(finalPaymentStatus.data, null, 2));

        console.log('\n✅ Payment release flow test completed successfully!');

    } catch (error) {
        console.error('❌ Error in payment release flow test:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url
        });
    }
}

// Run the test
if (require.main === module) {
    testPaymentReleaseFlow();
}

module.exports = { testPaymentReleaseFlow };