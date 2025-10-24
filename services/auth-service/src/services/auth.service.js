const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger.utils');
const { AuthError, ValidationError, ConflictError } = require('../utils/errors.utils');
const { prisma } = require('../config/database');
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
     * Register a new user
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
                console.log('Data from userData:', userData);
                if (finalRoles.includes('INFLUENCER') || finalRoles.includes('CREW')) {
                    if (!instagramHandle) {
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
                    status: 'ACTIVE', // Ensure user is active for auth middleware
                    emailVerified: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    ...(instagramHandle && { instagramHandle }),
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

                const tokens = await this.generateTokens(createdUser);

                logger.info(`User creation completed successfully: ${createdUser.email}`, {
                    userId: createdUser.id,
                    roles: createdUser.roles,
                    hasAdditionalFields: Object.keys(additionalFields).length > 0
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
                        status: 'ACTIVE',
                        emailVerified: createdUser.emailVerified,
                        createdAt: createdUser.createdAt
                    });
                    logger.info('Published user.registered event to RabbitMQ', { userId: createdUser.id });
                } catch (mqError) {
                    logger.error('Failed to publish user.registered event to RabbitMQ', mqError);
                }

                return {
                    user: createdUser,
                    tokens
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
                throw new AuthError('Account is deactivated');
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
     * Verify user's email
     */
    async verifyEmail(token) {
        try {
            // In a real implementation, you'd verify the email verification token
            // For now, this is a placeholder
            logger.info('Email verification requested');
            return { success: true, message: 'Email verification feature coming soon' };
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
     * Reset password
     */
    async resetPassword(token, newPassword) {
        try {
            // In a real implementation, you'd verify the reset token
            // For now, this is a placeholder
            logger.info('Password reset requested');
            return { success: true, message: 'Password reset feature coming soon' };
        } catch (error) {
            logger.error('Error in password reset:', error);
            throw error;
        }
    }

    /**
     * Change password
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Validate new password strength (same as Joi schema)
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
            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                throw new AuthError('Current password is incorrect');
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
            return { success: true, message: 'Password changed successfully' };
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
}

module.exports = new AuthService();
