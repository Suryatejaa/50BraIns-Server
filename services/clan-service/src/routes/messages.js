/**
 * Message routes for clan chat and gig sharing
 */

const express = require('express');
const messageService = require('../services/message.service');
const { requireAuth, requireClanMembership } = require('../middleware/auth');

const router = express.Router();

// Get clan messages (chat) - updated to use new service
router.get('/:clanId/messages', requireClanMembership, async (req, res) => {
    try {
        const { clanId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const messages = await messageService.getClanMessages(clanId, parseInt(limit), parseInt(offset));
        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error getting clan messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send message to clan - updated to use new service
router.post('/:clanId/messages', requireClanMembership, async (req, res) => {
    try {
        const { clanId } = req.params;
        const { content, messageType = 'TEXT' } = req.body;
        const userId = req.user?.id || req.headers['x-user-id'];

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        const message = await messageService.createMessage({
            content,
            userId,
            clanId,
            messageType
        });

        res.status(201).json({ success: true, message });
    } catch (error) {
        console.error('Error sending message:', error);
        if (error.message.includes('Message content is required')) {
            res.status(400).json({ success: false, error: error.message });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
});

// Get message by ID
router.get('/messages/:messageId', requireClanMembership, async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await messageService.getMessageById(messageId);

        if (!message) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        res.json({ success: true, message });
    } catch (error) {
        console.error('Error getting message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark message as delivered
router.post('/messages/:messageId/deliver', requireClanMembership, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.id || req.headers['x-user-id'];

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        await messageService.markAsDelivered(messageId, userId);
        res.json({ success: true, message: 'Message marked as delivered' });
    } catch (error) {
        console.error('Error marking message as delivered:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark message as read
router.post('/messages/:messageId/read', requireClanMembership, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.id || req.headers['x-user-id'];

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        await messageService.markAsRead(messageId, userId);
        res.json({ success: true, message: 'Message marked as read' });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get message status
router.get('/messages/:messageId/status', requireClanMembership, async (req, res) => {
    try {
        const { messageId } = req.params;
        const status = await messageService.getMessageStatus(messageId);

        res.json({ success: true, status });
    } catch (error) {
        console.error('Error getting message status:', error);
        if (error.message.includes('Message not found')) {
            res.status(404).json({ success: false, error: error.message });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
});

// Get read receipts for a message
router.get('/messages/:messageId/read-receipts', requireClanMembership, async (req, res) => {
    try {
        const { messageId } = req.params;
        const readReceipts = await messageService.getReadReceipts(messageId);

        res.json({ success: true, readReceipts });
    } catch (error) {
        console.error('Error getting read receipts:', error);
        if (error.message.includes('Message not found')) {
            res.status(404).json({ success: false, error: error.message });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
});

// Bulk mark messages as delivered
router.post('/messages/bulk-deliver', requireClanMembership, async (req, res) => {
    try {
        const { messageIds } = req.body;
        const userId = req.user?.id || req.headers['x-user-id'];

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        if (!messageIds || !Array.isArray(messageIds)) {
            return res.status(400).json({
                success: false,
                error: 'Message IDs array is required'
            });
        }

        await messageService.markMultipleAsDelivered(messageIds, userId);
        res.json({ success: true, message: `${messageIds.length} messages marked as delivered` });
    } catch (error) {
        console.error('Error bulk marking messages as delivered:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk mark messages as read
router.post('/messages/bulk-read', requireClanMembership, async (req, res) => {
    try {
        const { messageIds } = req.body;
        const userId = req.user?.id || req.headers['x-user-id'];

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        if (!messageIds || !Array.isArray(messageIds)) {
            return res.status(400).json({
                success: false,
                error: 'Message IDs array is required'
            });
        }

        await messageService.markMultipleAsRead(messageIds, userId);
        res.json({ success: true, message: `${messageIds.length} messages marked as read` });
    } catch (error) {
        console.error('Error bulk marking messages as read:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get message statistics for a clan - updated to use new service
router.get('/:clanId/message-stats', requireClanMembership, async (req, res) => {
    try {
        const { clanId } = req.params;
        const stats = await messageService.getClanMessageStats(clanId);
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Error getting message stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete a message (only by sender or clan admin) - updated to use new service
router.delete('/:clanId/messages/:messageId', requireClanMembership, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?.id || req.headers['x-user-id'];

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        await messageService.deleteMessage(messageId, userId);
        res.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        if (error.message.includes('Message not found')) {
            res.status(404).json({ success: false, error: error.message });
        } else if (error.message.includes('Unauthorized')) {
            res.status(403).json({ success: false, error: error.message });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
});

// Get message with detailed status information
router.get('/messages/:messageId/details', requireClanMembership, async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await messageService.getMessageWithDetails(messageId);
        res.json({ success: true, message });
    } catch (error) {
        console.error('Error getting message details:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get message delivery details for all clan members
router.get('/messages/:messageId/delivery-details', requireClanMembership, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { clanId } = req.query;

        if (!clanId) {
            return res.status(400).json({
                success: false,
                error: 'Clan ID is required'
            });
        }

        const deliveryDetails = await messageService.getMessageDeliveryDetails(messageId, clanId);
        res.json({ success: true, deliveryDetails });
    } catch (error) {
        console.error('Error getting delivery details:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get clan message summary and statistics
router.get('/:clanId/message-summary', requireClanMembership, async (req, res) => {
    try {
        const { clanId } = req.params;
        const summary = await messageService.getClanMessageSummary(clanId);
        res.json({ success: true, summary });
    } catch (error) {
        console.error('Error getting message summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
