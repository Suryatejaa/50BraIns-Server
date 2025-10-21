const { PrismaClient } = require('@prisma/client');
const EmailService = require('../utils/emailService');
const RabbitMQService = require('../utils/rabbitmq');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/errorHandler');

const prisma = new PrismaClient();

class AdminController {

    // === NOTIFICATION MANAGEMENT ===

    async getAllNotifications(req, res) {
        try {
            const {
                page = 1,
                limit = 50,
                type,
                category,
                read,
                sent,
                userId,
                priority,
                startDate,
                endDate,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const where = {
                ...(type && { type }),
                ...(category && { category }),
                ...(read !== undefined && { read: read === 'true' }),
                ...(sent !== undefined && { sent: sent === 'true' }),
                ...(userId && { userId }),
                ...(priority && { priority }),
                ...(startDate && endDate && {
                    createdAt: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                })
            };

            const [notifications, total] = await Promise.all([
                prisma.notification.findMany({
                    where,
                    orderBy: { [sortBy]: sortOrder },
                    skip,
                    take: parseInt(limit),
                    include: {
                        _count: true
                    }
                }),
                prisma.notification.count({ where })
            ]);

            res.json({
                success: true,
                data: {
                    notifications,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error getting all notifications (admin):', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve notifications'
            });
        }
    }

    async getStatistics(req, res) {
        try {
            const { days = 30 } = req.query;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

            const [
                totalNotifications,
                totalSent,
                totalRead,
                byType,
                byCategory,
                byPriority,
                recentActivity
            ] = await Promise.all([
                // Total notifications in period
                prisma.notification.count({
                    where: { createdAt: { gte: cutoffDate } }
                }),

                // Total sent
                prisma.notification.count({
                    where: {
                        sent: true,
                        createdAt: { gte: cutoffDate }
                    }
                }),

                // Total read
                prisma.notification.count({
                    where: {
                        read: true,
                        createdAt: { gte: cutoffDate }
                    }
                }),

                // By type
                prisma.notification.groupBy({
                    by: ['type'],
                    where: { createdAt: { gte: cutoffDate } },
                    _count: { id: true }
                }),

                // By category
                prisma.notification.groupBy({
                    by: ['category'],
                    where: { createdAt: { gte: cutoffDate } },
                    _count: { id: true }
                }),

                // By priority
                prisma.notification.groupBy({
                    by: ['priority'],
                    where: { createdAt: { gte: cutoffDate } },
                    _count: { id: true }
                }),

                // Recent activity (last 24 hours)
                this.getRecentActivity()
            ]);

            const readRate = totalNotifications > 0 ? (totalRead / totalNotifications * 100).toFixed(2) : 0;
            const sentRate = totalNotifications > 0 ? (totalSent / totalNotifications * 100).toFixed(2) : 0;

            res.json({
                success: true,
                data: {
                    period: `${days} days`,
                    overview: {
                        totalNotifications,
                        totalSent,
                        totalRead,
                        readRate: parseFloat(readRate),
                        sentRate: parseFloat(sentRate)
                    },
                    breakdown: {
                        byType: byType.reduce((acc, item) => {
                            acc[item.type] = item._count.id;
                            return acc;
                        }, {}),
                        byCategory: byCategory.reduce((acc, item) => {
                            acc[item.category] = item._count.id;
                            return acc;
                        }, {}),
                        byPriority: byPriority.reduce((acc, item) => {
                            acc[item.priority] = item._count.id;
                            return acc;
                        }, {})
                    },
                    recentActivity
                }
            });

        } catch (error) {
            logger.error('Error getting statistics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve statistics'
            });
        }
    }

    async getRecentActivity() {
        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);

        return await prisma.notification.findMany({
            where: { createdAt: { gte: last24Hours } },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                userId: true,
                type: true,
                category: true,
                title: true,
                priority: true,
                read: true,
                sent: true,
                createdAt: true
            }
        });
    }

    async getAnalytics(req, res) {
        try {
            const { timeframe = '7d' } = req.query;

            const timeframes = {
                '24h': 1,
                '7d': 7,
                '30d': 30,
                '90d': 90
            };

            const days = timeframes[timeframe] || 7;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            // Get daily stats
            const dailyStats = await this.getDailyStats(cutoffDate);

            // Get user engagement
            const userEngagement = await this.getUserEngagement(cutoffDate);

            // Get performance metrics
            const performance = await this.getPerformanceMetrics(cutoffDate);

            res.json({
                success: true,
                data: {
                    timeframe,
                    dailyStats,
                    userEngagement,
                    performance
                }
            });

        } catch (error) {
            logger.error('Error getting analytics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve analytics'
            });
        }
    }

    async getDailyStats(cutoffDate) {
        // This would ideally use a raw SQL query for better performance
        const notifications = await prisma.notification.findMany({
            where: { createdAt: { gte: cutoffDate } },
            select: {
                createdAt: true,
                read: true,
                sent: true,
                type: true,
                category: true
            }
        });

        // Group by day
        const dailyStats = {};
        notifications.forEach(notification => {
            const day = notification.createdAt.toISOString().split('T')[0];
            if (!dailyStats[day]) {
                dailyStats[day] = { sent: 0, read: 0, total: 0 };
            }
            dailyStats[day].total++;
            if (notification.sent) dailyStats[day].sent++;
            if (notification.read) dailyStats[day].read++;
        });

        return dailyStats;
    }

    async getUserEngagement(cutoffDate) {
        return await prisma.notification.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: cutoffDate } },
            _count: { id: true },
            _sum: { read: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10
        });
    }

    async getPerformanceMetrics(cutoffDate) {
        const [avgReadTime, channelPerformance] = await Promise.all([
            // Average time to read
            prisma.$queryRaw`
                SELECT AVG(EXTRACT(EPOCH FROM ("readAt" - "createdAt"))/3600) as avg_hours_to_read
                FROM notifications 
                WHERE "readAt" IS NOT NULL AND "createdAt" >= ${cutoffDate}
            `,

            // Channel performance
            prisma.notification.groupBy({
                by: ['channel'],
                where: { createdAt: { gte: cutoffDate } },
                _count: { id: true },
                _avg: { read: true }
            })
        ]);

        return {
            avgReadTime: avgReadTime[0]?.avg_hours_to_read || 0,
            channelPerformance
        };
    }

    // === BROADCAST OPERATIONS ===

    async sendBroadcast(req, res) {
        try {
            const {
                title,
                message,
                type = 'SYSTEM',
                category = 'SYSTEM',
                priority = 'MEDIUM',
                targetUsers = [], // Array of user IDs, empty means all users
                targetSegment, // 'all', 'active', 'clan_members', etc.
                sendEmail = false,
                emailTemplate,
                emailData = {}
            } = req.body;

            if (!title || !message) {
                throw new ValidationError('Title and message are required');
            }

            let userIds = targetUsers;

            // If no specific users, get based on segment
            if (userIds.length === 0) {
                switch (targetSegment) {
                    case 'all':
                        // This would need integration with user service to get all user IDs
                        userIds = await this.getAllUserIds();
                        break;
                    case 'active':
                        userIds = await this.getActiveUserIds();
                        break;
                    default:
                        throw new ValidationError('Target users or valid segment required');
                }
            }

            const notifications = userIds.map(userId => ({
                userId,
                type,
                category,
                title,
                message,
                priority,
                channel: 'IN_APP',
                metadata: { broadcast: true, adminId: req.user.id }
            }));

            // Send in batches
            const batchSize = 100;
            let totalSent = 0;

            for (let i = 0; i < notifications.length; i += batchSize) {
                const batch = notifications.slice(i, i + batchSize);

                try {
                    await prisma.notification.createMany({
                        data: batch,
                        skipDuplicates: true
                    });
                    totalSent += batch.length;
                } catch (error) {
                    logger.error('Failed to send batch:', error);
                }

                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            logger.notification('Broadcast sent', {
                adminId: req.user.id,
                targetUsers: userIds.length,
                sent: totalSent,
                title,
                type,
                category
            });

            res.json({
                success: true,
                data: {
                    totalTargeted: userIds.length,
                    totalSent,
                    message: 'Broadcast sent successfully'
                }
            });

        } catch (error) {
            logger.error('Error sending broadcast:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send broadcast'
            });
        }
    }

    async sendSystemAnnouncement(req, res) {
        try {
            const {
                title,
                message,
                priority = 'HIGH',
                expiresIn = 30, // days
                targetAll = true
            } = req.body;

            if (!title || !message) {
                throw new ValidationError('Title and message are required');
            }

            // Publish to RabbitMQ for processing
            const announcementData = {
                title,
                message,
                priority,
                expiresAt: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000),
                targetUsers: targetAll ? await this.getAllUserIds() : [],
                adminId: req.user.id
            };

            await RabbitMQService.publishNotification(
                'system.announcement',
                announcementData
            );

            logger.notification('System announcement queued', {
                adminId: req.user.id,
                title,
                priority,
                expiresIn
            });

            res.json({
                success: true,
                message: 'System announcement queued for delivery'
            });

        } catch (error) {
            logger.error('Error sending system announcement:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send system announcement'
            });
        }
    }

    // === TEMPLATE MANAGEMENT ===

    async getEmailTemplates(req, res) {
        try {
            const templates = await prisma.emailTemplate.findMany({
                orderBy: { createdAt: 'desc' }
            });

            res.json({
                success: true,
                data: templates
            });

        } catch (error) {
            logger.error('Error getting email templates:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve email templates'
            });
        }
    }

    async createEmailTemplate(req, res) {
        try {
            const {
                name,
                subject,
                htmlContent,
                textContent,
                variables,
                category,
                language = 'en'
            } = req.body;

            if (!name || !subject || !htmlContent) {
                throw new ValidationError('Name, subject, and htmlContent are required');
            }

            const template = await prisma.emailTemplate.create({
                data: {
                    name,
                    subject,
                    htmlContent,
                    textContent,
                    variables,
                    category,
                    language
                }
            });

            logger.email('Email template created', {
                templateId: template.id,
                name,
                adminId: req.user.id
            });

            res.status(201).json({
                success: true,
                data: template
            });

        } catch (error) {
            logger.error('Error creating email template:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create email template'
            });
        }
    }

    async updateEmailTemplate(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const template = await prisma.emailTemplate.update({
                where: { id },
                data: updateData
            });

            logger.email('Email template updated', {
                templateId: id,
                adminId: req.user.id
            });

            res.json({
                success: true,
                data: template
            });

        } catch (error) {
            if (error.code === 'P2025') {
                throw new NotFoundError('Email template not found');
            }
            logger.error('Error updating email template:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update email template'
            });
        }
    }

    async deleteEmailTemplate(req, res) {
        try {
            const { id } = req.params;

            await prisma.emailTemplate.delete({
                where: { id }
            });

            logger.email('Email template deleted', {
                templateId: id,
                adminId: req.user.id
            });

            res.json({
                success: true,
                message: 'Email template deleted successfully'
            });

        } catch (error) {
            if (error.code === 'P2025') {
                throw new NotFoundError('Email template not found');
            }
            logger.error('Error deleting email template:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete email template'
            });
        }
    }

    async testEmailTemplate(req, res) {
        try {
            const { id } = req.params;
            const { testEmail, testData = {} } = req.body;

            if (!testEmail) {
                throw new ValidationError('Test email address is required');
            }

            const template = await prisma.emailTemplate.findUnique({
                where: { id }
            });

            if (!template) {
                throw new NotFoundError('Email template not found');
            }

            // Send test email
            await EmailService.sendEmail({
                to: testEmail,
                subject: `[TEST] ${template.subject}`,
                html: template.htmlContent,
                templateData: testData
            });

            logger.email('Test email sent', {
                templateId: id,
                testEmail,
                adminId: req.user.id
            });

            res.json({
                success: true,
                message: 'Test email sent successfully'
            });

        } catch (error) {
            logger.error('Error sending test email:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send test email'
            });
        }
    }

    // === USER MANAGEMENT ===

    async getUserNotificationsAdmin(req, res) {
        try {
            const { userId } = req.params;
            const { limit = 50, includeDeleted = false } = req.query;

            const notifications = await prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit)
            });

            res.json({
                success: true,
                data: notifications
            });

        } catch (error) {
            logger.error('Error getting user notifications (admin):', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve user notifications'
            });
        }
    }

    async sendNotificationToUser(req, res) {
        try {
            const { userId } = req.params;
            const notificationData = {
                ...req.body,
                userId,
                metadata: {
                    ...req.body.metadata,
                    sentByAdmin: req.user.id
                }
            };

            const notification = await prisma.notification.create({
                data: notificationData
            });

            logger.notification('Admin sent notification to user', {
                notificationId: notification.id,
                targetUserId: userId,
                adminId: req.user.id
            });

            res.status(201).json({
                success: true,
                data: notification
            });

        } catch (error) {
            logger.error('Error sending notification to user (admin):', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send notification'
            });
        }
    }

    // === UTILITY METHODS ===

    async getAllUserIds() {
        // This would need integration with user service
        // For now, return empty array
        return [];
    }

    async getActiveUserIds() {
        // Get users who have been active in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const activeUsers = await prisma.notification.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
                read: true
            },
            distinct: ['userId'],
            select: { userId: true }
        });

        return activeUsers.map(user => user.userId);
    }

    // === SYSTEM MONITORING ===

    async getDetailedHealth(req, res) {
        try {
            const health = {
                database: await this.checkDatabaseHealth(),
                rabbitmq: await this.checkRabbitMQHealth(),
                email: await this.checkEmailHealth(),
                queues: await this.getQueueHealth(),
                performance: await this.getPerformanceHealth()
            };

            res.json({
                success: true,
                data: health
            });

        } catch (error) {
            logger.error('Error getting detailed health:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve health information'
            });
        }
    }

    async checkDatabaseHealth() {
        try {
            const start = Date.now();
            await prisma.$queryRaw`SELECT 1`;
            const responseTime = Date.now() - start;

            const notificationCount = await prisma.notification.count();

            return {
                status: 'healthy',
                responseTime,
                totalNotifications: notificationCount
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async checkRabbitMQHealth() {
        return {
            status: RabbitMQService.isConnected() ? 'healthy' : 'unhealthy',
            connected: RabbitMQService.isConnected()
        };
    }

    async checkEmailHealth() {
        try {
            const result = await EmailService.testConnection();
            return {
                status: result.success ? 'healthy' : 'unhealthy',
                ...result
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async getQueueHealth() {
        // This would require RabbitMQ management API integration
        return {
            status: 'unknown',
            message: 'Queue health monitoring not implemented'
        };
    }

    async getPerformanceHealth() {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        const recentNotifications = await prisma.notification.count({
            where: { createdAt: { gte: oneHourAgo } }
        });

        return {
            notificationsLastHour: recentNotifications,
            status: recentNotifications > 1000 ? 'high_load' : 'normal'
        };
    }

    // Additional methods for other admin routes would go here...
    async getQueueStatus(req, res) {
        res.json({
            success: true,
            message: 'Queue status monitoring not yet implemented'
        });
    }

    async getEmailStats(req, res) {
        res.json({
            success: true,
            message: 'Email stats not yet implemented'
        });
    }

    async retryFailedNotifications(req, res) {
        res.json({
            success: true,
            message: 'Retry failed notifications not yet implemented'
        });
    }

    async getServiceConfig(req, res) {
        res.json({
            success: true,
            message: 'Service config retrieval not yet implemented'
        });
    }

    async updateServiceConfig(req, res) {
        res.json({
            success: true,
            message: 'Service config update not yet implemented'
        });
    }

    async bulkCleanupNotifications(req, res) {
        res.json({
            success: true,
            message: 'Bulk cleanup not yet implemented'
        });
    }

    async exportNotifications(req, res) {
        res.json({
            success: true,
            message: 'Export notifications not yet implemented'
        });
    }

    async getEngagementReport(req, res) {
        res.json({
            success: true,
            message: 'Engagement report not yet implemented'
        });
    }

    async getDeliveryReport(req, res) {
        res.json({
            success: true,
            message: 'Delivery report not yet implemented'
        });
    }

    async getUserPreferencesAdmin(req, res) {
        res.json({
            success: true,
            message: 'User preferences admin view not yet implemented'
        });
    }

    async updateUserPreferencesAdmin(req, res) {
        res.json({
            success: true,
            message: 'User preferences admin update not yet implemented'
        });
    }
}

module.exports = new AdminController();
