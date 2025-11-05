const axios = require('axios');

const API_BASE_URL = 'http://localhost:4004';

async function testEmptyArrayReplacement() {
    try {
        console.log('🧪 Testing Empty Array Replacement...\n');

        // Test data: Create gig with tags first
        const initialGigData = {
            title: "Test Gig - Empty Array Replacement",
            description: "Testing if empty arrays properly replace existing tags",
            category: "content-creation",
            roleRequired: "Content Creator",
            budgetType: "fixed",
            budgetMin: 500,
            budgetMax: 1000,
            experienceLevel: "intermediate",
            urgency: "normal",
            location: "remote",
            tags: ["Video Editing", "Photography", "Social Media"],
            skillsRequired: ["Adobe Premiere", "Photoshop"],
            deliverables: ["Final Video", "Raw Footage"]
        };

        console.log('📝 Step 1: Creating gig with initial tags...');
        console.log('Initial tags:', initialGigData.tags);
        console.log('Initial skills:', initialGigData.skillsRequired);
        console.log('Initial deliverables:', initialGigData.deliverables);

        const createResponse = await axios.post(`${API_BASE_URL}/gig`, initialGigData, {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'test-user-123'
            }
        });

        if (!createResponse.data.success) {
            console.error('❌ Failed to create initial gig:', createResponse.data);
            return;
        }

        const createdGig = createResponse.data.data;
        console.log('✅ Gig created successfully!');
        console.log('Created with tags:', createdGig.tags);
        console.log('Created with skills:', createdGig.skillsRequired);
        console.log('Created with deliverables:', createdGig.deliverables);
        console.log('');

        // Test data: Update with empty arrays
        const updateDataWithEmptyArrays = {
            title: "Updated Test Gig - Empty Arrays",
            description: "Testing if empty arrays properly replace existing tags",
            requirements: "NA",
            deadline: "2025-07-12T00:00:00.000Z",
            category: "content-creation",
            maxApplications: 50,
            platformRequirements: [],
            followerRequirements: [],
            locationRequirements: [],
            campaignDuration: "1-2 weeks",
            deliverables: ["Raw footage"], // Keep some deliverables
            tags: [], // Empty tags array
            budgetMin: 1000,
            budgetMax: 20000,
            budgetType: "fixed",
            urgency: "normal",
            location: "remote",
            experienceLevel: "intermediate",
            roleRequired: "influencer",
            skillsRequired: ["Video Editing"], // Keep some skills
            isClanAllowed: true
        };

        console.log('📝 Step 2: Updating gig with empty tags array...');
        console.log('Update data - tags:', updateDataWithEmptyArrays.tags);
        console.log('Update data - skills:', updateDataWithEmptyArrays.skillsRequired);
        console.log('Update data - deliverables:', updateDataWithEmptyArrays.deliverables);

        const updateResponse = await axios.put(`${API_BASE_URL}/gig/${createdGig.id}`, updateDataWithEmptyArrays, {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'test-user-123'
            }
        });

        if (!updateResponse.data.success) {
            console.error('❌ Failed to update gig:', updateResponse.data);
            return;
        }

        const updatedGig = updateResponse.data.data;
        console.log('✅ Gig updated successfully!');
        console.log('Updated tags:', updatedGig.tags);
        console.log('Updated skills:', updatedGig.skillsRequired);
        console.log('Updated deliverables:', updatedGig.deliverables);
        console.log('');

        // Verify the results
        console.log('📊 Verification Results:');

        const tagsCorrect = Array.isArray(updatedGig.tags) && updatedGig.tags.length === 0;
        const skillsCorrect = Array.isArray(updatedGig.skillsRequired) &&
            updatedGig.skillsRequired.length === 1 &&
            updatedGig.skillsRequired[0] === "Video Editing";
        const deliverablesCorrect = Array.isArray(updatedGig.deliverables) &&
            updatedGig.deliverables.length === 1 &&
            updatedGig.deliverables[0] === "Raw footage";

        console.log(`Tags replaced with empty array: ${tagsCorrect ? '✅' : '❌'} (Expected: [], Got: [${updatedGig.tags.join(', ')}])`);
        console.log(`Skills updated correctly: ${skillsCorrect ? '✅' : '❌'} (Expected: ["Video Editing"], Got: [${updatedGig.skillsRequired.join(', ')}])`);
        console.log(`Deliverables updated correctly: ${deliverablesCorrect ? '✅' : '❌'} (Expected: ["Raw footage"], Got: [${updatedGig.deliverables.join(', ')}])`);

        if (tagsCorrect && skillsCorrect && deliverablesCorrect) {
            console.log('\n🎉 All tests passed! Empty arrays properly replace existing values.');
        } else {
            console.log('\n❌ Some tests failed. Empty array replacement needs fixes.');
        }

        // Test 3: Update with completely empty arrays
        console.log('\n📝 Step 3: Testing all empty arrays...');
        const allEmptyUpdate = {
            tags: [],
            skillsRequired: [],
            deliverables: [],
            platformRequirements: [],
            locationRequirements: []
        };

        const allEmptyResponse = await axios.put(`${API_BASE_URL}/gig/${createdGig.id}`, allEmptyUpdate, {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'test-user-123'
            }
        });

        if (allEmptyResponse.data.success) {
            const finalGig = allEmptyResponse.data.data;
            console.log('✅ All empty arrays update successful!');
            console.log('Final tags:', finalGig.tags);
            console.log('Final skills:', finalGig.skillsRequired);
            console.log('Final deliverables:', finalGig.deliverables);

            const allEmpty = finalGig.tags.length === 0 &&
                finalGig.skillsRequired.length === 0 &&
                finalGig.deliverables.length === 0;

            console.log(`All arrays now empty: ${allEmpty ? '✅' : '❌'}`);
        }

        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        try {
            await axios.delete(`${API_BASE_URL}/gig/${createdGig.id}`, {
                headers: { 'x-user-id': 'test-user-123' }
            });
            console.log('✅ Test data cleaned up successfully!');
        } catch (cleanupError) {
            console.log('⚠️ Cleanup failed, but tests completed');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the gig service is running on port 4004');
        }
    }
}

// Run the test
testEmptyArrayReplacement();
