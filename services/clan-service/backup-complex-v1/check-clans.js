const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClans() {
    try {
        const clans = await prisma.clan.findMany({
            where: { visibility: 'PUBLIC' },
            select: {
                name: true,
                isVerified: true,
                reputationScore: true,
                isActive: true
            }
        });
        
        console.log('Public clans:', JSON.stringify(clans, null, 2));
        
        // Check how many meet the featured criteria
        const featuredCriteria = clans.filter(clan => 
            clan.isVerified === true && 
            clan.reputationScore >= 500
        );
        
        console.log('\nClans meeting featured criteria:', featuredCriteria.length);
        console.log('Featured criteria clans:', JSON.stringify(featuredCriteria, null, 2));
        
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkClans(); 