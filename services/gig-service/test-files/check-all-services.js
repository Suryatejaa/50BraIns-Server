const { PrismaClient } = require('@prisma/client');

// Service configurations
const services = {
    'user-service': ['users', 'profiles', 'user_settings', 'verification_tokens'],
    'auth-service': ['users', 'sessions', 'accounts', 'verification_tokens'],
    'work-history-service': ['work_histories', 'work_entries', 'project_collaborators'],
    'reputation-service': ['reputation_scores', 'score_history', 'activity_logs', 'clan_reputations', 'leaderboard_cache', 'score_config'],
    'gig-service': ['gigs', 'applications', 'submissions', 'gig_boost_events', 'gig_credit_events', 'gig_assignments', 'gig_milestones', 'gig_tasks']
};

async function checkAllServices() {
    const prisma = new PrismaClient();

    try {
        console.log('🔍 Checking all service tables in Supabase...\n');

        // Get all tables in the database
        const allTables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `;

        console.log('📊 All tables found in database:');
        console.log('===============================');
        allTables.forEach((table, index) => {
            console.log(`${index + 1}. ${table.table_name}`);
        });
        console.log(`\nTotal: ${allTables.length} tables\n`);

        // Check each service
        for (const [serviceName, expectedTables] of Object.entries(services)) {
            console.log(`🔧 ${serviceName.toUpperCase()}:`);
            console.log(''.padEnd(40, '-'));

            let foundCount = 0;
            let totalCount = expectedTables.length;

            for (const tableName of expectedTables) {
                try {
                    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
                    console.log(`✅ ${tableName}: ${count[0].count} records`);
                    foundCount++;
                } catch (error) {
                    console.log(`❌ ${tableName}: Table not found`);
                }
            }

            console.log(`📈 ${serviceName}: ${foundCount}/${totalCount} tables found\n`);
        }

        // Summary
        console.log('📋 SUMMARY:');
        console.log(''.padEnd(50, '='));

        let totalFound = 0;
        let totalExpected = 0;

        for (const [serviceName, expectedTables] of Object.entries(services)) {
            let serviceFound = 0;

            for (const tableName of expectedTables) {
                try {
                    await prisma.$queryRawUnsafe(`SELECT 1 FROM "${tableName}" LIMIT 1`);
                    serviceFound++;
                } catch (error) {
                    // Table not found
                }
            }

            totalFound += serviceFound;
            totalExpected += expectedTables.length;

            const status = serviceFound === expectedTables.length ? '✅' : '⚠️';
            console.log(`${status} ${serviceName}: ${serviceFound}/${expectedTables.length} tables`);
        }

        console.log(''.padEnd(50, '='));
        console.log(`🎯 TOTAL: ${totalFound}/${totalExpected} tables migrated successfully`);

        if (totalFound === totalExpected) {
            console.log('🎉 All services migrated successfully to Supabase!');
        } else {
            console.log('⚠️  Some services need migration. Run "npx prisma db push" in missing service directories.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkAllServices();