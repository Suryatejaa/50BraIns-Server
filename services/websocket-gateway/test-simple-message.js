/**
 * Simple Message Test
 * Tests basic message handling in WebSocket Gateway
 */

const WebSocket = require('ws');

async function testSimpleMessage() {
    console.log('🧪 Testing Simple Message Handling...\n');
    
    const testUser = 'test-user-' + Date.now();
    let ws = null;
    
    try {
        console.log('🔗 Connecting to WebSocket Gateway...');
        ws = new WebSocket(`ws://localhost:4000/ws?userId=${testUser}`);
        
        ws.on('open', () => {
            console.log('✅ Connected successfully');
            
            // Test 1: Send a simple ping
            setTimeout(() => {
                const pingMessage = { type: 'ping' };
                ws.send(JSON.stringify(pingMessage));
                console.log('📤 Sent ping message');
            }, 1000);
            
            // Test 2: Send notification subscription
            setTimeout(() => {
                const subscribeMessage = { type: 'subscribe_notifications' };
                ws.send(JSON.stringify(subscribeMessage));
                console.log('📤 Sent subscribe_notifications message');
            }, 2000);
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log(`📥 Received: ${JSON.stringify(message, null, 2)}`);
                
                if (message.type === 'pong') {
                    console.log('✅ Ping-pong working!');
                } else if (message.type === 'subscription_confirmed') {
                    console.log('✅ Subscription confirmed!');
                } else if (message.type === 'error') {
                    console.log(`❌ Error received: ${message.message}`);
                }
                
            } catch (error) {
                console.log(`❌ Error parsing message: ${error.message}`);
                console.log(`Raw data: ${data.toString()}`);
            }
        });
        
        ws.on('close', (code, reason) => {
            console.log(`🔌 Connection closed - Code: ${code}, Reason: ${reason}`);
        });
        
        ws.on('error', (error) => {
            console.log(`❌ WebSocket error: ${error.message}`);
        });
        
        // Keep connection alive for testing
        console.log('\n⏳ Keeping connection alive for 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
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
testSimpleMessage().catch(console.error);
