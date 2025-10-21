const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { rateLimiter } = require('../middleware/security.middleware');
const authController = require('../controllers/auth.controller');
const simpleController = require('../controllers/simple.controller');

// Test route to debug socket hang up
router.post('/simple-register', simpleController.simpleRegister);

// Public routes with rate limiting
router.post('/register', rateLimiter, authController.register);
router.post('/login', rateLimiter, authController.login);
router.post('/refresh', rateLimiter, authController.refresh);
router.post('/forgot-password', rateLimiter, authController.requestPasswordReset);
router.get('/verify-email/:token', authController.verifyEmail);

// Authenticated routes
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.post('/change-password', authenticate, authController.changePassword);

// 2FA routes (placeholder for future implementation)
router.post('/2fa/setup', authenticate, authController.setup2FA);
router.post('/2fa/verify', authenticate, authController.verify2FA);
router.post('/2fa/disable', authenticate, authController.disable2FA);

module.exports = router;
