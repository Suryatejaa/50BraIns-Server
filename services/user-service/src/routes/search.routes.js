// src/routes/search.routes.js
const express = require('express');
const searchController = require('../controllers/search.controller');

const router = express.Router();

// Global user search route (gateway handles authentication)
router.get('/users', searchController.searchUsers);

module.exports = router;
