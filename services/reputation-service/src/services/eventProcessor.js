const amqp = require('amqplib');
const ScoringEngine = require('./scoringEngine');
const { PrismaClient } = require('@prisma/client');

class EventProcessor {
    constructor() {
        this.prisma = new PrismaClient();
        this.scoringEngine = new ScoringEngine();
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
            this.channel = await this.connection.createChannel();

            await this.channel.assertExchange('reputation_events', 'topic', { durable: true });

            this.connection.on('error', (err) => {
                console.error('❌ [Reputation] RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.log('🔌 [Reputation] RabbitMQ connection closed');
                this.isConnected = false;
            });

            this.isConnected = true;
            console.log('✅ [Reputation] Connected to RabbitMQ');

            // Start consuming events
            await this.setupConsumers();

        } catch (error) {
            console.error('❌ [Reputation] Failed to connect to RabbitMQ:', error);
            this.isConnected = false;
            throw error;
        }
    }

    async setupConsumers() {
        try {
            // Define queue for reputation events
            const queue = 'reputation_service_queue';
            await this.channel.assertQueue(queue, { durable: true });

            // Bind to all relevant routing keys
            const routingKeys = [
                'gig.completed',
                'gig.posted',
                'gig.rated',
                'gig.application.accepted',
                'gig.application.rejected',
                'boost.received',
                'boost.given',
                'user.profile.viewed',
                'user.connection.made',
                'user.verified',
                'clan.contribution'
            ];

            for (const routingKey of routingKeys) {
                await this.channel.bindQueue(queue, 'reputation_events', routingKey);
            }

            // Start consuming messages
            await this.channel.consume(queue, async (msg) => {
                if (msg) {
                    try {
                        await this.processEvent(msg);
                        this.channel.ack(msg);
                    } catch (error) {
                        console.error('❌ [Reputation] Event processing failed:', error);
                        this.channel.nack(msg, false, false); // Don't requeue failed messages
                    }
                }
            });

            console.log('📨 [Reputation] Event consumers started');

        } catch (error) {
            console.error('❌ [Reputation] Failed to setup consumers:', error);
            throw error;
        }
    }

    async processEvent(msg) {
        const routingKey = msg.fields.routingKey;
        const eventData = JSON.parse(msg.content.toString());

        console.log(`📨 [Reputation] Processing event: ${routingKey}`, eventData);

        // Log the activity
        await this.logActivity(routingKey, eventData);

        // Update reputation based on event type
        switch (routingKey) {
            case 'gig.completed':
                await this.handleGigCompleted(eventData);
                break;

            case 'gig.posted':
                await this.handleGigPosted(eventData);
                break;

            case 'gig.rated':
                await this.handleGigRated(eventData);
                break;

            case 'gig.application.accepted':
                await this.handleApplicationAccepted(eventData);
                break;

            case 'boost.received':
                await this.handleBoostReceived(eventData);
                break;

            case 'boost.given':
                await this.handleBoostGiven(eventData);
                break;

            case 'user.profile.viewed':
                await this.handleProfileViewed(eventData);
                break;

            case 'user.connection.made':
                await this.handleConnectionMade(eventData);
                break;

            case 'user.verified':
                await this.handleUserVerified(eventData);
                break;

            case 'clan.contribution':
                await this.handleClanContribution(eventData);
                break;

            default:
                console.log(`ℹ️ [Reputation] Unhandled event type: ${routingKey}`);
        }
    }

    async logActivity(eventType, eventData) {
        try {
            await this.prisma.activityLog.create({
                data: {
                    userId: eventData.userId || eventData.creatorId || eventData.fromUserId || eventData.ratedUserId || eventData.applicantId,
                    activityType: eventType,
                    eventType: eventType,
                    eventSource: eventData.service || 'gig-service', // Add missing eventSource field
                    activityData: eventData,
                    timestamp: new Date()
                }
            });
        } catch (error) {
            console.error('❌ [Reputation] Failed to log activity:', error);
        }
    }

    async handleGigCompleted(eventData) {
        const { gigId, creatorId, clientId, rating } = eventData;

        // Update creator's gig completion count
        await this.updateUserMetrics(creatorId, {
            gigsCompleted: { increment: 1 }
        });

        // Update average rating if provided
        if (rating) {
            await this.updateAverageRating(creatorId, rating);
        }

        // Recalculate reputation
        await this.scoringEngine.updateUserReputation(creatorId, {
            reason: 'gig_completed',
            eventId: gigId,
            gigId,
            rating
        });
    }

    async handleGigPosted(eventData) {
        const { gigId, clientId } = eventData;

        // Update client's gig posting count
        await this.updateUserMetrics(clientId, {
            gigsPosted: { increment: 1 }
        });

        // Recalculate reputation
        await this.scoringEngine.updateUserReputation(clientId, {
            reason: 'gig_posted',
            eventId: gigId
        });
    }

    async handleGigRated(eventData) {
        const { gigId, ratedUserId, rating } = eventData;

        // Update average rating
        await this.updateAverageRating(ratedUserId, rating);

        // Recalculate reputation
        await this.scoringEngine.updateUserReputation(ratedUserId, {
            reason: 'gig_rated',
            eventId: gigId,
            rating
        });
    }

    async handleApplicationAccepted(eventData) {
        const { applicationId, applicantId } = eventData;

        // Update application success metrics
        await this.updateApplicationMetrics(applicantId, true);

        // Recalculate reputation
        await this.scoringEngine.updateUserReputation(applicantId, {
            reason: 'application_accepted',
            eventId: applicationId
        });
    }

    async handleBoostReceived(eventData) {
        const { toUserId, amount } = eventData;

        // Update boost received count
        await this.updateUserMetrics(toUserId, {
            boostsReceived: { increment: 1 }
        });

        // Recalculate reputation
        await this.scoringEngine.updateUserReputation(toUserId, {
            reason: 'boost_received',
            amount
        });
    }

    async handleBoostGiven(eventData) {
        const { fromUserId, amount } = eventData;

        // Update boost given count
        await this.updateUserMetrics(fromUserId, {
            boostsGiven: { increment: 1 }
        });

        // Recalculate reputation
        await this.scoringEngine.updateUserReputation(fromUserId, {
            reason: 'boost_given',
            amount
        });
    }

    async handleProfileViewed(eventData) {
        const { profileUserId } = eventData;

        // Update profile view count
        await this.updateUserMetrics(profileUserId, {
            profileViews: { increment: 1 }
        });

        // Recalculate reputation (small increment)
        await this.scoringEngine.updateUserReputation(profileUserId, {
            reason: 'profile_viewed'
        });
    }

    async handleConnectionMade(eventData) {
        const { userId, connectedUserId } = eventData;

        // Update connection count for both users
        await this.updateUserMetrics(userId, {
            connectionsMade: { increment: 1 }
        });

        await this.updateUserMetrics(connectedUserId, {
            connectionsMade: { increment: 1 }
        });

        // Recalculate reputation for both
        await this.scoringEngine.updateUserReputation(userId, {
            reason: 'connection_made',
            connectedUserId
        });

        await this.scoringEngine.updateUserReputation(connectedUserId, {
            reason: 'connection_made',
            connectedUserId: userId
        });
    }

    async handleUserVerified(eventData) {
        const { userId } = eventData;

        // Update verification status
        await this.updateUserMetrics(userId, {
            isVerified: true
        });

        // Recalculate reputation (significant bonus)
        await this.scoringEngine.updateUserReputation(userId, {
            reason: 'user_verified'
        });
    }

    async handleClanContribution(eventData) {
        const { userId, clanId, contributionType } = eventData;

        // Update clan contribution count
        await this.updateUserMetrics(userId, {
            clanContributions: { increment: 1 }
        });

        // Update clan reputation
        await this.updateClanReputation(clanId, userId);

        // Recalculate user reputation
        await this.scoringEngine.updateUserReputation(userId, {
            reason: 'clan_contribution',
            clanId,
            contributionType
        });
    }

    async updateUserMetrics(userId, updates) {
        try {
            await this.prisma.reputationScore.upsert({
                where: { userId },
                update: updates,
                create: {
                    userId,
                    ...Object.entries(updates).reduce((acc, [key, value]) => {
                        if (value.increment) {
                            acc[key] = value.increment;
                        } else {
                            acc[key] = value;
                        }
                        return acc;
                    }, {})
                }
            });
        } catch (error) {
            console.error(`❌ [Reputation] Failed to update metrics for ${userId}:`, error);
        }
    }

    async updateAverageRating(userId, newRating) {
        try {
            const reputation = await this.prisma.reputationScore.findUnique({
                where: { userId }
            });

            if (reputation) {
                const currentAvg = reputation.averageRating || 0;
                const currentCount = reputation.ratingCount || 0;
                const currentTotal = reputation.totalRating || 0;
                const newCount = currentCount + 1;
                const newTotal = currentTotal + newRating;
                const newAverage = newTotal / newCount;

                await this.prisma.reputationScore.update({
                    where: { userId },
                    data: {
                        averageRating: newAverage,
                        ratingCount: newCount,
                        totalRating: newTotal
                    }
                });
            }
        } catch (error) {
            console.error(`❌ [Reputation] Failed to update rating for ${userId}:`, error);
        }
    }

    async updateApplicationMetrics(userId, isAccepted) {
        try {
            const reputation = await this.prisma.reputationScore.findUnique({
                where: { userId }
            });

            if (reputation) {
                const currentSuccess = reputation.applicationSuccess || 50; // Start at 50%
                const adjustment = isAccepted ? 5 : -2; // +5% for success, -2% for rejection
                const newSuccess = Math.max(0, Math.min(100, currentSuccess + adjustment));

                await this.prisma.reputationScore.update({
                    where: { userId },
                    data: {
                        applicationSuccess: newSuccess
                    }
                });
            }
        } catch (error) {
            console.error(`❌ [Reputation] Failed to update application metrics for ${userId}:`, error);
        }
    }

    async updateClanReputation(clanId, contributorId) {
        try {
            // Get clan members' reputation scores
            const clanReputation = await this.prisma.clanReputation.findUnique({
                where: { clanId }
            });

            // Update or create clan reputation
            await this.prisma.clanReputation.upsert({
                where: { clanId },
                update: {
                    totalScore: { increment: 1 },
                    lastUpdated: new Date()
                },
                create: {
                    clanId,
                    totalScore: 0,
                    avgMemberScore: 0,
                    totalGigs: 1,
                    lastUpdated: new Date()
                }
            });
        } catch (error) {
            console.error(`❌ [Reputation] Failed to update clan reputation for ${clanId}:`, error);
        }
    }

    async publishEvent(routingKey, eventData) {
        if (!this.isConnected) {
            console.warn('⚠️ [Reputation] Cannot publish event - not connected to RabbitMQ');
            return;
        }

        try {
            await this.channel.publish(
                'reputation_events',
                routingKey,
                Buffer.from(JSON.stringify(eventData)),
                { persistent: true }
            );

            console.log(`📤 [Reputation] Published event: ${routingKey}`);
        } catch (error) {
            console.error('❌ [Reputation] Failed to publish event:', error);
        }
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.close();
            console.log('🔌 [Reputation] Disconnected from RabbitMQ');
        }
    }
}

module.exports = EventProcessor;
