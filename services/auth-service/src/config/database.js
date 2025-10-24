const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.utils');

let prisma;

try {
    const datasourceConfig = {
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        errorFormat: 'pretty',
    };

    prisma = new PrismaClient(datasourceConfig);

} catch (error) {
    logger.error('❌ Failed to initialize Prisma client:', error);
    // Fallback to null - will be handled in controllers
    prisma = null;
}

module.exports = { prisma };
