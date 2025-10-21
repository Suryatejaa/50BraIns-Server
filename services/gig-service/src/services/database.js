const { PrismaClient } = require('@prisma/client');

class DatabaseService {
    constructor() {
        this.prisma = new PrismaClient({
            log: ['query', 'info', 'warn', 'error'],
        });
    }

    async connect() {
        try {
            await this.prisma.$connect();
            console.log('✅ Database connected successfully');
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            return false;
        }
    }

    async disconnect() {
        try {
            await this.prisma.$disconnect();
            console.log('📴 Database disconnected');
        } catch (error) {
            console.error('❌ Database disconnect error:', error.message);
        }
    }

    getClient() {
        return this.prisma;
    }

    async healthCheck() {
        try {
            await this.prisma.$queryRaw`SELECT 1`;

            // Count gigs for health check
            const gigCount = await this.prisma.gig.count();
            const applicationCount = await this.prisma.application.count();

            return {
                connected: true,
                gigCount,
                applicationCount,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
