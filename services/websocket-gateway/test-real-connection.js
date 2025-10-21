/**
 * Test Real RabbitMQ Connection
 * Using the exact connection string from .env
 */

const amqp = require('amqplib');

async function testRealConnection() {
    console.log('🧪 Testing Real RabbitMQ Connection...\n');
    
    const connectionString = 'amqp://admin:admin123@localhost:5672';
    console.log('🔗 Testing connection to:', connectionString);
    
    let connection = null;
    let channel = null;
    
    try {
        // Test 1: Basic connection
        console.log('\n📡 Step 1: Establishing connection...');
        connection = await amqp.connect(connectionString);
        console.log('✅ Connection established successfully');
        
        // Test 2: Create channel
        console.log('\n📡 Step 2: Creating channel...');
        channel = await connection.createChannel();
        console.log('✅ Channel created successfully');
        
        // Test 3: Assert exchange (same as your service)
        console.log('\n📡 Step 3: Asserting exchange...');
        await channel.assertExchange('brains_events', 'topic', { durable: true });
        console.log('✅ Exchange "brains_events" asserted successfully');
        
        // Test 4: Test queue operations
        console.log('\n📡 Step 4: Testing queue operations...');
        const testQueue = 'test_queue_' + Date.now();
        await channel.assertQueue(testQueue, { durable: true });
        console.log('✅ Test queue created successfully');
        
        // Test 5: Clean up test queue
        await channel.deleteQueue(testQueue);
        console.log('✅ Test queue cleaned up');
        
        console.log('\n🎉 SUCCESS: All RabbitMQ operations working correctly!');
        console.log('The issue must be in the service code, not the connection itself.');
        
    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
        console.log('Full error details:', error);
        
        if (error.message.includes('Handshake terminated')) {
            console.log('\n🔍 DIAGNOSIS: This is a handshake/authentication issue');
            console.log('Possible causes:');
            console.log('1. Wrong username/password');
            console.log('2. RabbitMQ not fully started');
            console.log('3. Network/firewall blocking connection');
        }
        
    } finally {
        // Cleanup
        if (channel) {
            try {
                await channel.close();
                console.log('\n🔌 Channel closed');
            } catch (error) {
                console.log('❌ Error closing channel:', error.message);
            }
        }
        
        if (connection) {
            try {
                await connection.close();
                console.log('🔌 Connection closed');
            } catch (error) {
                console.log('❌ Error closing connection:', error.message);
            }
        }
    }
}

// Run with timeout
const timeout = setTimeout(() => {
    console.log('\n⏰ Test timed out after 15 seconds');
    process.exit(1);
}, 15000);

testRealConnection()
    .then(() => {
        clearTimeout(timeout);
        console.log('\n✅ Test completed');
    })
    .catch((error) => {
        clearTimeout(timeout);
        console.log('\n❌ Test failed:', error.message);
        process.exit(1);
    });
