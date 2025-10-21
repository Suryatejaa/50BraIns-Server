const authService = require('../src/services/auth.service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AuthError, ValidationError, ConflictError } = require('../src/utils/errors.utils');

describe('AuthService', () => {
    let testUser;
    let registeredUser;

    beforeEach(async () => {
        testUser = await testUtils.createTestUser();
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            const user = await authService.register(testUser);

            expect(user).toBeDefined();
            expect(user.id).toBeDefined();
            expect(user.email).toBe(testUser.email.toLowerCase());
            expect(user.roles).toEqual(testUser.roles);
            expect(user.isActive).toBe(true);
            expect(user.emailVerified).toBe(false);
            expect(user).not.toHaveProperty('password');            // Verify user was actually created in database
            const dbUser = await testUtils.prisma.user.findUnique({
                where: { email: testUser.email.toLowerCase() }
            });
            expect(dbUser).toBeDefined();
            expect(dbUser.email).toBe(testUser.email.toLowerCase());
        }); it('should hash the password', async () => {
            await authService.register(testUser);

            const dbUser = await testUtils.prisma.user.findUnique({
                where: { email: testUser.email.toLowerCase() }
            });

            expect(dbUser.password).not.toBe(testUser.password);
            expect(dbUser.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash pattern
        });

        it('should convert email to lowercase', async () => {
            const upperCaseEmail = testUser.email.toUpperCase();
            const userData = { ...testUser, email: upperCaseEmail };

            const user = await authService.register(userData);

            expect(user.email).toBe(testUser.email.toLowerCase());
        });

        it('should throw error for duplicate email', async () => {            // Register user first time
            await authService.register(testUser);

            // Try to register again with same email
            await expect(authService.register(testUser))
                .rejects
                .toThrow(ConflictError);
        });

        it('should generate unique user IDs', async () => {
            const user1 = await authService.register(testUser);

            const testUser2 = await testUtils.createTestUser({
                email: 'different@test.com'
            });
            const user2 = await authService.register(testUser2);

            expect(user1.id).not.toBe(user2.id);
            expect(user1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/); // UUID v4 pattern
        });
    });

    describe('login', () => {
        beforeEach(async () => {
            registeredUser = await authService.register(testUser);
        });

        it('should login successfully with correct credentials', async () => {
            const result = await authService.login({
                email: testUser.email,
                password: testUser.password
            });

            expect(result).toBeDefined();
            expect(result.user).toBeDefined();
            expect(result.tokens).toBeDefined();
            expect(result.user.email).toBe(testUser.email.toLowerCase());
            expect(result.tokens.accessToken).toBeDefined();
            expect(result.tokens.refreshToken).toBeDefined();
            expect(result.tokens.expiresIn).toBe(15 * 60); // 15 minutes
        });

        it('should return user without password', async () => {
            const result = await authService.login({
                email: testUser.email,
                password: testUser.password
            });

            expect(result.user).not.toHaveProperty('password');
        });

        it('should update lastLoginAt', async () => {
            const beforeLogin = new Date();

            await authService.login({
                email: testUser.email,
                password: testUser.password
            }); const dbUser = await testUtils.prisma.user.findUnique({
                where: { email: testUser.email.toLowerCase() }
            });

            expect(dbUser.lastLoginAt).toBeDefined();
            expect(dbUser.lastLoginAt.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
        });

        it('should create refresh token in database', async () => {
            const result = await authService.login({
                email: testUser.email,
                password: testUser.password
            });

            const refreshTokenRecord = await testUtils.prisma.refreshToken.findFirst({
                where: {
                    token: result.tokens.refreshToken,
                    userId: registeredUser.id
                }
            }); expect(refreshTokenRecord).toBeDefined();
            expect(refreshTokenRecord.userId).toBe(registeredUser.id);
            expect(refreshTokenRecord.expiresAt).toBeDefined();
        });

        it('should throw error for non-existent user', async () => {
            await expect(authService.login({
                email: 'nonexistent@test.com',
                password: testUser.password
            })).rejects.toThrow(AuthError);
        });

        it('should throw error for incorrect password', async () => {
            await expect(authService.login({
                email: testUser.email,
                password: 'wrongpassword'
            })).rejects.toThrow(AuthError);
        });

        it('should throw error for inactive user', async () => {
            // Deactivate user
            await testUtils.prisma.user.update({
                where: { id: registeredUser.id },
                data: { isActive: false }
            });

            await expect(authService.login({
                email: testUser.email,
                password: testUser.password
            })).rejects.toThrow(AuthError);
        });

        it('should handle case-insensitive email', async () => {
            const result = await authService.login({
                email: testUser.email.toUpperCase(),
                password: testUser.password
            });

            expect(result.user.email).toBe(testUser.email.toLowerCase());
        });
    });

    describe('refreshToken', () => {
        let validRefreshToken;
        let userId;

        beforeEach(async () => {
            registeredUser = await authService.register(testUser);
            userId = registeredUser.id;

            const loginResult = await authService.login({
                email: testUser.email,
                password: testUser.password
            });
            validRefreshToken = loginResult.tokens.refreshToken;
        });

        it('should refresh tokens successfully', async () => {
            const tokens = await authService.refreshToken(validRefreshToken);

            expect(tokens).toBeDefined();
            expect(tokens.accessToken).toBeDefined();
            expect(tokens.refreshToken).toBeDefined();
            expect(tokens.expiresIn).toBe(15 * 60);
            expect(tokens.refreshToken).not.toBe(validRefreshToken); // New refresh token
        }); it('should deactivate old refresh token', async () => {
            await authService.refreshToken(validRefreshToken);

            const oldTokenRecord = await testUtils.prisma.refreshToken.findFirst({
                where: { token: validRefreshToken }
            });

            expect(oldTokenRecord).toBeNull(); // Token should be deleted
        });

        it('should create new refresh token record', async () => {
            const tokens = await authService.refreshToken(validRefreshToken);

            const newTokenRecord = await testUtils.prisma.refreshToken.findFirst({
                where: { token: tokens.refreshToken }
            }); expect(newTokenRecord).toBeDefined();
            expect(newTokenRecord.userId).toBe(userId);
        });

        it('should throw error for missing refresh token', async () => {
            await expect(authService.refreshToken(null))
                .rejects
                .toThrow(AuthError);
        });

        it('should throw error for invalid refresh token', async () => {
            await expect(authService.refreshToken('invalid_token'))
                .rejects
                .toThrow(AuthError);
        });

        it('should throw error for expired refresh token', async () => {
            // Manually expire the token in database
            await testUtils.prisma.refreshToken.updateMany({
                where: { token: validRefreshToken },
                data: { expiresAt: new Date(Date.now() - 1000) } // 1 second ago
            });

            await expect(authService.refreshToken(validRefreshToken))
                .rejects
                .toThrow(AuthError);
        }); it('should throw error for inactive refresh token', async () => {
            // Delete the token to simulate it being inactive
            await testUtils.prisma.refreshToken.deleteMany({
                where: { token: validRefreshToken }
            });

            await expect(authService.refreshToken(validRefreshToken))
                .rejects
                .toThrow(AuthError);
        });

        it('should throw error if user is deactivated', async () => {
            // Deactivate user
            await testUtils.prisma.user.update({
                where: { id: userId },
                data: { isActive: false }
            });

            await expect(authService.refreshToken(validRefreshToken))
                .rejects
                .toThrow(AuthError);
        });
    });

    describe('logout', () => {
        let validRefreshToken;
        let userId;

        beforeEach(async () => {
            registeredUser = await authService.register(testUser);
            userId = registeredUser.id;

            const loginResult = await authService.login({
                email: testUser.email,
                password: testUser.password
            });
            validRefreshToken = loginResult.tokens.refreshToken;
        });

        it('should logout successfully', async () => {
            const result = await authService.logout(validRefreshToken, userId);

            expect(result.success).toBe(true);
        });

        it('should deactivate refresh token', async () => {
            await authService.logout(validRefreshToken, userId); const tokenRecord = await testUtils.prisma.refreshToken.findFirst({
                where: { token: validRefreshToken }
            });

            expect(tokenRecord).toBeNull(); // Token should be deleted
        });

        it('should handle logout without refresh token', async () => {
            const result = await authService.logout(null, userId);

            expect(result.success).toBe(true);
        });

        it('should not throw error for non-existent refresh token', async () => {
            const result = await authService.logout('non_existent_token', userId);

            expect(result.success).toBe(true);
        });
    });

    describe('logoutAll', () => {
        let userId;
        let refreshToken1;
        let refreshToken2;

        beforeEach(async () => {
            registeredUser = await authService.register(testUser);
            userId = registeredUser.id;

            // Create multiple sessions
            const login1 = await authService.login({
                email: testUser.email,
                password: testUser.password
            });
            refreshToken1 = login1.tokens.refreshToken;

            const login2 = await authService.login({
                email: testUser.email,
                password: testUser.password
            });
            refreshToken2 = login2.tokens.refreshToken;
        });

        it('should logout from all devices', async () => {
            const result = await authService.logoutAll(userId);

            expect(result.success).toBe(true);
        }); it('should deactivate all refresh tokens', async () => {
            await authService.logoutAll(userId);

            const activeTokens = await testUtils.prisma.refreshToken.findMany({
                where: {
                    userId
                }
            });

            expect(activeTokens).toHaveLength(0); // All tokens should be deleted
        });

        it('should not affect other users tokens', async () => {
            // Create another user
            const testUser2 = await testUtils.createTestUser({
                email: 'other@test.com'
            });
            const otherUser = await authService.register(testUser2);
            const otherLogin = await authService.login({
                email: testUser2.email,
                password: testUser2.password
            });

            // Logout all for first user
            await authService.logoutAll(userId);            // Check other user's token still exists
            const otherUserTokens = await testUtils.prisma.refreshToken.findMany({
                where: {
                    userId: otherUser.id
                }
            });

            expect(otherUserTokens.length).toBeGreaterThan(0);
        });
    });

    describe('changePassword', () => {
        let userId;

        beforeEach(async () => {
            registeredUser = await authService.register(testUser);
            userId = registeredUser.id;
        });

        it('should change password successfully', async () => {
            const result = await authService.changePassword(
                userId,
                testUser.password,
                'NewPassword123!'
            );

            expect(result.success).toBe(true);
            expect(result.message).toBe('Password changed successfully');
        });

        it('should hash new password', async () => {
            const newPassword = 'NewPassword123!';

            await authService.changePassword(
                userId,
                testUser.password,
                newPassword
            );

            const dbUser = await testUtils.prisma.user.findUnique({
                where: { id: userId }
            });

            expect(dbUser.password).not.toBe(newPassword);
            expect(dbUser.password).toMatch(/^\$2[ayb]\$/);

            // Verify new password works
            const isValid = await bcrypt.compare(newPassword, dbUser.password);
            expect(isValid).toBe(true);
        });

        it('should invalidate all refresh tokens after password change', async () => {
            // Create some active sessions
            await authService.login({
                email: testUser.email,
                password: testUser.password
            });

            await authService.changePassword(
                userId,
                testUser.password,
                'NewPassword123!'
            ); const activeTokens = await testUtils.prisma.refreshToken.findMany({
                where: {
                    userId
                }
            });

            expect(activeTokens).toHaveLength(0); // All tokens should be deleted
        });

        it('should throw error for non-existent user', async () => {
            await expect(authService.changePassword(
                '00000000-0000-0000-0000-000000000000',
                testUser.password,
                'NewPassword123!'
            )).rejects.toThrow(AuthError);
        });

        it('should throw error for incorrect current password', async () => {
            await expect(authService.changePassword(
                userId,
                'wrongpassword',
                'NewPassword123!'
            )).rejects.toThrow(AuthError);
        });
    });

    describe('generateTokens', () => {
        let user;

        beforeEach(async () => {
            user = await authService.register(testUser);
        });

        it('should generate valid access and refresh tokens', async () => {
            const tokens = await authService.generateTokens(user);

            expect(tokens.accessToken).toBeDefined();
            expect(tokens.refreshToken).toBeDefined();
            expect(tokens.expiresIn).toBe(15 * 60);

            // Verify access token
            const accessPayload = jwt.verify(tokens.accessToken, process.env.JWT_SECRET);
            expect(accessPayload.userId).toBe(user.id);
            expect(accessPayload.email).toBe(user.email);
            expect(accessPayload.roles).toStrictEqual(user.roles);

            // Verify refresh token
            const refreshPayload = jwt.verify(tokens.refreshToken, process.env.JWT_REFRESH_SECRET);
            expect(refreshPayload.userId).toBe(user.id);
        });

        it('should store refresh token in database', async () => {
            const tokens = await authService.generateTokens(user);

            const tokenRecord = await testUtils.prisma.refreshToken.findFirst({
                where: { token: tokens.refreshToken }
            }); expect(tokenRecord).toBeDefined();
            expect(tokenRecord.userId).toBe(user.id);
            expect(tokenRecord.expiresAt).toBeDefined();
        });

        it('should generate unique refresh tokens', async () => {
            const tokens1 = await authService.generateTokens(user);
            const tokens2 = await authService.generateTokens(user);

            expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
            expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
        });
    });
});
