/**
 * Member Routes
 * Handles clan member operations
 */

const express = require('express');
const router = express.Router();
const { requireAuth, suggestLimiter } = require('../middleware');
const {
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
    rejectJoinRequest
} = require('../controllers/memberController');

// Member endpoints
router.get('/:clanId', requireAuth, getClanMembers);
// onChange-friendly suggest and resolution with light outputs
router.get('/:clanId/member-suggest', requireAuth, suggestLimiter, suggestMembers);
router.post('/:clanId/resolve-members', requireAuth, resolveMembers);
router.post('/invite', requireAuth, inviteMember);
router.post('/invitations/:invitationId/accept', requireAuth, acceptInvitation);
router.delete('/:clanId/members/:userId', requireAuth, removeMember);
router.put('/:clanId/members/:userId/role', requireAuth, updateMemberRole);
router.post('/:clanId/members/:userId/transfer-ownership', requireAuth, transferOwnership);
router.post('/:clanId/leave', requireAuth, leaveClan);

// Join request endpoints
router.get('/:clanId/join-requests', requireAuth, getJoinRequests);
router.post('/:clanId/join-requests/:requestId/approve', requireAuth, approveJoinRequest);
router.post('/:clanId/join-requests/:requestId/reject', requireAuth, rejectJoinRequest);



module.exports = router;
