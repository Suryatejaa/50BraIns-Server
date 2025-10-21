// src/controllers/public.controller.js
const { StatusCodes } = require('http-status-codes');
const userService = require('../services/user.service');
const { NotFoundError, BadRequestError } = require('../middleware/error-handler');
const logger = require('../utils/logger');

/**
 * Get public user profile
 */
const getPublicUserProfile = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        throw new BadRequestError('User ID is required');
    }

    logger.info(`Getting public profile for user: ${userId}`);

    const user = await userService.getPublicUserProfile(userId);
    if (!user) {
        throw new NotFoundError('User not found');
    }

    res.status(StatusCodes.OK).json({
        success: true,
        data: {
            user
        }
    });
};

/**
 * Get public influencer profile
 */
const getPublicInfluencerProfile = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        throw new BadRequestError('User ID is required');
    }

    logger.info(`Getting public influencer profile for user: ${userId}`);

    const influencer = await userService.getPublicInfluencerProfile(userId);
    if (!influencer) {
        throw new NotFoundError('Influencer not found');
    }

    res.status(StatusCodes.OK).json({
        success: true,
        data: {
            influencer
        }
    });
};

/**
 * Get public brand profile
 */
const getPublicBrandProfile = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        throw new BadRequestError('User ID is required');
    }

    logger.info(`Getting public brand profile for user: ${userId}`);

    const brand = await userService.getPublicBrandProfile(userId);
    if (!brand) {
        throw new NotFoundError('Brand not found');
    }

    res.status(StatusCodes.OK).json({
        success: true,
        data: {
            brand
        }
    });
};

/**
 * Get public crew profile
 */
const getPublicCrewProfile = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        throw new BadRequestError('User ID is required');
    }

    logger.info(`Getting public crew profile for user: ${userId}`);

    const crew = await userService.getPublicCrewProfile(userId);
    if (!crew) {
        throw new NotFoundError('Crew member not found');
    }

    res.status(StatusCodes.OK).json({
        success: true,
        data: {
            crew
        }
    });
};

/**
 * Get public platform statistics
 */
const getPublicStats = async (req, res) => {
    try {
        const stats = await userService.getPublicStats();

        res.status(StatusCodes.OK).json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting public stats:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to fetch public statistics'
        });
    }
};

module.exports = {
    getPublicUserProfile,
    getPublicInfluencerProfile,
    getPublicBrandProfile,
    getPublicCrewProfile,
    getPublicStats,
    /**
     * Batch resolve users by identifiers
     */
    async resolveUsers(req, res) {
        const { identifiers } = req.body || {};
        if (!Array.isArray(identifiers) || identifiers.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: 'identifiers array is required' });
        }
        const results = await userService.resolveUsers(identifiers.slice(0, 50)); // cap to 50 per call
        res.status(StatusCodes.OK).json({ success: true, data: { results } });
    },

    /**
     * Internal: batch get users by IDs (minimal fields, for internal services)
     */
    async getUsersByIdsInternal(req, res) {
        const { userIds } = req.body || {};
        console.log('userIds', req.body);
        if (!Array.isArray(userIds) || userIds.length === 0) {
            console.log('userIds array is required');
            return res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: 'userIds array is required' });
        }
        const users = await userService.getUsersByIdsMinimal(userIds.slice(0, 200));
        res.status(StatusCodes.OK).json({ success: true, data: users });
    }
};
