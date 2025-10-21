const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedSampleUser() {
    try {
        const user = await prisma.user.create({
            data: {
                id: 'user_test_id_1',
                email: 'sampleuser@example.com',
                username: 'sampleuser',
                firstName: 'Sample',
                lastName: 'User',
                phone: '+1234567890',
                bio: 'This is a sample bio.',
                location: 'Sample City',
                profilePicture: 'https://example.com/profile.jpg',
                coverImage: 'https://example.com/cover.jpg',
                instagramHandle: '@sample_insta',
                twitterHandle: '@sample_twitter',
                linkedinHandle: 'sample_linkedin',
                youtubeHandle: 'sample_youtube',
                website: 'https://samplewebsite.com',
                contentCategories: ['fashion', 'lifestyle'],
                primaryNiche: 'Fashion',
                primaryPlatform: 'Instagram',
                estimatedFollowers: 10000,
                companyName: 'Sample Company',
                companyType: 'Private',
                industry: 'Fashion',
                gstNumber: 'GST123456',
                companyWebsite: 'https://company.com',
                marketingBudget: '10000-20000',
                targetAudience: ['youth', 'adults'],
                campaignTypes: ['branding', 'influencer'],
                designationTitle: 'Marketing Head',
                crewSkills: ['photography', 'editing'],
                experienceLevel: 'Expert',
                equipmentOwned: ['camera', 'lights'],
                portfolioUrl: 'https://portfolio.com',
                hourlyRate: 100,
                availability: 'Weekdays',
                workStyle: 'Remote',
                specializations: ['fashion', 'lifestyle'],
                roles: ['USER', 'INFLUENCER'],
                status: 'ACTIVE',
                isActive: true,
                emailVerified: true,
                emailVerifiedAt: new Date(),
                twoFactorSecret: '2fa_secret',
                twoFactorEnabled: true,
                passwordResetToken: 'reset_token',
                passwordResetExpires: new Date(),
                emailVerificationToken: 'email_verification_token',
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: new Date(),
                lastActiveAt: new Date(),
                isBanned: false,
                banReason: null,
                banExpiresAt: null,
                bannedAt: null,
                bannedBy: null
            }
        });
        console.log('Sample user inserted:', user);
    } catch (err) {
        console.error('Error inserting sample user:', err);
    } finally {
        await prisma.$disconnect();
    }
}

seedSampleUser();
