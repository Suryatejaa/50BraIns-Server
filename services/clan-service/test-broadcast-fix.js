/**
 * Test script for broadcasting fix
 * Run with: node test-broadcast-fix.js
 */

const WebSocket = require('ws');

async function testBroadcasting() {
    console.log('🧪 Testing Broadcasting Fix...\n');

    const userId1 = 'test-user-1';
    const userId2 = 'test-user-2';
    const clanId = 'test-clan-456';

    const wsUrl1 = `ws://localhost:4003/ws?userId=${userId1}&clanId=${clanId}`;
    const wsUrl2 = `ws://localhost:4003/ws?userId=${userId2}&clanId=${clanId}`;

    try {
        console.log('1️⃣ Connecting first user...');
        const ws1 = new WebSocket(wsUrl1);

        await new Promise((resolve, reject) => {
            ws1.on('open', () => {
                console.log('✅ First user connected');
                resolve();
            });
            ws1.on('error', reject);
        });

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('\n2️⃣ Connecting second user...');
        const ws2 = new WebSocket(wsUrl2);

        await new Promise((resolve, reject) => {
            ws2.on('open', () => {
                console.log('✅ Second user connected');
                resolve();
            });
            ws2.on('error', reject);
        });

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('\n3️⃣ Testing message broadcasting...');

        // Listen for messages on both connections
        let messageReceived1 = false;
        let messageReceived2 = false;

        ws1.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'chat') {
                console.log('📨 User 1 received message:', message.content);
                messageReceived1 = true;
            }
        });

        ws2.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'chat') {
                console.log('📨 User 2 received message:', message.content);
                messageReceived2 = true;
            }
        });

        // Send message from first user
        ws1.send(JSON.stringify({
            type: 'chat',
            content: 'Test broadcast message',
            messageType: 'TEXT'
        }));

        // Wait for messages to be received
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('\n4️⃣ Checking results...');
        if (messageReceived1 && messageReceived2) {
            console.log('✅ Broadcasting working correctly!');
        } else {
            console.log('❌ Broadcasting failed!');
            console.log('User 1 received:', messageReceived1);
            console.log('User 2 received:', messageReceived2);
        }

        console.log('\n5️⃣ Closing connections...');
        ws1.close();
        ws2.close();

        console.log('\n🎉 Broadcast test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testBroadcasting().catch(console.error);
