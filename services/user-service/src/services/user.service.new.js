// src/services/user.service.js - REBUILT CLEAN VERSION
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get public user profile
 */
const getPublicUserProfile = async (userId) => {
    try {
        logger.info(`Fetching public profile for user: ${userId}`);

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            logger.warn(`User not found: ${userId}`);
            return null;
        }

        // Return only public fields
        const publicProfile = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            profilePicture: user.profilePicture,
            coverImage: user.coverImage,
            bio: user.bio,
            location: user.location,
            roles: user.roles,
            instagramHandle: user.instagramHandle,
            twitterHandle: user.twitterHandle,
            linkedinHandle: user.linkedinHandle,
            youtubeHandle: user.youtubeHandle,
            website: user.website,
            createdAt: user.createdAt
        };

        logger.info(`Successfully fetched public profile for user: ${userId}`);
        return publicProfile;
    } catch (error) {
        logger.error(`Error getting public user profile: ${userId}`, error);
        throw error;
    }
};

/**
 * Get public influencer profile
 */
const getPublicInfluencerProfile = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
                roles: 'INFLUENCER'
            }
        });

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            profilePicture: user.profilePicture,
            coverImage: user.coverImage,
            bio: user.bio,
            location: user.location,
            instagramHandle: user.instagramHandle,
            twitterHandle: user.twitterHandle,
            linkedinHandle: user.linkedinHandle,
            youtubeHandle: user.youtubeHandle,
            website: user.website,
            contentCategories: user.contentCategories,
            primaryNiche: user.primaryNiche,
            primaryPlatform: user.primaryPlatform,
            estimatedFollowers: user.estimatedFollowers,
            createdAt: user.createdAt
        };
    } catch (error) {
        logger.error(`Error getting public influencer profile: ${userId}`, error);
        throw error;
    }
};

/**
 * Get public brand profile
 */
const getPublicBrandProfile = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
                roles: 'BRAND'
            }
        });

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            profilePicture: user.profilePicture,
            coverImage: user.coverImage,
            bio: user.bio,
            location: user.location,
            companyName: user.companyName,
            companyType: user.companyType,
            industry: user.industry,
            companyWebsite: user.companyWebsite,
            instagramHandle: user.instagramHandle,
            twitterHandle: user.twitterHandle,
            linkedinHandle: user.linkedinHandle,
            youtubeHandle: user.youtubeHandle,
            website: user.website,
            targetAudience: user.targetAudience,
            campaignTypes: user.campaignTypes,
            createdAt: user.createdAt
        };
    } catch (error) {
        logger.error(`Error getting public brand profile: ${userId}`, error);
        throw error;
    }
};

/**
 * Get public crew profile
 */
const getPublicCrewProfile = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
                roles: 'CREW'
            }
        });

        if (!user) {
            return null;
        }

        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            profilePicture: user.profilePicture,
            coverImage: user.coverImage,
            bio: user.bio,
            location: user.location,
            crewSkills: user.crewSkills,
            experienceLevel: user.experienceLevel,
            equipmentOwned: user.equipmentOwned,
            portfolioUrl: user.portfolioUrl,
            hourlyRate: user.hourlyRate,
            availability: user.availability,
            specializations: user.specializations,
            instagramHandle: user.instagramHandle,
            twitterHandle: user.twitterHandle,
            linkedinHandle: user.linkedinHandle,
            youtubeHandle: user.youtubeHandle,
            website: user.website,
            createdAt: user.createdAt
        };
    } catch (error) {
        logger.error(`Error getting public crew profile: ${userId}`, error);
        throw error;
    }
};

module.exports = {
    getPublicUserProfile,
    getPublicInfluencerProfile,
    getPublicBrandProfile,
    getPublicCrewProfile
};
