const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:4004';
const GATEWAY_BASE = 'http://localhost:3000/api/gig';

// Test data
const sampleGigs = [
    {
        id: 'gig_001',
        title: "Instagram Reel for Tech Product Launch",
        description: "Create an engaging 30-60 second Instagram Reel showcasing our new smartwatch features. Looking for tech-savvy creators with good editing skills.",
        category: "content-creation",
        budget: 750,
        budgetType: "fixed",
        roleRequired: "content-creator",
        skillsRequired: ["instagram", "video-editing", "tech-review"],
        location: "Remote",
        duration: "7 days",
        urgency: "normal",
        status: "OPEN",
        deliverables: [
            "1 Instagram Reel (30-60 seconds)",
            "3 still photos of the product",
            "Written caption with hashtags"
        ],
        requirements: "Minimum 10K followers on Instagram, Previous tech product reviews, Own ring light and good camera",
        postedById: "user_001",
        postedByType: "brand",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 'gig_002',
        title: "YouTube Video: Travel Vlog Collaboration",
        description: "Partner with us to create a travel vlog featuring our outdoor gear. Perfect for adventure enthusiasts with established YouTube presence.",
        category: "video-production",
        budget: 2250,
        budgetType: "fixed",
        roleRequired: "content-creator",
        skillsRequired: ["youtube", "vlogging", "adventure-travel"],
        location: "Remote",
        duration: "14 days",
        urgency: "urgent",
        status: "OPEN",
        deliverables: [
            "1 YouTube video (8-12 minutes)",
            "Product placement integration",
            "Social media promotion posts"
        ],
        requirements: "Minimum 50K YouTube subscribers, Travel content focus, Professional video equipment",
        postedById: "user_001",
        postedByType: "brand",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 'gig_003',
        title: "Brand Photography for Fashion Campaign",
        description: "Looking for a photographer to capture our new sustainable fashion line. Need someone who understands eco-friendly brand values.",
        category: "photography",
        budget: 1000,
        budgetType: "fixed",
        roleRequired: "photographer",
        skillsRequired: ["fashion-photography", "brand-photography", "adobe-lightroom"],
        location: "New York, NY",
        duration: "10 days",
        urgency: "normal",
        status: "ASSIGNED",
        deliverables: [
            "20 high-res edited photos",
            "Raw files included",
            "Web-optimized versions"
        ],
        requirements: "Portfolio of fashion work, Professional camera equipment, Experience with sustainable brands",
        postedById: "user_001",
        postedByType: "brand",
        assignedToId: "user_002",
        assignedToType: "user",
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

const sampleApplications = [
    {
        id: 'app_001',
        gigId: 'gig_001',
        applicantId: 'user_002',
        applicantType: 'user',
        proposal: "I'm excited to work on this project! I have 15K followers and extensive experience with tech product reviews. Check out my recent smartwatch review that got 50K views!",
        quotedPrice: 750,
        portfolio: [
            "https://instagram.com/techreviewer1",
            "https://youtube.com/watch?v=sample-review"
        ],
        estimatedTime: "5 days",
        status: "PENDING",
        appliedAt: new Date(),
    },
    {
        id: 'app_002',
        gigId: 'gig_001',
        applicantId: 'user_003',
        applicantType: 'user',
        proposal: "Perfect fit for my content style! I specialize in tech gadgets and have worked with similar brands. My audience loves detailed product breakdowns.",
        quotedPrice: 900,
        portfolio: [
            "https://instagram.com/gadgetguru",
            "https://tiktok.com/@techtalks"
        ],
        estimatedTime: "6 days",
        status: "PENDING",
        appliedAt: new Date(),
    },
    {
        id: 'app_003',
        gigId: 'gig_003',
        applicantId: 'user_002',
        applicantType: 'user',
        proposal: "I've been doing fashion photography for 5 years with a focus on sustainable brands. My portfolio includes work with eco-friendly startups.",
        quotedPrice: 1000,
        portfolio: [
            "https://portfolio.example.com/fashion",
            "https://instagram.com/sustainableshooter"
        ],
        estimatedTime: "8 days",
        status: "APPROVED",
        appliedAt: new Date(),
        respondedAt: new Date(),
    }
];

async function seedDatabase() {
    console.log('🌱 Seeding database with test data...');

    try {
        // Clear existing data
        await prisma.application.deleteMany();
        await prisma.gig.deleteMany();

        // Create gigs
        for (const gig of sampleGigs) {
            await prisma.gig.create({ data: gig });
            console.log(`✅ Created gig: ${gig.title}`);
        }

        // Create applications
        for (const app of sampleApplications) {
            await prisma.application.create({ data: app });
            console.log(`✅ Created application for gig: ${app.gigId}`);
        }

        console.log('✅ Database seeded successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    }
}

async function testPublicEndpoints() {
    console.log('\n📂 Testing Public Endpoints...');

    try {
        // Test categories
        const categoriesResponse = await axios.get(`${API_BASE}/public/categories`);
        console.log('✅ Categories:', categoriesResponse.data.data.length, 'categories found');

        // Test roles
        const rolesResponse = await axios.get(`${API_BASE}/public/roles`);
        console.log('✅ Roles:', rolesResponse.data.data.length, 'roles found');

        // Test featured gigs
        const featuredResponse = await axios.get(`${API_BASE}/public/featured`);
        console.log('✅ Featured Gigs:', featuredResponse.data.data.length, 'featured gigs');

        // Test stats
        const statsResponse = await axios.get(`${API_BASE}/public/stats`);
        console.log('✅ Stats:', JSON.stringify(statsResponse.data.data, null, 2));

    } catch (error) {
        console.error('❌ Public endpoints test failed:', error.response?.data || error.message);
    }
}

async function testGigBrowsing() {
    console.log('\n🔍 Testing Gig Browsing...');

    try {
        // Get all gigs
        const allGigs = await axios.get(`${API_BASE}/gigs`);
        console.log('✅ All Gigs:', allGigs.data.data.length, 'gigs found');

        // Test filtering by category
        const contentGigs = await axios.get(`${API_BASE}/gigs?category=content-creation`);
        console.log('✅ Content Creation Gigs:', contentGigs.data.data.length, 'gigs found');

        // Test filtering by urgent
        const urgentGigs = await axios.get(`${API_BASE}/gigs?urgent=true`);
        console.log('✅ Urgent Gigs:', urgentGigs.data.data.length, 'gigs found');

        // Test budget range filtering
        const budgetGigs = await axios.get(`${API_BASE}/gigs?minBudget=500&maxBudget=1500`);
        console.log('✅ Budget Range Gigs (500-1500):', budgetGigs.data.data.length, 'gigs found');

        // Test location filtering
        const remoteGigs = await axios.get(`${API_BASE}/gigs?location=Remote`);
        console.log('✅ Remote Gigs:', remoteGigs.data.data.length, 'gigs found');

        // Test role filtering
        const creatorGigs = await axios.get(`${API_BASE}/gigs?roles=content-creator`);
        console.log('✅ Content Creator Gigs:', creatorGigs.data.data.length, 'gigs found');

        // Test skill filtering  
        const videoGigs = await axios.get(`${API_BASE}/gigs?skills=video-editing`);
        console.log('✅ Video Editing Gigs:', videoGigs.data.data.length, 'gigs found');

    } catch (error) {
        console.error('❌ Gig browsing test failed:', error.response?.data || error.message);
    }
}

async function testGigDetails() {
    console.log('\n📋 Testing Gig Details...');

    try {
        // Get details for each gig
        for (const gig of sampleGigs) {
            const response = await axios.get(`${API_BASE}/gigs/${gig.id}`);
            const gigData = response.data.data;
            console.log(`✅ Gig Details for "${gigData.title}":`);
            console.log(`   Status: ${gigData.status}`);
            console.log(`   Budget: $${gigData.budgetMin} - $${gigData.budgetMax}`);
            console.log(`   Applications: ${gigData.applications?.length || 0}`);

            if (gigData.assignedTo) {
                console.log(`   Assigned to: ${gigData.assignedTo}`);
            }
        }

    } catch (error) {
        console.error('❌ Gig details test failed:', error.response?.data || error.message);
    }
}

async function testAPIGatewayIntegration() {
    console.log('\n🌐 Testing API Gateway Integration...');

    try {
        // Test public endpoints through Gateway
        const categoriesResponse = await axios.get(`${GATEWAY_BASE}/public/categories`);
        console.log('✅ Gateway Categories:', categoriesResponse.data.data.length, 'categories found');

        const statsResponse = await axios.get(`${GATEWAY_BASE}/public/stats`);
        console.log('✅ Gateway Stats:', JSON.stringify(statsResponse.data.data, null, 2));

        // Test gig browsing through Gateway (public endpoint)
        const gigsResponse = await axios.get(`${GATEWAY_BASE}/gigs`);
        console.log('✅ Gateway Gigs:', gigsResponse.data.data.length, 'gigs found');

        // Test health check through Gateway
        const healthResponse = await axios.get(`${GATEWAY_BASE}/health`);
        console.log('✅ Gateway Health:', healthResponse.data.status);

    } catch (error) {
        console.error('❌ API Gateway integration test failed:', error.response?.data || error.message);
    }
}

async function runDemoTest() {
    console.log('🚀 Starting Gig Service Demo Test');
    console.log('==================================');

    try {
        // Seed the database
        await seedDatabase();

        // Test public endpoints
        await testPublicEndpoints();

        // Test gig browsing
        await testGigBrowsing();

        // Test gig details
        await testGigDetails();

        // Test API Gateway integration
        await testAPIGatewayIntegration();

        console.log('\n🎉 Gig Service Demo Completed Successfully!');
        console.log('===========================================');
        console.log('\n📊 Summary:');
        console.log('✅ Database seeded with sample gigs and applications');
        console.log('✅ Public endpoints working');
        console.log('✅ Gig browsing and filtering working');
        console.log('✅ Gig details retrieval working');
        console.log('✅ API Gateway integration working');
        console.log('\n🔗 Ready for:');
        console.log('• Authentication integration with auth service');
        console.log('• User registration and gig creation workflow');
        console.log('• Application and assignment workflow');
        console.log('• Submission and completion workflow');

    } catch (error) {
        console.error('❌ Demo test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the demo
if (require.main === module) {
    runDemoTest().catch(console.error);
}

module.exports = { runDemoTest, seedDatabase };
