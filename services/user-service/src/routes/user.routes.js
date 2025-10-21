// src/routes/user.routes.js
const express = require('express');
const userController = require('../controllers/user.controller');
const equipmentRoutes = require('./equipment.routes');

const router = express.Router();

// User routes (gateway handles authentication)
router.get('/profile', userController.getCurrentUser);
router.get('/profile/:userId', userController.getUserById);
router.put('/profile', userController.updateUserProfile);

// Internal API routes (for service-to-service communication)
router.get('/internal/users/:userId', userController.getUserById);
router.post('/internal/users/batch', userController.getUsersByIds);
router.put('/profile-picture', userController.updateProfilePicture);
router.put('/social', userController.updateSocialHandles);
router.put('/roles-info', userController.updaterolesInfo);
router.get('/settings', userController.getUserSettings);
router.put('/settings', userController.updateUserSettings);
router.patch('/toggle-contact', userController.toggleShowContact);


// Equipment management routes
router.use('/equipment', equipmentRoutes);

module.exports = router;
