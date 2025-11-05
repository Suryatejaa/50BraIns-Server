const { PrismaClient } = require('@prisma/client');

async function checkSubmissions() {
    const prisma = new PrismaClient();

    try {
        console.log('🔍 Checking submissions in database...\n');

        const submissions = await prisma.submission.findMany({
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

        console.log(`📊 Total submissions in database: ${submissions.length}\n`);

        // Group by gig
        const submissionsByGig = {};
        submissions.forEach(s => {
            if (!submissionsByGig[s.gigId]) {
                submissionsByGig[s.gigId] = [];
            }
            submissionsByGig[s.gigId].push(s);
        });

        Object.entries(submissionsByGig).forEach(([gigId, gigSubmissions]) => {
            console.log(`📋 Gig: "${gigSubmissions[0].gig.title}" (${gigId})`);
            console.log(`   Owner: ${gigSubmissions[0].gig.postedById}`);
            console.log(`   📊 Number of submissions: ${gigSubmissions.length}`);

            gigSubmissions.forEach((submission, index) => {
                console.log(`     ${index + 1}. "${submission.title}" - ${submission.status}`);
                console.log(`        Submitted by: ${submission.submittedById} (${submission.submittedByType})`);
                console.log(`        Submitted at: ${submission.submittedAt}`);
            });
            console.log('');
        });

        // Check if any gig has multiple submissions
        const gigsWithMultipleSubmissions = Object.entries(submissionsByGig)
            .filter(([gigId, submissions]) => submissions.length > 1);

        if (gigsWithMultipleSubmissions.length > 0) {
            console.log('🔍 Gigs with multiple submissions:');
            gigsWithMultipleSubmissions.forEach(([gigId, submissions]) => {
                console.log(`   - "${submissions[0].gig.title}": ${submissions.length} submissions`);
            });
        } else {
            console.log('ℹ️  No gigs have multiple submissions');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSubmissions();