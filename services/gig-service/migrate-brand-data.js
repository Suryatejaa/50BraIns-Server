// Migration script to update existing gigs with brand data
const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function fetchUserData(userId) {
    try {
        const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:4005';
        const response = await fetch(`${USER_SERVICE_URL}/internal/users/${userId}`, {
            headers: {
                'X-Internal-Service': 'gig-service',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(`Failed to fetch user data for ${userId}: ${response.status}`);
            return null;
        }

        const userData = await response.json();
        const user = userData.user || userData.data || userData;

        // Determine display name based on priority: companyName > firstName lastName > username
        let displayName = user.username; // Default fallback

        if (user.companyName && user.companyName.trim()) {
            displayName = user.companyName.trim();
        } else if (user.firstName || user.lastName) {
            const firstName = user.firstName || '';
            const lastName = user.lastName || '';
            displayName = `${firstName} ${lastName}`.trim();
        }

        return {
            name: displayName,
            username: user.username,
            profilePicture: user.profilePicture,
            verified: user.emailVerified || false
        };

    } catch (error) {
        console.error(`Error fetching user data for ${userId}:`, error);
        return null;
    }
}

async function migrateBrandDataToExistingGigs() {
    try {
        console.log('🔄 Starting migration of brand data to existing gigs...');

        // Find all gigs that don't have brand data
        const gigsWithoutBrandData = await prisma.gig.findMany({
            where: {
                OR: [
                    { brandName: null },
                    { brandName: '' }
                ]
            },
            select: {
                id: true,
                postedById: true,
                title: true
            }
        });

        console.log(`📊 Found ${gigsWithoutBrandData.length} gigs without brand data`);

        if (gigsWithoutBrandData.length === 0) {
            console.log('✅ All gigs already have brand data!');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const gig of gigsWithoutBrandData) {
            try {
                console.log(`🔄 Processing gig: ${gig.title} (${gig.id})`);

                const brandData = await fetchUserData(gig.postedById);

                if (brandData) {
                    await prisma.gig.update({
                        where: { id: gig.id },
                        data: {
                            brandName: brandData.name,
                            brandUsername: brandData.username,
                            brandAvatar: brandData.profilePicture,
                            brandVerified: brandData.verified
                        }
                    });

                    console.log(`✅ Updated gig ${gig.id} with brand data: ${brandData.name}`);
                    successCount++;
                } else {
                    console.log(`⚠️ Could not fetch brand data for gig ${gig.id}, user ${gig.postedById}`);
                    errorCount++;
                }

                // Add small delay to avoid overwhelming the user service
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.error(`❌ Error processing gig ${gig.id}:`, error);
                errorCount++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`✅ Successfully updated: ${successCount} gigs`);
        console.log(`❌ Errors: ${errorCount} gigs`);
        console.log(`📋 Total processed: ${gigsWithoutBrandData.length} gigs`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
migrateBrandDataToExistingGigs();