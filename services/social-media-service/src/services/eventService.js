const amqp = require('amqplib');

class EventService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.exchange = 'social_media_events';
    }

    async connect() {
        try {
            this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672');
            this.channel = await this.connection.createChannel();

            // Declare exchange
            await this.channel.assertExchange(this.exchange, 'topic', { durable: true });

            console.log('Connected to RabbitMQ for social media events');
        } catch (error) {
            console.error('Failed to connect to RabbitMQ:', error);
        }
    }

    async publishEvent(routingKey, data) {
        if (!this.channel) {
            await this.connect();
        }

        try {
            const message = {
                ...data,
                timestamp: new Date().toISOString(),
                service: 'social-media-service'
            };

            await this.channel.publish(
                this.exchange,
                routingKey,
                Buffer.from(JSON.stringify(message)),
                { persistent: true }
            );

            console.log(`Published event: ${routingKey}`, message);
        } catch (error) {
            console.error('Failed to publish event:', error);
        }
    }

    // Event publishers
    async publishAccountLinked(userId, accountData) {
        await this.publishEvent('social.account.linked', {
            userId,
            platform: accountData.platform,
            username: accountData.username,
            accountId: accountData.id
        });
    }

    async publishSocialSynced(userId, accountData, previousStats) {
        await this.publishEvent('social.synced', {
            userId,
            platform: accountData.platform,
            username: accountData.username,
            accountId: accountData.id,
            currentStats: {
                followers: accountData.followers,
                engagement: accountData.engagement
            },
            previousStats,
            growthMetrics: this.calculateGrowth(previousStats, accountData)
        });
    }

    async publishEngagementThreshold(userId, accountData, threshold) {
        await this.publishEvent('social.engagement.threshold', {
            userId,
            platform: accountData.platform,
            username: accountData.username,
            accountId: accountData.id,
            threshold,
            currentFollowers: accountData.followers,
            currentEngagement: accountData.engagement
        });
    }

    calculateGrowth(previous, current) {
        if (!previous) return null;

        return {
            followersGrowth: current.followers - previous.followers,
            followersGrowthPercent: previous.followers > 0
                ? ((current.followers - previous.followers) / previous.followers) * 100
                : 0,
            engagementGrowth: (current.engagement || 0) - (previous.engagement || 0)
        };
    }

    async close() {
        if (this.channel) await this.channel.close();
        if (this.connection) await this.connection.close();
    }
}

module.exports = new EventService();
