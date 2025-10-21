const request = require('supertest');
const app = require('../src/app');

describe('Social Media Service', () => {
    it('should have a health check endpoint', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);

        expect(response.body.status).toBe('UP');
    });

    it('should link a social media account', async () => {
        const accountData = {
            userId: 'test-user-123',
            platform: 'instagram',
            username: 'testuser',
            profileUrl: 'https://instagram.com/testuser'
        };

        const response = await request(app)
            .post('/api/social-media/link')
            .send(accountData)
            .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.platform).toBe('instagram');
        expect(response.body.username).toBe('testuser');
    });

    it('should get linked accounts for a user', async () => {
        const response = await request(app)
            .get('/api/social-media/test-user-123')
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get analytics for a user', async () => {
        const response = await request(app)
            .get('/api/social-media/analytics/test-user-123')
            .expect(200);

        expect(response.body).toHaveProperty('totalAccounts');
        expect(response.body).toHaveProperty('totalFollowers');
        expect(response.body).toHaveProperty('influencerTier');
    });
});
