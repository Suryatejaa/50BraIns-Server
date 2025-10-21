const { PrismaClient } = require('@prisma/client');

class LeaderboardService {
    constructor() {
        this.prisma = new PrismaClient();
    }



    async getLeaderboard(type = 'global', limit = 100, offset = 0, filters = {}) {
        try {
            console.log(`📋 [Reputation] Generating ${type} leaderboard from database`);

            // Generate leaderboard from database
            const leaderboard = await this.generateLeaderboard(type, limit, offset, filters);
            return leaderboard;

        } catch (error) {
            console.error(`❌ [Reputation] Failed to get ${type} leaderboard:`, error);
            throw error;
        }
    }

    async generateLeaderboard(type, limit, offset, filters) {
        let whereClause = {};
        let orderBy = { totalScore: 'desc' };

        // Apply filters
        if (filters.tier) {
            whereClause.level = filters.tier;
        }

        if (filters.minScore) {
            whereClause.totalScore = { gte: filters.minScore };
        }

        if (filters.verified === true) {
            whereClause.isVerified = true;
        }

        switch (type) {
            case 'global':
                return await this.getGlobalLeaderboard(whereClause, orderBy, limit, offset);

            case 'tier':
                return await this.getTierLeaderboards(limit);

            case 'creators':
                whereClause.completedGigs = { gt: 0 };
                return await this.getCreatorsLeaderboard(whereClause, orderBy, limit, offset);

            case 'clients':
                whereClause.totalGigs = { gt: 0 };
                return await this.getClientsLeaderboard(whereClause, orderBy, limit, offset);

            case 'rising':
                return await this.getRisingStarsLeaderboard(limit);

            case 'clans':
                return await this.getClanLeaderboard(limit);

            default:
                throw new Error(`Unknown leaderboard type: ${type}`);
        }
    }

    async getGlobalLeaderboard(whereClause, orderBy, limit, offset) {
        const users = await this.prisma.reputationScore.findMany({
            where: whereClause,
            orderBy,
            skip: offset,
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        isVerified: true
                    }
                }
            }
        });

        return {
            type: 'global',
            users: users.map((score, index) => ({
                rank: offset + index + 1,
                userId: score.userId,
                username: score.user?.username || 'Unknown',
                avatar: score.user?.avatar,
                isVerified: score.user?.isVerified || false,
                totalScore: score.totalScore,
                level: score.level,
                badges: score.badges,
                completedGigs: score.completedGigs,
                overallRating: score.overallRating
            })),
            total: await this.prisma.reputationScore.count({ where: whereClause }),
            generatedAt: new Date()
        };
    }

    async getTierLeaderboards(limit) {
        const levels = ['LEGEND', 'DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'NEWCOMER'];
        const tierBoards = {};

        for (const level of levels) {
            const users = await this.prisma.reputationScore.findMany({
                where: { level },
                orderBy: { totalScore: 'desc' },
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                            isVerified: true
                        }
                    }
                }
            });

            tierBoards[level] = {
                level,
                users: users.map((score, index) => ({
                    rank: index + 1,
                    userId: score.userId,
                    username: score.user?.username || 'Unknown',
                    avatar: score.user?.avatar,
                    isVerified: score.user?.isVerified || false,
                    totalScore: score.totalScore,
                    badges: score.badges
                })),
                count: users.length
            };
        }

        return {
            type: 'tier',
            tierBoards,
            generatedAt: new Date()
        };
    }

    async getCreatorsLeaderboard(whereClause, orderBy, limit, offset) {
        const creators = await this.prisma.reputationScore.findMany({
            where: whereClause,
            orderBy: [
                { completedGigs: 'desc' },
                { overallRating: 'desc' },
                { totalScore: 'desc' }
            ],
            skip: offset,
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        isVerified: true
                    }
                }
            }
        });

        return {
            type: 'creators',
            users: creators.map((score, index) => ({
                rank: offset + index + 1,
                userId: score.userId,
                username: score.user?.username || 'Unknown',
                avatar: score.user?.avatar,
                isVerified: score.user?.isVerified || false,
                totalScore: score.totalScore,
                level: score.level,
                completedGigs: score.completedGigs,
                overallRating: score.overallRating,
                clientSatisfactionRate: score.clientSatisfactionRate,
                specialization: 'Creator' // Could be derived from gig categories
            })),
            total: await this.prisma.reputationScore.count({ where: whereClause }),
            generatedAt: new Date()
        };
    }

    async getClientsLeaderboard(whereClause, orderBy, limit, offset) {
        const clients = await this.prisma.reputationScore.findMany({
            where: whereClause,
            orderBy: [
                { totalGigs: 'desc' },
                { totalScore: 'desc' }
            ],
            skip: offset,
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        isVerified: true
                    }
                }
            }
        });

        return {
            type: 'clients',
            users: clients.map((score, index) => ({
                rank: offset + index + 1,
                userId: score.userId,
                username: score.user?.username || 'Unknown',
                avatar: score.user?.avatar,
                isVerified: score.user?.isVerified || false,
                totalScore: score.totalScore,
                level: score.level,
                totalGigs: score.totalGigs,
                onTimeDeliveryRate: score.onTimeDeliveryRate,
                specialization: 'Client'
            })),
            total: await this.prisma.reputationScore.count({ where: whereClause }),
            generatedAt: new Date()
        };
    }

    async getRisingStarsLeaderboard(limit) {
        // Get users with recent significant score increases
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 30); // Last 30 days

        const risingStars = await this.prisma.scoreHistory.groupBy({
            by: ['userId'],
            where: {
                createdAt: { gte: recentDate },
                scoreChange: { gt: 0 }
            },
            _sum: {
                scoreChange: true
            },
            _count: {
                userId: true
            },
            orderBy: {
                _sum: {
                    scoreChange: 'desc'
                }
            },
            take: limit
        });

        // Get user details
        const userIds = risingStars.map(star => star.userId);
        const users = await this.prisma.reputationScore.findMany({
            where: {
                userId: { in: userIds }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        isVerified: true
                    }
                }
            }
        });

        const userMap = users.reduce((acc, user) => {
            acc[user.userId] = user;
            return acc;
        }, {});

        return {
            type: 'rising',
            users: risingStars.map((star, index) => {
                const user = userMap[star.userId];
                return {
                    rank: index + 1,
                    userId: star.userId,
                    username: user?.user?.username || 'Unknown',
                    avatar: user?.user?.avatar,
                    isVerified: user?.user?.isVerified || false,
                    totalScore: user?.totalScore || 0,
                    level: user?.level || 'NEWCOMER',
                    scoreGain: star._sum.scoreChange || 0,
                    activeDays: star._count.userId || 0
                };
            }),
            generatedAt: new Date()
        };
    }

    async getClanLeaderboard(limit) {
        const clanBoards = await this.prisma.clanReputation.findMany({
            orderBy: [
                { avgMemberScore: 'desc' },
                { totalScore: 'desc' }
            ],
            take: limit
        });

        return {
            type: 'clans',
            clans: clanBoards.map((clan, index) => ({
                rank: index + 1,
                clanId: clan.clanId,
                clanName: `Clan ${clan.clanId}`, // Clan name would come from clan service
                avgMemberScore: clan.avgMemberScore,
                totalScore: clan.totalScore,
                totalGigs: clan.totalGigs,
                successRate: clan.successRate,
                level: clan.level || 'NEWCOMER'
            })),
            generatedAt: new Date()
        };
    }

    async getUserRank(userId, type = 'global') {
        try {
            const user = await this.prisma.reputationScore.findUnique({
                where: { userId }
            });

            if (!user) {
                return null;
            }

            let rank;
            switch (type) {
                case 'global':
                    rank = await this.prisma.reputationScore.count({
                        where: {
                            totalScore: { gt: user.totalScore }
                        }
                    });
                    break;

                case 'tier':
                    rank = await this.prisma.reputationScore.count({
                        where: {
                            level: user.level,
                            totalScore: { gt: user.totalScore }
                        }
                    });
                    break;

                default:
                    rank = await this.prisma.reputationScore.count({
                        where: {
                            totalScore: { gt: user.totalScore }
                        }
                    });
            }

            return {
                userId,
                rank: rank + 1,
                type,
                totalScore: user.totalScore,
                level: user.level
            };

        } catch (error) {
            console.error(`❌ [Reputation] Failed to get user rank for ${userId}:`, error);
            throw error;
        }
    }



    async warmupLeaderboards() {
        console.log('🔄 [Reputation] Warming up leaderboards...');

        // Pre-generate common leaderboards for performance
        const types = ['global', 'tier', 'creators', 'clients', 'rising', 'clans'];

        for (const type of types) {
            try {
                await this.getLeaderboard(type, 100, 0);
                console.log(`✅ [Reputation] Warmed up ${type} leaderboard`);
            } catch (error) {
                console.error(`❌ [Reputation] Failed to warm up ${type} leaderboard:`, error);
            }
        }
    }

    async disconnect() {
        // Close Prisma connection
        await this.prisma.$disconnect();
        console.log('🔌 [Reputation] Disconnected from database');
    }
}

module.exports = LeaderboardService;
