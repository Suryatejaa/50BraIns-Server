require('dotenv').config({ path: '.env.local' });
const { prisma } = require('./src/config/database');

async function testAfterFix() {
    try {
        console.log('🧪 Testing OTP update after trigger fix...\n');

        // Create test record
        const testRecord = await prisma.oTPRecord.create({
            data: {
                email: 'test-fix@example.com',
                otpHash: 'test-hash-fix',
                purpose: 'REGISTER',
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                attempts: 0
            }
        });

        console.log('✅ Test record created:', testRecord.id);

        // Test update operation
        const updated = await prisma.oTPRecord.update({
            where: { id: testRecord.id },
            data: { attempts: testRecord.attempts + 1 }
        });

        console.log('✅ Update successful! Attempts:', updated.attempts);
        console.log('✅ UpdatedAt was triggered:', updated.updatedAt);

        // Cleanup
        await prisma.oTPRecord.delete({ where: { id: testRecord.id } });
        console.log('✅ Test completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testAfterFix();