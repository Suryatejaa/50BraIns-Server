const WebSocket = require('ws');

// Test WebSocket connection
async function testWebSocket() {
    const userId = 'test-user-123';
    const wsUrl = `ws://localhost:4009?userId=${userId}`;
    
    console.log('🔌 Testing WebSocket connection...');
    console.log('URL:', wsUrl);
    
    try {
        const ws = new WebSocket(wsUrl);
        
        ws.on('open', () => {
            console.log('✅ WebSocket connected successfully!');
            
            // Send a ping message
            ws.send(JSON.stringify({ type: 'ping' }));
        });
        
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            console.log('📨 Received message:', message);
            
            if (message.type === 'connection') {
                console.log('✅ Connection confirmed by server');
            } else if (message.type === 'pong') {
                console.log('✅ Ping-pong working correctly');
            } else if (message.type === 'notification') {
                console.log('🎉 Real-time notification received!');
                console.log('Notification:', message.data);
            }
        });
        
        ws.on('close', (code, reason) => {
            console.log('🔌 WebSocket closed:', code, reason);
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error);
        });
        
        // Keep connection alive for 10 seconds
        setTimeout(() => {
            console.log('🔌 Closing test connection...');
            ws.close();
        }, 10000);
        
    } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error);
    }
}

// Test notification sending
async function testNotificationSending() {
    console.log('\n📤 Testing notification sending...');
    
    try {
        const response = await fetch('http://localhost:4009/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: 'test-user-123',
                type: 'TRANSACTIONAL',
                category: 'SYSTEM',
                title: '🧪 WebSocket Test Notification',
                message: 'This is a test notification sent at ' + new Date().toLocaleString(),
                metadata: { test: true }
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Notification sent successfully:', data);
        } else {
            console.error('❌ Failed to send notification:', data);
        }
    } catch (error) {
        console.error('❌ Error sending notification:', error);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting WebSocket tests...\n');
    
    // Start WebSocket test
    testWebSocket();
    
    // Wait 2 seconds then send test notification
    setTimeout(() => {
        testNotificationSending();
    }, 2000);
}

// Run if this file is executed directly
if (require.main === module) {
    runTests();
}

module.exports = { testWebSocket, testNotificationSending }; 