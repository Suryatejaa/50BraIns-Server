const { PrismaClient } = require('@prisma/client');

class DatabaseService {
    constructor() {
        this.prisma = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            if (!this.prisma) {
                this.prisma = new PrismaClient({
                    datasources: {
                        db: {
                            url: process.env.DATABASE_URL
                        }
                    },
                    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
                });
            }

            // Test connection
            await this.prisma.$connect();

            // Verify connection with a simple query
            await this.prisma.$queryRaw`SELECT 1`;

            this.isConnected = true;
            console.log('📊 Database connected successfully (Credit Service)');

            return this.prisma;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        try {
            if (this.prisma) {
                await this.prisma.$disconnect();
                this.isConnected = false;
                console.log('📊 Database disconnected (Credit Service)');
            }
        } catch (error) {
            console.error('❌ Database disconnection error:', error.message);
        }
    }

    getClient() {
        if (!this.prisma) {
            throw new Error('Database not initialized. Call connect() first.');
        }
        return this.prisma;
    }

    isHealthy() {
        return this.isConnected;
    }

    async healthCheck() {
        try {
            if (!this.prisma) {
                return { connected: false, error: 'Database not initialized' };
            }

            await this.prisma.$queryRaw`SELECT 1`;

            // Get basic stats
            const [walletCount, transactionCount, boostCount] = await Promise.all([
                this.prisma.creditWallet.count(),
                this.prisma.creditTransaction.count(),
                this.prisma.boostRecord.count({ where: { isActive: true } })
            ]);

            return {
                connected: true,
                walletCount,
                transactionCount,
                activeBoosts: boostCount,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Database health check failed:', error.message);
            return {
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
