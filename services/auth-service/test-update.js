require('dotenv').config({ path: '.env.local' });
const { prisma } = require('./src/config/database');

async function testSpecificOperation() {
    try {
        console.log('🧪 Testing the exact failing operation...\n');

        // First create a test record
        const testRecord = await prisma.oTPRecord.create({
            data: {
                email: 'test@example.com',
                otpHash: 'test-hash',
                purpose: 'REGISTER',
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                attempts: 0
            }
        });

        console.log('✅ Test record created:', testRecord.id);
        console.log('Current attempts:', testRecord.attempts);

        // Now test the exact operation that's failing (line 128)
        console.log('\n🔧 Testing the failing update operation...');

        const updateResult = await prisma.oTPRecord.update({
            where: { id: testRecord.id },
            data: { attempts: testRecord.attempts + 1 }
        });

        console.log('✅ Update successful! New attempts:', updateResult.attempts);

        // Cleanup
        await prisma.oTPRecord.delete({ where: { id: testRecord.id } });
        console.log('✅ Cleanup done');

    } catch (error) {
        console.error('❌ Error in test:', error.message);
        console.error('Full error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testSpecificOperation();