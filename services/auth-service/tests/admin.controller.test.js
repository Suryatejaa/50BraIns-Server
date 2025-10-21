const request = require('supertest');
const app = require('../index');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Admin Controller', () => {
    let testUser;
    let testAdmin;
    let testSuperAdmin;
    let userAccessToken;
    let adminAccessToken;
    let superAdminAccessToken;
    let userId; beforeEach(async () => {
        // Create test users with unique emails        // Create test users with unique names and emails
        testUser = await testUtils.createTestUser();
        testAdmin = await testUtils.createTestAdmin();
        testSuperAdmin = await testUtils.createTestAdmin({
            roles: ['SUPER_ADMIN']
        });

        // Register users
        const userRegisterResponse = await request(app)
            .post('/api/auth/register')
            .send(testUser);
        userId = userRegisterResponse.body.data.user.id;

        await request(app)
            .post('/api/auth/register')
            .send(testAdmin);

        await request(app)
            .post('/api/auth/register')
            .send(testSuperAdmin);

        // Login users to get tokens
        const userLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });
        expect(userLoginResponse.status).toBe(200);
        expect(userLoginResponse.body.data).toBeDefined();
        userAccessToken = userLoginResponse.body.data.accessToken;

        const adminLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: testAdmin.email,
                password: testAdmin.password
            });
        expect(adminLoginResponse.status).toBe(200);
        expect(adminLoginResponse.body.data).toBeDefined();
        adminAccessToken = adminLoginResponse.body.data.accessToken;

        const superAdminLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: testSuperAdmin.email,
                password: testSuperAdmin.password
            });
        if (superAdminLoginResponse.status !== 200 || !superAdminLoginResponse.body.data) {
            console.error('Super admin login failed:', superAdminLoginResponse.body);
        }
        expect(superAdminLoginResponse.status).toBe(200);
        expect(superAdminLoginResponse.body.data).toBeDefined();
        superAdminAccessToken = superAdminLoginResponse.body.data.accessToken;
    });

    // All admin/user management tests have been removed from auth-service. User management is now handled by the user-service microservice.
});
