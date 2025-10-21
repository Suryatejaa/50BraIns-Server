const socialMediaService = require('../services/socialMediaService');
const Joi = require('joi');

// Validation schemas
const linkAccountSchema = Joi.object({
    userId: Joi.string().required(),
    platform: Joi.string().valid('instagram', 'youtube', 'twitter', 'linkedin', 'tiktok').required(),
    username: Joi.string().required(),
    profileUrl: Joi.string().uri().required()
});

const linkAccount = async (req, res) => {
    try {
        const { error } = linkAccountSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const account = await socialMediaService.linkAccount(req.body);
        res.status(201).json(account);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getLinkedAccounts = async (req, res) => {
    try {
        const accounts = await socialMediaService.getLinkedAccounts(req.params.userId);
        res.status(200).json(accounts);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const syncAccount = async (req, res) => {
    try {
        const { platform, userId } = req.params;
        const account = await socialMediaService.syncAccount(platform, userId);
        res.status(200).json(account);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const removeAccount = async (req, res) => {
    try {
        const { accountId } = req.params;
        await socialMediaService.removeAccount(accountId);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getAnalytics = async (req, res) => {
    try {
        const { userId } = req.params;
        const analytics = await socialMediaService.getAnalytics(userId);
        res.status(200).json(analytics);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getPlatformStats = async (req, res) => {
    try {
        const stats = await socialMediaService.getPlatformStats();
        res.status(200).json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    linkAccount,
    getLinkedAccounts,
    syncAccount,
    removeAccount,
    getAnalytics,
    getPlatformStats,
};
