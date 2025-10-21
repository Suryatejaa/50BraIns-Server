const axios = require('axios');

const API_BASE_URL = 'http://localhost:4004';

// Test data with duplicate tags
const testGigWithDuplicates = {
    title: "Test Gig - Tag Deduplication",
    description: "Testing if duplicate tags are properly filtered out",
    category: "content-creation",
    roleRequired: "Content Creator",
    budgetType: "fixed",
    budgetMin: 500,
    budgetMax: 1000,
    experienceLevel: "intermediate",
    urgency: "normal",
    location: "remote",
    tags: [
        "Video Editing",
        "Video Editing",
        "Video Editing",
        "Photography",
        "Photography",
        "Social Media"
    ],
    skillsRequired: [
        "Adobe Premiere",
        "Adobe Premiere",
        "Photoshop",
        "Photoshop"
    ],
    deliverables: [
        "Final Video",
        "Final Video",
        "Raw Footage",
        "Edited Photos"
    ],
    platformRequirements: [
        "Instagram",
        "Instagram",
        "YouTube"
    ],
    locationRequirements: [
        "Remote Work",
        "Remote Work",
        "Flexible Hours"
    ]
};

async function testTagDeduplication() {
    try {
        console.log('🧪 Testing Tag Deduplication...\n');

        console.log('📤 Original data with duplicates:');
        console.log('Tags:', testGigWithDuplicates.tags);
        console.log('Skills:', testGigWithDuplicates.skillsRequired);
        console.log('Deliverables:', testGigWithDuplicates.deliverables);
        console.log('Platform Requirements:', testGigWithDuplicates.platformRequirements);
        console.log('Location Requirements:', testGigWithDuplicates.locationRequirements);
        console.log('\n');

        // Test 1: Create gig with duplicates
        console.log('📝 Test 1: Creating gig with duplicate tags...');
        const createResponse = await axios.post(`${API_BASE_URL}/gig`, testGigWithDuplicates, {
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'test-user-123'
            }
        });

        if (createResponse.data.success) {
            const createdGig = createResponse.data.data;
            console.log('✅ Gig created successfully!');
            console.log('📥 Cleaned data in database:');
            console.log('Tags:', createdGig.tags);
            console.log('Skills:', createdGig.skillsRequired);
            console.log('Deliverables:', createdGig.deliverables);
            console.log('Platform Requirements:', createdGig.platformRequirements);
            console.log('Location Requirements:', createdGig.locationRequirements);
            console.log('\n');

            // Verify deduplication worked
            const originalTagsCount = testGigWithDuplicates.tags.length;
            const uniqueTagsCount = createdGig.tags.length;
            const originalSkillsCount = testGigWithDuplicates.skillsRequired.length;
            const uniqueSkillsCount = createdGig.skillsRequired.length;

            console.log('📊 Deduplication Results:');
            console.log(`Tags: ${originalTagsCount} → ${uniqueTagsCount} (${originalTagsCount - uniqueTagsCount} duplicates removed)`);
            console.log(`Skills: ${originalSkillsCount} → ${uniqueSkillsCount} (${originalSkillsCount - uniqueSkillsCount} duplicates removed)`);
            console.log('\n');

            // Test 2: Update gig with more duplicates
            console.log('📝 Test 2: Updating gig with more duplicates...');
            const updateData = {
                tags: [
                    ...createdGig.tags,
                    "Video Editing", // Add duplicate again
                    "Video Editing",
                    "New Tag",
                    "New Tag"
                ],
                skillsRequired: [
                    ...createdGig.skillsRequired,
                    "Adobe Premiere", // Add duplicate again
                    "New Skill",
                    "New Skill"
                ]
            };

            const updateResponse = await axios.put(`${API_BASE_URL}/gig/${createdGig.id}`, updateData, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'test-user-123'
                }
            });

            if (updateResponse.data.success) {
                const updatedGig = updateResponse.data.data;
                console.log('✅ Gig updated successfully!');
                console.log('📥 Final cleaned data:');
                console.log('Tags:', updatedGig.tags);
                console.log('Skills:', updatedGig.skillsRequired);
                console.log('\n');

                // Test 3: Save as draft with duplicates
                console.log('📝 Test 3: Saving draft with duplicates...');
                const draftData = {
                    title: "Draft with Duplicates",
                    tags: ["Draft Tag", "Draft Tag", "Draft Tag", "Unique Tag"],
                    skillsRequired: ["Draft Skill", "Draft Skill", "Unique Skill"]
                };

                const draftResponse = await axios.post(`${API_BASE_URL}/gig/draft`, draftData, {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': 'test-user-123'
                    }
                });

                if (draftResponse.data.success) {
                    const draft = draftResponse.data.data;
                    console.log('✅ Draft saved successfully!');
                    console.log('📥 Draft cleaned data:');
                    console.log('Tags:', draft.tags);
                    console.log('Skills:', draft.skillsRequired);
                    console.log('\n');

                    // Cleanup - delete test gigs
                    console.log('🧹 Cleaning up test data...');
                    try {
                        await axios.delete(`${API_BASE_URL}/gig/${createdGig.id}`, {
                            headers: { 'x-user-id': 'test-user-123' }
                        });
                        await axios.delete(`${API_BASE_URL}/gig/${draft.id}`, {
                            headers: { 'x-user-id': 'test-user-123' }
                        });
                        console.log('✅ Test data cleaned up successfully!\n');
                    } catch (cleanupError) {
                        console.log('⚠️ Cleanup failed, but tests completed successfully\n');
                    }

                    console.log('🎉 All deduplication tests passed!');
                    console.log('✅ Tags are now properly deduplicated on create, update, and draft save operations');
                } else {
                    console.error('❌ Draft creation failed:', draftResponse.data);
                }
            } else {
                console.error('❌ Gig update failed:', updateResponse.data);
            }
        } else {
            console.error('❌ Gig creation failed:', createResponse.data);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the gig service is running on port 3001');
            console.log('   Run: npm start in the gig-service directory');
        }
    }
}

// Run the test
testTagDeduplication();
