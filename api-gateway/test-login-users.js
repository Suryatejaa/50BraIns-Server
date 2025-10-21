const axios = require('axios');

console.log('🔐 Testing login for multiple users...\n');

const users = [
    {
        email: "user1@gmail.com",
        password: "Surya@123",
        name: "User 1"
    },
    {
        email: "comfortsgents@gmail.com",
        password: "Surya@123",
        name: "Comforts Gents"
    },
    {
        email: "surya@gmail.com",
        password: "Surya@123!",
        name: "Surya"
    }
];

async function testLogin(user, index) {
    console.log(`${index + 1}️⃣ Testing login for ${user.name} (${user.email})...`);

    try {
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            email: user.email,
            password: user.password
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`   ✅ Login successful! Status: ${response.status}`);

        if (response.data) {
            const data = response.data;
            const token = data.token || data.accessToken || data.data?.token || data.data?.accessToken;
            const userId = data.userId || data.user?.id || data.data?.userId || data.data?.user?.id;
            const roles = data.roles || data.user?.roles || data.data?.roles || data.data?.user?.roles;

            console.log(`   🔑 Token: ${token ? token.substring(0, 50) + '...' : 'Not found'}`);
            console.log(`   👤 User ID: ${userId || 'Not found'}`);
            console.log(`   🏷️  Roles: ${Array.isArray(roles) ? roles.join(', ') : roles || 'Not found'}`);

            // Save full details for easy copying
            console.log(`\n   📋 Full details for ${user.name}:`);
            console.log(`   const ${user.name.toLowerCase().replace(/\s+/g, '')}Token = '${token}';`);
            console.log(`   const ${user.name.toLowerCase().replace(/\s+/g, '')}UserId = '${userId}';`);
            console.log(`   const ${user.name.toLowerCase().replace(/\s+/g, '')}Roles = ${JSON.stringify(roles)};`);
        }

        return {
            success: true,
            email: user.email,
            name: user.name,
            token: response.data?.token || response.data?.accessToken || response.data?.data?.token,
            userId: response.data?.userId || response.data?.user?.id || response.data?.data?.userId,
            roles: response.data?.roles || response.data?.user?.roles || response.data?.data?.roles,
            data: response.data
        };

    } catch (error) {
        console.log(`   ❌ Login failed: ${error.response?.status} - ${error.response?.statusText}`);

        if (error.response?.data) {
            console.log(`   🔍 Error details:`, error.response.data);
        }

        return {
            success: false,
            email: user.email,
            name: user.name,
            error: error.response?.data || error.message
        };
    }
}

async function main() {
    const results = [];

    console.log('🚀 Starting login tests for all users...\n');

    for (let i = 0; i < users.length; i++) {
        const result = await testLogin(users[i], i);
        results.push(result);
        console.log(''); // Add spacing between tests
    }

    console.log('🎯 LOGIN TEST SUMMARY:');
    console.log('═'.repeat(60));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful logins: ${successful.length}/${results.length}`);
    console.log(`❌ Failed logins: ${failed.length}/${results.length}\n`);

    if (successful.length > 0) {
        console.log('✅ SUCCESSFUL LOGINS:');
        successful.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.name} (${result.email})`);
            console.log(`      User ID: ${result.userId}`);
            console.log(`      Token: ${result.token ? result.token.substring(0, 30) + '...' : 'Not found'}`);
        });
        console.log('');
    }

    if (failed.length > 0) {
        console.log('❌ FAILED LOGINS:');
        failed.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.name} (${result.email})`);
            console.log(`      Error: ${JSON.stringify(result.error)}`);
        });
        console.log('');
    }

    if (successful.length >= 2) {
        console.log('💡 MULTI-USER CLAN TESTING:');
        console.log('   Now you can test clan workflows with multiple users!');
        console.log('   • User 1 can create a clan');
        console.log('   • User 2 can request to join');
        console.log('   • User 1 can approve/reject the request');
        console.log('   • Test notifications for both users');

        console.log('\n🔧 NEXT STEPS:');
        console.log('   1. Copy the tokens from successful logins above');
        console.log('   2. Update test scripts with multiple user credentials');
        console.log('   3. Test complete clan workflows with notifications');
    }
}

main().catch(error => {
    console.error('❌ Test script error:', error);
});
