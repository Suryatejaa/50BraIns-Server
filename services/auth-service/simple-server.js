const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4001;

// Basic middleware only
app.use(express.json({ limit: '10mb' })); // Remove the verify function that stores rawBody

// Add logging middleware to see all incoming requests
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path} - Body:`, req.body);
    next();
});

// Simple test endpoint
app.get('/health', (req, res) => {
    console.log('✅ Health endpoint hit');
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'Simplified auth service is running'
    });
});

// Test endpoint to confirm which server is running
app.get('/test', (req, res) => {
    console.log('🧪 Test endpoint hit - This is the SIMPLE server');
    res.status(200).json({
        server: 'SIMPLE SERVER',
        message: 'This confirms the simple server is running',
        timestamp: new Date().toISOString()
    });
});

// Simple register endpoint for testing (gateway expects /register after path rewrite)
app.post('/register', (req, res) => {
    console.log('Register endpoint hit via gateway with body:', req.body);

    try {
        // Basic validation
        if (!req.body.email || !req.body.password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Return success without any async operations
        res.status(201).json({
            success: true,
            message: 'Register test successful via gateway',
            data: {
                email: req.body.email,
                message: 'This response came through the gateway successfully'
            }
        });
    } catch (error) {
        console.error('Error in register:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Simple register endpoint for testing (direct access)
app.post('/api/auth/simple-register', (req, res) => {
    console.log('Simple register endpoint hit with body:', req.body);

    try {
        // Basic validation
        if (!req.body.email || !req.body.password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Return success without any async operations
        res.status(201).json({
            success: true,
            message: 'Simple register test successful',
            data: {
                email: req.body.email,
                message: 'This is a simplified test response'
            }
        });
    } catch (error) {
        console.error('Error in simple register:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        error: `SIMPLE SERVER - Not found - ${req.originalUrl}`,
        server: 'SIMPLE SERVER',
        availableRoutes: [
            'GET /health',
            'GET /test',
            'POST /register',
            'POST /api/auth/simple-register'
        ]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Simplified Auth Service running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Test register: POST http://localhost:${PORT}/api/auth/simple-register`);
}).on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
});

module.exports = app;
