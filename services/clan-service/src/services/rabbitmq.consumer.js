const amqp = require('amqplib');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

class RabbitMQConsumer {
    constructor(wsService) {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.prisma = new PrismaClient();
        this.rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
        this.wsService = wsService; // Reference to WebSocket service for broadcasting
    }

    async connect() {
        try {
            console.log('🔌 [Clan Service] Connecting to RabbitMQ...');
            this.connection = await amqp.connect(this.rabbitmqUrl);
            this.channel = await this.connection.createChannel();
            this.isConnected = true;

            console.log('✅ [Clan Service] Connected to RabbitMQ');

            // Set up event handlers
            this.connection.on('close', () => {
                console.log('❌ [Clan Service] RabbitMQ connection closed');
                this.isConnected = false;
                this.reconnect();
            });

            this.connection.on('error', (error) => {
                console.error('❌ [Clan Service] RabbitMQ connection error:', error);
                this.isConnected = false;
            });

            // Start consuming events
            await this.startConsumers();

        } catch (error) {
            console.error('❌ [Clan Service] Failed to connect to RabbitMQ:', error);
            this.isConnected = false;
            this.reconnect();
        }
    }

    async reconnect() {
        if (this.isConnected) return;

        console.log('🔄 [Clan Service] Attempting to reconnect to RabbitMQ...');
        setTimeout(() => {
            this.connect();
        }, 5000);
    }

    async startConsumers() {
        try {
            // Assert exchanges
            await this.channel.assertExchange('brains_events', 'topic', { durable: true });
            await this.channel.assertExchange('clan_events', 'topic', { durable: true });

            // Create and bind queues for clan events
            const clanQueue = await this.channel.assertQueue('clan.messages', {
                durable: true,
                arguments: { 'x-message-ttl': 7 * 24 * 60 * 60 * 1000 }
            });

            // Bind to specific routing keys
            await this.channel.bindQueue('clan.messages', 'brains_events', 'clan.message.sent');
            await this.channel.bindQueue('clan.messages', 'brains_events', 'clan.typing');
            await this.channel.bindQueue('clan.messages', 'brains_events', 'clan.message.read');

            // Start consuming
            await this.channel.consume('clan.messages', async (msg) => {
                if (msg) {
                    try {
                        const messageContent = JSON.parse(msg.content.toString());
                        const routingKey = msg.fields.routingKey;

                        console.log('📨 [Clan Service] Received event:', {
                            routingKey,
                            messageContent
                        });

                        // Extract the actual data from the message structure
                        const eventData = messageContent.data || messageContent;

                        console.log('🔍 [Clan Service] Extracted event data:', eventData);

                        await this.processEvent(routingKey, eventData);
                        this.channel.ack(msg);

                    } catch (error) {
                        console.error('❌ [Clan Service] Error processing message:', error);
                        this.channel.nack(msg, false, false);
                    }
                }
            });

            console.log('✅ [Clan Service] RabbitMQ consumers started');

        } catch (error) {
            console.error('❌ [Clan Service] Failed to start consumers:', error);
        }
    }

    async processEvent(routingKey, eventData) {
        try {
            switch (routingKey) {
                case 'clan.message.sent':
                    await this.handleClanMessageSent(eventData);
                    break;

                case 'clan.typing':
                    await this.handleClanTyping(eventData);
                    break;

                case 'clan.message.read':
                    await this.handleClanMessageRead(eventData);
                    break;

                default:
                    console.log('⚠️ [Clan Service] Unknown routing key:', routingKey);
            }
        } catch (error) {
            console.error('❌ [Clan Service] Error processing event:', error);
        }
    }

    async handleClanMessageSent(eventData) {
        try {
            console.log('🔍 [Clan Service] Raw eventData received:', eventData);

            const { userId, clanId, content, messageType, timestamp, messageId } = eventData;

            console.log('💬 [Clan Service] Processing clan message event:', {
                userId,
                clanId,
                content,
                messageType,
                messageId
            });

            // Don't save message to database again - it's already saved by WebSocket service
            // This consumer only handles events, not message persistence
            console.log('ℹ️ [Clan Service] Message already saved by WebSocket service, skipping duplicate save');

            // Only broadcast if WebSocket service is available
            if (this.wsService) {
                // Create broadcast message using the event data
                const broadcastMessage = {
                    type: 'chat',
                    id: messageId || `event_${Date.now()}_${userId}`,
                    userId,
                    content,
                    messageType: messageType || 'TEXT',
                    timestamp: timestamp || new Date().toISOString(),
                    clanId
                };

                this.wsService.broadcastToClan(clanId, broadcastMessage);
                console.log('📡 [Clan Service] Message broadcasted to WebSocket clients');
            } else {
                console.log('⚠️ [Clan Service] WebSocket service not available for broadcasting');
            }

        } catch (error) {
            console.error('❌ [Clan Service] Error handling clan message event:', error);
        }
    }

    async handleClanTyping(eventData) {
        try {
            const { userId, clanId, isTyping, timestamp } = eventData;

            console.log('⌨️ [Clan Service] Processing typing indicator:', {
                userId,
                clanId,
                isTyping
            });

            // Broadcast typing indicator to clan members via WebSocket
            if (this.wsService) {
                const typingMessage = {
                    type: 'typing_indicator',
                    userId,
                    clanId,
                    isTyping,
                    timestamp
                };

                this.wsService.broadcastToClan(clanId, typingMessage, [userId]); // Exclude sender
                console.log('📡 [Clan Service] Typing indicator broadcasted to WebSocket clients');
            } else {
                console.log('⚠️ [Clan Service] WebSocket service not available for broadcasting');
            }

        } catch (error) {
            console.error('❌ [Clan Service] Error handling typing indicator:', error);
        }
    }

    async handleClanMessageRead(eventData) {
        try {
            const { userId, messageId, clanId, timestamp } = eventData;

            console.log('👁️ [Clan Service] Processing read receipt:', {
                userId,
                messageId,
                clanId
            });

            // Update message read status in database
            await this.prisma.clanMessage.update({
                where: { id: messageId },
                data: {
                    readBy: {
                        push: userId
                    }
                }
            });

            console.log('✅ [Clan Service] Read receipt processed');

            // Broadcast read receipt to clan members via WebSocket
            if (this.wsService) {
                const readReceiptMessage = {
                    type: 'message_read',
                    messageId,
                    userId,
                    clanId,
                    timestamp
                };

                this.wsService.broadcastToClan(clanId, readReceiptMessage);
                console.log('📡 [Clan Service] Read receipt broadcasted to WebSocket clients');
            } else {
                console.log('⚠️ [Clan Service] WebSocket service not available for broadcasting');
            }

        } catch (error) {
            console.error('❌ [Clan Service] Error handling read receipt:', error);
        }
    }

    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            if (this.prisma) {
                await this.prisma.$disconnect();
            }
            console.log('🔌 [Clan Service] RabbitMQ connection closed');
        } catch (error) {
            console.error('❌ [Clan Service] Error closing RabbitMQ connection:', error);
        }
    }
}

module.exports = { RabbitMQConsumer };
