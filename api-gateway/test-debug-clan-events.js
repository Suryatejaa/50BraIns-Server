const WebSocket = require('ws');
const axios = require('axios');

console.log('🐰 Testing RabbitMQ event flow for clan notifications...\n');

// User credentials
const user1 = {
    id: 'cf2e0a3f-df3b-4cfb-ada5-c3dc6aa32117',
    email: 'user1@gmail.com',
    name: 'User 1',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZjJlMGEzZi1kZjNiLTRjZmItYWRhNS1jM2RjNmFhMzIxMTciLCJlbWFpbCI6InVzZXIxQGdtYWlsLmNvbSIsInJvbGVzIjpbIkNSRVciLCJCUkFORCIsIklORkxVRU5DRVIiLCJVU0VSIl0sImlhdCI6MTc1NDkxMDMyMSwianRpIjoiMmE2M2ZhNTEtNzM4OC00YzZiLWJhMzgtOWY1ZWExMDM0NTczIiwiZXhwIjoxNzU0OTExMjIxfQ.ldSr2RSsUWGHEe7HaO9buSj_vatzqrIMw-HmJBYvoQQ'
};

const user2 = {
    id: 'a31ccb74-2479-441d-88f2-dc6701e181a4',
    email: 'comfortsgents@gmail.com',
    name: 'Comforts Gents',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhMzFjY2I3NC0yNDc5LTQ0MWQtODhmMi1kYzY3MDFlMTgxYTQiLCJlbWFpbCI6ImNvbWZvcnRzZ2VudHNAZ21haWwuY29tIiwicm9sZXMiOlsiVVNFUiIsIklORkxVRU5DRVIiXSwiaWF0IjoxNzU0OTEwMzIxLCJqdGkiOiIyMGU5YjUyMi1hZWMwLTQ4OWItOTUyZC1lNDBkMzAyMWM4ZDMiLCJleHAiOjE3NTQ5MTEyMjF9._xS8HzFHAhVAw1OUl7ZZ1m0xNFWL6_mW-fn5MfUKi50'
};

let testClanId = null;
let joinRequestId = null;
let notifications = [];

// Single WebSocket connection for user1 to see all notifications
const ws = new WebSocket(`ws://localhost:3000/api/notifications/ws?userId=${user1.id}`);

ws.on('open', () => {
    console.log('✅ Connected to WebSocket (User 1)');

    setTimeout(() => startTest(), 1000);
});

ws.on('message', (data) => {
    try {
        const notification = JSON.parse(data.toString());

        if (notification.type !== 'connection') {
            notifications.push(notification);

            const title = notification.title || notification.data?.title || 'undefined';
            const message = notification.message || notification.data?.message || 'undefined';
            const category = notification.data?.category || notification.category || 'undefined';

            console.log(`\n📨 NOTIFICATION #${notifications.length}:`);
            console.log(`   📋 Title: "${title}"`);
            console.log(`   📝 Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
            console.log(`   🏷️  Category: ${category}`);
            console.log(`   🕒 Received: ${new Date().toLocaleTimeString()}`);

            if (notification.data?.metadata) {
                console.log(`   🔍 Metadata:`, notification.data.metadata);
            }
        }
    } catch (error) {
        console.log('❌ Notification parse error:', error.message);
    }
});

async function startTest() {
    console.log('🚀 Starting step-by-step clan notification test...\n');

    // Step 1: Create clan
    console.log('🏛️ STEP 1: Creating clan (User 1)...');
    const clanCreated = await createClan();
    if (!clanCreated) return;

    await wait(3000, 'Waiting for clan creation notification...');

    // Step 2: Join request  
    console.log('\n👥 STEP 2: Requesting to join clan (User 2)...');
    const joinRequested = await requestJoin();
    if (!joinRequested) return;

    await wait(5000, 'Waiting for join request notification...');

    // Step 3: Get join requests
    console.log('\n📋 STEP 3: Getting join requests (User 1)...');
    const requestsFound = await getJoinRequests();

    await wait(2000, 'Processing join requests...');

    // Step 4: Approve join request
    if (requestsFound && joinRequestId) {
        console.log('\n✅ STEP 4: Approving join request (User 1)...');
        await approveJoinRequest();

        await wait(5000, 'Waiting for approval notifications...');
    }

    // Final summary
    showSummary();
}

async function createClan() {
    try {
        const response = await axios.post('http://localhost:3000/api/clan', {
            name: `Debug Test Clan ${Date.now()}`,
            description: 'Debug testing for clan notifications',
            primaryCategory: 'TECHNOLOGY',
            categories: ['TECHNOLOGY'],
            location: 'Remote',
            visibility: 'PUBLIC'
        }, {
            headers: {
                'Authorization': `Bearer ${user1.token}`,
                'Content-Type': 'application/json'
            }
        });

        testClanId = response.data.data.id;
        console.log(`   ✅ Clan created: ${testClanId}`);
        return true;
    } catch (error) {
        console.log(`   ❌ Failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        return false;
    }
}

async function requestJoin() {
    try {
        const response = await axios.post(`http://localhost:3000/api/clan/${testClanId}/join`, {
            message: 'Debug test join request - testing notifications'
        }, {
            headers: {
                'Authorization': `Bearer ${user2.token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   ✅ Join request submitted: ${response.status}`);
        return true;
    } catch (error) {
        console.log(`   ❌ Failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        return false;
    }
}

async function getJoinRequests() {
    try {
        const response = await axios.get(`http://localhost:4003/members/${testClanId}/join-requests`, {
            headers: {
                'Authorization': `Bearer ${user1.token}`,
                'x-user-id': user1.id
            }
        });

        const requests = response.data.data || [];
        console.log(`   ✅ Found ${requests.length} join request(s)`);

        if (requests.length > 0) {
            joinRequestId = requests[0].id;
            console.log(`   📋 Request ID: ${joinRequestId}`);
            console.log(`   👤 Requester: ${requests[0].userId}`);
            return true;
        }
        return false;
    } catch (error) {
        console.log(`   ❌ Failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        return false;
    }
}

async function approveJoinRequest() {
    try {
        const response = await axios.post(`http://localhost:4003/members/${testClanId}/join-requests/${joinRequestId}/approve`, {
            role: 'MEMBER'
        }, {
            headers: {
                'Authorization': `Bearer ${user1.token}`,
                'x-user-id': user1.id,
                'Content-Type': 'application/json'
            }
        });

        console.log(`   ✅ Join request approved: ${response.status}`);
        return true;
    } catch (error) {
        console.log(`   ❌ Failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        return false;
    }
}

async function wait(ms, message) {
    console.log(`\n⏳ ${message}`);
    await new Promise(resolve => setTimeout(resolve, ms));
}

function showSummary() {
    console.log('\n🎯 DEBUG TEST RESULTS:');
    console.log('═'.repeat(60));
    console.log(`📨 Total notifications received: ${notifications.length}`);
    console.log(`🏛️ Test clan ID: ${testClanId}`);
    console.log(`📋 Join request ID: ${joinRequestId}`);

    if (notifications.length > 0) {
        console.log('\n📋 Notifications received:');
        notifications.forEach((notif, index) => {
            const title = notif.title || notif.data?.title || 'undefined';
            const category = notif.data?.category || notif.category || 'undefined';
            console.log(`   ${index + 1}. [${category}] ${title}`);
        });
    } else {
        console.log('\n⚠️ No notifications received');
    }

    console.log('\n🔍 EXPECTED NOTIFICATIONS:');
    console.log('   1. Clan Created (User 1) ✅ Expected');
    console.log('   2. Join Request Submitted (User 1) ❓ Missing?');
    console.log('   3. Join Request Approved (User 2) ❓ Missing?');
    console.log('   4. Member Joined (User 1 & User 2) ❓ Missing?');

    console.log('\n💡 DEBUGGING TIPS:');
    console.log('   • Check clan service logs for published events');
    console.log('   • Check notification service logs for received events');
    console.log('   • Verify RabbitMQ exchange and queue bindings');
    console.log('   • Check if events are being filtered/skipped');

    ws.close();
}

ws.on('error', (error) => {
    console.log('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
    console.log('\n🔌 WebSocket connection closed');
    process.exit(0);
});

setTimeout(() => {
    console.log('\n⏰ Test timeout - ending test');
    showSummary();
}, 30000);
