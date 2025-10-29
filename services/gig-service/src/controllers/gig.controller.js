const { json } = require('stream/consumers');
const databaseService = require('../services/database');
const rabbitmqService = require('../services/rabbitmqService');
const gigCacheService = require('../services/gigCacheService');
const Joi = require('joi');
const { title } = require('process');
const { isPromise } = require('util/types');
class GigController {
    constructor() {
        this.prisma = databaseService.getClient();
        this.cache = gigCacheService;
    }

    // Helper function for performance monitoring
    measureQueryPerformance = async (queryName, queryFn) => {
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

    //=================================================================
    //======================== VALIDATION SCHEMAS =========================
    //=================================================================

    // Validation schemas
    static createGigSchema = Joi.object({
        title: Joi.string().min(5).max(200).required(),
        description: Joi.string().min(10).max(2000).required(),
        budgetMin: Joi.number().min(0).optional(),
        budgetMax: Joi.number().min(0).optional(),
        budgetType: Joi.string().valid('fixed', 'hourly', 'negotiable').default('fixed'),
        roleRequired: Joi.string().required(),
        experienceLevel: Joi.string().valid('beginner', 'intermediate', 'expert').default('intermediate'),
        skillsRequired: Joi.array().items(Joi.string()).default([]),
        isClanAllowed: Joi.boolean().default(true),
        location: Joi.string().optional(),
        duration: Joi.string().optional(),
        urgency: Joi.string().valid('urgent', 'normal', 'flexible').default('normal'),
        category: Joi.string().required(),
        deliverables: Joi.array().items(Joi.string()).default([]),
        requirements: Joi.string().optional().allow(null, ''),
        deadline: Joi.date().iso().optional(),
        isPublic: Joi.boolean().default(true),
        // Gig type and address fields
        gigType: Joi.string().valid('PRODUCT', 'VISIT', 'REMOTE').default('REMOTE'),
        address: Joi.string().when('gigType', {
            is: 'VISIT',
            then: Joi.required(),
            otherwise: Joi.optional()
        }),
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional(),

        // Enhanced fields for frontend compatibility
        tags: Joi.array().items(Joi.string()).optional(), // Will be merged with skillsRequired
        platformRequirements: Joi.array().items(Joi.string()).optional(),
        followerRequirements: Joi.array().items(Joi.object({
            platform: Joi.string().required(),
            minFollowers: Joi.number().min(0).required()
        })).optional(),
        locationRequirements: Joi.array().items(Joi.string()).optional(),
        campaignDuration: Joi.string().optional(), // Alias for duration
        maxApplications: Joi.number().min(1).optional()
    });

    static applyGigSchema = Joi.object({
        proposal: Joi.string().min(10).max(1000).optional(),
        quotedPrice: Joi.number().min(0).optional(),
        estimatedTime: Joi.string().optional(),
        portfolio: Joi.array().items(Joi.string().uri()).default([]),
        applicantType: Joi.string().valid('user', 'clan').required(),
        clanId: Joi.string().optional(),
        clanSlug: Joi.string().optional(),
        upiId: Joi.string().pattern(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/).required().messages({
            'string.pattern.base': 'UPI ID must be in valid format (e.g., user@paytm, user@gpay)',
            'any.required': 'UPI ID is required for payment processing'
        }),

        // Address field for PRODUCT type gigs
        address: Joi.string().optional(), // Will be validated dynamically based on gig type
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional(),

        teamPlan: Joi.array().items(Joi.object({
            role: Joi.string().required(),
            memberId: Joi.string().optional(),
            username: Joi.string().optional(),
            email: Joi.string().email().optional(),
            hours: Joi.number().min(0).optional(),
            deliverables: Joi.array().items(Joi.string()).default([])
        }).or('memberId', 'username', 'email')).when('applicantType', { is: 'clan', then: Joi.required(), otherwise: Joi.forbidden() }),
        milestonePlan: Joi.array().items(Joi.object({
            title: Joi.string().required(),
            dueAt: Joi.date().iso().required(),
            amount: Joi.number().min(0).required(),
            deliverables: Joi.array().items(Joi.string()).default([])
        })).when('applicantType', { is: 'clan', then: Joi.required(), otherwise: Joi.forbidden() }),
        payoutSplit: Joi.array().items(Joi.object({
            memberId: Joi.string().optional(),
            username: Joi.string().optional(),
            email: Joi.string().email().optional(),
            percentage: Joi.number().min(0).max(100).optional(),
            fixedAmount: Joi.number().min(0).optional()
        }).or('memberId', 'username', 'email')).when('applicantType', { is: 'clan', then: Joi.required(), otherwise: Joi.forbidden() })
    });

    // Separate schema for assignGig (gig owner inviting users)
    static assignGigSchema = Joi.object({
        applicantId: Joi.string().required(), // Required - who we're inviting
        proposal: Joi.string().min(10).max(1000).optional(),
        quotedPrice: Joi.number().min(0).optional(),
        estimatedTime: Joi.string().optional(),
        portfolio: Joi.array().items(Joi.string().uri()).default([]),
        applicantType: Joi.string().valid('owner').required(),
        clanId: Joi.string().optional(),
        clanSlug: Joi.string().optional(),
        // Note: UPI ID is NOT required here - creator provides it when accepting invitation

        // Address field for PRODUCT type gigs
        address: Joi.string().optional(), // Will be validated dynamically based on gig type
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional(),

        teamPlan: Joi.array().items(Joi.object({
            role: Joi.string().required(),
            memberId: Joi.string().optional(),
            username: Joi.string().optional(),
            email: Joi.string().email().optional(),
            hours: Joi.number().min(0).optional(),
            deliverables: Joi.array().items(Joi.string()).default([])
        }).or('memberId', 'username', 'email')).when('applicantType', { is: 'clan', then: Joi.required(), otherwise: Joi.forbidden() }),
        milestonePlan: Joi.array().items(Joi.object({
            title: Joi.string().required(),
            dueAt: Joi.date().iso().required(),
            amount: Joi.number().min(0).required(),
            deliverables: Joi.array().items(Joi.string()).default([])
        })).when('applicantType', { is: 'clan', then: Joi.required(), otherwise: Joi.forbidden() }),
        payoutSplit: Joi.array().items(Joi.object({
            memberId: Joi.string().optional(),
            username: Joi.string().optional(),
            email: Joi.string().email().optional(),
            percentage: Joi.number().min(0).max(100).optional(),
            fixedAmount: Joi.number().min(0).optional()
        }).or('memberId', 'username', 'email')).when('applicantType', { is: 'clan', then: Joi.required(), otherwise: Joi.forbidden() })
    });

    static submitWorkSchema = Joi.object({
        title: Joi.string().min(3).max(200).required(),
        description: Joi.string().min(5).max(1000).required(),
        deliverables: Joi.array().items(Joi.object({
            type: Joi.string().valid('social_post', 'image', 'video', 'content', 'file', 'other').required(),
            platform: Joi.string().max(50).optional(), // Instagram, TikTok, YouTube, etc.
            content: Joi.string().max(500).optional(), // For text content
            url: Joi.string().uri().optional(), // For published work
            file: Joi.string().optional(), // File name/reference
            description: Joi.string().max(200).optional() // Brief description
        })).min(1).required(),
        notes: Joi.string().max(500).optional()
    });

    static reviewSubmissionSchema = Joi.object({
        status: Joi.string().valid('APPROVED', 'REJECTED', 'REVISION').required(),
        feedback: Joi.string().max(1000).optional(),
        rating: Joi.number().min(1).max(5).when('status', {
            is: 'APPROVED',
            then: Joi.required(),
            otherwise: Joi.optional()
        })
    });

    static createMilestoneSchema = Joi.object({
        title: Joi.string().min(5).max(200).required(),
        description: Joi.string().max(1000).optional(),
        dueAt: Joi.date().iso().required(),
        amount: Joi.number().min(0).required(),
        deliverables: Joi.array().items(Joi.string()).default([])
    });

    static createTaskSchema = Joi.object({
        title: Joi.string().min(5).max(200).required(),
        description: Joi.string().max(1000).optional(),
        milestoneId: Joi.string().optional(),
        assigneeUserId: Joi.string().required(),
        estimatedHours: Joi.number().min(0).optional(),
        deliverables: Joi.array().items(Joi.string()).default([]),
        notes: Joi.string().max(1000).optional()
    });

    static updateTaskSchema = Joi.object({
        title: Joi.string().min(5).max(200).optional(),
        description: Joi.string().max(1000).optional(),
        status: Joi.string().valid('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED').optional(),
        estimatedHours: Joi.number().min(0).optional(),
        actualHours: Joi.number().min(0).optional(),
        deliverables: Joi.array().items(Joi.string()).optional(),
        notes: Joi.string().max(1000).optional()
    });

    // Accept invitation validation schema
    static acceptInvitationSchema = Joi.object({
        upiId: Joi.string().pattern(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/).required().messages({
            'string.pattern.base': 'UPI ID must be in valid format (e.g., user@paytm, user@gpay)',
            'any.required': 'UPI ID is required for payment processing'
        })
    });

    // Truly relaxed validation schema for draft gigs (ALL fields optional)
    static saveDraftSchema = Joi.object({
        title: Joi.string().min(1).max(200).optional(),
        description: Joi.string().min(1).max(2000).optional(),
        budgetMin: Joi.alternatives().try(
            Joi.number().min(0),
            Joi.string().pattern(/^\d+(\.\d+)?$/).custom((value) => parseFloat(value))
        ).optional(),
        budgetMax: Joi.alternatives().try(
            Joi.number().min(0),
            Joi.string().pattern(/^\d+(\.\d+)?$/).custom((value) => parseFloat(value))
        ).optional(),
        budgetType: Joi.string().valid('fixed', 'hourly', 'negotiable').optional(),
        roleRequired: Joi.string().optional(),
        experienceLevel: Joi.string().valid('beginner', 'intermediate', 'expert').optional(),
        skillsRequired: Joi.array().items(Joi.string()).default([]),
        isClanAllowed: Joi.boolean().default(true),
        location: Joi.string().optional(),
        duration: Joi.string().optional(),
        urgency: Joi.string().valid('urgent', 'normal', 'flexible').optional(),
        category: Joi.string().optional(),
        deliverables: Joi.array().items(Joi.string()).default([]),
        requirements: Joi.string().optional().allow(null, ''),
        deadline: Joi.date().iso().optional(),

        // Gig type and address fields (relaxed for drafts)
        gigType: Joi.string().valid('PRODUCT', 'VISIT', 'REMOTE').optional(),
        address: Joi.string().optional(),
        latitude: Joi.number().min(-90).max(90).optional(),
        longitude: Joi.number().min(-180).max(180).optional(),

        // Enhanced fields for frontend compatibility (added to draft schema)
        tags: Joi.array().items(Joi.string()).optional(),
        platformRequirements: Joi.array().items(Joi.string()).optional(),
        followerRequirements: Joi.array().items(Joi.object({
            platform: Joi.string().required(),
            minFollowers: Joi.number().min(0).required()
        })).optional(),
        locationRequirements: Joi.array().items(Joi.string()).optional(),
        campaignDuration: Joi.string().optional(),
        maxApplications: Joi.number().min(1).optional()
    }).options({ stripUnknown: true });

    //=================================================================
    //======================== HELPER METHODS =========================
    //=================================================================

    async fetchUserData(userId) {
        try {
            const NODE_ENV = process.env.NODE_ENV || 'development';
            const USER_SERVICE_URL = NODE_ENV === 'production' ? process.env.USER_SERVICE_URL_PROD : process.env.USER_SERVICE_URL || 'http://localhost:4002';
            const response = await fetch(`${USER_SERVICE_URL}/internal/users/${userId}`, {
                headers: {
                    'X-Internal-Service': 'gig-service',
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                console.warn(`Failed to fetch user data for ${userId}: ${response.status}`);
                return null;
            }

            const userData = await response.json();
            const user = userData.data?.user || userData.user || userData.data || userData;

            // Determine display name based on priority: companyName > firstName lastName > username
            let displayName = user.username; // Default fallback

            if (user.companyName && user.companyName.trim()) {
                displayName = user.companyName.trim();
            } else if (user.firstName || user.lastName) {
                const firstName = user.firstName || '';
                const lastName = user.lastName || '';
                displayName = `${firstName} ${lastName}`.trim();
            }

            return {
                id: user.id,
                name: displayName,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                companyName: user.companyName,
                profilePicture: user.profilePicture,
                verified: user.emailVerified || false
            };

        } catch (error) {
            console.error(`Error fetching user data for ${userId}:`, error);
            return null;
        }
    }

    // Helper method to publish events with proper routing
    publishEvent = async (eventType, eventData) => {
        try {
            if (!rabbitmqService.isConnected) {
                console.error(`❌ [Gig Service] RabbitMQ not connected, cannot publish ${eventType} event`);
                throw new Error('RabbitMQ not connected');
            }

            const baseEvent = {
                ...eventData,
                eventType: eventType, // Include the specific event type
                timestamp: new Date().toISOString(),
                eventId: `gig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                service: 'gig-service'
            };

            console.log(`📤 [Gig Service] Publishing ${eventType} event:`, {
                eventId: baseEvent.eventId,
                recipientId: eventData.recipientId,
                gigId: eventData.gigId
            });

            // Handle work history specific events
            await this.handleWorkHistoryEvents(eventType, eventData, baseEvent);

            // Publish with the specific routing key for work history events
            if (eventType.startsWith('gig.')) {
                // Work history events (gig.completed, gig.delivered, gig.rated)
                await rabbitmqService.publishGigEvent(eventType, baseEvent);
            } else {
                // Regular gig events (for notification service, etc.)
                await rabbitmqService.publishGigEvent(eventType, baseEvent);
            }

            // Also publish to main gig event stream for other services for backward compatibility
            await rabbitmqService.publishGigEvent('gig.event', baseEvent);

            console.log(`✅ [Gig Service] Successfully published ${eventType} event with ID: ${baseEvent.eventId}`);
        } catch (error) {
            console.error(`❌ [Gig Service] Failed to publish ${eventType} event:`, error);
            throw error; // Re-throw the error so callers can handle it
        }
    };

    // Handle specific events for work history service
    handleWorkHistoryEvents = async (eventType, eventData, baseEvent) => {
        try {
            switch (eventType) {
                case 'submission_reviewed':
                    if (eventData.gigCompleted && eventData.reviewStatus === 'APPROVED') {
                        // Get full gig data for work history
                        const gig = await this.prisma.gig.findUnique({
                            where: { id: eventData.gigId },
                            include: {
                                applications: {
                                    where: { applicantId: eventData.submittedById },
                                    take: 1
                                }
                            }
                        });

                        if (gig) {
                            const workHistoryEvent = {
                                gigId: eventData.gigId,
                                userId: eventData.submittedById,
                                clientId: gig.postedById, // Use postedById as the client
                                gigData: {
                                    title: gig.title,
                                    description: gig.description,
                                    category: gig.category,
                                    skills: gig.skillsRequired || [],
                                    budgetRange: `${gig.budgetMin || 0}-${gig.budgetMax || 0}`,
                                    roleRequired: gig.roleRequired
                                },
                                completionData: {
                                    completedAt: new Date().toISOString(),
                                    rating: eventData.rating,
                                    feedback: eventData.feedback || null,
                                    withinBudget: true, // Default assumption
                                    actualAmount: gig.applications[0]?.quotedPrice || gig.budget
                                },
                                deliveryData: {
                                    onTime: this.calculateOnTimeDelivery(gig),
                                    deliveryTime: this.calculateDeliveryTime(gig),
                                    portfolioItems: [] // Can be enhanced later
                                }
                            };

                            await rabbitmqService.publishGigEvent('gig.completed', workHistoryEvent);
                            console.log(`📤 [Gig Service] Published gig.completed event for work history`);
                        }
                    }
                    break;

                case 'work_submitted':
                    // Publish delivery event for work history
                    // Get gig info for client ID
                    const gig = await this.prisma.gig.findUnique({
                        where: { id: eventData.gigId },
                        select: { postedById: true }
                    });

                    await rabbitmqService.publishGigEvent('gig.delivered', {
                        gigId: eventData.gigId,
                        userId: eventData.submittedById,
                        clientId: gig?.postedById || eventData.gigOwnerId,
                        deliveryData: {
                            submissionTitle: eventData.submissionTitle,
                            deliveredAt: new Date().toISOString()
                        }
                    });
                    break;

                default:
                    // For other events, just publish as-is
                    break;
            }
        } catch (error) {
            console.error(`❌ [Gig Service] Error handling work history event:`, error);
        }
    };

    //=================================================================
    //======================== GIG CONTROLLER =========================
    //=================================================================

    // POST /gigs - Create a new gig
    createGig = async (req, res) => {
        try {
            const { error, value } = GigController.createGigSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: `${error.details.map(d => d.message).join(', ')}`,
                    details: error.details.map(d => d.message)
                });
            }

            const id = req.headers['x-user-id'] || req.user?.id;

            if (!id) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Fetch user data to store brand info in gig
            const brandData = await this.fetchUserData(id);
            console.log('User data response:', brandData);
            if (!brandData) {
                return res.status(400).json({
                    success: false,
                    error: 'Unable to fetch user information. Please try again.'
                });
            }

            // Process enhanced fields
            const {
                tags,
                platformRequirements,
                followerRequirements,
                locationRequirements,
                campaignDuration,
                maxApplications,
                ...gigData
            } = value;

            // Deduplicate all arrays to prevent duplicates
            const uniqueTags = [...new Set((tags || []).filter(tag => tag && tag.trim()))];
            const uniquePlatformRequirements = [...new Set((platformRequirements || []).filter(req => req && req.trim()))];
            const uniqueLocationRequirements = [...new Set((locationRequirements || []).filter(req => req && req.trim()))];
            const uniqueSkillsRequired = [...new Set((gigData.skillsRequired || []).filter(skill => skill && skill.trim()))];
            const uniqueDeliverables = [...new Set((gigData.deliverables || []).filter(del => del && del.trim()))];

            // Merge tags with skillsRequired and deduplicate
            const allSkills = [...uniqueSkillsRequired, ...uniqueTags];
            const uniqueSkills = [...new Set(allSkills)];

            // Use campaignDuration as duration if provided
            const duration = campaignDuration || gigData.duration;

            // Enhance requirements string with structured data
            let enhancedRequirements = gigData.requirements || '';

            if (followerRequirements && followerRequirements.length > 0) {
                const followerText = followerRequirements
                    .map(req => `${req.platform}: ${req.minFollowers.toLocaleString()}+ followers`)
                    .join(', ');
                enhancedRequirements += `\n\nFollower Requirements: ${followerText}`;
            }

            if (platformRequirements && platformRequirements.length > 0) {
                enhancedRequirements += `\n\nPlatform Requirements: ${platformRequirements.join(', ')}`;
            }

            if (locationRequirements && locationRequirements.length > 0) {
                enhancedRequirements += `\n\nLocation Requirements: ${locationRequirements.join(', ')}`;
            }

            const gig = await this.prisma.gig.create({
                data: {
                    ...gigData,
                    skillsRequired: uniqueSkills,
                    deliverables: uniqueDeliverables,
                    duration: duration,
                    requirements: enhancedRequirements.trim(),
                    maxApplications: maxApplications,
                    platformRequirements: uniquePlatformRequirements,
                    tags: uniqueTags,
                    followerRequirements: followerRequirements || [],
                    locationRequirements: uniqueLocationRequirements,
                    campaignDuration: campaignDuration,
                    postedById: id,
                    postedByType: 'user', // You can enhance this to detect brand vs user
                    status: 'OPEN', // Explicitly set status for published gigs
                    // Store brand data to avoid future API calls
                    brandName: brandData.name,
                    brandUsername: brandData.username,
                    brandAvatar: brandData.profilePicture,
                    brandVerified: brandData.verified,
                    isPublic: gigData.isPublic // Default to true if not specified
                }
            });

            // Invalidate user's gig caches and search results
            await this.cache.invalidateUserGigs(id);
            await this.cache.clearSearchCaches(); // Clear search results since new gig affects them

            // Publish event
            await this.publishEvent('gig_created', {
                gigId: gig.id,
                gigTitle: gig.title,
                postedById: id, // Use the extracted id instead of req.user.id
                category: gig.category,
                budgetMin: gig.budgetMin,
                budgetMax: gig.budgetMax,
                roleRequired: gig.roleRequired
            });

            // Publish reputation event for gig posting
            // try {
            //     await rabbitmqService.publishReputationEvent('gig.posted', {
            //         gigId: gig.id,
            //         clientId: id,
            //         gigData: {
            //             title: gig.title,
            //             category: gig.category,
            //             budgetAmount: gig.budgetMax || 0,
            //             postedAt: new Date().toISOString()
            //         }
            //     });
            //     console.log('✅ [Gig Service] Reputation event published for gig posting:', gig.id);
            // } catch (reputationError) {
            //     console.error('❌ [Gig Service] Failed to publish reputation event for gig posting:', reputationError);
            // }

            res.status(201).json({
                success: true,
                message: 'Gig created successfully',
                data: gig
            });
        } catch (error) {
            console.error('Error creating gig:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create gig'
            });
        }
    };

    // POST /gigs/draft - Save gig as draft (or update existing draft)
    saveDraft = async (req, res) => {
        try {
            // Extract draftId from body before validation
            const { draftId, ...draftData } = req.body;

            const { error, value } = GigController.saveDraftSchema.validate(draftData);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: `${error.details.map(d => d.message).join(', ')}`,
                    details: error.details.map(d => d.message)
                });
            }

            const id = req.headers['x-user-id'] || req.user?.id;

            if (!id) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Deduplicate arrays in the draft data to prevent duplicates
            const cleanedValue = {
                ...value,
                // Handle arrays properly - always process if field is present (even if empty)
                ...(value.hasOwnProperty('tags') && {
                    tags: Array.isArray(value.tags) ? [...new Set(value.tags.filter(tag => tag && tag.trim()))] : []
                }),
                ...(value.hasOwnProperty('skillsRequired') && {
                    skillsRequired: Array.isArray(value.skillsRequired) ? [...new Set(value.skillsRequired.filter(skill => skill && skill.trim()))] : []
                }),
                ...(value.hasOwnProperty('deliverables') && {
                    deliverables: Array.isArray(value.deliverables) ? [...new Set(value.deliverables.filter(del => del && del.trim()))] : []
                }),
                ...(value.hasOwnProperty('platformRequirements') && {
                    platformRequirements: Array.isArray(value.platformRequirements) ? [...new Set(value.platformRequirements.filter(req => req && req.trim()))] : []
                }),
                ...(value.hasOwnProperty('locationRequirements') && {
                    locationRequirements: Array.isArray(value.locationRequirements) ? [...new Set(value.locationRequirements.filter(req => req && req.trim()))] : []
                })
            };

            // Check if this is updating an existing draft
            let draft;

            if (draftId) {
                // Update existing draft
                const existingDraft = await this.prisma.gig.findUnique({
                    where: { id: draftId }
                });

                if (!existingDraft) {
                    return res.status(404).json({
                        success: false,
                        error: 'Draft not found'
                    });
                }

                if (existingDraft.postedById !== id) {
                    return res.status(403).json({
                        success: false,
                        error: 'You can only update your own drafts'
                    });
                }

                if (existingDraft.status !== 'DRAFT') {
                    return res.status(400).json({
                        success: false,
                        error: 'Cannot update a gig that is not in draft status'
                    });
                }

                draft = await this.prisma.gig.update({
                    where: { id: draftId },
                    data: {
                        ...cleanedValue,
                        updatedAt: new Date()
                    }
                });
            } else {
                // Fetch user data for brand info
                const brandData = await this.fetchUserData(id);

                // Create new draft
                draft = await this.prisma.gig.create({
                    data: {
                        ...cleanedValue,
                        postedById: id,
                        postedByType: 'user',
                        status: 'DRAFT',
                        // Store brand data
                        brandName: brandData?.name,
                        brandUsername: brandData?.username,
                        brandAvatar: brandData?.profilePicture,
                        brandVerified: brandData?.verified || false
                    }
                });
            }

            // Invalidate user's draft caches
            await this.cache.invalidatePattern(`user_drafts:${id}:*`);

            // Publish event for draft saved (optional - for analytics/tracking)
            await this.publishEvent('gig_draft_saved', {
                gigId: draft.id,
                gigTitle: draft.title || 'Untitled Draft',
                postedById: id,
                isUpdate: !!draftId,
                category: draft.category
            });

            res.status(draftId ? 200 : 201).json({
                success: true,
                message: draftId ? 'Draft updated successfully' : 'Draft saved successfully',
                data: draft
            });
        } catch (error) {
            console.error('Error saving draft:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to save draft'
            });
        }
    };

    //change gig status
    changeGigStatus = async (req, res) => {
        try {
            const { gigId } = req.params;
            const { status } = req.body;
            const validStatuses = ['DRAFT', 'OPEN', 'PAUSED', 'IN_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];



            // Validate required parameters
            if (!gigId) {
                return res.status(400).json({
                    success: false,
                    error: 'Gig ID is required'
                });
            }

            if (!status) {
                return res.status(400).json({
                    success: false,
                    error: 'Status is required'
                });
            }

            // Get user ID from headers or request
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            //Only owner can change the status
            const gig = await this.prisma.gig.findUnique({
                where: { id: gigId }
            });

            if (!gig) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }

            if (gig.postedById !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You are not authorized to change the status of this gig'
                });
            }

            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status'
                });
            }

            const updatedGig = await this.prisma.gig.update({
                where: { id: gigId },
                data: { status }
            });

            // Invalidate related caches
            await this.cache.invalidateGig(gigId, userId);
            await this.cache.clearSearchCaches();

            res.status(200).json({
                success: true,
                message: 'Gig status updated successfully',
                data: updatedGig
            });
        } catch (error) {
            console.error('Error changing gig status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to change gig status'
            });
        }
    };

    //change gig visibility
    changeGigVisibility = async (req, res) => {
        try {
            const { gigId } = req.params;
            const { isPublic } = req.body;
            // Validate required parameters
            if (!gigId) {
                return res.status(400).json({
                    success: false,
                    error: 'Gig ID is required'
                });
            }
            if (typeof isPublic !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    error: 'isPublic must be a boolean'
                });
            }
            // Get user ID from headers or request
            const userId = req.headers['x-user-id'] || req.user?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }
            //Only owner can change the visibility
            const gig = await this.prisma.gig.findUnique({
                where: { id: gigId }
            });
            if (!gig) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }
            if (gig.postedById !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You are not authorized to change the visibility of this gig'
                });
            }
            const updatedGig = await this.prisma.gig.update({
                where: { id: gigId },
                data: { isPublic }
            });

            // Invalidate related caches
            await this.cache.invalidateGig(gigId, userId);
            await this.cache.clearSearchCaches();

            res.status(200).json({
                success: true,
                message: 'Gig visibility updated successfully',
                data: updatedGig
            });
        } catch (error) {
            console.error('Error changing gig visibility:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to change gig visibility'
            });
        }
    };

    // GET /gigs - List all gigs with advanced sorting and filtering (public feed)
    getGigs = async (req, res) => {
        const id = req.headers['x-user-id'] || req.user?.id;
        const userId = id || null; // Allow null for unauthenticated users
        try {
            const {
                category,
                roleRequired,
                location,
                budgetMin,
                budgetMax,
                urgency,
                status, // Remove default value to show all gigs when no status filter is provided
                sortBy = 'date', // date, budget, applications, urgency, relevance
                sortOrder = 'desc', // asc, desc
                page = 1,
                limit = 20,
                search,
                clientScore, // Filter by client reputation score
                deadline
            } = req.query;

            // Create cache key with all parameters
            const cacheKey = this.cache.generateKey('public_gigs',
                `${userId || 'anon'}_${category || 'all'}_${roleRequired || 'all'}_${location || 'all'}_${budgetMin || 'nomin'}_${budgetMax || 'nomax'}_${urgency || 'all'}_${status || 'all'}_${sortBy}_${sortOrder}_${page}_${limit}_${search || 'nosearch'}_${clientScore || 'noscore'}_${deadline || 'nodeadline'}`
            );

            // Use cache-first approach
            const gigsData = await this.cache.getList(cacheKey, async () => {
                const skip = (page - 1) * limit;

                // Build filter conditions
                const where = {};

                // Status filter (allow multiple statuses)
                if (status) {
                    const statusArray = Array.isArray(status) ? status : status.split(',');
                    where.status = statusArray.length === 1 ? statusArray[0] : { in: statusArray };
                }

                if (category) {
                    const categoryArray = Array.isArray(category) ? category : category.split(',');
                    where.category = categoryArray.length === 1 ? categoryArray[0] : { in: categoryArray };
                }

                if (roleRequired) {
                    const roleArray = Array.isArray(roleRequired) ? roleRequired : roleRequired.split(',');
                    where.roleRequired = roleArray.length === 1 ? roleArray[0] : { in: roleArray };
                }

                if (location) {
                    where.location = { contains: location, mode: 'insensitive' };
                }

                if (urgency) {
                    const urgencyArray = Array.isArray(urgency) ? urgency : urgency.split(',');
                    where.urgency = urgencyArray.length === 1 ? urgencyArray[0] : { in: urgencyArray };
                }

                // Budget range filter
                if (budgetMin || budgetMax) {
                    where.AND = [
                        ...(where.AND || []),
                        {
                            OR: [
                                {
                                    AND: [
                                        budgetMin ? { budgetMax: { gte: parseFloat(budgetMin) } } : {},
                                        budgetMax ? { budgetMin: { lte: parseFloat(budgetMax) } } : {}
                                    ]
                                }
                            ]
                        }
                    ];
                }

                // Deadline filter
                if (deadline) {
                    const now = new Date();
                    switch (deadline) {
                        case 'today':
                            const endOfDay = new Date(now);
                            endOfDay.setHours(23, 59, 59, 999);
                            where.deadline = { lte: endOfDay };
                            break;
                        case 'week':
                            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                            where.deadline = { lte: weekFromNow };
                            break;
                        case 'month':
                            const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                            where.deadline = { lte: monthFromNow };
                            break;
                    }
                }

                // Build order by clause
                let orderBy = [];

                switch (sortBy) {
                    case 'budget':
                        orderBy.push({ budgetMax: sortOrder });
                        break;
                    case 'applications':
                        // This will be handled after fetching data
                        orderBy.push({ createdAt: sortOrder });
                        break;
                    case 'urgency':
                        // Custom urgency order: urgent > normal > flexible
                        if (sortOrder === 'desc') {
                            orderBy.push({ urgency: 'asc' }); // urgent comes first
                        } else {
                            orderBy.push({ urgency: 'desc' }); // flexible comes first
                        }
                        orderBy.push({ createdAt: 'desc' });
                        break;
                    case 'relevance':
                        // Relevance based on urgency + recent creation
                        orderBy.push({ urgency: 'asc' });
                        orderBy.push({ createdAt: 'desc' });
                        break;
                    case 'date':
                    default:
                        orderBy.push({ createdAt: sortOrder });
                        break;
                }

                // Combine privacy and search filters properly
                const privacyConditions = [];
                const searchConditions = [];
                const allConditions = [];

                // Add privacy conditions
                if (!userId) {
                    // Unauthenticated users can only see public gigs
                    privacyConditions.push({ isPublic: true });
                } else {
                    // Authenticated users can see:
                    // 1. All public gigs OR
                    // 2. Private gigs they own OR  
                    // 3. Private gigs they have applied to
                    privacyConditions.push(
                        { isPublic: true },
                        { postedById: userId },
                        {
                            AND: [
                                { isPublic: false },
                                {
                                    applications: {
                                        some: {
                                            applicantId: userId,
                                            status: { not: 'WITHDRAWN' }
                                        }
                                    }
                                }
                            ]
                        }
                    );
                }

                // Add search conditions if search is provided
                allConditions.push({ OR: privacyConditions });

                // Add search conditions if present
                if (search) {
                    allConditions.push({
                        OR: [
                            { title: { contains: search, mode: 'insensitive' } },
                            { description: { contains: search, mode: 'insensitive' } },
                            { skillsRequired: { has: search } },
                            { category: { contains: search, mode: 'insensitive' } }
                        ]
                    });
                }
                // Combine with existing AND conditions (like budget filters)
                if (where.AND && where.AND.length > 0) {
                    allConditions.push(...where.AND);
                }

                // Set final where condition
                where.AND = allConditions;

                const [gigs, total] = await Promise.all([
                    this.prisma.gig.findMany({
                        where,
                        skip: parseInt(skip),
                        take: parseInt(limit),
                        orderBy,
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            budgetMin: true,
                            budgetMax: true,
                            budgetType: true,
                            roleRequired: true,
                            skillsRequired: true,
                            isClanAllowed: true,
                            location: true,
                            duration: true,
                            urgency: true,
                            category: true,
                            deliverables: true,
                            requirements: true,
                            deadline: true,
                            status: true,
                            postedById: true,
                            postedByType: true,
                            brandName: true,
                            brandUsername: true,
                            brandAvatar: true,
                            brandVerified: true,
                            createdAt: true,
                            updatedAt: true,
                            isPublic: true,
                            _count: {
                                select: {
                                    applications: true,
                                    submissions: true
                                }
                            }
                        }
                    }),
                    this.prisma.gig.count({ where })
                ]);

                // If sorting by applications, sort the results
                if (sortBy === 'applications') {
                    gigs.sort((a, b) => {
                        const countA = a._count.applications;
                        const countB = b._count.applications;
                        return sortOrder === 'desc' ? countB - countA : countA - countB;
                    });
                }

                // Format response with additional metadata using stored brand info
                const formattedGigs = gigs.map(gig => ({
                    id: gig.id,
                    title: gig.title,
                    description: gig.description,
                    budgetMin: gig.budgetMin,
                    budgetMax: gig.budgetMax,
                    budgetType: gig.budgetType,
                    roleRequired: gig.roleRequired,
                    skillsRequired: gig.skillsRequired,
                    isClanAllowed: gig.isClanAllowed,
                    location: gig.location,
                    duration: gig.duration,
                    urgency: gig.urgency,
                    category: gig.category,
                    isPublic: gig.isPublic,
                    deliverables: gig.deliverables,
                    requirements: gig.requirements,
                    deadline: gig.deadline,
                    status: gig.status,
                    postedById: gig.postedById,
                    postedByType: gig.postedByType,
                    createdAt: gig.createdAt,
                    updatedAt: gig.updatedAt,
                    // Brand info from stored data (no API calls needed)
                    brand: {
                        id: gig.postedById,
                        name: gig.brandName || `User ${gig.postedById.slice(-4)}`,
                        username: gig.brandUsername,
                        logo: gig.brandAvatar,
                        verified: gig.brandVerified
                    },
                    stats: {
                        applicationsCount: gig._count.applications,
                        submissionsCount: gig._count.submissions,
                        daysOld: Math.floor((new Date() - new Date(gig.createdAt)) / (1000 * 60 * 60 * 24)),
                        daysUntilDeadline: gig.deadline ?
                            Math.ceil((new Date(gig.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null
                    }
                }));

                return {
                    gigs: formattedGigs,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit),
                        hasNext: skip + parseInt(limit) < total,
                        hasPrev: parseInt(page) > 1
                    },
                    filters: {
                        category: category?.split(',') || [],
                        roleRequired: roleRequired?.split(',') || [],
                        location,
                        budgetMin,
                        budgetMax,
                        urgency: urgency?.split(',') || [],
                        status: status ? (Array.isArray(status) ? status : status.split(',')) : [],
                        sortBy,
                        sortOrder,
                        search,
                        deadline
                    }
                };
            }, 180); // 3 minute TTL for public gigs

            res.json({
                success: true,
                data: gigsData
            });
        } catch (error) {
            console.error('Error fetching gigs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch gigs',
                message: error.message
            });
        }
    };

    getGigById = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            // Use cache-first approach for gig data
            const gig = await this.cache.getGig(id, async () => {
                return await this.measureQueryPerformance('getGigById', async () => {
                    return await this.prisma.gig.findUnique({
                        where: { id },
                        include: {
                            applications: {
                                select: {
                                    id: true,
                                    applicantId: true,
                                    applicantType: true,
                                    proposal: true,
                                    quotedPrice: true,
                                    estimatedTime: true,
                                    status: true,
                                    appliedAt: true
                                }
                            },
                            _count: {
                                select: {
                                    applications: true,
                                    submissions: true
                                }
                            }
                        }
                    });
                });
            });

            if (!gig) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }

            // Check if user can view this gig:
            // 1. Gig is public, OR
            // 2. User is the owner, OR
            // 3. User has an active application for this private gig
            const userApplication = userId ? gig.applications.find(app =>
                app.applicantId === userId && app.status !== 'WITHDRAWN'
            ) : null;

            const canView = gig.isPublic ||
                gig.postedById === userId ||
                userApplication !== undefined;

            if (!canView) {
                return res.status(403).json({
                    success: false,
                    error: 'You do not have permission to view this gig'
                });
            }

            // Cache recently viewed for user
            if (userId && userId !== gig.postedById) {
                await this.cache.cacheRecentlyViewed(userId, id);
            }

            // Check if current user has applied
            const isApplied = userApplication !== undefined;

            // Format the response to match frontend expectations
            const formattedGig = {
                // Basic gig info
                id: gig.id,
                title: gig.title,
                description: gig.description,
                requirements: gig.requirements ? gig.requirements.split('\n').filter(r => r.trim()) : [], // Convert string to array
                budget: gig.budgetMax || gig.budgetMin || 0, // Use budgetMax as primary budget
                deadline: gig.deadline,
                category: gig.category,
                status: gig.status,
                createdAt: gig.createdAt,

                // Brand/Company info - from stored data (no API calls)
                brand: {
                    id: gig.postedById,
                    name: gig.brandName || `User ${gig.postedById.slice(-4)}`,
                    username: gig.brandUsername,
                    logo: gig.brandAvatar,
                    verified: gig.brandVerified
                },

                // Application statistics
                applicationCount: gig._count.applications,
                maxApplications: gig.maxApplications,
                isApplied: isApplied,

                // Enhanced requirements (use database fields)
                platformRequirements: gig.platformRequirements || gig.skillsRequired.filter(skill =>
                    ['instagram', 'youtube', 'tiktok', 'twitter', 'linkedin'].includes(skill.toLowerCase())
                ),
                followerRequirements: gig.followerRequirements || [],
                locationRequirements: gig.locationRequirements || (gig.location ? [gig.location] : []),

                // Additional details
                campaignDuration: gig.campaignDuration || gig.duration,
                deliverables: gig.deliverables || [],
                tags: [...(gig.tags || []), ...(gig.skillsRequired || [])], // Combine tags and skills

                // Budget details (provide both for flexibility)
                budgetMin: gig.budgetMin,
                budgetMax: gig.budgetMax,
                budgetType: gig.budgetType,

                // Additional useful info
                address: gig.address,
                latitude: gig.latitude,
                longitude: gig.longitude,
                gigType: gig.gigType,
                urgency: gig.urgency,
                location: gig.location,
                experienceLevel: gig.experienceLevel,
                roleRequired: gig.roleRequired,
                skillsRequired: gig.skillsRequired,
                isClanAllowed: gig.isClanAllowed,
                isPublic: gig.isPublic,

                // Application data (for gig owner)
                applications: userId === gig.postedById ? gig.applications : [],

                // Stats
                stats: {
                    applicationsCount: gig._count.applications,
                    submissionsCount: gig._count.submissions,
                    daysOld: Math.floor((new Date() - new Date(gig.createdAt)) / (1000 * 60 * 60 * 24)),
                    daysUntilDeadline: gig.deadline ?
                        Math.ceil((new Date(gig.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null
                }
            };

            res.json({
                success: true,
                data: formattedGig
            });
        } catch (error) {
            console.error('Error fetching gig:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch gig'
            });
        }
    };

    getMyDrafts = async (req, res) => {
        try {
            const id = req.headers['x-user-id'] || req.user?.id;

            if (!id) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Extract query parameters with defaults
            const {
                page = 1,
                limit = 20,
                sortBy = 'updatedAt',
                sort = 'desc',
                search,
                category
            } = req.query;

            const skip = (page - 1) * limit;

            const cacheKey = this.cache.generateKey('user_drafts', id, `${page}_${limit}_${sortBy}_${sort}_${search || ''}_${category || ''}`);

            // Use cache-first approach for drafts
            const draftsData = await this.cache.getList(cacheKey, async () => {
                // Build where conditions with indexed fields first
                const where = {
                    status: 'DRAFT',     // Use indexed status field first
                    postedById: id       // Then use indexed postedById
                };

                // Add search filter if provided
                if (search) {
                    where.OR = [
                        { title: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                        { category: { contains: search, mode: 'insensitive' } }
                    ];
                }

                // Add category filter if provided
                if (category) {
                    where.category = { contains: category, mode: 'insensitive' };
                }

                // Build orderBy
                const orderBy = {};
                orderBy[sortBy] = sort === 'asc' ? 'asc' : 'desc';

                // Execute queries in parallel with performance monitoring
                const [drafts, total] = await Promise.all([
                    this.measureQueryPerformance('getMyDrafts_findMany', () =>
                        this.prisma.gig.findMany({
                            where,
                            skip: parseInt(skip),
                            take: parseInt(limit),
                            orderBy,
                            select: {
                                id: true,
                                title: true,
                                description: true,
                                category: true,
                                roleRequired: true,
                                budgetMin: true,
                                budgetMax: true,
                                budgetType: true,
                                location: true,
                                urgency: true,
                                deadline: true,
                                createdAt: true,
                                updatedAt: true
                            }
                        })
                    ),
                    this.measureQueryPerformance('getMyDrafts_count', () =>
                        this.prisma.gig.count({ where })
                    )
                ]);

                return {
                    drafts,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit),
                        hasNext: skip + parseInt(limit) < total,
                        hasPrev: parseInt(page) > 1
                    }
                };
            }, 300); // 5 minute TTL for drafts

            res.json({
                success: true,
                data: draftsData
            });
        } catch (error) {
            console.error('Error fetching drafts:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch drafts'
            });
        }
    };


}

module.exports = new GigController();