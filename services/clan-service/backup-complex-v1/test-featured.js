const { PrismaClient } = require('@prisma/client');
const { calculateClanScore } = require('./src/utils/scoring');
const prisma = new PrismaClient();

async function testFeaturedClans() {
    try {
        const featured = await prisma.clan.findMany({
            where: {
                visibility: 'PUBLIC',
                isActive: true,
                OR: [
                    { isVerified: true },
                    { reputationScore: { gte: 10 } }
                ]
            },
            include: {
                _count: {
                    select: {
                        members: { where: { status: 'ACTIVE' } },
                        portfolio: { where: { isPublic: true } },
                        reviews: { where: { isPublic: true } }
                    }
                }
            },
            orderBy: [
                { isVerified: 'desc' },
                { reputationScore: 'desc' },
                { averageRating: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 8
        });

        const results = featured.map((clan, index) => ({
            id: clan.id,
            name: clan.name,
            slug: clan.slug,
            description: clan.description,
            primaryCategory: clan.primaryCategory,
            categories: clan.categories,
            location: clan.location,
            averageRating: clan.averageRating,
            isVerified: clan.isVerified,
            visibility: clan.visibility,
            clanHeadId: clan.clanHeadId,
            memberCount: clan._count?.members || 0,
            portfolioCount: clan._count?.portfolio || 0,
            reviewCount: clan._count?.reviews || 0,
            totalGigs: clan.totalGigs,
            completedGigs: clan.completedGigs,
            score: calculateClanScore(clan),
            rank: index + 1,
            createdAt: clan.createdAt
        }));

        console.log('Featured clans:', JSON.stringify(results, null, 2));
        console.log('Total featured clans:', results.length);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

testFeaturedClans(); 