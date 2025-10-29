// src/services/search.service.js
const { prisma } = require('../config/database');
const DatabaseOptimizer = require('../utils/databaseOptimizer');
const logger = require('../utils/logger');
const axios = require('axios');

const REPUTATION_SERVICE_URL = process.env.REPUTATION_SERVICE_URL || 'http://localhost:4006';

/**
 * Search users with name/username filtering and reputation data
 */
const searchUsers = async ({
    query,
    page = 1,
    limit = 10,
    sortBy = 'score',
    sortOrder = 'desc',
    roles,
    location,
    verified,
    active = true,
    minScore,
    maxScore,
    tier
}) => {
    try {
        const skip = (page - 1) * limit;
        const where = {
            isActive: active === true || active === 'true'
        };

        // Add roles filter
        if (roles) {
            const rolesArray = Array.isArray(roles) ? roles : roles.split(',');
            where.roles = { hasSome: rolesArray.map(r => r.toUpperCase()) };
        }

        // Add location filter
        if (location) {
            where.location = { contains: location, mode: 'insensitive' };
        }

        // Add verified filter
        if (verified !== undefined) {
            where.emailVerified = verified === 'true' || verified === true;
        }

        // Add name/username search if query provided
        if (query && query.trim()) {
            where.OR = [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { username: { contains: query, mode: 'insensitive' } },
                { bio: { contains: query, mode: 'insensitive' } }
            ];
        }

        // Handle sorting
        let orderBy = {};
        switch (sortBy) {
            case 'alphabetical':
                orderBy = { username: sortOrder };
                break;
            case 'date':
                orderBy = { createdAt: sortOrder };
                break;
            case 'activity':
                orderBy = { lastActiveAt: sortOrder };
                break;
            case 'relevance':
                orderBy = { updatedAt: sortOrder };
                break;
            case 'score':
            default:
                orderBy = { createdAt: 'desc' }; // Will sort by reputation later
                break;
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
                username: true,
                firstName: true,
                lastName: true,
                email: true,
                profilePicture: true,
                bio: true,
                location: true,
                roles: true,
                isActive: true,
                emailVerified: true,
                createdAt: true,
                lastActiveAt: true,
                _count: {
                    select: {
                        refreshTokens: true,
                        equipment: true
                    }
                }
            },
            skip,
            take: limit,
            orderBy
        });

        // Fetch reputation data for all users
        let enrichedUsers = users;
        try {
            // Get reputation data for all users
            const userIds = users.map(user => user.id);
            const reputationPromises = userIds.map(async (userId) => {
                try {
                    const response = await axios.get(`${REPUTATION_SERVICE_URL}/api/reputation/${userId}`, {
                        timeout: 3000
                    });
                    return response.data.success ? response.data.data : null;
                } catch (error) {
                    logger.warn(`Failed to fetch reputation for user ${userId}:`, error.message);
                    return null;
                }
            });

            const reputationData = await Promise.all(reputationPromises);
            const reputationMap = {};

            reputationData.forEach((rep, index) => {
                if (rep) {
                    reputationMap[userIds[index]] = rep;
                }
            });

            // Enrich users with reputation data
            enrichedUsers = users.map(user => ({
                ...user,
                reputation: reputationMap[user.id] || {
                    finalScore: 0,
                    tier: 'BRONZE',
                    badges: [],
                    ranking: { global: null, tier: null }
                }
            }));

            // Apply reputation-based filters
            enrichedUsers = enrichedUsers.filter(user => {
                if (minScore && user.reputation.finalScore < parseFloat(minScore)) return false;
                if (maxScore && user.reputation.finalScore > parseFloat(maxScore)) return false;
                if (tier && user.reputation.tier !== tier.toUpperCase()) return false;
                return true;
            });

            // Sort by score if requested
            if (sortBy === 'score') {
                enrichedUsers.sort((a, b) => {
                    const scoreA = a.reputation.finalScore || 0;
                    const scoreB = b.reputation.finalScore || 0;
                    return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
                });
            }

        } catch (error) {
            logger.error('Error fetching reputation data for search:', error);
            // Continue without reputation data
        }

        // Format response with ranks
        const formattedUsers = enrichedUsers.map((user, index) => ({
            rank: skip + index + 1, // Calculate rank based on pagination
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName} ${user.lastName}`.trim(),
            profilePicture: user.profilePicture,
            bio: user.bio,
            location: user.location,
            roles: user.roles,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            lastActiveAt: user.lastActiveAt,
            tokenCount: user._count?.refreshTokens || 0,
            equipmentCount: user._count?.equipment || 0,
            reputation: user.reputation || {
                finalScore: 0,
                tier: 'BRONZE',
                badges: [],
                ranking: { global: null, tier: null }
            }
        }));

        return {
            users: formattedUsers,
            total,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
                hasNext: skip + parseInt(limit) < total,
                hasPrev: parseInt(page) > 1
            },
            filters: {
                query,
                sortBy,
                sortOrder,
                roles: roles?.split(',') || [],
                location,
                verified,
                active,
                minScore,
                maxScore,
                tier
            }
        };
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
    searchUsers,

    /**
     * Optimized search users with better performance
     */
    searchUsersOptimized: async ({
        query,
        page = 1,
        limit = 10,
        sortBy = 'lastActivityAt',
        sortOrder = 'desc',
        roles,
        location,
        verified,
        active = true
    }) => {
        try {
            // Optimize pagination
            const pagination = DatabaseOptimizer.optimizePagination(page, limit, 50);

            const where = {
                isActive: active === true || active === 'true'
            };

            // Add roles filter
            if (roles) {
                const rolesArray = Array.isArray(roles) ? roles : roles.split(',');
                where.roles = { hasSome: rolesArray.map(r => r.toUpperCase()) };
            }

            // Add location filter with optimized search
            if (location) {
                where.location = { contains: location, mode: 'insensitive' };
            }

            // Add verified filter
            if (verified !== undefined) {
                where.emailVerified = verified === 'true' || verified === true;
            }

            // Add optimized search query
            if (query && query.trim()) {
                Object.assign(where, DatabaseOptimizer.createSearchWhere(query));
            }

            // Get optimized ordering
            const orderBy = DatabaseOptimizer.getOptimizedOrdering(sortBy, sortOrder);

            // Count total with optimized query
            const total = await prisma.user.count({ where });

            // Get users with optimized field selection
            const users = await prisma.user.findMany({
                where,
                select: DatabaseOptimizer.getSearchFields(),
                skip: pagination.skip,
                take: pagination.take,
                orderBy
            });

            // Format response with minimal data
            const formattedUsers = users.map((user, index) => ({
                rank: pagination.skip + index + 1,
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                companyName: user.companyName,
                profilePicture: user.profilePicture,
                roles: user.roles,
                emailVerified: user.emailVerified
            }));

            return {
                users: formattedUsers,
                total,
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total,
                    totalPages: Math.ceil(total / pagination.limit),
                    hasNext: pagination.skip + pagination.limit < total,
                    hasPrev: pagination.page > 1
                }
            };
        } catch (error) {
            logger.error('Error in optimized user search:', error);
            throw error;
        }
    }
};
