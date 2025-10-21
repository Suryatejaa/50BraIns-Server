/**
 * Redis Configuration and Connection Manager
 * Handles caching operations for the Clan Service
 * Mock mode when Redis is not available
 */

const logger = require('./logger');

let redisClient = null;
let mockStorage = new Map();
let isConnected = false;

// Initialize Redis client (mock mode)
async function connectRedis() {
    try {
        logger.info('📨 Redis connecting (mock mode)...');
        redisClient = {
            // Mock Redis client
            ping: async () => 'PONG',
            get: async (key) => mockStorage.get(key) || null,
            setEx: async (key, expiry, value) => { mockStorage.set(key, value); return 'OK'; },
            del: async (...keys) => {
                let count = 0;
                keys.forEach(key => {
                    if (mockStorage.delete(key)) count++;
                });
                return count;
            },
            keys: async (pattern) => {
                const keys = Array.from(mockStorage.keys());
                const regex = new RegExp(pattern.replace('*', '.*'));
                return keys.filter(key => regex.test(key));
            },
            exists: async (key) => mockStorage.has(key) ? 1 : 0,
            quit: async () => {
                mockStorage.clear();
                isConnected = false;
                return 'OK';
            }
        };

        isConnected = true;
        logger.info('✅ Redis connected successfully (mock mode)');
        return redisClient;
    } catch (error) {
        logger.error('Failed to connect to Redis:', error);
        // Don't throw error, just log it
        return null;
    }
}

// Cache utilities
class CacheManager {
    static getTTL(type) {
        const ttls = {
            default: parseInt(process.env.CACHE_TTL_DEFAULT) || 300,
            clan_list: parseInt(process.env.CACHE_TTL_CLAN_LIST) || 60,
            analytics: parseInt(process.env.CACHE_TTL_ANALYTICS) || 1800,
            clan_profile: 600, // 10 minutes
            member_list: 300,  // 5 minutes
            search_results: 120, // 2 minutes
            statistics: 900    // 15 minutes
        };

        return ttls[type] || ttls.default;
    }

    static generateKey(prefix, ...parts) {
        return `clan-service:${prefix}:${parts.join(':')}`;
    }

    static async get(key, defaultValue = null) {
        try {
            if (!redisClient || !isConnected) {
                return defaultValue;
            }

            const value = await redisClient.get(key);
            logger.debug('Cache get:', key, value !== null ? 'HIT' : 'MISS');

            if (value === null) {
                return defaultValue;
            }

            return JSON.parse(value);
        } catch (error) {
            logger.error('Cache get error:', error);
            return defaultValue;
        }
    }

    static async set(key, value, ttl = null) {
        try {
            if (!redisClient || !isConnected) {
                return false;
            }

            const serializedValue = JSON.stringify(value);
            const expiry = ttl || this.getTTL('default');

            await redisClient.setEx(key, expiry, serializedValue);
            logger.debug('Cache set:', key, 'TTL:', expiry);

            return true;
        } catch (error) {
            logger.error('Cache set error:', error);
            return false;
        }
    }

    static async del(key) {
        try {
            if (!redisClient || !isConnected) {
                return false;
            }

            const result = await redisClient.del(key);
            logger.debug('Cache delete:', key);

            return result > 0;
        } catch (error) {
            logger.error('Cache delete error:', error);
            return false;
        }
    }

    static async deletePattern(pattern) {
        try {
            if (!redisClient || !isConnected) {
                return 0;
            }

            const keys = await redisClient.keys(pattern);
            if (keys.length === 0) {
                return 0;
            }

            const result = await redisClient.del(...keys);
            logger.debug('Cache delete pattern:', pattern, 'Keys:', keys.length);

            return result;
        } catch (error) {
            logger.error('Cache delete pattern error:', error);
            return 0;
        }
    }

    static async exists(key) {
        try {
            if (!redisClient || !isConnected) {
                return false;
            }

            const result = await redisClient.exists(key);
            return result === 1;
        } catch (error) {
            logger.error('Cache exists error:', error);
            return false;
        }
    }

    static async getOrSet(key, fetcher, ttl = null) {
        try {
            // Try to get from cache first
            const cached = await this.get(key);
            if (cached !== null) {
                return cached;
            }

            // If not in cache, fetch the data
            const data = await fetcher();

            // Store in cache
            await this.set(key, data, ttl);

            return data;
        } catch (error) {
            logger.error('Cache getOrSet error:', error);
            // If cache fails, still return the fetched data
            return await fetcher();
        }
    }

    // Clan-specific cache methods
    static async getClanProfile(clanId) {
        const key = this.generateKey('clan', clanId);
        return await this.get(key);
    }

    static async setClanProfile(clanId, data) {
        const key = this.generateKey('clan', clanId);
        return await this.set(key, data, this.getTTL('clan_profile'));
    }

    static async deleteClanCache(clanId) {
        const pattern = this.generateKey('clan', clanId, '*');
        return await this.deletePattern(pattern);
    }

    static async getClanMembers(clanId) {
        const key = this.generateKey('members', clanId);
        return await this.get(key);
    }

    static async setClanMembers(clanId, data) {
        const key = this.generateKey('members', clanId);
        return await this.set(key, data, this.getTTL('member_list'));
    }

    static async getAnalytics(clanId, type) {
        const key = this.generateKey('analytics', clanId, type);
        return await this.get(key);
    }

    static async setAnalytics(clanId, type, data) {
        const key = this.generateKey('analytics', clanId, type);
        return await this.set(key, data, this.getTTL('analytics'));
    }
}

// Health check for Redis
async function checkRedisHealth() {
    try {
        if (!redisClient || !isConnected) {
            return {
                status: 'mock',
                message: 'Running in mock mode (Redis not available)',
                connection: 'mock'
            };
        }

        const startTime = Date.now();
        await redisClient.ping();
        const responseTime = Date.now() - startTime;

        return {
            status: 'healthy',
            responseTime: `${responseTime}ms`,
            connection: 'active'
        };
    } catch (error) {
        logger.error('Redis health check failed:', error);
        return {
            status: 'unhealthy',
            error: error.message,
            connection: 'failed'
        };
    }
}

// Graceful shutdown
async function closeRedis() {
    try {
        if (redisClient && isConnected) {
            await redisClient.quit();
            redisClient = null;
            isConnected = false;
            logger.info('Redis connection closed');
        }
    } catch (error) {
        logger.error('Error closing Redis connection:', error);
    }
}

module.exports = {
    connectRedis,
    checkRedisHealth,
    closeRedis,
    CacheManager,
    get client() {
        return redisClient;
    }
};
