/**
 * Test Service Code Isolation
 * This tests our RabbitMQ service code directly
 */

const { RabbitMQService } = require('./src/services/rabbitmq.service');

async function testServiceIsolation() {
    console.log('🧪 Testing Service Code Isolation...\n');

    const rabbitmqService = new RabbitMQService();

    try {
        console.log('🔍 Step 1: Testing isReady() before connection...');
        const beforeStatus = rabbitmqService.getConnectionStatus();
        console.log('Before connection status:', JSON.stringify(beforeStatus, null, 2));

        console.log('\n🔍 Step 2: Testing isReady() before connection...');
        const beforeReady = rabbitmqService.isReady();
        console.log('isReady() before connection:', beforeReady);

        console.log('\n🔗 Step 3: Connecting to RabbitMQ...');
        await rabbitmqService.connect();
        console.log('✅ Connection successful');

        console.log('\n🔍 Step 4: Testing isReady() after connection...');
        const afterReady = rabbitmqService.isReady();
        console.log('isReady() after connection:', afterReady);

        console.log('\n📊 Step 5: Getting full connection status...');
        const afterStatus = rabbitmqService.getConnectionStatus();
        console.log('After connection status:', JSON.stringify(afterStatus, null, 2));

        if (afterReady) {
            console.log('\n🎉 SUCCESS: Service code is working correctly!');
            console.log('The issue must be elsewhere in the WebSocket Gateway.');
        } else {
            console.log('\n❌ FAILED: Service code has a bug in isReady() method');
            console.log('This explains why the WebSocket Gateway fails!');
        }

    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
        console.log('Full error:', error);
    } finally {
        if (rabbitmqService.connection) {
            try {
                await rabbitmqService.close();
                console.log('\n🔌 Connection closed');
            } catch (error) {
                console.log('❌ Error closing connection:', error.message);
            }
        }
    }
}

// Run the test
testServiceIsolation().catch(console.error);
