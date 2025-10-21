/**
 * Clan Scoring System
 * Calculates comprehensive clan scores with 4 decimal point precision
 */

/**
 * Calculate comprehensive clan score with detailed metrics
 * @param {Object} clan - Clan object with all related data
 * @returns {number} Score with 4 decimal places (0.0000 - 100.0000)
 */
function calculateClanScore(clan) {
    try {
        const weights = {
            activity: 0.25,        // 25% - Recent activity and engagement
            reputation: 0.20,      // 20% - Reviews and ratings
            performance: 0.20,     // 20% - Gig completion and success
            growth: 0.15,          // 15% - Member growth and retention
            portfolio: 0.10,       // 10% - Portfolio quality and quantity
            social: 0.10           // 10% - Social presence and networking
        };

        // Activity Score (0-100)
        const activityScore = calculateActivityScore(clan);

        // Reputation Score (0-100)
        const reputationScore = calculateReputationScore(clan);

        // Performance Score (0-100)
        const performanceScore = calculatePerformanceScore(clan);

        // Growth Score (0-100)
        const growthScore = calculateGrowthScore(clan);

        // Portfolio Score (0-100)
        const portfolioScore = calculatePortfolioScore(clan);

        // Social Score (0-100)
        const socialScore = calculateSocialScore(clan);

        // Calculate weighted final score
        const finalScore = (
            activityScore * weights.activity +
            reputationScore * weights.reputation +
            performanceScore * weights.performance +
            growthScore * weights.growth +
            portfolioScore * weights.portfolio +
            socialScore * weights.social
        );

        // Ensure score is between 0 and 100 with 4 decimal places
        return Math.max(0, Math.min(100, parseFloat(finalScore.toFixed(4))));

    } catch (error) {
        console.error('Error calculating clan score:', error);
        return 0.0000;
    }
}

/**
 * Calculate activity score based on recent engagement
 */
function calculateActivityScore(clan) {
    let score = 0;

    // Base score for being active
    if (clan.isActive) score += 20;

    // Member activity
    const memberCount = clan._count?.members || clan.members?.length || 0;
    score += Math.min(30, memberCount * 3); // Max 30 points for members

    // Recent updates (within last 30 days)
    const daysSinceUpdate = clan.updatedAt ?
        Math.floor((new Date() - new Date(clan.updatedAt)) / (1000 * 60 * 60 * 24)) : 365;

    if (daysSinceUpdate <= 1) score += 20;
    else if (daysSinceUpdate <= 7) score += 15;
    else if (daysSinceUpdate <= 30) score += 10;
    else if (daysSinceUpdate <= 90) score += 5;

    // Analytics engagement
    if (clan.analytics?.profileViews > 0) {
        score += Math.min(20, Math.log10(clan.analytics.profileViews + 1) * 5);
    }

    // Verification bonus
    if (clan.isVerified) score += 10;

    return Math.min(100, score);
}

/**
 * Calculate reputation score based on reviews and ratings
 */
function calculateReputationScore(clan) {
    let score = 0;

    // Average rating score (0-5 scale converted to 0-50)
    if (clan.averageRating > 0) {
        score += (clan.averageRating / 5) * 50;
    }

    // Review count bonus
    const reviewCount = clan._count?.reviews || clan.reviews?.length || 0;
    score += Math.min(25, reviewCount * 2.5); // Max 25 points for reviews

    // Quality ratings from detailed reviews
    if (clan.reviews && clan.reviews.length > 0) {
        const totalQualityRating = clan.reviews.reduce((sum, review) => {
            return sum + (review.qualityRating || review.rating || 0);
        }, 0);
        const avgQuality = totalQualityRating / clan.reviews.length;
        score += (avgQuality / 5) * 15; // Max 15 points for quality
    }

    // Consistency bonus (ratings close to average)
    if (clan.reviews && clan.reviews.length > 1) {
        const ratings = clan.reviews.map(r => r.rating);
        const variance = calculateVariance(ratings);
        if (variance < 1) score += 10; // Low variance bonus
    }

    return Math.min(100, score);
}

/**
 * Calculate performance score based on gig success
 */
function calculatePerformanceScore(clan) {
    let score = 0;

    // Completion rate
    if (clan.totalGigs > 0) {
        const completionRate = clan.completedGigs / clan.totalGigs;
        score += completionRate * 40; // Max 40 points for completion rate
    }

    // Total gigs completed
    score += Math.min(25, clan.completedGigs * 2); // Max 25 points for volume

    // Revenue performance
    if (clan.totalRevenue > 0) {
        score += Math.min(20, Math.log10(clan.totalRevenue + 1) * 5); // Max 20 points for revenue
    }

    // Win rate from analytics
    if (clan.analytics?.gigWinRate > 0) {
        score += clan.analytics.gigWinRate * 15; // Max 15 points for win rate
    }

    return Math.min(100, score);
}

/**
 * Calculate growth score based on member and business growth
 */
function calculateGrowthScore(clan) {
    let score = 0;

    // Member count relative to max
    const memberCount = clan._count?.members || clan.members?.length || 1;
    const memberRatio = memberCount / (clan.maxMembers || 50);
    score += Math.min(30, memberRatio * 30); // Max 30 points for member ratio

    // Account age factor (newer clans get slight boost for growth potential)
    const accountAgeMonths = clan.createdAt ?
        Math.floor((new Date() - new Date(clan.createdAt)) / (1000 * 60 * 60 * 24 * 30)) : 0;

    if (accountAgeMonths < 6 && memberCount > 3) {
        score += 20; // New clan growth bonus
    } else if (accountAgeMonths >= 6) {
        score += Math.min(20, accountAgeMonths); // Established clan bonus
    }

    // Growth rate from analytics
    if (clan.analytics?.memberGrowthRate > 0) {
        score += Math.min(25, clan.analytics.memberGrowthRate * 25);
    }

    // Retention rate
    if (clan.analytics?.memberRetentionRate > 0) {
        score += clan.analytics.memberRetentionRate * 25; // Max 25 points
    }

    return Math.min(100, score);
}

/**
 * Calculate portfolio score based on portfolio quality and quantity
 */
function calculatePortfolioScore(clan) {
    let score = 0;

    // Portfolio item count
    const portfolioCount = clan._count?.portfolio || clan.portfolio?.length || 0;
    score += Math.min(40, portfolioCount * 8); // Max 40 points for quantity

    // Featured items bonus
    if (clan.portfolio) {
        const featuredCount = clan.portfolio.filter(item => item.isFeatured).length;
        score += featuredCount * 10; // 10 points per featured item
    }

    // Portfolio engagement
    if (clan.portfolio && clan.portfolio.length > 0) {
        const totalViews = clan.portfolio.reduce((sum, item) => sum + (item.views || 0), 0);
        const totalLikes = clan.portfolio.reduce((sum, item) => sum + (item.likes || 0), 0);

        score += Math.min(20, Math.log10(totalViews + 1) * 3);
        score += Math.min(20, Math.log10(totalLikes + 1) * 5);
    }

    // Portfolio images/videos
    const mediaCount = (clan.portfolioImages?.length || 0) + (clan.portfolioVideos?.length || 0);
    score += Math.min(20, mediaCount * 2);

    return Math.min(100, score);
}

/**
 * Calculate social score based on social presence and networking
 */
function calculateSocialScore(clan) {
    let score = 0;

    // Social media presence
    const socialAccounts = [
        clan.instagramHandle,
        clan.twitterHandle,
        clan.linkedinHandle,
        clan.website
    ].filter(Boolean).length;

    score += socialAccounts * 15; // 15 points per social account

    // Social engagement from analytics
    if (clan.analytics?.socialEngagement > 0) {
        score += Math.min(30, clan.analytics.socialEngagement * 30);
    }

    // Referral count
    if (clan.analytics?.referralCount > 0) {
        score += Math.min(20, clan.analytics.referralCount * 4);
    }

    // Contact information completeness
    if (clan.email) score += 10;
    if (clan.location) score += 5;
    if (clan.timezone) score += 5;

    return Math.min(100, score);
}

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(numbers) {
    if (numbers.length === 0) return 0;

    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
}

/**
 * Get score breakdown for debugging/transparency
 */
function getScoreBreakdown(clan) {
    return {
        activity: calculateActivityScore(clan),
        reputation: calculateReputationScore(clan),
        performance: calculatePerformanceScore(clan),
        growth: calculateGrowthScore(clan),
        portfolio: calculatePortfolioScore(clan),
        social: calculateSocialScore(clan),
        total: calculateClanScore(clan)
    };
}

/**
 * Rank clans by score with filters
 */
function rankClans(clans, filters = {}) {
    let filteredClans = [...clans];

    // Apply filters
    if (filters.category) {
        filteredClans = filteredClans.filter(clan =>
            clan.primaryCategory === filters.category ||
            (clan.categories && clan.categories.includes(filters.category))
        );
    }

    if (filters.location) {
        filteredClans = filteredClans.filter(clan =>
            clan.location && clan.location.toLowerCase().includes(filters.location.toLowerCase())
        );
    }

    if (filters.visibility) {
        filteredClans = filteredClans.filter(clan => clan.visibility === filters.visibility);
    }

    if (filters.isVerified !== undefined) {
        filteredClans = filteredClans.filter(clan => clan.isVerified === filters.isVerified);
    }

    if (filters.minMembers) {
        filteredClans = filteredClans.filter(clan => {
            const memberCount = clan._count?.members || clan.members?.length || 0;
            return memberCount >= filters.minMembers;
        });
    }

    if (filters.maxMembers) {
        filteredClans = filteredClans.filter(clan => {
            const memberCount = clan._count?.members || clan.members?.length || 0;
            return memberCount <= filters.maxMembers;
        });
    }

    // Calculate scores and rank
    const clansWithScores = filteredClans.map(clan => ({
        ...clan,
        score: calculateClanScore(clan),
        scoreBreakdown: getScoreBreakdown(clan)
    }));

    // Sort by score (highest first)
    clansWithScores.sort((a, b) => b.score - a.score);

    // Add ranking
    return clansWithScores.map((clan, index) => ({
        ...clan,
        rank: index + 1
    }));
}

module.exports = {
    calculateClanScore,
    getScoreBreakdown,
    rankClans,
    calculateActivityScore,
    calculateReputationScore,
    calculatePerformanceScore,
    calculateGrowthScore,
    calculatePortfolioScore,
    calculateSocialScore
};
