// src/services/userCacheService.js
const Redis = require('redis');
const logger = require('../utils/logger');

class UserCacheService {
    constructor() {
        this.redis = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxAttempts = 3;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) {
            return;
        }

        try {
            // Use Railway Redis URLs with fallback
            const redisUrl = process.env.REDIS_URL ||
                process.env.REDIS_PRIVATE_URL ||
                'redis://default:EOewwolfkpUhljWSgOpjBHTMIcWbPbqF@redis.railway.internal:6379';

            logger.info(`🔗 [UserCache] Connecting to Redis: ${redisUrl.replace(/\/\/.*@/, '//***@')}`);

            this.redis = Redis.createClient({
                url: redisUrl,
                socket: {
                    connectTimeout: 10000,
                    commandTimeout: 5000,
                    reconnectStrategy: (retries) => {
                        if (retries > 5) return false;
                        return Math.min(retries * 100, 3000);
                    }
                },
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        logger.error('🔴 [UserCache] Redis connection refused');
                        return new Error('Redis connection refused');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        return new Error('Redis retry time exhausted');
                    }
                    if (options.attempt > 5) {
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            // Event handlers
            this.redis.on('connect', () => {
                logger.info('🔗 [UserCache] Redis client connected');
            });

            this.redis.on('ready', () => {
                logger.info('✅ [UserCache] Redis client ready');
                this.isConnected = true;
                this.connectionAttempts = 0;
            });

            this.redis.on('error', (err) => {
                logger.error('❌ [UserCache] Redis client error:', err);
                this.isConnected = false;
            });

            this.redis.on('end', () => {
                logger.warn('⚠️ [UserCache] Redis client connection ended');
                this.isConnected = false;
            });

            await this.redis.connect();
            this.initialized = true;
            logger.info('✅ [UserCache] UserCacheService initialized successfully');

        } catch (error) {
            this.connectionAttempts++;
            logger.error(`❌ [UserCache] Failed to initialize (attempt ${this.connectionAttempts}):`, error);

            if (this.connectionAttempts < this.maxAttempts) {
                logger.info('🔄 [UserCache] Retrying connection in 2 seconds...');
                setTimeout(() => this.init(), 2000);
            } else {
                logger.error('❌ [UserCache] Max connection attempts reached, continuing without cache');
            }
        }
    }

    // Generic list caching (for search results, trending data, etc.)
    async getList(key, fetchFunction, ttl = 300) {
        try {
            if (!this.isConnected) {
                logger.warn(`⚠️ [UserCache] Redis not connected, fetching ${key} from database`);
                return await fetchFunction();
            }

            // Try to get from cache
            const cached = await this.redis.get(key);
            if (cached) {
                logger.info(`✅ [UserCache] Cache hit for list: ${key}`);
                return JSON.parse(cached);
            }

            // Cache miss - fetch from database
            logger.info(`🔍 [UserCache] Cache miss for list: ${key}`);
            const data = await fetchFunction();

            // Store in cache
            if (data) {
                await this.redis.setEx(key, ttl, JSON.stringify(data));
                logger.info(`💾 [UserCache] Cached list: ${key} (TTL: ${ttl}s)`);
            }

            return data;
        } catch (error) {
            logger.error(`❌ [UserCache] Error in getList for ${key}:`, error);
            // Fallback to database
            return await fetchFunction();
        }
    }

    // Single entity caching (for user profiles, specific user data)
    async getEntity(key, fetchFunction, ttl = 600) {
        try {
            if (!this.isConnected) {
                logger.warn(`⚠️ [UserCache] Redis not connected, fetching ${key} from database`);
                return await fetchFunction();
            }

            // Try to get from cache
            const cached = await this.redis.get(key);
            if (cached) {
                logger.info(`✅ [UserCache] Cache hit for entity: ${key}`);
                return JSON.parse(cached);
            }

            // Cache miss - fetch from database
            logger.info(`🔍 [UserCache] Cache miss for entity: ${key}`);
            const data = await fetchFunction();

            // Store in cache
            if (data) {
                await this.redis.setEx(key, ttl, JSON.stringify(data));
                logger.info(`💾 [UserCache] Cached entity: ${key} (TTL: ${ttl}s)`);
            }

            return data;
        } catch (error) {
            logger.error(`❌ [UserCache] Error in getEntity for ${key}:`, error);
            // Fallback to database
            return await fetchFunction();
        }
    }

    // Invalidate cache by pattern
    async invalidatePattern(pattern) {
        try {
            if (!this.isConnected) {
                logger.warn('⚠️ [UserCache] Redis not connected, skipping cache invalidation');
                return;
            }

            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(keys);
                logger.info(`🗑️ [UserCache] Invalidated ${keys.length} keys matching pattern: ${pattern}`);
            }
        } catch (error) {
            logger.error(`❌ [UserCache] Error invalidating pattern ${pattern}:`, error);
        }
    }

    // Invalidate specific key
    async invalidate(key) {
        try {
            if (!this.isConnected) {
                logger.warn('⚠️ [UserCache] Redis not connected, skipping cache invalidation');
                return;
            }

            await this.redis.del(key);
            logger.info(`🗑️ [UserCache] Invalidated cache key: ${key}`);
        } catch (error) {
            logger.error(`❌ [UserCache] Error invalidating key ${key}:`, error);
        }
    }

    // Get cache statistics
    async getStats() {
        try {
            if (!this.isConnected) {
                return { connected: false, error: 'Redis not connected' };
            }

            const info = await this.redis.info('memory');
            return {
                connected: true,
                isConnected: this.isConnected,
                memory: info
            };
        } catch (error) {
            logger.error('❌ [UserCache] Error getting cache stats:', error);
            return { connected: false, error: error.message };
        }
    }

    // Graceful shutdown
    async close() {
        try {
            if (this.redis) {
                await this.redis.quit();
                logger.info('✅ [UserCache] Redis connection closed gracefully');
            }
        } catch (error) {
            logger.error('❌ [UserCache] Error closing Redis connection:', error);
        }
    }
}

// Export singleton instance
const userCacheService = new UserCacheService();
module.exports = userCacheService;