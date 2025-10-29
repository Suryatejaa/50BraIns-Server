const redis = require('redis');
require('dotenv').config({ path: '.env.local' });

async function testRedisConnection() {
    const client = redis.createClient({
        url: process.env.REDIS_URL
    });

    try {
        console.log('Attempting to connect to Redis...');
        console.log('Redis URL:', process.env.REDIS_URL);

        client.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        client.on('connect', () => {
            console.log('✅ Connected to Redis server');
        });

        client.on('ready', () => {
            console.log('✅ Redis client ready');
        });

        await client.connect();

        // Test basic operations
        await client.set('test_key', 'Hello Redis!');
        const value = await client.get('test_key');
        console.log('✅ Test SET/GET successful:', value);

        // Test some cache operations
        await client.setEx('cache_test', 60, JSON.stringify({ message: 'Cache working!' }));
        const cachedValue = await client.get('cache_test');
        console.log('✅ Cache test successful:', JSON.parse(cachedValue));

        // Clean up
        await client.del('test_key', 'cache_test');
        console.log('✅ Cleanup completed');

        await client.disconnect();
        console.log('✅ Redis connection test completed successfully!');

    } catch (error) {
        console.error('❌ Redis connection failed:', error.message);
        console.error('Full error:', error);

        // Try alternative connection methods
        console.log('\n🔄 Trying alternative connection...');
        await tryAlternativeConnection();
    }
}

async function tryAlternativeConnection() {
    try {
        // Try with explicit connection options
        const client = redis.createClient({
            socket: {
                host: 'redis-production-97d6.up.railway.app',
                port: 6379,
                tls: false // Try without TLS first
            },
            username: 'default',
            password: 'EOewwolfkpUhljWSgOpjBHTMIcWbPbqF'
        });

        await client.connect();
        console.log('✅ Alternative connection successful!');

        await client.set('alt_test', 'success');
        const result = await client.get('alt_test');
        console.log('✅ Alternative test result:', result);

        await client.del('alt_test');
        await client.disconnect();

    } catch (altError) {
        console.error('❌ Alternative connection also failed:', altError.message);

        // Try with TLS
        console.log('\n🔄 Trying with TLS...');
        await tryTLSConnection();
    }
}

async function tryTLSConnection() {
    try {
        const client = redis.createClient({
            url: 'rediss://default:EOewwolfkpUhljWSgOpjBHTMIcWbPbqF@redis-production-97d6.up.railway.app:6379'
        });

        await client.connect();
        console.log('✅ TLS connection successful!');

        await client.disconnect();

    } catch (tlsError) {
        console.error('❌ TLS connection failed:', tlsError.message);
        console.log('\n📝 Connection troubleshooting completed. Check Railway Redis configuration.');
    }
}

testRedisConnection();