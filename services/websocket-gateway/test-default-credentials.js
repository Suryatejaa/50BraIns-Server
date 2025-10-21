/**
 * Test RabbitMQ with Default Credentials
 */

const amqp = require('amqplib');

async function testDefaultCredentials() {
    console.log('🧪 Testing RabbitMQ with Default Credentials...\n');
    
    const testCredentials = [
        'amqp://guest:guest@localhost:5672',
        'amqp://admin:admin123@localhost:5672',
        'amqp://localhost:5672',
        'amqp://guest:guest@localhost:5672'
    ];
    
    for (let i = 0; i < testCredentials.length; i++) {
        const cred = testCredentials[i];
        console.log(`\n🔗 Test ${i + 1}: ${cred}`);
        
        try {
            const connection = await amqp.connect(cred);
            console.log(`✅ SUCCESS with: ${cred}`);
            
            const channel = await connection.createChannel();
            console.log('✅ Channel created');
            
            await channel.assertExchange('test_exchange', 'topic', { durable: true });
            console.log('✅ Exchange asserted');
            
            await channel.close();
            await connection.close();
            console.log('✅ Connection closed');
            
            console.log(`\n🎉 WORKING CREDENTIALS FOUND: ${cred}`);
            console.log('Update your .env file with these credentials!');
            return;
            
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
        }
    }
    
    console.log('\n❌ All credential combinations failed');
    console.log('Check your RabbitMQ Docker container configuration');
}

// Run with timeout
const timeout = setTimeout(() => {
    console.log('\n⏰ Test timed out after 20 seconds');
    process.exit(1);
}, 20000);

testDefaultCredentials()
    .then(() => {
        clearTimeout(timeout);
        console.log('\n✅ Test completed');
    })
    .catch((error) => {
        clearTimeout(timeout);
        console.log('\n❌ Test failed:', error.message);
        process.exit(1);
    });
