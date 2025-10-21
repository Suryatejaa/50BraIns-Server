const amqp = require('amqplib');

async function testRabbitMQConnection() {
    const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
    console.log('🔍 Testing RabbitMQ connection with URL:', url);

    try {
        console.log('🐰 Attempting to connect...');
        const connection = await amqp.connect(url);
        console.log('✅ Connection successful!');

        const channel = await connection.createChannel();
        console.log('✅ Channel created successfully!');

        await channel.close();
        await connection.close();
        console.log('✅ Connection closed successfully!');

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('Full error:', error);
    }
}

testRabbitMQConnection(); 