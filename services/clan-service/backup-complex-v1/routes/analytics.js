/**
 * Analytics Routes
 * Clan performance metrics and insights
 */

const express = require('express');
const router = express.Router();
const { asyncHandler, requireAuth } = require('../middleware');
const analyticsController = require('../controllers/analyticsController');

// Simplified analytics route - placeholder for future implementation
router.get('/', asyncHandler(async (req, res) => {
    res.json({ success: true, message: 'Analytics endpoint - coming soon', data: {}, timestamp: new Date().toISOString() });
}));

// Clan analytics
router.get('/clan/:clanId', requireAuth, (req, res) => analyticsController.getClanAnalytics(req, res));

// Integration proxies
router.post('/clan/:clanId/boost', requireAuth, analyticsController.boostClanVisibility);
router.post('/clan/:clanId/contribute', requireAuth, analyticsController.contributeCredits);
router.get('/leaderboard/clans', requireAuth, analyticsController.getClanLeaderboard);

module.exports = router;
