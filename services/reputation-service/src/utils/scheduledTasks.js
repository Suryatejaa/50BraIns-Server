const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const ScoringEngine = require('./services/scoringEngine');
const LeaderboardService = require('./services/leaderboardService');
const winston = require('winston');

class ScheduledTasks {
    constructor() {
        this.prisma = new PrismaClient();
        this.scoringEngine = new ScoringEngine();
        this.leaderboardService = new LeaderboardService();
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/cron.log' }),
                new winston.transports.Console()
            ]
        });
    }

    /**
     * Initialize all scheduled tasks
     */
    async initTasks() {
        if (process.env.ENABLE_CRON_JOBS !== 'true') {
            this.logger.info('⏰ Cron jobs disabled');
            return;
        }

        this.logger.info('⏰ Initializing scheduled tasks...');

        // Update leaderboard cache every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            await this.updateLeaderboardCache();
        });

        // Recalculate all reputation scores daily at 2 AM
        cron.schedule('0 2 * * *', async () => {
            await this.recalculateAllScores();
        });

        // Apply score decay daily at 3 AM
        cron.schedule('0 3 * * *', async () => {
            await this.applyScoreDecay();
        });

        // Update clan reputation scores every hour
        cron.schedule('0 * * * *', async () => {
            await this.updateClanReputations();
        });

        // Clean up old activity logs weekly (Sunday at 1 AM)
        cron.schedule('0 1 * * 0', async () => {
            await this.cleanupOldLogs();
        });

        // Generate reputation reports weekly (Sunday at 4 AM)
        cron.schedule('0 4 * * 0', async () => {
            await this.generateWeeklyReports();
        });

        // Update tier distributions hourly
        cron.schedule('0 * * * *', async () => {
            await this.updateTierDistributions();
        });

        this.logger.info('✅ All scheduled tasks initialized');
    }

    /**
     * Update leaderboard cache
     */
    async updateLeaderboardCache() {
        try {
            this.logger.info('🔄 Starting leaderboard cache update...');
            await this.leaderboardService.updateLeaderboardCache();
            this.logger.info('✅ Leaderboard cache updated successfully');
        } catch (error) {
            this.logger.error('❌ Failed to update leaderboard cache:', error);
        }
    }

    /**
     * Recalculate all reputation scores
     */
    async recalculateAllScores() {
        try {
            this.logger.info('🔄 Starting full reputation recalculation...');

            const users = await this.prisma.reputationScore.findMany({
                select: { userId: true }
            });

            let processed = 0;
            const batchSize = 100;

            for (let i = 0; i < users.length; i += batchSize) {
                const batch = users.slice(i, i + batchSize);

                await Promise.all(
                    batch.map(async (user) => {
                        try {
                            await this.scoringEngine.updateUserReputation(user.userId, {
                                reason: 'daily_recalculation',
                                scheduled: true
                            });
                            processed++;
                        } catch (error) {
                            this.logger.error(`Failed to recalculate score for user ${user.userId}:`, error);
                        }
                    })
                );

                this.logger.info(`📊 Processed ${processed}/${users.length} users`);

                // Small delay to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            this.logger.info(`✅ Reputation recalculation completed. Processed ${processed} users`);
        } catch (error) {
            this.logger.error('❌ Failed to recalculate all scores:', error);
        }
    }

    /**
     * Apply score decay for inactive users
     */
    async applyScoreDecay() {
        try {
            this.logger.info('🍂 Starting score decay process...');
            await this.scoringEngine.applyScoreDecay();
            this.logger.info('✅ Score decay applied successfully');
        } catch (error) {
            this.logger.error('❌ Failed to apply score decay:', error);
        }
    }

    /**
     * Update clan reputation scores
     */
    async updateClanReputations() {
        try {
            this.logger.info('🏛️ Starting clan reputation update...');

            // Get all clans
            const clans = await this.prisma.clanReputation.findMany({
                select: { clanId: true }
            });

            for (const clan of clans) {
                try {
                    // Get all clan members' reputation scores
                    const memberScores = await this.prisma.reputationScore.findMany({
                        where: {
                            // Assuming we have a clan relationship
                            user: {
                                clanId: clan.clanId
                            }
                        },
                        select: {
                            finalScore: true,
                            tier: true
                        }
                    });

                    if (memberScores.length === 0) continue;

                    // Calculate clan statistics
                    const totalScore = memberScores.reduce((sum, score) => sum + score.totalScore, 0);
                    const averageScore = totalScore / memberScores.length;

                    // Calculate tier distribution
                    const tierCounts = memberScores.reduce((acc, score) => {
                        acc[score.level] = (acc[score.level] || 0) + 1;
                        return acc;
                    }, {});

                    // Determine clan tier based on average score
                    const clanTier = this.scoringEngine.calculateTier(averageScore);

                    // Update clan reputation
                    await this.prisma.clanReputation.update({
                        where: { clanId: clan.clanId },
                        data: {
                            totalGigs: memberScores.length,
                            totalScore,
                            avgMemberScore: averageScore,
                            level: clanTier,
                            lastUpdated: new Date()
                        }
                    });

                } catch (error) {
                    this.logger.error(`Failed to update reputation for clan ${clan.clanId}:`, error);
                }
            }

            this.logger.info(`✅ Updated reputation for ${clans.length} clans`);
        } catch (error) {
            this.logger.error('❌ Failed to update clan reputations:', error);
        }
    }

    /**
     * Clean up old activity logs and score history
     */
    async cleanupOldLogs() {
        try {
            this.logger.info('🧹 Starting log cleanup...');

            const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS) || 90;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            // Clean up old activity logs
            const deletedActivities = await this.prisma.activityLog.deleteMany({
                where: {
                    timestamp: {
                        lt: cutoffDate
                    }
                }
            });

            // Clean up old score history (keep more recent history)
            const historyRetentionDays = parseInt(process.env.HISTORY_RETENTION_DAYS) || 180;
            const historyCutoff = new Date();
            historyCutoff.setDate(historyCutoff.getDate() - historyRetentionDays);

            const deletedHistory = await this.prisma.scoreHistory.deleteMany({
                where: {
                    createdAt: {
                        lt: historyCutoff
                    }
                }
            });

            this.logger.info(`✅ Cleanup completed. Deleted ${deletedActivities.count} activity logs and ${deletedHistory.count} score history records`);
        } catch (error) {
            this.logger.error('❌ Failed to cleanup old logs:', error);
        }
    }

    /**
     * Generate weekly reputation reports
     */
    async generateWeeklyReports() {
        try {
            this.logger.info('📊 Generating weekly reputation reports...');

            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            // Top performers of the week
            const topPerformers = await this.prisma.scoreHistory.groupBy({
                by: ['userId'],
                where: {
                    createdAt: { gte: weekAgo },
                    scoreDelta: { gt: 0 }
                },
                _sum: {
                    scoreDelta: true
                },
                orderBy: {
                    _sum: {
                        scoreDelta: 'desc'
                    }
                },
                take: 10
            });

            // Most active users
            const mostActive = await this.prisma.activityLog.groupBy({
                by: ['userId'],
                where: {
                    timestamp: { gte: weekAgo }
                },
                _count: {
                    userId: true
                },
                orderBy: {
                    _count: {
                        userId: 'desc'
                    }
                },
                take: 10
            });

            // Tier changes
            const tierChanges = await this.prisma.scoreHistory.findMany({
                where: {
                    createdAt: { gte: weekAgo },
                    changeReason: 'tier_change'
                },
                include: {
                    user: {
                        select: {
                            username: true
                        }
                    }
                }
            });

            // Store the report
            const report = {
                week: weekAgo.toISOString().split('T')[0],
                topPerformers: topPerformers.map(p => ({
                    userId: p.userId,
                    scoreGain: p._sum.scoreDelta
                })),
                mostActive: mostActive.map(a => ({
                    userId: a.userId,
                    activities: a._count.userId
                })),
                tierChanges: tierChanges.length,
                generatedAt: new Date()
            };

            // You could store this in a reports table or send it somewhere
            this.logger.info('📊 Weekly report generated:', {
                topPerformers: topPerformers.length,
                mostActive: mostActive.length,
                tierChanges: tierChanges.length
            });

        } catch (error) {
            this.logger.error('❌ Failed to generate weekly reports:', error);
        }
    }

    /**
     * Update tier distributions for system optimization
     */
    async updateTierDistributions() {
        try {
            // Get current tier distribution
            const tierStats = await this.prisma.reputationScore.groupBy({
                by: ['tier'],
                _count: {
                    tier: true
                },
                _avg: {
                    finalScore: true
                },
                _min: {
                    finalScore: true
                },
                _max: {
                    finalScore: true
                }
            });

            // Update leaderboard cache with tier-specific data
            for (const tierStat of tierStats) {
                await this.leaderboardService.invalidateCache(`tier:${tierStat.tier}:*`);
            }

            // Log tier distribution for monitoring
            this.logger.info('📊 Tier distribution updated:',
                tierStats.reduce((acc, stat) => {
                    acc[stat.tier] = stat._count.tier;
                    return acc;
                }, {})
            );

        } catch (error) {
            this.logger.error('❌ Failed to update tier distributions:', error);
        }
    }

    /**
     * Handle emergency score reset (manual trigger only)
     */
    async emergencyScoreReset(userId, reason) {
        try {
            this.logger.warn(`🚨 Emergency score reset for user ${userId}. Reason: ${reason}`);

            const currentScore = await this.prisma.reputationScore.findUnique({
                where: { userId }
            });

            if (currentScore) {
                // Record the reset in history
                await this.prisma.scoreHistory.create({
                    data: {
                        userId,
                        previousScore: currentScore.finalScore,
                        newScore: 0,
                        scoreDelta: -currentScore.finalScore,
                        changeReason: 'emergency_reset',
                        eventData: { reason, resetBy: 'system' }
                    }
                });

                // Reset the score
                await this.prisma.reputationScore.update({
                    where: { userId },
                    data: {
                        baseScore: 0,
                        bonusScore: 0,
                        finalScore: 0,
                        tier: 'BRONZE',
                        badges: [],
                        lastActivityAt: new Date()
                    }
                });

                this.logger.warn(`✅ Emergency reset completed for user ${userId}`);
            }
        } catch (error) {
            this.logger.error(`❌ Failed emergency reset for user ${userId}:`, error);
        }
    }
}

module.exports = ScheduledTasks;
