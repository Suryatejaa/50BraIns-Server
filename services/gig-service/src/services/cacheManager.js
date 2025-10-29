const redisConfig = require('../config/redis');
const crypto = require('crypto');

class CacheManager {
    constructor() {
        this.redis = null;
        this.isEnabled = false;
        this.metrics = {
            hits: 0,
            misses: 0,
            errors: 0
        };
    }

    async initialize() {
        try {
            const connected = await redisConfig.connect();
            if (connected) {
                this.redis = redisConfig.getClient();
                this.isEnabled = true;
                console.log('✅ Cache Manager initialized successfully');
            } else {
                console.warn('⚠️ Cache Manager running in fallback mode (no Redis)');
            }
        } catch (error) {
            console.error('❌ Cache Manager initialization failed:', error.message);
            this.isEnabled = false;
        }
    }

    // ===================== KEY GENERATION =====================

    /**
     * Generate standardized cache keys
     */
    generateKey(type, identifier, suffix = null) {
        const parts = [type, identifier];
        if (suffix) parts.push(suffix);
        return parts.join(':');
    }

    /**
     * Generate hash for complex query parameters
     */
    generateQueryHash(params) {
        const sortedParams = JSON.stringify(params, Object.keys(params).sort());
        return crypto.createHash('md5').update(sortedParams).digest('hex');
    }

    // ===================== ENTITY OPERATIONS =====================

    /**
     * Get entity with fallback to database
     */
    async getEntity(type, id, fallbackFn, ttl = 3600) {
        if (!this.isEnabled) {
            return await fallbackFn();
        }

        try {
            const key = this.generateKey(type, id);
            const cached = await this.redis.get(key);

            if (cached) {
                this.metrics.hits++;
                return JSON.parse(cached);
            }

            this.metrics.misses++;
            const data = await fallbackFn();

            if (data) {
                await this.setEntity(type, id, data, ttl);
            }

            return data;

        } catch (error) {
            this.metrics.errors++;
            console.error(`❌ Cache error for ${type}:${id}:`, error.message);
            return await fallbackFn();
        }
    }

    /**
     * Set entity in cache
     */
    async setEntity(type, id, data, ttl = 3600) {
        if (!this.isEnabled || !data) return false;

        try {
            const key = this.generateKey(type, id);
            await this.redis.setEx(key, ttl, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`❌ Cache set error for ${type}:${id}:`, error.message);
            return false;
        }
    }

    /**
     * Invalidate specific entity
     */
    async invalidateEntity(type, id) {
        if (!this.isEnabled) return;

        try {
            const key = this.generateKey(type, id);
            await this.redis.del(key);
        } catch (error) {
            console.error(`❌ Cache invalidation error for ${type}:${id}:`, error.message);
        }
    }

    // ===================== LIST OPERATIONS =====================

    /**
     * Get list with fallback
     */
    async getList(key, fallbackFn, ttl = 600) {
        if (!this.isEnabled) {
            return await fallbackFn();
        }

        try {
            const cached = await this.redis.get(key);

            if (cached) {
                this.metrics.hits++;
                return JSON.parse(cached);
            }

            this.metrics.misses++;
            const data = await fallbackFn();

            if (data) {
                await this.setList(key, data, ttl);
            }

            return data;

        } catch (error) {
            this.metrics.errors++;
            console.error(`❌ Cache list error for ${key}:`, error.message);
            return await fallbackFn();
        }
    }

    /**
     * Set list in cache
     */
    async setList(key, data, ttl = 600) {
        if (!this.isEnabled || !data) return false;

        try {
            await this.redis.setEx(key, ttl, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`❌ Cache list set error for ${key}:`, error.message);
            return false;
        }
    }

    /**
     * Invalidate list
     */
    async invalidateList(key) {
        if (!this.isEnabled) return;

        try {
            await this.redis.del(key);
        } catch (error) {
            console.error(`❌ Cache list invalidation error for ${key}:`, error.message);
        }
    }

    // ===================== PATTERN OPERATIONS =====================

    /**
     * Invalidate keys matching pattern
     */
    async invalidatePattern(pattern) {
        if (!this.isEnabled) return;

        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(keys);
                console.log(`🗑️ Invalidated ${keys.length} keys matching pattern: ${pattern}`);
            }
        } catch (error) {
            console.error(`❌ Pattern invalidation error for ${pattern}:`, error.message);
        }
    }

    /**
     * Invalidate related keys based on entity type and ID
     */
    async invalidateRelated(entityType, entityId) {
        if (!this.isEnabled) return;

        const patterns = this.getRelatedPatterns(entityType, entityId);

        for (const pattern of patterns) {
            await this.invalidatePattern(pattern);
        }
    }

    /**
     * Get related key patterns for invalidation
     */
    getRelatedPatterns(entityType, entityId) {
        const patterns = [];

        switch (entityType) {
            case 'gig':
                patterns.push(
                    `gig:${entityId}`,
                    `gig_applications:${entityId}`,
                    `gig_submissions:${entityId}`,
                    `user_gigs:*`,
                    `search:*`,
                    `featured_gigs`,
                    `stats:*`
                );
                break;

            case 'application':
                patterns.push(
                    `application:${entityId}`,
                    `user_applications:*`,
                    `gig_applications:*`,
                    `applicant_applications:*`,
                    `stats:*`
                );
                break;

            case 'submission':
                patterns.push(
                    `submission:${entityId}`,
                    `gig_submissions:*`,
                    `user_submissions:*`,
                    `stats:*`
                );
                break;

            case 'user':
                patterns.push(
                    `user:${entityId}`,
                    `user_gigs:${entityId}`,
                    `user_applications:${entityId}`,
                    `user_drafts:${entityId}`,
                    `gig_stats:${entityId}`,
                    `session:*:${entityId}*`
                );
                break;
        }

        return patterns;
    }

    // ===================== QUERY CACHING =====================

    /**
     * Cache search results
     */
    async cacheSearch(params, results, ttl = 300) {
        if (!this.isEnabled) return;

        try {
            const hash = this.generateQueryHash(params);
            const key = this.generateKey('search', hash);
            await this.setList(key, results, ttl);
        } catch (error) {
            console.error('❌ Search cache error:', error.message);
        }
    }

    /**
     * Get cached search results
     */
    async getCachedSearch(params) {
        if (!this.isEnabled) return null;

        try {
            const hash = this.generateQueryHash(params);
            const key = this.generateKey('search', hash);
            const cached = await this.redis.get(key);

            if (cached) {
                this.metrics.hits++;
                return JSON.parse(cached);
            }

            this.metrics.misses++;
            return null;
        } catch (error) {
            console.error('❌ Search cache retrieval error:', error.message);
            return null;
        }
    }

    // ===================== STATISTICS & MONITORING =====================

    /**
     * Get cache performance metrics
     */
    getMetrics() {
        const total = this.metrics.hits + this.metrics.misses;
        return {
            ...this.metrics,
            hitRate: total > 0 ? (this.metrics.hits / total * 100).toFixed(2) : 0,
            total,
            enabled: this.isEnabled
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = { hits: 0, misses: 0, errors: 0 };
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            if (!this.isEnabled) {
                return { status: 'disabled', message: 'Redis not available' };
            }

            const ping = await redisConfig.ping();
            const metrics = this.getMetrics();

            return {
                status: ping ? 'healthy' : 'unhealthy',
                ping,
                metrics,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // ===================== UTILITY METHODS =====================

    /**
     * Get TTL for different types
     */
    getTTL(type) {
        const ttlMap = {
            // Entity data
            'gig': 3600,           // 1 hour
            'user': 1800,          // 30 minutes
            'application': 3600,   // 1 hour
            'submission': 3600,    // 1 hour

            // List data
            'user_gigs': 600,      // 10 minutes
            'user_applications': 600, // 10 minutes
            'search': 300,         // 5 minutes
            'featured_gigs': 1800, // 30 minutes

            // Aggregation data
            'stats': 900,          // 15 minutes
            'categories': 86400,   // 24 hours
            'popular_skills': 86400, // 24 hours

            // Session data
            'session': 7200        // 2 hours
        };

        return ttlMap[type] || 3600; // Default 1 hour
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        try {
            await redisConfig.disconnect();
            console.log('🛑 Cache Manager shutdown complete');
        } catch (error) {
            console.error('❌ Cache Manager shutdown error:', error.message);
        }
    }
}

// Singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;