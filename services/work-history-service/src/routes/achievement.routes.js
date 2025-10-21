const express = require('express');
const WorkHistoryService = require('../services/workHistory.service');
const Logger = require('../utils/logger');
const Joi = require('joi');

const router = express.Router();

/**
 * @route GET /api/achievements/user/:userId
 * @desc Get user's achievements with filtering
 * @access Public
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            type,
            category,
            verified = true,
            limit = 50,
            includeExpired = false
        } = req.query;

        const where = {
            userId: userId,
            ...(type && { type }),
            ...(category && { category }),
            ...(verified === 'true' && { verified: true })
        };

        // Filter out expired achievements unless requested
        if (!includeExpired) {
            where.OR = [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
            ];
        }

        const achievements = await WorkHistoryService.prisma.achievement.findMany({
            where,
            orderBy: [
                { achievedAt: 'desc' },
                { value: 'desc' }
            ],
            take: parseInt(limit)
        });

        // Group achievements by type for better presentation
        const groupedAchievements = {
            milestones: achievements.filter(a => a.type === 'milestone'),
            badges: achievements.filter(a => a.type === 'badge'),
            certifications: achievements.filter(a => a.type === 'certification'),
            streaks: achievements.filter(a => a.type === 'streak')
        };

        res.status(200).json({
            success: true,
            data: {
                achievements,
                grouped: groupedAchievements,
                counts: {
                    total: achievements.length,
                    milestones: groupedAchievements.milestones.length,
                    badges: groupedAchievements.badges.length,
                    certifications: groupedAchievements.certifications.length,
                    streaks: groupedAchievements.streaks.length
                }
            }
        });

    } catch (error) {
        Logger.errorWithContext('Error fetching achievements', error, { userId: req.params.userId });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch achievements'
        });
    }
});

/**
 * @route GET /api/achievements/leaderboard/:type
 * @desc Get achievement leaderboard
 * @access Public
 */
router.get('/leaderboard/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { limit = 50, category } = req.query;

        if (!['milestone', 'badge', 'certification', 'streak'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid achievement type'
            });
        }

        // Get top achievers by type
        const achievements = await WorkHistoryService.prisma.achievement.findMany({
            where: {
                type,
                verified: true,
                ...(category && { category }),
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            orderBy: [
                { value: 'desc' },
                { achievedAt: 'asc' }
            ],
            take: parseInt(limit)
        });

        // Group by user and get their best achievement of this type
        const userAchievements = {};
        achievements.forEach(achievement => {
            if (!userAchievements[achievement.userId] ||
                achievement.value > userAchievements[achievement.userId].value) {
                userAchievements[achievement.userId] = achievement;
            }
        });

        const leaderboard = Object.values(userAchievements)
            .sort((a, b) => {
                if (b.value !== a.value) return b.value - a.value;
                return new Date(a.achievedAt) - new Date(b.achievedAt);
            })
            .map((achievement, index) => ({
                rank: index + 1,
                userId: achievement.userId,
                achievement: {
                    title: achievement.title,
                    description: achievement.description,
                    value: achievement.value,
                    achievedAt: achievement.achievedAt
                }
            }));

        res.status(200).json({
            success: true,
            data: {
                type,
                category: category || 'all',
                leaderboard
            }
        });

    } catch (error) {
        Logger.errorWithContext('Error fetching achievement leaderboard', error, { type: req.params.type });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch achievement leaderboard'
        });
    }
});

/**
 * @route GET /api/achievements/stats/overview
 * @desc Get overall achievement statistics
 * @access Public
 */
router.get('/stats/overview', async (req, res) => {
    try {
        // Get achievement counts by type
        const achievementStats = await WorkHistoryService.prisma.achievement.groupBy({
            by: ['type'],
            where: {
                verified: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            _count: {
                id: true
            }
        });

        // Get recent achievements (last 30 days)
        const recentAchievements = await WorkHistoryService.prisma.achievement.findMany({
            where: {
                achievedAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                },
                verified: true
            },
            orderBy: { achievedAt: 'desc' },
            take: 10,
            select: {
                id: true,
                userId: true,
                type: true,
                title: true,
                achievedAt: true
            }
        });

        // Get top achievement categories
        const categoryStats = await WorkHistoryService.prisma.achievement.groupBy({
            by: ['category'],
            where: {
                verified: true,
                category: { not: null },
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            _count: {
                id: true
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            },
            take: 10
        });

        const stats = {
            totalAchievements: achievementStats.reduce((sum, stat) => sum + stat._count.id, 0),
            byType: achievementStats.reduce((acc, stat) => {
                acc[stat.type] = stat._count.id;
                return acc;
            }, {}),
            byCategory: categoryStats.map(stat => ({
                category: stat.category,
                count: stat._count.id
            })),
            recentAchievements
        };

        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        Logger.errorWithContext('Error fetching achievement stats', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch achievement statistics'
        });
    }
});

/**
 * @route POST /api/achievements/manual
 * @desc Manually award achievement (admin only)
 * @access Protected (Admin)
 */
router.post('/manual', async (req, res) => {
    try {
        const {
            userId,
            type,
            title,
            description,
            category,
            value,
            iconUrl,
            badgeUrl,
            expiresAt
        } = req.body;

        // Validate input
        const schema = Joi.object({
            userId: Joi.string().required(),
            type: Joi.string().valid('milestone', 'badge', 'certification', 'streak').required(),
            title: Joi.string().min(1).max(100).required(),
            description: Joi.string().min(1).max(500).required(),
            category: Joi.string().optional(),
            value: Joi.number().optional(),
            iconUrl: Joi.string().uri().optional(),
            badgeUrl: Joi.string().uri().optional(),
            expiresAt: Joi.date().optional()
        });

        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input',
                errors: error.details.map(detail => detail.message)
            });
        }

        // Check if similar achievement already exists
        const existing = await WorkHistoryService.prisma.achievement.findFirst({
            where: {
                userId: userId,
                title,
                type
            }
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'Similar achievement already exists for this user'
            });
        }

        // Create achievement
        const achievement = await WorkHistoryService.prisma.achievement.create({
            data: {
                userId: userId,
                type,
                title,
                description,
                category,
                value,
                iconUrl,
                badgeUrl,
                verified: true,
                verifiedBy: req.user?.id || 'admin',
                achievedAt: new Date(),
                expiresAt: expiresAt ? new Date(expiresAt) : null
            }
        });

        // Log manual achievement
        Logger.auditLog('manual_achievement_awarded', userId, {
            achievementId: achievement.id,
            awardedBy: req.user?.id || 'admin',
            achievementData: { type, title, category, value }
        });

        res.status(201).json({
            success: true,
            data: achievement,
            message: 'Achievement awarded successfully'
        });

    } catch (error) {
        Logger.errorWithContext('Error awarding manual achievement', error);
        res.status(500).json({
            success: false,
            message: 'Failed to award achievement'
        });
    }
});

/**
 * @route DELETE /api/achievements/:achievementId
 * @desc Revoke achievement (admin only)
 * @access Protected (Admin)
 */
router.delete('/:achievementId', async (req, res) => {
    try {
        const { achievementId } = req.params;
        const { reason } = req.body;

        const achievement = await WorkHistoryService.prisma.achievement.findUnique({
            where: { id: achievementId }
        });

        if (!achievement) {
            return res.status(404).json({
                success: false,
                message: 'Achievement not found'
            });
        }

        // Delete achievement
        await WorkHistoryService.prisma.achievement.delete({
            where: { id: achievementId }
        });

        // Log achievement revocation
        Logger.auditLog('achievement_revoked', achievement.userId, {
            achievementId,
            revokedBy: req.user?.id || 'admin',
            reason,
            achievementData: {
                type: achievement.type,
                title: achievement.title,
                value: achievement.value
            }
        });

        res.status(200).json({
            success: true,
            message: 'Achievement revoked successfully'
        });

    } catch (error) {
        Logger.errorWithContext('Error revoking achievement', error, { achievementId: req.params.achievementId });
        res.status(500).json({
            success: false,
            message: 'Failed to revoke achievement'
        });
    }
});

module.exports = router;
