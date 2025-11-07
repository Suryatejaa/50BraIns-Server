const { PrismaClient } = require('@prisma/client');

async function cleanupRefreshTokens() {
    const prisma = new PrismaClient();

    try {
        console.log('🧹 Starting refresh token cleanup...');

        // Count existing tokens
        const tokenCount = await prisma.refreshToken.count();
        console.log(`📊 Found ${tokenCount} existing refresh tokens`);

        if (tokenCount === 0) {
            console.log('✅ No tokens to clean up');
            return;
        }

        // Delete all existing refresh tokens
        const deleteResult = await prisma.refreshToken.deleteMany({});

        console.log(`🗑️  Deleted ${deleteResult.count} refresh tokens`);
        console.log('✅ Cleanup completed successfully');
        console.log('');
        console.log('🔄 All users will need to login again with fresh tokens');
        console.log('💡 This fixes the tokenId mismatch issue');

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the cleanup
cleanupRefreshTokens();