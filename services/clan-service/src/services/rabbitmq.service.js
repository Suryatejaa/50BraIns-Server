const amqp = require('amqplib');
const logger = require('../utils/logger');

class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.isConnected = false;
        this.exchangeName = process.env.RABBITMQ_EXCHANGE || 'brains_events';
        this.url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
    }

    async connect() {
        try {
            if (this.isConnected) return;

            console.log('🐰 [Clan Service] Connecting to RabbitMQ...');
            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();

            // Assert exchange
            await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
            console.log(`✅ [Clan Service] Connected to RabbitMQ exchange: ${this.exchangeName}`);

            this.isConnected = true;

            // Handle connection events
            this.connection.on('error', (err) => {
                console.error('❌ [Clan Service] RabbitMQ connection error:', err);
                this.isConnected = false;
            });

            this.connection.on('close', () => {
                console.log('🔌 [Clan Service] RabbitMQ connection closed');
                this.isConnected = false;
            });

        } catch (error) {
            console.error('❌ [Clan Service] Failed to connect to RabbitMQ:', error);
            this.isConnected = false;
            // Don't throw error - clan service should work without RabbitMQ
        }
    }

    async publishEvent(routingKey, eventData) {
        try {
            if (!this.isConnected) {
                await this.connect();
            }

            if (!this.isConnected) {
                console.warn('⚠️ [Clan Service] Not connected to RabbitMQ, skipping event publish');
                return false;
            }

            const baseEvent = {
                ...eventData,
                eventType: routingKey,
                timestamp: new Date().toISOString(),
                eventId: `clan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                service: 'clan-service'
            };

            const message = JSON.stringify(baseEvent);
            const published = this.channel.publish(
                this.exchangeName,
                routingKey,
                Buffer.from(message),
                {
                    persistent: true,
                    timestamp: Date.now()
                }
            );

            if (published) {
                console.log(`📤 [Clan Service] Published event: ${routingKey}`, {
                    eventId: baseEvent.eventId,
                    timestamp: baseEvent.timestamp
                });
                return true;
            } else {
                throw new Error('Failed to publish message');
            }

        } catch (error) {
            console.error(`❌ [Clan Service] Error publishing event ${routingKey}:`, error);
            return false;
        }
    }

    // Convenience methods for specific clan events
    async publishClanCreated(clanData) {
        return this.publishEvent('clan.created', {
            clanId: clanData.id,
            clanName: clanData.name,
            headId: clanData.headId,
            headName: clanData.headName || 'Clan Owner',
            category: clanData.primaryCategory,
            location: clanData.location,
            visibility: clanData.visibility,
            createdAt: clanData.createdAt
        });
    }

    async publishClanMemberJoined(clanId, userId, userName, role, clanName) {
        return this.publishEvent('clan.member.joined', {
            clanId,
            clanName,
            userId,
            userName,
            role,
            joinedAt: new Date().toISOString()
        });
    }

    async publishClanMemberLeft(clanId, userId, userName, role, clanName) {
        return this.publishEvent('clan.member.left', {
            clanId,
            clanName,
            userId,
            userName,
            role,
            leftAt: new Date().toISOString()
        });
    }

    async publishClanJoinRequest(clanId, userId, userName, message, clanName, headId, adminIds) {
        return this.publishEvent('clan.join.request', {
            clanId,
            clanName,
            userId,
            userName,
            message,
            headId,
            adminIds,
            requestedAt: new Date().toISOString()
        });
    }

    async publishClanJoinRequestApproved(clanId, userId, userName, approvedBy, approvedByName, clanName) {
        return this.publishEvent('clan.join.request.approved', {
            clanId,
            clanName,
            userId,
            userName,
            approvedBy,
            approvedByName,
            approvedAt: new Date().toISOString()
        });
    }

    async publishClanJoinRequestRejected(clanId, userId, userName, rejectedBy, rejectedByName, reason, clanName) {
        return this.publishEvent('clan.join.request.rejected', {
            clanId,
            clanName,
            userId,
            userName,
            rejectedBy,
            rejectedByName,
            reason,
            rejectedAt: new Date().toISOString()
        });
    }

    async publishClanMemberRoleUpdated(clanId, userId, userName, oldRole, newRole, updatedBy, updatedByName, clanName) {
        return this.publishEvent('clan.member.role.updated', {
            clanId,
            clanName,
            userId,
            userName,
            oldRole,
            newRole,
            updatedBy,
            updatedByName,
            updatedAt: new Date().toISOString()
        });
    }

    async publishClanMemberRemoved(clanId, userId, userName, removedBy, removedByName, reason, clanName) {
        return this.publishEvent('clan.member.removed', {
            clanId,
            clanName,
            userId,
            userName,
            removedBy,
            removedByName,
            reason,
            removedAt: new Date().toISOString()
        });
    }

    async publishClanAdminAdded(clanId, userId, userName, addedBy, addedByName, clanName) {
        return this.publishEvent('clan.admin.added', {
            clanId,
            clanName,
            userId,
            userName,
            addedBy,
            addedByName,
            addedAt: new Date().toISOString()
        });
    }

    async publishClanAdminRemoved(clanId, userId, userName, removedBy, removedByName, reason, clanName) {
        return this.publishEvent('clan.admin.removed', {
            clanId,
            clanName,
            userId,
            userName,
            removedBy,
            removedByName,
            reason,
            removedAt: new Date().toISOString()
        });
    }

    async publishClanOwnershipTransferred(clanId, oldOwnerId, oldOwnerName, newOwnerId, newOwnerName, clanName) {
        return this.publishEvent('clan.ownership.transferred', {
            clanId,
            clanName,
            oldOwnerId,
            oldOwnerName,
            newOwnerId,
            newOwnerName,
            transferredAt: new Date().toISOString()
        });
    }

    async publishClanMessageSent(clanId, userId, userName, messageType, content, messageId, clanName, clanMemberIds) {
        return this.publishEvent('clan.message.sent', {
            clanId,
            clanName,
            userId,
            userName,
            messageType,
            content,
            messageId,
            clanMemberIds,
            sentAt: new Date().toISOString()
        });
    }

    async publishClanReputationUpdated(clanId, oldScore, newScore, changeReason, clanName, headId) {
        return this.publishEvent('clan.reputation.updated', {
            clanId,
            clanName,
            oldScore,
            newScore,
            changeReason,
            headId,
            updatedAt: new Date().toISOString()
        });
    }

    async publishClanUpdated(clanId, updatedBy, updatedByName, changes, clanName, clanMemberIds) {
        return this.publishEvent('clan.updated', {
            clanId,
            clanName,
            updatedBy,
            updatedByName,
            changes,
            clanMemberIds,
            updatedAt: new Date().toISOString()
        });
    }

    async close() {
        try {
            if (this.connection) {
                await this.connection.close();
                this.isConnected = false;
                console.log('🔌 [Clan Service] RabbitMQ connection closed');
            }
        } catch (error) {
            console.error('❌ [Clan Service] Error closing RabbitMQ connection:', error);
        }
    }
}

module.exports = { RabbitMQService };
