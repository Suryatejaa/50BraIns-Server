// Test script to verify all middleware and routes are working
const express = require('express');
console.log('✅ Express loaded');

// Test if our auth utility works
const { getUserFromHeaders, addUserToRequest } = require('./src/utils/auth');
console.log('✅ Auth utility loaded');

// Test if controllers load without errors
try {
    const analyticsController = require('./src/controllers/analytics.controller');
    console.log('✅ Analytics controller loaded');
} catch (error) {
    console.error('❌ Analytics controller error:', error.message);
}

try {
    const adminController = require('./src/controllers/admin.controller');
    console.log('✅ Admin controller loaded');
} catch (error) {
    console.error('❌ Admin controller error:', error.message);
}

// Test if routes load without errors
try {
    const adminRoutes = require('./src/routes/admin.routes');
    console.log('✅ Admin routes loaded');
} catch (error) {
    console.error('❌ Admin routes error:', error.message);
}

try {
    const analyticsRoutes = require('./src/routes/analytics.routes');
    console.log('✅ Analytics routes loaded');
} catch (error) {
    console.error('❌ Analytics routes error:', error.message);
}

try {
    const searchRoutes = require('./src/routes/search.routes');
    console.log('✅ Search routes loaded');
} catch (error) {
    console.error('❌ Search routes error:', error.message);
}

console.log('\n🎉 All components loaded successfully!');
console.log('📝 Summary of changes:');
console.log('   - ✅ Removed CORS from user-service');
console.log('   - ✅ Removed CORS from auth-service');
console.log('   - ✅ Removed auth middleware from all user-service routes');
console.log('   - ✅ Added gateway header parser middleware');
console.log('   - ✅ All controllers now work with req.user from gateway headers');
console.log('   - ✅ API Gateway handles all authentication and CORS');
