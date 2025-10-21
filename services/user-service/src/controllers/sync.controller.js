// src/controllers/sync.controller.js
const syncService = require('../services/sync.service');
const logger = require('../utils/logger');
const { StatusCodes } = require('http-status-codes');

/**
 * Handle user update notification from auth-service
 */
const handleUserUpdate = async (req, res) => {
    try {
        const userData = req.body;

        // Validate required fields
        if (!userData.id) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                error: 'User ID is required'
            });
        }

        await syncService.syncUserFromAuthService(userData);

        logger.info(`User cache updated for user ${userData.id}`);

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'User cache updated successfully'
        });
    } catch (error) {
        logger.error('Error handling user update:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to update user cache'
        });
    }
};

/**
 * Handle user creation notification from auth-service
 */
const handleUserCreate = async (req, res) => {
    try {
        const userData = req.body;

        if (!userData.id) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                error: 'User ID is required'
            });
        }

        await syncService.createUserCache(userData);

        logger.info(`User cache created for new user ${userData.id}`);

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'User cache created successfully'
        });
    } catch (error) {
        logger.error('Error handling user creation:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to create user cache'
        });
    }
};

/**
 * Handle user deletion notification from auth-service
 */
const handleUserDelete = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                error: 'User ID is required'
            });
        }

        await syncService.deleteUserCache(userId);

        logger.info(`User cache deleted for user ${userId}`);

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'User cache deleted successfully'
        });
    } catch (error) {
        logger.error('Error handling user deletion:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to delete user cache'
        });
    }
};

/**
 * Manually sync all users from auth-service (admin only)
 */
const syncAllUsers = async (req, res) => {
    try {
        const result = await syncService.syncAllUsersFromAuthService();

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'All users synced successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error syncing all users:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to sync all users'
        });
    }
};

/**
 * Manually sync a single user from auth-service (admin only)
 */
const syncSingleUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await syncService.syncSingleUserFromAuthService(userId);

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'User synced successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error syncing single user:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to sync user'
        });
    }
};

/**
 * Get sync status and health information
 */
const getSyncStatus = async (req, res) => {
    try {
        const status = await syncService.getSyncStatus();

        res.status(StatusCodes.OK).json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Error getting sync status:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to get sync status'
        });
    }
};

module.exports = {
    handleUserUpdate,
    handleUserCreate,
    handleUserDelete,
    syncAllUsers,
    syncSingleUser,
    getSyncStatus
};
