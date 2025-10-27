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
            await this.channel.assertExchange('gig_events', 'topic', { durable: true });

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

            // Bind to all relevant routing keys from reputation_events
            const reputationRoutingKeys = [
                'boost.received',
                'boost.given',
                'user.profile.viewed',
                'user.connection.made',
                'user.verified',
                'clan.contribution'
            ];

            for (const routingKey of reputationRoutingKeys) {
                await this.channel.bindQueue(queue, 'reputation_events', routingKey);
            }

            // Bind to gig lifecycle events from gig_events exchange
            const gigRoutingKeys = [
                'gig.completed',
                'gig.posted',
                'gig.rated',
                'gig.application.created',
                'gig.application.accepted',
                'gig.application.rejected',
                'gig.work.submitted',
                'gig.submission.reviewed'
            ];

            for (const routingKey of gigRoutingKeys) {
                await this.channel.bindQueue(queue, 'gig_events', routingKey);
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

            case 'gig.application.created':
                await this.handleApplicationCreated(eventData);
                break;

            case 'gig.application.accepted':
                await this.handleApplicationAccepted(eventData);
                break;

            case 'gig.application.rejected':
                await this.handleApplicationRejected(eventData);
                break;

            case 'gig.work.submitted':
                await this.handleWorkSubmitted(eventData);
                break;

            case 'gig.submission.reviewed':
                await this.handleSubmissionReviewed(eventData);
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
                    action: eventType,
                    impact: this.calculateImpact(eventType),
                    pointsAwarded: this.calculatePointsAwarded(eventType),
                    metadata: {
                        eventType: eventType,
                        eventSource: eventData.service || 'gig-service',
                        originalData: eventData
                    }
                }
            });
        } catch (error) {
            console.error('❌ [Reputation] Failed to log activity:', error);
        }
    }

    calculateImpact(eventType) {
        const impactMap = {
            'gig.completed': 'HIGH',
            'gig.posted': 'MEDIUM',
            'gig.rated': 'MEDIUM',
            'gig.application.created': 'LOW',
            'gig.application.accepted': 'MEDIUM',
            'gig.application.rejected': 'LOW',
            'gig.work.submitted': 'MEDIUM',
            'gig.submission.reviewed': 'MEDIUM',
            'boost.received': 'LOW',
            'boost.given': 'LOW',
            'user.profile.viewed': 'LOW',
            'user.connection.made': 'LOW',
            'user.verified': 'HIGH',
            'clan.contribution': 'MEDIUM'
        };
        return impactMap[eventType] || 'LOW';
    }

    calculatePointsAwarded(eventType) {
        const pointsMap = {
            'gig.completed': 10,
            'gig.posted': 2,
            'gig.rated': 5,
            'gig.application.created': 1,
            'gig.application.accepted': 5,
            'gig.application.rejected': -1,
            'gig.work.submitted': 3,
            'gig.submission.reviewed': 2,
            'boost.received': 5,
            'boost.given': 1,
            'user.profile.viewed': 0,
            'user.connection.made': 1,
            'user.verified': 20,
            'clan.contribution': 3
        };
        return pointsMap[eventType] || 0;
    }

    async handleGigCompleted(eventData) {
        const { gigId, creatorId, clientId, rating } = eventData;

        // Update creator's gig completion count
        await this.updateUserMetrics(creatorId, {
            completedGigs: { increment: 1 },
            totalGigs: { increment: 1 }
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

        // Update client's gig posting count (use totalGigs as a proxy)
        await this.updateUserMetrics(clientId, {
            totalGigs: { increment: 1 }
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

    async handleApplicationCreated(eventData) {
        const { applicationId, applicantId, gigId } = eventData;

        // Log application activity
        await this.logActivity('gig.application.created', eventData);

        // Small reputation boost for active participation
        await this.scoringEngine.updateUserReputation(applicantId, {
            reason: 'application_created',
            eventId: applicationId,
            gigId
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

    async handleApplicationRejected(eventData) {
        const { applicationId, applicantId } = eventData;

        // Update application metrics (small negative impact)
        await this.updateApplicationMetrics(applicantId, false);

        // Log the rejection but minimal reputation impact
        await this.scoringEngine.updateUserReputation(applicantId, {
            reason: 'application_rejected',
            eventId: applicationId
        });
    }

    async handleWorkSubmitted(eventData) {
        const { submissionId, applicantId, gigId } = eventData;

        // Log work submission activity
        await this.logActivity('gig.work.submitted', eventData);

        // Moderate reputation boost for completing work
        await this.scoringEngine.updateUserReputation(applicantId, {
            reason: 'work_submitted',
            eventId: submissionId,
            gigId
        });
    }

    async handleSubmissionReviewed(eventData) {
        const { submissionId, applicantId, reviewStatus, rating, gigCompleted } = eventData;

        // Log submission review activity
        await this.logActivity('gig.submission.reviewed', eventData);

        // Update reputation based on review outcome
        if (reviewStatus === 'approved' && rating) {
            // If gig is completed with this review, the gig.completed event will handle final scoring
            // This is just for the submission review itself
            await this.scoringEngine.updateUserReputation(applicantId, {
                reason: 'submission_approved',
                eventId: submissionId,
                rating,
                gigCompleted
            });
        } else if (reviewStatus === 'rejected') {
            // Handle submission rejection
            await this.scoringEngine.updateUserReputation(applicantId, {
                reason: 'submission_rejected',
                eventId: submissionId
            });
        }
    }

    async handleBoostReceived(eventData) {
        const { toUserId, amount } = eventData;

        // Just recalculate reputation - no specific boost tracking fields in schema
        await this.scoringEngine.updateUserReputation(toUserId, {
            reason: 'boost_received',
            amount
        });
    }

    async handleBoostGiven(eventData) {
        const { fromUserId, amount } = eventData;

        // Just recalculate reputation - no specific boost tracking fields in schema
        await this.scoringEngine.updateUserReputation(fromUserId, {
            reason: 'boost_given',
            amount
        });
    }

    async handleProfileViewed(eventData) {
        const { profileUserId } = eventData;

        // Just recalculate reputation - no specific profile view tracking in schema
        await this.scoringEngine.updateUserReputation(profileUserId, {
            reason: 'profile_viewed'
        });
    }

    async handleConnectionMade(eventData) {
        const { userId, connectedUserId } = eventData;

        // Just recalculate reputation for both - no connection tracking fields in schema
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

        // Just recalculate reputation - no verification status field in schema
        await this.scoringEngine.updateUserReputation(userId, {
            reason: 'user_verified'
        });
    }

    async handleClanContribution(eventData) {
        const { userId, clanId, contributionType } = eventData;

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
            // Filter updates to only include valid schema fields
            const validFields = [
                'totalScore', 'reliabilityScore', 'qualityScore', 'communicationScore',
                'timelinessScore', 'overallRating', 'totalGigs', 'completedGigs',
                'cancelledGigs', 'avgDeliveryTime', 'onTimeDeliveryRate',
                'clientSatisfactionRate', 'responseTime', 'level', 'rank', 'badges'
            ];

            const filteredUpdates = Object.fromEntries(
                Object.entries(updates).filter(([key]) => validFields.includes(key))
            );

            if (Object.keys(filteredUpdates).length > 0) {
                await this.prisma.reputationScore.upsert({
                    where: { userId },
                    update: {
                        ...filteredUpdates,
                        lastUpdated: new Date()
                    },
                    create: {
                        userId,
                        ...Object.entries(filteredUpdates).reduce((acc, [key, value]) => {
                            if (value && typeof value === 'object' && value.increment) {
                                acc[key] = value.increment;
                            } else {
                                acc[key] = value;
                            }
                            return acc;
                        }, {})
                    }
                });
            }
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
                // Use overallRating field which exists in the schema
                const currentAvg = reputation.overallRating || 0;
                const currentCount = reputation.totalGigs || 0;
                const newCount = currentCount + 1;
                const newAverage = ((currentAvg * currentCount) + newRating) / newCount;

                await this.prisma.reputationScore.update({
                    where: { userId },
                    data: {
                        overallRating: newAverage,
                        totalGigs: newCount
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
                // Update reliability score based on application acceptance
                const currentReliability = reputation.reliabilityScore || 0;
                const adjustment = isAccepted ? 5 : -2; // +5 for success, -2 for rejection
                const newReliability = Math.max(0, currentReliability + adjustment);

                await this.prisma.reputationScore.update({
                    where: { userId },
                    data: {
                        reliabilityScore: newReliability,
                        lastUpdated: new Date()
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
