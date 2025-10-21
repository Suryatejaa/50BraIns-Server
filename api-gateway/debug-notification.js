const WebSocket = require('ws');
const axios = require('axios');

console.log('🕵️ Debugging notification sources...\n');

const ws = new WebSocket('ws://localhost:3000/api/notifications/ws?userId=cf2e0a3f-df3b-4cfb-ada5-c3dc6aa32117');

let notificationCount = 0;
let connectionCount = 0;

ws.on('open', () => {
    console.log('✅ Connected to WebSocket');

    // Wait a moment for connection messages, then create gig
    setTimeout(async () => {
        console.log('\n📝 Creating test gig to trigger notification...');

        try {
            const response = await axios.post('http://localhost:3000/api/gig/', {
                "budgetMax": "1000",
                "budgetMin": "500",
                "budgetType": "fixed",
                "category": "design",
                "deadline": "2025-08-15",
                "description": "Debug test gig for notification testing",
                "experienceLevel": "intermediate",
                "roleRequired": "crew",
                "skillsRequired": [
                    "Adobe Photoshop",
                    "Graphic Design"
                ],
                "title": "Debug Notification Test Gig"
            }, {
                headers: {
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZjJlMGEzZi1kZjNiLTRjZmItYWRhNS1jM2RjNmFhMzIxMTciLCJlbWFpbCI6InVzZXIxQGdtYWlsLmNvbSIsInJvbGVzIjpbIkNSRVciLCJCUkFORCIsIklORkxVRU5DRVIiLCJVU0VSIl0sImlhdCI6MTc1NDUwMzQ4MCwianRpIjoiMDdlNDU2MGYtNDJjYy00MDY0LWE3ZmQtNWFiNDQwMTg5YWIzIiwiZXhwIjoxNzU0NTA0MzgwfQ.j4QXeBDmEXcvTVAfdXSsD7pNBRs4pYqT1WxK8ZnRNMU',
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ Gig creation response: ${response.status}`);
        } catch (error) {
            console.log('❌ Gig creation failed:', error.response?.status, error.response?.data?.error);
        }
    }, 1000);
});

ws.on('message', (data) => {
    try {
        const notification = JSON.parse(data.toString());
        notificationCount++;

        if (notification.type === 'connection') {
            connectionCount++;
            console.log(`📨 Connection Message ${connectionCount}:`);
        } else {
            console.log(`📨 Notification ${notificationCount}:`);
        }

        console.log(`  Type: ${notification.type}`);
        console.log(`  Title: "${notification.title || notification.data?.title || 'undefined'}"`);
        console.log(`  Message: "${notification.message || notification.data?.message || 'undefined'}"`);

        if (notification.data) {
            console.log(`  Data Object:`, notification.data);
        }

        console.log(`  Full notification:`, JSON.stringify(notification, null, 2));
        console.log('');

        // Close after getting the gig notification (non-connection)
        if (notification.type !== 'connection' && notificationCount >= 3) {
            setTimeout(() => {
                console.log(`📊 Summary: ${connectionCount} connection messages, ${notificationCount - connectionCount} notifications`);
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
    ws.close();
    process.exit(1);
}, 10000);
