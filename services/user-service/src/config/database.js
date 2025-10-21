// src/config/database.js
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient({
    log: [
        {
            emit: 'event',
            level: 'query',
        },
        {
            emit: 'event',
            level: 'error',
        },
        {
            emit: 'event',
            level: 'info',
        },
        {
            emit: 'event',
            level: 'warn',
        },
    ],
});

// Log DB queries in dev mode
if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
        logger.debug(`Query: ${e.query}`);
        logger.debug(`Duration: ${e.duration}ms`);
    });
}

prisma.$on('error', (e) => {
    logger.error(`Database error: ${e.message}`);
});

// Test DB connection on startup
async function testConnection() {
    try {
        await prisma.$connect();
        logger.info('Connected to database');
        return true;
    } catch (error) {
        logger.error('Failed to connect to database:', error);
        return false;
    }
}

module.exports = { prisma, testConnection };
