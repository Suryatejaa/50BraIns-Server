// src/services/search.service.js
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Search users with name/username filtering
 */
const searchUsers = async ({ query, page = 1, limit = 10 }) => {
    try {
        const skip = (page - 1) * limit;
        const where = {
            isActive: true,
            // emailVerified: true
        };

        // Add name/username search if query provided
        if (query && query.trim()) {
            where.OR = [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { username: { contains: query, mode: 'insensitive' } }
            ];
        }

        // Debug: log the final where filter
        logger.info('Prisma user search filter', { where });

        // Count total
        const total = await prisma.user.count({ where });

        // Get users
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                profilePicture: true,
                bio: true,
                location: true,
                roles: true,
                createdAt: true
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        return { users, total };
    } catch (error) {
        logger.error('Error searching users:', error);
        throw error;
    }
};

/**
 * Search influencers with filtering
 */
const searchInfluencers = async ({
    query,
    primaryNiche,
    primaryPlatform,
    contentCategories,
    location,
    followersMin,
    followersMax,
    page = 1,
    limit = 10
}) => {
    try {
        const skip = (page - 1) * limit;
        const where = { roles: { has: 'INFLUENCER' }, isActive: true, emailVerified: true };

        // Add filters
        if (query) {
            where.OR = [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { username: { contains: query, mode: 'insensitive' } },
                { bio: { contains: query, mode: 'insensitive' } }
            ];
        }

        if (primaryNiche) {
            where.primaryNiche = { equals: primaryNiche, mode: 'insensitive' };
        }

        if (primaryPlatform) {
            where.primaryPlatform = { equals: primaryPlatform, mode: 'insensitive' };
        }

        if (contentCategories && contentCategories.length > 0) {
            where.contentCategories = { hasSome: contentCategories };
        }

        if (location) {
            where.location = { contains: location, mode: 'insensitive' };
        }

        if (followersMin !== undefined) {
            where.estimatedFollowers = { gte: followersMin };
        }

        if (followersMax !== undefined) {
            if (where.estimatedFollowers) {
                where.estimatedFollowers.lte = followersMax;
            } else {
                where.estimatedFollowers = { lte: followersMax };
            }
        }

        // Count total
        const total = await prisma.user.count({ where });

        // Get influencers
        const influencers = await prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                profilePicture: true,
                bio: true,
                location: true,
                contentCategories: true,
                primaryNiche: true,
                primaryPlatform: true,
                instagramHandle: true,
                twitterHandle: true,
                youtubeHandle: true,
                linkedinHandle: true,
                website: true,
                createdAt: true
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        return { influencers, total };
    } catch (error) {
        logger.error('Error searching influencers:', error);
        throw error;
    }
};

/**
 * Search brands with filtering
 */
const searchBrands = async ({
    query,
    industry,
    companyType,
    location,
    page = 1,
    limit = 10
}) => {
    try {
        const skip = (page - 1) * limit;
        const where = { roles: { has: 'BRAND' }, isActive: true, emailVerified: true };

        // Add filters
        if (query) {
            where.OR = [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { companyName: { contains: query, mode: 'insensitive' } },
                { bio: { contains: query, mode: 'insensitive' } }
            ];
        }

        if (industry) {
            where.industry = { equals: industry, mode: 'insensitive' };
        }

        if (companyType) {
            where.companyType = { equals: companyType, mode: 'insensitive' };
        }

        if (location) {
            where.location = { contains: location, mode: 'insensitive' };
        }

        // Count total
        const total = await prisma.user.count({ where });

        // Get brands
        const brands = await prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                profilePicture: true,
                bio: true,
                location: true,
                companyName: true,
                companyType: true,
                industry: true,
                companyWebsite: true,
                instagramHandle: true,
                linkedinHandle: true,
                createdAt: true
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        return { brands, total };
    } catch (error) {
        logger.error('Error searching brands:', error);
        throw error;
    }
};

/**
 * Search crew members with filtering
 */
const searchCrew = async ({
    query,
    experienceLevel,
    availability,
    workStyle,
    skills,
    location,
    hourlyRateMin,
    hourlyRateMax,
    page = 1,
    limit = 10
}) => {
    try {
        const skip = (page - 1) * limit;
        const where = { roles: { has: 'CREW' }, isActive: true, emailVerified: true };

        // Add filters
        if (query) {
            where.OR = [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { username: { contains: query, mode: 'insensitive' } },
                { bio: { contains: query, mode: 'insensitive' } }
            ];
        }

        if (experienceLevel) {
            where.experienceLevel = { equals: experienceLevel, mode: 'insensitive' };
        }

        if (availability) {
            where.availability = { equals: availability, mode: 'insensitive' };
        }

        if (workStyle) {
            where.workStyle = { equals: workStyle, mode: 'insensitive' };
        }

        if (skills && skills.length > 0) {
            where.crewSkills = { hasSome: skills };
        }

        if (location) {
            where.location = { contains: location, mode: 'insensitive' };
        }

        if (hourlyRateMin !== undefined) {
            where.hourlyRate = { gte: hourlyRateMin };
        }

        if (hourlyRateMax !== undefined) {
            if (where.hourlyRate) {
                where.hourlyRate.lte = hourlyRateMax;
            } else {
                where.hourlyRate = { lte: hourlyRateMax };
            }
        }

        // Count total
        const total = await prisma.user.count({ where });

        // Get crew members
        const crew = await prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                profilePicture: true,
                bio: true,
                location: true,
                crewSkills: true,
                experienceLevel: true,
                equipmentOwned: true,
                portfolioUrl: true,
                hourlyRate: true,
                availability: true,
                workStyle: true,
                specializations: true,
                createdAt: true
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        return { crew, total };
    } catch (error) {
        logger.error('Error searching crew members:', error);
        throw error;
    }
};

module.exports = {
    searchUsers
};
