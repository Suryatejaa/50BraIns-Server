require('dotenv').config({ path: '.env.local' });

const express = require('express');
const app = express();

// Add body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log incoming requests
app.use((req, res, next) => {
    console.log('\n🔍 INCOMING REQUEST DEBUG:');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Path:', req.path);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    next();
});

// Import the OTP controller
const otpController = require('./src/controllers/otp.controller');

// Test the exact route
app.post('/reset-password', (req, res) => {
    console.log('\n🎯 RESET PASSWORD ROUTE HIT!');
    console.log('Body received:', req.body);

    // Check if required fields are present
    const { email, otp, newPassword } = req.body;
    console.log('Extracted fields:');
    console.log('- email:', email);
    console.log('- otp:', otp);
    console.log('- newPassword:', newPassword ? '[HIDDEN]' : undefined);

    if (!email || !otp || !newPassword) {
        console.log('❌ Validation failed - missing fields');
        return res.status(400).json({
            success: false,
            message: 'Email, OTP, and new password are required'
        });
    }

    console.log('✅ Validation passed - calling controller');
    // Call the actual controller
    otpController.resetPassword(req, res);
});

// Also test with /auth prefix (in case that's the issue)
app.post('/auth/reset-password', (req, res) => {
    console.log('\n🎯 AUTH RESET PASSWORD ROUTE HIT!');
    otpController.resetPassword(req, res);
});

const PORT = 3099; // Different port to avoid conflicts

app.listen(PORT, () => {
    console.log(`🔧 Debug server running on http://localhost:${PORT}`);
    console.log('📝 Test endpoints:');
    console.log(`   POST http://localhost:${PORT}/reset-password`);
    console.log(`   POST http://localhost:${PORT}/auth/reset-password`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Debug server shutting down...');
    process.exit(0);
});