const request = require('supertest');
const app = require('../index');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

describe('Auth Controller', () => {
    let testUser;
    let testAdmin;
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
        // Create test users
        testUser = await testUtils.createTestUser();
        testAdmin = await testUtils.createTestAdmin();
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = await testUtils.createTestUser({
                email: 'newuser@test.com'
            }); const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('User registered successfully');
            expect(response.body.data.user).toMatchObject({
                email: userData.email,
                roles: expect.arrayContaining(userData.roles)
            });
            expect(response.body.data.user.id).toBeDefined();
            expect(response.body.data.user).not.toHaveProperty('password');
        });

        it('should fail to register with invalid email', async () => {
            const userData = await testUtils.createTestUser({
                email: 'invalid-email'
            });

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400); expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('valid email');
        });

        it('should fail to register with weak password', async () => {
            const userData = await testUtils.createTestUser({
                password: '123'
            });

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400); expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Password must');
        });

        it('should fail to register with duplicate email', async () => {
            // First registration
            await request(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(201);

            // Second registration with same email
            const response = await request(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(409); expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('already exists');
        });

        it('should fail to register with missing required fields', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com'
                    // Missing password
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Register a user first
            await request(app)
                .post('/api/auth/register')
                .send(testUser);
        });

        it('should login successfully with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Login successful');
            expect(response.body.data.user).toMatchObject({
                email: testUser.email
            });
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.expiresIn).toBeDefined();
            expect(response.headers['set-cookie']).toBeDefined();

            // Store tokens for other tests
            accessToken = response.body.data.accessToken;
            const cookies = response.headers['set-cookie'];
            refreshToken = cookies.find(cookie => cookie.startsWith('refreshToken='))?.split(';')[0].split('=')[1];
        });

        it('should fail to login with invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: testUser.password
                }).expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid credentials');
        });

        it('should fail to login with invalid password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword'
                }).expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid credentials');
        });

        it('should fail to login with missing credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/refresh', () => {
        beforeEach(async () => {
            // Register and login user
            await request(app)
                .post('/api/auth/register')
                .send(testUser);

            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            accessToken = loginResponse.body.data.accessToken;
            const cookies = loginResponse.headers['set-cookie'];
            refreshToken = cookies.find(cookie => cookie.startsWith('refreshToken='))?.split(';')[0].split('=')[1];
        });

        it('should refresh tokens successfully', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .set('Cookie', `refreshToken=${refreshToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Tokens refreshed successfully');
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.expiresIn).toBeDefined();
            expect(response.headers['set-cookie']).toBeDefined();
        });

        it('should fail to refresh without refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .expect(400); expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Refresh token is required');
        });

        it('should fail to refresh with invalid refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .set('Cookie', 'refreshToken=invalid_token')
                .expect(401); expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid refresh token');
        });
    });

    describe('POST /api/auth/logout', () => {
        beforeEach(async () => {
            // Register and login the test user to get tokens
            await request(app)
                .post('/api/auth/register')
                .send(testUser);
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });
            accessToken = loginResponse.body.data.accessToken;
            refreshToken = loginResponse.body.data.refreshToken; // Use refreshToken from login response
        });
        it('should logout successfully', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .set('Cookie', `refreshToken=${refreshToken}`);
            if (response.status !== 200) console.log('Logout error:', response.body);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Logged out successfully');
        });
        it('should fail to logout without authentication', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .expect(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/logout-all', () => {
        beforeEach(async () => {
            // Register and login the test user to get tokens
            await request(app)
                .post('/api/auth/register')
                .send(testUser);
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });
            accessToken = loginResponse.body.data.accessToken;
        });
        it('should logout from all devices successfully', async () => {
            const response = await request(app)
                .post('/api/auth/logout-all')
                .set('Authorization', `Bearer ${accessToken}`);
            if (response.status !== 200) console.log('Logout-all error:', response.body);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Logged out from all devices successfully');
        });
    });

    describe('POST /api/auth/change-password', () => {
        beforeEach(async () => {
            // Register and login the test user to get tokens
            await request(app)
                .post('/api/auth/register')
                .send(testUser);
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });
            accessToken = loginResponse.body.data.accessToken;
        });
        it('should change password successfully', async () => {
            const response = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    currentPassword: testUser.password,
                    newPassword: 'NewPassword123!'
                });
            if (response.status !== 200) console.log('Change-password error:', response.body);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Password changed successfully');
        });
        it('should fail to change password with wrong current password', async () => {
            const response = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    currentPassword: 'wrongpassword',
                    newPassword: 'NewPassword123!'
                });
            if (response.status !== 401) console.log('Change-password wrong current error:', response.body);
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Current password is incorrect');
        });
        it('should fail to change password with weak new password', async () => {
            const response = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    currentPassword: testUser.password,
                    newPassword: '123'
                });
            if (response.status !== 400) console.log('Change-password weak new error:', response.body);
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
});
