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

            // Bind queues to exchanges with routing keys
            await this.channel.bindQueue(workHistoryQueue, 'gig_events', 'gig.completed');
            await this.channel.bindQueue(workHistoryQueue, 'gig_events', 'gig.rated');
            await this.channel.bindQueue(workHistoryQueue, 'gig_events', 'gig.delivered');
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
     * Handle gig completion event
     */
    async handleGigCompleted(event) {
        try {
            console.log('🎯 [Work History Service] Received gig.completed event:', JSON.stringify(event, null, 2));

            const {
                gigId,
                userId,
                clientId,
                gigData,
                completionData,
                deliveryData
            } = event;

            // Extract work record data from event
            const workData = {
                userId,
                gigId,
                clientId,
                title: gigData.title,
                description: gigData.description,
                category: gigData.category,
                skills: gigData.skills || [],
                completedAt: new Date(completionData.completedAt),
                deliveryTime: deliveryData.deliveryTime || 0,
                budgetRange: gigData.budgetRange || '0-100',
                actualBudget: completionData.actualAmount,
                clientRating: completionData.rating,
                clientFeedback: completionData.feedback,
                onTimeDelivery: deliveryData.onTime || false,
                withinBudget: completionData.withinBudget || true,
                portfolioItems: deliveryData.portfolioItems || []
            };

            // Record the completed work
            await WorkHistoryService.recordCompletedWork(workData);

            Logger.info(`Recorded completed work for gig ${gigId}, user ${userId}`);

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
