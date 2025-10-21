/**
 * Test RabbitMQ Connection Status
 * This script tests the RabbitMQ connection directly to understand the issue
 */

const amqp = require('amqplib');

async function testRabbitMQConnection() {
    console.log('🧪 Testing RabbitMQ Connection Status...\n');

    let connection = null;
    let channel = null;

    try {
        console.log('🔗 Connecting to RabbitMQ...');

        const rabbitmqUrl = 'amqp://admin:admin123@localhost:5672';
        connection = await amqp.connect(rabbitmqUrl);
        console.log('✅ RabbitMQ connection established');

        console.log('\n📊 Connection Properties:');
        console.log('- connection:', typeof connection);
        console.log('- connection.constructor.name:', connection.constructor.name);
        console.log('- connection.state:', connection.state);
        console.log('- connection.connection:', connection.connection);
        console.log('- connection.closed:', connection.closed);
        console.log('- connection.readyState:', connection.readyState);

        if (connection.connection) {
            console.log('- connection.connection.state:', connection.connection.state);
            console.log('- connection.connection.readyState:', connection.connection.readyState);
        }

        console.log('\n🔧 Creating channel...');
        channel = await connection.createChannel();
        console.log('✅ Channel created');

        console.log('\n📊 Channel Properties:');
        console.log('- channel:', typeof channel);
        console.log('- channel.constructor.name:', channel.constructor.name);
        console.log('- channel.state:', channel.state);
        console.log('- channel.channel:', channel.channel);
        console.log('- channel.closed:', channel.closed);
        console.log('- channel.readyState:', channel.readyState);

        if (channel.channel) {
            console.log('- channel.channel.state:', channel.channel.state);
            console.log('- channel.channel.readyState:', channel.channel.readyState);
        }

        console.log('\n🔍 Testing isReady logic:');

        // Test different isReady implementations
        const test1 = connection && channel && !connection.closed && !channel.closed;
        const test2 = connection && channel && connection.state === 'open' && channel.state === 'open';
        const test3 = connection && channel &&
            (connection.connection && connection.connection.state === 'open' ||
                connection.state === 'open' ||
                !connection.closed) &&
            (channel.channel && channel.channel.state === 'open' ||
                channel.state === 'open' ||
                !channel.closed);

        console.log('- Test 1 (closed property):', test1);
        console.log('- Test 2 (state property):', test2);
        console.log('- Test 3 (combined):', test3);

        // Test exchange assertion
        console.log('\n🔍 Testing exchange assertion...');
        await channel.assertExchange('test_exchange', 'topic', { durable: true });
        console.log('✅ Exchange assertion successful');

        console.log('\n🎯 Recommended isReady implementation:');
        console.log('const isReady = connection && channel && connection.state === "open" && channel.state === "open";');

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        console.log('Stack:', error.stack);
    } finally {
        if (channel) {
            try {
                await channel.close();
                console.log('\n✅ Channel closed');
            } catch (error) {
                console.log('❌ Error closing channel:', error.message);
            }
        }

        if (connection) {
            try {
                await connection.close();
                console.log('✅ Connection closed');
            } catch (error) {
                console.log('❌ Error closing connection:', error.message);
            }
        }

        console.log('\n✅ Test completed');
    }
}

// Run the test
testRabbitMQConnection().catch(console.error);
