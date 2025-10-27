// gig-service/src/controllers/workHistory.controller.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get applicant's work history
exports.getApplicantHistory = async (req, res) => {
  try {
    const { applicantId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    const where = { applicantId };
    if (status) where.applicationStatus = status;

    const history = await prisma.applicationWorkHistory.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        // You can add relations if you have Gig model
      }
    });

    const total = await prisma.applicationWorkHistory.count({ where });

    res.json({
      success: true,
      data: history,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching work history:', error);
    res.status(500).json({ error: 'Failed to fetch work history' });
  }
};

// Get applicant's earnings summary
exports.getApplicantEarnings = async (req, res) => {
  try {
    const { applicantId } = req.params;

    const summary = await prisma.applicationWorkHistory.aggregate({
      where: {
        applicantId,
        paymentStatus: 'PAID'
      },
      _sum: {
        paymentAmount: true
      },
      _count: {
        id: true
      },
      _avg: {
        paymentAmount: true
      }
    });

    res.json({
      success: true,
      data: {
        totalEarnings: summary._sum.paymentAmount || 0,
        completedGigs: summary._count.id,
        averageEarning: summary._avg.paymentAmount || 0
      }
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
};

// Update work history (called when application status changes)
exports.updateWorkHistory = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const updateData = req.body;

    // Auto-update lastActivityAt
    updateData.lastActivityAt = new Date();

    const updated = await prisma.applicationWorkHistory.update({
      where: { applicationId },
      data: updateData
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating work history:', error);
    res.status(500).json({ error: 'Failed to update work history' });
  }
};
