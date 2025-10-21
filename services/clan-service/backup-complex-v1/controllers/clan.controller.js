
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Middleware to populate req.user from headers if not already set
function userFromHeaders(req, res, next) {
    if (!req.user && req.headers['x-user-id']) {
        req.user = {
            id: req.headers['x-user-id'],
            email: req.headers['x-user-email'],
            roles: req.headers['x-user-roles'] ? req.headers['x-user-roles'].split(',') : [],
            isAdmin: req.headers['x-user-is-admin'] === 'true',
        };
    }
    next();
}

// Create a new clan
async function createClan(req, res) {


    try {
        const { name, visibility = 'public' } = req.body;
        // Use authenticated user as owner
        const ownerId = req.user && req.user.id;
        if (!name || !ownerId) {
            return res.status(400).json({ success: false, error: 'name and authenticated user required' });
        }
        const clan = await prisma.clan.create({
            data: {
                name,
                ownerId,
                visibility,
                members: [ownerId],
                gigsDone: [],
            },
        });
        res.status(201).json({ success: true, data: { clan } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to create clan', details: error.message });
    }
}

// Add a member to a clan
async function addMember(req, res) {
    try {
        const { id } = req.params;
        // Only allow the authenticated user to add themselves
        const userId = req.user && req.user.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        // Check if already a member
        const clan = await prisma.clan.findUnique({ where: { id } });
        if (!clan) return res.status(404).json({ success: false, error: 'Clan not found' });
        if (clan.members.includes(userId)) {
            return res.status(400).json({ success: false, error: 'User already a member' });
        }
        const updatedClan = await prisma.clan.update({
            where: { id },
            data: {
                members: { push: userId },
            },
        });
        res.json({ success: true, data: { clan: updatedClan } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to add member', details: error.message });
    }
}

// Remove a member from a clan
async function removeMember(req, res) {
    try {
        const { id } = req.params;
        // Only allow the authenticated user to remove themselves
        const userId = req.user && req.user.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        const clan = await prisma.clan.findUnique({ where: { id } });
        if (!clan) return res.status(404).json({ success: false, error: 'Clan not found' });
        if (!clan.members.includes(userId)) return res.status(400).json({ success: false, error: 'User not a member' });
        const updatedMembers = clan.members.filter(m => m !== userId);
        const updatedClan = await prisma.clan.update({
            where: { id },
            data: { members: updatedMembers },
        });
        res.json({ success: true, data: { clan: updatedClan } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to remove member', details: error.message });
    }
}

// Set clan visibility
async function setVisibility(req, res) {
    try {
        const { id } = req.params;
        const { visibility } = req.body;
        if (!['public', 'private'].includes(visibility)) {
            return res.status(400).json({ success: false, error: 'Invalid visibility' });
        }
        // Only allow the clan owner to change visibility
        const userId = req.user && req.user.id;
        const clan = await prisma.clan.findUnique({ where: { id } });
        if (!clan) return res.status(404).json({ success: false, error: 'Clan not found' });
        if (clan.ownerId !== userId) {
            return res.status(403).json({ success: false, error: 'Only the clan owner can change visibility' });
        }
        const updatedClan = await prisma.clan.update({
            where: { id },
            data: { visibility },
        });
        res.json({ success: true, data: { clan: updatedClan } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to set visibility', details: error.message });
    }
}

// Clan dashboard
async function clanDashboard(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user && req.user.id;
        const clan = await prisma.clan.findUnique({ where: { id } });
        if (!clan) return res.status(404).json({ success: false, error: 'Clan not found' });
        // Only allow members to view dashboard
        if (!clan.members.includes(userId)) {
            return res.status(403).json({ success: false, error: 'Only members can view clan dashboard' });
        }
        // For demo, gigsDone is just an array of gig IDs. In production, join with gig-service.
        res.json({
            success: true,
            data: {
                id: clan.id,
                name: clan.name,
                members: clan.members,
                visibility: clan.visibility,
                gigsDone: clan.gigsDone,
                createdAt: clan.createdAt,
                updatedAt: clan.updatedAt,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard', details: error.message });
    }
}

module.exports = {
    userFromHeaders,
    createClan,
    addMember,
    removeMember,
    setVisibility,
    clanDashboard,
};
