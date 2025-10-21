const { createClient } = require('redis');
const logger = require('../utils/logger.utils');

let redisClient;
let isConnected = false;

const redisConfig = {
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        connectTimeout: 10000,
        commandTimeout: 5000,
        keepAlive: 30000,
    },
    password: process.env.REDIS_PASSWORD,
    database: process.env.REDIS_DB || 0,
    retryDelay: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
};

const connectRedis = async () => {
    try {
        // Skip Redis connection for now to avoid flooding logs
        logger.warn('⚠️ Redis connection disabled, using memory cache only');
        redisClient = null;
        isConnected = false;
        return;

        redisClient = createClient(redisConfig);

        redisClient.on('connect', () => {
            isConnected = true;
            logger.info('✅ Connected to Redis');
        });

        redisClient.on('ready', () => {
            logger.info('✅ Redis connection ready');
        });

        redisClient.on('error', (err) => {
            isConnected = false;
            logger.error('❌ Redis connection error:', err.message);
        });

        redisClient.on('end', () => {
            isConnected = false;
            logger.warn('⚠️ Redis connection closed');
        });

        redisClient.on('reconnecting', () => {
            logger.info('🔄 Redis reconnecting...');
        });

        // Connect to Redis
        await redisClient.connect();

        // Test connection
        await redisClient.ping();
        logger.info('✅ Redis ping successful');

    } catch (error) {
        logger.warn('⚠️ Redis connection failed, falling back to memory cache:', error.message);
        redisClient = null;
        isConnected = false;
    }
};

// In-memory fallback cache for when Redis is unavailable
const memoryCache = new Map();
const cacheExpiry = new Map();

// Clean up expired memory cache entries
let cleanupInterval;
if (process.env.NODE_ENV !== 'test') {
    cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, expireTime] of cacheExpiry.entries()) {
            if (now > expireTime) {
                memoryCache.delete(key);
                cacheExpiry.delete(key);
            }
        }
    }, 60000); // Clean up every minute
}

const getFromCache = async (key) => {
    try {
        if (redisClient && isConnected) {
            const value = await redisClient.get(key);
            return value ? JSON.parse(value) : null;
        } else {
            // Memory cache fallback
            const now = Date.now();
            const expireTime = cacheExpiry.get(key);

            if (expireTime && now > expireTime) {
                memoryCache.delete(key);
                cacheExpiry.delete(key);
                return null;
            }

            return memoryCache.get(key) || null;
        }
    } catch (error) {
        logger.error('Cache get error:', error);
        return null;
    }
};

const setToCache = async (key, value, ttlSeconds = 3600) => {
    try {
        if (redisClient && isConnected) {
            await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
        } else {
            // Memory cache fallback
            memoryCache.set(key, value);
            const expireTime = Date.now() + (ttlSeconds * 1000);
            cacheExpiry.set(key, expireTime);
        }
    } catch (error) {
        logger.error('Cache set error:', error);
    }
};

const deleteFromCache = async (key) => {
    try {
        if (redisClient && isConnected) {
            await redisClient.del(key);
        } else {
            memoryCache.delete(key);
            cacheExpiry.delete(key);
        }
    } catch (error) {
        logger.error('Cache delete error:', error);
    }
};

const clearCache = async () => {
    try {
        if (redisClient && isConnected) {
            await redisClient.flushDb();
        } else {
            memoryCache.clear();
            cacheExpiry.clear();
        }
    } catch (error) {
        logger.error('Cache clear error:', error);
    }
};

// Pattern-based cache deletion
const deletePattern = async (pattern) => {
    try {
        if (redisClient && isConnected) {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } else {
            // Memory cache pattern matching (simple implementation)
            const regex = new RegExp(pattern.replace('*', '.*'));
            for (const key of memoryCache.keys()) {
                if (regex.test(key)) {
                    memoryCache.delete(key);
                    cacheExpiry.delete(key);
                }
            }
        }
    } catch (error) {
        logger.error('Cache pattern delete error:', error);
    }
};

// Get cache statistics
const getCacheStats = async () => {
    try {
        if (redisClient && isConnected) {
            const info = await redisClient.info('memory');
            const keycount = await redisClient.dbSize();
            return {
                connected: true,
                type: 'redis',
                keycount,
                memory: info,
            };
        } else {
            return {
                connected: false,
                type: 'memory',
                keycount: memoryCache.size,
                memory: 'In-memory fallback active',
            };
        }
    } catch (error) {
        logger.error('Cache stats error:', error);
        return {
            connected: false,
            type: 'error',
            error: error.message,
        };
    }
};

// Graceful shutdown
const closeRedis = async () => {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
    }

    if (redisClient && redisClient.isOpen) {
        try {
            await redisClient.quit();
            logger.info('✅ Redis connection closed gracefully');
        } catch (error) {
            logger.error('Error closing Redis connection:', error);
        }
    }
};

// Handle process termination
process.on('SIGTERM', closeRedis);
process.on('SIGINT', closeRedis);

module.exports = {
    connectRedis,
    getFromCache,
    setToCache,
    deleteFromCache,
    clearCache,
    deletePattern,
    getCacheStats,
    closeRedis,
    getClient: () => redisClient,
    isConnected: () => isConnected,
    redisClient: () => redisClient, // For compatibility with auth middleware
};
