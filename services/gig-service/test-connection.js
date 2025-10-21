const { PrismaClient } = require('@prisma/client');

async function testConnection() {
    console.log('🔍 Testing Supabase connection...');

    // Read .env file manually
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');

    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const databaseUrlMatch = envContent.match(/^DATABASE_URL=(.*)$/m);
        if (databaseUrlMatch) {
            console.log('📄 DATABASE_URL from .env:', databaseUrlMatch[1]);
        }
    }

    console.log('🌐 Process ENV DATABASE_URL:', process.env.DATABASE_URL);

    const prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
    });

    try {
        console.log('🔗 Attempting to connect...');
        await prisma.$connect();
        console.log('✅ Connected to database successfully!');

        // Try a simple query
        console.log('📊 Testing basic query...');
        const result = await prisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Query successful:', result);

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('📋 Error code:', error.code);
        console.error('📋 Error details:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();