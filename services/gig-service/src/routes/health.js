const express = require('express');
const router = express.Router();
const databaseService = require('../services/database');

// Health check endpoint
router.get('/', async (req, res) => {
    try {
        const healthStatus = await databaseService.healthCheck();

        const response = {
            service: 'gig-service',
            status: healthStatus.connected ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: healthStatus
        };

        const statusCode = healthStatus.connected ? 200 : 503;
        res.status(statusCode).json(response);
    } catch (error) {
        res.status(503).json({
            service: 'gig-service',
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
