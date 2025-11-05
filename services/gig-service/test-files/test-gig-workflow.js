const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:4004'; // Test directly with gig service
const GATEWAY_BASE = 'http://localhost:3000/api/gig'; // For later Gateway testing

// Test user data (simulating different users)
const testUsers = {
    brandOwner: {
        id: 'user_001',
        email: 'brand@example.com',
        role: 'brand',
        headers: {
            'x-user-id': 'user_001',
            'x-user-email': 'brand@example.com',
            'x-user-role': 'brand'
        }
    },
    influencer1: {
        id: 'user_002',
        email: 'influencer1@example.com',
        role: 'influencer',
        headers: {
            'x-user-id': 'user_002',
            'x-user-email': 'influencer1@example.com',
            'x-user-role': 'influencer'
        }
    },
    influencer2: {
        id: 'user_003',
        email: 'influencer2@example.com',
        role: 'influencer',
        headers: {
            'x-user-id': 'user_003',
            'x-user-email': 'influencer2@example.com',
            'x-user-role': 'influencer'
        }
    }
};

// Sample gig data
const sampleGigs = [
    {
        title: "Instagram Reel for Tech Product Launch",
        description: "Create an engaging 30-60 second Instagram Reel showcasing our new smartwatch features. Looking for tech-savvy creators with good editing skills.",
        category: "content-creation",
        budget: {
            min: 500,
            max: 1000
        },
        skills: ["instagram", "video-editing", "tech-review"],
        roles: ["content-creator"],
        deliverables: [
            "1 Instagram Reel (30-60 seconds)",
            "3 still photos of the product",
            "Written caption with hashtags"
        ],
        requirements: [
            "Minimum 10K followers on Instagram",
            "Previous tech product reviews",
            "Own ring light and good camera"
        ],
        timeline: "7 days",
        location: "Remote",
        urgent: false
    },
    {
        title: "YouTube Video: Travel Vlog Collaboration",
        description: "Partner with us to create a travel vlog featuring our outdoor gear. Perfect for adventure enthusiasts with established YouTube presence.",
        category: "video-production",
        budget: {
            min: 1500,
            max: 3000
        },
        skills: ["youtube", "vlogging", "adventure-travel"],
        roles: ["travel-blogger", "content-creator"],
        deliverables: [
            "1 YouTube video (8-12 minutes)",
            "Product placement integration",
            "Social media promotion posts"
        ],
        requirements: [
            "Minimum 50K YouTube subscribers",
            "Travel content focus",
            "Professional video equipment"
        ],
        timeline: "14 days",
        location: "Remote",
        urgent: true
    },
    {
        title: "Brand Photography for Fashion Campaign",
        description: "Looking for a photographer to capture our new sustainable fashion line. Need someone who understands eco-friendly brand values.",
        category: "photography",
        budget: {
            min: 800,
            max: 1200
        },
        skills: ["fashion-photography", "brand-photography", "adobe-lightroom"],
        roles: ["photographer"],
        deliverables: [
            "20 high-res edited photos",
            "Raw files included",
            "Web-optimized versions"
        ],
        requirements: [
            "Portfolio of fashion work",
            "Professional camera equipment",
            "Experience with sustainable brands"
        ],
        timeline: "10 days",
        location: "New York, NY",
        urgent: false
    }
];

// Test functions
async function testGigWorkflow() {
    console.log('🚀 Starting Gig Service Workflow Test');
    console.log('=====================================');

    try {
        // Test 1: Public endpoints (no auth)
        console.log('\n📂 Testing Public Endpoints...');

        const categoriesResponse = await axios.get(`${API_BASE}/public/categories`);
        console.log('✅ Categories:', categoriesResponse.data.data.length, 'categories found');

        const rolesResponse = await axios.get(`${API_BASE}/public/roles`);
        console.log('✅ Roles:', rolesResponse.data.data.length, 'roles found');

        const statsResponse = await axios.get(`${API_BASE}/public/stats`);
        console.log('✅ Stats:', JSON.stringify(statsResponse.data.data, null, 2));

        // Test 2: Create gigs (as brand owner)
        console.log('\n📝 Creating Sample Gigs...');
        const createdGigs = [];

        for (let i = 0; i < sampleGigs.length; i++) {
            const gigData = sampleGigs[i];
            try {
                const response = await axios.post(`${API_BASE}/gigs`, gigData, {
                    headers: testUsers.brandOwner.headers
                });
                createdGigs.push(response.data.data);
                console.log(`✅ Created Gig ${i + 1}: "${gigData.title}" (ID: ${response.data.data.id})`);
            } catch (error) {
                console.error(`❌ Failed to create gig ${i + 1}:`, error.response?.data?.error || error.message);
            }
        }

        if (createdGigs.length === 0) {
            console.error('❌ No gigs created, stopping test');
            return;
        }

        // Test 3: Browse gigs (public feed)
        console.log('\n🔍 Testing Gig Browsing...');

        const browseResponse = await axios.get(`${API_BASE}/gigs`);
        console.log('✅ Public Feed:', browseResponse.data.data.length, 'gigs available');

        // Test filtering
        const urgentGigs = await axios.get(`${API_BASE}/gigs?urgent=true`);
        console.log('✅ Urgent Gigs:', urgentGigs.data.data.length, 'urgent gigs found');

        const techGigs = await axios.get(`${API_BASE}/gigs?category=content-creation`);
        console.log('✅ Content Creation Gigs:', techGigs.data.data.length, 'gigs found');

        // Test 4: Apply to gigs (as influencers)
        console.log('\n📮 Testing Gig Applications...');
        const gigToApplyTo = createdGigs[0]; // Apply to first gig

        // Influencer 1 applies
        try {
            const application1 = {
                proposal: "I'm excited to work on this project! I have 15K followers and extensive experience with tech product reviews. Check out my recent smartwatch review that got 50K views!",
                quotedPrice: 750,
                portfolioLinks: [
                    "https://instagram.com/techreviewer1",
                    "https://youtube.com/watch?v=sample-review"
                ],
                estimatedDelivery: "5 days"
            };

            const app1Response = await axios.post(`${API_BASE}/gigs/${gigToApplyTo.id}/apply`, application1, {
                headers: testUsers.influencer1.headers
            });
            console.log('✅ Influencer 1 applied successfully');
        } catch (error) {
            console.error('❌ Influencer 1 application failed:', error.response?.data?.error || error.message);
        }

        // Influencer 2 applies
        try {
            const application2 = {
                proposal: "Perfect fit for my content style! I specialize in tech gadgets and have worked with similar brands. My audience loves detailed product breakdowns.",
                quotedPrice: 900,
                portfolioLinks: [
                    "https://instagram.com/gadgetguru",
                    "https://tiktok.com/@techtalks"
                ],
                estimatedDelivery: "6 days"
            };

            const app2Response = await axios.post(`${API_BASE}/gigs/${gigToApplyTo.id}/apply`, application2, {
                headers: testUsers.influencer2.headers
            });
            console.log('✅ Influencer 2 applied successfully');
        } catch (error) {
            console.error('❌ Influencer 2 application failed:', error.response?.data?.error || error.message);
        }

        // Test duplicate application prevention
        try {
            const duplicateApp = {
                proposal: "Trying to apply again",
                quotedPrice: 600,
                portfolioLinks: ["https://example.com"],
                estimatedDelivery: "7 days"
            };

            await axios.post(`${API_BASE}/gigs/${gigToApplyTo.id}/apply`, duplicateApp, {
                headers: testUsers.influencer1.headers
            });
            console.log('❌ Duplicate application should have been prevented!');
        } catch (error) {
            if (error.response?.status === 400 && error.response.data.error.includes('already applied')) {
                console.log('✅ Duplicate application correctly prevented');
            } else {
                console.error('❌ Unexpected error:', error.response?.data?.error || error.message);
            }
        }

        // Test 5: View user's activities
        console.log('\n👤 Testing User Activity Views...');

        // Brand owner views their posted gigs
        try {
            const postedGigs = await axios.get(`${API_BASE}/my/posted`, {
                headers: testUsers.brandOwner.headers
            });
            console.log('✅ Brand Owner Posted Gigs:', postedGigs.data.data.length, 'gigs posted');
        } catch (error) {
            console.error('❌ Failed to get posted gigs:', error.response?.data?.error || error.message);
        }

        // Influencer 1 views their applications
        try {
            const applications = await axios.get(`${API_BASE}/my/applications`, {
                headers: testUsers.influencer1.headers
            });
            console.log('✅ Influencer 1 Applications:', applications.data.data.length, 'applications submitted');
        } catch (error) {
            console.error('❌ Failed to get applications:', error.response?.data?.error || error.message);
        }

        // Test 6: Assign gig (as brand owner)
        console.log('\n🎯 Testing Gig Assignment...');

        // First, get applications for the gig
        try {
            const gigDetails = await axios.get(`${API_BASE}/gigs/${gigToApplyTo.id}`, {
                headers: testUsers.brandOwner.headers
            });

            const applications = gigDetails.data.data.applications;
            if (applications && applications.length > 0) {
                const selectedApplication = applications[0]; // Select first application

                const assignResponse = await axios.patch(`${API_BASE}/gigs/${gigToApplyTo.id}/assign`, {
                    applicationId: selectedApplication.id
                }, {
                    headers: testUsers.brandOwner.headers
                });

                console.log('✅ Gig assigned successfully to:', selectedApplication.userId);
                console.log('   Selected application ID:', selectedApplication.id);
            } else {
                console.log('⚠️ No applications found for assignment test');
            }
        } catch (error) {
            console.error('❌ Gig assignment failed:', error.response?.data?.error || error.message);
        }

        // Test 7: Final stats check
        console.log('\n📊 Final Statistics...');
        const finalStats = await axios.get(`${API_BASE}/public/stats`);
        console.log('✅ Final Stats:', JSON.stringify(finalStats.data.data, null, 2));

        console.log('\n🎉 Gig Service Workflow Test Completed!');
        console.log('=====================================');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
if (require.main === module) {
    testGigWorkflow().catch(console.error);
}

module.exports = { testGigWorkflow, sampleGigs, testUsers };
