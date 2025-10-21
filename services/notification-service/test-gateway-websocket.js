const WebSocket = require('ws');

// Test WebSocket connection through API Gateway
async function testGatewayWebSocket() {
    const userId = 'test-user-123';
    const wsUrl = `ws://localhost:3000/api/notifications/ws?userId=${userId}`;
    
    console.log('🔍 Testing WebSocket connection through API Gateway...');
    console.log('URL:', wsUrl);
    
    try {
        const ws = new WebSocket(wsUrl);
        
        ws.on('open', () => {
            console.log('✅ WebSocket connected successfully through API Gateway!');
            console.log('📤 Sending test message...');
            
            // Send a test message
            ws.send(JSON.stringify({
                type: 'ping',
                message: 'Test connection from gateway'
            }));
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log('📥 Received message:', message);
                
                if (message.type === 'connection') {
                    console.log('✅ Connection confirmed by notification service');
                } else if (message.type === 'notification') {
                    console.log('📢 Real-time notification received:', message.data);
                }
            } catch (error) {
                console.log('📥 Raw message:', data.toString());
            }
        });
        
        ws.on('close', (code, reason) => {
            console.log('🔌 WebSocket closed:', code, reason?.toString());
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
        });
        
        // Close connection after 5 seconds
        setTimeout(() => {
            console.log('🔄 Closing test connection...');
            ws.close(1000, 'Test completed');
        }, 5000);
        
    } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error.message);
    }
}

// Test HTTP API calls through API Gateway
async function testGatewayAPI() {
    console.log('\n🔍 Testing HTTP API calls through API Gateway...');
    
    const baseUrl = 'http://localhost:3000/api/notifications';
    
    try {
        // Test health check
        console.log('📡 Testing health check...');
        const healthResponse = await fetch(`${baseUrl}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health check response:', healthData);
        
        // Test getting notifications for a user
        console.log('📡 Testing get notifications...');
        const notificationsResponse = await fetch(`${baseUrl}/test-user-123?limit=5`);
        const notificationsData = await notificationsResponse.json();
        console.log('✅ Notifications response:', notificationsData);
        
    } catch (error) {
        console.error('❌ HTTP API test failed:', error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting API Gateway WebSocket and HTTP tests...\n');
    
    await testGatewayAPI();
    await testGatewayWebSocket();
    
    console.log('\n✅ Tests completed!');
}

runTests().catch(console.error); 