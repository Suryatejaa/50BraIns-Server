const WebSocket = require('ws');
const axios = require('axios');

console.log('🏛️ Testing clan notification flow...\n');

const userId = 'cf2e0a3f-df3b-4cfb-ada5-c3dc6aa32117'; // User from JWT
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZjJlMGEzZi1kZjNiLTRjZmItYWRhNS1jM2RjNmFhMzIxMTciLCJlbWFpbCI6InVzZXIxQGdtYWlsLmNvbSIsInJvbGVzIjpbIkNSRVciLCJCUkFORCIsIklORkxVRU5DRVIiLCJVU0VSIl0sImlhdCI6MTc1NDkwOTA5NCwianRpIjoiMDQ0YzU3ODMtYjk2MS00MWIzLThlY2ItYzdkYjMzY2FkNTlhIiwiZXhwIjoxNzU0OTA5OTk0fQ.ctaAuZ8kUmmEbwxEl7Qg_GXncs6Y4deLcG4dd5p6H0E';

const ws = new WebSocket(`ws://localhost:3000/api/notifications/ws?userId=${userId}`);

let notificationCount = 0;
let connectionCount = 0;

ws.on('open', () => {
    console.log('✅ Connected to WebSocket');

    // Wait for connection messages, then create clan
    setTimeout(async () => {
        console.log('\n🏛️ Creating test clan...');

        try {
            const response = await axios.post('http://localhost:3000/api/clan', {
                name: 'Test Notification Clan',
                description: 'Testing clan notifications',
                primaryCategory: 'TECHNOLOGY',
                categories: ['TECHNOLOGY', 'DESIGN'],
                location: 'Remote',
                visibility: 'PUBLIC',
                tagline: 'Testing clan events'
            }, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ Clan creation response: ${response.status}`);
            console.log('Clan data:', JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.log('❌ Clan creation failed:', error.response?.status, error.response?.data);
        }
    }, 2000);
});

ws.on('message', (data) => {
    try {
        const notification = JSON.parse(data.toString());
        notificationCount++;

        if (notification.type === 'connection') {
            connectionCount++;
            console.log(`📨 Connection Message ${connectionCount}:`);
            console.log(`  Title: "${notification.title}"`);
            console.log(`  Message: "${notification.message}"`);
        } else {
            console.log(`📨 Notification ${notificationCount}:`);
            console.log(`  Type: ${notification.type}`);

            // Handle nested data structure
            const title = notification.title || notification.data?.title || 'undefined';
            const message = notification.message || notification.data?.message || 'undefined';

            console.log(`  Title: "${title}"`);
            console.log(`  Message: "${message}"`);
            console.log(`  Category: ${notification.data?.category || notification.category || 'undefined'}`);

            if (notification.data?.metadata) {
                console.log(`  Metadata:`, notification.data.metadata);
            }
        }

        console.log(''); // Empty line for readability

        // Close after receiving clan notification (non-connection)
        if (notification.type !== 'connection' && notificationCount >= 3) {
            setTimeout(() => {
                console.log(`📊 Summary: ${connectionCount} connection messages, ${notificationCount - connectionCount} clan notifications`);
                ws.close();
            }, 500);
        }
    } catch (error) {
        console.log('❌ Failed to parse notification:', error.message);
        console.log('Raw data:', data.toString());
    }
});

ws.on('error', (error) => {
    console.log('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
    console.log(`🔌 Connection closed: ${code} ${reason.toString()}`);
    process.exit(0);
});

// Timeout to prevent hanging
setTimeout(() => {
    console.log('⏰ Test timeout reached');
    console.log(`📊 Final Summary: ${connectionCount} connection messages, ${notificationCount - connectionCount} clan notifications`);
    ws.close();
    process.exit(1);
}, 15000);
