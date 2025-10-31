require('dotenv').config({ path: '.env.local' });
const { prisma } = require('./src/config/database');

async function checkTriggers() {
    try {
        console.log('🔍 Checking for triggers on authOTPRecords table...\n');

        const triggers = await prisma.$queryRaw`
            SELECT 
                trigger_name,
                event_manipulation,
                action_statement,
                action_timing
            FROM information_schema.triggers 
            WHERE event_object_table = 'authOTPRecords'
        `;

        console.log('Triggers found:', triggers);

        // Also check for any functions that might be related
        console.log('\n🔍 Checking for update functions...');
        const functions = await prisma.$queryRaw`
            SELECT 
                routine_name,
                routine_definition
            FROM information_schema.routines 
            WHERE routine_name LIKE '%update%' OR routine_name LIKE '%otp%'
            AND routine_schema = 'public'
        `;

        console.log('Related functions:', functions);

    } catch (error) {
        console.error('❌ Error checking triggers:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkTriggers();