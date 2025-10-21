// Test file to debug user service loading
console.log('Starting user service test...');

try {
    console.log('1. Loading prisma...');
    const { prisma } = require('./src/config/database');
    console.log('Prisma loaded successfully');

    console.log('2. Loading error handler...');
    const { NotFoundError } = require('./src/middleware/error-handler');
    console.log('Error handler loaded successfully');

    console.log('3. Loading logger...');
    const logger = require('./src/utils/logger');
    console.log('Logger loaded successfully');

    console.log('4. Defining test function...');
    const getPublicUserProfile = async (userId) => {
        console.log('Test function called with userId:', userId);
        return { test: 'success' };
    };

    console.log('5. Testing exports...');
    const exports = {
        getPublicUserProfile
    };
    console.log('Exports created:', Object.keys(exports));

    console.log('6. Loading actual user service...');
    const userService = require('./src/services/user.service');
    console.log('User service exports:', Object.keys(userService));

} catch (error) {
    console.error('Error during test:', error.message);
    console.error('Stack:', error.stack);
}
