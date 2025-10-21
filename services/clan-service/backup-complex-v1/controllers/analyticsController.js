const databaseService = require('../services/database');
const axios = require('axios');
const CREDIT_SERVICE_URL = process.env.CREDIT_SERVICE_URL || 'http://localhost:4004';
const REPUTATION_SERVICE_URL = process.env.REPUTATION_SERVICE_URL || 'http://localhost:4006';

class AnalyticsController {
    // Get clan analytics
    async getClanAnalytics(req, res) {
        try {
            const { clanId } = req.params;
            const prisma = await databaseService.getClient();

            const analytics = await prisma.clanAnalytics.findUnique({
                where: { clanId },
                include: {
                    clan: {
                        select: {
                            name: true,
                            reputationScore: true,
                            averageRating: true,
                            totalGigs: true,
                            completedGigs: true
                        }
                    }
                }
            });

            if (!analytics) {
                return res.status(404).json({
                    success: false,
                    error: 'Analytics not found for this clan',
                    timestamp: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                data: analytics,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = new AnalyticsController();

// Integration helpers
module.exports.boostClanVisibility = async function boostClanVisibility(req, res) {
    try {
        const { clanId } = req.params;
        const { amount, durationHours } = req.body;
        const response = await axios.post(`${CREDIT_SERVICE_URL}/credit/boost/clan/${clanId}`, { amount, durationHours }, {
            headers: {
                'x-user-id': req.user.id,
                'x-user-email': req.user.email,
                'x-user-roles': req.user.roles?.join(',') || '',
                'x-user-is-admin': req.user.isAdmin ? 'true' : 'false'
            }
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        res.status(status).json({ success: false, error: error.message, details: error.response?.data });
    }
};

module.exports.contributeCredits = async function contributeCredits(req, res) {
    try {
        const { clanId } = req.params;
        const { amount } = req.body;
        const response = await axios.post(`${CREDIT_SERVICE_URL}/credit/contribute/clan/${clanId}`, { amount }, {
            headers: {
                'x-user-id': req.user.id,
                'x-user-email': req.user.email,
                'x-user-roles': req.user.roles?.join(',') || '',
                'x-user-is-admin': req.user.isAdmin ? 'true' : 'false'
            }
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        res.status(status).json({ success: false, error: error.message, details: error.response?.data });
    }
};

module.exports.getClanLeaderboard = async function getClanLeaderboard(req, res) {
    try {
        const { limit = 50 } = req.query;
        const response = await axios.get(`${REPUTATION_SERVICE_URL}/api/reputation/leaderboard/clans`, { params: { limit } });
        res.status(response.status).json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        res.status(status).json({ success: false, error: error.message, details: error.response?.data });
    }
};
