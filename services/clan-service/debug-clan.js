const { getDatabaseService } = require('./src/services/database.service');

async function debugClan() {
    const db = getDatabaseService();
    const prisma = db.getClient();

    try {
        console.log('🔍 Debugging clan permissions...\n');

        // Check the specific clan
        const clanId = 'cmeeajyrd0001pws03gswb011';
        const userId = 'cf2e0a3f-df3b-4cfb-ada5-c3dc6aa32117';

        console.log(`Clan ID: ${clanId}`);
        console.log(`User ID: ${userId}\n`);

        // Get clan data
        const clan = await prisma.clan.findUnique({
            where: { id: clanId }
        });

        if (!clan) {
            console.log('❌ Clan not found');
            return;
        }

        console.log('📋 Clan Data:');
        console.log(`   Name: ${clan.name}`);
        console.log(`   Head ID: ${clan.headId}`);
        console.log(`   Admins: ${JSON.stringify(clan.admins)}`);
        console.log(`   Member IDs: ${JSON.stringify(clan.memberIds)}`);
        console.log(`   Pending Requests: ${JSON.stringify(clan.pendingRequests)}`);
        console.log(`   Member Count: ${clan.memberCount}`);

        console.log('\n🔐 Permission Check:');
        console.log(`   Is Head: ${clan.headId === userId}`);
        console.log(`   Is Admin: ${clan.admins && clan.admins.includes(userId)}`);
        console.log(`   Is Member: ${clan.memberIds && clan.memberIds.includes(userId)}`);

        // Check if user is in ClanMember table
        const member = await prisma.clanMember.findUnique({
            where: { userId_clanId: { userId, clanId } }
        });

        console.log('\n👤 ClanMember Record:');
        if (member) {
            console.log(`   Role: ${member.role}`);
            console.log(`   Status: ${member.status}`);
            console.log(`   Joined At: ${member.joinedAt}`);
        } else {
            console.log('   ❌ No ClanMember record found');
        }

        // Check all members of this clan
        const allMembers = await prisma.clanMember.findMany({
            where: { clanId, status: 'ACTIVE' }
        });

        console.log('\n👥 All Active Members:');
        allMembers.forEach(member => {
            console.log(`   User: ${member.userId}, Role: ${member.role}, Status: ${member.status}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugClan();
