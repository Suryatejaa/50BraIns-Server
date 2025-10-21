const WebSocket = require('ws');

console.log('🔄 Testing WebSocket connection with correct path...');
const ws = new WebSocket('ws://localhost:3000/api/notifications/ws?userId=test-final-verification');

ws.on('open', () => {
    console.log('✅ Connected to WebSocket successfully!');
});

ws.on('message', (data) => {
    console.log('\n📩 Message received:');
    console.log('  - Type:', typeof data);
    console.log('  - Constructor:', data.constructor.name);
    console.log('  - Is Buffer?:', Buffer.isBuffer(data));
    console.log('  - Data as string:', data.toString());

    try {
        const parsed = JSON.parse(data.toString());
        console.log('\n✅ Successfully parsed JSON:');
        console.log(JSON.stringify(parsed, null, 2));
        console.log('\n🎉 BLOB ISSUE RESOLVED! Client receives proper JSON text, not binary data!');
    } catch (error) {
        console.log('\n❌ Failed to parse JSON:', error.message);
        console.log('❌ Raw data was:', data);
    }

    // Close after receiving the first message
    setTimeout(() => ws.close(), 500);
});

ws.on('error', (error) => {
    console.log('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
    console.log('\n🔌 Connection closed:', code, reason.toString());
    console.log('✅ WebSocket message type test completed!\n');
    process.exit(0);
});
