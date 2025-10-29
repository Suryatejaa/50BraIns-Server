// src/utils/databaseOptimizer.js
const { Transform } = require('stream');
const logger = require('./logger');

class DatabaseOptimizer {
    /**
     * Optimize field selection for user queries
     */
    static getOptimizedUserFields(includePrivate = false) {
        const baseFields = {
            // Basic Info
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            phone: true,
            bio: true,
            location: true,
            profilePicture: true,
            coverImage: true,

            // Social Media
            instagramHandle: true,
            twitterHandle: true,
            linkedinHandle: true,
            youtubeHandle: true,
            website: true,

            // Privacy Settings
            showContact: true,

            // Role-specific Data
            roles: true,
            status: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            lastActiveAt: true,

            // Influencer Data
            contentCategories: true,
            primaryNiche: true,
            primaryPlatform: true,
            estimatedFollowers: true,

            // Brand Data
            companyName: true,
            companyType: true,
            industry: true,
            gstNumber: true,
            companyWebsite: true,
            marketingBudget: true,
            targetAudience: true,
            campaignTypes: true,
            designationTitle: true,

            // Crew Data
            crewSkills: true,
            experienceLevel: true,
            equipmentOwned: true,
            portfolioUrl: true,
            hourlyRate: true,
            availability: true,
            workStyle: true,
            specializations: true
        };

        if (includePrivate) {
            return {
                ...baseFields,
                email: true
            };
        }

        return baseFields;
    }

    /**
     * Optimize field selection for public user profiles
     */
    static getPublicUserFields() {
        return {
            // Basic Info
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            bio: true,
            location: true,
            profilePicture: true,
            coverImage: true,

            // Social Media
            instagramHandle: true,
            twitterHandle: true,
            linkedinHandle: true,
            youtubeHandle: true,
            website: true,

            // Privacy Settings
            showContact: true,

            // Role-specific Data
            roles: true,
            emailVerified: true,
            createdAt: true,

            // Influencer Data
            contentCategories: true,
            primaryNiche: true,
            primaryPlatform: true,
            estimatedFollowers: true,

            // Brand Data
            companyName: true,
            companyType: true,
            industry: true,
            companyWebsite: true,
            targetAudience: true,
            campaignTypes: true,

            // Crew Data
            crewSkills: true,
            experienceLevel: true,
            equipmentOwned: true,
            portfolioUrl: true,
            hourlyRate: true,
            availability: true,
            workStyle: true,
            specializations: true
        };
    }

    /**
     * Optimize search fields
     */
    static getSearchFields() {
        return {
            // Core Search Fields
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            companyName: true,
            profilePicture: true,
            bio: true,
            location: true,

            // Role and Verification
            roles: true,
            emailVerified: true,

            // Contact Info
            showContact: true,
            website: true,

            // Social Media
            instagramHandle: true,
            twitterHandle: true,
            linkedinHandle: true,
            youtubeHandle: true,

            // Influencer Search Data
            contentCategories: true,
            primaryNiche: true,
            primaryPlatform: true,
            estimatedFollowers: true,

            // Brand Search Data
            companyType: true,
            industry: true,
            targetAudience: true,
            campaignTypes: true,

            // Crew Search Data
            crewSkills: true,
            experienceLevel: true,
            equipmentOwned: true,
            hourlyRate: true,
            availability: true,
            specializations: true,

            // Timestamps
            createdAt: true
        };
    }

    /**
     * Create streaming JSON response for large datasets
     */
    static createStreamingResponse(res, data) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');

        const stream = new Transform({
            transform(chunk, encoding, callback) {
                callback(null, chunk);
            }
        });

        stream.pipe(res);
        stream.write(JSON.stringify(data));
        stream.end();
    }

    /**
     * Performance monitoring decorator
     */
    static withPerformanceMonitoring(functionName, asyncFunction) {
        return async (...args) => {
            const startTime = process.hrtime.bigint();
            try {
                const result = await asyncFunction(...args);
                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

                if (duration > 1000) {
                    logger.warn(`🐌 Slow query detected - ${functionName}: ${duration.toFixed(0)}ms`);
                } else {
                    logger.info(`⚡ Query completed - ${functionName}: ${duration.toFixed(0)}ms`);
                }

                return result;
            } catch (error) {
                const endTime = process.hrtime.bigint();
                const duration = Number(endTime - startTime) / 1000000;
                logger.error(`❌ Query failed - ${functionName}: ${duration.toFixed(0)}ms`, error);
                throw error;
            }
        };
    }

    /**
     * Optimize pagination parameters
     */
    static optimizePagination(page, limit, maxLimit = 100) {
        const optimizedPage = Math.max(1, parseInt(page) || 1);
        const optimizedLimit = Math.min(maxLimit, Math.max(1, parseInt(limit) || 10));
        const skip = (optimizedPage - 1) * optimizedLimit;

        return {
            page: optimizedPage,
            limit: optimizedLimit,
            skip,
            take: optimizedLimit
        };
    }

    /**
     * Create optimized WHERE clause for search
     */
    static createSearchWhere(query, fields = ['username', 'firstName', 'lastName', 'companyName']) {
        if (!query || query.trim().length === 0) {
            return {};
        }

        const searchTerm = query.trim();

        return {
            OR: fields.map(field => ({
                [field]: {
                    contains: searchTerm,
                    mode: 'insensitive'
                }
            }))
        };
    }

    /**
     * Optimize ordering for better index usage
     */
    static getOptimizedOrdering(sortBy = 'lastActiveAt', order = 'desc') {
        const allowedSortFields = ['createdAt', 'lastActiveAt', 'username', 'firstName', 'lastName'];
        const allowedOrders = ['asc', 'desc'];

        const field = allowedSortFields.includes(sortBy) ? sortBy : 'lastActiveAt';
        const direction = allowedOrders.includes(order.toLowerCase()) ? order.toLowerCase() : 'desc';

        return { [field]: direction };
    }    /**
     * Reduce response payload by removing null/empty fields
     */
    static cleanResponse(data) {
        if (Array.isArray(data)) {
            return data.map(item => this.cleanResponse(item));
        }

        if (data && typeof data === 'object') {
            const cleaned = {};
            for (const [key, value] of Object.entries(data)) {
                if (value !== null && value !== undefined && value !== '') {
                    if (typeof value === 'object') {
                        const cleanedValue = this.cleanResponse(value);
                        if (Object.keys(cleanedValue).length > 0) {
                            cleaned[key] = cleanedValue;
                        }
                    } else {
                        cleaned[key] = value;
                    }
                }
            }
            return cleaned;
        }

        return data;
    }
}

module.exports = DatabaseOptimizer;