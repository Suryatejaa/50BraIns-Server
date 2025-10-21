/**
 * Message service for handling clan chat and gig sharing
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class MessageService {
    // Create new message
    async createMessage(data) {
        const { content, userId, clanId, messageType = 'TEXT', clientMessageId } = data;

        if (!content || !userId || !clanId) {
            throw new Error('Message content, userId, and clanId are required');
        }

        // Check if message with this clientMessageId already exists
        if (clientMessageId) {
            const existingMessage = await prisma.clanMessage.findUnique({
                where: { clientMessageId }
            });

            if (existingMessage) {
                console.log(`⚠️ [Message Service] Message with clientMessageId ${clientMessageId} already exists, skipping duplicate`);
                return existingMessage;
            }
        }

        return await prisma.clanMessage.create({
            data: {
                content,
                userId,
                clanId,
                messageType,
                clientMessageId, // Include client message ID for deduplication
                isDelivered: false,
                readBy: [],
                readAt: []
            }
        });
    }

    // Get message by ID
    async getMessageById(messageId) {
        return await prisma.clanMessage.findUnique({
            where: { id: messageId }
        });
    }

    // Mark message as delivered
    async markAsDelivered(messageId, userId) {
        return await prisma.clanMessage.update({
            where: { id: messageId },
            data: {
                isDelivered: true,
                deliveredAt: new Date()
            }
        });
    }

    // Mark message as read by user
    async markAsRead(messageId, userId) {
        const message = await prisma.clanMessage.findUnique({
            where: { id: messageId }
        });

        if (!message) {
            throw new Error('Message not found');
        }

        // Check if user already read this message
        const readBy = message.readBy || [];
        const readAt = message.readAt || [];

        if (!readBy.includes(userId)) {
            readBy.push(userId);
            readAt.push(new Date().toISOString());
        }

        return await prisma.clanMessage.update({
            where: { id: messageId },
            data: {
                readBy,
                readAt
            }
        });
    }

    // Get read receipts for a message
    async getReadReceipts(messageId) {
        const message = await prisma.clanMessage.findUnique({
            where: { id: messageId },
            select: {
                readBy: true,
                readAt: true,
                userId: true // Message sender
            }
        });

        if (!message) {
            throw new Error('Message not found');
        }

        // Return read receipts with user IDs and timestamps
        const readers = [];
        if (message.readBy && message.readBy.length > 0) {
            for (let i = 0; i < message.readBy.length; i++) {
                const userId = message.readBy[i];
                const readAt = message.readAt[i];

                readers.push({
                    userId: userId,
                    readAt: readAt
                });
            }
        }

        return {
            messageId,
            senderId: message.userId,
            readers,
            totalReaders: readers.length
        };
    }

    // Soft delete message
    async deleteMessage(messageId, deletedBy) {
        return await prisma.clanMessage.update({
            where: { id: messageId },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy
            }
        });
    }

    // Get recent messages with delivery status (excluding deleted messages)
    async getRecentMessages(clanId, limit = 50) {
        return await prisma.clanMessage.findMany({
            where: {
                clanId,
                isDeleted: false
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit,
            select: {
                id: true,
                content: true,
                userId: true,
                clanId: true,
                messageType: true,
                createdAt: true,
                isDelivered: true,
                deliveredAt: true,
                readBy: true,
                readAt: true,
                isDeleted: true
            }
        });
    }

    // Get message delivery status
    async getMessageStatus(messageId) {
        const message = await prisma.clanMessage.findUnique({
            where: { id: messageId },
            select: {
                id: true,
                isDelivered: true,
                deliveredAt: true,
                readBy: true,
                readAt: true,
                isDeleted: true,
                deletedAt: true,
                deletedBy: true
            }
        });

        if (!message) {
            throw new Error('Message not found');
        }

        return {
            messageId: message.id,
            isDelivered: message.isDelivered,
            deliveredAt: message.deliveredAt,
            readCount: message.readBy ? message.readBy.length : 0,
            isDeleted: message.isDeleted,
            deletedAt: message.deletedAt,
            deletedBy: message.deletedBy
        };
    }

    // Get all messages for a clan (for admin purposes)
    async getClanMessages(clanId, limit = 100, offset = 0) {
        return await prisma.clanMessage.findMany({
            where: {
                clanId,
                isDeleted: false
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit,
            skip: offset
        });
    }

    // Get message statistics for a clan
    async getClanMessageStats(clanId) {
        const totalMessages = await prisma.clanMessage.count({
            where: {
                clanId,
                isDeleted: false
            }
        });

        const totalReadMessages = await prisma.clanMessage.count({
            where: {
                clanId,
                isDeleted: false,
                readBy: {
                    not: null
                }
            }
        });

        return {
            totalMessages,
            totalReadMessages,
            readRate: totalMessages > 0 ? (totalReadMessages / totalMessages) * 100 : 0
        };
    }

    // Bulk mark messages as delivered for a user
    async markMultipleAsDelivered(messageIds, userId) {
        const updates = messageIds.map(messageId =>
            prisma.clanMessage.update({
                where: { id: messageId },
                data: {
                    isDelivered: true,
                    deliveredAt: new Date()
                }
            })
        );

        return await prisma.$transaction(updates);
    }

    // Bulk mark messages as read for a user
    async markMultipleAsRead(messageIds, userId) {
        const updates = messageIds.map(messageId =>
            this.markAsRead(messageId, userId)
        );

        return await Promise.all(updates);
    }

    // Get detailed message with status information
    async getMessageWithDetails(messageId) {
        const message = await prisma.clanMessage.findUnique({
            where: { id: messageId }
        });

        if (!message) {
            throw new Error('Message not found');
        }

        return {
            id: message.id,
            content: message.content,
            userId: message.userId,
            clanId: message.clanId,
            messageType: message.messageType,
            createdAt: message.createdAt,
            isDelivered: message.isDelivered,
            deliveredAt: message.deliveredAt,
            readBy: message.readBy || [],
            readAt: message.readAt || [],
            isDeleted: message.isDeleted,
            deletedAt: message.deletedAt,
            deletedBy: message.deletedBy,
            metadata: message.metadata
        };
    }

    // Get message delivery details for all clan members
    async getMessageDeliveryDetails(messageId, clanId) {
        const message = await prisma.clanMessage.findUnique({
            where: { id: messageId }
        });

        if (!message) {
            throw new Error('Message not found');
        }

        // Get all clan members
        const clanMembers = await prisma.clanMember.findMany({
            where: { clanId }
        });

        const deliveryDetails = clanMembers.map(member => {
            const hasRead = message.readBy && message.readBy.includes(member.userId);
            const readAt = hasRead ?
                message.readAt[message.readBy.indexOf(member.userId)] : null;

            return {
                userId: member.userId,
                role: member.role,
                isDelivered: message.isDelivered,
                deliveredAt: message.deliveredAt,
                hasRead: hasRead,
                readAt: readAt
            };
        });

        return {
            messageId,
            senderId: message.userId,
            totalMembers: clanMembers.length,
            deliveredCount: message.isDelivered ? clanMembers.length : 0,
            readCount: message.readBy ? message.readBy.length : 0,
            deliveryDetails
        };
    }

    // Get recent messages for a clan
    async getRecentMessages(clanId, limit = 20) {
        try {
            console.log('📚 [Message Service] Getting recent messages for clan:', clanId, 'limit:', limit);

            const messages = await prisma.clanMessage.findMany({
                where: {
                    clanId,
                    isDeleted: false
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit,
                select: {
                    id: true,
                    content: true,
                    userId: true,
                    clanId: true,
                    messageType: true,
                    createdAt: true,
                    isDelivered: true,
                    deliveredAt: true,
                    readBy: true,
                    readAt: true,
                    isDeleted: true,
                    deletedAt: true,
                    deletedBy: true
                }
            });

            // Reverse to show oldest first (chronological order)
            const chronologicalMessages = messages.reverse();

            console.log('✅ [Message Service] Retrieved', chronologicalMessages.length, 'recent messages for clan:', clanId);

            return chronologicalMessages;

        } catch (error) {
            console.error('❌ [Message Service] Error getting recent messages:', error);
            throw error;
        }
    }

    // Get more messages for pagination (lazy loading)
    async getMoreMessages(clanId, page = 1, limit = 20) {
        try {
            console.log('📚 [Message Service] Getting more messages for clan:', clanId, 'page:', page, 'limit:', limit);

            const offset = (page - 1) * limit;

            const messages = await prisma.clanMessage.findMany({
                where: { clanId, isDeleted: false },
                orderBy: { createdAt: 'desc' },
                skip: offset,
                take: limit,
                select: {
                    id: true,
                    content: true,
                    userId: true,
                    clanId: true,
                    messageType: true,
                    createdAt: true,
                    isDelivered: true,
                    deliveredAt: true,
                    readBy: true,
                    readAt: true,
                    isDeleted: true
                }
            });

            const chronologicalMessages = messages.reverse();
            console.log('✅ [Message Service] Retrieved', chronologicalMessages.length, 'more messages for clan:', clanId, 'page:', page);
            return chronologicalMessages;
        } catch (error) {
            console.error('❌ [Message Service] Error getting more messages:', error);
            throw error;
        }
    }

    // Get clan message summary with user counts
    async getClanMessageSummary(clanId) {
        const totalMessages = await prisma.clanMessage.count({
            where: {
                clanId,
                isDeleted: false
            }
        });

        const deliveredMessages = await prisma.clanMessage.count({
            where: {
                clanId,
                isDeleted: false,
                isDelivered: true
            }
        });

        const readMessages = await prisma.clanMessage.count({
            where: {
                clanId,
                isDeleted: false,
                readBy: {
                    not: []
                }
            }
        });

        // Get unique users who have sent messages
        const activeUsers = await prisma.clanMessage.groupBy({
            by: ['userId'],
            where: {
                clanId,
                isDeleted: false
            },
            _count: {
                id: true
            }
        });

        return {
            totalMessages,
            deliveredMessages,
            readMessages,
            activeUsers: activeUsers.length,
            deliveryRate: totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0,
            readRate: totalMessages > 0 ? (readMessages / totalMessages) * 100 : 0
        };
    }
}

module.exports = new MessageService();
