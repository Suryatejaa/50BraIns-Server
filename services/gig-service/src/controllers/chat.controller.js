const { PrismaClient } = require('@prisma/client');
const { StatusCodes } = require('http-status-codes');
const amqp = require('amqplib');

const prisma = new PrismaClient();

// RabbitMQ configuration
class RabbitMQService {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.exchangeName = 'brains_events';
    }

    async connect() {
        try {
            if (this.connection && !this.connection.connection.destroyed) {
                return; // Already connected
            }

            const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
            this.connection = await amqp.connect(rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });

            console.log('✅ Connected to RabbitMQ for gig chat events');
        } catch (error) {
            console.warn('Failed to connect to RabbitMQ:', error.message);
        }
    }

    async publishChatEvent(eventType, data) {
        try {
            await this.connect();

            if (!this.channel) {
                console.warn('RabbitMQ channel not available');
                return;
            }

            const message = {
                eventType,
                data,
                timestamp: new Date().toISOString(),
                service: 'gig-service'
            };

            const routingKey = `chat.${eventType}`;

            this.channel.publish(
                this.exchangeName,
                routingKey,
                Buffer.from(JSON.stringify(message)),
                { persistent: true }
            );

            console.log(`📤 Published chat event: ${eventType}`);
        } catch (error) {
            console.warn('Failed to publish chat event:', error.message);
            // Don't throw - chat should work even if messaging fails
        }
    }
}

const rabbitmqService = new RabbitMQService();

/**
 * Send application conversation notification via RabbitMQ
 * Creates standard notifications like "New response on your application query"
 */
async function sendChatNotification(recipientId, eventType, data) {
    try {
        // Send to notification service for standard notification processing
        await rabbitmqService.publishChatEvent(eventType, {
            recipientId,
            timestamp: new Date().toISOString(),
            ...data
        });

        console.log(`📧 Notification sent: ${eventType} to user ${recipientId}`);
    } catch (error) {
        console.warn('Failed to send conversation notification:', error.message);
        // Don't throw error - conversation should work even if notifications fail
    }
}

class GigChatController {
    /**
     * Create or get existing conversation thread for an application
     * Works like ServiceNow incident conversation thread
     */
    async getOrCreateConversation(req, res) {
        try {
            const { applicationId } = req.params;
            const userId = req.user.id;

            // Verify application exists and user has access
            const application = await prisma.application.findUnique({
                where: { id: applicationId },
                include: {
                    gig: true
                }
            });

            if (!application) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Application not found'
                });
            }
            // Find existing chat for this application
            let chat = await prisma.gigChat.findUnique({
                where: { applicationId: applicationId },
                include: {
                    messages: {
                        orderBy: { createdAt: 'asc' }
                        // Get ALL messages, no limit
                    }
                }
            });

            // Debug: Check the raw count from database
            if (chat) {
                const messageCount = await prisma.gigChatMessage.count({
                    where: { chatId: chat.id }
                });
                console.log(`🔍 [ChatController] Direct message count for chat ${chat.id}: ${messageCount}`);
                console.log(`🔍 [ChatController] Messages from include: ${chat.messages ? chat.messages.length : 0}`);
            }

            // Check if user is either gig owner or applicant
            const isGigOwner = application.gig.postedById === userId;
            const isApplicant = application.applicantId === userId;

            if (!isGigOwner && !isApplicant) {
                return res.status(StatusCodes.FORBIDDEN).json({
                    success: false,
                    error: 'You do not have access to this chat'
                });
            }

            // Check if application is approved
            if (application.status !== 'APPROVED' && application.status !== 'SUBMITTED' && application.status !== 'CLOSED') {
                return res.status(StatusCodes.FORBIDDEN).json({
                    success: false,
                    error: 'Chat is only available for approved applications'
                });
            }

            // Create chat if it doesn't exist (use upsert to handle race conditions)
            if (!chat) {
                try {
                    chat = await prisma.gigChat.upsert({
                        where: { applicationId: applicationId },
                        update: {
                            // If chat exists, just update activity status
                            isActive: application.status !== 'CLOSED'
                        },
                        create: {
                            gigId: application.gigId,
                            applicationId: application.id,
                            gigOwnerId: application.gig.postedById,
                            applicantId: application.applicantId,
                            isActive: application.status !== 'CLOSED'
                        },
                        include: {
                            messages: {
                                orderBy: { createdAt: 'asc' }
                                // Get ALL messages, no limit
                            }
                        }
                    });
                } catch (upsertError) {
                    // If upsert fails, try to find the existing chat one more time
                    console.log('🔄 [ChatController] Upsert failed, trying to find existing chat:', upsertError.message);
                    chat = await prisma.gigChat.findUnique({
                        where: { applicationId: applicationId },
                        include: {
                            messages: {
                                orderBy: { createdAt: 'asc' }
                            }
                        }
                    });

                    if (!chat) {
                        throw upsertError; // Re-throw if still can't find chat
                    }
                }
            }

            // Mark messages as read for current user
            if (chat.messages && chat.messages.length > 0) {
                await prisma.gigChatMessage.updateMany({
                    where: {
                        chatId: chat.id,
                        senderId: { not: userId },
                        isRead: false
                    },
                    data: {
                        isRead: true,
                        readAt: new Date()
                    }
                });
            }

            // Debug: Log message counts
            console.log(`🔍 [ChatController] Chat ${chat.id} - Messages in DB: ${chat.messages ? chat.messages.length : 0}`);
            console.log(`🔍 [ChatController] Messages details:`, chat.messages?.map(m => ({ id: m.id, createdAt: m.createdAt, message: m.message.substring(0, 20) })));

            // Set cache control headers to prevent any HTTP caching
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Last-Modified': new Date().toUTCString()
            });
            res.json({
                success: true,
                data: {
                    conversation: {
                        id: chat.id,
                        gigId: chat.gigId,
                        applicationId: chat.applicationId,
                        status: application.status !== 'CLOSED' ? 'open' : 'closed',
                        userRole: isGigOwner ? 'gig_owner' : 'applicant',
                        subject: `Application Discussion: ${application.gig.title}`,
                        participants: {
                            gigOwner: {
                                id: application.gig.postedById,
                                name: application.gig.brandName || 'Brand',
                                type: 'brand'
                            },
                            applicant: {
                                id: application.applicantId,
                                type: application.applicantType,
                                name: 'Applicant'
                            }
                        },
                        stats: {
                            totalResponses: chat.messages ? chat.messages.length : 0,
                            lastActivity: chat.lastMessageAt || chat.createdAt,
                            createdAt: chat.createdAt
                        }
                    },
                    responses: (chat.messages || []).map((msg, index) => ({
                        ...msg,
                        responseNumber: index + 1,
                        fromType: msg.senderType,
                        timestamp: msg.createdAt
                    })),
                    responsesLoaded: chat.messages ? chat.messages.length : 0,
                    totalResponses: chat.messages ? chat.messages.length : 0
                },
                message: 'Conversation thread loaded successfully'
            });
        } catch (error) {
            console.error('Error getting/creating chat:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to get chat'
            });
        }
    }

    /**
     * Add a response to the conversation thread
     * Works like ServiceNow incident comments - each response triggers notification
     */
    async addResponse(req, res) {
        try {
            const { chatId } = req.params;
            const { message, messageType = 'text', fileUrl, fileName } = req.body;
            const userId = req.user.id;

            if (!message || message.trim() === '') {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    error: 'Response content is required'
                });
            }

            // Verify chat exists and user has access
            const chat = await prisma.gigChat.findUnique({
                where: { id: chatId },
                include: {
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            brandName: true,
                            postedById: true
                        }
                    },
                    application: {
                        select: {
                            id: true,
                            applicantId: true,
                            applicantType: true,
                            status: true
                        }
                    },
                    _count: {
                        select: {
                            messages: true
                        }
                    }
                }
            });

            if (!chat) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Conversation not found'
                });
            }

            // Check if user is participant
            const isGigOwner = chat.gigOwnerId === userId;
            const isApplicant = chat.applicantId === userId;

            if (!isGigOwner && !isApplicant) {
                return res.status(StatusCodes.FORBIDDEN).json({
                    success: false,
                    error: 'You do not have access to this conversation'
                });
            }

            // Check if conversation is active
            if (!chat.isActive) {
                return res.status(StatusCodes.FORBIDDEN).json({
                    success: false,
                    error: 'This conversation is closed and read-only'
                });
            }

            // Create the response
            const newResponse = await prisma.gigChatMessage.create({
                data: {
                    chatId: chat.id,
                    senderId: userId,
                    senderType: isGigOwner ? 'gig_owner' : 'applicant',
                    message: message.trim(),
                    messageType,
                    fileUrl,
                    fileName
                }
            });

            // Update conversation's last activity timestamp
            await prisma.gigChat.update({
                where: { id: chat.id },
                data: { lastMessageAt: new Date() }
            });

            // Send notification to the other participant
            const recipientId = isGigOwner ? chat.applicantId : chat.gigOwnerId;
            const responseNumber = chat._count.messages + 1;

            // Create notification event for the notification service
            await sendChatNotification(recipientId, 'application_response_added', {
                applicationId: chat.application.id,
                gigId: chat.gig.id,
                gigTitle: chat.gig.title,
                responseNumber,
                fromUserType: isGigOwner ? 'brand' : 'applicant',
                fromUserName: isGigOwner ? (chat.gig.brandName || 'Brand') : 'Applicant',
                snippet: message.trim().substring(0, 100) + (message.trim().length > 100 ? '...' : ''),
                conversationId: chat.id,
                totalResponses: responseNumber
            });

            // Debug: Log new message creation
            console.log(`📝 [ChatController] New message added to chat ${chatId}:`, {
                messageId: newResponse.id,
                chatId: chatId,
                senderId: userId,
                messageLength: message.length,
                totalMessagesNow: responseNumber
            });

            // Set cache control headers to prevent any HTTP caching
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Last-Modified': new Date().toUTCString()
            });

            res.status(StatusCodes.CREATED).json({
                success: true,
                data: {
                    response: newResponse,
                    conversationStats: {
                        totalResponses: responseNumber,
                        lastActivity: new Date().toISOString()
                    }
                },
                message: 'Response added successfully. Notification sent to other participant.'
            });
        } catch (error) {
            console.error('Error adding response:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to add response'
            });
        }
    }

    /**
     * Get conversation history with pagination
     * Like viewing ServiceNow incident activity history
     */
    async getConversationHistory(req, res) {
        try {
            const { chatId } = req.params;
            const { page = 1, limit = 50, before } = req.query;
            const userId = req.user.id;

            // Verify chat exists and user has access
            const chat = await prisma.gigChat.findUnique({
                where: { id: chatId }
            });

            if (!chat) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Chat not found'
                });
            }

            // Check if user is participant
            if (chat.gigOwnerId !== userId && chat.applicantId !== userId) {
                return res.status(StatusCodes.FORBIDDEN).json({
                    success: false,
                    error: 'You do not have access to this chat'
                });
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const whereClause = { chatId: chat.id };

            // Add before cursor for pagination
            if (before) {
                whereClause.createdAt = { lt: new Date(before) };
            }

            const messages = await prisma.gigChatMessage.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            });

            // Mark unread messages as read for current user
            await prisma.gigChatMessage.updateMany({
                where: {
                    chatId: chat.id,
                    senderId: { not: userId },
                    isRead: false
                },
                data: {
                    isRead: true,
                    readAt: new Date()
                }
            });

            res.json({
                success: true,
                data: {
                    responses: messages.reverse().map((msg, index) => ({
                        ...msg,
                        responseNumber: messages.length - index,
                        fromType: msg.senderType,
                        timestamp: msg.createdAt
                    })),
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        hasMore: messages.length === parseInt(limit)
                    }
                },
                message: 'Conversation history loaded successfully'
            });

            // Set cache control headers to prevent any HTTP caching
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Last-Modified': new Date().toUTCString()
            });

        } catch (error) {
            console.error('Error getting messages:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to get messages'
            });
        }
    }

    /**
     * Get user's conversation threads (like ServiceNow My Incidents)
     */
    async getUserConversations(req, res) {
        try {
            const userId = req.user.id;
            const { status = 'all' } = req.query;

            const whereClause = {
                OR: [
                    { gigOwnerId: userId },
                    { applicantId: userId }
                ]
            };

            if (status === 'active') {
                whereClause.isActive = true;
            } else if (status === 'readonly') {
                whereClause.isActive = false;
            }

            const chats = await prisma.gigChat.findMany({
                where: whereClause,
                include: {
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            brandName: true
                        }
                    },
                    application: {
                        select: {
                            id: true,
                            status: true,
                            applicantType: true
                        }
                    },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: {
                            id: true,
                            message: true,
                            senderId: true,
                            senderType: true,
                            messageType: true,
                            createdAt: true,
                            isRead: true
                        }
                    },
                    _count: {
                        select: {
                            messages: {
                                where: {
                                    senderId: { not: userId },
                                    isRead: false
                                }
                            }
                        }
                    }
                },
                orderBy: { lastMessageAt: 'desc' }
            });

            const formattedConversations = chats.map(chat => ({
                id: chat.id,
                applicationId: chat.applicationId,
                gigId: chat.gigId,
                subject: `Application Discussion: ${chat.gig.title}`,
                status: chat.isActive ? 'open' : 'closed',
                userRole: chat.gigOwnerId === userId ? 'gig_owner' : 'applicant',
                lastResponse: chat.messages[0] ? {
                    id: chat.messages[0].id,
                    content: chat.messages[0].message,
                    fromType: chat.messages[0].senderType,
                    timestamp: chat.messages[0].createdAt,
                    isRead: chat.messages[0].isRead
                } : null,
                unreadCount: chat._count.messages,
                stats: {
                    totalResponses: chat._count.messages || 0,
                    lastActivity: chat.lastMessageAt,
                    createdAt: chat.createdAt
                },
                participants: {
                    gigOwner: {
                        id: chat.gigOwnerId,
                        name: chat.gig.brandName || 'Brand'
                    },
                    applicant: {
                        id: chat.applicantId,
                        type: chat.application.applicantType
                    }
                }
            }));

            res.json({
                success: true,
                data: { conversations: formattedConversations },
                message: 'Conversation threads loaded successfully'
            });
        } catch (error) {
            console.error('Error getting user chats:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to get chats'
            });
        }
    }

    /**
     * Update chat status (admin function to close/open chat)
     */
    async updateChatStatus(req, res) {
        try {
            const { chatId } = req.params;
            const { isActive } = req.body;
            const userId = req.user.id;

            // Verify chat exists and user is gig owner
            const chat = await prisma.gigChat.findUnique({
                where: { id: chatId },
                include: { gig: true }
            });

            if (!chat) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Chat not found'
                });
            }

            // Only gig owner can update chat status
            if (chat.gigOwnerId !== userId) {
                return res.status(StatusCodes.FORBIDDEN).json({
                    success: false,
                    error: 'Only gig owner can update chat status'
                });
            }

            const updatedChat = await prisma.gigChat.update({
                where: { id: chatId },
                data: { isActive: Boolean(isActive) }
            });

            res.json({
                success: true,
                data: { chat: updatedChat },
                message: `Chat ${isActive ? 'activated' : 'set to read-only mode'}`
            });
        } catch (error) {
            console.error('Error updating chat status:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to update chat status'
            });
        }
    }

    /**
     * Get unread message count for user
     */
    async getUnreadCount(req, res) {
        try {
            const userId = req.user.id;

            const unreadCount = await prisma.gigChatMessage.count({
                where: {
                    senderId: { not: userId },
                    isRead: false,
                    chat: {
                        OR: [
                            { gigOwnerId: userId },
                            { applicantId: userId }
                        ]
                    }
                }
            });

            res.json({
                success: true,
                data: { unreadResponses: unreadCount },
                message: 'Unread response count retrieved successfully'
            });
        } catch (error) {
            console.error('Error getting unread count:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to get unread count'
            });
        }
    }
}

module.exports = new GigChatController();