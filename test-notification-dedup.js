const WebSocket = require('ws');
const axios = require('axios');

async function testNotificationDeduplication() {
    console.log('🧪 Testing notification deduplication...\n');

    // Connect to WebSocket first
    const ws = new WebSocket('ws://localhost:3000/api/notifications/ws?userId=test-user-dedup');

    let messageCount = 0;
    const messages = [];

    ws.on('open', () => {
        console.log('✅ Connected to WebSocket');

        // Wait a moment for connection to stabilize, then create a gig
        setTimeout(async () => {
            try {
                console.log('📝 Creating test gig...');

                const gigData = {
                    title: "Test Gig for Notification Dedup",
                    description: "This is a test gig to verify notification deduplication",
                    category: "Technology",
                    subcategory: "Web Development",
                    budget: 1000,
                    deadline: "2025-08-15T23:59:59.999Z",
                    location: {
                        type: "remote"
                    },
                    skills: ["JavaScript", "Node.js"],
                    gigType: "one-time",
                    postedById: "test-user-dedup"
                };

                const response = await axios.post('http://localhost:3001/api/gigs', gigData);
                console.log('✅ Gig created successfully:', response.data.id);

                // Wait for notifications (should only be one now)
                setTimeout(() => {
                    console.log(`\n📊 Test Results:`);
                    console.log(`Total notifications received: ${messageCount}`);
                    console.log(`Expected: 1 (after deduplication fix)`);

                    if (messageCount === 1) {
                        console.log('✅ SUCCESS: Deduplication is working correctly!');
                    } else {
                        console.log('❌ FAILED: Still receiving duplicate notifications');
                    }

                    if (messages.length > 0) {
                        console.log('\n📨 Received notifications:');
                        messages.forEach((msg, index) => {
                            console.log(`${index + 1}. ${msg.title}: ${msg.message}`);
                        });
                    }

                    ws.close();
                }, 3000);

            } catch (error) {
                console.error('❌ Error creating gig:', error.response?.data || error.message);
                ws.close();
            }
        }, 1000);
    });

    ws.on('message', (data) => {
        messageCount++;
        try {
            const notification = JSON.parse(data.toString());
            messages.push(notification);
            console.log(`📨 Notification ${messageCount}:`, {
                title: notification.title,
                message: notification.message,
                type: notification.type
            });
        } catch (error) {
            console.log('❌ Failed to parse notification:', error.message);
        }
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
    });

    ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        process.exit(0);
    });
}

// Run the test
testNotificationDeduplication().catch(console.error);
