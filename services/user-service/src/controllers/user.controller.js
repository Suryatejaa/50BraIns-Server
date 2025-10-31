// src/controllers/user.controller.js
const { StatusCodes } = require('http-status-codes');
const userService = require('../services/user.service');
const userCacheService = require('../services/userCacheService');
const DatabaseOptimizer = require('../utils/databaseOptimizer');
const { BadRequestError, NotFoundError } = require('../middleware/error-handler');
const logger = require('../utils/logger');

/**
 * Get current user profile
 */
const getCurrentUser = DatabaseOptimizer.withPerformanceMonitoring(
    'getCurrentUser',
    async (req, res) => {
        const userId = req.user.id;
        logger.info(`Getting profile for user: ${userId}`);

        const user = await userCacheService.getEntity(
            `user:profile:${userId}`,
            async () => {
                return await userService.getUserByIdOptimized(userId, true);
            },
            600 // 10 minutes cache
        );

        if (!user) {
            throw new NotFoundError('User not found');
        }

        const cleanedUser = DatabaseOptimizer.cleanResponse(user);

        res.status(StatusCodes.OK).json({
            success: true,
            data: {
                user: cleanedUser
            }
        });
    }
);

/**
 * Update user profile
 */
const updateUserProfile = async (req, res) => {
    const userId = req.user.id;
    const updateData = req.body;

    logger.info(`Updating profile for user: ${userId}`);

    // Prevent updating sensitive fields
    delete updateData.password;
    delete updateData.email;
    delete updateData.roles;
    delete updateData.status;
    delete updateData.isActive;

    const updatedUser = await userService.updateUser(userId, updateData);

    // Clear cached user data to ensure fresh data is returned
    await userCacheService.invalidatePattern(`user:*:${userId}`);
    logger.info(`✅ [Cache] Invalidated cache for user: ${userId}`);

    res.status(StatusCodes.OK).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            user: updatedUser
        }
    });
};

/**
 * Update user profile picture
 */
const updateProfilePicture = async (req, res) => {
    const userId = req.user.id;
    const { profilePicture } = req.body;

    if (!profilePicture) {
        throw new BadRequestError('Profile picture URL is required');
    }

    logger.info(`Updating profile picture for user: ${userId}`);

    const updatedUser = await userService.updateUser(userId, { profilePicture });

    // Clear cached user data to ensure fresh data is returned
    await userCacheService.invalidatePattern(`user:*:${userId}`);
    logger.info(`✅ [Cache] Invalidated cache for user: ${userId}`);

    res.status(StatusCodes.OK).json({
        success: true,
        message: 'Profile picture updated successfully',
        data: {
            profilePicture: updatedUser.profilePicture
        }
    });
};

const getUserById = DatabaseOptimizer.withPerformanceMonitoring(
    'getUserById',
    async (req, res) => {
        try {
            const userId = req.params.userId;

            const user = await userCacheService.getEntity(
                `user:public:${userId}`,
                async () => {
                    return await userService.getUserByIdOptimized(userId, false);
                },
                300 // 5 minutes cache for public profiles
            );

            if (!user) {
                return res.status(404).json({ success: false, error: 'User not found' });
            }

            // Return optimized public fields
            const publicUser = DatabaseOptimizer.cleanResponse({
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                companyName: user.companyName,
                profilePicture: user.profilePicture,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt
            });

            res.status(200).json({ success: true, data: { user: publicUser } });
        } catch (error) {
            logger.error('Get user by ID error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
);

/**
 * Get multiple users by IDs (for internal service calls)
 */
const getUsersByIds = async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'userIds array is required and cannot be empty'
            });
        }

        if (userIds.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 100 user IDs allowed per request'
            });
        }

        logger.info(`Fetching ${userIds.length} users for batch request`);

        const users = await userService.getUsersByIds(userIds);

        res.status(200).json({
            success: true,
            data: {
                users,
                count: users.length,
                requested: userIds.length
            }
        });
    } catch (error) {
        logger.error('Get users by IDs error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

/**
 * Update social media handles
 */
const updateSocialHandles = async (req, res) => {
    const userId = req.user.id;
    const { instagramHandle, twitterHandle, linkedinHandle, youtubeHandle, website } = req.body;

    logger.info(`Updating social handles for user: ${userId}`);

    const updatedUser = await userService.updateUser(userId, {
        instagramHandle,
        twitterHandle,
        linkedinHandle,
        youtubeHandle,
        website
    });

    // Clear cached user data to ensure fresh data is returned
    await userCacheService.invalidatePattern(`user:*:${userId}`);
    logger.info(`✅ [Cache] Invalidated cache for user: ${userId}`);

    res.status(StatusCodes.OK).json({
        success: true,
        message: 'Social media handles updated successfully',
        data: {
            instagramHandle: updatedUser.instagramHandle,
            twitterHandle: updatedUser.twitterHandle,
            linkedinHandle: updatedUser.linkedinHandle,
            youtubeHandle: updatedUser.youtubeHandle
        }
    });
};

/**
 * Update roles-specific information
 */
const updaterolesInfo = async (req, res) => {
    const userId = req.user.id;
    const user = await userService.getUserById(userId);

    if (!user) {
        throw new NotFoundError('User not found');
    }

    const { roles } = user;
    const updateData = req.body;

    logger.info(`Updating ${roles}-specific info for user: ${userId}`);

    // Apply validations based on roles
    const updatedUser = await userService.updaterolespecificInfo(userId, roles, updateData);

    res.status(StatusCodes.OK).json({
        success: true,
        message: `${roles} information updated successfully`,
        data: {
            user: updatedUser
        }
    });
};

/**
 * Get user settings
 */
const getUserSettings = async (req, res) => {
    const userId = req.user.id;
    logger.info(`Getting settings for user: ${userId}`);

    const settings = await userService.getUserSettings(userId);

    res.status(StatusCodes.OK).json({
        success: true,
        data: {
            settings
        }
    });
};

/**
 * Update user settings
 */
const updateUserSettings = async (req, res) => {
    const userId = req.user.id;
    const settingsData = req.body;

    logger.info(`Updating settings for user: ${userId}`);

    const updatedSettings = await userService.updateUserSettings(userId, settingsData);

    res.status(StatusCodes.OK).json({
        success: true,
        message: 'Settings updated successfully',
        data: {
            settings: updatedSettings
        }
    });
};

/**
 * Toggle show contact setting
 */
const toggleShowContact = async (req, res) => {
    const userId = req.user.id;

    logger.info(`Toggling show contact for user: ${userId}`);

    const updatedUser = await userService.toggleShowContact(userId);

    res.status(StatusCodes.OK).json({
        success: true,
        message: `Contact visibility ${updatedUser.showContact ? 'enabled' : 'disabled'} successfully`,
        data: {
            showContact: updatedUser.showContact
        }
    });
};

module.exports = {
    getCurrentUser,
    updateUserProfile,
    updateProfilePicture,
    updateSocialHandles,
    updaterolesInfo,
    getUserById,
    getUsersByIds,
    getUserSettings,
    updateUserSettings,
    toggleShowContact
};
