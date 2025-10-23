const axios = require('axios');
const Logger = require('../utils/logger');

class ReputationIntegrationService {
    constructor() {
        const NODE_ENV = process.env.NODE_ENV;
        this.reputationServiceUrl = NODE_ENV === 'production' ? process.env.REPUTATION_SERVICE_URL_PROD : process.env.REPUTATION_SERVICE_URL;
        this.rabbitMQService = null;
    }

    setRabbitMQService(rabbitMQService) {
        this.rabbitMQService = rabbitMQService;
    }

    /**
     * Notify reputation service of completed work
     */
    async notifyWorkCompleted(workRecord) {
        try {
            // Calculate reputation impact based on work quality
            const reputationImpact = this.calculateReputationImpact(workRecord);

            // Publish to RabbitMQ for reputation service
            if (this.rabbitMQService && this.rabbitMQService.publishEvent) {
                await this.rabbitMQService.publishEvent('reputation_events', 'work.completed', {
                    userId: workRecord.userId,
                    workRecordId: workRecord.id,
                    gigId: workRecord.gigId,
                    impact: reputationImpact,
                    workData: {
                        category: workRecord.category,
                        skills: workRecord.skills,
                        rating: workRecord.clientRating,
                        onTimeDelivery: workRecord.onTimeDelivery,
                        withinBudget: workRecord.withinBudget,
                        completedAt: workRecord.completedAt
                    }
                });

                Logger.info(`Notified reputation service of completed work: ${workRecord.id}`);
            } else {
                Logger.warn('RabbitMQ service not available for reputation notification');
            }

        } catch (error) {
            Logger.errorWithContext('Error notifying reputation service', error);
            // Don't throw - this is non-critical for work recording
        }
    }

    /**
     * Notify reputation service of achievement earned
     */
    async notifyAchievementEarned(userId, achievement) {
        try {
            const reputationImpact = this.calculateAchievementImpact(achievement);

            if (this.rabbitMQService && this.rabbitMQService.publishEvent) {
                await this.rabbitMQService.publishEvent('reputation_events', 'achievement.earned', {
                    userId,
                    achievementId: achievement.id,
                    impact: reputationImpact,
                    achievementData: {
                        type: achievement.type,
                        category: achievement.category,
                        title: achievement.title,
                        value: achievement.value,
                        achievedAt: achievement.achievedAt
                    }
                });

                Logger.info(`Notified reputation service of achievement: ${achievement.title} for user ${userId}`);
            } else {
                Logger.warn('RabbitMQ service not available for achievement notification');
            }

        } catch (error) {
            Logger.errorWithContext('Error notifying achievement to reputation service', error);
        }
    }

    /**
     * Get user's reputation score from reputation service
     */
    async getUserReputationScore(userId) {
        try {
            const response = await axios.get(`${this.reputationServiceUrl}/${userId}`, {
                timeout: 5000
            });

            return response.data.data.totalScore || 0;

        } catch (error) {
            Logger.errorWithContext('Error fetching user reputation score', error, { userId });
            return 0; // Default score if service unavailable
        }
    }

    /**
     * Get user's reputation tier from reputation service
     */
    async getUserReputationTier(userId) {
        try {
            const response = await axios.get(`${this.reputationServiceUrl}/${userId}`, {
                timeout: 5000
            });

            return response.data.data.level || 'NEWCOMER';

        } catch (error) {
            Logger.errorWithContext('Error fetching user reputation tier', error, { userId });
            return 'bronze'; // Default tier if service unavailable
        }
    }

    /**
     * Get user's badges from reputation service
     */
    async getUserBadges(userId) {
        try {
            const response = await axios.get(`${this.reputationServiceUrl}/${userId}`, {
                timeout: 5000
            });

            return response.data.data.badges || [];

        } catch (error) {
            Logger.errorWithContext('Error fetching user badges', error, { userId });
            return []; // Default empty array if service unavailable
        }
    }

    /**
     * Calculate reputation impact for completed work
     */
    calculateReputationImpact(workRecord) {
        let impact = 10; // Base impact for completing work

        // Rating bonus
        if (workRecord.clientRating) {
            impact += (workRecord.clientRating - 3) * 5; // -10 to +10 based on rating
        }

        // On-time delivery bonus
        if (workRecord.onTimeDelivery) {
            impact += 5;
        }

        // Within budget bonus
        if (workRecord.withinBudget) {
            impact += 3;
        }

        // Fast delivery bonus (if delivered in less than 3 days)
        if (workRecord.deliveryTime && workRecord.deliveryTime <= 3) {
            impact += 7;
        }

        // Skill variety bonus
        if (workRecord.skills && workRecord.skills.length > 3) {
            impact += 2;
        }

        // Ensure minimum positive impact for completed work
        return Math.max(impact, 1);
    }

    /**
     * Calculate reputation impact for achievements
     */
    calculateAchievementImpact(achievement) {
        const impactMap = {
            'milestone': {
                'projects_completed': (value) => {
                    if (value >= 100) return 50;
                    if (value >= 50) return 30;
                    if (value >= 25) return 20;
                    if (value >= 10) return 15;
                    if (value >= 5) return 10;
                    return 5;
                }
            },
            'badge': {
                'Quality Master': 25,
                'Reliable Deliverer': 20,
                'Fast Delivery': 15,
                'Budget Champion': 15,
                'Skill Specialist': 20,
                'Client Favorite': 25
            },
            'certification': 30,
            'streak': (value) => Math.min(value * 2, 20)
        };

        const typeMap = impactMap[achievement.type];
        if (!typeMap) return 5; // Default impact

        if (typeof typeMap === 'number') {
            return typeMap;
        }

        if (typeof typeMap === 'object') {
            const metricMap = typeMap[achievement.metric] || typeMap[achievement.title];
            if (typeof metricMap === 'function') {
                return metricMap(achievement.value);
            }
            if (typeof metricMap === 'number') {
                return metricMap;
            }
        }

        return 5; // Default impact
    }

    /**
     * Sync work history data with reputation service
     */
    async syncWorkHistoryData(userId) {
        try {
            // This could be called periodically to ensure data consistency
            if (this.rabbitMQService && this.rabbitMQService.publishEvent) {
                await this.rabbitMQService.publishEvent('reputation_events', 'work.sync.requested', {
                    userId,
                    timestamp: new Date(),
                    source: 'work_history_service'
                });

                Logger.info(`Requested work history sync for user ${userId}`);
            } else {
                Logger.warn('RabbitMQ service not available for sync request');
            }

        } catch (error) {
            Logger.errorWithContext('Error syncing work history data', error, { userId });
        }
    }

    /**
     * Get comprehensive reputation data for a user
     */
    async getUserReputationData(userId) {
        try {
            const response = await axios.get(`${this.reputationServiceUrl}/${userId}`, {
                timeout: 5000
            });

            return response.data.data || {
                totalScore: 0,
                level: 'NEWCOMER',
                badges: [],
                rank: null,
                trend: 'stable'
            };

        } catch (error) {
            Logger.errorWithContext('Error fetching user reputation data', error, { userId });
            return {
                totalScore: 0,
                level: 'NEWCOMER',
                badges: [],
                rank: null,
                trend: 'stable'
            };
        }
    }

    /**
     * Update work record verification status through reputation service
     */
    async updateWorkVerification(workRecordId, verified, verifiedBy) {
        try {
            if (this.rabbitMQService && this.rabbitMQService.publishEvent) {
                await this.rabbitMQService.publishEvent('reputation_events', 'work.verification.updated', {
                    workRecordId,
                    verified,
                    verifiedBy,
                    timestamp: new Date()
                });

                Logger.info(`Updated work verification for record ${workRecordId}: ${verified}`);
            } else {
                Logger.warn('RabbitMQ service not available for verification update');
            }

        } catch (error) {
            Logger.errorWithContext('Error updating work verification', error, { workRecordId, verified });
        }
    }

    /**
     * Report suspicious work activity
     */
    async reportSuspiciousActivity(userId, workRecordId, reason, reportedBy) {
        try {
            if (this.rabbitMQService && this.rabbitMQService.publishEvent) {
                await this.rabbitMQService.publishEvent('reputation_events', 'work.suspicious.reported', {
                    userId,
                    workRecordId,
                    reason,
                    reportedBy,
                    timestamp: new Date()
                });

                Logger.info(`Reported suspicious activity for user ${userId}, work record ${workRecordId}`);
            } else {
                Logger.warn('RabbitMQ service not available for suspicious activity report');
            }

        } catch (error) {
            Logger.errorWithContext('Error reporting suspicious activity', error, { userId, workRecordId });
        }
    }
}

module.exports = new ReputationIntegrationService();
