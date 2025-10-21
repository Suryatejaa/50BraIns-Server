const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { ValidationError } = require('../utils/errorHandler');

// Middleware for parameter validation
const validateUserId = (req, res, next) => {
    const { userId } = req.params;
    if (!userId || userId.length < 10) {
        throw new ValidationError('Valid userId is required');
    }
    next();
};

const validateNotificationId = (req, res, next) => {
    const { id } = req.params;
    if (!id || id.length < 10) {
        throw new ValidationError('Valid notification ID is required');
    }
    next();
};

// Optional authentication middleware (can be extracted from headers)
const extractUserContext = (req, res, next) => {
    // Extract user info from headers (set by API Gateway)
    req.user = {
        id: req.headers['x-user-id'],
        email: req.headers['x-user-email'],
        roles: req.headers['x-user-roles']?.split(',') || []
    };
    next();
};

router.get('/', (req, res) => {
    res.json({
        service: 'Notification Service',
        version: '1.0.0',
        description: 'The heartbeat of user engagement for 50BraIns platform',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            notifications: '/notifications',
            admin: '/admin',
            docs: '/api-docs'
        }
    });
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'notification-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});
// === USER NOTIFICATION ROUTES ===

/**
 * GET /notifications/:userId
 * Get all notifications for a user with pagination and filtering
 */
router.get('/:userId',
    validateUserId,
    extractUserContext,
    NotificationController.getUserNotifications
);

/**
 * GET /notifications/unread/:userId
 * Get only unread notifications for a user
 */
router.get('/unread/:userId',
    validateUserId,
    extractUserContext,
    NotificationController.getUnreadNotifications
);

/**
 * GET /notifications/count/:userId
 * Get notification counts (total, unread) for a user
 */
router.get('/count/:userId',
    validateUserId,
    extractUserContext,
    NotificationController.getNotificationCounts
);

/**
 * PATCH /notifications/mark-read/:id
 * Mark a specific notification as read
 */
router.patch('/mark-read/:id',
    validateNotificationId,
    extractUserContext,
    NotificationController.markAsRead
);

/**
 * PATCH /notifications/mark-all-read/:userId
 * Mark all notifications as read for a user
 */
router.patch('/mark-all-read/:userId',
    validateUserId,
    extractUserContext,
    NotificationController.markAllAsRead
);

/**
 * DELETE /notifications/:id
 * Delete a specific notification
 */
router.delete('/:id',
    validateNotificationId,
    extractUserContext,
    NotificationController.deleteNotification
);

/**
 * DELETE /notifications/clear/:userId
 * Clear all notifications for a user (soft delete or actual delete)
 */
router.delete('/clear/:userId',
    validateUserId,
    extractUserContext,
    NotificationController.clearAllNotifications
);

// === INTERNAL/ADMIN ROUTES ===

/**
 * POST /notifications
 * Send a notification (internal use by other services)
 */
router.post('/',
    extractUserContext,
    NotificationController.sendNotification
);

/**
 * POST /notifications/bulk
 * Send bulk notifications
 */
router.post('/bulk',
    extractUserContext,
    NotificationController.sendBulkNotifications
);

/**
 * GET /notifications/preview/:templateName
 * Preview an email template with sample data
 */
router.get('/preview/:templateName',
    NotificationController.previewEmailTemplate
);

// === NOTIFICATION PREFERENCES ===

/**
 * GET /notifications/preferences/:userId
 * Get user notification preferences
 */
router.get('/preferences/:userId',
    validateUserId,
    extractUserContext,
    NotificationController.getUserPreferences
);

/**
 * PUT /notifications/preferences/:userId
 * Update user notification preferences
 */
router.put('/preferences/:userId',
    validateUserId,
    extractUserContext,
    NotificationController.updateUserPreferences
);

// === ANALYTICS & REPORTING ===

/**
 * GET /notifications/analytics/:userId
 * Get notification analytics for a user
 */
router.get('/analytics/:userId',
    validateUserId,
    extractUserContext,
    NotificationController.getUserAnalytics
);

module.exports = router;
