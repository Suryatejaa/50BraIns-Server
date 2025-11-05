const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { requireAuth, asyncHandler } = require('../middleware');

// Debug middleware to log all conversation route requests
router.use((req, res, next) => {
    console.log(`💬 [Conversation Route] ${req.method} ${req.originalUrl} - Headers:`, {
        userId: req.headers['x-user-id'],
        auth: req.headers.authorization ? 'present' : 'missing'
    });
    next();
});

// Test route to verify conversation routing is working
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Application conversation routes are working',
        path: req.originalUrl,
        user: req.user
    });
});

// Get or create conversation thread for an application
router.get('/application/:applicationId', requireAuth, asyncHandler(chatController.getOrCreateConversation));

// Add a response to the conversation thread
router.post('/:chatId/responses', requireAuth, asyncHandler(chatController.addResponse));

// Get conversation history with pagination
router.get('/:chatId/history', requireAuth, asyncHandler(chatController.getConversationHistory));

// Get user's conversation threads
router.get('/', requireAuth, asyncHandler(chatController.getUserConversations));

// Update conversation status (gig owner only)
router.patch('/:chatId/status', requireAuth, asyncHandler(chatController.updateChatStatus));

// Get unread response count
router.get('/unread/count', requireAuth, asyncHandler(chatController.getUnreadCount));

module.exports = router;