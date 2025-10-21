const redis = require('redis');
const Logger = require('../utils/logger');

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    /**
     * Connect to Redis
     */
    async connect() {
        try {
            const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

            this.client = redis.createClient({
                url: REDIS_URL,
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        Logger.error('Redis server connection refused');
                        return new Error('Redis server connection refused');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        Logger.error('Redis retry time exhausted');
                        return new Error('Redis retry time exhausted');
                    }
                    if (options.attempt > 10) {
                        Logger.error('Redis max attempts reached');
                        return undefined;
                    }
                    // Reconnect after
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            this.client.on('error', (error) => {
                Logger.error('Redis client error:', error);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                Logger.info('Redis client connected');
                this.isConnected = true;
            });

            this.client.on('ready', () => {
                Logger.info('Redis client ready');
                this.isConnected = true;
            });

            this.client.on('end', () => {
                Logger.warn('Redis client connection ended');
                this.isConnected = false;
            });

            await this.client.connect();

        } catch (error) {
            Logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    /**
     * Set a key-value pair
     */
    async set(key, value) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.set(key, value);
        } catch (error) {
            Logger.error('Redis SET error:', error);
            throw error;
        }
    }

    /**
     * Set a key-value pair with expiration
     */
    async setex(key, seconds, value) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.setEx(key, seconds, value);
        } catch (error) {
            Logger.error('Redis SETEX error:', error);
            throw error;
        }
    }

    /**
     * Get a value by key
     */
    async get(key) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.get(key);
        } catch (error) {
            Logger.error('Redis GET error:', error);
            throw error;
        }
    }

    /**
     * Delete a key
     */
    async del(key) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.del(key);
        } catch (error) {
            Logger.error('Redis DEL error:', error);
            throw error;
        }
    }

    /**
     * Check if key exists
     */
    async exists(key) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.exists(key);
        } catch (error) {
            Logger.error('Redis EXISTS error:', error);
            throw error;
        }
    }

    /**
     * Set expiration for a key
     */
    async expire(key, seconds) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.expire(key, seconds);
        } catch (error) {
            Logger.error('Redis EXPIRE error:', error);
            throw error;
        }
    }

    /**
     * Increment a value
     */
    async incr(key) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.incr(key);
        } catch (error) {
            Logger.error('Redis INCR error:', error);
            throw error;
        }
    }

    /**
     * Hash operations
     */
    async hset(key, field, value) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.hSet(key, field, value);
        } catch (error) {
            Logger.error('Redis HSET error:', error);
            throw error;
        }
    }

    async hget(key, field) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.hGet(key, field);
        } catch (error) {
            Logger.error('Redis HGET error:', error);
            throw error;
        }
    }

    async hgetall(key) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.hGetAll(key);
        } catch (error) {
            Logger.error('Redis HGETALL error:', error);
            throw error;
        }
    }

    /**
     * List operations
     */
    async lpush(key, ...values) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.lPush(key, values);
        } catch (error) {
            Logger.error('Redis LPUSH error:', error);
            throw error;
        }
    }

    async rpush(key, ...values) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.rPush(key, values);
        } catch (error) {
            Logger.error('Redis RPUSH error:', error);
            throw error;
        }
    }

    async lrange(key, start, stop) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.lRange(key, start, stop);
        } catch (error) {
            Logger.error('Redis LRANGE error:', error);
            throw error;
        }
    }

    /**
     * Sorted set operations for leaderboards
     */
    async zadd(key, score, member) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.zAdd(key, { score, value: member });
        } catch (error) {
            Logger.error('Redis ZADD error:', error);
            throw error;
        }
    }

    async zrange(key, start, stop, withScores = false) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            if (withScores) {
                return await this.client.zRangeWithScores(key, start, stop);
            } else {
                return await this.client.zRange(key, start, stop);
            }
        } catch (error) {
            Logger.error('Redis ZRANGE error:', error);
            throw error;
        }
    }

    async zrevrange(key, start, stop, withScores = false) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            if (withScores) {
                return await this.client.zRevRangeWithScores(key, start, stop);
            } else {
                return await this.client.zRevRange(key, start, stop);
            }
        } catch (error) {
            Logger.error('Redis ZREVRANGE error:', error);
            throw error;
        }
    }

    async zscore(key, member) {
        try {
            if (!this.isConnected) {
                throw new Error('Redis not connected');
            }

            return await this.client.zScore(key, member);
        } catch (error) {
            Logger.error('Redis ZSCORE error:', error);
            throw error;
        }
    }

    /**
     * Cache user work summary with leaderboard update
     */
    async cacheWorkSummary(userId, summary) {
        try {
            // Cache the full summary
            await this.setex(`work_summary:${userId}`, 3600, JSON.stringify(summary));

            // Update leaderboards
            if (summary.averageRating > 0) {
                await this.zadd('leaderboard:rating', summary.averageRating, userId);
            }

            if (summary.completedProjects > 0) {
                await this.zadd('leaderboard:projects', summary.completedProjects, userId);
            }

            if (summary.onTimeDeliveryRate > 0) {
                await this.zadd('leaderboard:delivery', summary.onTimeDeliveryRate, userId);
            }

        } catch (error) {
            Logger.error('Error caching work summary:', error);
            throw error;
        }
    }

    /**
     * Get leaderboard data
     */
    async getLeaderboard(type, limit = 10) {
        try {
            const key = `leaderboard:${type}`;
            return await this.zrevrange(key, 0, limit - 1, true);
        } catch (error) {
            Logger.error('Error getting leaderboard:', error);
            throw error;
        }
    }

    /**
     * Ping Redis to check connection
     */
    async ping() {
        try {
            if (!this.isConnected) {
                return false;
            }

            const result = await this.client.ping();
            return result === 'PONG';
        } catch (error) {
            Logger.error('Redis PING error:', error);
            return false;
        }
    }

    /**
     * Disconnect from Redis
     */
    async disconnect() {
        try {
            if (this.client) {
                await this.client.quit();
                this.isConnected = false;
                Logger.info('Disconnected from Redis');
            }
        } catch (error) {
            Logger.error('Error disconnecting from Redis:', error);
        }
    }
}

module.exports = new RedisService();
