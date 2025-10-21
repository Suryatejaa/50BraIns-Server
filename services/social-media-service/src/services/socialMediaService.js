const { PrismaClient } = require('@prisma/client');
const eventService = require('./eventService');
const platformAPIService = require('./platformAPIService');

const prisma = new PrismaClient();

// Link a social media account to a user profile
const linkAccount = async (accountData) => {
    const { userId, platform, username, profileUrl } = accountData;

    // Check if account already exists
    const existingAccount = await prisma.socialMediaAccount.findUnique({
        where: {
            userId_platform: {
                userId,
                platform
            }
        }
    });

    if (existingAccount) {
        throw new Error(`Account for ${platform} already linked to this user`);
    }

    // Create the account record
    const newAccount = await prisma.socialMediaAccount.create({
        data: {
            userId,
            platform,
            username,
            profileUrl,
        },
    });

    // Trigger initial stats fetch
    try {
        let stats;
        if (process.env.ENABLE_REAL_API_CALLS === 'true') {
            // Use real API calls when enabled
            stats = await platformAPIService.getMockData(platform); // Will be replaced with real API calls
        } else {
            // Use mock data for MVP/testing
            stats = await platformAPIService.getMockData(platform);
        }

        await prisma.socialMediaAccount.update({
            where: { id: newAccount.id },
            data: {
                followers: stats.followers,
                following: stats.following,
                posts: stats.posts,
                engagement: stats.engagement,
                lastSynced: new Date()
            }
        });

        // Create initial snapshot
        await prisma.socialMediaSnapshot.create({
            data: {
                accountId: newAccount.id,
                followers: stats.followers,
                following: stats.following,
                posts: stats.posts,
                engagement: stats.engagement,
                platformMetrics: stats.platformMetrics
            }
        });
    } catch (error) {
        console.error('Failed to fetch initial stats:', error);
    }

    // Publish account linked event
    await eventService.publishAccountLinked(userId, newAccount);

    return newAccount;
};

// Get all linked accounts for a given user
const getLinkedAccounts = async (userId) => {
    const accounts = await prisma.socialMediaAccount.findMany({
        where: {
            userId: userId,
        },
        include: {
            snapshots: {
                orderBy: {
                    createdAt: 'desc'
                },
                take: 1
            }
        }
    });
    return accounts;
};

// Sync/refresh account stats
const syncAccount = async (platform, userId) => {
    const account = await prisma.socialMediaAccount.findUnique({
        where: {
            userId_platform: {
                userId,
                platform
            }
        }
    });

    if (!account) {
        throw new Error(`No ${platform} account found for user ${userId}`);
    }

    // Store previous stats for comparison
    const previousStats = {
        followers: account.followers,
        engagement: account.engagement
    };

    // Fetch fresh stats from platform API
    let freshStats;
    if (process.env.ENABLE_REAL_API_CALLS === 'true') {
        // Use real API calls when enabled
        freshStats = await platformAPIService.getMockData(platform); // Will be replaced with real API calls
    } else {
        // Use mock data for MVP/testing
        freshStats = await platformAPIService.getMockData(platform);
    }

    // Update account with latest stats
    const updatedAccount = await prisma.socialMediaAccount.update({
        where: { id: account.id },
        data: {
            followers: freshStats.followers,
            following: freshStats.following,
            posts: freshStats.posts,
            engagement: freshStats.engagement,
            lastSynced: new Date()
        }
    });

    // Create snapshot
    await prisma.socialMediaSnapshot.create({
        data: {
            accountId: account.id,
            followers: freshStats.followers,
            following: freshStats.following,
            posts: freshStats.posts,
            engagement: freshStats.engagement,
            platformMetrics: freshStats.platformMetrics
        }
    });

    // Check for engagement thresholds and publish events
    await checkEngagementThresholds(userId, updatedAccount, previousStats);
    await eventService.publishSocialSynced(userId, updatedAccount, previousStats);

    return updatedAccount;
};

// Remove a linked account
const removeAccount = async (accountId) => {
    const account = await prisma.socialMediaAccount.findUnique({
        where: { id: accountId }
    });

    if (!account) {
        throw new Error('Account not found');
    }

    await prisma.socialMediaAccount.delete({
        where: { id: accountId }
    });

    return true;
};

// Get analytics summary for a user
const getAnalytics = async (userId) => {
    const accounts = await prisma.socialMediaAccount.findMany({
        where: { userId },
        include: {
            snapshots: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        }
    });

    const analytics = {
        userId,
        totalAccounts: accounts.length,
        totalFollowers: accounts.reduce((sum, acc) => sum + acc.followers, 0),
        totalFollowing: accounts.reduce((sum, acc) => sum + acc.following, 0),
        totalPosts: accounts.reduce((sum, acc) => sum + acc.posts, 0),
        averageEngagement: accounts.length > 0
            ? accounts.reduce((sum, acc) => sum + (acc.engagement || 0), 0) / accounts.length
            : 0,
        platforms: accounts.map(acc => ({
            platform: acc.platform,
            username: acc.username,
            followers: acc.followers,
            engagement: acc.engagement,
            verified: acc.verified,
            lastSynced: acc.lastSynced
        })),
        reachScore: calculateReachScore(accounts),
        influencerTier: determineInfluencerTier(accounts)
    };

    return analytics;
};

// Get platform statistics (for admin/monitoring)
const getPlatformStats = async () => {
    const stats = await prisma.socialMediaAccount.groupBy({
        by: ['platform'],
        _count: {
            id: true
        },
        _sum: {
            followers: true
        },
        _avg: {
            followers: true,
            engagement: true
        }
    });

    return {
        totalAccounts: await prisma.socialMediaAccount.count(),
        platformBreakdown: stats.map(stat => ({
            platform: stat.platform,
            accountCount: stat._count.id,
            totalFollowers: stat._sum.followers || 0,
            averageFollowers: Math.round(stat._avg.followers || 0),
            averageEngagement: Math.round((stat._avg.engagement || 0) * 100) / 100
        }))
    };
};

// Helper functions
const checkEngagementThresholds = async (userId, account, previousStats) => {
    const thresholds = [1000, 5000, 10000, 25000, 50000, 100000, 500000, 1000000];

    for (const threshold of thresholds) {
        if (account.followers >= threshold && previousStats.followers < threshold) {
            await eventService.publishEngagementThreshold(userId, account, threshold);
        }
    }
};

const calculateReachScore = (accounts) => {
    // Simple reach score calculation based on total followers and engagement
    const totalFollowers = accounts.reduce((sum, acc) => sum + acc.followers, 0);
    const avgEngagement = accounts.length > 0
        ? accounts.reduce((sum, acc) => sum + (acc.engagement || 0), 0) / accounts.length
        : 0;

    return Math.round((totalFollowers * 0.7) + (avgEngagement * 1000 * 0.3));
};

const determineInfluencerTier = (accounts) => {
    const totalFollowers = accounts.reduce((sum, acc) => sum + acc.followers, 0);

    if (totalFollowers >= 1000000) return 'Mega Influencer';
    if (totalFollowers >= 100000) return 'Macro Influencer';
    if (totalFollowers >= 10000) return 'Micro Influencer';
    if (totalFollowers >= 1000) return 'Nano Influencer';
    return 'Emerging Creator';
};

module.exports = {
    linkAccount,
    getLinkedAccounts,
    syncAccount,
    removeAccount,
    getAnalytics,
    getPlatformStats,
};
