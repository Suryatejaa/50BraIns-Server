// gig-service/src/controllers/campaignHistory.controller.js

const { PrismaClient } = require('@prisma/client');
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

// Get brand's campaign history
exports.getBrandCampaigns = async (req, res) => {
  try {
    const { brandId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    // Build WHERE clause with indexed fields first
    const where = { brandId };
    if (status) where.status = status;

    // Execute queries in parallel with performance monitoring
    const [campaigns, total] = await Promise.all([
      measureQueryPerformance('getBrandCampaigns_findMany', () =>
        prisma.campaignHistory.findMany({
          where,
          select: {
            id: true,
            gigId: true,
            brandId: true,
            campaignTitle: true,
            campaignDescription: true,
            campaignType: true,
            budget: true,
            gigPrice: true,
            createdAt: true,
            publishedAt: true,
            startDate: true,
            endDate: true,
            closedAt: true,
            status: true,
            totalApplications: true,
            acceptedApplications: true,
            rejectedApplications: true,
            completedWorks: true,
            totalSpent: true,
            avgCompletionTime: true,
            totalReach: true,
            totalEngagement: true,
            conversionRate: true,
            roi: true,
            avgInfluencerRating: true,
            avgBrandRating: true,
            tags: true,
            notes: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset)
        })
      ),
      measureQueryPerformance('getBrandCampaigns_count', () =>
        prisma.campaignHistory.count({ where })
      )
    ]);

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
};

// Get campaign analytics
exports.getCampaignAnalytics = async (req, res) => {
  try {
    const { brandId } = req.params;

    // Use indexed field (brandId) for optimal performance
    const analytics = await measureQueryPerformance('getCampaignAnalytics_aggregate', () =>
      prisma.campaignHistory.aggregate({
        where: { brandId },
        _sum: {
          totalSpent: true,
          totalApplications: true,
          completedWorks: true
        },
        _avg: {
          avgInfluencerRating: true,
          roi: true
        },
        _count: {
          id: true
        }
      })
    );

    res.json({
      success: true,
      data: {
        totalCampaigns: analytics._count.id,
        totalSpent: analytics._sum.totalSpent || 0,
        totalApplications: analytics._sum.totalApplications || 0,
        completedWorks: analytics._sum.completedWorks || 0,
        avgInfluencerRating: analytics._avg.avgInfluencerRating || 0,
        avgROI: analytics._avg.roi || 0
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Update campaign metrics (called when gig events happen)
exports.updateCampaignMetrics = async (req, res) => {
  try {
    const { gigId } = req.params;
    const { field, increment } = req.body;

    const updated = await prisma.campaignHistory.update({
      where: { gigId },
      data: {
        [field]: {
          increment: increment || 1
        },
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Error updating campaign metrics:', error);
    res.status(500).json({ error: 'Failed to update metrics' });
  }
};
