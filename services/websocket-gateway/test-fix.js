/**
 * Test the RabbitMQ fix
 */

const { RabbitMQService } = require('./src/services/rabbitmq.service');

async function testFix() {
    console.log('🧪 Testing RabbitMQ Fix...\n');

    const rabbitmqService = new RabbitMQService();

    try {
        console.log('🔗 Connecting to RabbitMQ...');
        await rabbitmqService.connect();

        console.log('\n📊 Connection Status:');
        const status = rabbitmqService.getConnectionStatus();
        console.log(JSON.stringify(status, null, 2));

        console.log('\n✅ Test completed successfully!');

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    } finally {
        if (rabbitmqService.connection) {
            try {
                await rabbitmqService.close();
                console.log('🔌 Connection closed');
            } catch (error) {
                console.log('❌ Error closing connection:', error.message);
            }
        }
    }
}

testFix().catch(console.error);
