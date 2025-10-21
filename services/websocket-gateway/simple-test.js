/**
 * Simple RabbitMQ Connection Test
 */

const amqp = require('amqplib');

async function simpleTest() {
    console.log('🧪 Simple RabbitMQ Test...\n');
    
    try {
        console.log('🔗 Testing connection...');
        
        // Test 1: Basic connection
        const connection = await amqp.connect('amqp://admin:admin123@localhost:5672');
        console.log('✅ Connection successful');
        
        // Test 2: Create channel
        const channel = await connection.createChannel();
        console.log('✅ Channel created');
        
        // Test 3: Assert exchange
        await channel.assertExchange('test_exchange', 'topic', { durable: true });
        console.log('✅ Exchange asserted');
        
        // Test 4: Close everything
        await channel.close();
        await connection.close();
        console.log('✅ Cleanup successful');
        
        console.log('\n🎉 All tests passed! RabbitMQ is working correctly.');
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        console.log('Full error:', error);
    }
}

// Run with timeout
const timeout = setTimeout(() => {
    console.log('⏰ Test timed out after 10 seconds');
    process.exit(1);
}, 10000);

simpleTest()
    .then(() => {
        clearTimeout(timeout);
        console.log('✅ Test completed');
    })
    .catch((error) => {
        clearTimeout(timeout);
        console.log('❌ Test failed:', error.message);
        process.exit(1);
    });
