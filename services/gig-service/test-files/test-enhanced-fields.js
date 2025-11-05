const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEnhancedFields() {
    try {
        console.log('🧪 Testing enhanced fields in gig creation...\n');

        // Test data with enhanced fields
        const testGigData = {
            title: "Test Instagram Reel",
            description: "Test description for Instagram reel creation",
            postedById: "test-user-123",
            budgetMin: 2000,
            budgetMax: 10000,
            budgetType: "fixed",
            roleRequired: "influencer",
            experienceLevel: "intermediate",
            category: "content-creation",
            status: "DRAFT",
            skillsRequired: ["Copywriting", "Photography"],

            // Enhanced fields
            tags: ["Instagram", "Reels", "Content"],
            platformRequirements: ["Instagram"],
            followerRequirements: [
                {
                    platform: "Instagram",
                    minFollowers: 10000
                }
            ],
            locationRequirements: ["Remote", "US-based"],
            maxApplications: 50
        };

        console.log('Creating test gig with enhanced fields...');
        const createdGig = await prisma.gig.create({
            data: testGigData
        });

        console.log('✅ Success! Created gig with ID:', createdGig.id);
        console.log('Enhanced fields:');
        console.log('- Tags:', createdGig.tags);
        console.log('- Platform Requirements:', createdGig.platformRequirements);
        console.log('- Follower Requirements:', createdGig.followerRequirements);
        console.log('- Location Requirements:', createdGig.locationRequirements);
        console.log('- Max Applications:', createdGig.maxApplications);

        // Clean up
        await prisma.gig.delete({
            where: { id: createdGig.id }
        });

        console.log('\n✅ Test completed successfully!');
        console.log('🎉 All enhanced fields are now working!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testEnhancedFields();
