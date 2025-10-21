/**
 * Debug Connection String
 * This shows exactly what the service is trying to connect to
 */

// Simulate the exact same environment loading as the service
require('dotenv').config();

console.log('🧪 Debugging Connection String...\n');

console.log('📋 Environment Variables:');
console.log('- RABBITMQ_URL:', process.env.RABBITMQ_URL);
console.log('- PORT:', process.env.PORT);
console.log('- NODE_ENV:', process.env.NODE_ENV);

console.log('\n🔗 Connection Details:');
const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
console.log('- Final RABBITMQ_URL:', rabbitmqUrl);
console.log('- Type:', typeof rabbitmqUrl);
console.log('- Length:', rabbitmqUrl ? rabbitmqUrl.length : 'undefined');

console.log('\n📁 Current Directory:', process.cwd());
console.log('- .env file exists:', require('fs').existsSync('.env'));

console.log('\n🔍 Testing connection with service URL...');

const amqp = require('amqplib');

async function testServiceConnection() {
    try {
        console.log('🔗 Attempting connection with:', rabbitmqUrl);
        const connection = await amqp.connect(rabbitmqUrl);
        console.log('✅ SUCCESS: Service connection string works!');

        const channel = await connection.createChannel();
        console.log('✅ Channel created successfully');

        await channel.close();
        await connection.close();
        console.log('✅ Connection closed');

    } catch (error) {
        console.log('❌ FAILED:', error.message);
        console.log('Full error:', error);
    }
}

testServiceConnection().catch(console.error);
