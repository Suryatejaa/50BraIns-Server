const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding notification service database...');

    // Create sample email templates
    const templates = [
        {
            name: 'gig-applied',
            subject: '🎯 You Applied for a Gig!',
            htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4f46e5;">Great news, {{userName}}! 🎯</h2>
                    <p>You've successfully applied for the gig:</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin: 0; color: #1f2937;">{{gigTitle}}</h3>
                        <p style="margin: 10px 0 0 0; color: #6b7280;">{{gigDescription}}</p>
                        <p style="margin: 10px 0 0 0;"><strong>Budget:</strong> {{gigBudget}}</p>
                    </div>
                    <p>The brand will review your application and get back to you soon!</p>
                    <a href="{{gigUrl}}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">View Gig Details</a>
                    <p style="color: #6b7280; font-size: 14px;">Thanks for being part of 50BraIns! 🧠</p>
                </div>
            `,
            textContent: 'You successfully applied for {{gigTitle}}. Check your dashboard for updates.',
            variables: ['userName', 'gigTitle', 'gigDescription', 'gigBudget', 'gigUrl'],
            category: 'GIG',
            language: 'en',
            isActive: true
        },
        {
            name: 'clan-invited',
            subject: '🏆 You\'re Invited to Join a Clan!',
            htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #059669;">You've been invited to join {{clanName}}! 🏆</h2>
                    <p>Hello {{userName}},</p>
                    <p>{{inviterName}} has invited you to join their clan on 50BraIns!</p>
                    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
                        <h3 style="margin: 0; color: #0c4a6e;">{{clanName}}</h3>
                        <p style="margin: 10px 0 0 0; color: #075985;">{{clanDescription}}</p>
                        <p style="margin: 10px 0 0 0;"><strong>Members:</strong> {{memberCount}} | <strong>Rank:</strong> #{{clanRank}}</p>
                    </div>
                    <p>Join forces with other creators and grow together!</p>
                    <a href="{{clanUrl}}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Accept Invitation</a>
                </div>
            `,
            textContent: '{{inviterName}} invited you to join {{clanName}} clan. Visit your dashboard to accept.',
            variables: ['userName', 'clanName', 'clanDescription', 'inviterName', 'memberCount', 'clanRank', 'clanUrl'],
            category: 'CLAN',
            language: 'en',
            isActive: true
        },
        {
            name: 'welcome',
            subject: '🎉 Welcome to 50BraIns!',
            htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #4f46e5; text-align: center;">Welcome to 50BraIns! 🧠</h1>
                    <p>Hello {{userName}},</p>
                    <p>We're thrilled to have you join our community of creative minds!</p>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #1e293b;">Get Started:</h3>
                        <ul style="color: #475569;">
                            <li>Complete your profile to attract better opportunities</li>
                            <li>Browse and apply for exciting gigs</li>
                            <li>Join or create a clan to collaborate with others</li>
                            <li>Build your reputation through quality work</li>
                        </ul>
                    </div>
                    <a href="{{profileUrl}}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Complete Your Profile</a>
                    <p style="color: #6b7280; font-size: 14px;">Ready to unleash your creative potential? Let's go! 🚀</p>
                </div>
            `,
            textContent: 'Welcome to 50BraIns, {{userName}}! Complete your profile to get started.',
            variables: ['userName', 'profileUrl'],
            category: 'USER',
            language: 'en',
            isActive: true
        },
        {
            name: 'credits-purchased',
            subject: '💰 Credits Added to Your Wallet!',
            htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc2626;">Your credits are ready! 💰</h2>
                    <p>Hi {{userName}},</p>
                    <p>Your credit purchase was successful!</p>
                    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #fecaca;">
                        <h3 style="margin: 0; color: #991b1b;">Transaction Details</h3>
                        <p style="margin: 10px 0;"><strong>Credits Added:</strong> {{creditsAmount}}</p>
                        <p style="margin: 10px 0;"><strong>Total Balance:</strong> {{totalBalance}}</p>
                        <p style="margin: 10px 0;"><strong>Transaction ID:</strong> {{transactionId}}</p>
                    </div>
                    <p>Start boosting your profile or explore premium features!</p>
                    <a href="{{walletUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">View Wallet</a>
                </div>
            `,
            textContent: '{{creditsAmount}} credits added to your wallet. Total balance: {{totalBalance}}',
            variables: ['userName', 'creditsAmount', 'totalBalance', 'transactionId', 'walletUrl'],
            category: 'CREDITS',
            language: 'en',
            isActive: true
        }
    ];

    // Create email templates
    for (const template of templates) {
        await prisma.emailTemplate.upsert({
            where: { name: template.name },
            update: template,
            create: template
        });
        console.log(`✅ Created email template: ${template.name}`);
    }

    // Create sample notification preferences for testing
    const sampleUserIds = [
        'user-123-sample',
        'user-456-sample',
        'user-789-sample'
    ];

    for (const userId of sampleUserIds) {
        await prisma.notificationPreference.upsert({
            where: { userId },
            update: {},
            create: {
                userId,
                emailEnabled: true,
                inAppEnabled: true,
                pushEnabled: false,
                smsEnabled: false,
                gigNotifications: true,
                clanNotifications: true,
                creditNotifications: true,
                systemNotifications: true,
                marketingNotifications: false,
                instantNotifications: true,
                dailyDigest: true,
                weeklyDigest: false
            }
        });
        console.log(`✅ Created notification preferences for: ${userId}`);
    }

    // Create sample notifications for testing
    const sampleNotifications = [
        {
            userId: 'user-123-sample',
            type: 'TRANSACTIONAL',
            category: 'GIG',
            title: '🎯 Welcome to Notifications!',
            message: 'This is a sample notification to test the system.',
            priority: 'MEDIUM',
            channel: 'IN_APP',
            read: false,
            sent: true,
            sentAt: new Date(),
            metadata: {
                isTest: true,
                gigId: 'sample-gig-123'
            }
        },
        {
            userId: 'user-123-sample',
            type: 'ENGAGEMENT',
            category: 'CLAN',
            title: '🏆 Your Clan is Trending!',
            message: 'Your clan just moved up in the rankings. Great teamwork!',
            priority: 'HIGH',
            channel: 'IN_APP',
            read: true,
            sent: true,
            sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            readAt: new Date(Date.now() - 23 * 60 * 60 * 1000), // 23 hours ago
            metadata: {
                isTest: true,
                clanId: 'sample-clan-456',
                newRank: 5
            }
        },
        {
            userId: 'user-456-sample',
            type: 'ALERT',
            category: 'CREDITS',
            title: '⚡ Boost Expiring Soon!',
            message: 'Your profile boost expires in 2 days. Renew now to keep the benefits!',
            priority: 'HIGH',
            channel: 'IN_APP',
            read: false,
            sent: true,
            sentAt: new Date(),
            metadata: {
                isTest: true,
                boostType: 'profile',
                expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            }
        },
        {
            userId: 'user-789-sample',
            type: 'SYSTEM',
            category: 'SYSTEM',
            title: '🎉 New Features Available!',
            message: 'Check out the latest updates to the 50BraIns platform.',
            priority: 'MEDIUM',
            channel: 'IN_APP',
            read: false,
            sent: true,
            sentAt: new Date(),
            metadata: {
                isTest: true,
                version: '2.1.0'
            }
        }
    ];

    for (const notification of sampleNotifications) {
        await prisma.notification.create({
            data: notification
        });
        console.log(`✅ Created sample notification: ${notification.title}`);
    }

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Email Templates: ${templates.length}`);
    console.log(`   - User Preferences: ${sampleUserIds.length}`);
    console.log(`   - Sample Notifications: ${sampleNotifications.length}`);
    console.log('\n💡 You can now test the notification service with sample data!');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
