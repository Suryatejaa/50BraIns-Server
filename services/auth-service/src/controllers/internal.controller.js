const { prisma } = require('../config/database');
const logger = require('../utils/logger');
const { StatusCodes } = require('http-status-codes');

/**
 * Get all users (for internal service sync)
 */
const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
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
                lastActiveAt: true
            }
        });

        logger.info(`Internal API: Retrieved ${users.length} users for sync`);

        res.status(StatusCodes.OK).json({
            success: true,
            users,
            total: users.length
        });
    } catch (error) {
        logger.error('Error retrieving users for internal sync:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to retrieve users'
        });
    }
};

/**
 * Get user by ID (for internal service sync)
 */
const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
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
                lastActiveAt: true
            }
        });

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                error: 'User not found'
            });
        }

        logger.info(`Internal API: Retrieved user ${userId} for sync`);

        res.status(StatusCodes.OK).json({
            success: true,
            user
        });
    } catch (error) {
        logger.error(`Error retrieving user ${req.params.userId} for internal sync:`, error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: 'Failed to retrieve user'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById
};