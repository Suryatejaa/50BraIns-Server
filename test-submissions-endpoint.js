const axios = require('axios');

async function testSubmissionsEndpoint() {
    console.log('🧪 Testing Gig Submissions Endpoint...\n');

    const baseURL = 'http://localhost:4004';

    // You'll need to replace these with actual values from your database
    const testGigId = 'cm2ixr2d7007o58x4a77p3vxx'; // Replace with actual gig ID
    const authToken = 'your-auth-token'; // Replace with actual auth token

    try {
        console.log(`📊 Fetching submissions for gig: ${testGigId}`);

        const response = await axios.get(`${baseURL}/gigs/${testGigId}/submissions`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'x-user-id': 'test-user-id' // Replace with actual user ID
            }
        });

        console.log('✅ Response received');
        console.log('📊 Status:', response.status);
        console.log('📊 Number of submissions returned:', response.data.data?.length || 0);

        if (response.data.data && response.data.data.length > 0) {
            console.log('\n📋 Submissions found:');
            response.data.data.forEach((submission, index) => {
                console.log(`   ${index + 1}. ID: ${submission.id}`);
                console.log(`      Title: ${submission.title}`);
                console.log(`      Status: ${submission.status}`);
                console.log(`      Submitted: ${submission.submittedAt}`);
                console.log(`      By: ${submission.submittedById} (${submission.submittedByType})`);
                console.log('');
            });
        } else {
            console.log('📋 No submissions found for this gig');
        }

        // Check the actual database to compare
        console.log('\n🔍 Let me check the database directly...');

    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.data);
        } else {
            console.error('❌ Request failed:', error.message);
        }

        console.log('\n💡 To test this properly, you need to:');
        console.log('   1. Replace testGigId with an actual gig ID that has submissions');
        console.log('   2. Replace authToken with a valid authentication token');
        console.log('   3. Make sure you are the owner of the gig (authentication check)');
    }
}

// Alternative: Direct database check
async function checkDatabaseDirectly() {
    try {
        console.log('\n🔍 Checking database directly...');

        // Add the path to the gig-service folder
        process.chdir('./services/gig-service');

        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        // Get all submissions to see the actual data
        const allSubmissions = await prisma.submission.findMany({
            include: {
                gig: {
                    select: {
                        id: true,
                        title: true,
                        postedById: true
                    }
                }
            },
            orderBy: { submittedAt: 'desc' }
        });

        console.log(`📊 Total submissions in database: ${allSubmissions.length}`);

        if (allSubmissions.length > 0) {
            console.log('\n📋 All submissions in database:');

            // Group by gig ID
            const submissionsByGig = allSubmissions.reduce((acc, submission) => {
                const gigId = submission.gigId;
                if (!acc[gigId]) {
                    acc[gigId] = [];
                }
                acc[gigId].push(submission);
                return acc;
            }, {});

            Object.entries(submissionsByGig).forEach(([gigId, submissions]) => {
                console.log(`\n   Gig: ${gigId} (${submissions[0].gig.title})`);
                console.log(`   Owner: ${submissions[0].gig.postedById}`);
                console.log(`   Submissions: ${submissions.length}`);

                submissions.forEach((submission, index) => {
                    console.log(`     ${index + 1}. ${submission.title} - ${submission.status} (${submission.submittedAt})`);
                });
            });

            console.log('\n💡 If the API is only returning 1 submission but database has more,');
            console.log('   then there might be an issue with the API endpoint logic.');

        } else {
            console.log('📋 No submissions found in database');
        }

        await prisma.$disconnect();

    } catch (error) {
        console.error('❌ Database check failed:', error.message);
        console.log('💡 Make sure you are in the correct directory and Prisma is set up');
    }
}

// Run tests
async function runTests() {
    await testSubmissionsEndpoint();
    await checkDatabaseDirectly();
}

runTests().catch(console.error);