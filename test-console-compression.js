/**
 * Test Console Compression Utility
 * This script demonstrates how the global console compression works
 */

// Setup global console compression for testing
const { setupGlobalConsoleCompression } = require('./utils/globalConsoleLogger');
const compression = setupGlobalConsoleCompression('test-service');

console.log('🔧 Starting Test Service...');
console.log('🚀 Test Service initialization complete');
console.log('✅ Port: 4000');
console.log('🌐 Environment: production');

// Simulate marking startup end
console.markStartupEnd('Test Service', 4000);

// These logs should be compressed in production
console.log('User logged in successfully: user@example.com');
console.log('JWT Secret: some-secret-key');
console.log('OTP generated and stored for user registration: user@example.com 123456');
console.log('Password changed for user: user123');
console.log('Username updated for user: user123 from oldname to newname');

// These logs should still show normally
console.error('This is an error log - should always show');
console.warn('⚠️ This is a warning with startup icon - should show');
console.log('🔧 This has a startup keyword - should show');

// Show service info
console.log('\nService Info:', console.getServiceInfo());
console.log('Is Production Mode:', console.isProductionMode());

// Test in different environments
console.log('\n--- Testing in Development Mode ---');
process.env.NODE_ENV = 'development';
console.log('Development log - should show normally');
console.log('User logged in successfully: dev-user@example.com');

console.log('\n--- Testing in Production Mode ---');
process.env.NODE_ENV = 'production';
console.log('Production log - normal log should show');
console.log('User logged in successfully: prod-user@example.com'); // Should be compressed

console.log('\n✅ Console compression test completed');