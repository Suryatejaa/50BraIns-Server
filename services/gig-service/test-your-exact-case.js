const axios = require('axios');

const API_BASE_URL = 'http://localhost:4004';

// Your exact test data
const updateData = {
    "title": "sdsdsaas",
    "description": "sdsdssdsds",
    "requirements": "NA",
    "deadline": "2025-07-12T00:00:00.000Z",
    "category": "content-creation",
    "maxApplications": 50,
    "platformRequirements": [],
    "followerRequirements": [],
    "locationRequirements": [],
    "campaignDuration": "1-2 weeks",
    "deliverables": ["Raw footage"],
    "tags": [], // Empty tags - should replace existing
    "budgetMin": 1000,
    "budgetMax": 20000,
    "budgetType": "fixed",
    "urgency": "normal",
    "location": "remote",
    "experienceLevel": "intermediate",
    "roleRequired": "influencer",
    "skillsRequired": ["Video Editing"],
    "isClanAllowed": true
};

async function testYourExactCase() {
    try {
        console.log('🧪 Testing Your Exact Use Case...\n');

        // Create initial gig with some tags
        const initialData = {
            title: "Initial Gig",
            description: "Initial description",
            category: "content-creation",
            roleRequired: "influencer",
            budgetMin: 500,
            budgetMax: 1000,
            budgetType: "fixed",
            tags: ["Old Tag 1", "Old Tag 2", "Old Tag 3"], // Some existing tags
            skillsRequired: ["Old Skill 1", "Old Skill 2"]
        };

        console.log('📝 Creating initial gig with tags:', initialData.tags);

        const createResponse = await axios.post(`${API_BASE_URL}/gig`, initialData, {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'test-user-123'
            }
        });

        if (!createResponse.data.success) {
            console.error('❌ Failed to create gig:', createResponse.data);
            return;
        }

        const createdGig = createResponse.data.data;
        console.log('✅ Initial gig created!');
        console.log('   Existing tags:', createdGig.tags);
        console.log('   Existing skills:', createdGig.skillsRequired);
        console.log('');

        // Now update with your exact data (empty tags array)
        console.log('📝 Updating with your exact data (empty tags array)...');
        console.log('   Sending tags:', updateData.tags);
        console.log('   Sending skills:', updateData.skillsRequired);

        const updateResponse = await axios.put(`${API_BASE_URL}/gig/${createdGig.id}`, updateData, {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'test-user-123'
            }
        });

        if (!updateResponse.data.success) {
            console.error('❌ Update failed:', updateResponse.data);
            return;
        }

        const updatedGig = updateResponse.data.data;
        console.log('✅ Update successful!');
        console.log('   Final tags:', updatedGig.tags);
        console.log('   Final skills:', updatedGig.skillsRequired);
        console.log('');

        // Verify results
        const tagsEmpty = Array.isArray(updatedGig.tags) && updatedGig.tags.length === 0;
        const skillsCorrect = Array.isArray(updatedGig.skillsRequired) && 
                            updatedGig.skillsRequired.includes("Video Editing") &&
                            updatedGig.skillsRequired.length === 1;

        console.log('📊 Results:');
        console.log(`   Empty tags array replaced existing tags: ${tagsEmpty ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`   Skills updated correctly: ${skillsCorrect ? '✅ SUCCESS' : '❌ FAILED'}`);

        if (tagsEmpty) {
            console.log('\n🎉 Perfect! Empty tags array now properly replaces existing tags.');
            console.log('   Your issue is fixed - sending tags: [] will clear existing tags.');
        } else {
            console.log('\n❌ Issue still exists - empty tags array did not replace existing tags.');
        }

        // Cleanup
        try {
            await axios.delete(`${API_BASE_URL}/gig/${createdGig.id}`, {
                headers: { 'x-user-id': 'test-user-123' }
            });
            console.log('\n🧹 Test data cleaned up.');
        } catch (e) {
            console.log('\n⚠️ Cleanup failed, but test completed.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the gig service is running on port 4004');
        }
    }
}

testYourExactCase();
