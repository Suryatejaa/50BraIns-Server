const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;

        const timestamp = new Date().toISOString();

        const health = {
            status: 'healthy',
            timestamp,
            service: 'credit-service',
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            database: 'connected',
            environment: process.env.NODE_ENV || 'development',
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
            }
        };

        res.status(200).json(health);
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            service: 'credit-service',
            error: error.message
        });
    }
});

// Ready check for Kubernetes
router.get('/ready', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ready' });
    } catch (error) {
        res.status(503).json({ status: 'not ready', error: error.message });
    }
});

// Live check for Kubernetes
router.get('/live', (req, res) => {
    res.status(200).json({ status: 'alive' });
});

module.exports = router;
