const redis = require('redis');
const net = require('net');
require('dotenv').config({ path: '.env.local' });

async function troubleshootRedis() {
    console.log('🔍 Redis Connection Troubleshooting\n');

    // 1. Test basic network connectivity
    console.log('1️⃣ Testing network connectivity...');
    await testNetworkConnectivity();

    // 2. Test different connection URLs
    console.log('\n2️⃣ Testing different Redis URLs...');
    await testDifferentURLs();

    // 3. Check environment variables
    console.log('\n3️⃣ Environment variables check:');
    console.log('REDIS_URL:', process.env.REDIS_URL);
    console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD);
    console.log('REDIS_HOST:', process.env.REDIS_HOST);
    console.log('REDIS_PORT:', process.env.REDIS_PORT);
}

function testNetworkConnectivity() {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const host = 'redis-production-97d6.up.railway.app';
        const port = 6379;

        socket.setTimeout(5000);

        socket.on('connect', () => {
            console.log(`✅ Network connection to ${host}:${port} successful`);
            socket.destroy();
            resolve();
        });

        socket.on('timeout', () => {
            console.log(`❌ Network connection timeout to ${host}:${port}`);
            socket.destroy();
            resolve();
        });

        socket.on('error', (error) => {
            console.log(`❌ Network connection error to ${host}:${port}:`, error.message);
            resolve();
        });

        try {
            socket.connect(port, host);
        } catch (error) {
            console.log(`❌ Socket connection failed:`, error.message);
            resolve();
        }
    });
}

async function testDifferentURLs() {
    const urls = [
        'redis://default:EOewwolfkpUhljWSgOpjBHTMIcWbPbqF@redis-production-97d6.up.railway.app:6379',
        'rediss://default:EOewwolfkpUhljWSgOpjBHTMIcWbPbqF@redis-production-97d6.up.railway.app:6379',
        'redis://redis-production-97d6.up.railway.app:6379' // Without auth
    ];

    for (let i = 0; i < urls.length; i++) {
        console.log(`\nTesting URL ${i + 1}: ${urls[i]}`);
        await testSingleURL(urls[i]);
    }
}

async function testSingleURL(url) {
    const client = redis.createClient({
        url: url,
        socket: {
            connectTimeout: 5000,
            lazyConnect: true
        }
    });

    try {
        client.on('error', () => { }); // Suppress error logging

        await client.connect();
        console.log('✅ Connection successful');

        await client.ping();
        console.log('✅ PING successful');

        await client.disconnect();

    } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
    }
}

// Additional Railway-specific suggestions
async function railwaySpecificTroubleshooting() {
    console.log('\n🚂 Railway-specific troubleshooting suggestions:');
    console.log('1. Check if Redis service is deployed and running in Railway dashboard');
    console.log('2. Verify the Redis connection string in Railway environment variables');
    console.log('3. Check if Railway Redis service has public networking enabled');
    console.log('4. Try using Railway CLI: railway connect redis');
    console.log('5. Check Railway service logs for Redis errors');

    console.log('\n📝 To install Redis CLI on Windows:');
    console.log('1. Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases');
    console.log('2. Or use WSL: wsl -e redis-cli -u "your-redis-url"');
    console.log('3. Or use Railway CLI: railway run redis-cli');
}

troubleshootRedis().then(() => {
    railwaySpecificTroubleshooting();
}).catch(console.error);