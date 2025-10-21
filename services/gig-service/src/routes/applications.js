const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gigController');
const { requireAuth, asyncHandler } = require('../middleware');

// Application routes
// GET /applications/received - Get all applications received for user's gigs
router.get('/received', requireAuth, asyncHandler(gigController.getReceivedApplications));

// POST /applications/:id/approve - Approve a specific application
router.post('/:id/approve', requireAuth, asyncHandler(gigController.approveApplication));

// POST /applications/:id/reject - Reject a specific application
router.post('/:id/reject', requireAuth, asyncHandler(gigController.rejectApplication));

module.exports = router;
