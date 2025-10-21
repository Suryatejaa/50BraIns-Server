/**
 * Clan member service for handling membership operations
 */

const { getDatabaseService } = require('./database.service');
const { RabbitMQService } = require('./rabbitmq.service');

class ClanMemberService {
    constructor() {
        this.db = getDatabaseService();
        this.rabbitmq = new RabbitMQService();
    }

    /**
     * Get member by user ID and clan ID
     */
    async getMemberByUserAndClan(userId, clanId) {
        const prisma = this.db.getClient();

        return await prisma.clanMember.findUnique({
            where: { userId_clanId: { userId, clanId } }
        });
    }

    /**
     * Get all members of a clan
     */
    async getClanMembers(clanId) {
        const prisma = this.db.getClient();

        return await prisma.clanMember.findMany({
            where: { clanId, status: 'ACTIVE' },
            select: {
                id: true,
                clanId: true,
                userId: true,
                role: true,
                joinedAt: true
            },
            orderBy: { joinedAt: 'asc' }
        });
    }

    /**
     * Join a clan
     */
    async joinClan(clanId, userId, message = '') {
        const prisma = this.db.getClient();

        // Check if already a member
        const existingMember = await this.getMemberByUserAndClan(userId, clanId);
        if (existingMember) {
            if (existingMember.status === 'ACTIVE') {
                // Return existing member info instead of throwing error
                return existingMember;
            } else {
                // Reactivate inactive membership
                await prisma.clanMember.update({
                    where: { userId_clanId: { userId, clanId } },
                    data: { status: 'ACTIVE' }
                });
                return existingMember;
            }
        }

        // Get clan details
        const clan = await prisma.clan.findUnique({
            where: { id: clanId }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        if (!clan.isActive) {
            throw new Error('Clan is not active');
        }

        if (clan.memberCount >= clan.maxMembers) {
            throw new Error('Clan is full');
        }

        // Use transaction to ensure data consistency
        const result = await prisma.$transaction(async (tx) => {
            // Add member
            const member = await tx.clanMember.create({
                data: {
                    userId,
                    clanId,
                    role: 'MEMBER',
                    status: 'ACTIVE'
                }
            });

            // Update clan member count and memberIds array
            await tx.clan.update({
                where: { id: clanId },
                data: {
                    memberCount: { increment: 1 },
                    memberIds: { push: userId }
                }
            });

            return member;
        });

        // Publish member joined event
        try {
            await this.rabbitmq.publishClanMemberJoined(
                clanId,
                userId,
                `User ${userId}`, // userName would come from user service
                'MEMBER',
                clan.name
            );
            console.log('📤 [Clan Service] Published member joined event');
        } catch (error) {
            console.error('❌ [Clan Service] Failed to publish member joined event:', error);
            // Don't fail the join operation if event publishing fails
        }

        return result;
    }

    /**
     * Leave a clan
     */
    async leaveClan(clanId, userId) {
        const prisma = this.db.getClient();

        // Check if user is clan head
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            include: { members: true }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        const isClanHead = clan.members?.some(m => m.userId === userId && m.role === 'OWNER');
        if (isClanHead) {
            throw new Error('Clan head cannot leave. Transfer leadership first.');
        }

        // Use transaction to ensure data consistency
        const result = await prisma.$transaction(async (tx) => {
            // Remove member
            const member = await tx.clanMember.delete({
                where: { userId_clanId: { userId, clanId } }
            });

            // Update clan member count and remove from memberIds array
            await tx.clan.update({
                where: { id: clanId },
                data: {
                    memberCount: { decrement: 1 },
                    memberIds: { set: clan.memberIds.filter(id => id !== userId) }
                }
            });

            return member;
        });

        // Publish member left event
        try {
            await this.rabbitmq.publishClanMemberLeft(
                clanId,
                userId,
                `User ${userId}`, // userName would come from user service
                'MEMBER', // role would be stored in the member record
                clan.name
            );
            console.log('📤 [Clan Service] Published member left event');
        } catch (error) {
            console.error('❌ [Clan Service] Failed to publish member left event:', error);
            // Don't fail the leave operation if event publishing fails
        }

        return result;
    }

    /**
     * Get user's clan memberships
     */
    async getUserMemberships(userId) {
        const prisma = this.db.getClient();

        try {
            const memberships = await prisma.clanMember.findMany({
                where: { userId, status: 'ACTIVE' },
                include: {
                    clan: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            tagline: true,
                            primaryCategory: true,
                            categories: true,
                            skills: true,
                            location: true,
                            memberCount: true,
                            reputationScore: true,
                            createdAt: true,
                            updatedAt: true,
                            memberIds: true,
                            pendingRequests: true,
                            headId: true,
                            admins: true
                        }
                    }
                }
            });

            // Filter out any memberships where clan might be null
            return memberships.filter(membership => membership.clan !== null);
        } catch (error) {
            console.error('Error in getUserMemberships:', error);
            throw error;
        }
    }

    /**
     * Update member role
     */
    async updateMemberRole(clanId, userId, newRole) {
        const prisma = this.db.getClient();

        // Check if user is clan head
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            include: { members: true }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        const isClanHead = clan.members?.some(m => m.userId === userId && m.role === 'OWNER');
        if (!isClanHead) {
            throw new Error('Only clan head can update member roles');
        }

        return await prisma.clanMember.update({
            where: { userId_clanId: { userId, clanId } },
            data: { role: newRole }
        });
    }

    /**
     * Remove member from clan
     */
    async removeMember(clanId, userId, removedByUserId) {
        const prisma = this.db.getClient();

        // Check if user has permission to remove members
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            include: { members: true }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        const remover = clan.members?.find(m => m.userId === removedByUserId);
        if (!remover || !['OWNER', 'ADMIN'].includes(remover.role)) {
            throw new Error('Insufficient permissions to remove members');
        }

        const memberToRemove = clan.members?.find(m => m.userId === userId);
        if (!memberToRemove) {
            throw new Error('Member not found');
        }

        if (memberToRemove.role === 'OWNER') {
            throw new Error('Cannot remove clan owner');
        }

        // Use transaction to ensure data consistency
        const result = await prisma.$transaction(async (tx) => {
            // Remove member
            const member = await tx.clanMember.delete({
                where: { userId_clanId: { userId, clanId } }
            });

            // Update clan member count
            await tx.clan.update({
                where: { id: clanId },
                data: { memberCount: { decrement: 1 } }
            });

            return member;
        });

        return result;
    }

    /**
     * Add admin to clan
     */
    async addAdmin(clanId, userId, addedByUserId) {
        const prisma = this.db.getClient();

        // Check if user has permission to add admins
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            include: { members: true }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        // Only clan head can add admins
        if (clan.headId !== addedByUserId) {
            throw new Error('Only clan head can add admins');
        }

        // Check if user is a member
        const member = await this.getMemberByUserAndClan(userId, clanId);
        if (!member || member.status !== 'ACTIVE') {
            throw new Error('User must be an active member to become admin');
        }

        // Use transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
            // Update member role to ADMIN
            await tx.clanMember.update({
                where: { userId_clanId: { userId, clanId } },
                data: { role: 'ADMIN' }
            });

            // Add to admins array
            await tx.clan.update({
                where: { id: clanId },
                data: {
                    admins: {
                        push: userId
                    }
                }
            });
        });

        return { success: true, message: 'Admin added successfully' };
    }

    /**
     * Remove admin from clan
     */
    async removeAdmin(clanId, userId, removedByUserId) {
        const prisma = this.db.getClient();

        // Check if user has permission to remove admins
        const clan = await prisma.clan.findUnique({
            where: { id: clanId }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        // Only clan head can remove admins
        if (clan.headId !== removedByUserId) {
            throw new Error('Only clan head can remove admins');
        }

        // Use transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
            // Update member role to MEMBER
            await tx.clanMember.update({
                where: { userId_clanId: { userId, clanId } },
                data: { role: 'MEMBER' }
            });

            // Remove from admins array
            await tx.clan.update({
                where: { id: clanId },
                data: {
                    admins: {
                        set: clan.admins.filter(adminId => adminId !== userId)
                    }
                }
            });
        });

        return { success: true, message: 'Admin removed successfully' };
    }

    /**
     * Transfer clan ownership
     */
    async transferOwnership(clanId, newOwnerId, transferredByUserId) {
        const prisma = this.db.getClient();

        // Check if user has permission to transfer ownership
        const clan = await prisma.clan.findUnique({
            where: { id: clanId }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        // Only current clan head can transfer ownership
        if (clan.headId !== transferredByUserId) {
            throw new Error('Only clan head can transfer ownership');
        }

        // Check if new owner is a member
        const newOwner = await this.getMemberByUserAndClan(newOwnerId, clanId);
        if (!newOwner || newOwner.status !== 'ACTIVE') {
            throw new Error('New owner must be an active member');
        }

        // Use transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
            // Update old owner role to MEMBER
            await tx.clanMember.update({
                where: { userId_clanId: { userId: transferredByUserId, clanId } },
                data: { role: 'MEMBER' }
            });

            // Update new owner role to OWNER
            await tx.clanMember.update({
                where: { userId_clanId: { userId: newOwnerId, clanId } },
                data: { role: 'OWNER' }
            });

            // Update clan headId and admins
            await tx.clan.update({
                where: { id: clanId },
                data: {
                    headId: newOwnerId,
                    admins: [newOwnerId] // New owner becomes first admin
                }
            });
        });

        return { success: true, message: 'Ownership transferred successfully' };
    }

    /**
     * Request to join a clan (adds to pendingRequests)
     */
    async requestJoin(clanId, userId) {
        const prisma = this.db.getClient();

        // Check if clan exists and is active
        const clan = await prisma.clan.findUnique({
            where: { id: clanId }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        if (!clan.isActive) {
            throw new Error('Clan is not active');
        }

        // Check if user is already a member
        const existingMember = await this.getMemberByUserAndClan(userId, clanId);
        if (existingMember && existingMember.status === 'ACTIVE') {
            throw new Error('User is already a member of this clan');
        }

        // Check if request is already pending
        if (clan.pendingRequests.includes(userId)) {
            throw new Error('Join request is already pending');
        }

        // Add to pending requests
        await prisma.clan.update({
            where: { id: clanId },
            data: {
                pendingRequests: { push: userId }
            }
        });

        // Publish join request event
        try {
            await this.rabbitmq.publishClanJoinRequest(
                clanId,
                userId,
                `User ${userId}`, // userName would come from user service
                '', // message
                clan.name,
                clan.headId,
                clan.admins || []
            );
            console.log('📤 [Clan Service] Published join request event');
        } catch (error) {
            console.error('❌ [Clan Service] Failed to publish join request event:', error);
            // Don't fail the request if event publishing fails
        }

        return { success: true, message: 'Join request sent successfully' };
    }

    /**
     * Approve a join request
     */
    async approveRequest(clanId, userId, approvedByUserId) {
        const prisma = this.db.getClient();

        // Check if user has permission to approve requests
        const clan = await prisma.clan.findUnique({
            where: { id: clanId }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        // Only clan head and admins can approve requests
        if (clan.headId !== approvedByUserId && !clan.admins.includes(approvedByUserId)) {
            throw new Error('Only clan head and admins can approve join requests');
        }

        // Check if request is pending
        if (!clan.pendingRequests.includes(userId)) {
            throw new Error('No pending request found for this user');
        }

        // Use transaction to ensure data consistency
        await prisma.$transaction(async (tx) => {
            // Remove from pending requests
            await tx.clan.update({
                where: { id: clanId },
                data: {
                    pendingRequests: {
                        set: clan.pendingRequests.filter(id => id !== userId)
                    }
                }
            });

            // Add as member
            await tx.clanMember.create({
                data: {
                    userId,
                    clanId,
                    role: 'MEMBER',
                    status: 'ACTIVE'
                }
            });

            // Update clan member count and memberIds
            await tx.clan.update({
                where: { id: clanId },
                data: {
                    memberCount: { increment: 1 },
                    memberIds: { push: userId }
                }
            });
        });

        // Publish events
        try {
            // Publish join request approved event
            await this.rabbitmq.publishClanJoinRequestApproved(
                clanId,
                userId,
                `User ${userId}`, // userName would come from user service
                approvedByUserId,
                `User ${approvedByUserId}`, // approvedByName would come from user service
                clan.name
            );

            // Publish member joined event
            await this.rabbitmq.publishClanMemberJoined(
                clanId,
                userId,
                `User ${userId}`, // userName would come from user service
                'MEMBER',
                clan.name
            );

            console.log('📤 [Clan Service] Published join request approved and member joined events');
        } catch (error) {
            console.error('❌ [Clan Service] Failed to publish events:', error);
            // Don't fail the approval if event publishing fails
        }

        return { success: true, message: 'Join request approved successfully' };
    }

    /**
     * Reject a join request
     */
    async rejectRequest(clanId, userId, rejectedByUserId, reason) {
        const prisma = this.db.getClient();

        // Check if user has permission to reject requests
        const clan = await prisma.clan.findUnique({
            where: { id: clanId }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        // Only clan head and admins can reject requests
        if (clan.headId !== rejectedByUserId && !clan.admins.includes(rejectedByUserId)) {
            throw new Error('Only clan head and admins can reject join requests');
        }

        // Check if request is pending
        if (!clan.pendingRequests.includes(userId)) {
            throw new Error('No pending request found for this user');
        }

        // Remove from pending requests
        await prisma.clan.update({
            where: { id: clanId },
            data: {
                pendingRequests: {
                    set: clan.pendingRequests.filter(id => id !== userId)
                }
            }
        });

        // Publish join request rejected event
        try {
            await this.rabbitmq.publishClanJoinRequestRejected(
                clanId,
                userId,
                `User ${userId}`, // userName would come from user service
                rejectedByUserId,
                `User ${rejectedByUserId}`, // rejectedByName would come from user service
                reason || 'No specific reason provided',
                clan.name
            );
            console.log('📤 [Clan Service] Published join request rejected event');
        } catch (error) {
            console.error('❌ [Clan Service] Failed to publish join request rejected event:', error);
            // Don't fail the rejection if event publishing fails
        }

        return { success: true, message: 'Join request rejected successfully' };
    }

    /**
     * Get pending join requests for a clan
     */
    async getPendingRequests(clanId, userId) {
        const prisma = this.db.getClient();

        // Check if user has permission to view pending requests
        const clan = await prisma.clan.findUnique({
            where: { id: clanId }
        });

        if (!clan) {
            throw new Error('Clan not found');
        }

        // Debug logging
        console.log(`🔍 Permission check for clan ${clanId}:`);
        console.log(`   User ID: ${userId}`);
        console.log(`   Clan headId: ${clan.headId}`);
        console.log(`   Clan admins: ${JSON.stringify(clan.admins)}`);
        console.log(`   Is head: ${clan.headId === userId}`);
        console.log(`   Is admin: ${clan.admins && clan.admins.includes(userId)}`);

        // Only clan head and admins can view pending requests
        const isHead = clan.headId === userId;
        const isAdmin = clan.admins && clan.admins.includes(userId);

        if (!isHead && !isAdmin) {
            throw new Error(`Only clan head and admins can view pending requests. User ${userId} is not authorized.`);
        }

        return clan.pendingRequests;
    }
}

module.exports = { ClanMemberService };
