/**
 * Clan routes - All clan-level operations
 */

const express = require('express');
const { ClanController } = require('../controllers/clan.controller');
const { requireClanOwnership } = require('../middleware/auth');
const {
    validateClanCreation,
    validateClanUpdate,
    validateClanId,
    validateClanQuery
} = require('../middleware/validation');

const router = express.Router();
const clanController = new ClanController();

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'clan-service', timestamp: new Date().toISOString() });
});

// === PUBLIC ROUTES ===
// Public routes with query validation
router.get('/', validateClanQuery, clanController.getClans.bind(clanController));
router.get('/feed', validateClanQuery, clanController.getClanFeed.bind(clanController));
router.get('/featured', clanController.getFeaturedClans.bind(clanController));

// === PROTECTED ROUTES ===
// User-specific clan operations (API Gateway handles auth)
router.get('/my', clanController.getUserClans.bind(clanController));
router.post('/', validateClanCreation, clanController.createClan.bind(clanController));

// === CLAN MANAGEMENT ROUTES ===
// Clan CRUD operations (requires ownership)
router.put('/:clanId', validateClanId, validateClanUpdate, requireClanOwnership, clanController.updateClan.bind(clanController));
router.delete('/:clanId', validateClanId, requireClanOwnership, clanController.deleteClan.bind(clanController));

// Get specific clan details
router.get('/:clanId', validateClanId, clanController.getClan.bind(clanController));

// === JOIN REQUEST MANAGEMENT ===
// Get pending join requests (clan head/admin only)
router.get('/:clanId/pending-requests', validateClanId, clanController.getPendingRequests.bind(clanController));

// Alias for frontend compatibility
router.get('/:clanId/join-requests', validateClanId, clanController.getPendingRequests.bind(clanController));

// Approve join request (clan head/admin only)
router.post('/:clanId/join-requests/:userId/approve', validateClanId, clanController.approveRequest.bind(clanController));

// Reject join request (clan head/admin only)
router.post('/:clanId/join-requests/:userId/reject', validateClanId, clanController.rejectRequest.bind(clanController));

// === SYSTEM ROUTES ===
// Reputation update (called by reputation service)
router.post('/:clanId/update-reputation', validateClanId, clanController.updateReputation.bind(clanController));

module.exports = router;
