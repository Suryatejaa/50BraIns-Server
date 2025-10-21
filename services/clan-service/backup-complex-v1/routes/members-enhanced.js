const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware');
const {
    getClanMembers,
    inviteMember,
    acceptInvitation,
    removeMember,
    updateMemberRole,
    leaveClan
} = require('../controllers/memberController');
const {
    validateRequest,
    validateParams,
    handleClanError
} = require('../utils/errorHandler');
const {
    inviteMemberSchema,
    updateMemberRoleSchema,
    clanIdSchema,
    userIdSchema
} = require('../validations/clanValidations');

// GET /members/:clanId - Get clan members
router.get('/:clanId',
    requireAuth,
    validateParams(clanIdSchema),
    getClanMembers
);

// POST /members/invite - Invite a member
router.post('/invite',
    requireAuth,
    validateRequest(inviteMemberSchema),
    inviteMember
);

// POST /members/invitations/:invitationId/accept - Accept invitation
router.post('/invitations/:invitationId/accept',
    requireAuth,
    validateParams({ invitationId: Joi.string().required() }),
    acceptInvitation
);

// DELETE /members/:clanId/members/:userId - Remove member
router.delete('/:clanId/members/:userId',
    requireAuth,
    validateParams({ ...clanIdSchema, ...userIdSchema }),
    removeMember
);

// PUT /members/:clanId/members/:userId/role - Update member role
router.put('/:clanId/members/:userId/role',
    requireAuth,
    validateParams({ ...clanIdSchema, ...userIdSchema }),
    validateRequest(updateMemberRoleSchema),
    updateMemberRole
);

// POST /members/:clanId/leave - Leave clan
router.post('/:clanId/leave',
    requireAuth,
    validateParams(clanIdSchema),
    leaveClan
);

// Error handling middleware
router.use(handleClanError);

module.exports = router; 