// src/services/user.service.js
const { prisma } = require('../config/database');
const { NotFoundError } = require('../middleware/error-handler');
const DatabaseOptimizer = require('../utils/databaseOptimizer');
const logger = require('../utils/logger');

/**
 * Get user by ID (read-only from shared database)
 */
const getUserById = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return null;
        }

        // Remove sensitive information for user-servic
        delete user.password;
        delete user.passwordResetToken;
        delete user.passwordResetExpires;
        delete user.emailVerificationToken;
        delete user.twoFactorSecret;

        return user;
    } catch (error) {
        logger.error(`Error getting user by ID: ${userId}`, error);
        throw error;
    }
};

/**
 * Optimized getUserById with field selection for better performance
 */
const getUserByIdOptimized = async (userId, includePrivate = false) => {
    try {
        const fields = includePrivate ?
            DatabaseOptimizer.getOptimizedUserFields(true) :
            DatabaseOptimizer.getOptimizedUserFields(false);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: fields
        });

        return user;
    } catch (error) {
        logger.error(`Error getting user by ID optimized: ${userId}`, error);
        throw error;
    }
};

/**
 * Get multiple users by IDs (for batch operations)
 */
const getUsersByIds = async (userIds) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                id: { in: userIds }
            },
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                companyName: true,
                profilePicture: true,
                emailVerified: true,
                roles: true,
                status: true
            }
        });

        logger.info(`Retrieved ${users.length} users out of ${userIds.length} requested`);
        return users;
    } catch (error) {
        logger.error(`Error getting users by IDs: ${userIds}`, error);
        throw error;
    }
};

/**
 * Get public user profile
 */
const getPublicUserProfile = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
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
            createdAt: user.createdAt,
            showContact: user.showContact
        };

        // Only include contact information if showContact is true
        if (user.showContact) {
            publicProfile.email = user.email;
            publicProfile.phone = user.phone;
        }

        return publicProfile;
    } catch (error) {
        logger.error(`Error getting public user profile: ${userId}`, error);
        throw error;
    }
};

/**
 * Optimized public user profile with reduced field selection
 */
const getPublicUserProfileOptimized = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: DatabaseOptimizer.getPublicUserFields()
        });

        if (!user) {
            return null;
        }

        // Only include contact information if showContact is true
        const publicProfile = { ...user };
        if (!user.showContact) {
            delete publicProfile.email;
            delete publicProfile.phone;
        }

        return publicProfile;
    } catch (error) {
        logger.error(`Error getting public user profile optimized: ${userId}`, error);
        throw error;
    }
};

/**
 * Get public influencer profile (multi-roles)
 */
const getPublicInfluencerProfile = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || !Array.isArray(user.roles) || !user.roles.includes('INFLUENCER')) {
            return null;
        }
        // Return influencer-specific public fields
        const publicProfile = {
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
            createdAt: user.createdAt,
            showContact: user.showContact
        };

        // Only include contact information if showContact is true
        if (user.showContact) {
            publicProfile.email = user.email;
            publicProfile.phone = user.phone;
        }

        return publicProfile;
    } catch (error) {
        logger.error(`Error getting public influencer profile: ${userId}`, error);
        throw error;
    }
};

/**
 * Get public brand profile (multi-roles)
 */
const getPublicBrandProfile = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || !Array.isArray(user.roles) || !user.roles.includes('BRAND')) {
            return null;
        }
        // Return brand-specific public fields
        const publicProfile = {
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
            createdAt: user.createdAt,
            showContact: user.showContact
        };

        // Only include contact information if showContact is true
        if (user.showContact) {
            publicProfile.email = user.email;
            publicProfile.phone = user.phone;
        }

        return publicProfile;
    } catch (error) {
        logger.error(`Error getting public brand profile: ${userId}`, error);
        throw error;
    }
};

/**
 * Get public crew profile (multi-roles)
 */
const getPublicCrewProfile = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || !Array.isArray(user.roles) || !user.roles.includes('CREW')) {
            return null;
        }
        // Return crew-specific public fields
        const publicProfile = {
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
            createdAt: user.createdAt,
            showContact: user.showContact
        };

        // Only include contact information if showContact is true
        if (user.showContact) {
            publicProfile.email = user.email;
            publicProfile.phone = user.phone;
        }

        return publicProfile;
    } catch (error) {
        logger.error(`Error getting public crew profile: ${userId}`, error);
        throw error;
    }
};

/**
 * Get public platform statistics
 */
const getPublicStats = async () => {
    try {
        const totalUsers = await prisma.user.count({
            where: { isActive: true }
        });

        const totalInfluencers = await prisma.user.count({
            where: {
                roles: { has: 'INFLUENCER' },
                isActive: true
            }
        });

        const totalBrands = await prisma.user.count({
            where: {
                roles: { has: 'BRAND' },
                isActive: true
            }
        });

        const totalCrew = await prisma.user.count({
            where: {
                roles: { has: 'CREW' },
                isActive: true
            }
        });

        const recentUsers = await prisma.user.count({
            where: {
                isActive: true,
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
            }
        });

        return {
            totalUsers,
            totalInfluencers,
            totalBrands,
            totalCrew,
            recentUsers,
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        logger.error('Error getting public stats:', error);
        throw error;
    }
};

/**
 * Search users with filters (multi-roles)
 */
const searchUsers = async (filters = {}) => {
    try {
        const {
            query,
            roles,
            location,
            limit = 20,
            offset = 0
        } = filters;
        const whereClause = {};
        if (query) {
            whereClause.OR = [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { username: { contains: query, mode: 'insensitive' } },
                { bio: { contains: query, mode: 'insensitive' } }
            ];
        }
        // Filter by roles (multi-roles)
        if (roles) {
            whereClause.roles = { has: roles };
        }
        if (location) {
            whereClause.location = { contains: location, mode: 'insensitive' };
        }
        const users = await prisma.user.findMany({
            where: whereClause,
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
            orderBy: [
                { createdAt: 'desc' }
            ],
            take: limit,
            skip: offset
        });
        const total = await prisma.user.count({ where: whereClause });
        return {
            users,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        };
    } catch (error) {
        logger.error('Error searching users:', error);
        throw error;
    }
};

/**
 * Update user profile (write operation)
 */
const updateUser = async (userId, updateData) => {
    try {
        // Validate that user exists first
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            throw new NotFoundError('User not found');
        }

        // Update user with new data
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...updateData,
                updatedAt: new Date()
            }
        });

        // Remove sensitive information
        delete updatedUser.password;
        delete updatedUser.passwordResetToken;
        delete updatedUser.passwordResetExpires;
        delete updatedUser.emailVerificationToken;
        delete updatedUser.twoFactorSecret;

        logger.info(`User profile updated successfully: ${userId}`);
        return updatedUser;
    } catch (error) {
        logger.error(`Error updating user: ${userId}`, error);
        throw error;
    }
};

/**
 * Update role-specific information
 */
const updaterolespecificInfo = async (userId, roles, updateData) => {
    try {
        let validatedData = {};

        // Validate based on roles (assuming roles is an array)
        if (Array.isArray(roles) && roles.includes('INFLUENCER')) {
            // Influencer-specific fields
            if (updateData.contentCategories) validatedData.contentCategories = updateData.contentCategories;
            if (updateData.primaryNiche) validatedData.primaryNiche = updateData.primaryNiche;
            if (updateData.primaryPlatform) validatedData.primaryPlatform = updateData.primaryPlatform;
            if (updateData.estimatedFollowers) validatedData.estimatedFollowers = parseInt(updateData.estimatedFollowers);
        }

        if (Array.isArray(roles) && roles.includes('BRAND')) {
            // Brand-specific fields
            if (updateData.companyName) validatedData.companyName = updateData.companyName;
            if (updateData.companyType) validatedData.companyType = updateData.companyType;
            if (updateData.industry) validatedData.industry = updateData.industry;
            if (updateData.gstNumber) validatedData.gstNumber = updateData.gstNumber;
            if (updateData.companyWebsite) validatedData.companyWebsite = updateData.companyWebsite;
            if (updateData.marketingBudget) validatedData.marketingBudget = updateData.marketingBudget;
            if (updateData.targetAudience) validatedData.targetAudience = updateData.targetAudience;
            if (updateData.campaignTypes) validatedData.campaignTypes = updateData.campaignTypes;
            if (updateData.designationTitle) validatedData.designationTitle = updateData.designationTitle;
        }

        if (Array.isArray(roles) && roles.includes('CREW')) {
            // Crew-specific fields
            if (updateData.crewSkills) validatedData.crewSkills = updateData.crewSkills;
            if (updateData.experienceLevel) validatedData.experienceLevel = updateData.experienceLevel;
            if (updateData.equipmentOwned) validatedData.equipmentOwned = updateData.equipmentOwned;
            if (updateData.portfolioUrl) validatedData.portfolioUrl = updateData.portfolioUrl;
            if (updateData.hourlyRate) validatedData.hourlyRate = parseInt(updateData.hourlyRate);
            if (updateData.availability) validatedData.availability = updateData.availability;
            if (updateData.workStyle) validatedData.workStyle = updateData.workStyle;
            if (updateData.specializations) validatedData.specializations = updateData.specializations;
        }

        // Update user with role-specific data
        const updatedUser = await updateUser(userId, validatedData);
        return updatedUser;
    } catch (error) {
        logger.error(`Error updating role-specific info for user: ${userId}`, error);
        throw error;
    }
};

/**
 * Get user settings
 */
const getUserSettings = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                emailVerified: true,
                twoFactorEnabled: true,
                status: true,
                isActive: true,
                showContact: true,
                // Add any other settings fields you have
                // notificationPreferences: true, // If you have this field
                // privacySettings: true, // If you have this field
            }
        });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Return user settings (you can expand this based on your needs)
        return {
            userId: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            twoFactorEnabled: user.twoFactorEnabled,
            accountStatus: user.status,
            isActive: user.isActive,
            showContact: user.showContact,
            // Add default settings if you don't have dedicated settings fields
            notifications: {
                email: true,
                push: true,
                marketing: false
            },
            privacy: {
                profilePublic: true,
                showEmail: false,
                showPhone: false
            }
        };
    } catch (error) {
        logger.error(`Error getting user settings: ${userId}`, error);
        throw error;
    }
};

/**
 * Update user settings
 */
const updateUserSettings = async (userId, settingsData) => {
    try {
        // Validate that user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            throw new NotFoundError('User not found');
        }

        // For now, we'll handle basic settings updates
        let updateData = {};

        // Handle 2FA settings
        if (typeof settingsData.twoFactorEnabled === 'boolean') {
            updateData.twoFactorEnabled = settingsData.twoFactorEnabled;
        }

        // Handle other user-level settings
        if (settingsData.isActive !== undefined) {
            updateData.isActive = settingsData.isActive;
        }

        // Update user if we have data to update
        if (Object.keys(updateData).length > 0) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    ...updateData,
                    updatedAt: new Date()
                }
            });
        }

        // For more complex settings (notifications, privacy), you might want to create
        // separate tables or JSON fields. For now, return the updated settings.
        const updatedSettings = await getUserSettings(userId);

        logger.info(`User settings updated successfully: ${userId}`);
        return updatedSettings;
    } catch (error) {
        logger.error(`Error updating user settings: ${userId}`, error);
        throw error;
    }
};

/**
 * Toggle show contact setting
 */
const toggleShowContact = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Toggle the showContact field
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                showContact: !user.showContact,
                updatedAt: new Date()
            }
        });

        // Remove sensitive information
        delete updatedUser.password;
        delete updatedUser.passwordResetToken;
        delete updatedUser.passwordResetExpires;
        delete updatedUser.emailVerificationToken;
        delete updatedUser.twoFactorSecret;

        logger.info(`Show contact toggled for user: ${userId}, new value: ${updatedUser.showContact}`);
        return updatedUser;
    } catch (error) {
        logger.error(`Error toggling show contact for user: ${userId}`, error);
        throw error;
    }
};

module.exports = {
    getUserById,
    getUsersByIds,
    updateUser,
    updaterolespecificInfo,
    getUserSettings,
    updateUserSettings,
    toggleShowContact,
    getPublicUserProfile,
    getPublicInfluencerProfile,
    getPublicBrandProfile,
    getPublicCrewProfile,
    getPublicStats,
    searchUsers,
    /**
     * Resolve array of identifiers (userId | username | email) to public profiles
     */
    resolveUsers: async (identifiers = []) => {
        try {
            const results = [];
            for (const idf of identifiers) {
                let user = null;
                if (idf.userId) {
                    user = await prisma.user.findUnique({ where: { id: idf.userId } });
                } else if (idf.username) {
                    user = await prisma.user.findFirst({ where: { username: { equals: idf.username, mode: 'insensitive' } } });
                } else if (idf.email) {
                    user = await prisma.user.findFirst({ where: { email: { equals: idf.email, mode: 'insensitive' } } });
                }

                if (!user) {
                    results.push({ input: idf, user: null });
                    continue;
                }

                const publicProfile = {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username,
                    profilePicture: user.profilePicture,
                    location: user.location,
                    roles: user.roles,
                    email: user.showContact ? user.email : undefined
                };

                results.push({ input: idf, user: publicProfile });
            }
            return results;
        } catch (error) {
            logger.error('Error resolving users', error);
            throw error;
        }
    }
    ,
    /**
     * Internal: batch fetch minimal identities by IDs (returns private profiles' basic identity)
     */
    getUsersByIdsMinimal: async (ids = []) => {
        try {
            if (!Array.isArray(ids) || ids.length === 0) return [];
            const users = await prisma.user.findMany({
                where: { id: { in: ids } },
                select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    roles: true,
                    profilePicture: true,
                    location: true,
                    email: true,
                    showContact: true,
                    phone: true,
                    instagramHandle: true,
                    twitterHandle: true,
                    linkedinHandle: true,
                    youtubeHandle: true,
                    website: true,
                    bio: true,
                    createdAt: true,
                }
            });
            return users;
        } catch (error) {
            logger.error('Error fetching users by IDs (minimal):', error);
            throw error;
        }
    },

    getUsersByUsernamesMinimal: async (usernames = []) => {
        try {
            if (!Array.isArray(usernames) || usernames.length === 0) return [];
            const users = await prisma.user.findMany({
                where: { username: { in: usernames } },
                select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    roles: true,
                    profilePicture: true,
                    location: true,
                    email: true,
                    showContact: true,
                    phone: true,
                    instagramHandle: true,
                    twitterHandle: true,
                    linkedinHandle: true,
                    youtubeHandle: true,
                    website: true,
                    bio: true,
                    createdAt: true,
                }
            });
            return users;
        } catch (error) {
            logger.error('Error fetching users by usernames (minimal):', error);
            throw error;
        }
    },

    // Add optimized methods
    getUserByIdOptimized,
    getPublicUserProfileOptimized,
};
