const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger.utils');
const { AuthError, ValidationError, ConflictError } = require('../utils/errors.utils');
const { prisma } = require('../config/database');
const otpService = require('../utils/otp.utils');
const emailService = require('../utils/email.utils');
const {
    getFromCache,
    setToCache,
    deleteFromCache,
    deletePattern,
    isConnected,
    getClient
} = require('../config/redis');

class AuthService {
    constructor() {
        this.saltRounds = process.env.NODE_ENV === 'production' ? 12 : 8; // Reduced for development
        this.accessTokenExpiry = '15m';
        this.refreshTokenExpiry = '7d';
    }    /**
     * Register a new user with OTP verification
     */
    async register(userData) {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Register operation timed out after 30 seconds')), 30000);
        });

        const registerPromise = async () => {
            try {
                const { email, password, username: inputUsername, role, roles = [], instagramHandle, ...additionalFields } = userData;

                // Define valid roles
                const validRoles = ['USER', 'INFLUENCER', 'BRAND', 'CREW', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR'];

                // Validate provided roles
                const invalidRoles = roles.filter(role => !validRoles.includes(role));
                if (invalidRoles.length > 0) {
                    throw new ValidationError(`Invalid roles: ${invalidRoles.join(', ')}. Valid roles are: ${validRoles.join(', ')}`);
                }

                let finalRoles = [];
                if (role) {
                    finalRoles = [role]; // Single role
                } else if (Array.isArray(roles) && roles.length > 0) {
                    finalRoles = roles; // Multiple roles
                } else {
                    finalRoles = ['USER']; // Default
                }

                //If roles include crew or influencer then instagramHandle is required
                const sanitizedUserData = { ...userData };
                if (sanitizedUserData.password) sanitizedUserData.password = '[REDACTED]';
                console.log('Data from userData:', sanitizedUserData);
                if (finalRoles.includes('INFLUENCER') || finalRoles.includes('CREW')) {
                    if (!instagramHandle || instagramHandle.trim() === '') {
                        throw new ValidationError('Instagram handle is required when roles include INFLUENCER or CREW');
                    }
                }

                // Always ensure USER role is included
                if (!finalRoles.includes('USER')) {
                    finalRoles = ['USER', ...finalRoles];
                }
                logger.info('Starting register service', { email: email.toLowerCase(), roles: finalRoles });

                // Check if user already exists
                logger.info('Checking if user exists');
                const existingUser = await prisma.user.findUnique({
                    where: { email: email.toLowerCase() }
                });

                if (existingUser) {
                    logger.warn('User already exists', { email: email.toLowerCase() });
                    throw new ConflictError('User with this email already exists');
                }

                // Hash password
                logger.info('Hashing password');
                const hashedPassword = await bcrypt.hash(password, this.saltRounds);
                logger.info('Password hashed successfully');

                // Generate unique username if not provided
                let username = inputUsername;
                if (!username) {
                    // Use email prefix as base username
                    const baseUsername = email.split('@')[0].toLowerCase();
                    username = baseUsername;
                    let counter = 1;
                    const maxAttempts = 100;
                    while (counter <= maxAttempts) {
                        const existingUsername = await prisma.user.findUnique({ where: { username } });
                        if (!existingUsername) break;
                        username = `${baseUsername}${counter}`;
                        counter++;
                    }
                    if (counter > maxAttempts) {
                        throw new Error('Unable to generate unique username after maximum attempts');
                    }
                } else {
                    // Ensure username is unique
                    const existingUsername = await prisma.user.findUnique({ where: { username } });
                    if (existingUsername) {
                        throw new ConflictError('Username already exists');
                    }
                }

                logger.info('Creating user in database', { username, email: email.toLowerCase(), roles: finalRoles });

                // Prepare user data with all fields
                const createData = {
                    id: uuidv4(),
                    email: email.toLowerCase(),
                    username,
                    password: hashedPassword,
                    roles: finalRoles,
                    isActive: true,
                    status: 'PENDING_VERIFICATION', // Keep pending until OTP verification
                    emailVerified: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    ...(instagramHandle && instagramHandle.trim() !== '' && { instagramHandle: instagramHandle.trim() }),
                    ...additionalFields
                };

                // Create user
                const createdUser = await prisma.user.create({
                    data: createData,
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        roles: true,
                        isActive: true,
                        emailVerified: true,
                        createdAt: true
                    }
                });

                // Generate and send OTP for registration verification
                const otp = otpService.generateOTP();
                await otpService.storeOTP(createdUser.email, otp, 'REGISTER', createdUser.id);
                console.log('✅ OTP generated and stored for user registration:', createdUser.email, otp);

                // Send OTP email
                const emailResult = await emailService.sendOTPEmail(
                    createdUser.email,
                    otp,
                    'REGISTER',
                    {
                        userName: createdUser.username || 'User'
                    }
                );

                logger.info(`User creation completed successfully: ${createdUser.email}`, {
                    userId: createdUser.id,
                    roles: createdUser.roles,
                    hasAdditionalFields: Object.keys(additionalFields).length > 0,
                    otpSent: emailResult.success
                });

                // Publish user registration event to RabbitMQ for user-service sync
                try {
                    const rabbitmqService = require('../utils/rabbitmq');
                    await rabbitmqService.publishEvent('user.registered', {
                        id: createdUser.id,
                        email: createdUser.email,
                        username: createdUser.username,
                        roles: createdUser.roles,
                        instagramHandle: instagramHandle || null,
                        isActive: createdUser.isActive,
                        status: 'PENDING_VERIFICATION',
                        emailVerified: createdUser.emailVerified,
                        createdAt: createdUser.createdAt
                    });
                    logger.info('Published user.registered event to RabbitMQ', { userId: createdUser.id });
                } catch (mqError) {
                    logger.error('Failed to publish user.registered event to RabbitMQ', mqError);
                }

                return {
                    user: createdUser,
                    message: 'Registration successful! Please check your email for verification code.',
                    otpSent: emailResult.success,
                    nextStep: 'verify-registration-otp'
                };
            } catch (error) {
                logger.error('Error in register operation:', error);
                throw error;
            }
        };

        try {
            const result = await Promise.race([registerPromise(), timeoutPromise]);
            clearTimeout(timeoutId);
            return result;
        } catch (error) {
            clearTimeout(timeoutId);
            logger.error('Register service error:', error);
            throw error;
        }
    }

    /**
     * Authenticate user and return tokens
     */
    async login({ email, password }) {
        try {
            // Find user
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                include: {
                    refreshTokens: {
                        where: {
                            expiresAt: {
                                gt: new Date()
                            }
                        }
                    }
                }
            });

            if (!user) {
                throw new AuthError('Invalid credentials');
            }

            // Handle missing columns gracefully
            if (user.isActive === false) {
                //activate the account
                const updatedUser = await prisma.user.update({
                    where: { id: user.id },
                    data: { isActive: true }
                });
                logger.info(`User account activated: ${updatedUser.email}`);

                //publish account activation event to RabbitMQ
                const rabbitmqService = require('../utils/rabbitmq');
                await rabbitmqService.publishEvent('user.reactivated', { userId: updatedUser.id });
            }

            if (user.isBanned === true) {
                throw new AuthError('Account is banned');
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new AuthError('Invalid credentials');
            }

            // Generate tokens
            const tokens = await this.generateTokens(user);

            // Update last login
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
            });

            // Publish login event to RabbitMQ for notification service
            try {
                const rabbitmqService = require('../utils/rabbitmq');
                await rabbitmqService.publishEvent('user.login', {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    roles: user.roles,
                    loginAt: new Date().toISOString(),
                    loginMethod: 'password',
                    ipAddress: null, // Could be passed from controller if needed
                    userAgent: null   // Could be passed from controller if needed
                });
                logger.info('Published user.login event to RabbitMQ', { userId: user.id });
            } catch (mqError) {
                logger.error('Failed to publish user.login event to RabbitMQ', mqError);
            }

            logger.info(`User logged in: ${user.email}`);

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    roles: user.roles,
                    isActive: user.isActive,
                    emailVerified: user.emailVerified
                },
                tokens
            };
        } catch (error) {
            logger.error('Error in login service:', error);
            throw error;
        }
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        try {
            if (!refreshToken) {
                throw new AuthError('Refresh token is required');
            }

            // Verify refresh token
            let decoded;
            try {
                decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            } catch (error) {
                throw new AuthError('Invalid refresh token');
            }

            // Find refresh token in database
            const tokenRecord = await prisma.refreshToken.findUnique({
                where: { token: refreshToken },
                include: { user: true }
            });

            if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
                throw new AuthError('Invalid or expired refresh token');
            }

            if (!tokenRecord.user.isActive) {
                throw new AuthError('User account is deactivated');
            }

            // Generate new tokens
            const tokens = await this.generateTokens(tokenRecord.user);            // Delete old refresh token
            await prisma.refreshToken.delete({
                where: { id: tokenRecord.id }
            });

            logger.info(`Token refreshed for user: ${tokenRecord.user.email}`);

            return tokens;
        } catch (error) {
            logger.error('Error in refresh token service:', error);
            throw error;
        }
    }

    /**
     * Logout user and invalidate tokens
     */
    async logout(refreshToken, userId) {
        try {
            if (!refreshToken) {
                throw new ValidationError('Refresh token is required');
            }
            if (!userId) {
                throw new ValidationError('User ID is required for logout');
            }
            const result = await prisma.refreshToken.deleteMany({
                where: {
                    token: refreshToken,
                    userId
                }
            });
            if (result.count === 0) {
                throw new AuthError('Refresh token not found or already invalidated');
            }
            if (isConnected()) {
                const cacheKey = `user:${userId}`;
                await deleteFromCache(cacheKey);
            }
            logger.info(`User logged out: ${userId}`);
            return { success: true };
        } catch (error) {
            logger.error('Error in logout service:', error);
            console.error('DEBUG LOGOUT ERROR:', error.message, error.stack);
            throw error;
        }
    }

    async deactivateAccount(userId, password) {
        try {
            if (!userId) {
                throw new ValidationError('User ID is required for account deactivation');
            }
            if (!password) {
                throw new ValidationError('Password is required for account deactivation');
            }

            // Verify user credentials
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                throw new AuthError('User not found');
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new AuthError('Invalid password');
            }

            // Deactivate user account
            await prisma.user.update({
                where: { id: userId },
                data: { isActive: false }
            });

            //publish account deactivation event to RabbitMQ
            const rabbitmqService = require('../utils/rabbitmq');
            await rabbitmqService.publishEvent('user.deactivated', { userId });

            logger.info(`User account deactivated: ${user.email}`);
            return {
                success: true,
                message: 'User account deactivated successfully'
            };
        } catch (error) {
            logger.error('Error in deactivate account service:', error);
            throw error;
        }
    }

    async deleteAccount(userId, password) {
        try {
            if (!userId) {
                throw new ValidationError('User ID is required for account deletion');
            }
            if (!password) {
                throw new ValidationError('Password is required for account deletion');
            }

            // Verify user credentials
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                throw new AuthError('User not found');
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new AuthError('Invalid password');
            }

            // Delete user account
            await prisma.user.delete({
                where: { id: userId }
            });

            //publish account deletion event to RabbitMQ
            const rabbitmqService = require('../utils/rabbitmq');
            await rabbitmqService.publishEvent('user.deleted', { userId });

            logger.info(`User account deleted: ${user.email}`);
            return {
                success: true,
                message: 'User account deleted successfully'
            };
        } catch (error) {
            logger.error('Error in delete account service:', error);
            throw error;
        }
    }

    /**
     * Logout from all devices
     */
    async logoutAll(userId) {
        try {
            if (!userId) {
                throw new ValidationError('User ID is required for logout');
            }
            const result = await prisma.refreshToken.deleteMany({
                where: {
                    userId
                }
            });
            if (result.count === 0) {
                throw new AuthError('No active sessions found for user');
            }
            if (isConnected()) {
                await deleteFromCache(`user:${userId}`);
            }
            logger.info(`User logged out from all devices: ${userId}`);
            return { success: true };
        } catch (error) {
            logger.error('Error in logout all service:', error);
            console.error('DEBUG LOGOUTALL ERROR:', error.message, error.stack);
            throw error;
        }
    }

    /**
     * Generate access and refresh tokens
     */
    async generateTokens(user) {
        try {
            const payload = {
                userId: user.id,
                email: user.email,
                roles: user.roles, // <-- use roles array
                iat: Math.floor(Date.now() / 1000),
                jti: uuidv4() // JWT ID for uniqueness
            };

            console.log(`JWT Secret: ${process.env.JWT_SECRET}`);
            // Generate access token
            const accessToken = jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: this.accessTokenExpiry }
            );

            // Generate refresh token
            const refreshToken = jwt.sign(
                { userId: user.id, tokenId: uuidv4() },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: this.refreshTokenExpiry }
            );

            // Store refresh token in database
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

            await prisma.refreshToken.create({
                data: {
                    id: uuidv4(), token: refreshToken,
                    userId: user.id,
                    expiresAt,
                    createdAt: new Date()
                }
            });            // Cache user session in Redis
            if (isConnected()) {
                const cacheKey = `user_session:${user.id}`;
                const sessionData = {
                    userId: user.id,
                    email: user.email,
                    roles: user.roles, // <-- use roles array
                    lastActivity: new Date().toISOString()
                };
                await setToCache(cacheKey, sessionData, 900); // 15 minutes
            }

            return {
                accessToken,
                refreshToken,
                expiresIn: 15 * 60 // 15 minutes in seconds
            };
        } catch (error) {
            logger.error('Error generating tokens:', error);
            throw error;
        }
    }

    /**
     * Verify user's email (updated to use OTP flow)
     */
    async verifyEmail(token) {
        try {
            // This method signature is kept for backward compatibility
            // The actual verification now happens through the OTP flow
            logger.info('Email verification requested via old method - redirecting to OTP flow');
            return {
                success: false,
                message: 'Please use the OTP-based email verification flow',
                redirectTo: 'verify-email-otp'
            };
        } catch (error) {
            logger.error('Error in email verification:', error);
            throw error;
        }
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email) {
        try {
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            if (!user) {
                // Don't reveal if email exists
                return { success: true, message: 'If the email exists, a reset link has been sent' };
            }

            // In a real implementation, you'd generate a reset token and send email
            logger.info(`Password reset requested for: ${email}`);
            return { success: true, message: 'If the email exists, a reset link has been sent' };
        } catch (error) {
            logger.error('Error in password reset request:', error);
            throw error;
        }
    }

    /**
     * Reset password (updated to use OTP flow)
     */
    async resetPassword(token, newPassword) {
        try {
            // This method signature is kept for backward compatibility
            // The actual reset now happens through the OTP flow
            logger.info('Password reset requested via old method - redirecting to OTP flow');
            return {
                success: false,
                message: 'Please use the OTP-based password reset flow',
                redirectTo: 'forgot-password'
            };
        } catch (error) {
            logger.error('Error in password reset:', error);
            throw error;
        }
    }

    /**
     * Change password using new OTP flow
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Authenticated password change using current password (no OTP)
            if (!userId) {
                throw new AuthError('User ID is required');
            }

            if (!currentPassword || !newPassword) {
                throw new ValidationError('Current password and new password are required');
            }

            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
                throw new AuthError('User not found');
            }

            // Ensure user has a password (not social-only)
            if (!user.password) {
                throw new ValidationError('Password change not allowed for social or passwordless accounts');
            }

            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                throw new ValidationError('Current password is incorrect');
            }

            // Hash new password and update
            const hashed = await bcrypt.hash(newPassword, this.saltRounds);

            await prisma.user.update({
                where: { id: userId },
                data: {
                    password: hashed,
                    updatedAt: new Date()
                }
            });

            // Optionally publish an event for password change (non-sensitive)
            try {
                const rabbitmqService = require('../utils/rabbitmq');
                await rabbitmqService.publishEvent('user.password_changed', {
                    userId: user.id,
                    email: user.email,
                    changedAt: new Date().toISOString()
                });
            } catch (mqError) {
                logger.warn('Failed to publish password_changed event to RabbitMQ', mqError);
            }

            logger.info(`Password changed for user: ${userId}`);

            return {
                success: true,
                message: 'Password changed successfully'
            };
        } catch (error) {
            logger.error('Error in change password:', error);
            console.error('DEBUG CHANGEPASSWORD ERROR:', error.message, error.stack);
            throw error;
        }
    }

    /**
     * Expose user to user-service
     * This method is used to get user data without sensitive information
     */
    async exposeUserData(userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                    // Exclude sensitive fields
                    password: false,
                }
            });
            return user;
        } catch (error) {
            logger.error('Error in expose user data:', error);
            throw error;
        }
    }

    /**
     * Verify registration OTP and activate account
     */
    async verifyRegistrationOTP(email, otp) {
        try {
            // Verify OTP
            const verification = await otpService.verifyOTP(email, otp, 'REGISTER');

            if (!verification.success) {
                throw new AuthError('Invalid or expired OTP');
            }

            // Update user status to ACTIVE and mark email as verified
            const user = await prisma.user.update({
                where: { email: email.toLowerCase() },
                data: {
                    status: 'ACTIVE',
                    emailVerified: true,
                    emailVerifiedAt: new Date()
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    roles: true,
                    isActive: true,
                    emailVerified: true
                }
            });

            // Generate tokens for immediate login
            const tokens = await this.generateTokens(user);

            // Publish user verification event
            try {
                const rabbitmqService = require('../utils/rabbitmq');
                await rabbitmqService.publishEvent('user.verified', {
                    userId: user.id,
                    email: user.email,
                    verifiedAt: new Date().toISOString()
                });

                // Also publish email verification event for consistency
                await rabbitmqService.publishEvent('user.email_verified', {
                    userId: user.id,
                    email: user.email,
                    verifiedAt: new Date().toISOString()
                });
            } catch (mqError) {
                logger.error('Failed to publish user verification events to RabbitMQ', mqError);
            }

            logger.info(`User email verified: ${user.email}`);

            return {
                user,
                tokens,
                message: 'Email verified successfully! You are now logged in.'
            };
        } catch (error) {
            logger.error('Error in verify registration OTP:', error);
            throw error;
        }
    }

    /**
     * Initiate OTP-based login
     */
    async initiateOTPLogin(email) {
        try {
            // Find user
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            if (!user) {
                throw new AuthError('User not found');
            }

            if (!user.isActive) {
                throw new AuthError('Account is deactivated');
            }

            if (user.isBanned) {
                throw new AuthError('Account is banned');
            }

            // Check if user can request OTP
            const canRequest = await otpService.canRequestOTP(email, 'LOGIN');
            if (!canRequest.canRequest) {
                throw new ValidationError(`Too many OTP requests. Please wait ${canRequest.cooldownMinutes} minutes.`);
            }

            // Generate and send OTP
            const otp = otpService.generateOTP();
            await otpService.storeOTP(user.email, otp, 'LOGIN', user.id);

            // Send OTP email
            const emailResult = await emailService.sendOTPEmail(
                user.email,
                otp,
                'LOGIN',
                {
                    userName: user.username || user.firstName || 'User'
                }
            );

            logger.info(`OTP login initiated for: ${user.email}`);

            return {
                message: 'OTP sent to your email address',
                otpSent: emailResult.success,
                email: user.email
            };
        } catch (error) {
            logger.error('Error in initiate OTP login:', error);
            throw error;
        }
    }

    /**
     * Complete OTP-based login
     */
    async completeOTPLogin(email, otp) {
        try {
            // Verify OTP
            const verification = await otpService.verifyOTP(email, otp, 'LOGIN');

            if (!verification.success) {
                throw new AuthError('Invalid or expired OTP');
            }

            // Get user
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                include: {
                    refreshTokens: {
                        where: {
                            expiresAt: {
                                gt: new Date()
                            }
                        }
                    }
                }
            });

            if (!user) {
                throw new AuthError('User not found');
            }

            // Generate tokens
            const tokens = await this.generateTokens(user);

            // Update last login
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
            });

            // Publish login event
            try {
                const rabbitmqService = require('../utils/rabbitmq');
                await rabbitmqService.publishEvent('user.login', {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    roles: user.roles,
                    loginAt: new Date().toISOString(),
                    loginMethod: 'otp'
                });
            } catch (mqError) {
                logger.error('Failed to publish user.login event to RabbitMQ', mqError);
            }

            logger.info(`User logged in via OTP: ${user.email}`);

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    roles: user.roles,
                    isActive: user.isActive,
                    emailVerified: user.emailVerified
                },
                tokens
            };
        } catch (error) {
            logger.error('Error in complete OTP login:', error);
            throw error;
        }
    }

    /**
     * Request password reset OTP
     */
    async requestPasswordReset(email) {
        try {
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            if (!user) {
                // Don't reveal if email exists for security
                return {
                    success: true,
                    message: 'If the email exists, a reset code has been sent'
                };
            }

            // Check if user can request OTP
            const canRequest = await otpService.canRequestOTP(email, 'FORGOT_PASSWORD');
            if (!canRequest.canRequest) {
                throw new ValidationError(`Too many reset requests. Please wait ${canRequest.cooldownMinutes} minutes.`);
            }

            // Generate and send OTP
            const otp = otpService.generateOTP();
            await otpService.storeOTP(user.email, otp, 'FORGOT_PASSWORD', user.id);

            // Send OTP email
            const emailResult = await emailService.sendOTPEmail(
                user.email,
                otp,
                'FORGOT_PASSWORD',
                {
                    userName: user.username || user.firstName || 'User'
                }
            );

            logger.info(`Password reset OTP sent for: ${email}`);

            return {
                success: true,
                message: 'If the email exists, a reset code has been sent',
                otpSent: emailResult.success
            };
        } catch (error) {
            logger.error('Error in password reset request:', error);
            throw error;
        }
    }

    /**
     * Reset password with OTP
     */
    async resetPassword(email, otp, newPassword) {
        try {
            // Validate new password strength
            const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordPattern.test(newPassword)) {
                throw new ValidationError('New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
            }

            // Verify OTP
            const verification = await otpService.verifyOTP(email, otp, 'FORGOT_PASSWORD');

            if (!verification.success) {
                throw new AuthError('Invalid or expired OTP');
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);

            // Update password
            await prisma.user.update({
                where: { email: email.toLowerCase() },
                data: {
                    password: hashedPassword,
                    updatedAt: new Date()
                }
            });

            // Invalidate all refresh tokens (force re-login)
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            if (user) {
                await this.logoutAll(user.id);
            }

            logger.info(`Password reset completed for: ${email}`);

            return {
                success: true,
                message: 'Password reset successfully. Please login with your new password.'
            };
        } catch (error) {
            logger.error('Error in password reset:', error);
            throw error;
        }
    }

    /**
     * Initiate password change with OTP
     */
    async initiatePasswordChange(userId, currentPassword) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw new AuthError('User not found');
            }

            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                throw new AuthError('Current password is incorrect');
            }

            // Check if user can request OTP
            const canRequest = await otpService.canRequestOTP(user.email, 'CHANGE_PASSWORD');
            if (!canRequest.canRequest) {
                throw new ValidationError(`Too many change password requests. Please wait ${canRequest.cooldownMinutes} minutes.`);
            }

            // Generate and send OTP
            const otp = otpService.generateOTP();
            await otpService.storeOTP(user.email, otp, 'CHANGE_PASSWORD', user.id);

            // Send OTP email
            const emailResult = await emailService.sendOTPEmail(
                user.email,
                otp,
                'CHANGE_PASSWORD',
                {
                    userName: user.username || user.firstName || 'User'
                }
            );

            logger.info(`Password change OTP sent for user: ${userId}`);

            return {
                success: true,
                message: 'Verification code sent to your email',
                otpSent: emailResult.success
            };
        } catch (error) {
            logger.error('Error in initiate password change:', error);
            throw error;
        }
    }

    /**
     * Complete password change with OTP
     */
    async completePasswordChange(userId, otp, newPassword) {
        try {
            // Validate new password strength
            const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordPattern.test(newPassword)) {
                throw new ValidationError('New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character');
            }

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw new AuthError('User not found');
            }

            // Verify OTP
            const verification = await otpService.verifyOTP(user.email, otp, 'CHANGE_PASSWORD');

            if (!verification.success) {
                throw new AuthError('Invalid or expired OTP');
            }

            // Hash new password
            const hashedNewPassword = await bcrypt.hash(newPassword, this.saltRounds);

            // Update password
            await prisma.user.update({
                where: { id: userId },
                data: {
                    password: hashedNewPassword,
                    updatedAt: new Date()
                }
            });

            // Invalidate all refresh tokens (force re-login)
            await this.logoutAll(userId);

            logger.info(`Password changed for user: ${userId}`);

            return {
                success: true,
                message: 'Password changed successfully. Please login again.'
            };
        } catch (error) {
            logger.error('Error in complete password change:', error);
            throw error;
        }
    }

    /**
     * Send email verification OTP for existing users
     */
    async sendEmailVerificationOTP(userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw new AuthError('User not found');
            }

            if (user.emailVerified) {
                return {
                    success: true,
                    message: 'Email is already verified'
                };
            }

            // Check if user can request OTP
            const canRequest = await otpService.canRequestOTP(user.email, 'EMAIL_VERIFICATION');
            if (!canRequest.canRequest) {
                throw new ValidationError(`Too many verification requests. Please wait ${canRequest.cooldownMinutes} minutes.`);
            }

            // Generate and send OTP
            const otp = otpService.generateOTP();
            await otpService.storeOTP(user.email, otp, 'EMAIL_VERIFICATION', user.id);

            // Send OTP email
            const emailResult = await emailService.sendOTPEmail(
                user.email,
                otp,
                'EMAIL_VERIFICATION',
                {
                    userName: user.username || user.firstName || 'User'
                }
            );

            logger.info(`Email verification OTP sent for user: ${userId}`);

            return {
                success: true,
                message: 'Verification code sent to your email',
                otpSent: emailResult.success
            };
        } catch (error) {
            logger.error('Error in send email verification OTP:', error);
            throw error;
        }
    }

    /**
     * Verify email with OTP for existing users
     */
    async verifyEmail(userId, otp) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw new AuthError('User not found');
            }

            if (user.emailVerified) {
                return {
                    success: true,
                    message: 'Email is already verified'
                };
            }

            // Verify OTP
            const verification = await otpService.verifyOTP(user.email, otp, 'EMAIL_VERIFICATION');

            if (!verification.success) {
                throw new AuthError('Invalid or expired OTP');
            }

            // Update email verification status
            await prisma.user.update({
                where: { id: userId },
                data: {
                    emailVerified: true,
                    emailVerifiedAt: new Date()
                }
            });

            // Publish email verification event
            try {
                const rabbitmqService = require('../utils/rabbitmq');
                await rabbitmqService.publishEvent('user.email_verified', {
                    userId: user.id,
                    email: user.email,
                    verifiedAt: new Date().toISOString()
                });
            } catch (mqError) {
                logger.error('Failed to publish user.email_verified event to RabbitMQ', mqError);
            }

            logger.info(`Email verified for user: ${userId}`);

            return {
                success: true,
                message: 'Email verified successfully'
            };
        } catch (error) {
            logger.error('Error in verify email:', error);
            throw error;
        }
    }

    /**
     * Update username with 15-day restriction
     */
    async updateUsername(userId, newUsername) {
        try {
            // Get current user
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw new AuthError('User not found');
            }

            // Check if username is the same
            if (user.username === newUsername) {
                throw new ValidationError('New username must be different from current username');
            }

            // Check 15-day restriction
            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

            if (user.lastUsernameUpdated && user.lastUsernameUpdated > fifteenDaysAgo) {
                const daysLeft = Math.ceil((new Date(user.lastUsernameUpdated).getTime() + (15 * 24 * 60 * 60 * 1000) - Date.now()) / (24 * 60 * 60 * 1000));
                throw new ValidationError(`Username can only be updated once every 15 days. Please wait ${daysLeft} more days.`);
            }

            // Check if username is already taken
            const existingUser = await prisma.user.findUnique({
                where: { username: newUsername }
            });

            if (existingUser) {
                throw new ValidationError('Username is already taken');
            }

            // Update username and timestamp
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    username: newUsername,
                    lastUsernameUpdated: new Date(),
                    updatedAt: new Date()
                }
            });

            // Publish event to user-service
            try {
                const rabbitmqService = require('../utils/rabbitmq');
                await rabbitmqService.publishEvent('user.username_updated', {
                    userId: user.id,
                    email: user.email,
                    oldUsername: user.username,
                    newUsername: newUsername,
                    updatedAt: new Date().toISOString()
                });
            } catch (mqError) {
                logger.error('Failed to publish user.username_updated event to RabbitMQ', mqError);
            }

            logger.info(`Username updated for user: ${userId} from ${user.username} to ${newUsername}`);

            return {
                success: true,
                message: 'Username updated successfully',
                data: {
                    username: updatedUser.username,
                    lastUsernameUpdated: updatedUser.lastUsernameUpdated
                }
            };
        } catch (error) {
            logger.error('Error updating username:', error);
            throw error;
        }
    }

    /**
     * Initiate email update with OTP verification
     */
    async initiateEmailUpdate(userId, newEmail) {
        try {
            // Get current user
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw new AuthError('User not found');
            }

            // Check if email is the same
            if (user.email.toLowerCase() === newEmail.toLowerCase()) {
                throw new ValidationError('New email must be different from current email');
            }

            // Check if new email is already taken
            const existingUser = await prisma.user.findUnique({
                where: { email: newEmail.toLowerCase() }
            });

            if (existingUser) {
                throw new ValidationError('Email is already in use');
            }

            // Generate and store OTP for email update
            const otp = otpService.generateOTP();
            await otpService.storeOTP(newEmail.toLowerCase(), otp, 'EMAIL_UPDATE', userId);

            // Send OTP to new email
            await emailService.sendOTPEmail(newEmail, otp, 'EMAIL_UPDATE', {
                userName: user.username || user.firstName || 'User',
                currentEmail: user.email
            });

            logger.info(`Email update OTP sent for user: ${userId} to new email: ${newEmail}`);

            return {
                success: true,
                message: 'OTP sent to new email address. Please verify to complete email update.',
                data: {
                    newEmail: newEmail.toLowerCase(),
                    nextStep: 'verify_email_update_otp'
                }
            };
        } catch (error) {
            logger.error('Error initiating email update:', error);
            throw error;
        }
    }

    /**
     * Complete email update with OTP verification
     */
    async completeEmailUpdate(userId, newEmail, otp) {
        try {
            // Get current user
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw new AuthError('User not found');
            }

            // Verify OTP
            const verification = await otpService.verifyOTP(newEmail.toLowerCase(), otp, 'EMAIL_UPDATE');

            if (!verification.success) {
                throw new ValidationError('Invalid or expired OTP');
            }

            // Check if new email is still available
            const existingUser = await prisma.user.findUnique({
                where: { email: newEmail.toLowerCase() }
            });

            if (existingUser) {
                throw new ValidationError('Email is already in use');
            }

            // Update email and reset email verification status
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    email: newEmail.toLowerCase(),
                    emailVerified: true, // New email is verified through OTP process
                    emailVerifiedAt: new Date(),
                    updatedAt: new Date()
                }
            });

            // Mark OTP as used
            await otpService.markOTPAsUsed(verification.otpRecord.id);

            // Publish events to user-service
            try {
                const rabbitmqService = require('../utils/rabbitmq');
                await rabbitmqService.publishEvent('user.email_updated', {
                    userId: user.id,
                    oldEmail: user.email,
                    newEmail: newEmail.toLowerCase(),
                    emailVerified: true,
                    updatedAt: new Date().toISOString()
                });

                // Also publish email verification event
                await rabbitmqService.publishEvent('user.email_verified', {
                    userId: user.id,
                    email: newEmail.toLowerCase(),
                    verifiedAt: new Date().toISOString()
                });
            } catch (mqError) {
                logger.error('Failed to publish email update events to RabbitMQ', mqError);
            }

            logger.info(`Email updated for user: ${userId} from ${user.email} to ${newEmail}`);

            return {
                success: true,
                message: 'Email updated successfully',
                data: {
                    email: updatedUser.email,
                    emailVerified: updatedUser.emailVerified,
                    emailVerifiedAt: updatedUser.emailVerifiedAt
                }
            };
        } catch (error) {
            logger.error('Error completing email update:', error);
            throw error;
        }
    }
}

module.exports = new AuthService();
