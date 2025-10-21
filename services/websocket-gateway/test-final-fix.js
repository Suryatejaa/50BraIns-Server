/**
 * Test Final RabbitMQ Fix
 */

const { RabbitMQService } = require('./src/services/rabbitmq.service');

async function testFinalFix() {
    console.log('🧪 Testing Final RabbitMQ Fix...\n');
    
    const rabbitmqService = new RabbitMQService();
    
    try {
        console.log('🔗 Step 1: Connecting to RabbitMQ...');
        await rabbitmqService.connect();
        console.log('✅ Connection successful');
        
        console.log('\n🔍 Step 2: Testing isReady() method...');
        const isReady = rabbitmqService.isReady();
        console.log('isReady():', isReady);
        
        console.log('\n📊 Step 3: Getting connection status...');
        const status = rabbitmqService.getConnectionStatus();
        console.log('Status:', JSON.stringify(status, null, 2));
        
        if (isReady) {
            console.log('\n🎉 SUCCESS: RabbitMQ fix is working!');
            console.log('The WebSocket Gateway should now work properly.');
        } else {
            console.log('\n❌ FAILED: RabbitMQ is still not ready');
            console.log('Status details:', status);
        }
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
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
testFinalFix().catch(console.error);
