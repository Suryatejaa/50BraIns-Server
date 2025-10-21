const request = require('supertest');
const app = require('../src/index');

describe('Credit Service Health Check', () => {
    test('Health endpoint should return 200', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);

        expect(response.body.status).toBe('healthy');
        expect(response.body.service).toBe('credit-service');
    });

    test('Root endpoint should return service info', async () => {
        const response = await request(app)
            .get('/')
            .expect(200);

        expect(response.body.service).toBe('Credit Service');
        expect(response.body.status).toBe('running');
    });

    test('Public packages endpoint should be accessible', async () => {
        const response = await request(app)
            .get('/api/public/packages')
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
    });
});

describe('Credit Service API Endpoints', () => {
    test('Protected endpoints should require authentication', async () => {
        await request(app)
            .get('/api/credits/wallet')
            .expect(401);
    });

    test('Admin endpoints should require admin authentication', async () => {
        await request(app)
            .get('/api/admin/statistics')
            .expect(401);
    });
});

// Mock database service for testing
jest.mock('../src/services/database', () => ({
    getInstance: () => ({
        initialize: jest.fn(),
        getHealth: jest.fn().mockResolvedValue({
            status: 'connected',
            latency: '1ms'
        }),
        disconnect: jest.fn()
    })
}));
