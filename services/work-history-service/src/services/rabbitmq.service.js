const amqp = require('amqplib');
const Logger = require('../utils/logger');
const WorkHistoryService = require('./workHistory.service');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
    }

    /**
     * Connect to RabbitMQ
     */
    async connect() {
        try {
            const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

            Logger.info(`Attempting to connect to RabbitMQ: ${RABBITMQ_URL.replace(/\/\/.*@/, '//**:**@')}`);

            this.connection = await amqp.connect(RABBITMQ_URL);
            this.channel = await this.connection.createChannel();

            // Setup connection event listeners
            this.connection.on('error', this.handleConnectionError.bind(this));
            this.connection.on('close', this.handleConnectionClose.bind(this));

            this.isConnected = true;
            this.reconnectAttempts = 0;

            Logger.info('RabbitMQ connected successfully');

            return true;

        } catch (error) {
            Logger.error('Failed to connect to RabbitMQ:', error);
            this.isConnected = false;

            // Don't call handleReconnect here during initial startup
            // Let the service decide whether to continue or fail
            return false;
        }
    }

    /**
     * Setup exchanges and queues, then start consuming
     */
    async setupConsumers() {
        if (!this.channel || !this.isConnected) {
            throw new Error('RabbitMQ channel not available or not connected');
        }

        try {
            // Set up ReputationIntegrationService with this RabbitMQ instance
            const ReputationIntegrationService = require('./reputationIntegration.service');
            ReputationIntegrationService.setRabbitMQService(this);

            // Declare exchanges
            await this.channel.assertExchange('gig_events', 'topic', { durable: true });
            await this.channel.assertExchange('user_events', 'topic', { durable: true });
            await this.channel.assertExchange('clan_events', 'topic', { durable: true });
            await this.channel.assertExchange('reputation_events', 'topic', { durable: true });

            // Declare queues for work history service
            const workHistoryQueue = 'work_history_events';
            await this.channel.assertQueue(workHistoryQueue, { durable: true });

            // Bind queues to exchanges with routing keys for comprehensive work history
            await this.channel.bindQueue(workHistoryQueue, 'gig_events', 'gig.completed');
            await this.channel.bindQueue(workHistoryQueue, 'gig_events', 'gig.rated');
            await this.channel.bindQueue(workHistoryQueue, 'gig_events', 'gig.delivered');
            await this.channel.bindQueue(workHistoryQueue, 'gig_events', 'gig.application.created');
            await this.channel.bindQueue(workHistoryQueue, 'gig_events', 'gig.application.accepted');
            await this.channel.bindQueue(workHistoryQueue, 'gig_events', 'gig.application.rejected');
            await this.channel.bindQueue(workHistoryQueue, 'gig_events', 'gig.work.submitted');
            await this.channel.bindQueue(workHistoryQueue, 'gig_events', 'gig.submission.reviewed');
            await this.channel.bindQueue(workHistoryQueue, 'user_events', 'user.portfolio.updated');

            // Set prefetch count for fair distribution
            await this.channel.prefetch(10);

            // Start consuming messages
            await this.channel.consume(workHistoryQueue, this.handleWorkHistoryEvent.bind(this), {
                noAck: false
            });

            Logger.info('RabbitMQ consumers setup completed');

        } catch (error) {
            Logger.error('Error setting up RabbitMQ consumers:', error);
            throw error;
        }
    }

    /**
     * Handle work history events
     */
    async handleWorkHistoryEvent(msg) {
        if (!msg) return;

        try {
            const event = JSON.parse(msg.content.toString());
            const routingKey = msg.fields.routingKey;

            Logger.info(`Processing work history event: ${routingKey}`, { event });

            switch (routingKey) {
                case 'gig.completed':
                    await this.handleGigCompleted(event);
                    break;

                case 'gig.rated':
                    await this.handleGigRated(event);
                    break;

                case 'gig.delivered':
                    await this.handleGigDelivered(event);
                    break;

                case 'gig.application.created':
                    await this.handleApplicationCreated(event);
                    break;

                case 'gig.application.accepted':
                    await this.handleApplicationAccepted(event);
                    break;

                case 'gig.application.rejected':
                    await this.handleApplicationRejected(event);
                    break;

                case 'gig.work.submitted':
                    await this.handleWorkSubmitted(event);
                    break;

                case 'gig.submission.reviewed':
                    await this.handleSubmissionReviewed(event);
                    break;

                case 'user.portfolio.updated':
                    await this.handlePortfolioUpdated(event);
                    break;

                default:
                    Logger.warn(`Unhandled routing key: ${routingKey}`);
            }

            // Acknowledge message
            this.channel.ack(msg);

        } catch (error) {
            Logger.error('Error processing work history event:', error);

            // Reject message and requeue (with limit)
            const retryCount = msg.properties.headers?.retryCount || 0;
            if (retryCount < 3) {
                // Add retry count and requeue
                const headers = { ...msg.properties.headers, retryCount: retryCount + 1 };
                await this.channel.reject(msg, true);
            } else {
                // Max retries reached, send to dead letter queue
                Logger.error(`Max retries reached for message, discarding: ${msg.fields.routingKey}`);
                this.channel.ack(msg);
            }
        }
    }

    /**
     * Handle application created event
     */
    async handleApplicationCreated(event) {
        try {
            const {
                applicationId,
                gigId,
                applicantId,
                applicantType,
                proposal,
                quotedPrice,
                estimatedTime,
                createdAt,
                gigData
            } = event;

            Logger.info(`Application created: ${applicationId} for gig ${gigId} by ${applicantId}`);

            // Log application event
            await WorkHistoryService.logWorkEvent(applicantId, null, 'application_submitted', {
                applicationId,
                gigId,
                gigTitle: gigData?.title,
                applicantType,
                quotedPrice,
                estimatedTime,
                submittedAt: createdAt
            });

            // Update user analytics (application attempts)
            await this.updateUserApplicationStats(applicantId, 'submitted');

            Logger.info(`Logged application created for user ${applicantId}`);

        } catch (error) {
            Logger.error('Error handling application created event:', error);
            throw error;
        }
    }

    /**
     * Handle application accepted event
     */
    async handleApplicationAccepted(event) {
        try {
            const {
                applicationId,
                gigId,
                applicantId,
                clientId,
                acceptedAt,
                quotedPrice,
                gigData
            } = event;

            Logger.info(`Application accepted: ${applicationId} for gig ${gigId}`);

            // Log acceptance event
            await WorkHistoryService.logWorkEvent(applicantId, null, 'application_accepted', {
                applicationId,
                gigId,
                gigTitle: gigData?.title,
                clientId,
                quotedPrice,
                acceptedAt
            });

            // Update user analytics (application success)
            await this.updateUserApplicationStats(applicantId, 'accepted');

            Logger.info(`Logged application acceptance for user ${applicantId}`);

        } catch (error) {
            Logger.error('Error handling application accepted event:', error);
            throw error;
        }
    }

    /**
     * Handle application rejected event
     */
    async handleApplicationRejected(event) {
        try {
            const {
                applicationId,
                gigId,
                applicantId,
                clientId,
                rejectedAt,
                reason,
                gigData
            } = event;

            Logger.info(`Application rejected: ${applicationId} for gig ${gigId}`);

            // Log rejection event
            await WorkHistoryService.logWorkEvent(applicantId, null, 'application_rejected', {
                applicationId,
                gigId,
                gigTitle: gigData?.title,
                clientId,
                reason,
                rejectedAt
            });

            // Update user analytics (application rejection)
            await this.updateUserApplicationStats(applicantId, 'rejected');

            Logger.info(`Logged application rejection for user ${applicantId}`);

        } catch (error) {
            Logger.error('Error handling application rejected event:', error);
            throw error;
        }
    }

    /**
     * Handle work submitted event
     */
    async handleWorkSubmitted(event) {
        try {
            const {
                submissionId,
                gigId,
                applicantId,
                submissionTitle,
                submissionDescription,
                submittedFiles,
                submittedAt,
                gigData
            } = event;

            Logger.info(`Work submitted: ${submissionId} for gig ${gigId} by ${applicantId}`);

            // Log work submission event
            await WorkHistoryService.logWorkEvent(applicantId, null, 'work_submitted', {
                submissionId,
                gigId,
                gigTitle: gigData?.title,
                submissionTitle,
                submissionDescription,
                filesCount: submittedFiles?.length || 0,
                submittedAt
            });

            Logger.info(`Logged work submission for user ${applicantId}`);

        } catch (error) {
            Logger.error('Error handling work submitted event:', error);
            throw error;
        }
    }

    /**
     * Handle submission reviewed event
     */
    async handleSubmissionReviewed(event) {
        try {
            const {
                submissionId,
                gigId,
                applicantId,
                clientId,
                reviewStatus,
                feedback,
                rating,
                reviewedAt,
                gigCompleted,
                gigData
            } = event;

            Logger.info(`Submission reviewed: ${submissionId} with status ${reviewStatus}`);

            // Log review event
            await WorkHistoryService.logWorkEvent(applicantId, null, 'submission_reviewed', {
                submissionId,
                gigId,
                gigTitle: gigData?.title,
                clientId,
                reviewStatus,
                feedback,
                rating,
                reviewedAt,
                gigCompleted
            });

            // If submission was approved and gig completed, this will trigger gig.completed event
            // which will create the final work record

            Logger.info(`Logged submission review for user ${applicantId}`);

        } catch (error) {
            Logger.error('Error handling submission reviewed event:', error);
            throw error;
        }
    }

    /**
     * Update user application statistics
     */
    async updateUserApplicationStats(userId, status) {
        try {
            // This could be implemented to track application success rates
            // For now, we'll just log it as the reputation service handles scoring
            Logger.info(`Updated application stats for user ${userId}: ${status}`);
        } catch (error) {
            Logger.error('Error updating application stats:', error);
        }
    }

    /**
     * Handle gig completion event
     */
    async handleGigCompleted(event) {
        try {
            console.log('🎯 [Work History Service] Received gig.completed event:', JSON.stringify(event, null, 2));

            const {
                gigId,
                creatorId,
                userId,
                clientId,
                submissionId,
                rating,
                completedAt,
                gigTitle,
                gigData
            } = event;

            // Use creatorId if available, fallback to userId
            const workerId = creatorId || userId;

            if (!workerId || !clientId || !gigId) {
                Logger.error('Missing required fields for gig completion', { workerId, clientId, gigId });
                return;
            }

            // Try to get more gig details if gigData not provided
            let gigDetails = gigData;
            if (!gigDetails) {
                // If we don't have gig details, create minimal data
                gigDetails = {
                    title: gigTitle || 'Completed Gig',
                    description: 'Work completed via gig platform',
                    category: 'GENERAL',
                    skills: []
                };
            }

            // Extract work record data from event
            const workData = {
                userId: workerId,
                gigId,
                clientId,
                title: gigDetails.title || gigTitle || 'Completed Gig',
                description: gigDetails.description || 'Work completed via gig platform',
                category: gigDetails.category || 'GENERAL',
                skills: gigDetails.skills || [],
                completedAt: new Date(completedAt || new Date()),
                deliveryTime: event.deliveryTime || 0,
                budgetRange: gigDetails.budgetRange || '0-1000',
                actualBudget: event.actualBudget || gigDetails.budgetMax || 1000,
                clientRating: rating || 0,
                clientFeedback: event.feedback || '',
                onTimeDelivery: event.onTimeDelivery !== false, // Default to true unless explicitly false
                withinBudget: event.withinBudget !== false, // Default to true unless explicitly false
                portfolioItems: event.portfolioItems || []
            };

            Logger.info(`Processing gig completion for user ${workerId}, gig ${gigId}`);

            // Record the completed work
            await WorkHistoryService.recordCompletedWork(workData);

            Logger.info(`Successfully recorded completed work for gig ${gigId}, user ${workerId}`);

        } catch (error) {
            Logger.error('Error handling gig completed event:', error);
            throw error;
        }
    }

    /**
     * Handle gig rating event
     */
    async handleGigRated(event) {
        try {
            const {
                gigId,
                userId,
                clientId,
                rating,
                feedback,
                ratedAt
            } = event;

            // Update existing work record with rating
            const workRecord = await WorkHistoryService.prisma.workRecord.findFirst({
                where: { gigId, userId }
            });

            if (workRecord) {
                await WorkHistoryService.prisma.workRecord.update({
                    where: { id: workRecord.id },
                    data: {
                        clientRating: rating,
                        clientFeedback: feedback
                    }
                });

                // Update work summary and skill proficiencies
                await WorkHistoryService.updateWorkSummary(userId);
                await WorkHistoryService.updateSkillProficiencies(userId, workRecord.skills, rating);

                // Check for new achievements
                await WorkHistoryService.checkAchievements(userId);

                // Log rating event
                await WorkHistoryService.logWorkEvent(userId, workRecord.id, 'rating_received', {
                    gigId,
                    clientId,
                    rating,
                    feedback: feedback ? 'provided' : 'none'
                });

                Logger.info(`Updated work record rating for gig ${gigId}, user ${userId}: ${rating} stars`);
            } else {
                Logger.warn(`Work record not found for gig ${gigId}, user ${userId}`);
            }

        } catch (error) {
            Logger.error('Error handling gig rated event:', error);
            throw error;
        }
    }

    /**
     * Handle gig delivery event
     */
    async handleGigDelivered(event) {
        try {
            const {
                gigId,
                userId,
                clientId,
                deliveryData
            } = event;

            // Log delivery event
            await WorkHistoryService.logWorkEvent(userId, null, 'gig_delivered', {
                gigId,
                clientId,
                submissionTitle: deliveryData.submissionTitle,
                deliveredAt: deliveryData.deliveredAt
            });

            Logger.info(`Logged gig delivery for gig ${gigId}, user ${userId}`);

        } catch (error) {
            Logger.error('Error handling gig delivered event:', error);
            throw error;
        }
    }

    /**
     * Handle portfolio update event
     */
    async handlePortfolioUpdated(event) {
        try {
            const {
                userId,
                portfolioData,
                updatedAt
            } = event;

            // Log portfolio update event
            await WorkHistoryService.logWorkEvent(userId, null, 'portfolio_updated', {
                itemsCount: portfolioData.itemsCount,
                action: portfolioData.action,
                updatedAt
            });

            Logger.info(`Logged portfolio update for user ${userId}`);

        } catch (error) {
            Logger.error('Error handling portfolio updated event:', error);
            throw error;
        }
    }

    /**
     * Publish event to exchange
     */
    async publishEvent(exchange, routingKey, eventData) {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }

        try {
            const message = Buffer.from(JSON.stringify(eventData));

            const published = this.channel.publish(
                exchange,
                routingKey,
                message,
                {
                    persistent: true,
                    timestamp: Date.now(),
                    messageId: `work_history_${Date.now()}_${Math.random()}`
                }
            );

            if (!published) {
                throw new Error('Failed to publish message to RabbitMQ');
            }

            Logger.info(`Published event: ${exchange}.${routingKey}`);

        } catch (error) {
            Logger.error('Error publishing event:', error);
            throw error;
        }
    }

    /**
     * Handle connection errors
     */
    handleConnectionError(error) {
        Logger.error('RabbitMQ connection error:', error);
        this.isConnected = false;
    }

    /**
     * Handle connection close
     */
    async handleConnectionClose() {
        Logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
        await this.handleReconnect();
    }

    /**
     * Handle reconnection with exponential backoff
     */
    async handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            Logger.error('Max reconnection attempts reached, giving up');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

        Logger.info(`Attempting to reconnect to RabbitMQ in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(async () => {
            try {
                await this.connect();
                await this.setupConsumers();
            } catch (error) {
                Logger.error('Reconnection failed:', error);
                await this.handleReconnect();
            }
        }, delay);
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.isConnected && this.channel !== null;
    }

    /**
     * Disconnect from RabbitMQ
     */
    async disconnect() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            this.isConnected = false;
            Logger.info('Disconnected from RabbitMQ');
        } catch (error) {
            Logger.error('Error disconnecting from RabbitMQ:', error);
        }
    }
}

module.exports = new RabbitMQService();
