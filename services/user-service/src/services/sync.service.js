// src/services/sync.service.js
const { prisma } = require('../config/database');
const logger = require('../utils/logger');
const axios = require('axios');

/**
 * Sync user data from auth-service to user-service
 */
const syncUserFromAuthService = async (userData) => {
    try {
        // Upsert user data directly to the User table
        const userDataToUpdate = {
            id: userData.id,
            email: userData.email,
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            bio: userData.bio,
            location: userData.location,
            profilePicture: userData.profilePicture,
            coverImage: userData.coverImage,
            instagramHandle: userData.instagramHandle,
            twitterHandle: userData.twitterHandle,
            linkedinHandle: userData.linkedinHandle,
            youtubeHandle: userData.youtubeHandle,
            website: userData.website,
            contentCategories: userData.contentCategories || [],
            primaryNiche: userData.primaryNiche,
            primaryPlatform: userData.primaryPlatform,
            estimatedFollowers: userData.estimatedFollowers,
            companyName: userData.companyName,
            companyType: userData.companyType,
            industry: userData.industry,
            companyWebsite: userData.companyWebsite,
            targetAudience: userData.targetAudience || [],
            campaignTypes: userData.campaignTypes || [],
            crewSkills: userData.crewSkills || [],
            experienceLevel: userData.experienceLevel,
            equipmentOwned: userData.equipmentOwned || [],
            portfolioUrl: userData.portfolioUrl,
            hourlyRate: userData.hourlyRate,
            availability: userData.availability,
            specializations: userData.specializations || [],
            roles: userData.roles,
            status: userData.status,
            isActive: userData.isActive,
            emailVerified: userData.emailVerified,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
            lastActiveAt: userData.lastActiveAt
        };

        // Upsert user
        await prisma.user.upsert({
            where: { id: userData.id },
            update: userDataToUpdate,
            create: userDataToUpdate
        });

        // Update search score based on profile completeness
        await updateSearchScore(userData.id);

        // Clear cached user data to ensure fresh data is returned
        const userCacheService = require('./userCacheService');
        await userCacheService.invalidatePattern(`user:*:${userData.id}`);
        logger.info(`✅ [Cache] Invalidated cache for user: ${userData.id}`);

        logger.info(`User synced for user ${userData.id}`);
        return { success: true, userId: userData.id };
    } catch (error) {
        logger.error(`Error syncing user ${userData.id}:`, error);
        throw error;
    }
};

/**
 * Create user profile for a new user
 */
const createUserCache = async (userData) => {
    try {
        // For new users, we'll sync them from auth service
        await syncUserFromAuthService(userData);

        // Create initial analytics record if it doesn't exist
        try {
            await prisma.userAnalytics.upsert({
                where: { userId: userData.id },
                update: {},
                create: {
                    userId: userData.id,
                    profileViews: 0,
                    searchAppearances: 0,
                    popularityScore: 0,
                    engagementScore: 0
                }
            });
        } catch (analyticsError) {
            logger.warn(`Could not create analytics for user ${userData.id}:`, analyticsError);
            // Continue even if analytics creation fails
        }

        logger.info(`User profile created for new user ${userData.id}`);
        return { success: true, userId: userData.id };
    } catch (error) {
        logger.error(`Error creating user profile for ${userData.id}:`, error);
        throw error;
    }
};

// Deactivate user function can be added here if needed
const deactivateUserCache = async (userId) => {
    try {
        // Mark user as inactive
        await prisma.user.update({
            where: { id: userId },
            data: { isActive: false }
        });

        logger.info(`User deactivated: ${userId}`);
        return { success: true, userId };
    } catch (error) {
        logger.error(`Error deactivating user ${userId}:`, error);
        throw error;
    }
};

const reactivateUserCache = async (userId) => {
    try {
        // Mark user as active
        await prisma.user.update({
            where: { id: userId },
            data: { isActive: true }
        });
        logger.info(`User reactivated: ${userId}`);
        return { success: true, userId };
    }
    catch (error) {
        logger.error(`Error reactivating user ${userId}:`, error);
        throw error;
    }
};

/**
 * Delete user and related data
 */
const deleteUserCache = async (userId) => {
    try {
        // Check if user exists first
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            logger.info(`User ${userId} not found in user-service database, skipping deletion`);
            return { success: true, userId, message: 'User not found, no deletion needed' };
        }

        // Delete in transaction to ensure consistency
        await prisma.$transaction(async (tx) => {
            // Delete analytics if table exists
            try {
                await tx.userAnalytics.deleteMany({
                    where: { userId }
                });
            } catch (error) {
                logger.warn(`Could not delete analytics for user ${userId}:`, error);
            }

            // Delete favorites if table exists
            try {
                await tx.userFavorite.deleteMany({
                    where: {
                        OR: [
                            { userId },
                            { favoriteUserId: userId }
                        ]
                    }
                });
            } catch (error) {
                logger.warn(`Could not delete favorites for user ${userId}:`, error);
            }

            // Delete user (only if it exists)
            await tx.user.delete({
                where: { id: userId }
            });
        });

        logger.info(`User and related data deleted for user ${userId}`);
        return { success: true, userId };
    } catch (error) {
        // Handle the specific case where user doesn't exist
        if (error.code === 'P2025') {
            logger.info(`User ${userId} not found during deletion, considering it already deleted`);
            return { success: true, userId, message: 'User already deleted or not found' };
        }

        logger.error(`Error deleting user ${userId}:`, error);
        throw error;
    }
};

/**
 * Sync all users from auth-service
 */
const syncAllUsersFromAuthService = async () => {
    try {
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

        // Fetch all users from auth-service
        const response = await axios.get(`${authServiceUrl}/internal/users`, {
            headers: {
                'X-Internal-Service': 'user-service'
            }
        });

        const users = response.data.users;
        let syncedCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                await syncUserFromAuthService(user);
                syncedCount++;
            } catch (error) {
                logger.error(`Failed to sync user ${user.id}:`, error);
                errorCount++;
            }
        }

        const result = {
            totalUsers: users.length,
            syncedCount,
            errorCount,
            syncedAt: new Date().toISOString()
        };

        logger.info(`Bulk sync completed: ${syncedCount} users synced, ${errorCount} errors`);
        return result;
    } catch (error) {
        logger.error('Error during bulk sync:', error);
        throw error;
    }
};

/**
 * Sync a single user from auth-service
 */
const syncSingleUserFromAuthService = async (userId) => {
    try {
        const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

        // Fetch user from auth-service
        const response = await axios.get(`${authServiceUrl}/internal/users/${userId}`, {
            headers: {
                'X-Internal-Service': 'user-service'
            }
        });

        const user = response.data.user;
        await syncUserFromAuthService(user);

        return {
            success: true,
            userId,
            syncedAt: new Date().toISOString()
        };
    } catch (error) {
        logger.error(`Error syncing single user ${userId}:`, error);
        throw error;
    }
};

/**
 * Get sync status and health information
 */
const getSyncStatus = async () => {
    try {
        // Get user statistics
        const userStats = await prisma.user.groupBy({
            by: ['roles', 'status'],
            _count: {
                id: true
            }
        });

        // Get user activity info
        const oldestUser = await prisma.user.findFirst({
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true, id: true }
        });

        const newestUser = await prisma.user.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true, id: true }
        });

        // Get analytics coverage
        const totalUsers = await prisma.user.count();
        const usersWithAnalytics = await prisma.userAnalytics.count();

        return {
            userStatistics: userStats,
            userActivity: {
                oldestUser: oldestUser?.createdAt,
                newestUser: newestUser?.createdAt,
                totalUsers
            },
            analyticsCoverage: {
                totalUsers,
                usersWithAnalytics,
                coveragePercentage: totalUsers > 0 ? Math.round((usersWithAnalytics / totalUsers) * 100) : 0
            },
            lastChecked: new Date().toISOString()
        };
    } catch (error) {
        logger.error('Error getting sync status:', error);
        throw error;
    }
};

/**
 * Update search score based on profile completeness and activity
 */
const updateSearchScore = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        const analytics = await prisma.userAnalytics.findUnique({
            where: { userId }
        });

        if (!user) return;

        let score = 0;

        // Profile completeness (40 points max)
        if (user.profilePicture) score += 8;
        if (user.bio && user.bio.length > 20) score += 12;
        if (user.location) score += 5;
        if (user.website) score += 5;

        // roles-specific completeness (30 points max)
        if (Array.isArray(user.roles) && user.roles.includes('INFLUENCER')) {
            if (user.primaryNiche) score += 10;
            if (user.primaryPlatform) score += 8;
            if (user.contentCategories?.length > 0) score += 7;
            if (user.estimatedFollowers) score += 5;
        } else if (Array.isArray(user.roles) && user.roles.includes('BRAND')) {
            if (user.companyName) score += 10;
            if (user.industry) score += 10;
            if (user.companyType) score += 5;
            if (user.targetAudience?.length > 0) score += 5;
        } else if (Array.isArray(user.roles) && user.roles.includes('CREW')) {
            if (user.crewSkills?.length > 0) score += 10;
            if (user.experienceLevel) score += 8;
            if (user.portfolioUrl) score += 7;
            if (user.hourlyRate) score += 5;
        }

        // Activity and engagement (30 points max)
        if (analytics) {
            const viewsScore = Math.min(analytics.profileViews / 10, 10); // Max 10 points
            const searchScore = Math.min(analytics.searchAppearances / 5, 10); // Max 10 points
            const popularityScore = analytics.popularityScore * 10; // Max 10 points

            score += viewsScore + searchScore + popularityScore;
        }

        // Recent activity bonus (max 100 total)
        const daysSinceLastActive = user.lastActiveAt ?
            (Date.now() - new Date(user.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24) : 30;

        if (daysSinceLastActive <= 1) score *= 1.0;
        else if (daysSinceLastActive <= 7) score *= 0.9;
        else if (daysSinceLastActive <= 30) score *= 0.7;
        else score *= 0.5;

        // Normalize to 0-1 scale
        const normalizedScore = Math.min(score / 100, 1);

        // Note: We don't have a searchScore field in the User model yet
        // For now, we'll just log the score. You can add this field to the schema later
        logger.info(`Search score calculated for user ${userId}: ${normalizedScore}`);

    } catch (error) {
        logger.error(`Error updating search score for user ${userId}:`, error);
    }
};

/**
 * Sync users by roles
 */
const syncUsersByroles = async (roles) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                roles: { has: roles }
            },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                bio: true,
                location: true,
                profilePicture: true,
                coverImage: true,
                instagramHandle: true,
                twitterHandle: true,
                linkedinHandle: true,
                youtubeHandle: true,
                website: true,
                contentCategories: true,
                primaryNiche: true,
                primaryPlatform: true,
                estimatedFollowers: true,
                companyName: true,
                companyType: true,
                industry: true,
                companyWebsite: true,
                targetAudience: true,
                campaignTypes: true,
                crewSkills: true,
                experienceLevel: true,
                equipmentOwned: true,
                portfolioUrl: true,
                hourlyRate: true,
                availability: true,
                specializations: true,
                roles: true,
                status: true,
                isActive: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
                lastActiveAt: true,
                lastSyncAt: true
            }
        });

        let syncedCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                await syncUserFromAuthService(user);
                syncedCount++;
            } catch (error) {
                logger.error(`Failed to sync user ${user.id}:`, error);
                errorCount++;
            }
        }

        const result = {
            totalUsers: users.length,
            syncedCount,
            errorCount,
            syncedAt: new Date().toISOString()
        };

        logger.info(`roles-based sync completed for ${roles}: ${syncedCount} users synced, ${errorCount} errors`);
        return result;
    } catch (error) {
        logger.error(`Error during roles-based sync for ${roles}:`, error);
        throw error;
    }
};

/**
 * Sync email verification status from auth-service
 */
const syncEmailVerification = async (userId, verificationData) => {
    try {
        logger.info(`Syncing email verification for user: ${userId}`);

        // Update user's email verification status
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                emailVerified: verificationData.emailVerified,
                emailVerifiedAt: verificationData.emailVerifiedAt ? new Date(verificationData.emailVerifiedAt) : null,
                updatedAt: new Date()
            }
        });

        // Clear cached user data to ensure fresh data is returned
        const userCacheService = require('./userCacheService');
        await userCacheService.invalidatePattern(`user:*:${userId}`);
        await userCacheService.invalidatePattern(`user:profile:${userId}`);

        logger.info(`✅ [Cache] Invalidated cache for user: ${userId}`);

        logger.info(`Email verification synced successfully for user: ${userId}`);
        return {
            success: true,
            user: updatedUser,
            message: 'Email verification status updated successfully'
        };
    } catch (error) {
        logger.error(`Error syncing email verification for user ${userId}:`, error);
        throw error;
    }
};

/**
 * Sync username update from auth-service
 */
const syncUsernameUpdate = async (userId, usernameData) => {
    try {
        logger.info(`Syncing username update for user: ${userId}`);

        // Update user's username
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                username: usernameData.username,
                lastUsernameUpdated: usernameData.lastUsernameUpdated ? new Date(usernameData.lastUsernameUpdated) : null,
                updatedAt: new Date()
            }
        });

        // Clear cached user data to ensure fresh data is returned
        const userCacheService = require('./userCacheService');
        await userCacheService.invalidatePattern(`user:*:${userId}`);
        await userCacheService.invalidatePattern(`user:profile:${userId}`);
        logger.info(`✅ [Cache] Invalidated cache for user after username update: ${userId}`);

        logger.info(`Username synced successfully for user: ${userId}`);
        return {
            success: true,
            user: updatedUser,
            message: 'Username updated successfully'
        };
    } catch (error) {
        logger.error(`Error syncing username update for user ${userId}:`, error);
        throw error;
    }
};

/**
 * Sync email update from auth-service
 */
const syncEmailUpdate = async (userId, emailData) => {
    try {
        logger.info(`Syncing email update for user: ${userId}`);

        // Update user's email and verification status
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                email: emailData.email,
                emailVerified: emailData.emailVerified,
                emailVerifiedAt: emailData.emailVerifiedAt ? new Date(emailData.emailVerifiedAt) : null,
                updatedAt: new Date()
            }
        });

        // Clear cached user data to ensure fresh data is returned
        const userCacheService = require('./userCacheService');
        await userCacheService.invalidatePattern(`user:*:${userId}`);
        await userCacheService.invalidatePattern(`user:profile:${userId}`);
        logger.info(`✅ [Cache] Invalidated cache for user after email update: ${userId}`);

        logger.info(`Email synced successfully for user: ${userId}`);
        return {
            success: true,
            user: updatedUser,
            message: 'Email updated successfully'
        };
    } catch (error) {
        logger.error(`Error syncing email update for user ${userId}:`, error);
        throw error;
    }
};

module.exports = {
    syncUserFromAuthService,
    createUserCache,
    deleteUserCache,
    deactivateUserCache,
    reactivateUserCache,
    syncAllUsersFromAuthService,
    syncSingleUserFromAuthService,
    getSyncStatus,
    updateSearchScore,
    syncUsersByroles,
    syncEmailVerification,
    syncUsernameUpdate,
    syncEmailUpdate
};
