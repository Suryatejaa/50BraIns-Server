const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gigController');
const applicationController = require('../controllers/application.controller');
const { requireAuth, asyncHandler } = require('../middleware');

// Submission routes
// POST /submissions/:id/review - Review a submission (approve/reject/request revision)
router.post('/:id/review', requireAuth, asyncHandler(applicationController.reviewSubmission));

module.exports = router;
