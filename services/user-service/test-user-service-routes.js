// test-user-service-routes.js
// Usage: node test-user-service-routes.js
// This script tests user-related endpoints for the given user IDs.

const axios = require('axios');

const BASE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3000'; // Change if needed
const USER_IDS = [
    '0530fa84-41a1-4855-85a0-4513a7735049',
    'user_test_id_1',
];

async function testPublicRoutes(userId) {
    const routes = [
        `/api/public/users/${userId}`,
        `/api/public/influencers/${userId}`,
        `/api/public/brands/${userId}`,
        `/api/public/crew/${userId}`,
    ];
    for (const route of routes) {
        try {
            const res = await axios.get(`${BASE_URL}${route}`);
            console.log(`GET ${route}:`, res.status, res.data);
        } catch (err) {
            console.error(`GET ${route} failed:`, err.response?.status, err.response?.data);
        }
    }
}

async function main() {
    for (const userId of USER_IDS) {
        console.log(`\nTesting public routes for userId: ${userId}`);
        await testPublicRoutes(userId);
    }
    // Add more route tests here as needed (admin, analytics, etc.)
}

main();
