/**
 * Database service for clan service
 * Manages Prisma client and database connections
 */

const { PrismaClient } = require('@prisma/client');

class DatabaseService {
    constructor() {
        this.prisma = null;
        this.isConnected = false;
    }

    /**
     * Initialize Prisma client
     */
    async initialize() {
        try {
            this.prisma = new PrismaClient();
            await this.prisma.$connect();
            this.isConnected = true;
            console.log('✅ Database connected successfully');
        } catch (error) {
            console.error('❌ Failed to connect to database:', error);
            throw error;
        }
    }

    /**
     * Get Prisma client instance
     */
    getClient() {
        if (!this.prisma || !this.isConnected) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.prisma;
    }

    /**
     * Close database connection
     */
    async disconnect() {
        if (this.prisma && this.isConnected) {
            await this.prisma.$disconnect();
            this.isConnected = false;
            console.log('🔌 Database disconnected');
        }
    }

    /**
     * Health check for database
     */
    async healthCheck() {
        try {
            if (!this.prisma || !this.isConnected) {
                return { status: 'disconnected', error: 'Database not initialized' };
            }

            // Simple query to test connection
            await this.prisma.$queryRaw`SELECT 1`;
            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }
}

// Singleton instance
let databaseService = null;

const getDatabaseService = () => {
    if (!databaseService) {
        databaseService = new DatabaseService();
    }
    return databaseService;
};

module.exports = {
    DatabaseService,
    getDatabaseService
};
