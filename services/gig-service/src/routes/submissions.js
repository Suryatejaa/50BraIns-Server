const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gigController');
const applicationController = require('../controllers/application.controller');
const { requireAuth, asyncHandler } = require('../middleware');
const { getUploadUrl } = require('../services/r2.services');
// Submission routes
// POST /submissions/:id/review - Review a submission (approve/reject/request revision)
router.post('/:id/review', requireAuth, asyncHandler(applicationController.reviewSubmission));

// POST /submissions/upload-url - Get upload URL for final submissions
router.post('/upload-url', requireAuth, async (req, res) => {
    try {
        const { applicationId, fileName } = req.body;

        const uploadData = await getUploadUrl(fileName, applicationId);
        res.json({ success: true, data: uploadData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /submissions/delivery-upload-url - Get upload URL for delivery files (brand review)
router.post('/delivery-upload-url', requireAuth, async (req, res) => {
    try {
        const { applicationId, fileName } = req.body;

        // Use different path for delivery files
        const key = `deliveries/${applicationId}/${Date.now()}-${fileName}`;
        const uploadData = await getUploadUrl(fileName, applicationId, key);
        res.json({ success: true, data: uploadData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;
