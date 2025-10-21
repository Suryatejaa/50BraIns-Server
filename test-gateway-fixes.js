/**
 * Test WebSocket Gateway Fixes
 * This script tests the fixed WebSocket Gateway service
 */

const WebSocket = require('ws');

async function testGatewayFixes() {
    console.log('🧪 Testing WebSocket Gateway Fixes...\n');

    const testUser = 'test-user-fix';
    let ws = null;

    try {
        console.log('🔗 Connecting to WebSocket Gateway...');

        ws = new WebSocket(`ws://localhost:4000/ws?userId=${testUser}`);

        ws.on('open', () => {
            console.log('✅ Connected successfully');

            // Test ping message
            const pingMessage = { type: 'ping' };
            ws.send(JSON.stringify(pingMessage));
            console.log('📤 Sent ping message');

            // Test subscription
            setTimeout(() => {
                const subscribeMessage = {
                    type: 'subscribe_notifications'
                };
                ws.send(JSON.stringify(subscribeMessage));
                console.log('📤 Sent subscribe_notifications message');
            }, 1000);

            // Test unsubscription
            setTimeout(() => {
                const unsubscribeMessage = {
                    type: 'unsubscribe_notifications'
                };
                ws.send(JSON.stringify(unsubscribeMessage));
                console.log('📤 Sent unsubscribe_notifications message');
            }, 2000);

            // Test clan chat subscription
            setTimeout(() => {
                const clanSubscribeMessage = {
                    type: 'subscribe_clan_chat',
                    clanId: 'test-clan-123'
                };
                ws.send(JSON.stringify(clanSubscribeMessage));
                console.log('📤 Sent subscribe_clan_chat message');
            }, 3000);

            // Test clan chat unsubscription
            setTimeout(() => {
                const clanUnsubscribeMessage = {
                    type: 'unsubscribe_clan_chat',
                    clanId: 'test-clan-123'
                };
                ws.send(JSON.stringify(clanUnsubscribeMessage));
                console.log('📤 Sent unsubscribe_clan_chat message');
            }, 4000);
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log(`📥 Received: ${message.type}`);

                if (message.type === 'pong') {
                    console.log('✅ Ping-pong successful');
                } else if (message.type === 'subscription_confirmed') {
                    console.log(`✅ ${message.service} subscription confirmed: ${message.status}`);
                } else if (message.type === 'connected') {
                    console.log(`🔗 ${message.message}`);
                }
            } catch (error) {
                console.log(`❌ Error parsing message: ${error.message}`);
            }
        });

        ws.on('close', (code, reason) => {
            console.log(`🔌 Connection closed - Code: ${code}, Reason: ${reason}`);
        });

        ws.on('error', (error) => {
            console.log(`❌ WebSocket error: ${error.message}`);
        });

        // Keep connection alive for testing
        console.log('\n⏳ Keeping connection alive for 6 seconds...');
        await new Promise(resolve => setTimeout(resolve, 6000));

    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
    } finally {
        if (ws) {
            ws.close(1000, 'Test completed');
        }
        console.log('✅ Test completed');
    }
}

// Run the test
testGatewayFixes().catch(console.error);
