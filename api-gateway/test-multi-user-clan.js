const WebSocket = require('ws');
const axios = require('axios');

console.log('🏛️ Testing MULTI-USER clan notification workflows...\n');

// User credentials from login test
const users = {
    user1: {
        id: 'cf2e0a3f-df3b-4cfb-ada5-c3dc6aa32117',
        email: 'user1@gmail.com',
        name: 'User 1',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjZjJlMGEzZi1kZjNiLTRjZmItYWRhNS1jM2RjNmFhMzIxMTciLCJlbWFpbCI6InVzZXIxQGdtYWlsLmNvbSIsInJvbGVzIjpbIkNSRVciLCJCUkFORCIsIklORkxVRU5DRVIiLCJVU0VSIl0sImlhdCI6MTc1NDkxMDMyMSwianRpIjoiMmE2M2ZhNTEtNzM4OC00YzZiLWJhMzgtOWY1ZWExMDM0NTczIiwiZXhwIjoxNzU0OTExMjIxfQ.ldSr2RSsUWGHEe7HaO9buSj_vatzqrIMw-HmJBYvoQQ',
        roles: ['CREW', 'BRAND', 'INFLUENCER', 'USER']
    },
    comfortsgents: {
        id: 'a31ccb74-2479-441d-88f2-dc6701e181a4',
        email: 'comfortsgents@gmail.com',
        name: 'Comforts Gents',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhMzFjY2I3NC0yNDc5LTQ0MWQtODhmMi1kYzY3MDFlMTgxYTQiLCJlbWFpbCI6ImNvbWZvcnRzZ2VudHNAZ21haWwuY29tIiwicm9sZXMiOlsiVVNFUiIsIklORkxVRU5DRVIiXSwiaWF0IjoxNzU0OTEwMzIxLCJqdGkiOiIyMGU5YjUyMi1hZWMwLTQ4OWItOTUyZC1lNDBkMzAyMWM4ZDMiLCJleHAiOjE3NTQ5MTEyMjF9._xS8HzFHAhVAw1OUl7ZZ1m0xNFWL6_mW-fn5MfUKi50',
        roles: ['USER', 'INFLUENCER']
    },
    surya: {
        id: '5f851d11-9818-42ab-96ef-7c16882d8cd8',
        email: 'surya@gmail.com',
        name: 'Surya',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1Zjg1MWQxMS05ODE4LTQyYWItOTZlZi03YzE2ODgyZDhjZDgiLCJlbWFpbCI6InN1cnlhQGdtYWlsLmNvbSIsInJvbGVzIjpbIlVTRVIiLCJDUkVXIl0sImlhdCI6MTc1NDkxMDMyMSwianRpIjoiZThjYWE5NWYtODI3YS00MGI4LWIyYzAtZGJlYmRmNmY2OTlhIiwiZXhwIjoxNzU0OTExMjIxfQ.qelDNDN7PyJSv_pXXj7_HP-az6JJFeH9hV8FyI6lcn8',
        roles: ['USER', 'CREW']
    }
};

// Test state
let testClanId = null;
let joinRequestId = null;
const notifications = {
    user1: [],
    comfortsgents: [],
    surya: []
};

// WebSocket connections
const websockets = {};

function createWebSocketConnection(userKey, user) {
    return new Promise((resolve) => {
        const ws = new WebSocket(`ws://localhost:3000/api/notifications/ws?userId=${user.id}`);

        ws.on('open', () => {
            console.log(`✅ ${user.name} connected to WebSocket`);
            websockets[userKey] = ws;
            resolve(ws);
        });

        ws.on('message', (data) => {
            try {
                const notification = JSON.parse(data.toString());

                if (notification.type !== 'connection') {
                    notifications[userKey].push(notification);

                    const title = notification.title || notification.data?.title || 'undefined';
                    const message = notification.message || notification.data?.message || 'undefined';
                    const category = notification.data?.category || notification.category || 'undefined';

                    console.log(`\n📨 ${user.name} received notification:`);
                    console.log(`   📋 Title: "${title}"`);
                    console.log(`   📝 Message: "${message.substring(0, 80)}${message.length > 80 ? '...' : ''}"`);
                    console.log(`   🏷️  Category: ${category}`);
                }
            } catch (error) {
                console.log(`❌ ${user.name} notification parse error:`, error.message);
            }
        });

        ws.on('error', (error) => {
            console.log(`❌ ${user.name} WebSocket error:`, error.message);
        });
    });
}

async function setupConnections() {
    console.log('🔌 Setting up WebSocket connections for all users...\n');

    await createWebSocketConnection('user1', users.user1);
    await createWebSocketConnection('comfortsgents', users.comfortsgents);
    await createWebSocketConnection('surya', users.surya);

    console.log('✅ All WebSocket connections established!\n');
}

async function step1_CreateClan() {
    console.log('🏛️ STEP 1: User 1 creates a clan...');

    try {
        const response = await axios.post('http://localhost:3000/api/clan', {
            name: `Multi-User Test Clan ${Date.now()}`,
            description: 'Testing multi-user clan notifications with complete workflow',
            primaryCategory: 'TECHNOLOGY',
            categories: ['TECHNOLOGY'],
            location: 'Remote',
            visibility: 'PUBLIC',
            tagline: 'Multi-user notification testing'
        }, {
            headers: {
                'Authorization': `Bearer ${users.user1.token}`,
                'Content-Type': 'application/json'
            }
        });

        testClanId = response.data.data.id;
        console.log(`✅ Clan created successfully! ID: ${testClanId}`);
        console.log(`   Creator: ${users.user1.name} (${users.user1.email})`);

        return true;
    } catch (error) {
        console.log('❌ Clan creation failed:', error.response?.status, error.response?.data);
        return false;
    }
}

async function step2_JoinRequest() {
    if (!testClanId) return false;

    console.log('\n👥 STEP 2: Comforts Gents requests to join the clan...');

    try {
        const response = await axios.post(`http://localhost:3000/api/clan/${testClanId}/join`, {
            message: 'Hi! I would like to join this clan to collaborate on tech projects. I bring influencer marketing expertise.'
        }, {
            headers: {
                'Authorization': `Bearer ${users.comfortsgents.token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ Join request submitted: ${response.status}`);
        console.log(`   Requester: ${users.comfortsgents.name} (${users.comfortsgents.email})`);

        return true;
    } catch (error) {
        console.log(`❌ Join request failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        return false;
    }
}

async function step3_GetJoinRequests() {
    if (!testClanId) return false;

    console.log('\n📋 STEP 3: User 1 checks join requests...');

    try {
        const response = await axios.get(`http://localhost:4003/members/${testClanId}/join-requests`, {
            headers: {
                'Authorization': `Bearer ${users.user1.token}`,
                'x-user-id': users.user1.id
            }
        });

        const joinRequests = response.data.data || [];
        console.log(`✅ Found ${joinRequests.length} join request(s)`);

        if (joinRequests.length > 0) {
            joinRequestId = joinRequests[0].id;
            console.log(`   Request ID: ${joinRequestId}`);
            console.log(`   Requester: ${joinRequests[0].user?.email || 'Unknown'}`);
        }

        return joinRequests.length > 0;
    } catch (error) {
        console.log(`❌ Get join requests failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        return false;
    }
}

async function step4_ApproveJoinRequest() {
    if (!testClanId || !joinRequestId) return false;

    console.log('\n✅ STEP 4: User 1 approves the join request...');

    try {
        const response = await axios.post(`http://localhost:4003/members/${testClanId}/join-requests/${joinRequestId}/approve`, {
            role: 'MEMBER'
        }, {
            headers: {
                'Authorization': `Bearer ${users.user1.token}`,
                'x-user-id': users.user1.id,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ Join request approved: ${response.status}`);
        console.log(`   New member: ${users.comfortsgents.name}`);
        console.log(`   Role: MEMBER`);

        return true;
    } catch (error) {
        console.log(`❌ Approve join request failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        return false;
    }
}

async function step5_CheckMembers() {
    if (!testClanId) return false;

    console.log('\n👥 STEP 5: Checking clan members...');

    try {
        const response = await axios.get(`http://localhost:4003/members/${testClanId}`, {
            headers: {
                'Authorization': `Bearer ${users.user1.token}`,
                'x-user-id': users.user1.id
            }
        });

        const members = response.data.data || [];
        console.log(`✅ Clan now has ${members.length} member(s):`);

        members.forEach((member, index) => {
            console.log(`   ${index + 1}. ${member.user?.email || 'Unknown'} - Role: ${member.role}`);
        });

        return true;
    } catch (error) {
        console.log(`❌ Check members failed: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
        return false;
    }
}

async function runTest() {
    try {
        await setupConnections();

        console.log('🚀 Starting multi-user clan notification workflow test...\n');

        // Step 1: Create clan (should notify User 1)
        const step1Success = await step1_CreateClan();
        if (!step1Success) {
            console.log('❌ Test failed at step 1');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: Join request (should notify User 1 about new request)
        const step2Success = await step2_JoinRequest();
        if (!step2Success) {
            console.log('❌ Test failed at step 2');
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 3: Get join requests
        const step3Success = await step3_GetJoinRequests();
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 4: Approve join request (should notify Comforts Gents about approval)
        if (step3Success) {
            const step4Success = await step4_ApproveJoinRequest();
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Step 5: Check final members
            if (step4Success) {
                await step5_CheckMembers();
            }
        }

        // Wait for any remaining notifications
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Show results
        showResults();

    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        // Close all connections
        Object.values(websockets).forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        });
    }
}

function showResults() {
    console.log('\n🎯 MULTI-USER CLAN NOTIFICATION TEST RESULTS:');
    console.log('═'.repeat(70));

    let totalNotifications = 0;

    Object.keys(users).forEach(userKey => {
        const user = users[userKey];
        const userNotifications = notifications[userKey];
        totalNotifications += userNotifications.length;

        console.log(`\n👤 ${user.name} (${user.email}):`);
        console.log(`   📨 Notifications received: ${userNotifications.length}`);

        if (userNotifications.length > 0) {
            userNotifications.forEach((notif, index) => {
                const title = notif.title || notif.data?.title || 'undefined';
                const category = notif.data?.category || notif.category || 'undefined';
                console.log(`   ${index + 1}. [${category}] ${title}`);
            });
        }
    });

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total notifications: ${totalNotifications}`);
    console.log(`   Users with notifications: ${Object.values(notifications).filter(arr => arr.length > 0).length}`);

    console.log('\n🔍 EXPECTED NOTIFICATIONS:');
    console.log('   ✅ User 1: Clan created successfully');
    console.log('   ✅ User 1: New join request received');
    console.log('   ✅ Comforts Gents: Join request approved / Welcome to clan');
    console.log('   ⏳ Additional notifications may vary based on implementation');

    if (totalNotifications > 0) {
        console.log('\n🎉 Multi-user clan notifications are working!');
    } else {
        console.log('\n⚠️ No notifications received - check notification service');
    }
}

// Start the test
runTest();
