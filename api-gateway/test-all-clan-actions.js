const WebSocket = require('ws');
const axios = require('axios');

console.log('🏛️ Testing ALL clan notification flows...\n');

const mainUserId = 'cf2e0a3f-df3b-4cfb-ada5-c3dc6aa32117'; // Clan creator
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZjJlMGEzZi1kZjNiLTRjZmItYWRhNS1jM2RjNmFhMzIxMTciLCJlbWFpbCI6InVzZXIxQGdtYWlsLmNvbSIsInJvbGVzIjpbIkNSRVciLCJCUkFORCIsIklORkxVRU5DRVIiLCJVU0VSIl0sImlhdCI6MTc1NDkwOTA5NCwianRpIjoiMDQ0YzU3ODMtYjk2MS00MWIzLThlY2ItYzdkYjMzY2FkNTlhIiwiZXhwIjoxNzU0OTA5OTk0fQ.ctaAuZ8kUmmEbwxEl7Qg_GXncs6Y4deLcG4dd5p6H0E';

// Test data
let testClanId = null;
let testNotifications = [];

const ws = new WebSocket(`ws://localhost:3000/api/notifications/ws?userId=${mainUserId}`);

ws.on('open', () => {
    console.log('✅ Connected to WebSocket');
    console.log('🧪 Starting comprehensive clan notifications test...\n');

    // Start the test sequence
    setTimeout(() => testClanCreation(), 1000);
});

ws.on('message', (data) => {
    try {
        const notification = JSON.parse(data.toString());

        if (notification.type !== 'connection') {
            testNotifications.push(notification);
            console.log(`📨 Notification #${testNotifications.length}:`);

            const title = notification.title || notification.data?.title || 'undefined';
            const message = notification.message || notification.data?.message || 'undefined';
            const category = notification.data?.category || notification.category || 'undefined';

            console.log(`  📋 Title: "${title}"`);
            console.log(`  📝 Message: "${message}"`);
            console.log(`  🏷️  Category: ${category}`);

            if (notification.data?.metadata) {
                console.log(`  🔍 Metadata:`, notification.data.metadata);
            }
            console.log('');
        }
    } catch (error) {
        console.log('❌ Failed to parse notification:', error.message);
    }
});

// Test Functions
async function testClanCreation() {
    console.log('🏛️ Test 1: Creating clan...');
    try {
        const response = await axios.post('http://localhost:3000/api/clan', {
            name: `Test Clan ${Date.now()}`,
            description: 'Testing all clan notifications',
            primaryCategory: 'TECHNOLOGY',
            categories: ['TECHNOLOGY'],
            location: 'Remote',
            visibility: 'PUBLIC',
            tagline: 'Complete notification testing'
        }, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        testClanId = response.data.data.id;
        console.log(`✅ Clan created successfully! ID: ${testClanId}`);

        // Wait for notification then test join request
        setTimeout(() => testJoinRequest(), 3000);

    } catch (error) {
        console.log('❌ Clan creation failed:', error.response?.status, error.response?.data);
        finishTest();
    }
}

async function testJoinRequest() {
    if (!testClanId) {
        console.log('⏭️ Skipping join request test - no clan ID');
        setTimeout(() => finishTest(), 1000);
        return;
    }

    console.log('👥 Test 2: Testing join request (simulated with different user)...');

    // Note: This would require a different user account to test properly
    // For now, let's try to test what we can with current user
    try {
        const response = await axios.post(`http://localhost:3000/api/clan/${testClanId}/join`, {
            message: 'I would like to join this clan for testing notifications'
        }, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ Join request status: ${response.status}`);

    } catch (error) {
        console.log(`⚠️ Join request test: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        // This might fail if user is already owner, which is expected
    }

    // Wait then test getting join requests (as clan head)
    setTimeout(() => testGetJoinRequests(), 2000);
}

async function testGetJoinRequests() {
    if (!testClanId) {
        setTimeout(() => finishTest(), 1000);
        return;
    }

    console.log('📋 Test 3: Getting join requests...');
    try {
        const response = await axios.get(`http://localhost:4003/members/${testClanId}/join-requests`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'x-user-id': mainUserId
            }
        });

        console.log(`✅ Join requests retrieved: ${response.status}`);
        console.log(`📊 Found ${response.data.data?.length || 0} join requests`);

    } catch (error) {
        console.log(`⚠️ Get join requests: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }

    // Wait then test clan member operations
    setTimeout(() => testClanMembers(), 2000);
}

async function testClanMembers() {
    if (!testClanId) {
        setTimeout(() => finishTest(), 1000);
        return;
    }

    console.log('👥 Test 4: Getting clan members...');
    try {
        const response = await axios.get(`http://localhost:4003/members/${testClanId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'x-user-id': mainUserId
            }
        });

        console.log(`✅ Clan members retrieved: ${response.status}`);
        console.log(`👤 Found ${response.data.data?.length || 0} members`);

    } catch (error) {
        console.log(`⚠️ Get clan members: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }

    // Finish test
    setTimeout(() => finishTest(), 2000);
}

function finishTest() {
    console.log('\n🎯 TEST SUMMARY:');
    console.log('═'.repeat(50));
    console.log(`📨 Total notifications received: ${testNotifications.length}`);

    if (testNotifications.length > 0) {
        console.log('\n📋 Notification breakdown:');
        testNotifications.forEach((notif, index) => {
            const title = notif.title || notif.data?.title || 'undefined';
            const category = notif.data?.category || notif.category || 'undefined';
            console.log(`  ${index + 1}. [${category}] ${title}`);
        });

        console.log('\n✅ Clan notifications are working!');
    } else {
        console.log('\n⚠️ No notifications received - check notification service');
    }

    console.log('\n🔍 Expected notifications for full clan workflow:');
    console.log('  • Clan created ✅');
    console.log('  • Join request submitted (requires different user)');
    console.log('  • Join request approved/rejected (requires different user)');
    console.log('  • Member joined (requires different user)');
    console.log('  • Role changed (requires different user)');
    console.log('  • Member left (requires different user)');

    ws.close();
}

ws.on('error', (error) => {
    console.log('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
    console.log(`\n🔌 Connection closed: ${code} ${reason.toString()}`);
    process.exit(0);
});

// Safety timeout
setTimeout(() => {
    console.log('\n⏰ Test timeout reached');
    finishTest();
}, 20000);
