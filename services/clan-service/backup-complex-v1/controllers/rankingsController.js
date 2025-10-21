const databaseService = require('../services/database');
const { calculateClanScore, getScoreBreakdown, rankClans } = require('../utils/scoring');

class RankingsController {
    // Get clan rankings with comprehensive filtering
    async getRankings(req, res) {
        try {
            const {
                timeframe = 'all', // all, week, month, quarter, year
                category,
                location,
                limit = 50
            } = req.query;

            const prisma = await databaseService.getClient();

            // Build time-based filters
            const filters = {};
            const now = new Date();

            switch (timeframe) {
                case 'week':
                    filters.createdAt = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
                    break;
                case 'month':
                    filters.createdAt = { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
                    break;
                case 'quarter':
                    filters.createdAt = { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
                    break;
                case 'year':
                    filters.createdAt = { gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
                    break;
                default:
                    // No time filter for 'all'
                    break;
            }

            // Add category and location filters
            if (category) filters.primaryCategory = category;
            if (location) filters.location = { contains: location, mode: 'insensitive' };

            // Get clans with full scoring data
            const clans = await prisma.clan.findMany({
                where: {
                    ...filters,
                    visibility: 'PUBLIC',
                    isActive: true
                },
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

            // Calculate scores and rank clans
            const rankedClans = rankClans(clans, { category, location });

            // Get top clans
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const topClans = rankedClans.slice(0, limitNum);

            // Update analytics for top ranked clans
            for (const clan of topClans) {
                await prisma.clanAnalytics.upsert({
                    where: { clanId: clan.id },
                    update: {
                        marketRanking: clan.rank,
                        categoryRanking: filters.category ? clan.rank : null,
                        localRanking: filters.location ? clan.rank : null,
                        lastCalculatedAt: new Date()
                    },
                    create: {
                        clanId: clan.id,
                        marketRanking: clan.rank,
                        categoryRanking: filters.category ? clan.rank : null,
                        localRanking: filters.location ? clan.rank : null
                    }
                });
            }

            res.json({
                success: true,
                data: topClans.map(clan => ({
                    id: clan.id,
                    name: clan.name,
                    slug: clan.slug,
                    description: clan.description,
                    primaryCategory: clan.primaryCategory,
                    categories: clan.categories,
                    location: clan.location,
                    averageRating: clan.averageRating,
                    isVerified: clan.isVerified,
                    memberCount: clan._count?.members || 0,
                    portfolioCount: clan._count?.portfolio || 0,
                    reviewCount: clan._count?.reviews || 0,
                    totalGigs: clan.totalGigs,
                    completedGigs: clan.completedGigs,
                    createdAt: clan.createdAt,
                    score: clan.score,
                    rank: clan.rank,
                    scoreBreakdown: clan.scoreBreakdown
                })),
                meta: {
                    timeframe,
                    filters,
                    totalRanked: rankedClans.length,
                    generated: new Date().toISOString()
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

module.exports = new RankingsController();
