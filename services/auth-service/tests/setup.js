const { PrismaClient } = require('@prisma/client');
const redis = require('../src/config/redis');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_key_for_testing_only';

// Use the same database for now (in production, you'd use a separate test DB)
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/auth_service_dev';
}

const prisma = new PrismaClient();

// Global test setup
beforeAll(async () => {
    // Connect to test database
    await prisma.$connect();

    // Clean up database before tests
    await cleanupDatabase();
});

// Clean up after each test
afterEach(async () => {
    await cleanupDatabase();
});

// Global test teardown
afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();

    // Close Redis connection if exists
    const redis = require('../src/config/redis');
    if (redis.isConnected()) {
        await redis.closeRedis();
    }
});

// Database cleanup function
async function cleanupDatabase() {
    try {
        // Delete test data in reverse order of dependencies
        // First, delete refresh tokens
        await prisma.refreshToken.deleteMany({
            where: {
                user: {
                    email: {
                        contains: 'test'
                    }
                }
            }
        });

        // Then delete admin logs
        await prisma.adminLog.deleteMany({
            where: {
                OR: [
                    {
                        admin: {
                            email: {
                                contains: 'test'
                            }
                        }
                    },
                    {
                        target: {
                            email: {
                                contains: 'test'
                            }
                        }
                    }
                ]
            }
        });

        // Finally, delete users
        await prisma.user.deleteMany({
            where: {
                email: {
                    contains: 'test'
                }
            }
        });

        console.log('✅ Database cleanup completed successfully');
    } catch (error) {
        console.warn('❌ Database cleanup warning:', error.message);
        // Force cleanup all test data
        try {
            await prisma.refreshToken.deleteMany({});
            await prisma.adminLog.deleteMany({});
            await prisma.user.deleteMany({
                where: {
                    OR: [
                        { email: { contains: 'test' } },
                        { email: { contains: 'example.com' } }
                    ]
                }
            });
            console.log('✅ Force cleanup completed');
        } catch (forceError) {
            console.error('❌ Force cleanup failed:', forceError.message);
        }
    }
}

// Test utilities
global.testUtils = {
    cleanupDatabase,
    prisma, createTestUser: async (userData = {}) => {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substr(2, 9);
        const defaultUser = {
            email: `test_${timestamp}_${randomStr}@example.com`,
            password: 'TestPassword123!',
            roles: ['USER'] // Use roles array
        };

        return { ...defaultUser, ...userData };
    },

    createTestAdmin: async (userData = {}) => {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substr(2, 9);
        const defaultAdmin = {
            email: `admin_${timestamp}_${randomStr}@example.com`,
            password: 'AdminPassword123!',
            roles: ['ADMIN'] // Use roles array
        };

        return { ...defaultAdmin, ...userData };
    }
};

// Mock console methods for cleaner test output (except errors for debugging)
global.originalConsole = console;
global.console = {
    ...console,
    log: process.env.NODE_ENV === 'test' ? console.log : jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error // Keep errors for debugging
};
