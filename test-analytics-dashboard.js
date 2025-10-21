async function testAnalyticsDashboard() {
    try {
        console.log('🧪 Testing Analytics Dashboard for test@example.com user...');

        const testUserId = '76d5fb63-2e64-4b84-b20c-529b783910b3';
        const analyticsUrl = `http://localhost:3000/api/analytics/user/${testUserId}/insights`;

        console.log(`📊 Requesting: ${analyticsUrl}`);

        const response = await fetch(analyticsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        console.log('✅ Analytics Dashboard Response:');
        console.log(JSON.stringify(data, null, 2));

        // Check for expected fields
        if (data.profileViews !== undefined && data.searchAppearances !== undefined) {
            console.log('✅ Dashboard shows proper analytics data');
            console.log(`📈 Profile Views: ${data.profileViews}`);
            console.log(`🔍 Search Appearances: ${data.searchAppearances}`);
            console.log(`⭐ Popularity Score: ${data.popularityScore}`);
            console.log(`💬 Engagement Score: ${data.engagementScore}`);
        } else {
            console.log('❌ Missing expected analytics fields');
        }

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Analytics service not running on port 3003');
            console.log('💡 Please start the analytics service first');
        } else if (error.response) {
            console.log(`❌ Analytics API Error: ${error.response.status}`);
            console.log('Response:', error.response.data);
        } else {
            console.log('❌ Network Error:', error.message);
        }
    }
}

testAnalyticsDashboard();
