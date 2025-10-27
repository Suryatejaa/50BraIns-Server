const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gigController');
const { requireAuth, asyncHandler } = require('../middleware');
const applicationController = require('../controllers/application.controller');

// Application routes
// GET /applications/received - Get all applications received for user's gigs
router.get('/received', requireAuth, asyncHandler(applicationController.getReceivedApplications));

// POST /applications/:id/approve - Approve a specific application
router.post('/:id/approve', requireAuth, asyncHandler(applicationController.approveApplication));

// POST /applications/:id/reject - Reject a specific application
router.post('/:id/reject', requireAuth, asyncHandler(applicationController.rejectApplication));

module.exports = router;
