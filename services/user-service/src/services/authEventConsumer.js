const amqp = require('amqplib');
const eventHandlerService = require('./eventHandler.service');
const logger = require('../utils/logger');

class AuthEventConsumer {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.exchangeName = 'brains_events'; // Listen to auth service exchange
        this.queueName = 'user_service_auth_events';
        this.url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
    }

    async connect() {
        try {
            console.log('🐰 [Auth Event Consumer] Connecting to RabbitMQ for auth events...');

            // Create connection
            this.connection = await amqp.connect(this.url);
            console.log('✅ [Auth Event Consumer] RabbitMQ connection established');

            // Create channel
            this.channel = await this.connection.createChannel();
            console.log('✅ [Auth Event Consumer] Channel created');

            // Setup queue for auth service events
            await this.channel.assertQueue(this.queueName, {
                durable: true
            });
            console.log(`✅ [Auth Event Consumer] Queue '${this.queueName}' asserted`);

            // Bind queue to listen for auth service events
            await this.channel.bindQueue(this.queueName, this.exchangeName, 'user.registered');
            await this.channel.bindQueue(this.queueName, this.exchangeName, 'user.updated');
            await this.channel.bindQueue(this.queueName, this.exchangeName, 'user.deleted');
            await this.channel.bindQueue(this.queueName, this.exchangeName, 'user.email_verified');
            await this.channel.bindQueue(this.queueName, this.exchangeName, 'user.verified');
            console.log('✅ [Auth Event Consumer] Queue bindings established for auth events');

            this.isConnected = true;

            // Handle connection events
            this.connection.on('error', (err) => {
                console.error('❌ [Auth Event Consumer] RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.log('🔌 [Auth Event Consumer] RabbitMQ connection closed');
                this.isConnected = false;
                // Attempt to reconnect after 5 seconds
                setTimeout(() => {
                    this.connect();
                }, 5000);
            });

        } catch (error) {
            console.error('❌ [Auth Event Consumer] Failed to connect to RabbitMQ:', error);
            this.isConnected = false;
            // Don't attempt to reconnect in development if RabbitMQ is not available
            if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ [Auth Event Consumer] Running in development mode without RabbitMQ');
                return;
            }
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                this.connect();
            }, 5000);
        }
    }

    async startConsumer() {
        if (!this.isConnected || !this.channel) {
            console.log('⚠️ [Auth Event Consumer] RabbitMQ not connected, cannot start consumer');
            return;
        }

        try {
            // Start consuming messages
            await this.channel.consume(this.queueName, async (message) => {
                if (message) {
                    try {
                        const content = JSON.parse(message.content.toString());
                        const routingKey = message.fields.routingKey;
                        console.log(`📨 [Auth Event Consumer] Received message with routing key '${routingKey}':`, content);

                        // Process the message based on routing key
                        let result;
                        switch (routingKey) {
                            case 'user.registered':
                                result = await eventHandlerService.handleUserRegistered(content);
                                break;
                            case 'user.updated':
                                result = await eventHandlerService.handleUserUpdated(content);
                                break;
                            case 'user.deactivated':
                                result = await eventHandlerService.handleUserDeactivated(content);
                                break;
                            case 'user.reactivated':
                                result = await eventHandlerService.handleUserReactivated(content);
                                break;
                            case 'user.deleted':
                                result = await eventHandlerService.handleUserDeleted(content);
                                break;
                            case 'user.email_verified':
                                result = await eventHandlerService.handleEmailVerified(content);
                                break;
                            case 'user.verified':
                                result = await eventHandlerService.handleUserVerified(content);
                                break;
                            default:
                                console.warn(`⚠️ [Auth Event Consumer] Unknown routing key: ${routingKey}`);
                                result = { success: false, message: `Unknown routing key: ${routingKey}` };
                        }

                        // Acknowledge the message
                        this.channel.ack(message);
                        console.log('✅ [Auth Event Consumer] Message processed successfully:', result);

                    } catch (error) {
                        console.error('❌ [Auth Event Consumer] Error processing message:', error);
                        // Reject the message and don't requeue it
                        this.channel.nack(message, false, false);
                    }
                }
            });

            console.log('🎧 [Auth Event Consumer] Started consuming auth events from RabbitMQ');

        } catch (error) {
            console.error('❌ [Auth Event Consumer] Error starting consumer:', error);
        }
    }

    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
                console.log('✅ [Auth Event Consumer] RabbitMQ channel closed');
            }
            if (this.connection) {
                await this.connection.close();
                console.log('✅ [Auth Event Consumer] RabbitMQ connection closed');
            }
            this.isConnected = false;
        } catch (error) {
            console.error('❌ [Auth Event Consumer] Error closing RabbitMQ connection:', error);
        }
    }
}

module.exports = AuthEventConsumer;
