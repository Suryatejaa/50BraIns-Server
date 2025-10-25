const { PrismaClient } = require('@prisma/client');
const EmailService = require('../utils/emailService');
const RabbitMQService = require('../utils/rabbitmq');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/errorHandler');

const prisma = new PrismaClient();

class NotificationController {

    // === USER NOTIFICATION ENDPOINTS ===

    async getUserNotifications(req, res) {
        try {
            const { userId } = req.params;
            const {
                page = 1,
                limit = 20,
                type,
                category,
                read,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const where = {
                userId,
                ...(type && { type })
            };

            // Handle read filter by checking if readAt exists
            if (read !== undefined) {
                if (read === 'true') {
                    where.readAt = { not: null };
                } else {
                    where.readAt = null;
                }
            }

            const [notifications, total] = await Promise.all([
                prisma.notification.findMany({
                    where,
                    orderBy: { [sortBy]: sortOrder },
                    skip,
                    take: parseInt(limit),
                    select: {
                        id: true,
                        type: true,
                        title: true,
                        message: true,
                        metadata: true,
                        readAt: true,
                        priority: true,
                        createdAt: true
                    }
                }),
                prisma.notification.count({ where })
            ]);

            const totalPages = Math.ceil(total / parseInt(limit));

            res.json({
                success: true,
                data: {
                    notifications,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages,
                        hasNext: parseInt(page) < totalPages,
                        hasPrev: parseInt(page) > 1
                    }
                }
            });

        } catch (error) {
            logger.error('Error getting user notifications:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve notifications'
            });
        }
    }

    async getUnreadNotifications(req, res) {
        try {
            const { userId } = req.params;
            const { limit = 10 } = req.query;

            const notifications = await prisma.notification.findMany({
                where: {
                    userId,
                    readAt: null
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit),
                select: {
                    id: true,
                    type: true,
                    title: true,
                    message: true,
                    metadata: true,
                    priority: true,
                    createdAt: true
                }
            });

            res.json({
                success: true,
                data: {
                    notifications,
                    count: notifications.length
                }
            });

        } catch (error) {
            logger.error('Error getting unread notifications:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve unread notifications'
            });
        }
    }

    async getNotificationCounts(req, res) {
        try {
            const { userId } = req.params;

            const [total, unread, byType] = await Promise.all([
                prisma.notification.count({ where: { userId } }),
                prisma.notification.count({ where: { userId, readAt: null } }),
                prisma.notification.groupBy({
                    by: ['type'],
                    where: { userId, readAt: null },
                    _count: { type: true }
                })
            ]);

            const unreadByType = byType.reduce((acc, item) => {
                acc[item.type] = item._count.type;
                return acc;
            }, {});

            res.json({
                success: true,
                data: {
                    total,
                    unread,
                    unreadByType
                }
            });

        } catch (error) {
            logger.error('Error getting notification counts:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve notification counts'
            });
        }
    }

    async markAsRead(req, res) {
        try {
            const { id } = req.params;

            const notification = await prisma.notification.update({
                where: { id },
                data: {
                    readAt: new Date()
                },
                select: {
                    id: true,
                    userId: true,
                    readAt: true
                }
            });

            logger.notification('Notification marked as read', {
                notificationId: id,
                userId: notification.userId
            });

            res.json({
                success: true,
                data: notification
            });

        } catch (error) {
            if (error.code === 'P2025') {
                throw new NotFoundError('Notification not found');
            }
            logger.error('Error marking notification as read:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to mark notification as read'
            });
        }
    }

    async markAllAsRead(req, res) {
        try {
            const { userId } = req.params;

            const result = await prisma.notification.updateMany({
                where: {
                    userId,
                    readAt: null
                },
                data: {
                    readAt: new Date()
                }
            });

            logger.notification('All notifications marked as read', {
                userId,
                count: result.count
            });

            res.json({
                success: true,
                data: {
                    markedAsRead: result.count
                }
            });

        } catch (error) {
            logger.error('Error marking all notifications as read:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to mark all notifications as read'
            });
        }
    }

    async deleteNotification(req, res) {
        try {
            const { id } = req.params;

            await prisma.notification.delete({
                where: { id }
            });

            logger.notification('Notification deleted', { notificationId: id });

            res.json({
                success: true,
                message: 'Notification deleted successfully'
            });

        } catch (error) {
            if (error.code === 'P2025') {
                throw new NotFoundError('Notification not found');
            }
            logger.error('Error deleting notification:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete notification'
            });
        }
    }

    async clearAllNotifications(req, res) {
        try {
            const { userId } = req.params;
            const { olderThan } = req.query; // Optional: only delete older than X days

            let where = { userId };

            if (olderThan) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan));
                where.createdAt = { lt: cutoffDate };
            }

            const result = await prisma.notification.deleteMany({ where });

            logger.notification('Notifications cleared', {
                userId,
                count: result.count,
                olderThan
            });

            res.json({
                success: true,
                data: {
                    deleted: result.count
                }
            });

        } catch (error) {
            logger.error('Error clearing notifications:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear notifications'
            });
        }
    }

    // === INTERNAL/ADMIN ENDPOINTS ===

    async sendNotification(req, res) {
        try {
            const {
                userId,
                type = 'SYSTEM',
                title,
                message,
                metadata = {},
                priority = 1,
                actionUrl,
                relatedId,
                relatedType,
                expiresAt,
                sendEmail = false,
                emailTemplate,
                emailData = {}
            } = req.body;

            // Validate required fields
            if (!userId || !title || !message) {
                throw new ValidationError('userId, title, and message are required');
            }

            // Create in-app notification
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type,
                    title,
                    message,
                    metadata,
                    priority,
                    actionUrl,
                    relatedId,
                    relatedType,
                    expiresAt
                }
            });

            // Send email if requested
            if (sendEmail && process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true') {
                try {
                    await EmailService.sendEmail({
                        to: emailData.email || 'user@example.com',
                        subject: title,
                        templateName: emailTemplate,
                        templateData: emailData,
                        html: emailData.html,
                        priority: priority.toLowerCase()
                    });

                    // Email sent successfully - could add email log here if needed

                } catch (emailError) {
                    logger.error('Failed to send email notification:', emailError);
                    // Don't fail the request, just log the error
                }
            }

            logger.notification('Notification sent', {
                notificationId: notification.id,
                userId,
                type,
                sendEmail
            });

            res.status(201).json({
                success: true,
                data: notification
            });

        } catch (error) {
            logger.error('Error sending notification:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send notification'
            });
        }
    }

    async sendBulkNotifications(req, res) {
        try {
            const { notifications } = req.body;

            if (!Array.isArray(notifications) || notifications.length === 0) {
                throw new ValidationError('notifications array is required');
            }

            const results = [];
            const batchSize = 10;

            for (let i = 0; i < notifications.length; i += batchSize) {
                const batch = notifications.slice(i, i + batchSize);

                const batchPromises = batch.map(async (notificationData) => {
                    try {
                        const notification = await prisma.notification.create({
                            data: {
                                type: 'SYSTEM',
                                priority: 1,
                                ...notificationData
                            }
                        });
                        return { success: true, id: notification.id };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                });

                const batchResults = await Promise.allSettled(batchPromises);
                results.push(...batchResults.map(r => r.value || r.reason));

                // Add small delay between batches
                if (i + batchSize < notifications.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            const successful = results.filter(r => r.success).length;
            const failed = results.length - successful;

            logger.notification('Bulk notifications sent', {
                total: notifications.length,
                successful,
                failed
            });

            res.json({
                success: true,
                data: {
                    total: notifications.length,
                    successful,
                    failed,
                    results
                }
            });

        } catch (error) {
            logger.error('Error sending bulk notifications:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send bulk notifications'
            });
        }
    }

    async previewEmailTemplate(req, res) {
        try {
            const { templateName } = req.params;
            const { sampleData = {} } = req.body;

            const templates = EmailService.getAvailableTemplates();

            if (!templates.includes(templateName)) {
                throw new NotFoundError('Email template not found');
            }

            // Use sample data for preview
            const defaultSampleData = {
                userName: 'John Doe',
                gigTitle: 'Sample Creative Project',
                gigDescription: 'This is a sample gig description for preview purposes.',
                gigBudget: '$500',
                clanName: 'Creative Minds',
                creditsAmount: 100,
                totalBalance: 500,
                ...sampleData
            };

            // Generate preview without actually sending
            res.json({
                success: true,
                data: {
                    templateName,
                    sampleData: defaultSampleData,
                    preview: 'Email template preview would be rendered here'
                }
            });

        } catch (error) {
            logger.error('Error previewing email template:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to preview email template'
            });
        }
    }

    // === PREFERENCES ===

    async getUserPreferences(req, res) {
        try {
            const { userId } = req.params;

            let preferences = await prisma.notificationPreference.findUnique({
                where: { userId }
            });

            // Create default preferences if none exist
            if (!preferences) {
                preferences = await prisma.notificationPreference.create({
                    data: { userId }
                });
            }

            res.json({
                success: true,
                data: preferences
            });

        } catch (error) {
            logger.error('Error getting user preferences:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve preferences'
            });
        }
    }

    async updateUserPreferences(req, res) {
        try {
            const { userId } = req.params;
            const updateData = req.body;

            const preferences = await prisma.notificationPreference.upsert({
                where: { userId },
                update: updateData,
                create: {
                    userId,
                    ...updateData
                }
            });

            logger.notification('User preferences updated', { userId });

            res.json({
                success: true,
                data: preferences
            });

        } catch (error) {
            logger.error('Error updating user preferences:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update preferences'
            });
        }
    }

    // === ANALYTICS ===

    async getUserAnalytics(req, res) {
        try {
            const { userId } = req.params;
            const { days = 30 } = req.query;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

            const analytics = await prisma.notification.groupBy({
                by: ['type'],
                where: {
                    userId,
                    createdAt: { gte: cutoffDate }
                },
                _count: { id: true }
            });

            const totalSent = await prisma.notification.count({
                where: {
                    userId,
                    createdAt: { gte: cutoffDate }
                }
            });

            const totalRead = await prisma.notification.count({
                where: {
                    userId,
                    readAt: { not: null },
                    createdAt: { gte: cutoffDate }
                }
            });

            res.json({
                success: true,
                data: {
                    period: `${days} days`,
                    totalSent,
                    totalRead,
                    readRate: totalSent > 0 ? (totalRead / totalSent * 100).toFixed(2) : 0,
                    breakdown: analytics
                }
            });

        } catch (error) {
            logger.error('Error getting user analytics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve analytics'
            });
        }
    }
}

module.exports = new NotificationController();