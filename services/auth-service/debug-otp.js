require('dotenv').config({ path: '.env.local' });
const { prisma } = require('./src/config/database');

async function debugOTPIssue() {
    try {
        console.log('🔍 Debugging OTP table access...\n');

        // Test 1: Check if we can access the table directly via raw query
        console.log('1. Raw query to check table:');
        const rawResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "authOTPRecords"`;
        console.log('✅ Raw query result:', rawResult);

        // Test 2: Check what Prisma thinks the table mapping is
        console.log('\n2. Prisma client method test:');
        try {
            const count = await prisma.oTPRecord.count();
            console.log('✅ prisma.oTPRecord.count() works:', count);
        } catch (err) {
            console.log('❌ prisma.oTPRecord.count() failed:', err.message);
        }

        // Test 3: Check if the issue is with a specific operation
        console.log('\n3. Testing simple create operation:');
        try {
            const testRecord = await prisma.oTPRecord.create({
                data: {
                    email: 'debug@test.com',
                    otpHash: 'debug-hash',
                    purpose: 'REGISTER',
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
                }
            });
            console.log('✅ Create operation works:', testRecord.id);

            // Clean up
            await prisma.oTPRecord.delete({ where: { id: testRecord.id } });
            console.log('✅ Cleanup successful');
        } catch (err) {
            console.log('❌ Create operation failed:', err.message);
            console.log('Full error:', err);
        }

        // Test 4: Check table schema
        console.log('\n4. Checking table schema:');
        const schema = await prisma.$queryRaw`
            SELECT table_name, column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name LIKE '%OTP%'
            ORDER BY table_name, ordinal_position
        `;
        console.log('Schema:', schema);

    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugOTPIssue();