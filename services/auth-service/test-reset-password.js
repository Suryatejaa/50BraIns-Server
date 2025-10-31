require('dotenv').config({ path: '.env.local' });

async function testResetPassword() {
    try {
        console.log('🧪 Testing OTP Reset Password Flow...\n');

        const testData = {
            email: "echoliftagency@gmail.com",
            otp: "860664",
            newPassword: "Surya@321",
            confirmPassword: "Surya@321"
        };

        console.log('📤 Request data:', JSON.stringify(testData, null, 2));

        // Test the controller method directly
        const otpController = require('./src/controllers/otp.controller');

        // Mock request and response objects
        const mockReq = {
            body: testData
        };

        const mockRes = {
            status: function (code) {
                console.log(`📊 Status: ${code}`);
                return this;
            },
            json: function (data) {
                console.log('📤 Response:', JSON.stringify(data, null, 2));
                return this;
            }
        };

        console.log('\n🔧 Testing controller method directly...');
        await otpController.resetPassword(mockReq, mockRes);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

testResetPassword();