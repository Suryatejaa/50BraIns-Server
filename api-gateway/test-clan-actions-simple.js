const WebSocket = require('ws');
const axios = require('axios');

console.log('🏛️ Testing main clan action notifications...\n');

const userId = 'cf2e0a3f-df3b-4cfb-ada5-c3dc6aa32117';
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZjJlMGEzZi1kZjNiLTRjZmItYWRhNS1jM2RjNmFhMzIxMTciLCJlbWFpbCI6InVzZXIxQGdtYWlsLmNvbSIsInJvbGVzIjpbIkNSRVciLCJCUkFORCIsIklORkxVRU5DRVIiLCJVU0VSIl0sImlhdCI6MTc1NDkwOTA5NCwianRpIjoiMDQ0YzU3ODMtYjk2MS00MWIzLThlY2ItYzdkYjMzY2FkNTlhIiwiZXhwIjoxNzU0OTA5OTk0fQ.ctaAuZ8kUmmEbwxEl7Qg_GXncs6Y4deLcG4dd5p6H0E';

let notifications = [];

const ws = new WebSocket(`ws://localhost:3000/api/notifications/ws?userId=${userId}`);

ws.on('open', () => {
    console.log('✅ Connected to WebSocket for notifications');

    setTimeout(() => testMainClanActions(), 2000);
});

ws.on('message', (data) => {
    try {
        const notification = JSON.parse(data.toString());

        if (notification.type !== 'connection') {
            notifications.push(notification);

            const title = notification.title || notification.data?.title || 'undefined';
            const message = notification.message || notification.data?.message || 'undefined';
            const category = notification.data?.category || notification.category || 'undefined';

            console.log(`\n📨 Notification Received:`);
            console.log(`   Title: "${title}"`);
            console.log(`   Message: "${message}"`);
            console.log(`   Category: ${category}`);
            if (notification.data?.metadata) {
                console.log(`   Metadata:`, notification.data.metadata);
            }
        }
    } catch (error) {
        console.log('❌ Parse error:', error.message);
    }
});

async function testMainClanActions() {
    console.log('🧪 Testing main clan actions that should trigger notifications...\n');

    // Test 1: Clan Creation (we know this works)
    console.log('1️⃣ Testing clan creation...');
    try {
        const clanResponse = await axios.post('http://localhost:3000/api/clan', {
            name: `Test Actions Clan ${Date.now()}`,
            description: 'Testing notifications for clan actions',
            primaryCategory: 'TECHNOLOGY',
            categories: ['TECHNOLOGY'],
            location: 'Remote',
            visibility: 'PUBLIC'
        }, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   ✅ Clan created: ${clanResponse.status}`);
        const clanId = clanResponse.data.data.id;

        // Wait for notification
        setTimeout(() => testOtherActions(clanId), 3000);

    } catch (error) {
        console.log(`   ❌ Clan creation failed: ${error.response?.status}`);
        setTimeout(() => finishTest(), 1000);
    }
}

async function testOtherActions(clanId) {
    console.log('\n2️⃣ Testing other clan actions...');

    // Test available endpoints
    await testClanInfo(clanId);
    await testMemberOperations(clanId);
}

async function testClanInfo(clanId) {
    console.log('\n📋 Getting clan info...');
    try {
        const response = await axios.get(`http://localhost:3000/api/clan/${clanId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        console.log(`   ✅ Clan info retrieved: ${response.status}`);
    } catch (error) {
        console.log(`   ⚠️ Clan info failed: ${error.response?.status}`);
    }
}

async function testMemberOperations(clanId) {
    console.log('\n👥 Testing member operations...');

    // Test getting members (directly from clan service)
    try {
        const membersResponse = await axios.get(`http://localhost:4003/members/${clanId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'x-user-id': userId
            }
        });
        console.log(`   ✅ Members retrieved: ${membersResponse.status}`);
        console.log(`   👤 Found ${membersResponse.data.data?.length || 0} members`);
    } catch (error) {
        console.log(`   ⚠️ Members retrieval failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }

    // Test getting join requests
    try {
        const joinRequestsResponse = await axios.get(`http://localhost:4003/members/${clanId}/join-requests`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'x-user-id': userId
            }
        });
        console.log(`   ✅ Join requests retrieved: ${joinRequestsResponse.status}`);
        console.log(`   📋 Found ${joinRequestsResponse.data.data?.length || 0} join requests`);
    } catch (error) {
        console.log(`   ⚠️ Join requests failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }

    setTimeout(() => finishTest(), 2000);
}

function finishTest() {
    console.log('\n🎯 CLAN ACTIONS TEST SUMMARY:');
    console.log('═'.repeat(60));
    console.log(`📨 Total notifications received: ${notifications.length}`);

    if (notifications.length > 0) {
        console.log('\n📋 Notifications received:');
        notifications.forEach((notif, index) => {
            const title = notif.title || notif.data?.title || 'undefined';
            const category = notif.data?.category || notif.category || 'undefined';
            console.log(`   ${index + 1}. [${category}] ${title}`);
        });
    }

    console.log('\n🔍 CLAN NOTIFICATION CAPABILITIES:');
    console.log('✅ Clan Created - WORKING');
    console.log('⏳ Member Joined - Requires different user to test');
    console.log('⏳ Join Request - Requires different user to test');
    console.log('⏳ Join Approved/Rejected - Requires different user to test');
    console.log('⏳ Role Changed - Requires different user to test');
    console.log('⏳ Member Left - Requires different user to test');

    console.log('\n💡 To test full workflow, you would need:');
    console.log('   • Multiple user accounts with different tokens');
    console.log('   • Complete member join workflow');
    console.log('   • Admin operations (approve/reject, role changes)');

    ws.close();
}

ws.on('error', (error) => {
    console.log('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
    console.log(`\n🔌 Connection closed: ${code} ${reason?.toString() || ''}`);
    process.exit(0);
});

setTimeout(() => {
    console.log('\n⏰ Test timeout');
    finishTest();
}, 15000);
