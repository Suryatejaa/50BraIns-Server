const express = require('express');
const WorkHistoryController = require('../controllers/workHistory.controller');

const router = express.Router();

/**
 * @route GET /api/work-history/user/:userId
 * @desc Get user's work history with filtering and pagination
 * @access Public (for now - add auth middleware as needed)
 */
router.get('/user/:userId', WorkHistoryController.getUserWorkHistory);

/**
 * @route GET /api/work-history/user/:userId/summary
 * @desc Get user's work summary with reputation data
 * @access Public (for now - add auth middleware as needed)
 */
router.get('/user/:userId/summary', WorkHistoryController.getUserWorkSummary);

/**
 * @route GET /api/work-history/user/:userId/skills
 * @desc Get user's skill proficiencies
 * @access Public (for now - add auth middleware as needed)
 */
router.get('/user/:userId/skills', WorkHistoryController.getUserSkills);

/**
 * @route GET /api/work-history/user/:userId/achievements
 * @desc Get user's achievements
 * @access Public (for now - add auth middleware as needed)
 */
router.get('/user/:userId/achievements', WorkHistoryController.getUserAchievements);

/**
 * @route GET /api/work-history/user/:userId/statistics
 * @desc Get user's work statistics for analytics
 * @access Public (for now - add auth middleware as needed)
 */
router.get('/user/:userId/statistics', WorkHistoryController.getWorkStatistics);

/**
 * @route GET /api/work-history/record/:workRecordId
 * @desc Get detailed work record
 * @access Public (for now - add auth middleware as needed)
 */
router.get('/record/:workRecordId', WorkHistoryController.getWorkRecord);

/**
 * @route PUT /api/work-history/record/:workRecordId/verify
 * @desc Update work record verification status
 * @access Protected (admin/moderator only)
 */
router.put('/record/:workRecordId/verify', WorkHistoryController.updateWorkVerification);

/**
 * @route POST /api/work-history/work-records
 * @desc Create work record from external service (e.g., gig service)
 * @access Protected (service-to-service communication)
 */
router.post('/work-records', WorkHistoryController.createWorkRecord);

module.exports = router;
