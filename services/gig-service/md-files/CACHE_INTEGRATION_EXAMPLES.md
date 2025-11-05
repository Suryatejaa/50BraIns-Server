# Sample Cache Integration Examples

This file shows how to integrate Redis caching into existing controllers using the new cache architecture.

## 📝 Controller Integration Examples

### 1. GigController Integration

```javascript
const gigCacheService = require('../services/gigCacheService');

class GigController {
    constructor() {
        this.prisma = databaseService.getClient();
        this.cache = gigCacheService;
    }

    // Example: Get single gig with caching
    getGigById = async (req, res) => {
        try {
            const { id } = req.params;

            // Use cache-first approach
            const gig = await this.cache.getGig(id, async () => {
                return await this.measureQueryPerformance('getGigById', async () => {
                    return await this.prisma.gig.findUnique({
                        where: { id },
                        select: this.getOptimizedGigSelect(),
                        include: {
                            applications: {
                                select: {
                                    id: true,
                                    applicantId: true,
                                    status: true,
                                    appliedAt: true
                                }
                            }
                        }
                    });
                });
            });

            if (!gig) {
                return res.status(404).json({ error: 'Gig not found' });
            }

            // Cache recently viewed for user
            if (req.user?.id) {
                await this.cache.cacheRecentlyViewed(req.user.id, id);
            }

            res.json({ success: true, gig });

        } catch (error) {
            console.error('Error fetching gig:', error);
            res.status(500).json({ error: 'Failed to fetch gig' });
        }
    };

    // Example: Get user's draft gigs with caching
    getMyDrafts = async (req, res) => {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;

            const drafts = await this.cache.getUserGigs(userId, async () => {
                return await this.measureQueryPerformance('getMyDrafts', async () => {
                    return await this.prisma.gig.findMany({
                        where: {
                            postedById: userId,
                            status: 'DRAFT'
                        },
                        select: this.getOptimizedGigSelect(),
                        orderBy: { updatedAt: 'desc' },
                        skip: (page - 1) * limit,
                        take: parseInt(limit)
                    });
                });
            }, 'drafts');

            res.json({ success: true, drafts, page: parseInt(page) });

        } catch (error) {
            console.error('Error fetching drafts:', error);
            res.status(500).json({ error: 'Failed to fetch draft gigs' });
        }
    };

    // Example: Update gig with cache invalidation
    updateGig = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const updateData = req.body;

            // Perform database update
            const updatedGig = await this.prisma.gig.update({
                where: { 
                    id,
                    postedById: userId // Ensure user owns the gig
                },
                data: updateData,
                select: this.getOptimizedGigSelect()
            });

            // Invalidate related caches
            await this.cache.invalidateGig(id, userId);

            res.json({ success: true, gig: updatedGig });

        } catch (error) {
            console.error('Error updating gig:', error);
            res.status(500).json({ error: 'Failed to update gig' });
        }
    };

    // Example: Search gigs with caching
    searchGigs = async (req, res) => {
        try {
            const searchParams = {
                query: req.query.q,
                category: req.query.category,
                roleRequired: req.query.role,
                budgetMin: req.query.budgetMin,
                budgetMax: req.query.budgetMax,
                location: req.query.location,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20
            };

            // Try to get cached results first
            let results = await this.cache.getCachedSearchResults(searchParams);

            if (!results) {
                // Perform database search
                results = await this.measureQueryPerformance('searchGigs', async () => {
                    return await this.prisma.gig.findMany({
                        where: this.buildOptimizedGigWhere({
                            status: 'OPEN',
                            isPublic: true
                        }, searchParams),
                        select: this.getOptimizedGigSelect(),
                        orderBy: { createdAt: 'desc' },
                        skip: (searchParams.page - 1) * searchParams.limit,
                        take: searchParams.limit
                    });
                });

                // Cache the results
                await this.cache.cacheSearchResults(searchParams, results);
            }

            res.json({ success: true, gigs: results, searchParams });

        } catch (error) {
            console.error('Error searching gigs:', error);
            res.status(500).json({ error: 'Failed to search gigs' });
        }
    };
}
```

### 2. ApplicationController Integration

```javascript
const gigCacheService = require('../services/gigCacheService');

class ApplicationController {
    constructor() {
        this.prisma = databaseService.getClient();
        this.cache = gigCacheService;
    }

    // Example: Apply to gig with cache invalidation
    applyToGig = async (req, res) => {
        try {
            const { gigId } = req.params;
            const applicantId = req.user.id;
            const applicationData = req.body;

            // Check for existing application (with cache)
            const existingApp = await this.cache.getApplication(`${applicantId}_${gigId}`, async () => {
                return await this.prisma.application.findUnique({
                    where: {
                        applicantId_gigId: {
                            applicantId,
                            gigId
                        }
                    }
                });
            });

            if (existingApp) {
                return res.status(400).json({ error: 'Application already exists' });
            }

            // Create new application
            const application = await this.prisma.application.create({
                data: {
                    gigId,
                    applicantId,
                    ...applicationData
                },
                include: {
                    gig: {
                        select: {
                            title: true,
                            postedById: true
                        }
                    }
                }
            });

            // Invalidate related caches
            await this.cache.invalidateApplication(application.id, gigId, applicantId);

            res.status(201).json({ success: true, application });

        } catch (error) {
            console.error('Error applying to gig:', error);
            res.status(500).json({ error: 'Failed to apply to gig' });
        }
    };

    // Example: Get user's applications with caching
    getMyApplications = async (req, res) => {
        try {
            const userId = req.user.id;
            const { status, page = 1, limit = 10 } = req.query;

            const applications = await this.cache.getUserApplications(userId, async () => {
                return await this.measureQueryPerformance('getMyApplications', async () => {
                    return await this.prisma.application.findMany({
                        where: {
                            applicantId: userId,
                            ...(status && { status })
                        },
                        include: {
                            gig: {
                                select: {
                                    id: true,
                                    title: true,
                                    budgetMin: true,
                                    budgetMax: true,
                                    status: true,
                                    deadline: true
                                }
                            }
                        },
                        orderBy: { appliedAt: 'desc' },
                        skip: (page - 1) * limit,
                        take: parseInt(limit)
                    });
                });
            }, status);

            res.json({ success: true, applications, page: parseInt(page) });

        } catch (error) {
            console.error('Error fetching applications:', error);
            res.status(500).json({ error: 'Failed to fetch applications' });
        }
    };

    // Example: Get gig applications (for gig owner) with caching
    getReceivedApplications = async (req, res) => {
        try {
            const { gigId } = req.params;
            const userId = req.user.id;

            // Verify gig ownership first
            const gig = await this.cache.getGig(gigId, async () => {
                return await this.prisma.gig.findUnique({
                    where: { id: gigId },
                    select: { postedById: true }
                });
            });

            if (!gig || gig.postedById !== userId) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            const applications = await this.cache.getGigApplications(gigId, async () => {
                return await this.measureQueryPerformance('getReceivedApplications', async () => {
                    return await this.prisma.application.findMany({
                        where: { gigId },
                        include: {
                            // Include applicant details from user service
                        },
                        orderBy: { appliedAt: 'desc' }
                    });
                });
            });

            res.json({ success: true, applications });

        } catch (error) {
            console.error('Error fetching gig applications:', error);
            res.status(500).json({ error: 'Failed to fetch applications' });
        }
    };
}
```

### 3. Cache Initialization in Main App

```javascript
// src/index.js
const express = require('express');
const gigCacheService = require('./services/gigCacheService');

const app = express();

// Initialize cache service
async function startServer() {
    try {
        // Initialize cache
        await gigCacheService.initialize();
        
        // Setup routes
        app.use('/api/gigs', gigRoutes);
        app.use('/api/applications', applicationRoutes);
        
        // Health check endpoint with cache status
        app.get('/health', async (req, res) => {
            const cacheHealth = await gigCacheService.getHealthStatus();
            const dbHealth = await databaseService.healthCheck();
            
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                services: {
                    database: dbHealth,
                    cache: cacheHealth
                }
            });
        });

        const PORT = process.env.PORT || 4004;
        app.listen(PORT, () => {
            console.log(`🚀 Gig Service running on port ${PORT}`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM signal, shutting down gracefully...');
    await gigCacheService.shutdown();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT signal, shutting down gracefully...');
    await gigCacheService.shutdown();
    process.exit(0);
});

startServer();
```

### 4. Cache Monitoring Endpoint

```javascript
// Add to your routes
app.get('/cache/metrics', (req, res) => {
    const metrics = gigCacheService.getMetrics();
    res.json({
        success: true,
        metrics: {
            ...metrics,
            timestamp: new Date().toISOString()
        }
    });
});

app.post('/cache/reset-metrics', (req, res) => {
    gigCacheService.resetMetrics();
    res.json({ success: true, message: 'Cache metrics reset' });
});

app.delete('/cache/search', async (req, res) => {
    await gigCacheService.clearSearchCaches();
    res.json({ success: true, message: 'Search caches cleared' });
});
```

## 🚀 Implementation Strategy

### Phase 1: Foundation (Current)
1. ✅ Redis configuration and connection
2. ✅ Central cache manager
3. ✅ Gig-specific cache service
4. ✅ Sample integration patterns

### Phase 2: Controller Integration (Next Steps)
1. Update GigController with caching for:
   - `getGigById` (single gig fetch)
   - `getMyDrafts` (user's draft gigs)
   - `searchGigs` (search results)
   - `getFeaturedGigs` (featured content)

2. Update ApplicationController with caching for:
   - `getMyApplications` (user's applications)
   - `getReceivedApplications` (gig applications)
   - `applyToGig` (with cache invalidation)

### Phase 3: Advanced Features
1. Event-driven cache invalidation
2. Warm-up strategies for popular content
3. Performance monitoring and alerting
4. Cache-aside pattern optimization

## 🎯 Expected Performance Gains

### Before (Database Only)
- Single gig fetch: ~200ms
- User gig lists: ~500ms
- Search queries: ~800ms
- Application lists: ~400ms

### After (With Redis Cache)
- Single gig fetch: ~20ms (90% improvement)
- User gig lists: ~50ms (90% improvement)
- Search queries: ~100ms (87% improvement)
- Application lists: ~40ms (90% improvement)

### Database Load Reduction
- Read queries: 60-80% reduction
- Complex searches: 85% reduction
- User dashboard: 70% reduction