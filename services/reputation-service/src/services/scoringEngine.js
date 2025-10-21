const { PrismaClient } = require('@prisma/client');

class ScoringEngine {
    constructor() {
        this.prisma = new PrismaClient();
        this.scoreConfig = new Map();
        this.loadConfiguration();
    }

    async loadConfiguration() {
        try {
            // Load scoring configuration from database
            const configs = await this.prisma.scoreConfig.findMany({
                where: { isActive: true }
            });

            configs.forEach(config => {
                this.scoreConfig.set(config.configKey, config.configValue);
            });

            // Set default values if not in database
            this.setDefaultConfig();
            console.log('✅ [Reputation] Scoring configuration loaded');
        } catch (error) {
            console.error('❌ [Reputation] Failed to load scoring config:', error);
            this.setDefaultConfig();
        }
    }

    setDefaultConfig() {
        const defaults = {
            'GIG_COMPLETED': parseFloat(process.env.SCORE_GIG_COMPLETED) || 10,
            'GIG_POSTED': parseFloat(process.env.SCORE_GIG_POSTED) || 2,
            'BOOST_RECEIVED': parseFloat(process.env.SCORE_BOOST_RECEIVED) || 5,
            'BOOST_GIVEN': parseFloat(process.env.SCORE_BOOST_GIVEN) || 1,
            'RATING_MULTIPLIER': parseFloat(process.env.SCORE_RATING_MULTIPLIER) || 20,
            'PROFILE_VIEW': parseFloat(process.env.SCORE_PROFILE_VIEW) || 0.1,
            'CONNECTION_MADE': parseFloat(process.env.SCORE_CONNECTION) || 1,
            'APPLICATION_SUCCESS_BONUS': 15,
            'FAST_RESPONSE_BONUS': 5,
            'ON_TIME_COMPLETION_BONUS': 10,
            'VERIFICATION_BONUS': 50,
            'CLAN_CONTRIBUTION': 3
        };

        Object.entries(defaults).forEach(([key, value]) => {
            if (!this.scoreConfig.has(key)) {
                this.scoreConfig.set(key, value);
            }
        });
    }

    getScore(configKey) {
        return this.scoreConfig.get(configKey) || 0;
    }

    /**
     * Calculate reputation score based on user metrics
     */
    calculateReputationScore(metrics) {
        const {
            gigsCompleted = 0,
            gigsPosted = 0,
            boostsReceived = 0,
            boostsGiven = 0,
            averageRating = 0,
            profileViews = 0,
            connectionsMade = 0,
            applicationSuccess = 0,
            responseTime = 0,
            completionRate = 0,
            clanContributions = 0,
            isVerified = false
        } = metrics;

        // Base Score Calculation
        let baseScore = 0;

        // Core Activity Points
        baseScore += gigsCompleted * this.getScore('GIG_COMPLETED');
        baseScore += gigsPosted * this.getScore('GIG_POSTED');
        baseScore += boostsReceived * this.getScore('BOOST_RECEIVED');
        baseScore += boostsGiven * this.getScore('BOOST_GIVEN');
        baseScore += profileViews * this.getScore('PROFILE_VIEW');
        baseScore += connectionsMade * this.getScore('CONNECTION_MADE');
        baseScore += clanContributions * this.getScore('CLAN_CONTRIBUTION');

        // Rating Impact (significant multiplier)
        if (averageRating > 0) {
            baseScore += averageRating * this.getScore('RATING_MULTIPLIER');
        }

        // Bonus Score Calculation
        let bonusScore = 0;

        // Application Success Bonus (high success rate = reliability)
        if (applicationSuccess >= 0.8) {
            bonusScore += this.getScore('APPLICATION_SUCCESS_BONUS');
        }

        // Fast Response Bonus (response time < 4 hours)
        if (responseTime > 0 && responseTime <= 4) {
            bonusScore += this.getScore('FAST_RESPONSE_BONUS');
        }

        // On-time Completion Bonus (completion rate >= 95%)
        if (completionRate >= 0.95) {
            bonusScore += this.getScore('ON_TIME_COMPLETION_BONUS');
        }

        // Verification Bonus
        if (isVerified) {
            bonusScore += this.getScore('VERIFICATION_BONUS');
        }

        // Calculate final score
        const finalScore = Math.max(0, baseScore + bonusScore);

        return {
            totalScore: Math.round(finalScore * 100) / 100,
            reliabilityScore: 75, // Default values - can be enhanced later
            qualityScore: 75,
            communicationScore: 75,
            timelinessScore: 75,
            // Keep legacy fields for backward compatibility
            baseScore: Math.round(baseScore * 100) / 100,
            bonusScore: Math.round(bonusScore * 100) / 100,
            finalScore: Math.round(finalScore * 100) / 100
        };
    }

    /**
     * Calculate tier based on score
     */
    calculateTier(score) {
        const thresholds = {
            LEGEND: parseFloat(process.env.TIER_LEGEND_MIN) || 15000,
            DIAMOND: parseFloat(process.env.TIER_DIAMOND_MIN) || 5000,
            PLATINUM: parseFloat(process.env.TIER_PLATINUM_MIN) || 1500,
            GOLD: parseFloat(process.env.TIER_GOLD_MIN) || 500,
            SILVER: parseFloat(process.env.TIER_SILVER_MIN) || 100,
            BRONZE: parseFloat(process.env.TIER_BRONZE_MIN) || 0
        };

        for (const [tier, threshold] of Object.entries(thresholds)) {
            if (score >= threshold) {
                return tier;
            }
        }

        return 'BRONZE';
    }

    /**
     * Calculate badges based on achievements
     */
    calculateBadges(metrics, currentBadges = []) {
        const badges = new Set(currentBadges);
        const {
            gigsCompleted,
            averageRating,
            boostsReceived,
            applicationSuccess,
            completionRate,
            responseTime,
            isVerified
        } = metrics;

        // Achievement Badges
        if (gigsCompleted >= 100) badges.add('CENTURY_CREATOR');
        if (gigsCompleted >= 500) badges.add('LEGENDARY_CREATOR');
        if (averageRating >= 4.8) badges.add('EXCELLENCE_MASTER');
        if (averageRating >= 4.5) badges.add('QUALITY_PROFESSIONAL');
        if (boostsReceived >= 50) badges.add('COMMUNITY_FAVORITE');
        if (applicationSuccess >= 0.9) badges.add('RELIABLE_PARTNER');
        if (completionRate >= 0.98) badges.add('DEADLINE_CHAMPION');
        if (responseTime <= 2) badges.add('LIGHTNING_RESPONDER');
        if (isVerified) badges.add('VERIFIED_CREATOR');

        return Array.from(badges);
    }

    /**
     * Update reputation score for a user
     */
    async updateUserReputation(userId, eventData = {}) {
        try {
            console.log(`🔄 [Reputation] Updating score for user ${userId}`);

            // Get or create reputation record
            let reputation = await this.prisma.reputationScore.findUnique({
                where: { userId }
            });

            if (!reputation) {
                reputation = await this.prisma.reputationScore.create({
                    data: { userId }
                });
            }

            // Calculate new scores
            const scores = this.calculateReputationScore(reputation);
            const newTier = this.calculateTier(scores.finalScore);
            const newBadges = this.calculateBadges(reputation, reputation.badges);

            // Store previous score for history
            const previousScore = reputation.totalScore;

            // Update reputation
            const updatedReputation = await this.prisma.reputationScore.update({
                where: { userId },
                data: {
                    totalScore: scores.totalScore || scores.finalScore || 0,
                    reliabilityScore: scores.reliabilityScore || 0,
                    qualityScore: scores.qualityScore || 0,
                    communicationScore: scores.communicationScore || 0,
                    timelinessScore: scores.timelinessScore || 0,
                    level: newTier,
                    badges: newBadges,
                    lastUpdated: new Date()
                }
            });

            // Record score history if score changed
            const newScore = scores.totalScore || scores.finalScore || 0;
            if (Math.abs(newScore - previousScore) > 0.01) {
                await this.recordScoreHistory(
                    userId,
                    previousScore,
                    newScore,
                    eventData.reason || 'score_recalculation',
                    eventData.eventId || null,
                    eventData
                );
            }

            console.log(`✅ [Reputation] Updated ${userId}: ${previousScore} → ${newScore} (${newTier})`);
            return updatedReputation;

        } catch (error) {
            console.error(`❌ [Reputation] Failed to update score for ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Record score change history
     */
    async recordScoreHistory(userId, previousScore, newScore, reason, eventId = null, eventData = {}) {
        try {
            await this.prisma.scoreHistory.create({
                data: {
                    userId,
                    previousScore,
                    newScore,
                    scoreDelta: newScore - previousScore,
                    changeReason: reason,
                    eventId,
                    eventData: eventData || {}
                }
            });
        } catch (error) {
            console.error('❌ [Reputation] Failed to record score history:', error);
        }
    }

    /**
     * Apply score decay (reduce scores over time for inactive users)
     */
    async applyScoreDecay() {
        if (process.env.ENABLE_SCORE_DECAY !== 'true') {
            return;
        }

        try {
            const decayRate = parseFloat(process.env.DECAY_RATE) || 0.02;
            const decayIntervalDays = parseInt(process.env.DECAY_INTERVAL_DAYS) || 30;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - decayIntervalDays);

            // Find users with no recent activity
            const inactiveUsers = await this.prisma.reputationScore.findMany({
                where: {
                    lastActivityAt: {
                        lt: cutoffDate
                    },
                    finalScore: {
                        gt: 0
                    }
                }
            });

            console.log(`🍂 [Reputation] Applying decay to ${inactiveUsers.length} inactive users`);

            for (const user of inactiveUsers) {
                const decayAmount = user.finalScore * decayRate;
                const newScore = Math.max(0, user.finalScore - decayAmount);

                await this.prisma.reputationScore.update({
                    where: { userId: user.userId },
                    data: { finalScore: newScore }
                });

                await this.recordScoreHistory(
                    user.userId,
                    user.finalScore,
                    newScore,
                    'score_decay',
                    null,
                    { decayRate, inactiveDays: decayIntervalDays }
                );
            }

        } catch (error) {
            console.error('❌ [Reputation] Score decay failed:', error);
        }
    }
}

module.exports = ScoringEngine;
