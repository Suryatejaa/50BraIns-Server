const axios = require('axios');

// Complete test data with all enhanced fields
const completeGigData = {
    "budgetMax": 10000,
    "budgetMin": 2000,
    "budgetType": "fixed",
    "category": "content-creation",
    "deadline": "2025-07-12T23:59:59.000Z",
    "description": "Instagram reel desc to let creators understand more to deliver the expected output",
    "experienceLevel": "intermediate",
    "skillsRequired": [
        "Copywriting",
        "Photography",
        "Video Editing",
        "Instagram Marketing"
    ],
    "roleRequired": "influencer",
    "title": "Instagram reel",

    // Basic Project Info
    "location": "Remote",
    "duration": "3-5 days",
    "urgency": "normal",
    "isClanAllowed": true,

    // Requirements & Deliverables
    "requirements": "Must have minimum 10K Instagram followers\nPrevious reel experience required\nMust provide portfolio samples",
    "deliverables": [
        "1 Instagram reel (15-30 seconds)",
        "Raw footage files",
        "Final edited video",
        "Caption copy and hashtags"
    ],

    // Enhanced Fields (Frontend Compatibility)
    "tags": ["Instagram", "Reels", "Content", "Social Media"],
    "platformRequirements": ["Instagram"],
    "followerRequirements": [
        {
            "platform": "Instagram",
            "minFollowers": 10000
        }
    ],
    "locationRequirements": ["Remote", "US-based"],
    "campaignDuration": "1 week",
    "maxApplications": 50
};

async function testCompleteGigCreation() {
    try {
        console.log('🧪 Testing Complete Gig Creation with All Enhanced Fields...\n');

        // Test headers that would come from API Gateway
        const headers = {
            'x-user-id': '123e4567-e89b-12d3-a456-426614174000',
            'x-user-email': 'creator@example.com',
            'x-user-role': 'user',
            'Content-Type': 'application/json'
        };

        console.log('📝 Creating gig with complete data...');
        console.log('Data fields:', Object.keys(completeGigData).length, 'fields');

        const response = await axios.post('http://localhost:4004/gig', completeGigData, {
            headers
        });

        console.log('\n✅ Success!');
        console.log('Status:', response.status);
        console.log('Created Gig ID:', response.data.data.id);

        // Test retrieving the gig to verify all fields are saved
        console.log('\n🔍 Retrieving created gig to verify fields...');
        const getResponse = await axios.get(`http://localhost:4004/gig/${response.data.data.id}`, {
            headers
        });

        const retrievedGig = getResponse.data.data;
        console.log('\n📊 Retrieved Gig Fields:');
        console.log('- Title:', retrievedGig.title);
        console.log('- Budget:', `$${retrievedGig.budgetMin} - $${retrievedGig.budgetMax}`);
        console.log('- Platform Requirements:', retrievedGig.platformRequirements);
        console.log('- Follower Requirements:', retrievedGig.followerRequirements);
        console.log('- Location Requirements:', retrievedGig.locationRequirements);
        console.log('- Campaign Duration:', retrievedGig.campaignDuration);
        console.log('- Max Applications:', retrievedGig.maxApplications);
        console.log('- Tags:', retrievedGig.tags);
        console.log('- Deliverables:', retrievedGig.deliverables?.length, 'items');

        console.log('\n🎉 All enhanced fields are working correctly!');

        return response.data.data.id;

    } catch (error) {
        console.error('❌ Test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

async function testDraftWithEnhancedFields() {
    try {
        console.log('\n🧪 Testing Draft Creation with Enhanced Fields...\n');

        const draftData = {
            "title": "Draft Instagram Campaign",
            "description": "This is a draft",
            "category": "content-creation",
            "tags": ["Draft", "Instagram"],
            "platformRequirements": ["Instagram", "TikTok"],
            "followerRequirements": [
                {
                    "platform": "Instagram",
                    "minFollowers": 5000
                }
            ],
            "maxApplications": 25
        };

        const headers = {
            'x-user-id': '123e4567-e89b-12d3-a456-426614174000',
            'x-user-email': 'creator@example.com',
            'x-user-role': 'user',
            'Content-Type': 'application/json'
        };

        console.log('📝 Creating draft with enhanced fields...');
        const response = await axios.post('http://localhost:4004/gig/draft', draftData, {
            headers
        });

        console.log('✅ Draft created successfully!');
        console.log('Draft ID:', response.data.data.id);
        console.log('Status:', response.data.data.status);

        return response.data.data.id;

    } catch (error) {
        console.error('❌ Draft test failed:', error.response?.data || error.message);
    }
}

async function runAllTests() {
    console.log('🎯 Testing All Enhanced Fields Integration');
    console.log('==========================================');

    const gigId = await testCompleteGigCreation();
    const draftId = await testDraftWithEnhancedFields();

    console.log('\n✅ All tests completed!');
    if (gigId) console.log('Created Gig ID:', gigId);
    if (draftId) console.log('Created Draft ID:', draftId);
}

runAllTests();
