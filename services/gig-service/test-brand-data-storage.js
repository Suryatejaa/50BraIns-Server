// Test script to verify brand data is stored in gig table
const fetch = require('node-fetch');

async function testGigCreationWithBrandData() {
    try {
        console.log('🧪 Testing gig creation with brand data storage...');

        // Create a test gig
        const gigData = {
            title: "Test Brand Data Storage",
            description: "Testing if brand data is stored correctly in gig table",
            category: "testing",
            roleRequired: "developer",
            gigType: "REMOTE",
            budgetMin: 100,
            budgetMax: 500,
            urgency: "normal"
        };

        const createResponse = await fetch('http://localhost:4004/gig/gigs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': '4cb9a796-0cdc-49c4-b783-c9398ec0a9a7' // Test user ID
            },
            body: JSON.stringify(gigData)
        });

        if (!createResponse.ok) {
            const error = await createResponse.text();
            console.error('❌ Failed to create gig:', error);
            return;
        }

        const createResult = await createResponse.json();
        console.log('✅ Gig created successfully:', createResult.data.id);

        // Check if brand data is stored
        if (createResult.data.brandName) {
            console.log('✅ Brand data stored successfully:');
            console.log('   - Brand Name:', createResult.data.brandName);
            console.log('   - Brand Username:', createResult.data.brandUsername);
            console.log('   - Brand Verified:', createResult.data.brandVerified);
        } else {
            console.log('⚠️ Brand data not found in response');
        }

        // Test fetching the gig to see if brand data is returned
        console.log('\n🔍 Testing gig retrieval...');

        const fetchResponse = await fetch(`http://localhost:4004/gig/gigs/${createResult.data.id}`);

        if (!fetchResponse.ok) {
            console.error('❌ Failed to fetch gig');
            return;
        }

        const fetchResult = await fetchResponse.json();

        if (fetchResult.data.brand && fetchResult.data.brand.name) {
            console.log('✅ Brand data retrieved successfully from stored data:');
            console.log('   - Brand ID:', fetchResult.data.brand.id);
            console.log('   - Brand Name:', fetchResult.data.brand.name);
            console.log('   - Brand Username:', fetchResult.data.brand.username);
            console.log('   - Brand Verified:', fetchResult.data.brand.verified);
            console.log('   - No API calls needed! 🚀');
        } else {
            console.log('❌ Brand data not found in fetch response');
        }

        // Test listing gigs to see if brand data is included
        console.log('\n📋 Testing gig listing...');

        const listResponse = await fetch('http://localhost:4004/gig/gigs?limit=1');

        if (!listResponse.ok) {
            console.error('❌ Failed to list gigs');
            return;
        }

        const listResult = await listResponse.json();

        if (listResult.data.gigs.length > 0 && listResult.data.gigs[0].brand) {
            console.log('✅ Brand data included in gig listing:');
            console.log('   - Brand Name:', listResult.data.gigs[0].brand.name);
            console.log('   - No API calls needed for listing! 🚀');
        } else {
            console.log('❌ Brand data not found in listing response');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testGigCreationWithBrandData();