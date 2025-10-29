const redis = require('redis');

class RedisConfig {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 10;
    }

    async connect() {
        try {
            const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

            this.client = redis.createClient({
                url: REDIS_URL,
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        console.error('❌ Redis server connection refused');
                        return new Error('Redis server connection refused');
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        console.error('❌ Redis retry time exhausted');
                        return new Error('Redis retry time exhausted');
                    }
                    if (options.attempt > this.maxRetries) {
                        console.error('❌ Redis max attempts reached');
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            this.client.on('error', (error) => {
                console.error('❌ Redis client error:', error.message);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('🔗 Redis client connected');
                this.retryCount = 0;
            });

            this.client.on('ready', () => {
                console.log('✅ Redis client ready');
                this.isConnected = true;
            });

            this.client.on('end', () => {
                console.warn('⚠️ Redis client connection ended');
                this.isConnected = false;
            });

            this.client.on('reconnecting', () => {
                this.retryCount++;
                console.log(`🔄 Redis reconnecting (attempt ${this.retryCount})`);
            });

            await this.client.connect();
            return true;

        } catch (error) {
            console.error('❌ Failed to connect to Redis:', error.message);
            this.isConnected = false;
            return false;
        }
    }

    getClient() {
        return this.client;
    }

    isReady() {
        return this.isConnected && this.client;
    }

    async ping() {
        try {
            if (!this.isReady()) return false;
            const result = await this.client.ping();
            return result === 'PONG';
        } catch (error) {
            console.error('❌ Redis ping failed:', error.message);
            return false;
        }
    }

    async disconnect() {
        try {
            if (this.client) {
                await this.client.quit();
                this.isConnected = false;
                console.log('📴 Redis disconnected gracefully');
            }
        } catch (error) {
            console.error('❌ Error disconnecting Redis:', error.message);
        }
    }
}

// Singleton instance
const redisConfig = new RedisConfig();

module.exports = redisConfig;