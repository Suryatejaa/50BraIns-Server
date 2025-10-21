const { PrismaClient } = require('../../node_modules/.prisma/work-history-client');

let prisma = null;

async function connect() {
    try {
        if (!prisma) {
            console.log('🔗 Creating Prisma client...');
            prisma = new PrismaClient();

            console.log('📡 Connecting to database...');
            await prisma.$connect();

            console.log('✅ Database connected successfully');
        }
        return prisma;
    } catch (error) {
        console.error('💥 Database connection failed:', error.message);
        throw error;
    }
}

async function disconnect() {
    try {
        if (prisma) {
            await prisma.$disconnect();
            prisma = null;
            console.log('👋 Database disconnected');
        }
    } catch (error) {
        console.error('Error disconnecting from database:', error.message);
    }
}

function getClient() {
    return prisma;
}

async function checkHealth() {
    try {
        if (!prisma) {
            throw new Error('Database not connected');
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
        return {
            status: 'unhealthy',
            error: error.message,
            connection: 'failed'
        };
    }
}

module.exports = {
    connect,
    disconnect,
    getClient,
    checkHealth,
    get client() {
        return prisma;
    }
};
