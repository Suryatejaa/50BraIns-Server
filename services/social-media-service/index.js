const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

// Setup global console compression (must be early in startup)
const { setupGlobalConsoleCompression } = require('../../utils/globalConsoleLogger');
setupGlobalConsoleCompression('SOCIAL-MEDIA-SERVICE');

const app = require('./src/app');

const PORT = process.env.PORT || 4008;

app.listen(PORT, () => {
    console.log(`Social Media Service running on port ${PORT}`);

    // Mark end of startup phase for console compression
    console.markStartupEnd('Social Media Service', PORT);
});
