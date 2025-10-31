require('dotenv').config({ path: '.env.local' });
const { prisma } = require('./src/config/database');

async function checkFunction() {
    try {
        console.log('🔍 Checking the update function definition...\n');

        const functionDef = await prisma.$queryRaw`
            SELECT 
                routine_name,
                routine_definition,
                data_type
            FROM information_schema.routines 
            WHERE routine_name = 'update_updated_at_column'
            AND routine_schema = 'public'
        `;

        console.log('Function definition:', functionDef);

        // Get the actual function source
        console.log('\n🔍 Getting function source from pg_proc...');
        const procSource = await prisma.$queryRaw`
            SELECT 
                proname,
                prosrc,
                prolang
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE proname = 'update_updated_at_column'
            AND n.nspname = 'public'
        `;

        console.log('Function source:', procSource);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkFunction();