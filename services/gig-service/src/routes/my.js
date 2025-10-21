const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gigController');
const { requireAuth, asyncHandler } = require('../middleware');

// GET /my-posted-gigs - Get user's posted gigs
router.get('/posted', requireAuth, asyncHandler(gigController.getMyPostedGigs));

//Get /my/submissions - Get user's submissions
router.get('/submissions', requireAuth, asyncHandler(gigController.getMySubmissions));

// GET /my-applications - Get user's applications
router.get('/applications', requireAuth, asyncHandler(gigController.getMyApplications));
router.get('/:gigId/applications', requireAuth, asyncHandler(gigController.getMyApplicationToGig));

module.exports = router;
