const amqp = require('amqplib');

class ReputationIntegrationTest {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.testUserId = 'test-user-' + Date.now();
        this.testGigId = 'test-gig-' + Date.now();
        this.testApplicationId = 'test-app-' + Date.now();
        this.testSubmissionId = 'test-sub-' + Date.now();
        this.receivedEvents = [];
    }

    async connect() {
        try {
            console.log('🔌 Connecting to RabbitMQ...');
            // Use the same RabbitMQ URL as the services
            const rabbitmqUrl = process.env.RABBITMQ_URL ||
                'amqps://mahifqgz:UTImWgOvCaa-95mb9DZL4X83mydMV9qt@armadillo.rmq.cloudamqp.com/mahifqgz';

            this.connection = await amqp.connect(rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            // Declare exchanges
            await this.channel.assertExchange('gig_events', 'topic', { durable: true });
            await this.channel.assertExchange('reputation_events', 'topic', { durable: true });

            console.log('✅ Connected to RabbitMQ');
        } catch (error) {
            console.error('❌ Failed to connect to RabbitMQ:', error);
            throw error;
        }
    }

    async setupEventListener() {
        // Create temporary queue to monitor events
        const testQueue = await this.channel.assertQueue('', { exclusive: true });

        // Bind to all gig events and reputation events
        const routingKeys = [
            'gig.application.created',
            'gig.application.accepted',
            'gig.application.rejected',
            'gig.work.submitted',
            'gig.submission.reviewed',
            'gig.completed',
            'gig.rated',
            'boost.received',
            'user.verified'
        ];

        for (const key of routingKeys) {
            if (key.startsWith('gig.')) {
                await this.channel.bindQueue(testQueue.queue, 'gig_events', key);
            } else {
                await this.channel.bindQueue(testQueue.queue, 'reputation_events', key);
            }
        }

        // Listen for events
        await this.channel.consume(testQueue.queue, (msg) => {
            if (msg) {
                const routingKey = msg.fields.routingKey;
                const eventData = JSON.parse(msg.content.toString());
                this.receivedEvents.push({ routingKey, eventData, timestamp: new Date() });
                this.channel.ack(msg);
            }
        });

        console.log('🎧 Event listener setup complete');
    }

    async publishEvent(exchange, routingKey, eventData) {
        const message = Buffer.from(JSON.stringify(eventData));
        await this.channel.publish(exchange, routingKey, message, { persistent: true });
        console.log(`📤 Published: ${exchange}.${routingKey}`);
    }

    async testComprehensiveWorkflow() {
        console.log('\n🧪 Testing Comprehensive Gig Workflow Integration...\n');

        const gigData = {
            title: 'Test Logo Design',
            description: 'Create a modern logo for startup',
            category: 'DESIGN',
            skills: ['logo-design', 'illustrator', 'branding'],
            budgetRange: '500-1000',
            budgetMax: 1000
        };

        // Step 1: User applies to gig
        console.log('� Step 1: Publishing gig application event...');
        await this.publishEvent('gig_events', 'gig.application.created', {
            applicationId: this.testApplicationId,
            gigId: this.testGigId,
            applicantId: this.testUserId,
            applicantType: 'INDIVIDUAL',
            quotedPrice: 750,
            estimatedTime: 5,
            proposal: 'I can create a professional logo with modern design',
            createdAt: new Date(),
            gigData
        });

        await this.delay(1000);

        // Step 2: Application gets accepted
        console.log('✅ Step 2: Publishing application acceptance...');
        await this.publishEvent('gig_events', 'gig.application.accepted', {
            applicationId: this.testApplicationId,
            gigId: this.testGigId,
            applicantId: this.testUserId,
            clientId: 'client-123',
            acceptedAt: new Date(),
            quotedPrice: 750,
            gigData
        });

        await this.delay(1000);

        // Step 3: User submits work
        console.log('📤 Step 3: Publishing work submission...');
        await this.publishEvent('gig_events', 'gig.work.submitted', {
            submissionId: this.testSubmissionId,
            gigId: this.testGigId,
            applicantId: this.testUserId,
            submissionTitle: 'Final Logo Design',
            submissionDescription: 'Modern logo with 3 variations',
            submittedFiles: [
                { name: 'logo-primary.ai', type: 'application/illustrator' },
                { name: 'logo-variations.png', type: 'image/png' }
            ],
            submittedAt: new Date(),
            gigData
        });

        await this.delay(1000);

        // Step 4: Submission gets reviewed and approved
        console.log('👍 Step 4: Publishing submission approval...');
        await this.publishEvent('gig_events', 'gig.submission.reviewed', {
            submissionId: this.testSubmissionId,
            gigId: this.testGigId,
            applicantId: this.testUserId,
            clientId: 'client-123',
            reviewStatus: 'approved',
            feedback: 'Excellent work! Logo exceeds expectations.',
            rating: 5,
            reviewedAt: new Date(),
            gigCompleted: true,
            gigData
        });

        await this.delay(1000);

        // Step 5: Gig completion (triggered by approval)
        console.log('🎯 Step 5: Publishing gig completion...');
        await this.publishEvent('gig_events', 'gig.completed', {
            gigId: this.testGigId,
            creatorId: this.testUserId,
            clientId: 'client-123',
            submissionId: this.testSubmissionId,
            rating: 5,
            feedback: 'Excellent work! Logo exceeds expectations.',
            completedAt: new Date(),
            onTimeDelivery: true,
            withinBudget: true,
            actualBudget: 750,
            deliveryTime: 4, // days
            gigData
        });

        await this.delay(1000);

        // Step 6: Additional rating event
        console.log('⭐ Step 6: Publishing rating event...');
        await this.publishEvent('gig_events', 'gig.rated', {
            gigId: this.testGigId,
            ratedUserId: this.testUserId,
            rating: 5,
            feedback: 'Professional, timely, and creative work!',
            ratedAt: new Date()
        });

        console.log('\n✅ Comprehensive workflow test completed!');
    }

    async testReputationEvents() {
        console.log('\n🧪 Testing Direct Reputation Events...\n');

        // Test boost events
        console.log('💝 Publishing boost received event...');
        await this.publishEvent('reputation_events', 'boost.received', {
            toUserId: this.testUserId,
            fromUserId: 'booster-123',
            amount: 10,
            message: 'Great work on the logo!',
            receivedAt: new Date()
        });

        await this.delay(1000);

        // Test verification event
        console.log('✅ Publishing user verification event...');
        await this.publishEvent('reputation_events', 'user.verified', {
            userId: this.testUserId,
            verificationType: 'IDENTITY',
            verifiedAt: new Date(),
            verifierType: 'MANUAL'
        });

        console.log('\n✅ Reputation events test completed!');
    }

    async testNegativeScenario() {
        console.log('\n🧪 Testing Negative Scenario (Application Rejection)...\n');

        const rejectTestUserId = 'reject-user-' + Date.now();
        const rejectGigId = 'reject-gig-' + Date.now();
        const rejectAppId = 'reject-app-' + Date.now();

        // Application created
        console.log('📝 Publishing application...');
        await this.publishEvent('gig_events', 'gig.application.created', {
            applicationId: rejectAppId,
            gigId: rejectGigId,
            applicantId: rejectTestUserId,
            applicantType: 'INDIVIDUAL',
            quotedPrice: 500,
            estimatedTime: 3,
            createdAt: new Date(),
            gigData: {
                title: 'Simple Website',
                category: 'WEB_DEVELOPMENT',
                skills: ['html', 'css']
            }
        });

        await this.delay(1000);

        // Application rejected
        console.log('❌ Publishing application rejection...');
        await this.publishEvent('gig_events', 'gig.application.rejected', {
            applicationId: rejectAppId,
            gigId: rejectGigId,
            applicantId: rejectTestUserId,
            clientId: 'client-456',
            rejectedAt: new Date(),
            reason: 'Portfolio does not match requirements',
            gigData: {
                title: 'Simple Website',
                category: 'WEB_DEVELOPMENT'
            }
        });

        console.log(`📊 Reject Test User ID: ${rejectTestUserId}`);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async checkReputationService() {
        try {
            console.log('🔍 Checking if reputation service is running...');

            // Try to connect to reputation service database
            const { PrismaClient } = require('./services/reputation-service/prisma/generated/reputation-client');
            const prisma = new PrismaClient();

            await prisma.$connect();
            console.log('✅ Reputation service database connection successful');

            // Check if reputation tables exist
            const reputationCount = await prisma.reputationScore.count();
            console.log(`📊 Reputation records in database: ${reputationCount}`);

            await prisma.$disconnect();

        } catch (error) {
            console.log('❌ Reputation service database check failed:', error.message);
            console.log('💡 Make sure reputation service is set up and running');
        }
    }

    async disconnect() {
        if (this.connection) {
            await this.connection.close();
            console.log('🔌 Disconnected from RabbitMQ');
        }
    }

    printEventSummary() {
        console.log('\n📋 Event Processing Summary:');
        console.log('='.repeat(50));

        if (this.receivedEvents.length === 0) {
            console.log('❌ No events were captured during the test');
            return;
        }

        const eventCounts = {};
        this.receivedEvents.forEach(event => {
            eventCounts[event.routingKey] = (eventCounts[event.routingKey] || 0) + 1;
        });

        Object.entries(eventCounts).forEach(([routingKey, count]) => {
            console.log(`📨 ${routingKey}: ${count} event(s)`);
        });

        console.log(`\n📊 Total events processed: ${this.receivedEvents.length}`);
    }

    async runFullTest() {
        try {
            await this.connect();
            await this.setupEventListener();

            console.log('🚀 Starting Reputation Service Integration Test');
            console.log('='.repeat(60));

            await this.checkReputationService();
            await this.delay(1000);

            await this.testComprehensiveWorkflow();
            await this.delay(2000);

            await this.testReputationEvents();
            await this.delay(2000);

            await this.testNegativeScenario();
            await this.delay(3000);

            this.printEventSummary();

            console.log('\n' + '='.repeat(60));
            console.log('🎉 All tests completed successfully!');
            console.log(`📊 Test User ID: ${this.testUserId}`);
            console.log('\n📋 Next Steps:');
            console.log('1. Check Work History Service logs for event processing');
            console.log('2. Check Reputation Service logs for score updates');
            console.log('3. Query reputation API to verify score changes:');
            console.log(`   GET /api/reputation/${this.testUserId}`);
            console.log('4. Check database for activity logs and score history');

        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            await this.disconnect();
        }
    }
}

// Run the test
if (require.main === module) {
    const test = new ReputationIntegrationTest();
    test.runFullTest()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = ReputationIntegrationTest;