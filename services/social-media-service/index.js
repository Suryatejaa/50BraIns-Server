const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = require('./src/app');

const PORT = process.env.PORT || 4008;

app.listen(PORT, () => {
    console.log(`Social Media Service running on port ${PORT}`);
});
