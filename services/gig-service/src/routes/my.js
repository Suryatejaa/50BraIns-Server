const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gigController');
const applicationController = require('../controllers/application.controller');
const gig_controller = require('../controllers/gig.controller');
const { requireAuth, asyncHandler } = require('../middleware');


// GET /my-posted-gigs - Get user's posted gigs
router.get('/posted', requireAuth, asyncHandler(gig_controller.getMyPostedGigs));

//Get /my/submissions - Get user's submissions
router.get('/submissions', requireAuth, asyncHandler(gigController.getMySubmissions));
router.get('/:gigId/applications', requireAuth, asyncHandler(gigController.getMyApplicationToGig));

// GET /my-applications - Get user's applications
router.get('/applications', requireAuth, asyncHandler(applicationController.getMyApplications));

module.exports = router;
