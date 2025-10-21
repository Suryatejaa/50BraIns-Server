const amqp = require('amqplib');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.exchangeName = process.env.RABBITMQ_EXCHANGE || 'credit_events';
        this.queueName = process.env.RABBITMQ_QUEUE || 'clan_credit_queue';
        this.clanExchange = 'brains_events'; // For publishing clan events
        this.url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    }

    async connect() {
        try {
            console.log('🐰 [Clan Service] Connecting to RabbitMQ...');

            // Create connection
            this.connection = await amqp.connect(this.url);
            console.log('✅ [Clan Service] RabbitMQ connection established');

            // Create channel
            this.channel = await this.connection.createChannel();
            console.log('✅ [Clan Service] RabbitMQ channel created');

            // Setup exchanges
            await this.channel.assertExchange(this.exchangeName, 'topic', {
                durable: true
            });
            console.log(`✅ [Clan Service] Exchange '${this.exchangeName}' asserted`);

            // Setup clan events exchange
            await this.channel.assertExchange(this.clanExchange, 'topic', {
                durable: true
            });
            console.log(`✅ [Clan Service] Exchange '${this.clanExchange}' asserted`);

            // Setup queue for clan-related events
            await this.channel.assertQueue(this.queueName, {
                durable: true
            });
            console.log(`✅ [Clan Service] Queue '${this.queueName}' asserted`);

            // Bind queue to listen for boost and credit events
            await this.channel.bindQueue(this.queueName, this.exchangeName, 'boost.event');
            await this.channel.bindQueue(this.queueName, this.exchangeName, 'credit.event');
            console.log('✅ [Clan Service] Queue bindings established');

            this.isConnected = true;

            // Handle connection events
            this.connection.on('error', (err) => {
                console.error('❌ [Clan Service] RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.log('🔌 [Clan Service] RabbitMQ connection closed');
                this.isConnected = false;
                // Attempt to reconnect after 5 seconds
                setTimeout(() => {
                    this.connect();
                }, 5000);
            });

        } catch (error) {
            console.error('❌ [Clan Service] Failed to connect to RabbitMQ:', error);
            this.isConnected = false;
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                this.connect();
            }, 5000);
        }
    }

    async startConsumer(messageHandler) {
        if (!this.isConnected || !this.channel) {
            console.log('⚠️ [Clan Service] RabbitMQ not connected, cannot start consumer');
            return;
        }

        try {
            // Start consuming messages
            await this.channel.consume(this.queueName, async (message) => {
                if (message) {
                    try {
                        const content = JSON.parse(message.content.toString());
                        console.log('📨 [Clan Service] Received message:', content);

                        // Process the message
                        await messageHandler(content);

                        // Acknowledge the message
                        this.channel.ack(message);
                        console.log('✅ [Clan Service] Message processed successfully');

                    } catch (error) {
                        console.error('❌ [Clan Service] Error processing message:', error);
                        // Reject the message and don't requeue it
                        this.channel.nack(message, false, false);
                    }
                }
            });

            console.log('🎧 [Clan Service] Started consuming messages from RabbitMQ');

        } catch (error) {
            console.error('❌ [Clan Service] Error starting consumer:', error);
        }
    }

    // Publishing methods for clan events
    async publishEvent(routingKey, eventData, exchange = null) {
        try {
            if (!this.isConnected) {
                console.warn('⚠️ [Clan Service] Not connected to RabbitMQ, skipping event publish');
                return;
            }

            const targetExchange = exchange || this.clanExchange;
            const baseEvent = {
                ...eventData,
                eventType: routingKey, // Include the specific event type
                timestamp: new Date().toISOString(),
                eventId: `clan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                service: 'clan-service'
            };

            const message = JSON.stringify(baseEvent);
            await this.channel.publish(targetExchange, 'clan.event', Buffer.from(message));
            console.log(`📤 [Clan Service] Published event to ${targetExchange}.clan.event:`, baseEvent.eventId);

        } catch (error) {
            console.error('❌ [Clan Service] Error publishing event:', error);
            throw error;
        }
    }

    // Convenience methods for specific clan events
    async publishClanCreated(clanData) {
        return this.publishEvent('clan.created', {
            clanId: clanData.id,
            clanName: clanData.name,
            clanHeadId: clanData.clanHeadId,
            visibility: clanData.visibility,
            category: clanData.primaryCategory
        });
    }

    async publishMemberJoined(clanId, userId, role) {
        // Get clan details for the notification
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            select: { name: true }
        });

        return this.publishEvent('clan.member.joined', {
            clanId,
            userId,
            clanName: clan?.name || 'Unknown Clan',
            role,
            joinedAt: new Date().toISOString()
        });
    }

    async publishInvitationSent(clanId, invitedUserId, invitedByUserId, role) {
        return this.publishEvent('clan.invitation.sent', {
            clanId,
            invitedUserId,
            invitedByUserId,
            role,
            sentAt: new Date().toISOString()
        });
    }

    async publishRoleChanged(clanId, userId, oldRole, newRole) {
        return this.publishEvent('clan.member.role_changed', {
            clanId,
            userId,
            oldRole,
            newRole,
            changedAt: new Date().toISOString()
        });
    }

    async publishMemberLeft(clanId, userId, role) {
        return this.publishEvent('clan.member.left', {
            clanId,
            userId,
            role,
            leftAt: new Date().toISOString()
        });
    }

    async publishJoinRequest(clanId, userId, message) {
        // Get clan details for the notification
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            select: { name: true, clanHeadId: true }
        });

        return this.publishEvent('clan.join_request.submitted', {
            clanId,
            userId,
            clanName: clan?.name || 'Unknown Clan',
            clanHeadId: clan?.clanHeadId,
            message,
            submittedAt: new Date().toISOString()
        });
    }

    async publishJoinRequestApproved(clanId, userId, approvedBy) {
        // Get clan details for the notification
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            select: { name: true }
        });

        return this.publishEvent('clan.join_request.approved', {
            clanId,
            userId,
            clanName: clan?.name || 'Unknown Clan',
            approvedBy,
            approvedAt: new Date().toISOString()
        });
    }

    async publishJoinRequestRejected(clanId, userId, rejectedBy, reason) {
        // Get clan details for the notification
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            select: { name: true }
        });

        return this.publishEvent('clan.join_request.rejected', {
            clanId,
            userId,
            clanName: clan?.name || 'Unknown Clan',
            rejectedBy,
            reason,
            rejectedAt: new Date().toISOString()
        });
    }

    // Clan gig workflow event publishing methods
    async publishClanGigPlanUpdated(clanId, gigId, teamPlan, milestonePlan, payoutSplit) {
        return this.publishEvent('clan.gig.plan_updated', {
            clanId,
            gigId,
            teamPlan,
            milestonePlan,
            payoutSplit,
            updatedAt: new Date().toISOString()
        });
    }

    async publishClanTaskCreated(clanId, gigId, taskId, title, assigneeUserId) {
        return this.publishEvent('clan.task.created', {
            clanId,
            gigId,
            taskId,
            title,
            assigneeUserId,
            createdAt: new Date().toISOString()
        });
    }

    async publishClanTaskUpdated(clanId, gigId, taskId, status) {
        return this.publishEvent('clan.task.updated', {
            clanId,
            gigId,
            taskId,
            status,
            updatedAt: new Date().toISOString()
        });
    }

    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
                console.log('✅ [Clan Service] RabbitMQ channel closed');
            }
            if (this.connection) {
                await this.connection.close();
                console.log('✅ [Clan Service] RabbitMQ connection closed');
            }
            this.isConnected = false;
        } catch (error) {
            console.error('❌ [Clan Service] Error closing RabbitMQ connection:', error);
        }
    }
}

module.exports = new RabbitMQService();
