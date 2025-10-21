console.log('admin.routes.js: starting');
const express = require('express');
console.log('admin.routes.js: express loaded');
const adminController = require('../controllers/admin.controller');
console.log('admin.routes.js: admin.controller loaded');
const router = express.Router();
console.log('admin.routes.js: router created');
const { requireAuth, asyncHandler } = require('../middleware');


// User management routes
router.get('/users', requireAuth, asyncHandler(adminController.getUsers));
router.get('/users/:userId', requireAuth, asyncHandler(adminController.getUserById));
router.patch('/users/:userId/roles', requireAuth, asyncHandler(adminController.updateUserRoles));
router.patch('/users/:userId/status', requireAuth, asyncHandler(adminController.updateUserStatus));
router.post('/users/:userId/ban', requireAuth, asyncHandler(adminController.banUser));
router.post('/users/:userId/unban', requireAuth, asyncHandler(adminController.unbanUser));

// Delete user (Super Admin only)
router.delete('/users/:userId', requireAuth, asyncHandler(adminController.deleteUser));

// System monitoring and logs
router.get('/stats', requireAuth, asyncHandler(adminController.getStats));
router.get('/logs', requireAuth, asyncHandler(adminController.getActivityLogs));
router.get('/health', requireAuth, asyncHandler(adminController.getHealth));

// Dashboard routes
router.get('/dashboard/overview', requireAuth, asyncHandler(adminController.getDashboardOverview));
router.get('/dashboard/recent-users', requireAuth, asyncHandler(adminController.getRecentUsers));
router.get('/dashboard/active-sessions', requireAuth, asyncHandler(adminController.getActiveSessions));

console.log('admin.routes.js: exporting router');
module.exports = router;
