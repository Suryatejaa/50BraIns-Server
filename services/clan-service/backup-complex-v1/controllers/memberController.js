/**
 * Member Controller
 * Individual controller functions for member management
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const rabbitmqService = require('../services/rabbitmqService');
const databaseService = require('../services/database');
const { CacheManager } = require('../config/redis');

// Simple helper functions
const formatSuccessResponse = (data, message = 'Success') => ({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
});

const formatErrorResponse = (message, details = null) => ({
    success: false,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString()
});

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Get clan members
const getClanMembers = asyncHandler(async (req, res) => {
    const { clanId } = req.params;

    const members = await prisma.clanMember.findMany({
        where: { clanId, status: 'ACTIVE' },
        select: {
            id: true,
            userId: true,
            role: true,
            customRole: true,
            isCore: true,
            joinedAt: true,
            gigsParticipated: true,
            contributionScore: true,
            lastActiveAt: true
        },
        orderBy: [
            { role: 'asc' },
            { isCore: 'desc' },
            { joinedAt: 'asc' }
        ]
    });

    // Pending join requestors (user IDs)
    const pendingRequests = await prisma.clanJoinRequest.findMany({
        where: { clanId, status: 'PENDING' },
        select: { userId: true }
    });
    const requestorUserIds = pendingRequests.map(r => r.userId);

    res.json(formatSuccessResponse({ members, requestorUserIds }, 'Clan members retrieved successfully'));
});

// Suggest members with profiles (for onChange search)
const suggestMembers = asyncHandler(async (req, res) => {
    const { clanId } = req.params;
    const { query = '', limit = 10 } = req.query;

    const prisma = await databaseService.getClient();
    const members = await prisma.clanMember.findMany({
        where: { clanId, status: 'ACTIVE' },
        select: { userId: true, role: true, isCore: true }
    });

    const userIds = members.map(m => m.userId);
    if (userIds.length === 0) return res.json(formatSuccessResponse([], 'No members'));

    // Cache key per clan and query
    const cacheKey = CacheManager.generateKey('member_suggest', clanId, query.toLowerCase());
    const cached = await CacheManager.get(cacheKey);
    if (cached) return res.json(formatSuccessResponse(cached, 'Member suggestions'));

    // Call user-service batch resolve by usernames/emails if query provided; otherwise fetch by IDs
    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
    let results = [];
    try {
        const identifiers = query
            ? userIds.map(id => ({ userId: id }))
            : userIds.map(id => ({ userId: id }));

        const resp = await fetch(`${BASE_URL}/api/internal/profiles/resolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal': 'true',
                'x-calling-service': 'clan-service'
            },
            body: JSON.stringify({ identifiers: identifiers.slice(0, 100) })
        });
        const data = await resp.json();
        const map = new Map();
        for (const m of members) map.set(m.userId, m);
        results = (data?.data?.results || [])
            .map(r => ({
                userId: r.user?.id,
                role: map.get(r.user?.id)?.role,
                isCore: map.get(r.user?.id)?.isCore,
                profile: r.user ? {
                    displayName: [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || r.user.username,
                    username: r.user.username,
                    email: r.user.email,
                    avatarUrl: r.user.profilePicture,
                    location: r.user.location
                } : null
            }))
            .filter(item => item.userId);

        if (query) {
            const q = query.toLowerCase();
            results = results.filter(x => {
                const p = x.profile || {};
                return [p.displayName, p.username, p.email].some(v => v && v.toLowerCase().includes(q));
            });
        }
        results = results.slice(0, parseInt(limit));
    } catch (e) {
        console.error('Member suggest error:', e.message);
    }

    await CacheManager.set(cacheKey, results, CacheManager.getTTL('search_results'));
    res.json(formatSuccessResponse(results, 'Member suggestions'));
});

// Resolve identifiers to userIds and verify membership
const resolveMembers = asyncHandler(async (req, res) => {
    const { clanId } = req.params;
    const { identifiers = [] } = req.body || {};
    if (!Array.isArray(identifiers) || identifiers.length === 0) {
        return res.status(400).json(formatErrorResponse('identifiers array is required'));
    }

    const prisma = await databaseService.getClient();
    const members = await prisma.clanMember.findMany({ where: { clanId, status: 'ACTIVE' }, select: { userId: true } });
    const memberSet = new Set(members.map(m => m.userId));

    // Call user-service to resolve identifiers to user IDs
    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
    try {
        const resp = await fetch(`${BASE_URL}/api/internal/profiles/resolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-internal': 'true',
                'x-calling-service': 'clan-service'
            },
            body: JSON.stringify({ identifiers })
        });
        const data = await resp.json();

        const results = (data?.data?.results || []).map(r => ({
            input: r.input,
            userId: r.user?.id || null,
            displayName: r.user ? [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || r.user.username : null,
            username: r.user?.username || null,
            email: r.user?.email || null,
            avatarUrl: r.user?.profilePicture || null,
            isMember: r.user ? memberSet.has(r.user.id) : false
        }));

        res.json(formatSuccessResponse(results, 'Resolved members'));
    } catch (e) {
        console.error('Member resolve error:', e.message);
        res.status(500).json(formatErrorResponse('Failed to resolve member identifiers'));
    }
});

// Invite user to clan
const inviteMember = asyncHandler(async (req, res) => {
    const { email, role = 'MEMBER', message } = req.body;
    const { clanId } = req.query;
    const inviterId = req.user ? req.user.id : 'test-user-123';

    if (!email || !clanId) {
        return res.status(400).json(formatErrorResponse('Email and clanId are required'));
    }

    // Generate a temporary user ID for email-based invitations
    const tempUserId = 'user_' + Date.now();

    // Check for existing pending invitation by email
    const existingInvitation = await prisma.clanInvitation.findFirst({
        where: {
            clanId,
            invitedEmail: email,
            status: 'PENDING'
        }
    });

    if (existingInvitation) {
        return res.status(409).json(formatErrorResponse('User already has a pending invitation'));
    }

    // Create invitation
    const invitation = await prisma.clanInvitation.create({
        data: {
            clanId,
            invitedByUserId: inviterId,
            invitedUserId: tempUserId,
            invitedEmail: email,
            role,
            message: message || '',
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            createdAt: new Date()
        }
    });

    res.status(201).json(formatSuccessResponse(invitation, 'Invitation sent successfully'));
});

// Accept invitation
const acceptInvitation = asyncHandler(async (req, res) => {
    const { invitationId } = req.params;
    const userId = req.user.id;

    const invitation = await prisma.clanInvitation.findUnique({
        where: { id: invitationId },
        include: { clan: true }
    });

    if (!invitation) {
        return res.status(404).json(formatErrorResponse('Invitation not found'));
    }

    if (invitation.invitedUserId !== userId) {
        return res.status(403).json(formatErrorResponse('Not authorized to accept this invitation'));
    }

    if (invitation.status !== 'PENDING') {
        return res.status(409).json(formatErrorResponse('Invitation is no longer pending'));
    }

    if (new Date() > invitation.expiresAt) {
        return res.status(409).json(formatErrorResponse('Invitation has expired'));
    }

    // Create membership and update invitation
    await prisma.$transaction(async (tx) => {
        await tx.clanMember.create({
            data: {
                userId,
                clanId: invitation.clanId,
                role: invitation.role,
                customRole: invitation.customRole
            }
        });

        await tx.clanInvitation.update({
            where: { id: invitationId },
            data: { status: 'ACCEPTED', respondedAt: new Date() }
        });
    });

    // Publish join event for realtime notifications
    try {
        await rabbitmqService.publishMemberJoined(invitation.clanId, userId, invitation.role || 'MEMBER');
    } catch (e) {
        // Non-blocking
    }

    res.json(formatSuccessResponse(null, 'Invitation accepted successfully'));
});

// Remove member
const removeMember = asyncHandler(async (req, res) => {
    const { clanId, userId } = req.params;

    // Capture role before updating for event context
    const existing = await prisma.clanMember.findUnique({
        where: { userId_clanId: { userId, clanId } },
        select: { role: true }
    });

    await prisma.clanMember.update({
        where: { userId_clanId: { userId, clanId } },
        data: { status: 'LEFT' }
    });

    try {
        await rabbitmqService.publishMemberLeft(clanId, userId, existing?.role || 'MEMBER');
    } catch (e) {
        // Non-blocking
    }

    res.json(formatSuccessResponse(null, 'Member removed successfully'));
});

// Update member role
const updateMemberRole = asyncHandler(async (req, res) => {
    const { clanId, userId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.id;

    try {
        // Get clan and current user's membership
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            select: { clanHeadId: true, maxMembers: true }
        });

        if (!clan) {
            return res.status(404).json(formatErrorResponse('Clan not found'));
        }

        // Check if current user is clan head or co-head
        const currentUserMembership = await prisma.clanMember.findUnique({
            where: { userId_clanId: { userId: currentUserId, clanId } },
            select: { status: true, role: true }
        });

        if (!currentUserMembership || currentUserMembership.status !== 'ACTIVE') {
            return res.status(403).json(formatErrorResponse('You must be an active member to change roles'));
        }

        // Only HEAD and CO_HEAD can change roles
        if (!['HEAD', 'CO_HEAD'].includes(currentUserMembership.role)) {
            return res.status(403).json(formatErrorResponse('Only clan head and co-heads can change member roles'));
        }



        // Get target member
        const targetMember = await prisma.clanMember.findUnique({
            where: { userId_clanId: { userId, clanId } },
            select: { role: true, status: true }
        });

        if (!targetMember) {
            return res.status(404).json(formatErrorResponse('Member not found in clan'));
        }

        if (targetMember.status !== 'ACTIVE') {
            return res.status(400).json(formatErrorResponse('Can only change roles of active members'));
        }

        // Validate role change based on business rules
        const validationResult = await validateRoleChange(clanId, role, targetMember.role, currentUserMembership.role);
        if (!validationResult.isValid) {
            return res.status(400).json(formatErrorResponse(validationResult.error));
        }

        // Update member role
        const updatedMember = await prisma.clanMember.update({
            where: { userId_clanId: { userId, clanId } },
            data: { role }
        });

        // Publish role change event
        try {
            await rabbitmqService.publishEvent('clan.member.role_changed', {
                clanId,
                userId,
                oldRole: targetMember.role,
                newRole: role,
                changedBy: currentUserId
            });
        } catch (e) {
            console.error('Failed to publish role change event:', e);
        }

        res.json(formatSuccessResponse(updatedMember, 'Member role updated successfully'));
    } catch (error) {
        console.error('Error updating member role:', error);
        res.status(500).json(formatErrorResponse('Failed to update member role'));
    }
});

// Helper function to validate role changes based on business rules
async function validateRoleChange(clanId, newRole, currentRole, currentUserRole) {
    try {
        // Get current role counts
        const roleCounts = await prisma.clanMember.groupBy({
            by: ['role'],
            where: {
                clanId,
                status: 'ACTIVE'
            },
            _count: { role: true }
        });

        const roleCountMap = {};
        roleCounts.forEach(item => {
            roleCountMap[item.role] = item._count.role;
        });

        // Business Rule 1: Only one HEAD allowed
        if (newRole === 'HEAD') {
            if (roleCountMap['HEAD'] && currentRole !== 'HEAD') {
                return { isValid: false, error: 'Clan can only have one HEAD' };
            }
        }

        // Business Rule 2: Maximum 2 CO_HEAD allowed
        if (newRole === 'CO_HEAD') {
            const currentCoHeadCount = roleCountMap['CO_HEAD'] || 0;
            if (currentRole !== 'CO_HEAD' && currentCoHeadCount >= 2) {
                return { isValid: false, error: 'Clan can have maximum 2 CO_HEAD members' };
            }
        }

        // Business Rule 3: Prevent changing HEAD role (ownership transfer should be separate)
        if (currentRole === 'HEAD' && newRole !== 'HEAD') {
            return { isValid: false, error: 'Cannot change HEAD role. Use ownership transfer instead.' };
        }

        // Business Rule 4: Prevent demoting to HEAD (only promotion allowed)
        if (newRole === 'HEAD' && currentRole !== 'HEAD') {
            return { isValid: false, error: 'Cannot promote to HEAD. Use ownership transfer instead.' };
        }

        // Business Rule 5: CO_HEAD can only change roles below CO_HEAD level
        if (currentUserRole === 'CO_HEAD') {
            const restrictedRoles = ['HEAD', 'CO_HEAD'];
            if (restrictedRoles.includes(newRole)) {
                return { isValid: false, error: 'Co-heads can only change roles below CO_HEAD level' };
            }
            if (restrictedRoles.includes(currentRole)) {
                return { isValid: false, error: 'Co-heads cannot change HEAD or CO_HEAD roles' };
            }
        }

        return { isValid: true };
    } catch (error) {
        console.error('Error validating role change:', error);
        return { isValid: false, error: 'Failed to validate role change' };
    }
}

// Transfer clan ownership
const transferOwnership = asyncHandler(async (req, res) => {
    const { clanId, userId } = req.params;
    const currentUserId = req.user.id;

    try {
        // Get clan
        const clan = await prisma.clan.findUnique({
            where: { id: clanId },
            select: { clanHeadId: true }
        });

        if (!clan) {
            return res.status(404).json(formatErrorResponse('Clan not found'));
        }

        // Check if current user is clan head
        if (clan.clanHeadId !== currentUserId) {
            return res.status(403).json(formatErrorResponse('Only clan head can transfer ownership'));
        }

        // Prevent transferring to self
        if (currentUserId === userId) {
            return res.status(400).json(formatErrorResponse('Cannot transfer ownership to yourself'));
        }

        // Get target member
        const targetMember = await prisma.clanMember.findUnique({
            where: { userId_clanId: { userId, clanId } },
            select: { role: true, status: true }
        });

        if (!targetMember) {
            return res.status(404).json(formatErrorResponse('Member not found in clan'));
        }

        if (targetMember.status !== 'ACTIVE') {
            return res.status(400).json(formatErrorResponse('Can only transfer ownership to active members'));
        }

        // Transfer ownership in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update clan head
            const updatedClan = await tx.clan.update({
                where: { id: clanId },
                data: { clanHeadId: userId }
            });

            // Update member roles
            const updatedCurrentUser = await tx.clanMember.update({
                where: { userId_clanId: { userId: currentUserId, clanId } },
                data: { role: 'MEMBER' }
            });

            const updatedNewHead = await tx.clanMember.update({
                where: { userId_clanId: { userId, clanId } },
                data: { role: 'HEAD' }
            });

            return { updatedClan, updatedCurrentUser, updatedNewHead };
        });

        // Publish ownership transfer event
        try {
            await rabbitmqService.publishEvent('clan.ownership.transferred', {
                clanId,
                oldHeadId: currentUserId,
                newHeadId: userId,
                transferredAt: new Date().toISOString()
            });
        } catch (e) {
            console.error('Failed to publish ownership transfer event:', e);
        }

        res.json(formatSuccessResponse(result, 'Clan ownership transferred successfully'));
    } catch (error) {
        console.error('Error transferring ownership:', error);
        res.status(500).json(formatErrorResponse('Failed to transfer ownership'));
    }
});

// Leave clan
const leaveClan = asyncHandler(async (req, res) => {
    const { clanId } = req.params;
    const userId = req.user.id;

    // Check if user is clan head
    const clan = await prisma.clan.findUnique({
        where: { id: clanId },
        select: { clanHeadId: true }
    });

    if (!clan) {
        return res.status(404).json(formatErrorResponse('Clan not found'));
    }

    if (clan.clanHeadId === userId) {
        return res.status(403).json(formatErrorResponse('Clan head cannot leave. Transfer ownership first.'));
    }

    // Capture role before update
    const existing = await prisma.clanMember.findUnique({
        where: { userId_clanId: { userId, clanId } },
        select: { role: true }
    });

    await prisma.clanMember.update({
        where: { userId_clanId: { userId, clanId } },
        data: { status: 'LEFT' }
    });

    // Publish member left event
    try {
        await rabbitmqService.publishMemberLeft(clanId, userId, existing?.role || 'MEMBER');
    } catch (e) {
        // Non-blocking
    }

    res.json(formatSuccessResponse(null, 'Left clan successfully'));
});

// Get join requests for a clan
const getJoinRequests = asyncHandler(async (req, res) => {
    const { clanId } = req.params;
    const userId = req.user.id;

    // Check if user is clan head or admin
    const clan = await prisma.clan.findUnique({
        where: { id: clanId },
        select: { clanHeadId: true }
    });

    if (!clan) {
        return res.status(404).json(formatErrorResponse('Clan not found'));
    }

    if (clan.clanHeadId !== userId) {
        return res.status(403).json(formatErrorResponse('Only clan head can view join requests'));
    }

    const joinRequests = await prisma.clanJoinRequest.findMany({
        where: {
            clanId,
            status: 'PENDING'
        },
        orderBy: { createdAt: 'desc' }
    });

    res.json(formatSuccessResponse(joinRequests, 'Join requests retrieved successfully'));
});

// Approve join request
const approveJoinRequest = asyncHandler(async (req, res) => {
    const { clanId, requestId } = req.params;
    const userId = req.user.id;

    // Check if user is clan head
    const clan = await prisma.clan.findUnique({
        where: { id: clanId },
        select: { clanHeadId: true, maxMembers: true, _count: { select: { members: { where: { status: 'ACTIVE' } } } } }
    });

    if (!clan) {
        return res.status(404).json(formatErrorResponse('Clan not found'));
    }

    if (clan.clanHeadId !== userId) {
        return res.status(403).json(formatErrorResponse('Only clan head can approve join requests'));
    }

    // Check clan capacity
    if (clan.maxMembers && clan._count.members >= clan.maxMembers) {
        return res.status(400).json(formatErrorResponse('Clan is at maximum capacity'));
    }

    const joinRequest = await prisma.clanJoinRequest.findUnique({
        where: { id: requestId }
    });

    if (!joinRequest) {
        return res.status(404).json(formatErrorResponse('Join request not found'));
    }

    if (joinRequest.status !== 'PENDING') {
        return res.status(409).json(formatErrorResponse('Join request is no longer pending'));
    }

    // Approve request and add/reactivate member
    await prisma.$transaction(async (tx) => {
        const existingMembership = await tx.clanMember.findUnique({
            where: { userId_clanId: { userId: joinRequest.userId, clanId } },
            select: { id: true, status: true, joinedAt: true }
        });

        if (existingMembership) {
            await tx.clanMember.update({
                where: { userId_clanId: { userId: joinRequest.userId, clanId } },
                data: {
                    status: 'ACTIVE',
                    role: 'MEMBER',
                    // keep original joinedAt if exists; otherwise set now
                    joinedAt: existingMembership.joinedAt || new Date(),
                    lastActiveAt: new Date()
                }
            });
        } else {
            await tx.clanMember.create({
                data: {
                    userId: joinRequest.userId,
                    clanId,
                    role: 'MEMBER',
                    joinedAt: new Date(),
                    lastActiveAt: new Date()
                }
            });
        }

        // Update join request status
        await tx.clanJoinRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                reviewedAt: new Date(),
                reviewedBy: userId,
                reviewMessage: null
            }
        });
    });

    // Publish events
    try {
        await rabbitmqService.publishJoinRequestApproved(clanId, joinRequest.userId, userId);
        await rabbitmqService.publishMemberJoined(clanId, joinRequest.userId, 'MEMBER');
    } catch (error) {
        console.error('Failed to publish approval events:', error);
        // Don't fail the request if event publishing fails
    }

    res.json(formatSuccessResponse(null, 'Join request approved successfully'));
});

// Reject join request
const rejectJoinRequest = asyncHandler(async (req, res) => {
    const { clanId, requestId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    // Check if user is clan head
    const clan = await prisma.clan.findUnique({
        where: { id: clanId },
        select: { clanHeadId: true }
    });

    if (!clan) {
        return res.status(404).json(formatErrorResponse('Clan not found'));
    }

    if (clan.clanHeadId !== userId) {
        return res.status(403).json(formatErrorResponse('Only clan head can reject join requests'));
    }

    const joinRequest = await prisma.clanJoinRequest.findUnique({
        where: { id: requestId }
    });

    if (!joinRequest) {
        return res.status(404).json(formatErrorResponse('Join request not found'));
    }

    if (joinRequest.status !== 'PENDING') {
        return res.status(409).json(formatErrorResponse('Join request is no longer pending'));
    }

    // Reject request
    await prisma.clanJoinRequest.update({
        where: { id: requestId },
        data: {
            status: 'REJECTED',
            reviewedAt: new Date(),
            reviewedBy: userId,
            reviewMessage: reason || null
        }
    });

    // Publish rejection event
    try {
        await rabbitmqService.publishJoinRequestRejected(clanId, joinRequest.userId, userId, reason);
    } catch (error) {
        console.error('Failed to publish rejection event:', error);
        // Don't fail the request if event publishing fails
    }

    res.json(formatSuccessResponse(null, 'Join request rejected successfully'));
});

// Clan gig workflow methods

// Create/update clan gig plan
const createClanGigPlan = asyncHandler(async (req, res) => {
    const { clanId, gigId } = req.params;
    const { teamPlan, milestonePlan, payoutSplit } = req.body;
    const userId = req.user.id;

    // Check if user has permission to manage clan gigs
    const member = await prisma.clanMember.findFirst({
        where: {
            clanId,
            userId,
            status: 'ACTIVE',
            role: { in: ['HEAD', 'CO_HEAD', 'ADMIN'] }
        }
    });

    if (!member) {
        return res.status(403).json(formatErrorResponse('Insufficient permissions to manage clan gigs'));
    }

    // Create or update member agreements
    const agreements = [];
    for (const memberPlan of teamPlan) {
        const agreement = await prisma.memberAgreement.upsert({
            where: {
                clanId,
                userId: memberPlan.userId,
                gigId
            },
            update: {
                role: memberPlan.role,
                expectedHours: memberPlan.expectedHours,
                deliverables: memberPlan.deliverables,
                payoutPercentage: payoutSplit.find(s => s.userId === memberPlan.userId)?.payoutPercentage,
                payoutFixedAmount: payoutSplit.find(s => s.userId === memberPlan.userId)?.payoutFixedAmount
            },
            create: {
                clanId,
                userId: memberPlan.userId,
                gigId,
                role: memberPlan.role,
                expectedHours: memberPlan.expectedHours,
                deliverables: memberPlan.deliverables,
                payoutPercentage: payoutSplit.find(s => s.userId === memberPlan.userId)?.payoutPercentage,
                payoutFixedAmount: payoutSplit.find(s => s.userId === memberPlan.userId)?.fixedAmount,
                status: 'PENDING'
            }
        });
        agreements.push(agreement);
    }

    // Publish event
    try {
        await rabbitmqService.publishClanGigPlanUpdated(clanId, gigId, teamPlan, milestonePlan, payoutSplit);
    } catch (error) {
        console.error('Failed to publish clan gig plan event:', error);
    }

    res.json(formatSuccessResponse(agreements, 'Clan gig plan created/updated successfully'));
});

// Create clan task
const createClanTask = asyncHandler(async (req, res) => {
    const { clanId, gigId } = req.params;
    const { title, description, assigneeUserId, estimatedHours, deliverables, notes, dueDate } = req.body;
    const userId = req.user.id;

    // Check if user has permission to create tasks
    const member = await prisma.clanMember.findFirst({
        where: {
            clanId,
            userId,
            status: 'ACTIVE',
            role: { in: ['HEAD', 'CO_HEAD', 'ADMIN'] }
        }
    });

    if (!member) {
        return res.status(403).json(formatErrorResponse('Insufficient permissions to create tasks'));
    }

    // Create work package
    const workPackage = await prisma.clanWorkPackage.create({
        data: {
            gigId,
            clanId,
            title,
            description,
            assigneeUserId,
            estimatedHours,
            deliverables,
            notes,
            dueDate: dueDate ? new Date(dueDate) : null,
            status: 'TODO'
        }
    });

    // Publish event
    try {
        await rabbitmqService.publishClanTaskCreated(clanId, gigId, workPackage.id, title, assigneeUserId);
    } catch (error) {
        console.error('Failed to publish clan task event:', error);
    }

    res.json(formatSuccessResponse(workPackage, 'Clan task created successfully'));
});

// Update clan task
const updateClanTask = asyncHandler(async (req, res) => {
    const { clanId, gigId, taskId } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    // Check if user has permission to update tasks
    const member = await prisma.clanMember.findFirst({
        where: {
            clanId,
            userId,
            status: 'ACTIVE',
            role: { in: ['HEAD', 'CO_HEAD', 'ADMIN'] }
        }
    });

    if (!member) {
        return res.status(403).json(formatErrorResponse('Insufficient permissions to update tasks'));
    }

    // Update work package
    const workPackage = await prisma.clanWorkPackage.update({
        where: { id: taskId },
        data: updateData
    });

    // Publish event
    try {
        await rabbitmqService.publishClanTaskUpdated(clanId, gigId, workPackage.id, workPackage.status);
    } catch (error) {
        console.error('Failed to publish clan task update event:', error);
    }

    res.json(formatSuccessResponse(workPackage, 'Clan task updated successfully'));
});

// Get clan tasks
const getClanTasks = asyncHandler(async (req, res) => {
    const { clanId, gigId } = req.params;
    const userId = req.user.id;

    // Check if user is clan member
    const member = await prisma.clanMember.findFirst({
        where: {
            clanId,
            userId,
            status: 'ACTIVE'
        }
    });

    if (!member) {
        return res.status(403).json(formatErrorResponse('You must be a clan member to view tasks'));
    }

    // Get work packages
    const workPackages = await prisma.clanWorkPackage.findMany({
        where: { clanId, gigId },
        orderBy: { createdAt: 'desc' }
    });

    res.json(formatSuccessResponse(workPackages, 'Clan tasks retrieved successfully'));
});

module.exports = {
    getClanMembers,
    suggestMembers,
    resolveMembers,
    inviteMember,
    acceptInvitation,
    removeMember,
    updateMemberRole,
    transferOwnership,
    leaveClan,
    getJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    createClanGigPlan,
    createClanTask,
    updateClanTask,
    getClanTasks
};
