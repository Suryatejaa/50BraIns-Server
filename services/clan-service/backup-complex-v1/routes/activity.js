const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware');
const activityController = require('../controllers/activityController');

// POST /clan/:id/activity → Create new post
router.post('/clan/:id/activity', requireAuth, (req, res) => activityController.createActivity(req, res));

// GET /clan/:id/activity → Get paginated feed
router.get('/clan/:id/activity', requireAuth, (req, res) => activityController.getActivities(req, res));

// PATCH /clan/activity/:activityId → Edit post
router.patch('/clan/activity/:activityId', requireAuth, (req, res) => activityController.updateActivity(req, res));

// DELETE /clan/activity/:activityId → Delete post
router.delete('/clan/activity/:activityId', requireAuth, (req, res) => activityController.deleteActivity(req, res));

// PATCH /clan/activity/:activityId/pin → Pin/unpin post (owner only)
router.patch('/clan/activity/:activityId/pin', requireAuth, (req, res) => activityController.togglePin(req, res));

// POST /clan/activity/:activityId/vote → Vote in poll
router.post('/clan/activity/:activityId/vote', requireAuth, (req, res) => activityController.vote(req, res));

module.exports = router;


