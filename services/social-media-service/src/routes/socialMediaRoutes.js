const express = require('express');
const router = express.Router();
const socialMediaController = require('../controllers/socialMediaController');

// Link a social media account
router.post('/link', socialMediaController.linkAccount);

// Get analytics summary for a user (MUST come before /:userId route)
router.get('/analytics/:userId', socialMediaController.getAnalytics);

// Get platform statistics (for admin/monitoring)
router.get('/stats/platform', socialMediaController.getPlatformStats);

// Manually refresh stats for a platform/user
router.put('/sync/:platform/:userId', socialMediaController.syncAccount);

// Remove a linked account
router.delete('/:accountId', socialMediaController.removeAccount);

// Get all linked accounts for a user (MUST come last due to catch-all nature)
router.get('/:userId', socialMediaController.getLinkedAccounts);

module.exports = router;
