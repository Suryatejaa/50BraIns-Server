const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const socialMediaRoutes = require('./routes/socialMediaRoutes');
const eventService = require('./services/eventService');
const configService = require('./services/configService');

const app = express();

// Initialize event service
eventService.connect().catch(console.error);

app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.use('/', socialMediaRoutes);  // Gateway strips /api/social-media prefix

// Health check endpoint
app.get('/health', (req, res) => {
    const configValidation = configService.validateConfig();
    const configuredPlatforms = configService.getConfiguredPlatforms();

    res.status(200).json({
        status: 'UP',
        service: 'social-media-service',
        version: '1.0.0',
        features: {
            realApiCalls: configService.features.enableRealApiCalls,
            mockData: configService.features.enableMockData,
            webhookVerification: configService.features.enableWebhookVerification
        },
        platforms: {
            configured: configuredPlatforms,
            total: configuredPlatforms.length
        },
        config: {
            valid: configValidation.isValid,
            errors: configValidation.errors
        }
    });
});

module.exports = app;
