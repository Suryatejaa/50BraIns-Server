const { v4: uuidv4 } = require('uuid');

// Request ID middleware
const requestId = (req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
};

// Request logger middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${req.ip} - ID: ${req.id}`);

    // Log response on finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - ID: ${req.id}`);
    });

    next();
};

module.exports = {
    requestLogger,
    requestId
};
