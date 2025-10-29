// gig-service/src/controllers/workHistory.controller.js

const { PrismaClient } = require('@prisma/client');
const gigCacheService = require('../services/gigCacheService');
const prisma = new PrismaClient();

// Helper function for performance monitoring
const measureQueryPerformance = async (queryName, queryFn) => {
  const startTime = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Slow query detected - ${queryName}: ${duration}ms`);
    }
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Query failed - ${queryName}: ${duration}ms`, error.message);
    throw error;
  }
};

// Get applicant's work history
exports.getApplicantHistory = async (req, res) => {
  try {
    const { applicantId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    // Create cache key with all parameters
    const cacheKey = gigCacheService.generateKey('applicant_history', applicantId, `${status || 'all'}_${limit}_${offset}`);

    // Use cache-first approach
    const historyData = await gigCacheService.getList(cacheKey, async () => {
      // Build WHERE clause with most selective conditions first for better index usage
      const where = { applicantId };
      if (status) where.applicationStatus = status;

      // Execute queries in parallel with performance monitoring
      const [history, total] = await Promise.all([
        measureQueryPerformance('getApplicantHistory_findMany', () =>
          prisma.applicationWorkHistory.findMany({
            where,
            select: {
              id: true,
              applicationId: true,
              gigId: true,
              applicantId: true,
              gigOwnerId: true,
              gigPrice: true,
              quotedPrice: true,
              appliedAt: true,
              acceptedAt: true,
              rejectedAt: true,
              applicationStatus: true,
              workSubmittedAt: true,
              workReviewedAt: true,
              submissionStatus: true,
              completedAt: true,
              paidAt: true,
              paymentAmount: true,
              paymentStatus: true,
              revisionCount: true,
              lastActivityAt: true,
              createdAt: true,
              updatedAt: true
            },
            orderBy: { appliedAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
          })
        ),
        measureQueryPerformance('getApplicantHistory_count', () =>
          prisma.applicationWorkHistory.count({ where })
        )
      ]);

      return {
        history,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      };
    }, 600); // 10 minute TTL for history data

    res.json({
      success: true,
      data: historyData.history,
      pagination: historyData.pagination
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

    // Create cache key for earnings
    const cacheKey = gigCacheService.generateKey('applicant_earnings', applicantId);

    // Use cache-first approach
    const earningsData = await gigCacheService.getEntity('applicant_earnings', applicantId, async () => {
      // Order WHERE clause for optimal index usage: applicantId (indexed) + paymentStatus (indexed)
      const summary = await measureQueryPerformance('getApplicantEarnings_aggregate', () =>
        prisma.applicationWorkHistory.aggregate({
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
        })
      );

      return {
        totalEarnings: summary._sum.paymentAmount || 0,
        completedGigs: summary._count.id,
        averageEarning: summary._avg.paymentAmount || 0
      };
    }, 1800); // 30 minute TTL for earnings data

    res.json({
      success: true,
      data: earningsData
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

    // Invalidate related caches
    if (updated.applicantId) {
      await gigCacheService.invalidatePattern(`applicant_history:${updated.applicantId}:*`);
      await gigCacheService.invalidatePattern(`applicant_earnings:${updated.applicantId}`);
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating work history:', error);
    res.status(500).json({ error: 'Failed to update work history' });
  }
};
