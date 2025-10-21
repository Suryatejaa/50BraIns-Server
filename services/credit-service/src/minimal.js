require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 4005;
const prisma = new PrismaClient();

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'healthy', service: 'credit-service', timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
    }
});

// Simple credit route
app.get('/api/credits/test', (req, res) => {
    res.json({ message: 'Credit service is working!', timestamp: new Date().toISOString() });
});

// Start server
const startServer = async () => {
    try {
        await prisma.$connect();
        console.log('Database connected successfully');

        app.listen(PORT, () => {
            console.log(`🚀 Credit Service (minimal) running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`Test endpoint: http://localhost:${PORT}/api/credits/test`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
