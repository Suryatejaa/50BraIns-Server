const { PrismaClient } = require('./node_modules/@prisma/client');

async function testDatabaseSchema() {
    const prisma = new PrismaClient();

    try {
        console.log('🔍 Testing database connection and schema...');

        // Try to query the authUsers table
        const users = await prisma.authUsers.findMany({ take: 1 });
        console.log('✅ Successfully connected to database');
        console.log(`Found ${users.length} users in authUsers table`);

        // Try to access a specific camelCase field
        if (users.length > 0) {
            console.log('✅ Sample user data structure:');
            console.log('- id:', users[0].id);
            console.log('- email:', users[0].email);
            console.log('- username:', users[0].username);
            console.log('- firstName:', users[0].firstName);
            console.log('- lastName:', users[0].lastName);
        }

    } catch (error) {
        console.error('❌ Database error:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);

        if (error.message.includes('column') && error.message.includes('does not exist')) {
            console.log('\n🚨 ISSUE DETECTED: The database still has snake_case columns but Prisma expects camelCase');
            console.log('📋 SOLUTION: You need to run the migration script in Supabase SQL Editor');
            console.log('📁 Script location: migrate-to-camelcase-complete.sql');
        }
    } finally {
        await prisma.$disconnect();
    }
}

testDatabaseSchema();