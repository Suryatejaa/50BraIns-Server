const express = require('express');
const feedController = require('../controllers/feed.controller');

const router = express.Router();

/**
 * Feed routes for user listings with sorting and filtering
 */

// GET /feed/users - Get users feed with comprehensive sorting and filtering
router.get('/users', feedController.getUsersFeed);

// GET /feed/top-users - Get top users by various criteria
router.get('/top-users', feedController.getTopUsers);

// GET /feed/stats - Get user statistics (admin only)
router.get('/stats', feedController.getUserStats);

module.exports = router;
