const authService = require('../services/auth.service');
const logger = require('../utils/logger.utils');
const { ValidationError, AuthError } = require('../utils/errors.utils');

class OTPController {
    /**
     * Verify registration OTP
     */
    async verifyRegistrationOTP(req, res) {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and OTP are required'
                });
            }

            const result = await authService.verifyRegistrationOTP(email, otp);

            // Set HTTP-only cookies for tokens
            const isProduction = process.env.NODE_ENV === 'production';

            res.cookie('accessToken', result.tokens.accessToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'none' : 'lax',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'none' : 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.status(200).json({
                success: true,
                message: result.message,
                user: result.user,
                tokens: result.tokens
            });
        } catch (error) {
            logger.error('Error in verify registration OTP:', error);
            res.status(error instanceof ValidationError || error instanceof AuthError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Initiate OTP login
     */
    async initiateOTPLogin(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            const result = await authService.initiateOTPLogin(email);

            res.status(200).json({
                success: true,
                message: result.message,
                email: result.email,
                otpSent: result.otpSent
            });
        } catch (error) {
            logger.error('Error in initiate OTP login:', error);
            res.status(error instanceof ValidationError || error instanceof AuthError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Complete OTP login
     */
    async completeOTPLogin(req, res) {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and OTP are required'
                });
            }

            const result = await authService.completeOTPLogin(email, otp);

            // Set HTTP-only cookies for tokens
            const isProduction = process.env.NODE_ENV === 'production';

            res.cookie('accessToken', result.tokens.accessToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'none' : 'lax',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', result.tokens.refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'none' : 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.status(200).json({
                success: true,
                message: 'Login successful',
                user: result.user,
                tokens: result.tokens
            });
        } catch (error) {
            logger.error('Error in complete OTP login:', error);
            res.status(error instanceof ValidationError || error instanceof AuthError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Request password reset OTP
     */
    async requestPasswordReset(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            const result = await authService.requestPasswordReset(email);

            res.status(200).json({
                success: result.success,
                message: result.message,
                otpSent: result.otpSent
            });
        } catch (error) {
            logger.error('Error in request password reset:', error);
            res.status(error instanceof ValidationError || error instanceof AuthError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Reset password with OTP
     */
    async resetPassword(req, res) {
        try {
            const { email, otp, newPassword, confirmPassword } = req.body;

            if (!email || !otp || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Email, OTP, and new password are required'
                });
            }

            // If confirmPassword is provided, validate it matches newPassword
            if (confirmPassword && newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Password and confirm password do not match'
                });
            }

            const result = await authService.resetPassword(email, otp, newPassword);

            res.status(200).json({
                success: result.success,
                message: result.message
            });
        } catch (error) {
            logger.error('Error in reset password:', error);
            res.status(error instanceof ValidationError || error instanceof AuthError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Initiate password change
     */
    async initiatePasswordChange(req, res) {
        try {
            const { currentPassword } = req.body;

            // Extract userid from authentication middleware
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required. Please login and provide a valid access token.'
                });
            }

            const userId = req.user.userId || req.user.id;

            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is required'
                });
            }

            const result = await authService.initiatePasswordChange(userId, currentPassword);

            res.status(200).json({
                success: result.success,
                message: result.message,
                otpSent: result.otpSent
            });
        } catch (error) {
            logger.error('Error in initiate password change:', error);
            res.status(error instanceof ValidationError || error instanceof AuthError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Complete password change with OTP
     */
    async completePasswordChange(req, res) {
        try {
            const { otp, newPassword, confirmPassword } = req.body;

            // Debug: Check authentication
            console.log('🔍 Auth Debug:', {
                hasUser: !!req.user,
                userKeys: req.user ? Object.keys(req.user) : 'No user object',
                userId: req.user?.userId,
                authHeader: req.headers.authorization ? 'Present' : 'Missing'
            });

            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required. Please login and provide a valid access token.'
                });
            }

            const userId = req.user.id;

            if (!otp || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'OTP and new password are required'
                });
            }

            // If confirmPassword is provided, validate it matches newPassword
            if (confirmPassword && newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Password and confirm password do not match'
                });
            }

            console.log('UserId in completePasswordChange:', userId);

            const result = await authService.completePasswordChange(userId, otp, newPassword);

            res.status(200).json({
                success: result.success,
                message: result.message
            });
        } catch (error) {
            logger.error('Error in complete password change:', error);
            res.status(error instanceof ValidationError || error instanceof AuthError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Send email verification OTP
     */
    async sendEmailVerificationOTP(req, res) {
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required. Please login and provide a valid access token.'
                });
            }

            const userId = req.user.userId || req.user.id;

            const result = await authService.sendEmailVerificationOTP(userId);

            res.status(200).json({
                success: result.success,
                message: result.message,
                otpSent: result.otpSent
            });
        } catch (error) {
            logger.error('Error in send email verification OTP:', error);
            res.status(error instanceof ValidationError || error instanceof AuthError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Verify email with OTP
     */
    async verifyEmailOTP(req, res) {
        try {
            const { otp } = req.body;

            if (!req.user ||  !req.user.id) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required. Please login and provide a valid access token.'
                });
            }

            const userId = req.user.userId || req.user.id;

            if (!otp) {
                return res.status(400).json({
                    success: false,
                    message: 'OTP is required'
                });
            }

            const result = await authService.verifyEmail(userId, otp);

            res.status(200).json({
                success: result.success,
                message: result.message
            });
        } catch (error) {
            logger.error('Error in verify email OTP:', error);
            res.status(error instanceof ValidationError || error instanceof AuthError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new OTPController();