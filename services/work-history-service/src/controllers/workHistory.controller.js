const WorkHistoryService = require('../services/workHistory.service');
const ReputationIntegrationService = require('../services/reputationIntegration.service');
const Logger = require('../utils/logger');
const Joi = require('joi');

class WorkHistoryController {
    /**
     * Get user's work history
     */
    async getUserWorkHistory(req, res) {
        try {
            const { userId } = req.params;
            const {
                category,
                skills,
                rating,
                verified,
                limit = 20,
                offset = 0,
                sortBy = 'completedAt',
                sortOrder = 'desc'
            } = req.query;

            // Validate query parameters
            const schema = Joi.object({
                category: Joi.string().optional(),
                skills: Joi.alternatives().try(
                    Joi.string(),
                    Joi.array().items(Joi.string())
                ).optional(),
                rating: Joi.number().min(1).max(5).optional(),
                verified: Joi.boolean().optional(),
                limit: Joi.number().min(1).max(100).default(20),
                offset: Joi.number().min(0).default(0),
                sortBy: Joi.string().valid('completedAt', 'clientRating', 'deliveryTime').default('completedAt'),
                sortOrder: Joi.string().valid('asc', 'desc').default('desc')
            });

            const { error, value } = schema.validate(req.query);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid query parameters',
                    errors: error.details.map(detail => detail.message)
                });
            }

            // Process skills parameter
            let skillsArray;
            if (value.skills) {
                skillsArray = Array.isArray(value.skills) ? value.skills : [value.skills];
            }

            const options = {
                ...value,
                skills: skillsArray
            };

            const workHistory = await WorkHistoryService.getUserWorkHistory(userId, options);

            // Get total count for pagination
            const totalCount = await WorkHistoryService.prisma.workRecord.count({
                where: {
                    userId,
                    ...(options.category && { category: options.category }),
                    ...(options.skills && { skills: { hasSome: options.skills } }),
                    ...(options.rating && { clientRating: { gte: options.rating } }),
                    ...(options.verified !== undefined && { verified: options.verified })
                }
            });

            res.status(200).json({
                success: true,
                data: {
                    workHistory,
                    pagination: {
                        total: totalCount,
                        limit: parseInt(value.limit),
                        offset: parseInt(value.offset),
                        hasMore: totalCount > (parseInt(value.offset) + parseInt(value.limit))
                    }
                }
            });

        } catch (error) {
            Logger.errorWithContext('Error fetching work history', error, { userId: req.params.userId });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch work history'
            });
        }
    }

    /**
     * Get user's work summary
     */
    async getUserWorkSummary(req, res) {
        try {
            const { userId } = req.params;

            const summary = await WorkHistoryService.getUserWorkSummary(userId);

            // Enhance with reputation data
            const reputationData = await ReputationIntegrationService.getUserReputationData(userId);

            res.status(200).json({
                success: true,
                data: {
                    summary,
                    reputation: reputationData
                }
            });

        } catch (error) {
            Logger.errorWithContext('Error fetching work summary', error, { userId: req.params.userId });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch work summary'
            });
        }
    }

    /**
     * Get user's skill proficiencies
     */
    async getUserSkills(req, res) {
        try {
            const { userId } = req.params;
            const { level, limit = 20 } = req.query;

            const where = {
                userId: userId,
                ...(level && { level })
            };

            const skills = await WorkHistoryService.prisma.skillProficiency.findMany({
                where,
                orderBy: [
                    { score: 'desc' },
                    { projectCount: 'desc' }
                ],
                take: parseInt(limit)
            });

            res.status(200).json({
                success: true,
                data: skills
            });

        } catch (error) {
            Logger.errorWithContext('Error fetching user skills', error, { userId: req.params.userId });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user skills'
            });
        }
    }

    /**
     * Get user's achievements
     */
    async getUserAchievements(req, res) {
        try {
            const { userId } = req.params;
            const { type, category, verified, limit = 50 } = req.query;

            const where = {
                userId: userId,
                ...(type && { type }),
                ...(category && { category }),
                ...(verified !== undefined && { verified: verified === 'true' })
            };

            const achievements = await WorkHistoryService.prisma.achievement.findMany({
                where,
                orderBy: { achievedAt: 'desc' },
                take: parseInt(limit)
            });

            res.status(200).json({
                success: true,
                data: achievements
            });

        } catch (error) {
            Logger.errorWithContext('Error fetching user achievements', error, { userId: req.params.userId });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch user achievements'
            });
        }
    }

    /**
     * Get detailed work record
     */
    async getWorkRecord(req, res) {
        try {
            const { workRecordId } = req.params;

            const workRecord = await WorkHistoryService.prisma.workRecord.findUnique({
                where: { id: workRecordId },
                include: {
                    portfolioItems: {
                        orderBy: { displayOrder: 'asc' }
                    }
                }
            });

            if (!workRecord) {
                return res.status(404).json({
                    success: false,
                    message: 'Work record not found'
                });
            }

            res.status(200).json({
                success: true,
                data: workRecord
            });

        } catch (error) {
            Logger.errorWithContext('Error fetching work record', error, { workRecordId: req.params.workRecordId });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch work record'
            });
        }
    }

    /**
     * Update work record verification status
     */
    async updateWorkVerification(req, res) {
        try {
            const { workRecordId } = req.params;
            const { verified, verifierNote } = req.body;

            // Validate input
            const schema = Joi.object({
                verified: Joi.boolean().required(),
                verifierNote: Joi.string().max(500).optional()
            });

            const { error } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid input',
                    errors: error.details.map(detail => detail.message)
                });
            }

            // Get work record
            const workRecord = await WorkHistoryService.prisma.workRecord.findUnique({
                where: { id: workRecordId }
            });

            if (!workRecord) {
                return res.status(404).json({
                    success: false,
                    message: 'Work record not found'
                });
            }

            // Update verification status
            const updatedRecord = await WorkHistoryService.prisma.workRecord.update({
                where: { id: workRecordId },
                data: {
                    verified,
                    verifiedBy: req.user?.id || 'system',
                    verificationDate: verified ? new Date() : null
                }
            });

            // Update work summary
            await WorkHistoryService.updateWorkSummary(workRecord.userId);

            // Notify reputation service
            await ReputationIntegrationService.updateWorkVerification(
                workRecordId,
                verified,
                req.user?.id || 'system'
            );

            // Log verification event
            Logger.auditLog('work_verification_updated', workRecord.userId, {
                workRecordId,
                verified,
                verifiedBy: req.user?.id || 'system',
                verifierNote
            });

            res.status(200).json({
                success: true,
                data: updatedRecord,
                message: `Work record ${verified ? 'verified' : 'unverified'} successfully`
            });

        } catch (error) {
            Logger.errorWithContext('Error updating work verification', error, {
                workRecordId: req.params.workRecordId
            });
            res.status(500).json({
                success: false,
                message: 'Failed to update work verification'
            });
        }
    }

    /**
     * Get work statistics for analytics
     */
    async getWorkStatistics(req, res) {
        try {
            const { userId } = req.params;
            const {
                startDate,
                endDate,
                groupBy = 'month'
            } = req.query;

            // Validate date parameters
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();

            if (start >= end) {
                return res.status(400).json({
                    success: false,
                    message: 'Start date must be before end date'
                });
            }

            // Get work records in date range
            const workRecords = await WorkHistoryService.prisma.workRecord.findMany({
                where: {
                    userId,
                    completedAt: {
                        gte: start,
                        lte: end
                    }
                },
                orderBy: { completedAt: 'asc' }
            });

            // Group data by specified period
            const groupedData = this.groupWorkRecords(workRecords, groupBy);

            // Calculate aggregate statistics
            const stats = {
                totalProjects: workRecords.length,
                averageRating: workRecords.filter(w => w.clientRating).length > 0
                    ? workRecords.filter(w => w.clientRating).reduce((sum, w) => sum + w.clientRating, 0) / workRecords.filter(w => w.clientRating).length
                    : 0,
                onTimeRate: workRecords.length > 0
                    ? (workRecords.filter(w => w.onTimeDelivery).length / workRecords.length) * 100
                    : 0,
                averageDeliveryTime: workRecords.filter(w => w.deliveryTime).length > 0
                    ? workRecords.filter(w => w.deliveryTime).reduce((sum, w) => sum + w.deliveryTime, 0) / workRecords.filter(w => w.deliveryTime).length
                    : 0,
                categories: this.getCategoryBreakdown(workRecords),
                skills: this.getSkillBreakdown(workRecords),
                timeline: groupedData
            };

            res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            Logger.errorWithContext('Error fetching work statistics', error, { userId: req.params.userId });
            res.status(500).json({
                success: false,
                message: 'Failed to fetch work statistics'
            });
        }
    }

    /**
     * Group work records by time period
     */
    groupWorkRecords(workRecords, groupBy) {
        const grouped = {};

        workRecords.forEach(record => {
            const date = new Date(record.completedAt);
            let key;

            switch (groupBy) {
                case 'day':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'week':
                    const week = this.getWeekNumber(date);
                    key = `${date.getFullYear()}-W${week}`;
                    break;
                case 'month':
                    key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                    break;
                case 'year':
                    key = date.getFullYear().toString();
                    break;
                default:
                    key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            }

            if (!grouped[key]) {
                grouped[key] = {
                    period: key,
                    count: 0,
                    totalRating: 0,
                    ratedCount: 0,
                    onTimeCount: 0,
                    totalDeliveryTime: 0,
                    deliveryTimeCount: 0
                };
            }

            const group = grouped[key];
            group.count++;

            if (record.clientRating) {
                group.totalRating += record.clientRating;
                group.ratedCount++;
            }

            if (record.onTimeDelivery) {
                group.onTimeCount++;
            }

            if (record.deliveryTime) {
                group.totalDeliveryTime += record.deliveryTime;
                group.deliveryTimeCount++;
            }
        });

        // Calculate averages and rates
        Object.values(grouped).forEach(group => {
            group.averageRating = group.ratedCount > 0 ? group.totalRating / group.ratedCount : 0;
            group.onTimeRate = group.count > 0 ? (group.onTimeCount / group.count) * 100 : 0;
            group.averageDeliveryTime = group.deliveryTimeCount > 0 ? group.totalDeliveryTime / group.deliveryTimeCount : 0;
        });

        return Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));
    }

    /**
     * Get week number of the year
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Get category breakdown
     */
    getCategoryBreakdown(workRecords) {
        const categories = {};
        workRecords.forEach(record => {
            categories[record.category] = (categories[record.category] || 0) + 1;
        });
        return Object.entries(categories)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Get skill breakdown
     */
    getSkillBreakdown(workRecords) {
        const skills = {};
        workRecords.forEach(record => {
            record.skills.forEach(skill => {
                skills[skill] = (skills[skill] || 0) + 1;
            });
        });
        return Object.entries(skills)
            .map(([skill, count]) => ({ skill, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 skills
    }

    /**
     * Create work record from external service (e.g., gig service)
     */
    async createWorkRecord(req, res) {
        try {
            const {
                userId,
                gigId,
                clientId,
                title,
                description,
                category,
                skills,
                completedAt,
                deliveryTime,
                budgetRange,
                actualBudget,
                clientRating,
                clientFeedback,
                onTimeDelivery,
                withinBudget,
                portfolioItems = []
            } = req.body;

            // Validate input with simplified schema
            const schema = Joi.object({
                userId: Joi.string().required(),
                gigId: Joi.string().optional(),
                clientId: Joi.string().required(),
                title: Joi.string().max(200).required(),
                description: Joi.string().max(1000).optional(),
                category: Joi.string().max(100).optional(), // Made optional
                skills: Joi.array().items(Joi.string()).default([]),
                completedAt: Joi.date().default(new Date()),
                deliveryTime: Joi.string().optional(),
                budgetRange: Joi.string().max(100).optional(),
                actualBudget: Joi.number().positive().optional(),
                clientRating: Joi.number().min(1).max(5).optional(),
                clientFeedback: Joi.string().max(1000).optional(),
                onTimeDelivery: Joi.boolean().default(true),
                withinBudget: Joi.boolean().default(true),
                // Simplified portfolio items structure
                portfolioItems: Joi.array().items(Joi.object({
                    type: Joi.string().valid('social_post', 'image', 'video', 'content', 'file', 'other').required(),
                    platform: Joi.string().max(50).optional(), // Instagram, TikTok, YouTube, etc.
                    content: Joi.string().max(500).optional(),
                    url: Joi.string().uri().optional(),
                    file: Joi.string().optional(),
                    description: Joi.string().max(200).optional()
                })).default([])
            });

            const { error, value } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid input data',
                    errors: error.details.map(detail => detail.message)
                });
            }

            // Create work record using the service
            const workRecord = await WorkHistoryService.recordCompletedWork(value);

            res.status(201).json({
                success: true,
                message: 'Work record created successfully',
                data: workRecord
            });

        } catch (error) {
            Logger.errorWithContext('Error creating work record', error, {
                userId: req.body.userId,
                gigId: req.body.gigId
            });
            res.status(500).json({
                success: false,
                message: 'Failed to create work record',
                error: error.message
            });
        }
    }
}

module.exports = new WorkHistoryController();
