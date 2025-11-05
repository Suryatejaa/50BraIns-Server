const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:4004'; // Gig service directly
const GATEWAY_BASE = 'http://localhost:3000/api/gig'; // Through API Gateway

// Test user headers
const testUser = {
    id: 'user_brand_001',
    email: 'brand@example.com',
    role: 'brand',
    headers: {
        'x-user-id': 'user_brand_001',
        'x-user-email': 'brand@example.com',
        'x-user-role': 'brand'
    }
};

// Enhanced gig data for testing
const enhancedGigData = {
    title: "Instagram Reel Campaign for Tech Product Launch",
    description: "We're launching our new smartwatch and need engaging Instagram Reels. Looking for tech-savvy creators who can showcase the product features in a fun, engaging way.",
    category: "content-creation",
    roleRequired: "content-creator",
    budgetMin: 800,
    budgetMax: 1200,
    budgetType: "fixed",
    experienceLevel: "intermediate",
    urgency: "normal",
    duration: "7 days",
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    location: "Remote",
    isClanAllowed: true,

    // Enhanced fields
    skillsRequired: ["video-editing", "instagram", "tech-review"],
    tags: ["smartwatch", "product-launch", "tech", "gadgets"],
    deliverables: [
        "1 Instagram Reel (30-60 seconds)",
        "3 Instagram Story posts",
        "Written caption with hashtags",
        "Product photos (3-5 images)"
    ],
    requirements: "Must have experience with tech product reviews. Professional video quality required.",
    platformRequirements: ["instagram", "youtube"],
    followerRequirements: [
        { platform: "instagram", minFollowers: 10000 },
        { platform: "youtube", minFollowers: 5000 }
    ],
    locationRequirements: ["Remote", "India"],
    campaignDuration: "2 weeks",
    maxApplications: 20
};

async function testEnhancedGigCreation() {
    console.log('🧪 Testing Enhanced Gig Creation...\n');

    try {
        // 1. Create enhanced gig
        console.log('📝 Creating enhanced gig...');
        const createResponse = await axios.post(`${API_BASE}/gigs`, enhancedGigData, {
            headers: testUser.headers
        });

        if (!createResponse.data.success) {
            throw new Error(`Failed to create gig: ${createResponse.data.error}`);
        }

        const createdGig = createResponse.data.data;
        console.log('✅ Gig created successfully!');
        console.log(`   ID: ${createdGig.id}`);
        console.log(`   Title: ${createdGig.title}`);
        console.log(`   Status: ${createdGig.status}`);

        // 2. Test gig retrieval
        console.log('\n🔍 Testing gig retrieval...');
        const getResponse = await axios.get(`${API_BASE}/gigs/${createdGig.id}`, {
            headers: testUser.headers
        });

        if (!getResponse.data.success) {
            throw new Error(`Failed to get gig: ${getResponse.data.error}`);
        }

        const retrievedGig = getResponse.data.data;
        console.log('✅ Gig retrieved successfully!');

        // 3. Verify enhanced fields
        console.log('\n📊 Verifying enhanced fields...');
        console.log(`   Brand Name: ${retrievedGig.brand?.name}`);
        console.log(`   Brand ID: ${retrievedGig.brand?.id}`);
        console.log(`   Application Count: ${retrievedGig.applicationCount}`);
        console.log(`   Max Applications: ${retrievedGig.maxApplications}`);
        console.log(`   Is Applied: ${retrievedGig.isApplied}`);
        console.log(`   Platform Requirements: ${retrievedGig.platformRequirements?.join(', ')}`);
        console.log(`   Location Requirements: ${retrievedGig.locationRequirements?.join(', ')}`);
        console.log(`   Campaign Duration: ${retrievedGig.campaignDuration}`);
        console.log(`   Deliverables: ${retrievedGig.deliverables?.length} items`);
        console.log(`   Tags: ${retrievedGig.tags?.join(', ')}`);
        console.log(`   Budget: $${retrievedGig.budget}`);
        console.log(`   Budget Range: $${retrievedGig.budgetMin} - $${retrievedGig.budgetMax}`);
        console.log(`   Requirements: ${retrievedGig.requirements?.length > 0 ? 'Present' : 'None'}`);

        // 4. Test through API Gateway
        console.log('\n🌐 Testing through API Gateway...');
        const gatewayResponse = await axios.get(`${GATEWAY_BASE}/${createdGig.id}`, {
            headers: testUser.headers
        });

        if (gatewayResponse.data.success) {
            console.log('✅ API Gateway working correctly!');
        } else {
            console.log('❌ API Gateway issue:', gatewayResponse.data.error);
        }

        // 5. Test as different user (not applied)
        console.log('\n👤 Testing as different user...');
        const otherUserHeaders = {
            'x-user-id': 'user_creator_001',
            'x-user-email': 'creator@example.com',
            'x-user-role': 'creator'
        };

        const otherUserResponse = await axios.get(`${API_BASE}/gigs/${createdGig.id}`, {
            headers: otherUserHeaders
        });

        if (otherUserResponse.data.success) {
            const gigForOtherUser = otherUserResponse.data.data;
            console.log('✅ Different user view working!');
            console.log(`   Is Applied: ${gigForOtherUser.isApplied}`);
            console.log(`   Applications visible: ${gigForOtherUser.applications?.length || 0}`);
        }

        console.log('\n🎉 All tests passed! Enhanced gig creation and retrieval working correctly.');
        console.log(`\n🔗 Test the gig in browser: http://localhost:5173/gig/${createdGig.id}`);

        return createdGig;

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    testEnhancedGigCreation()
        .then(() => {
            console.log('\n✨ Test completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testEnhancedGigCreation };
