const axios = require('axios');

async function findValidUserId() {
    try {
        console.log('🔍 Finding existing user ID for equipment testing...\n');

        // Try to get users from the user service
        // We'll use the search or admin routes to find users
        console.log('📝 Attempting to find users in the system...');

        // First, let's check if we can access any user endpoint that might give us user info
        const headers = {
            'Content-Type': 'application/json',
            'x-user-id': 'admin-user' // Try with an admin context
        };

        try {
            // Try the admin users endpoint
            const response = await axios.get('http://localhost:4002/admin/users', { headers });
            console.log('✅ Found users via admin endpoint');

            if (response.data.success && response.data.data && response.data.data.users && response.data.data.users.length > 0) {
                const firstUser = response.data.data.users[0];
                console.log(`📝 Using existing user ID: ${firstUser.id}`);
                console.log(`   User email: ${firstUser.email}`);
                console.log(`   User roles: ${firstUser.roles?.join(', ') || 'N/A'}`);
                return firstUser.id;
            }
        } catch (error) {
            console.log('❌ Admin endpoint not accessible');
        }

        // Try search endpoint
        try {
            const searchResponse = await axios.get('http://localhost:4002/search/users?q=&limit=1', { headers });
            console.log('✅ Found users via search endpoint');

            if (searchResponse.data.success && searchResponse.data.data && searchResponse.data.data.length > 0) {
                const firstUser = searchResponse.data.data[0];
                console.log(`📝 Using existing user ID: ${firstUser.id}`);
                return firstUser.id;
            }
        } catch (error) {
            console.log('❌ Search endpoint not accessible');
        }

        console.log('⚠️  No existing users found. Equipment tests will need user creation first.');
        return null;

    } catch (error) {
        console.error('❌ Error finding user ID:', error.message);
        return null;
    }
}

// If we find a user, test equipment creation with that user
async function testWithValidUser() {
    const userId = await findValidUserId();

    if (!userId) {
        console.log('\n💡 To test equipment management, you need:');
        console.log('   1. Create a user via auth-service first');
        console.log('   2. Use that user ID in equipment tests');
        console.log('   3. Or modify the test to create a test user');
        return;
    }

    console.log(`\n🧪 Testing equipment creation with user: ${userId}`);

    const headers = {
        'Content-Type': 'application/json',
        'x-user-id': userId
    };

    const sampleEquipment = {
        name: 'Test Camera',
        category: 'Cameras',
        brand: 'Canon',
        model: 'Test Model',
        condition: 'GOOD',
        isAvailable: true,
        isIncludedInBids: true
    };

    try {
        const response = await axios.post('http://localhost:4002/equipment', sampleEquipment, { headers });
        console.log('✅ Equipment creation successful!');
        console.log(`   Equipment ID: ${response.data.data.id}`);

        // Test the sync by getting the user's equipmentOwned field
        console.log('\n📝 Testing equipmentOwned synchronization...');
        // This would require a user profile endpoint that shows equipmentOwned

    } catch (error) {
        console.log('❌ Equipment creation failed:', error.response?.data?.error || error.message);
    }
}

testWithValidUser();
