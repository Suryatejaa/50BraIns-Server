const express = require('express');
const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
    res.status(200).json({
        service: 'clan-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;
