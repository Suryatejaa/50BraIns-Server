const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gigController');
const { requireAuth, asyncHandler } = require('../middleware');

// GET /crew/bids - Get user's bids with filtering and sorting
router.get('/bids', requireAuth, asyncHandler(gigController.getCrewBids));

// GET /crew/bids/stats - Get user's bid statistics
router.get('/bids/stats', requireAuth, asyncHandler(gigController.getCrewBidStats));

// PATCH /crew/bids/:id/withdraw - Withdraw a bid
router.patch('/bids/:id/withdraw', requireAuth, asyncHandler(gigController.withdrawCrewBid));

// GET /crew/bids/:id - Get specific bid details
router.get('/bids/:id', requireAuth, asyncHandler(gigController.getCrewBidDetails));

// PUT /crew/bids/:id - Update a bid
router.put('/bids/:id', requireAuth, asyncHandler(gigController.updateCrewBid));

module.exports = router; 