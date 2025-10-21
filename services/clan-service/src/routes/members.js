/**
 * Member routes for clan membership operations
 */

const express = require('express');
const { ClanMemberController } = require('../controllers/clanMember.controller');
const { validateClanId } = require('../middleware/validation');

const router = express.Router();
const memberController = new ClanMemberController();

// Get clan members
router.get('/:clanId', validateClanId, memberController.getClanMembers.bind(memberController));

// Request to join a clan (creates join request - requires approval)
router.post('/:clanId/join-requests', validateClanId, memberController.requestJoin.bind(memberController));

// Directly join a clan (for public clans or immediate approval)
router.post('/:clanId/join', validateClanId, memberController.joinClan.bind(memberController));

// Leave a clan
router.post('/:clanId/leave', validateClanId, memberController.leaveClan.bind(memberController));

// Update member role (clan owner/admin only)
router.put('/:clanId/:userId/role', validateClanId, memberController.updateMemberRole.bind(memberController));

// Remove member from clan (clan owner/admin only)
router.delete('/:clanId/:userId', validateClanId, memberController.removeMember.bind(memberController));

// Add admin to clan (clan head only)
router.post('/:clanId/:userId/admin', validateClanId, memberController.addAdmin.bind(memberController));

// Remove admin from clan (clan head only)
router.delete('/:clanId/:userId/admin', validateClanId, memberController.removeAdmin.bind(memberController));

// Transfer clan ownership (clan head only)
router.post('/:clanId/transfer-ownership', validateClanId, memberController.transferOwnership.bind(memberController));

module.exports = router;
