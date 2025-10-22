const { PrismaClient } = require('@prisma/client');
const Logger = require('../utils/logger');
const RedisService = require('./redis.service');
const ReputationIntegrationService = require('./reputationIntegration.service');

class WorkHistoryService {
    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * Record a completed work item
     */
    async recordCompletedWork(workData) {
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
            } = workData;

            // Check if work record already exists for this gig and user
            const existingRecord = await this.prisma.workRecord.findFirst({
                where: {
                    userId,
                    gigId
                }
            });

            if (existingRecord) {
                Logger.info(`Work record already exists for user ${userId} and gig ${gigId}, skipping duplicate creation`);
                return existingRecord;
            }

            // Create work record
            const workRecord = await this.prisma.workRecord.create({
                data: {
                    userId,
                    gigId,
                    clientId,
                    title,
                    description,
                    category,
                    skills,
                    completedAt: new Date(completedAt),
                    deliveryTime,
                    budgetRange,
                    actualBudget,
                    clientRating,
                    clientFeedback,
                    onTimeDelivery,
                    withinBudget,
                    portfolioItems: {
                        create: portfolioItems.map((item, index) => ({
                            title: item.title,
                            description: item.description || '',
                            type: item.type,
                            url: item.url || '#', // Provide default URL when null
                            thumbnailUrl: item.thumbnailUrl,
                            fileSize: item.fileSize,
                            format: item.format || 'unknown',
                            isPublic: item.isPublic !== false,
                            displayOrder: index
                        }))
                    }
                },
                include: {
                    portfolioItems: true
                }
            });

            // Update work summary
            await this.updateWorkSummary(userId);

            // Update skill proficiencies
            await this.updateSkillProficiencies(userId, skills, clientRating || 0);

            // Check for new achievements
            await this.checkAchievements(userId);

            // Log work event
            await this.logWorkEvent(userId, workRecord.id, 'project_completed', {
                gigId,
                clientId,
                rating: clientRating,
                onTime: onTimeDelivery,
                skills
            });

            // Notify reputation service
            await ReputationIntegrationService.notifyWorkCompleted(workRecord);

            // Clear cache
            await this.clearUserCache(userId);

            Logger.info(`Work record created for user ${userId}: ${workRecord.id}`);
            return workRecord;

        } catch (error) {
            Logger.error('Error recording completed work:', error);
            throw error;
        }
    }

    /**
     * Get user's work history with filtering and pagination
     */
    async getUserWorkHistory(userId, options = {}) {
        try {
            const {
                category,
                skills,
                rating,
                verified,
                limit = 20,
                offset = 0,
                sortBy = 'completedAt',
                sortOrder = 'desc'
            } = options;

            const where = {
                userId,
                ...(category && { category }),
                ...(skills && { skills: { hasSome: skills } }),
                ...(rating && { clientRating: { gte: rating } }),
                ...(verified !== undefined && { verified })
            };

            const workHistory = await this.prisma.workRecord.findMany({
                where,
                include: {
                    portfolioItems: {
                        where: { isPublic: true },
                        orderBy: { displayOrder: 'asc' }
                    }
                },
                orderBy: { [sortBy]: sortOrder },
                take: limit,
                skip: offset
            });

            return workHistory;

        } catch (error) {
            Logger.error('Error fetching work history:', error);
            throw error;
        }
    }

    /**
     * Get user's work summary
     */
    async getUserWorkSummary(userId) {
        try {
            const cacheKey = `work_summary:${userId}`;

            // Check cache first
            const cached = await RedisService.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            let summary = await this.prisma.workSummary.findUnique({
                where: { userId }
            });

            if (!summary) {
                // Create initial summary
                summary = await this.createInitialWorkSummary(userId);
            }

            // Cache for 1 hour
            await RedisService.setex(cacheKey, 3600, JSON.stringify(summary));

            return summary;

        } catch (error) {
            Logger.error('Error fetching work summary:', error);
            throw error;
        }
    }

    /**
     * Update work summary for a user
     */
    async updateWorkSummary(userId) {
        try {
            // Get all work records for user
            const workRecords = await this.prisma.workRecord.findMany({
                where: { userId }
            });

            if (workRecords.length === 0) {
                return;
            }

            // Calculate metrics
            const totalProjects = workRecords.length;
            const completedProjects = workRecords.filter(w => w.clientRating !== null).length;
            const ratingsGiven = workRecords.filter(w => w.clientRating !== null);

            const averageRating = ratingsGiven.length > 0
                ? ratingsGiven.reduce((sum, w) => sum + w.clientRating, 0) / ratingsGiven.length
                : 0;

            const onTimeDeliveries = workRecords.filter(w => w.onTimeDelivery).length;
            const onTimeDeliveryRate = totalProjects > 0 ? (onTimeDeliveries / totalProjects) * 100 : 0;

            const deliveryTimes = workRecords.filter(w => w.deliveryTime).map(w => w.deliveryTime);
            const averageDeliveryTime = deliveryTimes.length > 0
                ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
                : 0;

            // Calculate skill frequencies
            const skillCounts = {};
            workRecords.forEach(record => {
                record.skills.forEach(skill => {
                    skillCounts[skill] = (skillCounts[skill] || 0) + 1;
                });
            });

            const topSkills = Object.entries(skillCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([skill]) => skill);

            // Calculate category frequencies
            const categoryCounts = {};
            workRecords.forEach(record => {
                categoryCounts[record.category] = (categoryCounts[record.category] || 0) + 1;
            });

            const topCategories = Object.entries(categoryCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([category]) => category);

            // Calculate streak
            const sortedRecords = workRecords
                .filter(w => w.completedAt)
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

            let currentStreak = 0;
            let longestStreak = 0;
            let tempStreak = 0;

            // Simple streak calculation (consecutive weeks with completions)
            if (sortedRecords.length > 0) {
                const now = new Date();
                const lastCompletion = new Date(sortedRecords[0].completedAt);
                const daysSinceLastCompletion = Math.floor((now - lastCompletion) / (1000 * 60 * 60 * 24));

                if (daysSinceLastCompletion <= 7) {
                    currentStreak = 1; // At least current week
                }
            }

            // Calculate financial metrics from actualBudget values
            const budgetValues = workRecords
                .filter(w => w.actualBudget && w.actualBudget > 0)
                .map(w => w.actualBudget);

            const totalEarnings = budgetValues.length > 0
                ? budgetValues.reduce((sum, amount) => sum + amount, 0)
                : 0;

            const averageProjectValue = budgetValues.length > 0
                ? totalEarnings / budgetValues.length
                : 0;

            const highestProjectValue = budgetValues.length > 0
                ? Math.max(...budgetValues)
                : 0;

            // Update or create summary
            const summaryData = {
                totalProjects,
                completedProjects,
                averageRating: Math.round(averageRating * 100) / 100,
                totalRatings: ratingsGiven.length,
                fiveStarCount: ratingsGiven.filter(w => w.clientRating === 5).length,
                fourStarCount: ratingsGiven.filter(w => w.clientRating >= 4 && w.clientRating < 5).length,
                onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 100) / 100,
                averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100,
                fastestDelivery: deliveryTimes.length > 0 ? Math.min(...deliveryTimes) : null,
                // Financial metrics
                totalEarnings: Math.round(totalEarnings * 100) / 100,
                averageProjectValue: Math.round(averageProjectValue * 100) / 100,
                highestProjectValue: Math.round(highestProjectValue * 100) / 100,
                currentStreak,
                longestStreak: Math.max(longestStreak, currentStreak),
                lastCompletionDate: sortedRecords.length > 0 ? sortedRecords[0].completedAt : null,
                topSkills,
                topCategories,
                lastActiveDate: new Date(),
                verifiedProjectCount: workRecords.filter(w => w.verified).length
            };

            const summary = await this.prisma.workSummary.upsert({
                where: { userId },
                update: summaryData,
                create: {
                    userId,
                    ...summaryData
                }
            });

            // Clear cache
            await this.clearUserCache(userId);

            return summary;

        } catch (error) {
            Logger.error('Error updating work summary:', error);
            throw error;
        }
    }

    /**
     * Update skill proficiencies based on completed work
     */
    async updateSkillProficiencies(userId, skills, rating) {
        try {
            for (const skill of skills) {
                await this.prisma.skillProficiency.upsert({
                    where: {
                        userId_skill: { userId: userId, skill }
                    },
                    update: {
                        projectCount: { increment: 1 },
                        totalRating: { increment: rating },
                        averageRating: {
                            set: await this.calculateSkillAverage(userId, skill, rating)
                        },
                        lastUsed: new Date()
                    },
                    create: {
                        userId: userId,
                        skill,
                        level: 'beginner',
                        score: Math.min(rating * 20, 100), // Convert 5-star to 100-point scale
                        projectCount: 1,
                        totalRating: rating,
                        averageRating: rating,
                        lastUsed: new Date()
                    }
                });
            }

            // Update skill levels based on project count and ratings
            await this.updateSkillLevels(userId, skills);

        } catch (error) {
            Logger.error('Error updating skill proficiencies:', error);
            throw error;
        }
    }

    /**
     * Calculate average rating for a skill
     */
    async calculateSkillAverage(userId, skill, newRating) {
        try {
            const current = await this.prisma.skillProficiency.findUnique({
                where: { userId_skill: { userId: userId, skill } }
            });

            if (!current) return newRating;

            const newTotal = current.totalRating + newRating;
            const newCount = current.projectCount + 1;

            return Math.round((newTotal / newCount) * 100) / 100;

        } catch (error) {
            Logger.error('Error calculating skill average:', error);
            return newRating;
        }
    }

    /**
     * Update skill levels based on experience
     */
    async updateSkillLevels(userId, skills) {
        try {
            for (const skill of skills) {
                const proficiency = await this.prisma.skillProficiency.findUnique({
                    where: { userId_skill: { userId: userId, skill } }
                });

                if (!proficiency) continue;

                let newLevel = 'beginner';
                let newScore = proficiency.score;

                // Determine level based on projects and rating
                if (proficiency.projectCount >= 20 && proficiency.averageRating >= 4.5) {
                    newLevel = 'expert';
                    newScore = Math.min(proficiency.averageRating * 20, 100);
                } else if (proficiency.projectCount >= 10 && proficiency.averageRating >= 4.0) {
                    newLevel = 'advanced';
                    newScore = Math.min(proficiency.averageRating * 18, 90);
                } else if (proficiency.projectCount >= 5 && proficiency.averageRating >= 3.5) {
                    newLevel = 'intermediate';
                    newScore = Math.min(proficiency.averageRating * 16, 80);
                }

                await this.prisma.skillProficiency.update({
                    where: { userId_skill: { userId: userId, skill } },
                    data: { level: newLevel, score: newScore }
                });
            }

        } catch (error) {
            Logger.error('Error updating skill levels:', error);
            throw error;
        }
    }

    /**
     * Check and award achievements
     */
    async checkAchievements(userId) {
        try {
            const summary = await this.prisma.workSummary.findUnique({
                where: { userId }
            });

            if (!summary) return;

            const achievements = [];

            // Project milestone achievements
            const milestones = [1, 5, 10, 25, 50, 100];
            for (const milestone of milestones) {
                if (summary.completedProjects >= milestone) {
                    const existing = await this.prisma.achievement.findFirst({
                        where: {
                            userId: userId,
                            type: 'milestone',
                            metric: 'projects_completed',
                            value: milestone
                        }
                    });

                    if (!existing) {
                        achievements.push({
                            userId,
                            type: 'milestone',
                            title: `${milestone} Projects Completed`,
                            description: `Completed ${milestone} successful projects`,
                            category: 'volume',
                            metric: 'projects_completed',
                            value: milestone,
                            threshold: milestone,
                            achievedAt: new Date()
                        });
                    }
                }
            }

            // Quality achievements
            if (summary.averageRating >= 4.8 && summary.totalRatings >= 10) {
                const existing = await this.prisma.achievement.findFirst({
                    where: {
                        userId: userId,
                        type: 'badge',
                        title: 'Quality Master'
                    }
                });

                if (!existing) {
                    achievements.push({
                        userId: userId,
                        type: 'badge',
                        title: 'Quality Master',
                        description: 'Maintained 4.8+ star average with 10+ ratings',
                        category: 'quality',
                        metric: 'average_rating',
                        value: summary.averageRating,
                        threshold: 4.8,
                        achievedAt: new Date()
                    });
                }
            }

            // Delivery achievements
            if (summary.onTimeDeliveryRate >= 95 && summary.completedProjects >= 10) {
                const existing = await this.prisma.achievement.findFirst({
                    where: {
                        userId: userId,
                        type: 'badge',
                        title: 'Reliable Deliverer'
                    }
                });

                if (!existing) {
                    achievements.push({
                        userId: userId,
                        type: 'badge',
                        title: 'Reliable Deliverer',
                        description: '95%+ on-time delivery rate with 10+ projects',
                        category: 'delivery',
                        metric: 'on_time_rate',
                        value: summary.onTimeDeliveryRate,
                        threshold: 95,
                        achievedAt: new Date()
                    });
                }
            }

            // Create achievements
            if (achievements.length > 0) {
                await this.prisma.achievement.createMany({
                    data: achievements
                });

                // Log achievement events
                for (const achievement of achievements) {
                    await this.logWorkEvent(userId, null, 'achievement_earned', {
                        achievementType: achievement.type,
                        achievementTitle: achievement.title,
                        metric: achievement.metric,
                        value: achievement.value
                    });
                }

                Logger.info(`Awarded ${achievements.length} achievements to user ${userId}`);
            }

        } catch (error) {
            Logger.error('Error checking achievements:', error);
            throw error;
        }
    }

    /**
     * Log work-related events
     */
    async logWorkEvent(userId, workRecordId, eventType, eventData, reputationImpact = null) {
        try {
            await this.prisma.workEvent.create({
                data: {
                    userId,
                    workRecordId,
                    eventType,
                    eventData,
                    source: 'work_history_service',
                    reputationImpact
                }
            });

        } catch (error) {
            Logger.error('Error logging work event:', error);
            // Don't throw - this is non-critical
        }
    }

    /**
     * Create initial work summary for new users
     */
    async createInitialWorkSummary(userId) {
        try {
            return await this.prisma.workSummary.create({
                data: {
                    userId,
                    totalProjects: 0,
                    completedProjects: 0,
                    averageRating: 0,
                    totalRatings: 0,
                    onTimeDeliveryRate: 0,
                    averageDeliveryTime: 0,
                    currentStreak: 0,
                    longestStreak: 0,
                    topSkills: [],
                    topCategories: [],
                    verificationLevel: 'unverified'
                }
            });

        } catch (error) {
            Logger.error('Error creating initial work summary:', error);
            throw error;
        }
    }

    /**
     * Clear user-related cache
     */
    async clearUserCache(userId) {
        try {
            const keys = [
                `work_summary:${userId}`,
                `work_history:${userId}`,
                `achievements:${userId}`,
                `skills:${userId}`
            ];

            for (const key of keys) {
                await RedisService.del(key);
            }

        } catch (error) {
            Logger.error('Error clearing user cache:', error);
            // Don't throw - this is non-critical
        }
    }
}

module.exports = new WorkHistoryService();
