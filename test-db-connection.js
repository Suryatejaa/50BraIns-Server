// Test database connection
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
    const prisma = new PrismaClient();

    try {
        console.log('🔍 Testing database connection...');
        await prisma.$connect();
        console.log('✅ Database connection successful!');

        // Test a simple query
        const result = await prisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Database query successful:', result);

    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        if (error.code === 'P1001') {
            console.log('\n💡 Possible solutions:');
            console.log('1. Check if Supabase project is paused');
            console.log('2. Verify the DATABASE_URL in .env file');
            console.log('3. Check network connectivity');
            console.log('4. Create a new Supabase project if needed');
        }
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();