const { PrismaClient } = require('@prisma/client');

async function listTables() {
    const prisma = new PrismaClient();

    try {
        console.log('🔍 Checking tables in Supabase...\n');

        // List all tables in the public schema
        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `;

        console.log('📊 Tables found in database:');
        console.log('===============================');

        if (tables.length === 0) {
            console.log('❌ No tables found in the database!');
            console.log('This might mean:');
            console.log('1. The migration didn\'t run properly');
            console.log('2. Tables were created in a different schema');
            console.log('3. Connection is to wrong database');
        } else {
            tables.forEach((table, index) => {
                console.log(`${index + 1}. ${table.table_name}`);
            });
        }

        console.log('\n🔍 Checking for specific gig-service tables...');

        // Check for expected gig service tables
        const expectedTables = ['gigs', 'applications', 'submissions', 'gig_boost_events', 'gig_credit_events', 'gig_assignments', 'gig_milestones', 'gig_tasks'];

        for (const tableName of expectedTables) {
            try {
                const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
                console.log(`✅ ${tableName}: ${count[0].count} records`);
            } catch (error) {
                console.log(`❌ ${tableName}: Table not found - ${error.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

listTables();