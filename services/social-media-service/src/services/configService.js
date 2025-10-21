class ConfigService {
    constructor() {
        this.loadConfig();
    }

    loadConfig() {
        // Server Configuration
        this.server = {
            port: parseInt(process.env.PORT) || 4008,
            nodeEnv: process.env.NODE_ENV || 'development'
        };

        // Database Configuration
        this.database = {
            url: process.env.DATABASE_URL
        };

        // RabbitMQ Configuration
        this.rabbitmq = {
            url: process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672'
        };

        // Instagram API Configuration
        this.instagram = {
            appId: process.env.INSTAGRAM_APP_ID,
            appSecret: process.env.INSTAGRAM_APP_SECRET,
            accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
            businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
        };

        // YouTube API Configuration
        this.youtube = {
            apiKey: process.env.YOUTUBE_API_KEY,
            clientId: process.env.YOUTUBE_CLIENT_ID,
            clientSecret: process.env.YOUTUBE_CLIENT_SECRET
        };

        // Twitter API Configuration
        this.twitter = {
            apiKey: process.env.TWITTER_API_KEY,
            apiSecret: process.env.TWITTER_API_SECRET,
            bearerToken: process.env.TWITTER_BEARER_TOKEN,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
        };

        // LinkedIn API Configuration
        this.linkedin = {
            clientId: process.env.LINKEDIN_CLIENT_ID,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
            accessToken: process.env.LINKEDIN_ACCESS_TOKEN
        };

        // TikTok API Configuration
        this.tiktok = {
            clientKey: process.env.TIKTOK_CLIENT_KEY,
            clientSecret: process.env.TIKTOK_CLIENT_SECRET,
            accessToken: process.env.TIKTOK_ACCESS_TOKEN
        };

        // Pinterest API Configuration
        this.pinterest = {
            appId: process.env.PINTEREST_APP_ID,
            appSecret: process.env.PINTEREST_APP_SECRET,
            accessToken: process.env.PINTEREST_ACCESS_TOKEN
        };

        // Snapchat API Configuration
        this.snapchat = {
            clientId: process.env.SNAPCHAT_CLIENT_ID,
            clientSecret: process.env.SNAPCHAT_CLIENT_SECRET,
            accessToken: process.env.SNAPCHAT_ACCESS_TOKEN
        };

        // API Rate Limiting
        this.rateLimiting = {
            requests: parseInt(process.env.API_RATE_LIMIT_REQUESTS) || 100,
            window: parseInt(process.env.API_RATE_LIMIT_WINDOW) || 60000
        };

        // Sync Configuration
        this.sync = {
            autoSyncEnabled: process.env.AUTO_SYNC_ENABLED === 'true',
            intervalHours: parseInt(process.env.SYNC_INTERVAL_HOURS) || 24,
            maxConcurrentSyncs: parseInt(process.env.MAX_CONCURRENT_SYNCS) || 5
        };

        // Feature Flags
        this.features = {
            enableRealApiCalls: process.env.ENABLE_REAL_API_CALLS === 'true',
            enableMockData: process.env.ENABLE_MOCK_DATA !== 'false',
            enableWebhookVerification: process.env.ENABLE_WEBHOOK_VERIFICATION === 'true'
        };

        // Logging Configuration
        this.logging = {
            level: process.env.LOG_LEVEL || 'info',
            enableApiLogging: process.env.ENABLE_API_LOGGING !== 'false'
        };
    }

    // Helper methods to check if APIs are configured
    isInstagramConfigured() {
        return !!(this.instagram.accessToken || (this.instagram.appId && this.instagram.appSecret));
    }

    isYouTubeConfigured() {
        return !!this.youtube.apiKey;
    }

    isTwitterConfigured() {
        return !!(this.twitter.bearerToken || (this.twitter.apiKey && this.twitter.apiSecret));
    }

    isLinkedInConfigured() {
        return !!(this.linkedin.accessToken || (this.linkedin.clientId && this.linkedin.clientSecret));
    }

    isTikTokConfigured() {
        return !!(this.tiktok.accessToken || (this.tiktok.clientKey && this.tiktok.clientSecret));
    }

    isPinterestConfigured() {
        return !!(this.pinterest.accessToken || (this.pinterest.appId && this.pinterest.appSecret));
    }

    isSnapchatConfigured() {
        return !!(this.snapchat.accessToken || (this.snapchat.clientId && this.snapchat.clientSecret));
    }

    // Get configured platforms
    getConfiguredPlatforms() {
        const platforms = [];

        if (this.isInstagramConfigured()) platforms.push('instagram');
        if (this.isYouTubeConfigured()) platforms.push('youtube');
        if (this.isTwitterConfigured()) platforms.push('twitter');
        if (this.isLinkedInConfigured()) platforms.push('linkedin');
        if (this.isTikTokConfigured()) platforms.push('tiktok');
        if (this.isPinterestConfigured()) platforms.push('pinterest');
        if (this.isSnapchatConfigured()) platforms.push('snapchat');

        return platforms;
    }

    // Validate configuration
    validateConfig() {
        const errors = [];

        if (!this.database.url || this.database.url.trim() === '') {
            errors.push('DATABASE_URL is required');
        }

        if (this.features.enableRealApiCalls && this.getConfiguredPlatforms().length === 0) {
            errors.push('At least one platform API must be configured when ENABLE_REAL_API_CALLS is true');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Get platform credentials
    getPlatformCredentials(platform) {
        switch (platform) {
            case 'instagram':
                return this.instagram;
            case 'youtube':
                return this.youtube;
            case 'twitter':
                return this.twitter;
            case 'linkedin':
                return this.linkedin;
            case 'tiktok':
                return this.tiktok;
            case 'pinterest':
                return this.pinterest;
            case 'snapchat':
                return this.snapchat;
            default:
                return null;
        }
    }
}

module.exports = new ConfigService();
