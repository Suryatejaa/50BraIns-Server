// src/services/analytics.service.js
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get trending influencers based on analytics data
 */
const getTrendingInfluencers = async ({ limit = 10, timeframe = '7d' }) => {
    try {
        const timeframeDate = getTimeframeDate(timeframe);

        const trending = await prisma.user.findMany({
            where: {
                roles: { has: 'INFLUENCER' },
                isActive: true,
                lastActiveAt: {
                    gte: timeframeDate
                }
            },
            orderBy: [
                { updatedAt: 'desc' },
                { estimatedFollowers: 'desc' }
            ],
            take: limit
        });

        // Get analytics for each user
        const results = [];
        for (const user of trending) {
            const analytics = await prisma.userAnalytics.findUnique({
                where: { userId: user.id }
            });

            results.push({
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePicture: user.profilePicture,
                bio: user.bio,
                primaryNiche: user.primaryNiche,
                primaryPlatform: user.primaryPlatform,
                estimatedFollowers: user.estimatedFollowers,
                profileViews: analytics?.profileViews || 0,
                popularityScore: analytics?.popularityScore || 0
            });
        }

        return results;
    } catch (error) {
        logger.error('Error getting trending influencers:', error);
        throw error;
    }
};

/**
 * Get popular brands based on search and engagement metrics
 */
const getPopularBrands = async ({ limit = 10, industry }) => {
    try {
        const whereClause = {
            roles: { has: 'BRAND' },
            isActive: true
        };

        if (industry) {
            whereClause.industry = industry;
        }

        const popular = await prisma.user.findMany({
            where: whereClause,
            orderBy: [
                { updatedAt: 'desc' },
                { createdAt: 'desc' }
            ],
            take: limit
        });

        // Get analytics for each brand
        const results = [];
        for (const brand of popular) {
            const analytics = await prisma.userAnalytics.findUnique({
                where: { userId: brand.id }
            });

            results.push({
                id: brand.id,
                username: brand.username,
                companyName: brand.companyName,
                industry: brand.industry,
                companyType: brand.companyType,
                profilePicture: brand.profilePicture,
                bio: brand.bio,
                location: brand.location,
                profileViews: analytics?.profileViews || 0,
                popularityScore: analytics?.popularityScore || 0
            });
        }

        return results;
    } catch (error) {
        logger.error('Error getting popular brands:', error);
        throw error;
    }
};

/**
 * Get search trends and analytics
 */
const getSearchTrends = async ({ timeframe = '30d', type }) => {
    try {
        const timeframeDate = getTimeframeDate(timeframe);

        const whereClause = {
            createdAt: {
                gte: timeframeDate
            }
        };

        if (type) {
            whereClause.searchType = type;
        }

        const trends = await prisma.searchHistory.groupBy({
            by: ['searchQuery', 'searchType'],
            where: whereClause,
            _count: {
                searchQuery: true
            },
            _avg: {
                resultCount: true
            },
            orderBy: {
                _count: {
                    searchQuery: 'desc'
                }
            },
            take: 20
        });

        return trends.map(trend => ({
            query: trend.searchQuery,
            type: trend.searchType,
            searchCount: trend._count.searchQuery,
            avgResults: Math.round(trend._avg.resultCount || 0)
        }));
    } catch (error) {
        logger.error('Error getting search trends:', error);
        throw error;
    }
};

/**
 * Get profile view analytics for a specific user
 */
const getProfileViews = async (userId, timeframe = '30d') => {
    try {
        const timeframeDate = getTimeframeDate(timeframe);

        const analytics = await prisma.userAnalytics.findUnique({
            where: { userId }
        });

        if (!analytics) {
            return {
                userId,
                profileViews: 0,
                searchAppearances: 0,
                popularityScore: 0,
                engagementScore: 0,
                period: timeframe
            };
        }

        return {
            userId,
            profileViews: analytics.profileViews,
            searchAppearances: analytics.searchAppearances,
            popularityScore: analytics.popularityScore,
            engagementScore: analytics.engagementScore,
            lastViewedAt: analytics.lastViewedAt,
            period: timeframe
        };
    } catch (error) {
        logger.error('Error getting profile views:', error);
        throw error;
    }
};

/**
 * Get comprehensive user insights
 */
const getUserInsights = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Get analytics separately
        const analytics = await prisma.userAnalytics.findUnique({
            where: { userId: userId }
        });

        // Get position in rankings
        const rolesRanking = await getUserRanking(userId, user.roles);

        return {
            user: {
                id: user.id,
                username: user.username,
                roles: user.roles,
                createdAt: user.createdAt
            },
            analytics: analytics ? {
                profileViews: analytics.profileViews,
                searchAppearances: analytics.searchAppearances,
                popularityScore: analytics.popularityScore,
                engagementScore: analytics.engagementScore,
                lastViewedAt: analytics.lastViewedAt
            } : null,
            ranking: rolesRanking,
            insights: {
                profileOptimization: calculateProfileOptimization(user),
                visibility: calculateVisibility(user, analytics)
            }
        };
    } catch (error) {
        logger.error('Error getting user insights:', error);
        throw error;
    }
};

/**
 * Helper function to convert timeframe string to Date
 */
const getTimeframeDate = (timeframe) => {
    const now = new Date();
    const days = parseInt(timeframe.replace('d', ''));
    return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
};

/**
 * Get user ranking within their roles
 */
const getUserRanking = async (userId, roles) => {
    try {
        // Get the user's analytics
        const userAnalytics = await prisma.userAnalytics.findUnique({
            where: { userId }
        });

        const userScore = userAnalytics?.popularityScore || 0;

        // Get all users with the same roles and their analytics
        // First get all user IDs with matching roles and active status
        const matchingUsers = await prisma.user.findMany({
            where: {
                roles: { hasSome: roles },
                isActive: true
            },
            select: { id: true }
        });

        const matchingUserIds = matchingUsers.map(u => u.id);

        // Then get analytics for those users with higher scores
        const usersWithHigherScores = await prisma.userAnalytics.findMany({
            where: {
                userId: { in: matchingUserIds },
                popularityScore: {
                    gt: userScore
                }
            }
        });

        const usersAbove = usersWithHigherScores.length;

        const totalUsers = await prisma.user.count({
            where: {
                roles: { hasSome: roles },
                isActive: true
            }
        });

        return {
            position: usersAbove + 1,
            totalUsers,
            percentile: totalUsers > 0 ? Math.round(((totalUsers - usersAbove) / totalUsers) * 100) : 0
        };
    } catch (error) {
        logger.error('Error calculating user ranking:', error);
        return {
            position: 1,
            totalUsers: 1,
            percentile: 100
        };
    }
};

/**
 * Calculate profile optimization score
 */
const calculateProfileOptimization = (user) => {
    let score = 0;
    const factors = [];

    if (user.profilePicture) { score += 15; factors.push('Profile picture'); }
    if (user.bio && user.bio.length > 50) { score += 20; factors.push('Complete bio'); }
    if (user.location) { score += 10; factors.push('Location'); }
    if (user.website) { score += 10; factors.push('Website'); }

    // roles-specific checks
    if (user.roles.includes('INFLUENCER')) {
        if (user.primaryNiche) { score += 15; factors.push('Primary niche'); }
        if (user.primaryPlatform) { score += 10; factors.push('Primary platform'); }
        if (user.contentCategories?.length > 0) { score += 10; factors.push('Content categories'); }
        if (user.instagramHandle || user.youtubeHandle || user.twitterHandle) {
            score += 10; factors.push('Social media handles');
        }
    } else if (user.roles.includes('BRAND')) {
        if (user.companyName) { score += 15; factors.push('Company name'); }
        if (user.industry) { score += 15; factors.push('Industry'); }
        if (user.companyType) { score += 10; factors.push('Company type'); }
    }

    return {
        score: Math.min(score, 100),
        factors,
        maxScore: 100
    };
};

/**
 * Calculate visibility score
 */
const calculateVisibility = (user, analytics) => {
    if (!analytics) {
        return {
            score: 0,
            level: 'Low',
            factors: ['No analytics data available']
        };
    }

    let score = 0;
    const factors = [];

    if (analytics.profileViews > 100) { score += 30; factors.push('High profile views'); }
    else if (analytics.profileViews > 10) { score += 15; factors.push('Moderate profile views'); }

    if (analytics.searchAppearances > 50) { score += 30; factors.push('Frequent search appearances'); }
    else if (analytics.searchAppearances > 10) { score += 15; factors.push('Regular search appearances'); }

    if (analytics.popularityScore > 0.7) { score += 25; factors.push('High popularity score'); }
    else if (analytics.popularityScore > 0.3) { score += 10; factors.push('Moderate popularity'); }

    if (analytics.engagementScore > 0.7) { score += 15; factors.push('High engagement'); }

    let level = 'Low';
    if (score >= 70) level = 'High';
    else if (score >= 40) level = 'Medium';

    return {
        score,
        level,
        factors
    };
};

module.exports = {
    getTrendingInfluencers,
    getPopularBrands,
    getSearchTrends,
    getProfileViews,
    getUserInsights
};
