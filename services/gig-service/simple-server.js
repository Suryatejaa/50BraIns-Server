console.log('🚀 Starting Gig Service debug...');

const express = require('express');
console.log('✅ Express loaded');

const app = express();
const PORT = process.env.PORT || 4004;

// Simple test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Test endpoint working', timestamp: new Date().toISOString() });
});

app.get('/applications/received', (req, res) => {
    console.log('📥 Received request to /applications/received');
    console.log('Headers:', req.headers);

    res.json({
        success: true,
        message: 'Endpoint is working',
        receivedApplications: [],
        pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0
        }
    });
});

app.listen(PORT, () => {
    console.log(`🎯 Simple test server running on port ${PORT}`);
    console.log(`📍 Test endpoint: http://localhost:${PORT}/test`);
    console.log(`📍 Target endpoint: http://localhost:${PORT}/applications/received`);
});
