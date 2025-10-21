// test-user-service-admin-analytics.js
// Usage: node test-user-service-admin-analytics.js
// This script logs in as admin and tests admin and analytics endpoints for the given user IDs.

const axios = require('axios');

const BASE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3000';
const USER_IDS = [
    '0530fa84-41a1-4855-85a0-4513a7735049',
    'user_test_id_1',
];
const ADMIN_CREDENTIALS = {
    email: 'admin1@gmail.com',
    password: 'Admin123!'
};

async function login() {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, ADMIN_CREDENTIALS);
    return res.data.tokens?.accessToken || res.data.accessToken;
}

async function testAdminRoutes(token, userId) {
    const routes = [
        { method: 'get', url: `/api/admin/users/${userId}` },
        { method: 'patch', url: `/api/admin/users/${userId}/status`, data: { status: 'ACTIVE' } },
        { method: 'post', url: `/api/admin/users/${userId}/ban`, data: { reason: 'Test ban' } },
        { method: 'post', url: `/api/admin/users/${userId}/unban` },
        { method: 'delete', url: `/api/admin/users/${userId}` },
    ];
    for (const route of routes) {
        try {
            const res = await axios({
                method: route.method,
                url: `${BASE_URL}${route.url}`,
                headers: { Authorization: `Bearer ${token}` },
                data: route.data
            });
            console.log(`${route.method.toUpperCase()} ${route.url}:`, res.status, res.data);
        } catch (err) {
            console.error(`${route.method.toUpperCase()} ${route.url} failed:`, err.response?.status, err.response?.data);
        }
    }
}

async function testAnalyticsRoutes(token, userId) {
    const routes = [
        `/api/analytics/profile-views/${userId}`,
        `/api/analytics/user-insights/${userId}`
    ];
    for (const route of routes) {
        try {
            const res = await axios.get(`${BASE_URL}${route}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`GET ${route}:`, res.status, res.data);
        } catch (err) {
            console.error(`GET ${route} failed:`, err.response?.status, err.response?.data);
        }
    }
}

async function main() {
    let token;
    try {
        token = await login();
        console.log('Admin login successful.');
    } catch (err) {
        console.error('Admin login failed:', err.response?.status, err.response?.data);
        return;
    }
    for (const userId of USER_IDS) {
        console.log(`\nTesting admin routes for userId: ${userId}`);
        await testAdminRoutes(token, userId);
        console.log(`\nTesting analytics routes for userId: ${userId}`);
        await testAnalyticsRoutes(token, userId);
    }
}

main();
