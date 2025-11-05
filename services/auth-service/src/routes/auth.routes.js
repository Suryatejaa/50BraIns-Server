const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth.middleware');
const { rateLimiter } = require('../middleware/security.middleware');
const authController = require('../controllers/auth.controller');
const otpController = require('../controllers/otp.controller');
const simpleController = require('../controllers/simple.controller');
const adminController = require('../controllers/admin.controller');

// Test route to debug socket hang up
router.post('/simple-register', simpleController.simpleRegister);

// Public routes with rate limiting
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// OTP-based authentication routes
router.post('/verify-registration-otp', otpController.verifyRegistrationOTP);
router.post('/otp-login/initiate', otpController.initiateOTPLogin);
router.post('/otp-login/complete', otpController.completeOTPLogin);

// Password reset with OTP
router.post('/forgot-password', otpController.requestPasswordReset);
router.post('/reset-password', otpController.resetPassword);

// Legacy routes (kept for backward compatibility)
router.get('/verify-email/:token', authController.verifyEmail);

// Authenticated routes
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

// Password change with OTP (authenticated)
router.post('/change-password/initiate', authenticate, otpController.initiatePasswordChange);
router.post('/change-password/complete', authenticate, otpController.completePasswordChange);

// Email verification with OTP (authenticated)
router.post('/email-verification/send', authenticate, otpController.sendEmailVerificationOTP);
router.post('/email-verification/verify', authenticate, otpController.verifyEmailOTP);

// Legacy password change route (kept for backward compatibility)
router.post('/change-password', authenticate, authController.changePassword);

// Profile update routes (authenticated)
router.put('/update/username', authenticate, authController.updateUsername);
router.post('/update/email-initiate', authenticate, authController.initiateEmailUpdate);
router.post('/update/email-complete', authenticate, authController.completeEmailUpdate);

// 2FA routes (placeholder for future implementation)
router.post('/2fa/setup', authenticate, authController.setup2FA);
router.post('/2fa/verify', authenticate, authController.verify2FA);
router.post('/2fa/disable', authenticate, authController.disable2FA);

router.post('/deactivate-account', authenticate, authController.deactivateAccount);
router.post('/delete-account', authenticate, authController.deleteAccount);

// ========== ADMIN ROUTES ==========
// Admin User Management Routes
router.get('/admin/users', authenticate, requireAdmin, adminController.getAllUsers);
router.get('/admin/users/:userId', authenticate, requireAdmin, adminController.getUserById);
router.put('/admin/users/:userId/ban', authenticate, requireAdmin, adminController.banUser);
router.put('/admin/users/:userId/unban', authenticate, requireAdmin, adminController.unbanUser);
router.put('/admin/users/:userId/status', authenticate, requireAdmin, adminController.updateUserStatus);
router.put('/admin/users/:userId/roles', authenticate, requireSuperAdmin, adminController.updateUserRoles);
router.delete('/admin/users/:userId', authenticate, requireSuperAdmin, adminController.deleteUser);

// Admin Analytics Routes
router.get('/admin/analytics/users', authenticate, requireAdmin, adminController.getUserAnalytics);
router.get('/admin/logs', authenticate, requireAdmin, adminController.getAdminLogs);
router.get('/admin/system/stats', authenticate, requireAdmin, adminController.getSystemStats);

module.exports = router;
