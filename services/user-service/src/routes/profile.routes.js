// src/routes/profile.routes.js
const express = require('express');
const userController = require('../controllers/user.controller');

const router = express.Router();

// Profile-specific routes (gateway handles authentication)
router.get('/', userController.getCurrentUser);
router.put('/', userController.updateUserProfile);
router.put('/picture', userController.updateProfilePicture);

// roles-specific profile routes
router.put('/influencer', userController.updaterolesInfo);
router.put('/brand', userController.updaterolesInfo);
router.put('/crew', userController.updaterolesInfo);

module.exports = router;
