/**
 * Test WebSocket Gateway Connection
 * This script tests the WebSocket Gateway service to identify connection issues
 */

const WebSocket = require('ws');

async function testWebSocketGateway() {
    console.log('🧪 Testing WebSocket Gateway Connection...\n');

    const testUsers = [
        'test-user-1',
        'test-user-2',
        'test-user-3'
    ];

    const connections = [];

    try {
        // Test multiple connections
        for (const userId of testUsers) {
            console.log(`🔗 Connecting user: ${userId}`);
            
            const ws = new WebSocket(`ws://localhost:4000/ws?userId=${userId}`);
            
            ws.on('open', () => {
                console.log(`✅ ${userId}: Connected successfully`);
                
                // Send a test message
                const testMessage = {
                    type: 'ping',
                    timestamp: new Date().toISOString()
                };
                
                ws.send(JSON.stringify(testMessage));
                console.log(`📤 ${userId}: Sent ping message`);
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log(`📥 ${userId}: Received: ${message.type}`);
                    
                    if (message.type === 'pong') {
                        console.log(`✅ ${userId}: Ping-pong successful`);
                    }
                } catch (error) {
                    console.log(`❌ ${userId}: Error parsing message: ${error.message}`);
                }
            });
            
            ws.on('close', (code, reason) => {
                console.log(`🔌 ${userId}: Connection closed - Code: ${code}, Reason: ${reason}`);
            });
            
            ws.on('error', (error) => {
                console.log(`❌ ${userId}: WebSocket error: ${error.message}`);
            });
            
            connections.push(ws);
            
            // Wait a bit between connections
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Keep connections alive for a few seconds
        console.log('\n⏳ Keeping connections alive for 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Test health endpoints
        console.log('\n🏥 Testing health endpoints...');
        
        try {
            const healthResponse = await fetch('http://localhost:4000/health');
            const healthData = await healthResponse.json();
            console.log('✅ Health endpoint:', healthData.status);
        } catch (error) {
            console.log('❌ Health endpoint error:', error.message);
        }
        
        try {
            const rabbitmqResponse = await fetch('http://localhost:4000/health/rabbitmq');
            const rabbitmqData = await rabbitmqResponse.json();
            console.log('✅ RabbitMQ health:', rabbitmqData.status);
            console.log('   RabbitMQ ready:', rabbitmqData.rabbitmq?.isReady);
        } catch (error) {
            console.log('❌ RabbitMQ health error:', error.message);
        }
        
        try {
            const wsResponse = await fetch('http://localhost:4000/health/websocket');
            const wsData = await wsResponse.json();
            console.log('✅ WebSocket health:', wsData.status);
            console.log('   Active connections:', wsData.websocket?.connections?.activeConnections);
        } catch (error) {
            console.log('❌ WebSocket health error:', error.message);
        }
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
    } finally {
        // Close all connections
        console.log('\n🔌 Closing all connections...');
        for (const ws of connections) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1000, 'Test completed');
            }
        }
        
        console.log('✅ Test completed');
    }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.log('⚠️  Fetch not available, installing node-fetch...');
    const { default: fetch } = require('node-fetch');
    global.fetch = fetch;
}

// Run the test
testWebSocketGateway().catch(console.error);
