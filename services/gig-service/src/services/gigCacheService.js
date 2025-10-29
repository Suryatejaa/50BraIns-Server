const cacheManager = require('./cacheManager');

class GigCacheService {
    constructor() {
        this.cacheManager = cacheManager;
    }

    // ===================== GIG CACHING =====================

    /**
     * Get cached gig or fetch from database
     */
    async getGig(gigId, fallbackFn) {
        return await this.cacheManager.getEntity('gig', gigId, fallbackFn);
    }

    /**
     * Cache gig data
     */
    async setGig(gigId, gigData) {
        const ttl = this.cacheManager.getTTL('gig');
        return await this.cacheManager.setEntity('gig', gigId, gigData, ttl);
    }

    /**
     * Invalidate gig cache and related data
     */
    async invalidateGig(gigId, postedById = null) {
        await this.cacheManager.invalidateRelated('gig', gigId);

        // Also invalidate user-specific lists if we know the poster
        if (postedById) {
            await this.invalidateUserGigs(postedById);
        }
    }

    // ===================== USER GIGS CACHING =====================

    /**
     * Get user's gigs (drafts, posted, etc.)
     */
    async getUserGigs(userId, fallbackFn, listType = 'posted') {
        const key = this.cacheManager.generateKey('user_gigs', userId, listType);
        const ttl = this.cacheManager.getTTL('user_gigs');
        return await this.cacheManager.getList(key, fallbackFn, ttl);
    }

    /**
     * Cache user's gigs list
     */
    async setUserGigs(userId, gigsData, listType = 'posted') {
        const key = this.cacheManager.generateKey('user_gigs', userId, listType);
        const ttl = this.cacheManager.getTTL('user_gigs');
        return await this.cacheManager.setList(key, gigsData, ttl);
    }

    /**
     * Invalidate user's gigs lists
     */
    async invalidateUserGigs(userId) {
        const patterns = [
            `user_gigs:${userId}:*`,
            `gig_stats:${userId}`
        ];

        for (const pattern of patterns) {
            await this.cacheManager.invalidatePattern(pattern);
        }
    }

    // ===================== APPLICATION CACHING =====================

    /**
     * Get cached application
     */
    async getApplication(applicationId, fallbackFn) {
        return await this.cacheManager.getEntity('application', applicationId, fallbackFn);
    }

    /**
     * Cache application data
     */
    async setApplication(applicationId, applicationData) {
        const ttl = this.cacheManager.getTTL('application');
        return await this.cacheManager.setEntity('application', applicationId, applicationData, ttl);
    }

    /**
     * Get gig applications
     */
    async getGigApplications(gigId, fallbackFn) {
        const key = this.cacheManager.generateKey('gig_applications', gigId);
        const ttl = this.cacheManager.getTTL('user_applications');
        return await this.cacheManager.getList(key, fallbackFn, ttl);
    }

    /**
     * Get user's applications
     */
    async getUserApplications(userId, fallbackFn, status = null) {
        const suffix = status ? status : 'all';
        const key = this.cacheManager.generateKey('user_applications', userId, suffix);
        const ttl = this.cacheManager.getTTL('user_applications');
        return await this.cacheManager.getList(key, fallbackFn, ttl);
    }

    /**
     * Invalidate application and related caches
     */
    async invalidateApplication(applicationId, gigId = null, applicantId = null) {
        await this.cacheManager.invalidateRelated('application', applicationId);

        // Invalidate related lists
        if (gigId) {
            const gigAppKey = this.cacheManager.generateKey('gig_applications', gigId);
            await this.cacheManager.invalidateList(gigAppKey);
        }

        if (applicantId) {
            await this.cacheManager.invalidatePattern(`user_applications:${applicantId}:*`);
            await this.cacheManager.invalidatePattern(`applicant_applications:${applicantId}`);
        }
    }

    // ===================== SUBMISSION CACHING =====================

    /**
     * Get cached submission
     */
    async getSubmission(submissionId, fallbackFn) {
        return await this.cacheManager.getEntity('submission', submissionId, fallbackFn);
    }

    /**
     * Get gig submissions
     */
    async getGigSubmissions(gigId, fallbackFn) {
        const key = this.cacheManager.generateKey('gig_submissions', gigId);
        const ttl = this.cacheManager.getTTL('user_applications');
        return await this.cacheManager.getList(key, fallbackFn, ttl);
    }

    /**
     * Invalidate submission caches
     */
    async invalidateSubmission(submissionId, gigId = null, submittedById = null) {
        await this.cacheManager.invalidateRelated('submission', submissionId);

        if (gigId) {
            const gigSubKey = this.cacheManager.generateKey('gig_submissions', gigId);
            await this.cacheManager.invalidateList(gigSubKey);
        }
    }

    // ===================== SEARCH & DISCOVERY CACHING =====================

    /**
     * Cache search results
     */
    async cacheSearchResults(searchParams, results) {
        await this.cacheManager.cacheSearch(searchParams, results);
    }

    /**
     * Get cached search results
     */
    async getCachedSearchResults(searchParams) {
        return await this.cacheManager.getCachedSearch(searchParams);
    }

    /**
     * Get featured gigs
     */
    async getFeaturedGigs(fallbackFn) {
        const key = 'featured_gigs';
        const ttl = this.cacheManager.getTTL('featured_gigs');
        return await this.cacheManager.getList(key, fallbackFn, ttl);
    }

    /**
     * Cache categories
     */
    async getCategories(fallbackFn) {
        const key = 'categories';
        const ttl = this.cacheManager.getTTL('categories');
        return await this.cacheManager.getList(key, fallbackFn, ttl);
    }

    /**
     * Cache popular skills
     */
    async getPopularSkills(fallbackFn) {
        const key = 'popular_skills';
        const ttl = this.cacheManager.getTTL('popular_skills');
        return await this.cacheManager.getList(key, fallbackFn, ttl);
    }

    // ===================== STATISTICS CACHING =====================

    /**
     * Cache user gig statistics
     */
    async getUserStats(userId, fallbackFn) {
        const key = this.cacheManager.generateKey('gig_stats', userId);
        const ttl = this.cacheManager.getTTL('stats');
        return await this.cacheManager.getList(key, fallbackFn, ttl);
    }

    /**
     * Cache daily statistics
     */
    async getDailyStats(statType, fallbackFn) {
        const key = this.cacheManager.generateKey('stats', statType, 'daily');
        const ttl = this.cacheManager.getTTL('stats');
        return await this.cacheManager.getList(key, fallbackFn, ttl);
    }

    /**
     * Invalidate all statistics
     */
    async invalidateStats() {
        await this.cacheManager.invalidatePattern('stats:*');
        await this.cacheManager.invalidatePattern('gig_stats:*');
    }

    // ===================== SESSION CACHING =====================

    /**
     * Cache user's recently viewed gigs
     */
    async cacheRecentlyViewed(userId, gigId) {
        if (!this.cacheManager.isEnabled) return;

        try {
            const key = this.cacheManager.generateKey('session', 'gig_views', userId);
            const ttl = this.cacheManager.getTTL('session');

            // Get current list
            const current = await this.cacheManager.redis.lRange(key, 0, -1);

            // Remove if already exists (to move to front)
            if (current.includes(gigId)) {
                await this.cacheManager.redis.lRem(key, 1, gigId);
            }

            // Add to front
            await this.cacheManager.redis.lPush(key, gigId);

            // Keep only last 20 views
            await this.cacheManager.redis.lTrim(key, 0, 19);

            // Set expiration
            await this.cacheManager.redis.expire(key, ttl);

        } catch (error) {
            console.error('❌ Error caching recently viewed:', error.message);
        }
    }

    /**
     * Get user's recently viewed gigs
     */
    async getRecentlyViewed(userId, limit = 10) {
        if (!this.cacheManager.isEnabled) return [];

        try {
            const key = this.cacheManager.generateKey('session', 'gig_views', userId);
            return await this.cacheManager.redis.lRange(key, 0, limit - 1);
        } catch (error) {
            console.error('❌ Error getting recently viewed:', error.message);
            return [];
        }
    }

    // ===================== BULK OPERATIONS =====================

    /**
     * Invalidate all caches related to a user
     */
    async invalidateUserCaches(userId) {
        await this.cacheManager.invalidateRelated('user', userId);
    }

    /**
     * Warm up cache for a gig (preload related data)
     */
    async warmUpGigCache(gigId, gigData, applications = [], submissions = []) {
        // Cache the gig itself
        await this.setGig(gigId, gigData);

        // Cache applications if provided
        if (applications.length > 0) {
            const appKey = this.cacheManager.generateKey('gig_applications', gigId);
            await this.cacheManager.setList(appKey, applications);
        }

        // Cache submissions if provided
        if (submissions.length > 0) {
            const subKey = this.cacheManager.generateKey('gig_submissions', gigId);
            await this.cacheManager.setList(subKey, submissions);
        }
    }

    /**
     * Clear all search caches (useful after major data updates)
     */
    async clearSearchCaches() {
        await this.cacheManager.invalidatePattern('search:*');
        await this.cacheManager.invalidatePattern('featured_gigs');
    }

    // ===================== HEALTH & MONITORING =====================

    /**
     * Get cache health status
     */
    async getHealthStatus() {
        return await this.cacheManager.healthCheck();
    }

    /**
     * Get cache metrics
     */
    getMetrics() {
        return this.cacheManager.getMetrics();
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.cacheManager.resetMetrics();
    }

    // ===================== UTILITY METHODS =====================

    /**
     * Generate cache key for custom use
     */
    generateKey(type, identifier, suffix = null) {
        return this.cacheManager.generateKey(type, identifier, suffix);
    }

    /**
     * Check if caching is enabled
     */
    isEnabled() {
        return this.cacheManager.isEnabled;
    }

    /**
     * Initialize cache service
     */
    async initialize() {
        await this.cacheManager.initialize();
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        await this.cacheManager.shutdown();
    }
}

// Singleton instance
const gigCacheService = new GigCacheService();

module.exports = gigCacheService;