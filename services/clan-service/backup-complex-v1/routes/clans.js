const express = require('express');
const router = express.Router();
const clanController = require('../controllers/clanController');
const {
    createClanGigPlan,
    createClanTask,
    updateClanTask,
    getClanTasks
} = require('../controllers/memberController');

const { requireAuth } = require('../middleware');
const axios = require('axios');
const databaseService = require('../services/database');
const rabbitmqService = require('../services/rabbitmqService');

// GET /clans - Get all clans with filtering and ranking (legacy)
router.get('/', requireAuth, clanController.getClans);

// GET /clans/my - Get clans created by current user
router.get('/my', requireAuth, clanController.getMyClans);

// GET /clans/feed - Enhanced clans feed with reputation integration
router.get('/feed', clanController.getClansAdvanced);

// POST /clans - Create a new clan
router.post('/', requireAuth, clanController.createClan);

// GET /clans/:clanId - Get a single clan by ID
router.get('/:clanId', clanController.getClanById);

// PUT /clans/:clanId - Update a clan
router.put('/:clanId', requireAuth, clanController.updateClan);

// POST /clans/:clanId/join - Request to join a clan
router.post('/:clanId/join', requireAuth, clanController.requestToJoinClan);

// DELETE /clans/:clanId - Delete a clan
router.delete('/:clanId', requireAuth, clanController.deleteClan);

// Integration: Gigs feed for a clan (proxy to gig-service)
router.get('/:clanId/gigs', requireAuth, async (req, res) => {
    try {
        const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
        const { page = 1, limit = 20 } = req.query;
        const response = await axios.get(`${GATEWAY_URL}/api/gig/by-clan/${req.params.clanId}`, {
            params: { page, limit },
            headers: {
                'x-internal': 'true',
                'x-calling-service': 'clan-service',
                'x-user-id': req.user.id,
                'x-user-email': req.user.email,
                'x-user-roles': req.user.roles?.join(',') || '',
                'x-user-is-admin': req.user.isAdmin ? 'true' : 'false'
            }
        });
        // Enrich with clan membership context for UI (member IDs and pending request for current user)
        const prisma = await databaseService.getClient();
        const clanId = req.params.clanId;
        const [members, pendingReq] = await Promise.all([
            prisma.clanMember.findMany({ where: { clanId, status: 'ACTIVE' }, select: { userId: true } }),
            prisma.clanJoinRequest.findFirst({ where: { clanId, userId: req.user.id, status: 'PENDING' }, select: { id: true } })
        ]);
        const memberIds = members.map(m => m.userId);

        // Attach member info both at top-level and within each gig item for ease of UI consumption
        const payload = response.data;
        const decorateGig = (gig) => ({
            ...gig,
            clanMemberIds: memberIds,
            isMember: memberIds.includes(req.user.id),
            hasPendingJoinRequest: !!pendingReq,
            pendingJoinRequestId: pendingReq?.id || null
        });

        let result;
        if (Array.isArray(payload)) {
            result = payload.map(decorateGig);
        } else if (Array.isArray(payload?.data)) {
            result = { ...payload, data: payload.data.map(decorateGig), memberIds };
        } else if (Array.isArray(payload?.gigs)) {
            result = { ...payload, gigs: payload.gigs.map(decorateGig), memberIds };
        } else if (Array.isArray(payload?.items)) {
            result = { ...payload, items: payload.items.map(decorateGig), memberIds };
        } else if (Array.isArray(payload?.data?.gigs)) {
            result = { ...payload, data: { ...payload.data, gigs: payload.data.gigs.map(decorateGig) }, memberIds };
        } else if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
            // Single gig object case
            result = decorateGig(payload);
        } else {
            result = { ...payload, memberIds };
        }

        res.status(response.status).json(result);
    } catch (error) {
        const status = error.response?.status || 500;
        res.status(status).json({ success: false, error: error.message, details: error.response?.data });
    }
});

// Integration: Assign gig to a member (proxy to gig-service) and emit event
router.post('/:clanId/gigs/:gigId/assign', requireAuth, async (req, res) => {
    try {
        const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
        const { clanId, gigId } = req.params;
        const { assigneeUserId } = req.body;

        const response = await axios.post(`${GATEWAY_URL}/api/gig/${gigId}/assign`, { assigneeUserId, clanId }, {
            headers: {
                'x-internal': 'true',
                'x-calling-service': 'clan-service',
                'x-user-id': req.user.id,
                'x-user-email': req.user.email,
                'x-user-roles': req.user.roles?.join(',') || '',
                'x-user-is-admin': req.user.isAdmin ? 'true' : 'false'
            }
        });

        try {
            await rabbitmqService.publishEvent('clan.gig.assigned', {
                clanId,
                gigId,
                assigneeUserId,
                assignedBy: req.user.id
            });
        } catch (e) { }

        res.status(response.status).json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        res.status(status).json({ success: false, error: error.message, details: error.response?.data });
    }
});

// Clan gig workflow endpoints
router.post('/:clanId/gigs/:gigId/plan', requireAuth, createClanGigPlan);
router.post('/:clanId/gigs/:gigId/tasks', requireAuth, createClanTask);
router.patch('/:clanId/gigs/:gigId/tasks/:taskId', requireAuth, updateClanTask);
router.get('/:clanId/gigs/:gigId/tasks', requireAuth, getClanTasks);

// NEW: Get clan's gig assignments
router.get('/:clanId/gig-assignments', requireAuth, async (req, res) => {
    try {
        const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
        const { clanId } = req.params;

        // Get gig assignments for this clan from gig-service via gateway
        const response = await axios.get(`${GATEWAY_URL}/api/gig/assignments/by-clan/${clanId}`, {
            headers: {
                'x-internal': 'true',
                'x-calling-service': 'clan-service',
                'x-user-id': req.user.id,
                'x-user-email': req.user.email,
                'x-user-roles': req.user.roles?.join(',') || '',
                'x-user-is-admin': req.user.isAdmin ? 'true' : 'false'
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        res.status(status).json({
            success: false,
            error: error.message,
            details: error.response?.data
        });
    }
});

// NEW: Get member agreements for a specific gig
router.get('/:clanId/gigs/:gigId/member-agreements', requireAuth, async (req, res) => {
    try {
        const { clanId, gigId } = req.params;
        console.log('🔍 Fetching member agreements for clan:', clanId, 'gig:', gigId);

        // Get member agreements from database
        const prisma = await databaseService.getClient();
        console.log('✅ Prisma client obtained:', !!prisma);

        // Test database connection first
        try {
            await prisma.$queryRaw`SELECT 1`;
            console.log('✅ Database connection test passed');
        } catch (dbError) {
            console.error('❌ Database connection test failed:', dbError);
            return res.status(500).json({
                success: false,
                error: 'Database connection failed',
                details: dbError.message
            });
        }

        // Check if MemberAgreement table exists
        try {
            const tableExists = await prisma.$queryRaw`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'member_agreements'
                );
            `;
            console.log('✅ Table exists check:', tableExists);

            if (tableExists[0]?.exists === false) {
                console.error('❌ Table does not exist:', tableExists);
                return res.status(500).json({
                    success: false,
                    error: 'MemberAgreement table does not exist',
                    details: 'Database schema may be out of sync'
                });
            }
        } catch (tableError) {
            console.error('❌ Table existence check failed:', tableError);
        }

        const agreements = await prisma.memberAgreement.findMany({
            where: { clanId, gigId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true
                    }
                }
            }
        });

        console.log('✅ Found agreements:', agreements.length);

        res.json({
            success: true,
            data: agreements,
            count: agreements.length
        });
    } catch (error) {
        console.error('❌ Error fetching member agreements:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        console.error('❌ Error fetching member agreements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch member agreements',
            details: error.message
        });
    }
});

module.exports = router;
