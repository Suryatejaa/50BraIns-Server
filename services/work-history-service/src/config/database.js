/**
 * Database Configuration and Connection Manager
 * Handles Prisma client initialization and database health checks
 */

const { PrismaClient } = require('../../node_modules/.prisma/work-history-client');
const logger = require('./logger');

let prisma = null;

// Prisma configuration
const prismaConfig = {
    log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
    ],
    errorFormat: 'pretty',
};

// Initialize Prisma client
function initializePrisma() {
    if (!prisma) {
        prisma = new PrismaClient(prismaConfig);

        // Set up logging for database operations
        prisma.$on('query', (e) => {
            logger.logDatabase('query', e.target, e.duration, null);
        });

        prisma.$on('error', (e) => {
            logger.error('Prisma Error:', e);
        });

        prisma.$on('info', (e) => {
            logger.info('Prisma Info:', e.message);
        });

        prisma.$on('warn', (e) => {
            logger.warn('Prisma Warning:', e.message);
        });
    }

    return prisma;
}

// Initialize database connection
async function initializeDatabase() {
    try {
        if (!prisma) {
            prisma = initializePrisma();
        }

        // Test database connection
        await prisma.$connect();

        // Test with a simple query
        await prisma.$queryRaw`SELECT 1`;

        logger.info('Database connection established successfully');
        return prisma;
    } catch (error) {
        logger.error('Failed to initialize database:', error);
        throw error;
    }
}

// Health check for database
async function checkDatabaseHealth() {
    try {
        if (!prisma) {
            throw new Error('Database not initialized');
        }

        const startTime = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const responseTime = Date.now() - startTime;

        return {
            status: 'healthy',
            responseTime: `${responseTime}ms`,
            connection: 'active'
        };
    } catch (error) {
        logger.error('Database health check failed:', error);
        return {
            status: 'unhealthy',
            error: error.message,
            connection: 'failed'
        };
    }
}

// Get database statistics
async function getDatabaseStats() {
    try {
        if (!prisma) {
            throw new Error('Database not initialized');
        }

        const [
            clansCount,
            membersCount,
            invitationsCount,
            requestsCount,
            reviewsCount
        ] = await Promise.all([
            prisma.clan.count(),
            prisma.clanMember.count(),
            prisma.clanInvitation.count(),
            prisma.clanJoinRequest.count(),
            prisma.clanReview.count()
        ]);

        return {
            clans: clansCount,
            members: membersCount,
            invitations: invitationsCount,
            joinRequests: requestsCount,
            reviews: reviewsCount,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        logger.error('Failed to get database stats:', error);
        throw error;
    }
}

// Graceful shutdown
async function closeDatabase() {
    try {
        if (prisma) {
            await prisma.$disconnect();
            logger.info('Database connection closed');
        }
    } catch (error) {
        logger.error('Error closing database connection:', error);
    }
}

// Export configured Prisma instance and utilities
module.exports = {
    initializeDatabase,
    checkDatabaseHealth,
    getDatabaseStats,
    closeDatabase,
    get prisma() {
        if (!prisma) {
            prisma = initializePrisma();
        }
        return prisma;
    }
};
