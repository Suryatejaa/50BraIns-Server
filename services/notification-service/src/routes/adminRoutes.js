const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { ValidationError } = require('../utils/errorHandler');

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
    const userRoles = req.headers['x-user-roles']?.split(',') || [];

    if (!userRoles.includes('admin') && !userRoles.includes('super-admin')) {
        return res.status(403).json({
            success: false,
            error: 'Admin access required',
            timestamp: new Date().toISOString()
        });
    }

    req.user = {
        id: req.headers['x-user-id'],
        email: req.headers['x-user-email'],
        roles: userRoles
    };

    next();
};

// === NOTIFICATION MANAGEMENT ===

/**
 * GET /admin/notifications
 * Get all notifications with advanced filtering and pagination
 */
router.get('/notifications',
    requireAdmin,
    AdminController.getAllNotifications
);

/**
 * GET /admin/stats
 * Get comprehensive notification statistics
 */
router.get('/stats',
    requireAdmin,
    AdminController.getStatistics
);

/**
 * GET /admin/analytics
 * Get detailed analytics dashboard data
 */
router.get('/analytics',
    requireAdmin,
    AdminController.getAnalytics
);

/**
 * POST /admin/broadcast
 * Send broadcast notification to multiple users
 */
router.post('/broadcast',
    requireAdmin,
    AdminController.sendBroadcast
);

/**
 * POST /admin/system-announcement
 * Send system-wide announcement
 */
router.post('/system-announcement',
    requireAdmin,
    AdminController.sendSystemAnnouncement
);

// === TEMPLATE MANAGEMENT ===

/**
 * GET /admin/templates
 * Get all email templates
 */
router.get('/templates',
    requireAdmin,
    AdminController.getEmailTemplates
);

/**
 * POST /admin/templates
 * Create new email template
 */
router.post('/templates',
    requireAdmin,
    AdminController.createEmailTemplate
);

/**
 * PUT /admin/templates/:id
 * Update email template
 */
router.put('/templates/:id',
    requireAdmin,
    AdminController.updateEmailTemplate
);

/**
 * DELETE /admin/templates/:id
 * Delete email template
 */
router.delete('/templates/:id',
    requireAdmin,
    AdminController.deleteEmailTemplate
);

/**
 * POST /admin/templates/:id/test
 * Send test email using template
 */
router.post('/templates/:id/test',
    requireAdmin,
    AdminController.testEmailTemplate
);

// === USER MANAGEMENT ===

/**
 * GET /admin/users/:userId/notifications
 * Get all notifications for a specific user (admin view)
 */
router.get('/users/:userId/notifications',
    requireAdmin,
    AdminController.getUserNotificationsAdmin
);

/**
 * POST /admin/users/:userId/notification
 * Send notification to specific user
 */
router.post('/users/:userId/notification',
    requireAdmin,
    AdminController.sendNotificationToUser
);

/**
 * GET /admin/users/:userId/preferences
 * Get user notification preferences (admin view)
 */
router.get('/users/:userId/preferences',
    requireAdmin,
    AdminController.getUserPreferencesAdmin
);

/**
 * PUT /admin/users/:userId/preferences
 * Update user notification preferences (admin override)
 */
router.put('/users/:userId/preferences',
    requireAdmin,
    AdminController.updateUserPreferencesAdmin
);

// === SYSTEM MONITORING ===

/**
 * GET /admin/health-detailed
 * Get detailed system health information
 */
router.get('/health-detailed',
    requireAdmin,
    AdminController.getDetailedHealth
);

/**
 * GET /admin/queue-status
 * Get RabbitMQ queue status and metrics
 */
router.get('/queue-status',
    requireAdmin,
    AdminController.getQueueStatus
);

/**
 * GET /admin/email-stats
 * Get email delivery statistics
 */
router.get('/email-stats',
    requireAdmin,
    AdminController.getEmailStats
);

/**
 * POST /admin/retry-failed
 * Retry failed notifications
 */
router.post('/retry-failed',
    requireAdmin,
    AdminController.retryFailedNotifications
);

// === CONFIGURATION ===

/**
 * GET /admin/config
 * Get current service configuration
 */
router.get('/config',
    requireAdmin,
    AdminController.getServiceConfig
);

/**
 * PUT /admin/config
 * Update service configuration (limited settings)
 */
router.put('/config',
    requireAdmin,
    AdminController.updateServiceConfig
);

// === BULK OPERATIONS ===

/**
 * POST /admin/bulk-operations/cleanup
 * Cleanup old notifications based on criteria
 */
router.post('/bulk-operations/cleanup',
    requireAdmin,
    AdminController.bulkCleanupNotifications
);

/**
 * POST /admin/bulk-operations/export
 * Export notifications data
 */
router.post('/bulk-operations/export',
    requireAdmin,
    AdminController.exportNotifications
);

/**
 * GET /admin/reports/engagement
 * Get user engagement reports
 */
router.get('/reports/engagement',
    requireAdmin,
    AdminController.getEngagementReport
);

/**
 * GET /admin/reports/delivery
 * Get notification delivery reports
 */
router.get('/reports/delivery',
    requireAdmin,
    AdminController.getDeliveryReport
);

module.exports = router;
