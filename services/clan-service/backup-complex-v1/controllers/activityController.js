const databaseService = require('../services/database');
const rabbitmqService = require('../services/rabbitmqService');

function ensureMemberOrHead(clan, userId) {
    return !!clan && clan.members?.some((m) => m.userId === userId && m.status === 'ACTIVE');
}

function ensureHeadOrAdmin(clan, userId) {
    return !!clan && clan.members?.some((m) => m.userId === userId && (m.role === 'HEAD' || m.role === 'ADMIN') && m.status === 'ACTIVE');
}

class ActivityController {
    async createActivity(req, res) {
        try {
            const { id: clanId } = req.params;
            const { type, content, attachments = [], pollOptions } = req.body;
            const userId = req.user.id;

            const prisma = await databaseService.getClient();

            const clan = await prisma.clan.findUnique({
                where: { id: clanId },
                include: {
                    members: { select: { userId: true, role: true, status: true } }
                }
            });
            if (!clan) return res.status(404).json({ success: false, error: 'Clan not found' });
            if (!ensureMemberOrHead(clan, userId)) return res.status(403).json({ success: false, error: 'Not a clan member' });

            if (!type || !content) return res.status(400).json({ success: false, error: 'type and content are required' });
            if (type === 'poll' && (!Array.isArray(pollOptions) || pollOptions.length < 2)) {
                return res.status(400).json({ success: false, error: 'pollOptions must have at least 2 options' });
            }

            const activity = await prisma.clanActivity.create({
                data: {
                    clanId,
                    userId,
                    type,
                    content,
                    attachments,
                    pollOptions: type === 'poll' ? pollOptions : []
                }
            });

            try {
                await rabbitmqService.publishEvent('clan.activity.new', {
                    clanId,
                    activityId: activity.id,
                    type: activity.type,
                    userId
                });
            } catch (e) {
                // non-blocking
            }

            res.status(201).json({ success: true, data: activity });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async getActivities(req, res) {
        try {
            const { id: clanId } = req.params;
            const { page = 1, limit = 20 } = req.query;
            const prisma = await databaseService.getClient();

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const skip = (pageNum - 1) * limitNum;

            const [total, items] = await Promise.all([
                prisma.clanActivity.count({ where: { clanId } }),
                prisma.clanActivity.findMany({
                    where: { clanId },
                    orderBy: [
                        { isPinned: 'desc' },
                        { createdAt: 'desc' }
                    ],
                    skip,
                    take: limitNum
                })
            ]);

            res.json({
                success: true,
                data: items,
                meta: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async updateActivity(req, res) {
        try {
            const { activityId } = req.params;
            const { content, attachments, pollOptions } = req.body;
            const userId = req.user.id;
            const prisma = await databaseService.getClient();

            const activity = await prisma.clanActivity.findUnique({ where: { id: activityId } });
            if (!activity) return res.status(404).json({ success: false, error: 'Activity not found' });
            if (activity.userId !== userId) return res.status(403).json({ success: false, error: 'Not allowed' });

            const updated = await prisma.clanActivity.update({
                where: { id: activityId },
                data: {
                    ...(content !== undefined ? { content } : {}),
                    ...(attachments !== undefined ? { attachments } : {}),
                    ...(activity.type === 'poll' && pollOptions !== undefined ? { pollOptions } : {})
                }
            });

            try {
                await rabbitmqService.publishEvent('clan.activity.update', {
                    clanId: updated.clanId,
                    activityId: updated.id,
                    userId
                });
            } catch (e) { }

            res.json({ success: true, data: updated });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async deleteActivity(req, res) {
        try {
            const { activityId } = req.params;
            const userId = req.user.id;
            const prisma = await databaseService.getClient();

            const activity = await prisma.clanActivity.findUnique({ where: { id: activityId } });
            if (!activity) return res.status(404).json({ success: false, error: 'Activity not found' });
            if (activity.userId !== userId) return res.status(403).json({ success: false, error: 'Not allowed' });

            await prisma.clanActivity.delete({ where: { id: activityId } });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async togglePin(req, res) {
        try {
            const { activityId } = req.params;
            const userId = req.user.id;
            const prisma = await databaseService.getClient();

            const activity = await prisma.clanActivity.findUnique({ where: { id: activityId } });
            if (!activity) return res.status(404).json({ success: false, error: 'Activity not found' });

            const clan = await prisma.clan.findUnique({
                where: { id: activity.clanId },
                include: { members: { select: { userId: true, role: true, status: true } } }
            });
            if (!ensureHeadOrAdmin(clan, userId)) return res.status(403).json({ success: false, error: 'Only clan head/admin can pin' });

            const updated = await prisma.clanActivity.update({
                where: { id: activityId },
                data: { isPinned: !activity.isPinned }
            });

            res.json({ success: true, data: updated });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async vote(req, res) {
        try {
            const { activityId } = req.params;
            const { optionIndex } = req.body;
            const userId = req.user.id;
            const prisma = await databaseService.getClient();

            const activity = await prisma.clanActivity.findUnique({ where: { id: activityId } });
            if (!activity) return res.status(404).json({ success: false, error: 'Activity not found' });
            if (activity.type !== 'poll') return res.status(400).json({ success: false, error: 'Not a poll' });
            if (typeof optionIndex !== 'number') return res.status(400).json({ success: false, error: 'optionIndex required' });
            if (!activity.pollOptions || optionIndex < 0 || optionIndex >= activity.pollOptions.length) {
                return res.status(400).json({ success: false, error: 'Invalid optionIndex' });
            }

            // Upsert vote (unique per activityId+userId)
            const vote = await prisma.clanActivityVote.upsert({
                where: { activityId_userId: { activityId, userId } },
                update: { optionIndex },
                create: { activityId, userId, optionIndex }
            });

            res.json({ success: true, data: vote });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = new ActivityController();


