const databaseService = require('../services/database');
const { calculateClanScore, getScoreBreakdown, rankClans } = require('../utils/scoring');

class AdminController {
    // Get all clans for admin with full details
    async getAllClans(req, res) {
        try {
            const {
                category,
                location,
                visibility,
                isVerified,
                isActive,
                sortBy = 'score',
                order = 'desc',
                page = 1,
                limit = 50
            } = req.query;

            const prisma = await databaseService.getClient();

            // Build filters
            const filters = {};
            if (category) filters.primaryCategory = category;
            if (location) filters.location = { contains: location, mode: 'insensitive' };
            if (visibility) filters.visibility = visibility;
            if (isVerified !== undefined) filters.isVerified = isVerified === 'true';
            if (isActive !== undefined) filters.isActive = isActive === 'true';

            // Get all clans with comprehensive data for admin view
            const clans = await prisma.clan.findMany({
                where: filters,
                include: {
                    _count: {
                        select: {
                            members: { where: { status: 'ACTIVE' } },
                            portfolio: { where: { isPublic: true } },
                            reviews: { where: { isPublic: true } }
                        }
                    },
                    analytics: true,
                    members: {
                        where: { status: 'ACTIVE' },
                        select: {
                            id: true,
                            userId: true,
                            role: true,
                            joinedAt: true,
                            gigsParticipated: true,
                            contributionScore: true
                        }
                    },
                    portfolio: {
                        where: { isPublic: true },
                        select: {
                            projectValue: true,
                            likes: true,
                            views: true,
                            isFeatured: true,
                            createdAt: true
                        }
                    },
                    reviews: {
                        where: { isPublic: true },
                        select: {
                            rating: true,
                            communicationRating: true,
                            qualityRating: true,
                            timelinessRating: true,
                            professionalismRating: true
                        }
                    }
                }
            });

            // Calculate scores and rank all clans
            const rankedClans = rankClans(clans, { category, location });

            // Apply pagination
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
            const offset = (pageNum - 1) * limitNum;
            const paginatedClans = rankedClans.slice(offset, offset + limitNum);

            // Update analytics for all ranked clans
            for (const clan of paginatedClans) {
                await prisma.clanAnalytics.upsert({
                    where: { clanId: clan.id },
                    update: {
                        marketRanking: clan.rank,
                        categoryRanking: filters.primaryCategory ? clan.rank : null,
                        localRanking: filters.location ? clan.rank : null,
                        lastCalculatedAt: new Date()
                    },
                    create: {
                        clanId: clan.id,
                        marketRanking: clan.rank,
                        categoryRanking: filters.primaryCategory ? clan.rank : null,
                        localRanking: filters.location ? clan.rank : null
                    }
                });
            }

            res.json({
                success: true,
                data: paginatedClans.map(clan => ({
                    id: clan.id,
                    name: clan.name,
                    slug: clan.slug,
                    description: clan.description,
                    primaryCategory: clan.primaryCategory,
                    categories: clan.categories,
                    location: clan.location,
                    visibility: clan.visibility,
                    isActive: clan.isActive,
                    isVerified: clan.isVerified,
                    isFeatured: clan.isFeatured,
                    averageRating: clan.averageRating,
                    reputationScore: clan.reputationScore,
                    memberCount: clan._count?.members || 0,
                    portfolioCount: clan._count?.portfolio || 0,
                    reviewCount: clan._count?.reviews || 0,
                    totalGigs: clan.totalGigs,
                    completedGigs: clan.completedGigs,
                    createdAt: clan.createdAt,
                    updatedAt: clan.updatedAt,
                    score: clan.score,
                    rank: clan.rank,
                    scoreBreakdown: clan.scoreBreakdown,
                    analytics: clan.analytics
                })),
                meta: {
                    page: pageNum,
                    limit: limitNum,
                    total: rankedClans.length,
                    pages: Math.ceil(rankedClans.length / limitNum),
                    filters,
                    sorting: { sortBy, order }
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = new AdminController();
