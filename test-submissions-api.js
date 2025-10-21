const axios = require('axios');

async function testGetGigSubmissions() {
    console.log('🧪 Testing GET /gigs/:id/submissions endpoint...\n');

    const baseURL = 'http://localhost:4004';
    const gigId = 'cmgpf881f0000dm67ke6739nu'; // "Vlog shoot" gig with 2 submissions
    const ownerId = '4cb9a796-0cdc-49c4-b783-c9398ec0a9a7';

    try {
        console.log(`📊 Testing gig: ${gigId} (should have 2 submissions)`);

        const response = await axios.get(`${baseURL}/gigs/${gigId}/submissions`, {
            headers: {
                'x-user-id': ownerId,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Response received');
        console.log('📊 Status:', response.status);
        console.log('📊 Number of submissions returned:', response.data.data?.length || 0);

        if (response.data.data && response.data.data.length > 0) {
            console.log('\n📋 Submissions returned by API:');
            response.data.data.forEach((submission, index) => {
                console.log(`   ${index + 1}. ID: ${submission.id}`);
                console.log(`      Title: "${submission.title}"`);
                console.log(`      Status: ${submission.status}`);
                console.log(`      Submitted: ${submission.submittedAt}`);
                console.log(`      By: ${submission.submittedById} (${submission.submittedByType})`);
                if (submission.application) {
                    console.log(`      Application: ${submission.application.id} (${submission.application.status})`);
                }
                console.log('');
            });

            if (response.data.data.length === 2) {
                console.log('✅ API is correctly returning all 2 submissions!');
            } else if (response.data.data.length === 1) {
                console.log('❌ API is only returning 1 submission instead of 2');
                console.log('   This confirms the issue you reported.');
            }
        } else {
            console.log('❌ No submissions returned by API (but database has 2)');
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status);
            console.error('   Message:', error.response.data);

            if (error.response.status === 403) {
                console.log('\n💡 Authentication issue - make sure the x-user-id matches the gig owner');
            }
        } else {
            console.error('❌ Request failed:', error.message);
        }
    }
}

testGetGigSubmissions();