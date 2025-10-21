const { PrismaClient } = require('@prisma/client');

class DatabaseService {
    constructor() {
        this.prisma = null;
    }

    async connect() {
        if (!this.prisma) {
            this.prisma = new PrismaClient({
                log: ['error', 'warn'],
                errorFormat: 'minimal'
            });
            await this.prisma.$connect();
        }
        return this.prisma;
    }

    async disconnect() {
        if (this.prisma) {
            await this.prisma.$disconnect();
            this.prisma = null;
        }
    }

    async getClient() {
        return await this.connect();
    }

    async healthCheck() {
        try {
            const prisma = await this.connect();
            const clanCount = await prisma.clan.count();
            return {
                connected: true,
                clanCount,
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

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
