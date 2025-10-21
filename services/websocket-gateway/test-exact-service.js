/**
 * Test Exact Service Code Path
 * This replicates exactly what the service does
 */

// Load environment variables exactly like the service
require('dotenv').config();

const { RabbitMQService } = require('./src/services/rabbitmq.service');

async function testExactService() {
    console.log('🧪 Testing Exact Service Code Path...\n');

    console.log('📋 Environment check:');
    console.log('- RABBITMQ_URL:', process.env.RABBITMQ_URL);
    console.log('- Current directory:', process.cwd());

    const rabbitmqService = new RabbitMQService();

    try {
        console.log('\n🔗 Step 1: Calling rabbitmqService.connect()...');
        console.log('- This is the EXACT same call the service makes');

        await rabbitmqService.connect();
        console.log('✅ SUCCESS: Service connection method works!');

        console.log('\n🔍 Step 2: Testing isReady()...');
        const isReady = rabbitmqService.isReady();
        console.log('- isReady():', isReady);

        console.log('\n📊 Step 3: Getting connection status...');
        const status = rabbitmqService.getConnectionStatus();
        console.log('- Status:', JSON.stringify(status, null, 2));

        if (isReady) {
            console.log('\n🎉 PERFECT: The service should work now!');
        } else {
            console.log('\n❌ Still not ready - there\'s another issue');
        }

    } catch (error) {
        console.log(`\n❌ ERROR in service.connect(): ${error.message}`);
        console.log('Full error:', error);

        // This is the exact error the service is getting!
        console.log('\n🔍 DIAGNOSIS: This error explains why the WebSocket Gateway fails');
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
testExactService().catch(console.error);
