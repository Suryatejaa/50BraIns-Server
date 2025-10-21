#!/usr/bin/env node

/**
 * Test Script for Gig Draft Functionality
 * Tests the new draft save, update, publish, and delete features
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:4004'; // Direct gig service instead of API Gateway
const GIG_SERVICE_URL = 'http://localhost:4004'; // Direct gig service
const TEST_USER_ID = 'test-user-123';

// Sample draft data
const sampleDraft = {
    title: 'Sample Draft Gig',
    description: 'This is a test draft for the new draft functionality',
    category: 'content-creation',
    budgetType: 'fixed',
    budgetMin: 100,
    budgetMax: 500,
    roleRequired: 'content-creator',
    experienceLevel: 'intermediate',
    urgency: 'normal'
};

const completeDraft = {
    title: 'Complete Draft Ready to Publish',
    description: 'This is a complete draft that should be publishable with all required fields',
    category: 'video-editing',
    budgetType: 'hourly',
    budgetMin: 25,
    budgetMax: 50,
    roleRequired: 'video-editor',
    experienceLevel: 'intermediate',
    urgency: 'normal',
    skillsRequired: ['video-editing', 'adobe-premiere', 'color-grading'],
    location: 'Remote',
    duration: '1-2 weeks',
    requirements: 'Must have experience with Adobe Premiere Pro and color grading',
    deliverables: ['Edited video file', 'Source files', 'Color correction notes'],
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
};

// Headers with user ID
const headers = {
    'Content-Type': 'application/json',
    'x-user-id': TEST_USER_ID
};

async function testDraftFunctionality() {
    console.log('🧪 Starting Draft Functionality Tests...\n');

    try {
        // Test 1: Save a new draft
        console.log('📝 Test 1: Save a new draft');
        const saveDraftResponse = await axios.post(
            `${API_BASE_URL}/gig/draft`,
            sampleDraft,
            { headers }
        );

        if (saveDraftResponse.status === 201) {
            console.log('✅ Draft saved successfully');
            console.log(`   Draft ID: ${saveDraftResponse.data.data.id}`);
            console.log(`   Status: ${saveDraftResponse.data.data.status}`);
        } else {
            console.log('❌ Failed to save draft');
        }

        const draftId = saveDraftResponse.data.data.id;

        // Test 2: Update the existing draft
        console.log('\n📝 Test 2: Update existing draft');
        const updatedDraftData = {
            ...sampleDraft,
            draftId: draftId,
            title: 'Updated Sample Draft Gig',
            description: 'This draft has been updated with new information',
            budgetMax: 750
        };

        const updateDraftResponse = await axios.post(
            `${API_BASE_URL}/gig/draft`,
            updatedDraftData,
            { headers }
        );

        if (updateDraftResponse.status === 200) {
            console.log('✅ Draft updated successfully');
            console.log(`   New title: ${updateDraftResponse.data.data.title}`);
            console.log(`   New budget max: ${updateDraftResponse.data.data.budgetMax}`);
        } else {
            console.log('❌ Failed to update draft');
        }

        // Test 3: Get user's drafts
        console.log('\n📋 Test 3: Get user drafts');
        const getDraftsResponse = await axios.get(
            `${API_BASE_URL}/gig/my-drafts`,
            { headers }
        );

        if (getDraftsResponse.status === 200) {
            console.log('✅ Successfully retrieved drafts');
            console.log(`   Total drafts: ${getDraftsResponse.data.count}`);
            getDraftsResponse.data.data.forEach((draft, index) => {
                console.log(`   Draft ${index + 1}: "${draft.title}" (${draft.id})`);
            });
        } else {
            console.log('❌ Failed to get drafts');
        }

        // Test 4: Try to publish incomplete draft (should fail)
        console.log('\n🚫 Test 4: Try to publish incomplete draft (should fail)');
        try {
            const publishIncompleteResponse = await axios.post(
                `${API_BASE_URL}/gig/draft/${draftId}/publish`,
                {},
                { headers }
            );
            console.log('❌ Incomplete draft was published (this should not happen)');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Correctly rejected incomplete draft');
                console.log(`   Missing fields: ${error.response.data.missingFields?.join(', ')}`);
            } else {
                console.log('❌ Unexpected error:', error.message);
            }
        }

        // Test 5: Save a complete draft
        console.log('\n📝 Test 5: Save a complete draft');
        const saveCompleteResponse = await axios.post(
            `${API_BASE_URL}/gig/draft`,
            completeDraft,
            { headers }
        );

        if (saveCompleteResponse.status === 201) {
            console.log('✅ Complete draft saved successfully');
            console.log(`   Draft ID: ${saveCompleteResponse.data.data.id}`);
        }

        const completeDraftId = saveCompleteResponse.data.data.id;

        // Test 6: Publish the complete draft
        console.log('\n🚀 Test 6: Publish complete draft');
        const publishResponse = await axios.post(
            `${API_BASE_URL}/gig/draft/${completeDraftId}/publish`,
            {},
            { headers }
        );

        if (publishResponse.status === 200) {
            console.log('✅ Draft published successfully');
            console.log(`   Published gig ID: ${publishResponse.data.data.id}`);
            console.log(`   New status: ${publishResponse.data.data.status}`);
        }

        // Test 7: Delete the incomplete draft
        console.log('\n🗑️ Test 7: Delete incomplete draft');
        const deleteResponse = await axios.delete(
            `${API_BASE_URL}/gig/draft/${draftId}`,
            { headers }
        );

        if (deleteResponse.status === 200) {
            console.log('✅ Draft deleted successfully');
        }

        // Test 8: Verify final state
        console.log('\n📊 Test 8: Final verification');
        const finalDraftsResponse = await axios.get(
            `${API_BASE_URL}/gig/my-drafts`,
            { headers }
        );

        console.log(`   Remaining drafts: ${finalDraftsResponse.data.count}`);

        const userGigsResponse = await axios.get(
            `${API_BASE_URL}/gig/my-posted`,
            { headers }
        );

        if (userGigsResponse.status === 200) {
            const publishedGigs = userGigsResponse.data.data.filter(gig => gig.status === 'OPEN');
            console.log(`   Published gigs: ${publishedGigs.length}`);
        }

        console.log('\n🎉 All draft functionality tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Response:', error.response.data);
        }
    }
}

// Run the tests
if (require.main === module) {
    testDraftFunctionality().catch(console.error);
}

module.exports = { testDraftFunctionality };
