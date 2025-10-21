// src/services/user.service.js - SIMPLIFIED FOR DEBUGGING
console.log('USER SERVICE: Starting module execution');

try {
    console.log('USER SERVICE: Loading dependencies');
    const { prisma } = require('../config/database');
    const { NotFoundError } = require('../middleware/error-handler');
    const logger = require('../utils/logger');

    console.log('USER SERVICE: Dependencies loaded successfully');

    /**
     * Get public user profile
     */
    const getPublicUserProfile = async (userId) => {
        console.log('USER SERVICE: getPublicUserProfile called with userId:', userId);
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                return null;
            }

            // Return only public fields
            return {
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
        } catch (error) {
            logger.error(`Error getting public user profile: ${userId}`, error);
            throw error;
        }
    };

    console.log('USER SERVICE: Functions defined, creating exports');

    const exports = {
        getPublicUserProfile
    };

    console.log('USER SERVICE: Exports created:', Object.keys(exports));

    module.exports = exports;

    console.log('USER SERVICE: Module exports set successfully');

} catch (error) {
    console.error('USER SERVICE: Error during module execution:', error.message);
    console.error('USER SERVICE: Stack:', error.stack);
    // Still export something to prevent complete failure
    module.exports = {};
}
