const { json } = require('stream/consumers');
const databaseService = require('../services/database');
const rabbitmqService = require('../services/rabbitmqService');
const Joi = require('joi');

class GigController {
    constructor() {
        this.prisma = databaseService.getClient();
    }

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
                    brandVerified: brandData.verified
                }
            });

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
            try {
                await rabbitmqService.publishReputationEvent('gig.posted', {
                    gigId: gig.id,
                    clientId: id,
                    gigData: {
                        title: gig.title,
                        category: gig.category,
                        budgetAmount: gig.budgetMax || 0,
                        postedAt: new Date().toISOString()
                    }
                });
                console.log('✅ [Gig Service] Reputation event published for gig posting:', gig.id);
            } catch (reputationError) {
                console.error('❌ [Gig Service] Failed to publish reputation event for gig posting:', reputationError);
            }

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


    // GET /gigs - List all gigs with advanced sorting and filtering (public feed)
    getGigs = async (req, res) => {
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
                where.OR = [
                    ...(where.OR || []),
                    {
                        AND: [
                            budgetMin ? { budgetMax: { gte: parseFloat(budgetMin) } } : {},
                            budgetMax ? { budgetMin: { lte: parseFloat(budgetMax) } } : {}
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

            // Search filter
            if (search) {
                where.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { skillsRequired: { has: search } },
                    { category: { contains: search, mode: 'insensitive' } }
                ];
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

            res.json({
                success: true,
                data: {
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
                }
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

    // Helper method to fetch user data from user-service
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

    // GET /gigs/:id - Get detailed gig view
    getGigById = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            const gig = await this.prisma.gig.findUnique({
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

            if (!gig) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }

            // Check if current user has applied
            const isApplied = userId ? gig.applications.some(app =>
                app.applicantId === userId && app.status !== 'WITHDRAWN'
            ) : false;

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

    // POST /gigs/:id/apply - Apply to a gig
    applyToGig = async (req, res) => {
        try {
            const { id } = req.params;
            console.log("🎯 [Gig Service] Applying to gig:", { gigId: id, requestBody: req.body });

            const { error, value } = GigController.applyGigSchema.validate(req.body);
            console.log("✅ [Gig Service] Validated value:", value);
            if (error) {
                console.log("Validation error:", error);
                const errorMessages = error.details.map(d => d.message);
                console.log("Validation error messages:", errorMessages);

                return res.status(400).json({
                    success: false,
                    error: `Validation failed: ${errorMessages.join(', ')}`,
                    details: errorMessages,
                    validationError: true
                });
            }

            // Check if gig exists and is open
            const gig = await this.prisma.gig.findUnique({
                where: { id },
                select: {
                    id: true,
                    title: true,
                    status: true,
                    postedById: true,
                    gigType: true
                }
            });

            if (!gig) {
                console.log("gig not found");
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }

            if (gig.status !== 'OPEN' && gig.status !== 'ASSIGNED') {
                console.log("gig not open");
                console.log("Gig status is not open for applications:", gig.status);
                return res.status(400).json({
                    success: false,
                    error: 'This gig is no longer accepting applications'
                });
            }

            // Validate address requirement for PRODUCT type gigs
            if (gig.gigType === 'PRODUCT' && !value.address) {
                return res.status(400).json({
                    success: false,
                    error: 'Address is required when applying to PRODUCT type gigs',
                    validationError: true
                });
            }

            // Determine applicant identity (support clanSlug)
            let resolvedClanId = value.clanId || req.body?.clanId || req.headers['x-clan-id'];
            if (value.applicantType === 'clan' && !resolvedClanId && value.clanSlug) {
                const CLAN_SERVICE_URL = process.env.CLAN_SERVICE_URL || 'http://localhost:4001';
                try {
                    const resp = await fetch(`${CLAN_SERVICE_URL}/clan/public/slug/${encodeURIComponent(value.clanSlug)}`);
                    if (resp.ok) {
                        const payload = await resp.json();
                        resolvedClanId = payload?.data?.id || payload?.data?.clan?.id || null;
                    }
                } catch (e) {
                    // ignore, handled below
                }
            }

            const applicantId = value.applicantType === 'clan'
                ? resolvedClanId
                : (req.headers['x-user-id'] || req.user?.id);

            console.log("🔍 [Gig Service] Applicant ID resolved:", {
                applicantType: value.applicantType,
                applicantId,
                resolvedClanId,
                headers: { 'x-user-id': req.headers['x-user-id'], 'user-id': req.user?.id }
            });

            if (!applicantId) {
                console.log("❌ [Gig Service] Missing applicant identifier");
                return res.status(400).json({
                    success: false,
                    error: 'Missing applicant identifier',
                    details: {
                        applicantType: value.applicantType,
                        resolvedClanId,
                        headers: { 'x-user-id': req.headers['x-user-id'], 'user-id': req.user?.id }
                    }
                });
            }

            // If clan application, normalize teamPlan and payoutSplit identifiers to userIds and validate membership
            let normalizedTeamPlan = null;
            let normalizedPayoutSplit = null;
            if (value.applicantType === 'clan') {
                // Build identifiers list from teamPlan + payoutSplit where memberId missing
                const identifiers = [];
                const isUuid = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
                const addIdf = (item) => {
                    if (!item) return;
                    if (!item.memberId && (item.username || item.email)) {
                        const username = item.username;
                        // If a UUID is provided in username, treat it as userId for convenience
                        if (username && isUuid(username)) {
                            identifiers.push({ userId: username });
                            return;
                        }
                        identifiers.push({
                            ...(username ? { username } : {}),
                            ...(item.email ? { email: item.email } : {})
                        });
                    }
                };
                for (const m of (value.teamPlan || [])) addIdf(m);
                for (const p of (value.payoutSplit || [])) addIdf(p);

                // Resolve via clan-service (through API Gateway) to also verify membership of this clan
                if (identifiers.length > 0) {
                    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
                    try {
                        const resp = await fetch(`${BASE_URL}/api/members/${encodeURIComponent(applicantId)}/resolve-members`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-internal': 'true',
                                'x-calling-service': 'gig-service'
                            },
                            body: JSON.stringify({ identifiers: identifiers.slice(0, 100) })
                        });
                        if (!resp.ok) {
                            const txt = await resp.text().catch(() => '');
                            return res.status(400).json({ success: false, error: 'Failed to resolve member identifiers', details: txt || undefined });
                        }
                        const data = await resp.json();
                        const results = data?.data || data?.data?.results || [];
                        const index = new Map();
                        for (const r of results) {
                            const key = (r.input?.username || r.input?.email || r.input?.userId || '').toLowerCase();
                            index.set(key, r);
                        }
                        const lookup = (item) => {
                            if (item.memberId) return { userId: item.memberId, isMember: true };
                            const k = (item.username || item.email || '').toLowerCase();
                            // If username was a UUID and treated as userId above, also try direct userId key
                            const fromIndex = index.get(k) || (isUuid(item.username) ? index.get(item.username.toLowerCase()) : undefined);
                            return fromIndex || { userId: null, isMember: false };
                        };

                        // Normalize teamPlan
                        normalizedTeamPlan = (value.teamPlan || []).map(m => {
                            const r = lookup(m);
                            if (!r.userId) throw new Error(`Unable to resolve team member: ${m.username || m.email || m.memberId}`);
                            if (!r.isMember) throw new Error(`User is not a member of this clan: ${m.username || m.email || r.userId}`);
                            return {
                                role: m.role,
                                memberId: r.userId,
                                hours: m.hours,
                                deliverables: m.deliverables || []
                            };
                        });

                        // Normalize payoutSplit
                        normalizedPayoutSplit = (value.payoutSplit || []).map(p => {
                            const r = lookup(p);
                            if (!r.userId) throw new Error(`Unable to resolve payout member: ${p.username || p.email || p.memberId}`);
                            if (!r.isMember) throw new Error(`Payout recipient not in clan: ${p.username || p.email || r.userId}`);
                            const out = { memberId: r.userId };
                            if (p.percentage !== undefined) out.percentage = p.percentage;
                            if (p.fixedAmount !== undefined) out.fixedAmount = p.fixedAmount;
                            return out;
                        });
                    } catch (e) {
                        return res.status(400).json({ success: false, error: e.message || 'Failed to normalize identifiers' });
                    }
                } else {
                    // Already have memberIds
                    normalizedTeamPlan = value.teamPlan || [];
                    normalizedPayoutSplit = value.payoutSplit || [];
                }
            }

            // Check if this applicant has already applied
            const existingApplication = await this.prisma.application.findFirst({
                where: {
                    gigId: id,
                    applicantId: applicantId,
                    applicantType: value.applicantType
                }
            });

            if (existingApplication) {
                console.log("❌ [Gig Service] Existing application found:", {
                    applicationId: existingApplication.id,
                    status: existingApplication.status
                });
                return res.status(400).json({
                    success: false,
                    error: 'You have already applied to this gig',
                    details: {
                        existingApplicationId: existingApplication.id,
                        status: existingApplication.status
                    }
                });
            }

            console.log("📝 [Gig Service] Creating application with data:", {
                gigId: id,
                applicantId: applicantId,
                applicantType: value.applicantType,
                clanId: value.applicantType === 'clan' ? applicantId : null,
                proposal: value.proposal,
                quotedPrice: value.quotedPrice,
                estimatedTime: value.estimatedTime,
                teamPlan: value.applicantType === 'clan' ? normalizedTeamPlan : null,
                milestonePlan: value.applicantType === 'clan' ? value.milestonePlan : null,
                payoutSplit: value.applicantType === 'clan' ? normalizedPayoutSplit : null
            });

            const application = await this.prisma.application.create({
                data: {
                    gigId: id,
                    applicantId: applicantId,
                    applicantType: value.applicantType,
                    clanId: value.applicantType === 'clan' ? applicantId : null,
                    proposal: value.proposal,
                    quotedPrice: value.quotedPrice,
                    estimatedTime: value.estimatedTime,
                    portfolio: value.portfolio,
                    address: value.address,
                    upiId: value.upiId,
                    teamPlan: value.applicantType === 'clan' ? normalizedTeamPlan : null,
                    milestonePlan: value.applicantType === 'clan' ? value.milestonePlan : null,
                    payoutSplit: value.applicantType === 'clan' ? normalizedPayoutSplit : null
                }
            });

            // Fetch applicant data for notification
            const applicantData = await this.fetchUserData(applicantId);
            const applicantName = applicantData && applicantData.firstName && applicantData.lastName ? `${applicantData.firstName} ${applicantData.lastName}` : applicantData.username;

            // Publish events
            await this.publishEvent('application_submitted', {
                gigId: id,
                gigTitle: gig.title,
                applicationId: application.id,
                applicantId: applicantId,
                applicantName: applicantName,
                applicantType: value.applicantType,
                gigOwnerId: gig.postedById,
                quotedPrice: value.quotedPrice,
                clanId: value.applicantType === 'clan' ? applicantId : undefined
            });

            // Send notification to applicant confirming application
            await this.publishEvent('application_confirmed', {
                applicantId: applicantId,
                recipientType: 'applicant',
                gigId: id,
                gigTitle: gig.title,
                applicationId: application.id,
                message: `Your application for "${gig.title}" has been submitted successfully`
            });

            console.log("✅ [Gig Service] Application submitted successfully:", {
                applicationId: application.id,
                gigId: id,
                applicantId: applicantId
            });

            res.status(201).json({
                success: true,
                message: 'Application submitted successfully',
                data: application
            });
        } catch (error) {
            console.log("error", error);
            console.error('Error applying to gig:', error);

            // Provide detailed error information for debugging
            let errorMessage = 'Failed to submit application';
            let errorDetails = null;

            if (error.message) {
                errorMessage = error.message;
            }

            if (error.code) {
                errorDetails = { code: error.code, meta: error.meta };
            }

            res.status(500).json({
                success: false,
                error: errorMessage,
                details: errorDetails,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    };

    // POST /gigs/:id/assign - Gig owner invites user (creates application with applicantType: "owner")
    assignGig = async (req, res) => {
        try {
            const { id } = req.params;
            const ownerId = req.headers['x-user-id'] || req.user?.id;

            if (!ownerId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Validate input using assignGig schema
            const { error, value } = GigController.assignGigSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.details.map(detail => ({
                        field: detail.path.join('.'),
                        message: detail.message
                    }))
                });
            }

            // Get gig details
            const gig = await this.prisma.gig.findUnique({
                where: { id }
            });

            if (!gig) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }

            // Check if user owns this gig
            if (gig.postedById !== ownerId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only assign your own gigs'
                });
            }

            // Check if gig is in valid status for assignment
            if (!['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(gig.status)) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot assign gig with status: ${gig.status}`
                });
            }

            // Extract applicantId from the payload (frontend should provide this)
            const { applicantId, ...applicationData } = value;

            if (!applicantId) {
                return res.status(400).json({
                    success: false,
                    error: 'applicantId is required in the payload'
                });
            }

            // Check if there's already an application from this applicant
            const existingApplication = await this.prisma.application.findUnique({
                where: {
                    applicantId_gigId: {
                        applicantId: applicantId,
                        gigId: id
                    }
                }
            });

            // Define active statuses that should prevent re-assignment
            const activeStatuses = ['PENDING', 'APPROVED', 'SUBMITTED'];
            const inactiveStatuses = ['REJECTED', 'CLOSED', 'WITHDRAWN'];

            if (existingApplication) {
                // Check if the existing application is still active
                if (activeStatuses.includes(existingApplication.status)) {
                    return res.status(409).json({
                        success: false,
                        error: `Cannot re-assign gig. The existing application is ${existingApplication.status.toLowerCase()} and requires user action.`,
                        details: {
                            applicationId: existingApplication.id,
                            currentStatus: existingApplication.status,
                            message: existingApplication.status === 'PENDING'
                                ? 'User needs to accept or reject the current invitation'
                                : existingApplication.status === 'APPROVED'
                                    ? 'Application is approved and work may be in progress'
                                    : 'Work has been submitted and is pending review'
                        }
                    });
                }

                // Only allow re-assignment if application is in inactive status
                if (!inactiveStatuses.includes(existingApplication.status)) {
                    return res.status(400).json({
                        success: false,
                        error: `Cannot re-assign gig. Application status '${existingApplication.status}' is not eligible for re-assignment.`,
                        details: {
                            applicationId: existingApplication.id,
                            currentStatus: existingApplication.status,
                            eligibleForReassignment: inactiveStatuses
                        }
                    });
                }
            }

            // Create or update application (only if no existing application or existing is inactive)
            const application = existingApplication && inactiveStatuses.includes(existingApplication.status)
                ? await this.prisma.application.update({
                    where: {
                        id: existingApplication.id
                    },
                    data: {
                        applicantType: 'owner', // This is the key difference - owner is inviting
                        clanId: value.applicantType === 'clan' ? applicantId : null,
                        proposal: value.proposal,
                        quotedPrice: value.quotedPrice,
                        estimatedTime: value.estimatedTime,
                        portfolio: value.portfolio || [],
                        address: value.address,
                        // upiId will be updated when creator accepts the invitation
                        upiId: 'pending@invitation', // Reset to placeholder
                        teamPlan: value.applicantType === 'clan' ? normalizedTeamPlan : null,
                        milestonePlan: value.applicantType === 'clan' ? value.milestonePlan : null,
                        payoutSplit: value.applicantType === 'clan' ? normalizedPayoutSplit : null,
                        status: 'PENDING' // Reset to pending for user to accept new invitation
                    }
                })
                : await this.prisma.application.create({
                    data: {
                        gigId: id,
                        applicantId: applicantId,
                        applicantType: 'owner', // This is the key difference - owner is inviting
                        clanId: value.applicantType === 'clan' ? applicantId : null,
                        proposal: value.proposal,
                        quotedPrice: value.quotedPrice,
                        estimatedTime: value.estimatedTime,
                        portfolio: value.portfolio || [],
                        address: value.address,
                        // upiId will be provided by creator when accepting the invitation
                        upiId: 'pending@invitation', // Placeholder until creator accepts
                        teamPlan: value.applicantType === 'clan' ? normalizedTeamPlan : null,
                        milestonePlan: value.applicantType === 'clan' ? value.milestonePlan : null,
                        payoutSplit: value.applicantType === 'clan' ? normalizedPayoutSplit : null,
                        status: 'PENDING' // User needs to accept this invitation
                    }
                });

            // Validate and process clan-specific data (similar to applyToGig)
            let normalizedTeamPlan = null;
            let normalizedPayoutSplit = null;

            if (value.applicantType === 'clan') {
                // Normalize team plan
                if (value.teamPlan && Array.isArray(value.teamPlan)) {
                    normalizedTeamPlan = value.teamPlan.map(member => ({
                        role: member.role,
                        memberId: member.memberId || null,
                        username: member.username || null,
                        email: member.email || null,
                        hours: member.hours || 0,
                        deliverables: Array.isArray(member.deliverables) ? member.deliverables : []
                    }));
                }

                // Normalize payout split
                if (value.payoutSplit && Array.isArray(value.payoutSplit)) {
                    normalizedPayoutSplit = value.payoutSplit.map(split => ({
                        memberId: split.memberId || null,
                        username: split.username || null,
                        email: split.email || null,
                        percentage: split.percentage || null,
                        fixedAmount: split.fixedAmount || null
                    }));
                }
            }

            // Publish event for gig invitation (different from application_submitted)
            await this.publishEvent('gig_invitation_sent', {
                gigId: id,
                gigTitle: gig.title,
                applicationId: application.id,
                invitedUserId: applicantId,
                invitedByOwnerId: ownerId,
                quotedPrice: value.quotedPrice,
                applicantType: value.applicantType,
                clanId: value.applicantType === 'clan' ? applicantId : undefined,
                message: `You have been invited to work on "${gig.title}"`
            });

            // Send notification to invited user
            await this.publishEvent('gig_invitation_notification', {
                recipientId: applicantId,
                recipientType: 'invitee',
                gigId: id,
                gigTitle: gig.title,
                applicationId: application.id,
                invitedByOwnerId: ownerId,
                message: `You have been invited to work on "${gig.title}". Please review and accept the invitation.`
            });

            res.status(201).json({
                success: true,
                message: existingApplication && inactiveStatuses.includes(existingApplication.status)
                    ? 'Gig re-assigned successfully'
                    : 'Gig invitation sent successfully',
                data: application
            });
        } catch (error) {
            console.error('Error sending gig invitation:', error);

            let errorMessage = 'Failed to send gig invitation';
            let errorDetails = null;

            if (error.message) {
                errorMessage = error.message;
            }

            if (error.code) {
                errorDetails = `Database error: ${error.code}`;
            }

            res.status(500).json({
                success: false,
                error: errorMessage,
                details: errorDetails,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    };

    // GET /my-posted-gigs - Get user's posted gigs
    getMyPostedGigs = async (req, res) => {
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
                status,
                sortBy = 'createdAt',
                sort = 'desc',
                search,
                category,
                urgency
            } = req.query;

            const skip = (page - 1) * limit;

            // Build where conditions - only gigs posted by the current user
            const where = {
                postedById: id
            };

            // Add status filter if provided
            if (status) {
                if (Array.isArray(status)) {
                    where.status = { in: status };
                } else {
                    where.status = status;
                }
            }

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
                if (Array.isArray(category)) {
                    where.category = { in: category };
                } else {
                    where.category = { contains: category, mode: 'insensitive' };
                }
            }

            // Add urgency filter if provided
            if (urgency) {
                if (Array.isArray(urgency)) {
                    where.urgency = { in: urgency };
                } else {
                    where.urgency = urgency;
                }
            }

            // Build orderBy
            const orderBy = {};
            orderBy[sortBy] = sort === 'asc' ? 'asc' : 'desc';

            // Execute queries
            const [gigs, total] = await Promise.all([
                this.prisma.gig.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy,
                    include: {
                        _count: {
                            select: {
                                applications: true,
                                submissions: true
                            }
                        },
                        applications: {

                            select: {
                                id: true,
                                status: true
                            }
                        }
                    }
                }),
                this.prisma.gig.count({ where })
            ]);

            // Enhance gigs with pending applications count
            console.log('gigs', gigs.map(gig => (gig.id, gig.applications)));
            const enhancedGigs = gigs.map(gig => ({
                ...gig,
                pendingApplicationsCount: gig.applications ? gig.applications.filter(app => app.status === 'PENDING').length : 0
            }));

            // Get total pending applications count across ALL gigs (irrespective of limit)
            const totalPendingApplicationsAcrossAllGigs = await this.prisma.application.count({
                where: {
                    gig: {
                        postedById: id
                    },
                    status: 'PENDING'
                }
            });

            // Get total active gigs count (OPEN or ASSIGNED status) - irrespective of limit
            const totalActiveGigs = await this.prisma.gig.count({
                where: {
                    postedById: id,
                    status: { in: ['OPEN', 'ASSIGNED'] }
                }
            });

            // Get total completed gigs count - irrespective of limit
            const totalCompletedGigs = await this.prisma.gig.count({
                where: {
                    postedById: id,
                    status: 'COMPLETED'
                }
            });

            // Get total budget across all gigs - irrespective of limit
            const totalBudgetResult = await this.prisma.gig.aggregate({
                where: {
                    postedById: id
                },
                _sum: {
                    budgetMax: true
                }
            });

            const totalBudget = totalBudgetResult._sum.budgetMax || 0;

            // Calculate total pending applications for current page gigs
            const totalPendingApplicationsCurrentPage = enhancedGigs.reduce((total, gig) => total + gig.pendingApplicationsCount, 0);

            res.json({
                success: true,
                data: {
                    gigs: enhancedGigs,
                    summary: {
                        totalGigs: total,
                        totalActiveGigs: totalActiveGigs,
                        totalCompletedGigs: totalCompletedGigs,
                        totalBudget: totalBudget,
                        totalGigsOnCurrentPage: enhancedGigs.length,
                        totalPendingApplicationsCurrentPage: totalPendingApplicationsCurrentPage,
                        totalPendingApplicationsAcrossAllGigs: totalPendingApplicationsAcrossAllGigs,
                        gigsWithPendingApplications: enhancedGigs.filter(gig => gig.pendingApplicationsCount > 0).length
                    },
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit),
                        hasNext: skip + parseInt(limit) < total,
                        hasPrev: parseInt(page) > 1
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching posted gigs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch posted gigs'
            });
        }
    };

    // GET /my-applications - Get user's applications
    getMyApplications = async (req, res) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Extract query parameters with defaults
            const {
                page = 1,
                limit = 20,
                status,
                sortBy = 'appliedAt',
                sort = 'desc',
                search
            } = req.query;

            const skip = (page - 1) * limit;

            // Build where conditions
            const where = {
                applicantId: userId
            };

            // Add status filter if provided
            if (status) {
                if (Array.isArray(status)) {
                    where.status = { in: status };
                } else {
                    where.status = status;
                }
            }

            // Add search filter if provided (search in gig title)
            if (search) {
                where.gig = {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } }
                    ]
                };
            }

            // Build orderBy
            const orderBy = {};
            orderBy[sortBy] = sort === 'asc' ? 'asc' : 'desc';

            // Execute queries
            const [applications, total] = await Promise.all([
                this.prisma.application.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy,
                    include: {
                        gig: {
                            select: {
                                id: true,
                                title: true,
                                description: true,
                                budgetMin: true,
                                budgetMax: true,
                                budgetType: true,
                                status: true,
                                deadline: true,
                                createdAt: true
                            }
                        }
                    }
                }),
                this.prisma.application.count({ where })
            ]);

            res.json({
                success: true,
                data: {
                    applications,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit),
                        hasNext: skip + parseInt(limit) < total,
                        hasPrev: parseInt(page) > 1
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching applications:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch applications'
            });
        }
    };

    // GET /my-drafts - Get user's draft gigs
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

            // Build where conditions
            const where = {
                postedById: id,
                status: 'DRAFT'
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

            // Execute queries
            const [drafts, total] = await Promise.all([
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
                }),
                this.prisma.gig.count({ where })
            ]);

            res.json({
                success: true,
                data: {
                    drafts,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit),
                        hasNext: skip + parseInt(limit) < total,
                        hasPrev: parseInt(page) > 1
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching drafts:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch drafts'
            });
        }
    };

    // POST /gigs/draft/:id/publish - Publish a draft gig
    publishDraft = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Get the draft
            const draft = await this.prisma.gig.findUnique({
                where: { id }
            });

            if (!draft) {
                return res.status(404).json({
                    success: false,
                    error: 'Draft not found'
                });
            }

            if (draft.postedById !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only publish your own drafts'
                });
            }

            if (draft.status !== 'DRAFT') {
                return res.status(400).json({
                    success: false,
                    error: 'Gig is not in draft status'
                });
            }

            // Validate the draft against the full createGig schema
            const { error } = GigController.createGigSchema.validate({
                title: draft.title,
                description: draft.description,
                budgetMin: draft.budgetMin,
                budgetMax: draft.budgetMax,
                budgetType: draft.budgetType,
                roleRequired: draft.roleRequired,
                experienceLevel: draft.experienceLevel,
                skillsRequired: draft.skillsRequired,
                isClanAllowed: draft.isClanAllowed,
                location: draft.location,
                duration: draft.duration,
                urgency: draft.urgency,
                category: draft.category,
                deliverables: draft.deliverables,
                requirements: draft.requirements,
                deadline: draft.deadline
            });

            if (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Draft is incomplete and cannot be published',
                    details: error.details.map(d => d.message),
                    missingFields: error.details.map(d => d.path.join('.'))
                });
            }

            // Update draft to published status
            const publishedGig = await this.prisma.gig.update({
                where: { id },
                data: {
                    status: 'OPEN',
                    updatedAt: new Date()
                }
            });

            // Publish event
            await this.publishEvent('gig_created', {
                gigId: publishedGig.id,
                gigTitle: publishedGig.title,
                postedById: userId,
                category: publishedGig.category,
                budgetMin: publishedGig.budgetMin,
                budgetMax: publishedGig.budgetMax,
                roleRequired: publishedGig.roleRequired,
                publishedFromDraft: true
            });

            res.json({
                success: true,
                message: 'Draft published successfully',
                data: publishedGig
            });
        } catch (error) {
            console.error('Error publishing draft:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to publish draft'
            });
        }
    };

    // DELETE /gigs/draft/:id - Delete a draft gig
    deleteDraft = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Check if draft exists and belongs to user
            const draft = await this.prisma.gig.findUnique({
                where: { id }
            });

            if (!draft) {
                return res.status(404).json({
                    success: false,
                    error: 'Draft not found'
                });
            }

            if (draft.postedById !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only delete your own drafts'
                });
            }

            if (draft.status !== 'DRAFT') {
                return res.status(400).json({
                    success: false,
                    error: 'Can only delete gigs in draft status'
                });
            }

            // Delete the draft
            await this.prisma.gig.delete({
                where: { id }
            });

            // Publish event for analytics
            await this.publishEvent('gig_draft_deleted', {
                gigId: id,
                gigTitle: draft.title || 'Untitled Draft',
                postedById: userId
            });

            res.json({
                success: true,
                message: 'Draft deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting draft:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete draft'
            });
        }
    };

    // GET /gigs/draft/:id - Get a specific draft gig
    getDraftGig = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            const draft = await this.prisma.gig.findUnique({
                where: { id }
            });

            if (!draft) {
                return res.status(404).json({
                    success: false,
                    error: 'Draft not found'
                });
            }

            if (draft.postedById !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only view your own drafts'
                });
            }

            if (draft.status !== 'DRAFT') {
                return res.status(400).json({
                    success: false,
                    error: 'Gig is not in draft status'
                });
            }

            res.json({
                success: true,
                data: draft
            });
        } catch (error) {
            console.error('Error fetching draft:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch draft'
            });
        }
    };

    // PUT /gigs/:id - Update a gig
    updateGig = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Check if gig exists and belongs to user
            const existingGig = await this.prisma.gig.findUnique({
                where: { id }
            });

            if (!existingGig) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }

            if (existingGig.postedById !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only update your own gigs'
                });
            }

            // Use appropriate validation schema based on current status
            const schema = existingGig.status === 'DRAFT' ?
                GigController.saveDraftSchema :
                GigController.createGigSchema;

            const { error, value } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: `${error.details.map(d => d.message).join(', ')}`,
                    details: error.details.map(d => d.message)
                });
            }

            // Deduplicate arrays in the update data to prevent duplicates
            const cleanedValue = {
                ...value,
                // Handle arrays properly - if field is present in request, process it (even if empty)
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

            const updatedGig = await this.prisma.gig.update({
                where: { id },
                data: {
                    ...cleanedValue,
                    updatedAt: new Date()
                }
            });

            // Publish event
            await this.publishEvent('gig_updated', {
                gigId: id,
                gigTitle: updatedGig.title,
                postedById: userId,
                previousStatus: existingGig.status,
                currentStatus: updatedGig.status
            });

            res.json({
                success: true,
                message: 'Gig updated successfully',
                data: updatedGig
            });
        } catch (error) {
            console.error('Error updating gig:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update gig'
            });
        }
    };

    // DELETE /gigs/:id - Delete a gig
    deleteGig = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Check if gig exists and belongs to user
            const gig = await this.prisma.gig.findUnique({
                where: { id },
                include: {
                    applications: true,
                    submissions: true
                }
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
                    error: 'You can only delete your own gigs'
                });
            }

            // Check if gig can be deleted (no approved applications or submissions)
            const hasActiveWork = gig.applications.some(app => app.status === 'APPROVED') ||
                gig.submissions.length > 0;

            if (hasActiveWork && gig.status !== 'DRAFT') {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete gig with active applications or submissions'
                });
            }

            // Delete the gig (cascade will handle related records)
            await this.prisma.gig.delete({
                where: { id }
            });

            // Publish event
            await this.publishEvent('gig_deleted', {
                gigId: id,
                gigTitle: gig.title,
                postedById: userId,
                status: gig.status
            });

            res.json({
                success: true,
                message: 'Gig deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting gig:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete gig'
            });
        }
    };

    // PATCH /gigs/:id/publish - Publish a gig (similar to draft publish but for any gig)
    publishGig = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            const gig = await this.prisma.gig.findUnique({
                where: { id }
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
                    error: 'You can only publish your own gigs'
                });
            }

            if (gig.status === 'OPEN') {
                return res.status(400).json({
                    success: false,
                    error: 'Gig is already published'
                });
            }

            const updatedGig = await this.prisma.gig.update({
                where: { id },
                data: {
                    status: 'OPEN',
                    updatedAt: new Date()
                }
            });

            // Publish event
            await this.publishEvent('gig_published', {
                gigId: id,
                gigTitle: updatedGig.title,
                postedById: userId
            });

            res.json({
                success: true,
                message: 'Gig published successfully',
                data: updatedGig
            });
        } catch (error) {
            console.error('Error publishing gig:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to publish gig'
            });
        }
    };

    // PATCH /gigs/:id/close - Close a gig
    closeGig = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            const gig = await this.prisma.gig.findUnique({
                where: { id }
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
                    error: 'You can only close your own gigs'
                });
            }

            const updatedGig = await this.prisma.gig.update({
                where: { id },
                data: {
                    status: 'CANCELLED',
                    updatedAt: new Date()
                }
            });

            // Publish event
            await this.publishEvent('gig_closed', {
                gigId: id,
                gigTitle: updatedGig.title,
                postedById: userId
            });

            res.json({
                success: true,
                message: 'Gig closed successfully',
                data: updatedGig
            });
        } catch (error) {
            console.error('Error closing gig:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to close gig'
            });
        }
    };

    // GET /gigs/my/stats - Get user's gig statistics
    getMyGigStats = async (req, res) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            const [
                totalPosted,
                drafts,
                open,
                inProgress,
                completed,
                totalApplications,
                totalSubmissions
            ] = await Promise.all([
                this.prisma.gig.count({ where: { postedById: userId } }),
                this.prisma.gig.count({ where: { postedById: userId, status: 'DRAFT' } }),
                this.prisma.gig.count({ where: { postedById: userId, status: 'OPEN' } }),
                this.prisma.gig.count({ where: { postedById: userId, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED'] } } }),
                this.prisma.gig.count({ where: { postedById: userId, status: 'COMPLETED' } }),
                this.prisma.application.count({
                    where: { gig: { postedById: userId } }
                }),
                this.prisma.submission.count({
                    where: { gig: { postedById: userId } }
                })
            ]);

            const stats = {
                gigs: {
                    total: totalPosted,
                    drafts,
                    open,
                    inProgress,
                    completed
                },
                applications: {
                    total: totalApplications
                },
                submissions: {
                    total: totalSubmissions
                }
            };

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error fetching gig stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch gig stats'
            });
        }
    };

    // GET /gigs/my/active - Get user's active gigs
    getMyActiveGigs = async (req, res) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            const activeGigs = await this.prisma.gig.findMany({
                where: {
                    postedById: userId,
                    status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED'] }
                },
                orderBy: { updatedAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            applications: true,
                            submissions: true
                        }
                    }
                }
            });

            res.json({
                success: true,
                data: activeGigs
            });
        } catch (error) {
            console.error('Error fetching active gigs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch active gigs'
            });
        }
    };

    // GET /gigs/my/completed - Get user's completed gigs
    getMyCompletedGigs = async (req, res) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            const completedGigs = await this.prisma.gig.findMany({
                where: {
                    postedById: userId,
                    status: 'COMPLETED'
                },
                orderBy: { completedAt: 'desc' },
                include: {
                    submissions: {
                        where: { status: 'APPROVED' },
                        select: {
                            rating: true,
                            feedback: true,
                            submittedById: true
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

            res.json({
                success: true,
                data: completedGigs
            });
        } catch (error) {
            console.error('Error fetching completed gigs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch completed gigs'
            });
        }
    };

    getMySubmissions = async (req, res) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            const submissions = await this.prisma.submission.findMany({
                where: { submittedById: userId },
                orderBy: { submittedAt: 'desc' },
                include: {
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            postedById: true
                        }
                    }
                }
            });

            res.json({
                success: true,
                data: submissions
            });
        } catch (error) {
            console.error('Error fetching my submissions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch my submissions'
            });
        }
    }

    // GET /gigs/public/search - Search gigs
    searchGigs = async (req, res) => {
        try {
            const { q: query, page = 1, limit = 20, ...filters } = req.query;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    error: 'Search query is required'
                });
            }

            const skip = (page - 1) * limit;

            // Build search conditions
            const where = {
                status: 'OPEN', // Only search in published gigs
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { category: { contains: query, mode: 'insensitive' } },
                    { roleRequired: { contains: query, mode: 'insensitive' } },
                    { skillsRequired: { has: query } }
                ]
            };

            // Add additional filters
            if (filters.category) {
                where.category = { contains: filters.category, mode: 'insensitive' };
            }

            const [gigs, total] = await Promise.all([
                this.prisma.gig.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: {
                            select: {
                                applications: true
                            }
                        }
                    }
                }),
                this.prisma.gig.count({ where })
            ]);

            res.json({
                success: true,
                data: {
                    gigs,
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Error searching gigs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to search gigs'
            });
        }
    };

    // GET /gigs/public/featured - Get featured gigs
    getFeaturedGigs = async (req, res) => {
        try {
            // For now, return recent high-budget gigs as "featured"
            // This can be enhanced with a dedicated featured flag in the schema
            const featuredGigs = await this.prisma.gig.findMany({
                where: {
                    status: 'OPEN',
                    budgetMax: { gte: 1000 } // High budget gigs
                },
                orderBy: [
                    { urgency: 'asc' }, // Urgent first
                    { budgetMax: 'desc' }, // Higher budget first
                    { createdAt: 'desc' }
                ],
                take: 10,
                include: {
                    _count: {
                        select: {
                            applications: true
                        }
                    }
                }
            });

            res.json({
                success: true,
                data: featuredGigs
            });
        } catch (error) {
            console.error('Error fetching featured gigs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch featured gigs'
            });
        }
    };

    // GET /gigs/public/categories - Get all categories
    getCategories = async (req, res) => {
        try {
            // Get unique categories from existing gigs
            const categories = await this.prisma.gig.findMany({
                where: { status: { not: 'DRAFT' } },
                select: { category: true },
                distinct: ['category']
            });

            const categoryList = categories
                .map(g => g.category)
                .filter(Boolean)
                .sort();

            res.json({
                success: true,
                data: categoryList
            });
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch categories'
            });
        }
    };

    // GET /gigs/public/skills - Get popular skills
    getPopularSkills = async (req, res) => {
        try {
            // Get all skills from gigs and count their frequency
            const gigs = await this.prisma.gig.findMany({
                where: { status: { not: 'DRAFT' } },
                select: { skillsRequired: true }
            });

            const skillCount = {};
            gigs.forEach(gig => {
                if (gig.skillsRequired && Array.isArray(gig.skillsRequired)) {
                    gig.skillsRequired.forEach(skill => {
                        skillCount[skill] = (skillCount[skill] || 0) + 1;
                    });
                }
            });

            // Sort by frequency and return top skills
            const popularSkills = Object.entries(skillCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20)
                .map(([skill]) => skill);

            res.json({
                success: true,
                data: popularSkills
            });
        } catch (error) {
            console.error('Error fetching popular skills:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch popular skills'
            });
        }
    };

    // GET /applications/received - Get all applications received on user's gigs
    getReceivedApplications = async (req, res) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Extract query parameters with defaults
            const {
                page = 1,
                limit = 20,
                status,
                sortBy = 'appliedAt',
                sort = 'desc',
                search,
                gigId,
                category
            } = req.query;

            const skip = (page - 1) * limit;

            // Build where conditions
            const where = {
                gig: {
                    postedById: userId // Only gigs created by current user
                }
            };

            // Add status filter if provided
            if (status) {
                if (Array.isArray(status)) {
                    where.status = { in: status };
                } else {
                    where.status = status;
                }
            }

            // Add specific gig filter if provided
            if (gigId) {
                where.gigId = gigId;
            }

            // Add category filter if provided
            if (category) {
                where.gig.category = category;
            }

            // Add search filter if provided (search in proposal or gig title)
            if (search) {
                where.OR = [
                    { proposal: { contains: search, mode: 'insensitive' } },
                    { gig: { title: { contains: search, mode: 'insensitive' } } }
                ];
            }

            // Build orderBy
            const orderBy = {};
            orderBy[sortBy] = sort === 'asc' ? 'asc' : 'desc';

            // Execute queries
            const [applications, total] = await Promise.all([
                this.prisma.application.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy,
                    include: {
                        gig: {
                            select: {
                                id: true,
                                title: true,
                                description: true,
                                budgetMin: true,
                                budgetMax: true,
                                budgetType: true,
                                category: true,
                                status: true,
                                deadline: true,
                                createdAt: true
                            }
                        },
                        _count: {
                            select: { submissions: true }
                        }
                    }
                }),
                this.prisma.application.count({ where })
            ]);

            // Format applications with additional metadata
            const formattedApplications = applications.map(app => ({
                id: app.id,
                gigId: app.gigId,
                applicantId: app.applicantId,
                applicantType: app.applicantType,
                proposal: app.proposal,
                quotedPrice: app.quotedPrice,
                estimatedTime: app.estimatedTime,
                portfolio: app.portfolio,
                status: app.status,
                appliedAt: app.appliedAt,
                respondedAt: app.respondedAt,
                rejectionReason: app.rejectionReason,
                submissionsCount: app._count.submissions,
                gig: {
                    ...app.gig,
                    daysOld: Math.floor((new Date() - new Date(app.gig.createdAt)) / (1000 * 60 * 60 * 24)),
                    daysUntilDeadline: app.gig.deadline ?
                        Math.ceil((new Date(app.gig.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null
                }
            }));

            res.json({
                success: true,
                data: {
                    applications: formattedApplications,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / limit),
                        hasNext: skip + parseInt(limit) < total,
                        hasPrev: parseInt(page) > 1
                    },
                    filters: {
                        status: status ? (Array.isArray(status) ? status : [status]) : [],
                        gigId,
                        category,
                        sortBy,
                        sortOrder: sort,
                        search
                    },
                    summary: {
                        totalApplications: total,
                        pendingCount: applications.filter(app => app.status === 'PENDING').length,
                        approvedCount: applications.filter(app => app.status === 'APPROVED').length,
                        rejectedCount: applications.filter(app => app.status === 'REJECTED').length,
                        withdrawnCount: applications.filter(app => app.status === 'WITHDRAWN').length
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching received applications:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch received applications'
            });
        }
    };

    // PUT /gigs/applications/:id - Update an application
    updateApplication = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            const { error, value } = GigController.applyGigSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: `${error.details.map(d => d.message).join(', ')}`,
                    details: error.details.map(d => d.message)
                });
            }

            // Check if application exists and belongs to user
            const application = await this.prisma.application.findUnique({
                where: { id }
            });

            if (!application) {
                return res.status(404).json({
                    success: false,
                    error: 'Application not found'
                });
            }

            if (application.applicantId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only update your own applications'
                });
            }

            if (application.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot update application that has been processed'
                });
            }

            const updatedApplication = await this.prisma.application.update({
                where: { id },
                data: {
                    ...value,
                    updatedAt: new Date()
                }
            });

            res.json({
                success: true,
                message: 'Application updated successfully',
                data: updatedApplication
            });
        } catch (error) {
            console.error('Error updating application:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update application'
            });
        }
    };

    // DELETE /gigs/applications/:id - Withdraw an application
    withdrawApplication = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Check if application exists and belongs to user
            const application = await this.prisma.application.findUnique({
                where: { id },
                include: { gig: true }
            });

            if (!application) {
                return res.status(404).json({
                    success: false,
                    error: 'Application not found'
                });
            }

            if (application.applicantId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only withdraw your own applications'
                });
            }

            if (application.status === 'APPROVED') {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot withdraw an approved application'
                });
            }

            // Delete the application
            await this.prisma.application.delete({
                where: { id }
            });

            // Publish events
            await this.publishEvent('application_withdrawn', {
                gigId: application.gigId,
                applicationId: id,
                applicantId: userId,
                gigOwnerId: application.gig.postedById
            });

            // Send notification to brand about withdrawal
            await this.publishEvent('application_withdrawn_notification', {
                recipientId: application.gig.postedById,
                recipientType: 'brand',
                gigId: application.gigId,
                gigTitle: application.gig.title,
                applicationId: id,
                applicantId: userId,
                message: `An applicant has withdrawn their application for "${application.gig.title}"`
            });

            // Send confirmation to applicant
            await this.publishEvent('application_withdrawal_confirmed', {
                recipientId: userId,
                recipientType: 'applicant',
                gigId: application.gigId,
                gigTitle: application.gig.title,
                applicationId: id,
                message: `You have successfully withdrawn your application for "${application.gig.title}"`
            });

            res.json({
                success: true,
                message: 'Application withdrawn successfully'
            });
        } catch (error) {
            console.error('Error withdrawing application:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to withdraw application'
            });
        }
    };

    // PUT /gigs/submissions/:id - Update a submission
    updateSubmission = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            const { error, value } = GigController.submitWorkSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: `${error.details.map(d => d.message).join(', ')}`,
                    details: error.details.map(d => d.message)
                });
            }

            // Check if submission exists and belongs to user
            const submission = await this.prisma.submission.findUnique({
                where: { id }
            });

            if (!submission) {
                return res.status(404).json({
                    success: false,
                    error: 'Submission not found'
                });
            }

            if (submission.submittedById !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only update your own submissions'
                });
            }

            if (submission.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot update submission that has been reviewed'
                });
            }

            const updatedSubmission = await this.prisma.submission.update({
                where: { id },
                data: {
                    ...value,
                    updatedAt: new Date()
                }
            });

            res.json({
                success: true,
                message: 'Submission updated successfully',
                data: updatedSubmission
            });
        } catch (error) {
            console.error('Error updating submission:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update submission'
            });
        }
    };

    // POST /gigs/:id/boost - Boost a gig (placeholder implementation)
    boostGig = async (req, res) => {
        try {
            const { id } = req.params;
            const { amount, duration } = req.body;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            if (!amount || !duration) {
                return res.status(400).json({
                    success: false,
                    error: 'Amount and duration are required'
                });
            }

            // Check if gig exists and belongs to user
            const gig = await this.prisma.gig.findUnique({
                where: { id }
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
                    error: 'You can only boost your own gigs'
                });
            }

            // For now, we'll just return a mock boost event
            // In a real implementation, this would integrate with a payment system
            const boostEvent = {
                id: `boost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                gigId: id,
                amount: parseFloat(amount),
                duration: parseInt(duration),
                startDate: new Date(),
                endDate: new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000),
                status: 'active'
            };

            // Publish event
            await this.publishEvent('gig_boosted', {
                gigId: id,
                gigTitle: gig.title,
                boostId: boostEvent.id,
                amount: boostEvent.amount,
                duration: boostEvent.duration,
                postedById: userId
            });

            res.json({
                success: true,
                message: 'Gig boosted successfully',
                data: boostEvent
            });
        } catch (error) {
            console.error('Error boosting gig:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to boost gig'
            });
        }
    };

    // GET /gigs/:id/boosts - Get gig boosts (placeholder implementation)
    getGigBoosts = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Check if gig exists and belongs to user
            const gig = await this.prisma.gig.findUnique({
                where: { id }
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
                    error: 'You can only view boosts for your own gigs'
                });
            }

            // For now, return empty array as this is a placeholder
            // In a real implementation, this would fetch from a boosts table
            res.json({
                success: true,
                data: []
            });
        } catch (error) {
            console.error('Error fetching gig boosts:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch gig boosts'
            });
        }
    };

    // Helper method to publish events with proper routing
    publishEvent = async (eventType, eventData) => {
        try {
            if (rabbitmqService.isConnected) {
                const baseEvent = {
                    ...eventData,
                    eventType: eventType, // Include the specific event type
                    timestamp: new Date().toISOString(),
                    eventId: `gig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    service: 'gig-service'
                };

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
            }
        } catch (error) {
            console.error(`❌ [Gig Service] Failed to publish ${eventType} event:`, error);
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

    // Helper to calculate on-time delivery
    calculateOnTimeDelivery = (gig) => {
        if (!gig.deadline) return true; // No deadline means can't be late
        return new Date() <= new Date(gig.deadline);
    };

    // Helper to calculate delivery time in days
    calculateDeliveryTime = (gig) => {
        if (!gig.createdAt) return 0;
        const createdDate = new Date(gig.createdAt);
        const completedDate = new Date();
        return Math.ceil((completedDate - createdDate) / (1000 * 60 * 60 * 24));
    };

    // GET /gigs/:id/applications - Get applications for a gig (gig owner only)
    getGigApplications = async (req, res) => {
        try {
            const { gigId } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!gigId) {
                return res.status(400).json({
                    success: false,
                    error: 'Gig ID is required'
                });
            }

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Check if gig exists
            const gig = await this.prisma.gig.findUnique({
                where: { id: gigId }
            });

            if (!gig) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }

            // Check if current user owns this gig
            if (gig.postedById !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only view applications for gigs you posted'
                });
            }

            // Get ALL applications to this gig (for gig owner to review)
            const applications = await this.prisma.application.findMany({
                where: {
                    gigId: gigId
                },
                orderBy: { appliedAt: 'desc' },
                include: {
                    _count: {
                        select: { submissions: true }
                    },
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            budgetMin: true,
                            budgetMax: true,
                            category: true,
                            status: true,
                            deadline: true,
                            createdAt: true
                        }
                    }
                }
            });

            const applicationsStatus = applications.map((application) => ({ gigId: application.gigId, status: application.status }));
            console.log('applicationsStatus', applicationsStatus);
            res.json({
                success: true,
                data: {
                    applicationsStatus: applicationsStatus,
                    gig: {
                        id: gig.id,
                        title: gig.title,
                        category: gig.category,
                        status: gig.status
                    },
                    applications: applications,
                    totalApplications: applications.length
                }
            });
        } catch (error) {
            console.error('Error fetching gig applications:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch applications'
            });
        }
    };

    // GET /gigs/:id/my-application - Get user's own application to a specific gig (for applicants)
    getMyApplicationToGig = async (req, res) => {
        try {
            const { gigId } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!gigId) {
                return res.status(400).json({
                    success: false,
                    error: 'Gig ID is required'
                });
            }

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Check if gig exists
            const gig = await this.prisma.gig.findUnique({
                where: { id: gigId }
            });

            if (!gig) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }

            // Check if user has applied to this gig
            const application = await this.prisma.application.findFirst({
                where: {
                    gigId: gigId,
                    OR: [
                        { applicantId: userId },
                        { clanId: userId } // In case user applied as a clan
                    ]
                },
                include: {
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            category: true,
                            status: true,
                            budgetMin: true,
                            budgetMax: true,
                            deadline: true,
                            createdAt: true
                        }
                    }
                }
            });

            if (!application) {
                return res.status(400).json({
                    success: false,
                    error: 'You have not applied to this gig'
                });
            }

            const applicationStatus = {
                gigId: application.gigId,
                status: application.status
            };

            res.json({
                success: true,
                data: {
                    application: application,
                    gig: application.gig,
                    applicationStatus: applicationStatus
                }
            });

        } catch (error) {
            console.error('Error in getMyApplicationToGig:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch your application'
            });
        }
    };

    // POST /applications/:id/accept - Accept a specific application
    approveApplication = async (req, res) => {
        try {
            const { id } = req.params;

            const application = await this.prisma.application.findUnique({
                where: { id },
                include: { gig: true }
            });

            if (!application) {
                return res.status(404).json({
                    success: false,
                    error: 'Application not found'
                });
            }

            // Check if user owns the gig
            if (application.gig.postedById !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only accept applications for your own gigs'
                });
            }

            if (application.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    error: 'Application has already been processed'
                });
            }

            // Update application and gig in transaction
            const result = await this.prisma.$transaction(async (tx) => {
                // Update application
                const updatedApplication = await tx.application.update({
                    where: { id },
                    data: {
                        status: 'APPROVED',
                        respondedAt: new Date()
                    }
                });

                // Update gig
                const updatedGig = await tx.gig.update({
                    where: { id: application.gigId },
                    data: {
                        status: 'ASSIGNED',
                        assignedToId: application.applicantId,
                        assignedToType: application.applicantType
                    }
                });

                // Create assignment and milestones for clan applications
                if (application.applicantType === 'clan' && application.milestonePlan) {
                    const assignment = await tx.gigAssignment.create({
                        data: {
                            gigId: application.gigId,
                            applicationId: id,
                            assigneeType: 'clan',
                            assigneeId: application.applicantId,
                            clanId: application.applicantId,
                            teamPlanSnapshot: application.teamPlan,
                            milestonePlanSnapshot: application.milestonePlan,
                            payoutSplitSnapshot: application.payoutSplit,
                            status: 'ACTIVE'
                        }
                    });

                    // Create milestones from the plan
                    for (const milestone of application.milestonePlan) {
                        await tx.gigMilestone.create({
                            data: {
                                gigId: application.gigId,
                                assignmentId: assignment.id,
                                title: milestone.title,
                                description: milestone.description || null,
                                dueAt: new Date(milestone.dueAt),
                                amount: milestone.amount,
                                deliverables: milestone.deliverables || [],
                                status: 'PENDING'
                            }
                        });
                    }

                    return [updatedApplication, updatedGig, assignment];
                }

                return [updatedApplication, updatedGig];
            });

            // Publish events
            await this.publishEvent('application_accepted', {
                gigId: application.gigId,
                gigTitle: application.gig.title,
                applicationId: id,
                applicantId: application.applicantId,
                applicantType: application.applicantType,
                gigOwnerId: application.gig.postedById
            });

            // Send notification to applicant about acceptance
            await this.publishEvent('application_approved_notification', {
                recipientId: application.applicantId,
                recipientType: 'applicant',
                gigId: application.gigId,
                gigTitle: application.gig.title,
                applicationId: id,
                message: `Congratulations! Your application for "${application.gig.title}" has been approved`
            });

            // If approved application is from a clan, notify all clan members
            if (application.applicantType === 'clan') {
                try {
                    // Get clan members from clan-service via API Gateway
                    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
                    const clanResponse = await fetch(`${BASE_URL}/api/members/${encodeURIComponent(application.applicantId)}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-internal': 'true',
                            'x-calling-service': 'gig-service'
                        }
                    });

                    if (clanResponse.ok) {
                        const clanData = await clanResponse.json();
                        const members = clanData?.data?.members || [];

                        // Publish individual notification events for each clan member
                        for (const member of members) {
                            await this.publishEvent('clan_gig_approved_member_notification', {
                                gigId: application.gigId,
                                gigTitle: application.gig.title,
                                clanId: application.applicantId,
                                clanName: application.gig.title, // You might want to get actual clan name
                                memberId: member.userId,
                                memberRole: member.role,
                                gigOwnerId: application.gig.postedById,
                                applicationId: id,
                                milestoneCount: application.milestonePlan?.length || 0,
                                totalAmount: application.quotedPrice,
                                assignedAt: new Date().toISOString()
                            });
                        }

                        // Publish general clan gig approved event
                        await this.publishEvent('clan_gig_approved', {
                            gigId: application.gigId,
                            gigTitle: application.gig.title,
                            clanId: application.applicantId,
                            gigOwnerId: application.gig.postedById,
                            applicationId: id,
                            memberCount: members.length,
                            milestoneCount: application.milestonePlan?.length || 0,
                            totalAmount: application.quotedPrice,
                            assignedAt: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.error('Failed to notify clan members:', error);
                    // Don't fail the main request if notification fails
                }
            }

            // Publish reputation event for application acceptance
            try {
                await rabbitmqService.publishReputationEvent('gig.application.accepted', {
                    applicationId: id,
                    applicantId: application.applicantId,
                    gigId: application.gigId,
                    clientId: application.gig.postedById,
                    acceptedAt: new Date().toISOString(),
                    quotedPrice: application.quotedPrice
                });
                console.log('✅ [Gig Service] Reputation event published for application acceptance:', id);
            } catch (reputationError) {
                console.error('❌ [Gig Service] Failed to publish reputation event for application acceptance:', reputationError);
            }

            res.json({
                success: true,
                message: 'Application accepted successfully',
                data: result[0],
                assignment: application.applicantType === 'clan' ? result[2] : null
            });
        } catch (error) {
            console.error('Error accepting application:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to accept application'
            });
        }
    };

    // POST /applications/:id/reject - Reject a specific application
    rejectApplication = async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const application = await this.prisma.application.findUnique({
                where: { id },
                include: { gig: true }
            });

            if (!application) {
                return res.status(404).json({
                    success: false,
                    error: 'Application not found'
                });
            }

            // Check if user owns the gig
            if (application.gig.postedById !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only reject applications for your own gigs'
                });
            }

            if (application.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    error: 'Application has already been processed'
                });
            }

            const updatedApplication = await this.prisma.application.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    rejectionReason: reason,
                    respondedAt: new Date()
                }
            });

            // Publish event
            await this.publishEvent('application_rejected', {
                gigId: application.gigId,
                gigTitle: application.gig.title,
                applicationId: id,
                applicantId: application.applicantId,
                reason: reason,
                gigOwnerId: application.gig.postedById
            });

            res.json({
                success: true,
                message: 'Application rejected',
                data: updatedApplication
            });
        } catch (error) {
            console.error('Error rejecting application:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to reject application'
            });
        }
    };

    // POST /applications/:id/accept-invitation - User accepts gig invitation
    acceptInvitation = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Validate UPI ID requirement
            const { error, value } = GigController.acceptInvitationSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.details.map(detail => ({
                        field: detail.path.join('.'),
                        message: detail.message
                    }))
                });
            }

            // Try to find application by ID first, then fallback to finding by gig ID
            let targetApplication = await this.prisma.application.findUnique({
                where: { id },
                include: { gig: true }
            });

            // If application not found by ID, check if the ID might be a gig ID instead
            if (!targetApplication) {
                const applicationsByGigId = await this.prisma.application.findMany({
                    where: {
                        gigId: id, // Check if the ID is actually a gig ID
                        applicantId: userId,
                        applicantType: 'owner'
                    }
                });

                if (applicationsByGigId.length > 0) {
                    targetApplication = await this.prisma.application.findUnique({
                        where: { id: applicationsByGigId[0].id },
                        include: { gig: true }
                    });
                }
            }

            if (!targetApplication) {
                return res.status(404).json({
                    success: false,
                    error: 'Application not found'
                });
            }

            // Use the correct application ID for the rest of the process
            const actualApplicationId = targetApplication.id;

            // Check if this is an invitation for the current user
            if (targetApplication.applicantId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only accept invitations sent to you'
                });
            }

            // Check if this is actually an invitation (applicantType: "owner")
            if (targetApplication.applicantType !== 'owner') {
                return res.status(400).json({
                    success: false,
                    error: 'This is not a gig invitation'
                });
            }

            if (targetApplication.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    error: 'Invitation has already been processed'
                });
            }

            // Update application and gig in transaction (same logic as approveApplication)
            const result = await this.prisma.$transaction(async (tx) => {
                // Update application
                const updatedApplication = await tx.application.update({
                    where: { id: actualApplicationId },
                    data: {
                        status: 'APPROVED',
                        respondedAt: new Date(),
                        upiId: value.upiId
                    }
                });

                // Update gig
                const updatedGig = await tx.gig.update({
                    where: { id: targetApplication.gigId },
                    data: {
                        status: 'ASSIGNED',
                        assignedToId: targetApplication.applicantId,
                        assignedToType: targetApplication.applicantType
                    }
                });

                // Reject all other applications
                await tx.application.updateMany({
                    where: {
                        gigId: targetApplication.gigId,
                        id: { not: actualApplicationId },
                        status: 'PENDING'
                    },
                    data: {
                        status: 'REJECTED',
                        respondedAt: new Date()
                    }
                });

                // Create assignment and milestones for clan applications
                if (targetApplication.clanId && targetApplication.milestonePlan) {
                    const assignment = await tx.gigAssignment.create({
                        data: {
                            gigId: targetApplication.gigId,
                            applicationId: actualApplicationId,
                            assigneeType: 'clan',
                            assigneeId: targetApplication.applicantId,
                            clanId: targetApplication.clanId,
                            teamPlanSnapshot: targetApplication.teamPlan,
                            milestonePlanSnapshot: targetApplication.milestonePlan,
                            payoutSplitSnapshot: targetApplication.payoutSplit,
                            status: 'ACTIVE'
                        }
                    });

                    // Create milestones from the plan
                    for (const milestone of targetApplication.milestonePlan) {
                        await tx.gigMilestone.create({
                            data: {
                                gigId: targetApplication.gigId,
                                assignmentId: assignment.id,
                                title: milestone.title,
                                description: milestone.description || null,
                                dueAt: new Date(milestone.dueAt),
                                amount: milestone.amount,
                                deliverables: milestone.deliverables || [],
                                status: 'PENDING'
                            }
                        });
                    }

                    return [updatedApplication, updatedGig, assignment];
                }

                return [updatedApplication, updatedGig];
            });

            // Publish events
            await this.publishEvent('gig_invitation_accepted', {
                gigId: targetApplication.gigId,
                gigTitle: targetApplication.gig.title,
                applicationId: actualApplicationId,
                acceptedByUserId: userId,
                gigOwnerId: targetApplication.gig.postedById,
                clanId: targetApplication.clanId || undefined
            });

            // Send notification to gig owner about acceptance
            await this.publishEvent('gig_invitation_accepted_notification', {
                recipientId: targetApplication.gig.postedById,
                recipientType: 'gig_owner',
                gigId: targetApplication.gigId,
                gigTitle: targetApplication.gig.title,
                applicationId: actualApplicationId,
                acceptedByUserId: userId,
                message: `Your gig invitation for "${targetApplication.gig.title}" has been accepted`
            });

            // If clan invitation accepted, notify all clan members
            if (targetApplication.clanId) {
                try {
                    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
                    const clanResponse = await fetch(`${BASE_URL}/api/members/${encodeURIComponent(targetApplication.clanId)}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-internal': 'true',
                            'x-calling-service': 'gig-service'
                        }
                    });

                    if (clanResponse.ok) {
                        const clanData = await clanResponse.json();
                        const members = clanData?.data?.members || [];

                        for (const member of members) {
                            await this.publishEvent('clan_gig_invitation_accepted_member_notification', {
                                gigId: targetApplication.gigId,
                                gigTitle: targetApplication.gig.title,
                                clanId: targetApplication.clanId,
                                memberId: member.userId,
                                memberRole: member.role,
                                gigOwnerId: targetApplication.gig.postedById,
                                applicationId: actualApplicationId,
                                acceptedAt: new Date().toISOString()
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to notify clan members:', error);
                }
            }

            res.json({
                success: true,
                message: 'Gig invitation accepted successfully',
                data: result[0],
                assignment: targetApplication.clanId ? result[2] : null
            });
        } catch (error) {
            console.error('Error accepting gig invitation:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to accept gig invitation'
            });
        }
    };

    // POST /applications/:id/reject-invitation - User rejects gig invitation
    rejectInvitation = async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const application = await this.prisma.application.findUnique({
                where: { id },
                include: { gig: true }
            });

            if (!application) {
                return res.status(404).json({
                    success: false,
                    error: 'Application not found'
                });
            }

            // Check if this is an invitation for the current user
            if (application.applicantId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only reject invitations sent to you'
                });
            }

            // Check if this is actually an invitation (applicantType: "owner")
            if (application.applicantType !== 'owner') {
                return res.status(400).json({
                    success: false,
                    error: 'This is not a gig invitation'
                });
            }

            if (application.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    error: 'Invitation has already been processed'
                });
            }

            const updatedApplication = await this.prisma.application.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    rejectionReason: reason || 'Invitation declined by user',
                    respondedAt: new Date()
                }
            });

            // Publish events
            await this.publishEvent('gig_invitation_rejected', {
                gigId: application.gigId,
                gigTitle: application.gig.title,
                applicationId: id,
                rejectedByUserId: userId,
                gigOwnerId: application.gig.postedById,
                reason: reason || 'Invitation declined by user',
                clanId: application.clanId || undefined
            });

            // Send notification to gig owner about rejection
            await this.publishEvent('gig_invitation_rejected_notification', {
                recipientId: application.gig.postedById,
                recipientType: 'gig_owner',
                gigId: application.gigId,
                gigTitle: application.gig.title,
                applicationId: id,
                rejectedByUserId: userId,
                reason: reason || 'Invitation declined by user',
                message: `Your gig invitation for "${application.gig.title}" has been declined`
            });

            res.json({
                success: true,
                message: 'Gig invitation rejected',
                data: updatedApplication
            });
        } catch (error) {
            console.error('Error rejecting gig invitation:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to reject gig invitation'
            });
        }
    };

    // POST /gigs/:id/submit - Submit work for a gig (assigned applicant only)
    submitWork = async (req, res) => {
        try {
            const { id } = req.params;

            const { error, value } = GigController.submitWorkSchema.validate(req.body);

            if (error) {
                return res.status(400).json({
                    success: false,
                    error: `${error.details.map(d => d.message).join(', ')}`,
                    details: error.details.map(d => d.message)
                });
            }

            // Check if gig exists and user is assigned to it
            const gig = await this.prisma.gig.findUnique({
                where: { id }
            });

            if (!gig) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }

            // Check if user has an approved application for this gig
            const application = await this.prisma.application.findFirst({
                where: {
                    gigId: id,
                    applicantId: req.user.id,
                    status: 'APPROVED'
                }
            });

            if (!application) {
                return res.status(403).json({
                    success: false,
                    error: 'You are not assigned to this gig'
                });
            }

            // Check if user already has a pending or approved submission
            const existingSubmission = await this.prisma.submission.findFirst({
                where: {
                    gigId: id,
                    submittedById: req.user.id,
                    status: {
                        in: ['PENDING', 'APPROVED'] // Only block if pending review or already approved
                        // Allow re-submission if previous was REJECTED or REVISION
                    }
                }
            });

            if (existingSubmission) {
                return res.status(400).json({
                    success: false,
                    error: 'You have already submitted work for this gig that is pending review or approved'
                });
            }

            if (gig.status !== 'ASSIGNED' && gig.status !== 'OPEN') {
                return res.status(400).json({
                    success: false,
                    error: 'Gig is not in a state that accepts submissions'
                });
            }

            // Check if deadline has passed
            if (gig.deadline && new Date() > new Date(gig.deadline)) {
                return res.status(400).json({
                    success: false,
                    error: 'Submission deadline has passed'
                });
            }

            // Process deliverables to ensure they have at least one valid input
            const processedDeliverables = value.deliverables.map(deliverable => {
                // Ensure each deliverable has at least content, url, or file
                if (!deliverable.content && !deliverable.url && !deliverable.file) {
                    throw new Error(`Deliverable must have content, URL, or file`);
                }
                return deliverable;
            });

            // Convert deliverables to JSON strings for storage
            const deliverablesAsStrings = processedDeliverables.map(deliverable =>
                JSON.stringify(deliverable)
            );

            // Create submission and update application status in a transaction
            const result = await this.prisma.$transaction(async (tx) => {
                // Create submission
                const submission = await tx.submission.create({
                    data: {
                        gigId: id,
                        applicationId: application.id,
                        submittedById: req.user.id,
                        upiId: application.upiId || null,
                        submittedByType: application.applicantType,
                        title: value.title,
                        description: value.description,
                        deliverables: deliverablesAsStrings,
                        notes: value.notes || null
                    }
                });

                // Update application status to indicate work has been submitted
                await tx.application.update({
                    where: { id: application.id },
                    data: { status: 'SUBMITTED' }
                });

                return submission;
            });

            const submission = result;

            // Note: We don't update gig status here since gig can have multiple applicants
            // Each application and submission has its own independent lifecycle

            // Publish events
            await this.publishEvent('work_submitted', {
                gigId: id,
                gigTitle: gig.title,
                submissionId: submission.id,
                submittedById: req.user.id,
                gigOwnerId: gig.postedById,
                submissionTitle: value.title
            });

            // Send notification to brand about work submission
            await this.publishEvent('work_submitted_notification', {
                recipientId: gig.postedById,
                recipientType: 'brand',
                gigId: id,
                gigTitle: gig.title,
                submissionId: submission.id,
                submittedById: req.user.id,
                submissionTitle: value.title,
                message: `Work has been submitted for "${gig.title}" - "${value.title}"`
            });

            // Send confirmation to applicant
            await this.publishEvent('work_submission_confirmed', {
                recipientId: req.user.id,
                recipientType: 'applicant',
                gigId: id,
                gigTitle: gig.title,
                submissionId: submission.id,
                submissionTitle: value.title,
                message: `Your work "${value.title}" has been submitted for "${gig.title}"`
            });

            res.status(201).json({
                success: true,
                message: 'Work submitted successfully',
                data: submission
            });
        } catch (error) {
            console.error('Error submitting work:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to submit work'
            });
        }
    };

    // GET /gigs/:id/submissions - Get submissions for a gig (gig owner only)
    getGigSubmissions = async (req, res) => {
        try {
            const { id } = req.params;

            // Check if user owns this gig
            const gig = await this.prisma.gig.findUnique({
                where: { id }
            });

            if (!gig) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }

            if (gig.postedById !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only view submissions for your own gigs'
                });
            }

            const submissions = await this.prisma.submission.findMany({
                where: { gigId: id },
                include: {
                    application: {
                        select: {
                            id: true,
                            applicantId: true,
                            applicantType: true,
                            quotedPrice: true,
                            status: true
                        }
                    }
                },
                orderBy: { submittedAt: 'desc' }
            });

            res.json({
                success: true,
                data: submissions
            });
        } catch (error) {
            console.error('Error fetching submissions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch submissions'
            });
        }
    };

    // POST /submissions/:id/review - Review a submission (approve/reject/request revision)
    reviewSubmission = async (req, res) => {
        try {
            const { id } = req.params;
            const { error, value } = GigController.reviewSubmissionSchema.validate(req.body);

            if (error) {
                return res.status(400).json({
                    success: false,
                    error: `${error.details.map(d => d.message).join(', ')}`,
                    details: error.details.map(d => d.message)
                });
            }

            const submission = await this.prisma.submission.findUnique({
                where: { id },
                include: {
                    gig: true,
                    application: true // Include application to get quotedPrice
                }
            });

            if (!submission) {
                return res.status(404).json({
                    success: false,
                    error: 'Submission not found'
                });
            }

            // Check if user owns the gig
            if (submission.gig.postedById !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only review submissions for your own gigs'
                });
            }

            if (submission.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    error: 'Submission has already been reviewed'
                });
            }

            // Update submission
            const updatedSubmission = await this.prisma.submission.update({
                where: { id },
                data: {
                    status: value.status,
                    feedback: value.feedback,
                    rating: value.rating,
                    reviewedAt: new Date()
                }
            });

            // Update application status based on review (don't change gig status)
            if (submission.applicationId) {
                await this.prisma.$transaction(async (tx) => {
                    if (value.status === 'APPROVED') {
                        // Update application status to CLOSED when submission is approved
                        await tx.application.update({
                            where: { id: submission.applicationId },
                            data: { status: 'CLOSED' }
                        });
                    } else if (value.status === 'REVISION') {
                        // Revert application status back to APPROVED for revision
                        await tx.application.update({
                            where: { id: submission.applicationId },
                            data: { status: 'APPROVED' }
                        });
                    }
                    // For REJECTED status, we might want to set application back to APPROVED
                    // or keep it as SUBMITTED depending on business logic
                    else if (value.status === 'REJECTED') {
                        await tx.application.update({
                            where: { id: submission.applicationId },
                            data: { status: 'APPROVED' } // Allow re-submission
                        });
                    }
                });
            }

            // Publish events
            await this.publishEvent('submission_reviewed', {
                gigId: submission.gigId,
                submissionId: id,
                reviewStatus: value.status,
                submittedById: submission.submittedById,
                gigOwnerId: submission.gig.postedById,
                rating: value.rating,
                gigCompleted: value.status === 'APPROVED'
            });

            // If submission is approved, publish work history events
            if (value.status === 'APPROVED') {
                console.log('🎉 [Gig Service] Submission approved - publishing work history events for gig:', submission.gigId);

                // Publish gig.completed event for work history service
                await rabbitmqService.publishGigEvent('gig.completed', {
                    gigId: submission.gigId,
                    userId: submission.submittedById,
                    clientId: submission.gig.postedById,
                    gigData: {
                        title: submission.gig.title,
                        description: submission.gig.description,
                        category: submission.gig.category,
                        skills: submission.gig.skillsRequired || [],
                        budgetRange: submission.gig.budgetMin && submission.gig.budgetMax
                            ? `${submission.gig.budgetMin}-${submission.gig.budgetMax}`
                            : '0-100'
                    },
                    completionData: {
                        completedAt: new Date().toISOString(),
                        actualAmount: submission.application?.quotedPrice || submission.gig.budgetMax || 0,
                        rating: value.rating,
                        feedback: value.feedback,
                        withinBudget: true
                    },
                    deliveryData: {
                        deliveryTime: this.calculateDeliveryTime(submission.gig),
                        onTime: this.calculateOnTimeDelivery(submission.gig),
                        portfolioItems: submission.deliverables?.map(item => ({
                            title: item.description || submission.title,
                            description: item.description || '',
                            type: item.type || 'other',
                            url: item.url || null,
                            thumbnailUrl: null,
                            fileSize: null,
                            format: item.type || 'unknown',
                            isPublic: true
                        })) || []
                    }
                });

                // Also publish gig.delivered event for the delivery tracking
                await rabbitmqService.publishGigEvent('gig.delivered', {
                    gigId: submission.gigId,
                    userId: submission.submittedById,
                    clientId: submission.gig.postedById,
                    deliveryData: {
                        submissionTitle: submission.title,
                        deliveredAt: new Date().toISOString()
                    }
                });

                // If rating is provided, also publish gig.rated event
                if (value.rating) {
                    await rabbitmqService.publishGigEvent('gig.rated', {
                        gigId: submission.gigId,
                        userId: submission.submittedById,
                        clientId: submission.gig.postedById,
                        rating: value.rating,
                        feedback: value.feedback,
                        ratedAt: new Date().toISOString()
                    });
                }

                console.log('✅ [Gig Service] Work history events published successfully for gig:', submission.gigId);

                // Publish reputation events for score updates
                try {
                    // Publish gig.completed event for reputation service
                    await rabbitmqService.publishReputationEvent('gig.completed', {
                        gigId: submission.gigId,
                        creatorId: submission.submittedById,
                        clientId: submission.gig.postedById,
                        rating: value.rating,
                        completedAt: new Date().toISOString(),
                        gigData: {
                            title: submission.gig.title,
                            category: submission.gig.category,
                            budgetAmount: submission.application?.quotedPrice || submission.gig.budgetMax || 0
                        }
                    });

                    // If rating is provided, also publish gig.rated event for reputation
                    if (value.rating) {
                        await rabbitmqService.publishReputationEvent('gig.rated', {
                            gigId: submission.gigId,
                            ratedUserId: submission.submittedById,
                            rating: value.rating,
                            feedback: value.feedback,
                            ratedAt: new Date().toISOString()
                        });
                    }

                    console.log('✅ [Gig Service] Reputation events published successfully for gig:', submission.gigId);
                } catch (reputationError) {
                    console.error('❌ [Gig Service] Failed to publish reputation events:', reputationError);
                }
            }

            // Send notification to applicant about review result
            let reviewMessage = '';
            if (value.status === 'APPROVED') {
                reviewMessage = `Great news! Your submission for "${submission.gig.title}" has been approved${value.rating ? (` with a ${value.rating}-star rating`) : ''}`;
            } else if (value.status === 'REJECTED') {
                reviewMessage = `Your submission for "${submission.gig.title}" needs improvement. Please check the feedback and resubmit.`;
            } else if (value.status === 'REVISION') {
                reviewMessage = `Your submission for "${submission.gig.title}" requires revision. Please check the feedback and make necessary changes.`;
            }

            await this.publishEvent('submission_reviewed_notification', {
                recipientId: submission.submittedById,
                recipientType: 'applicant',
                gigId: submission.gigId,
                gigTitle: submission.gig.title,
                submissionId: id,
                reviewStatus: value.status,
                rating: value.rating,
                feedback: value.feedback,
                message: reviewMessage
            });

            res.json({
                success: true,
                message: `Submission ${value.status.toLowerCase()} successfully`,
                data: updatedSubmission
            });
        } catch (error) {
            console.error('Error reviewing submission:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to review submission'
            });
        }
    };

    // PUT /gigs/:id/status - Update gig status (gig owner only)
    updateGigStatus = async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const validStatuses = ['DRAFT', 'OPEN', 'IN_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];

            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status',
                    validStatuses
                });
            }

            const gig = await this.prisma.gig.findUnique({
                where: { id }
            });

            if (!gig) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }

            if (gig.postedById !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only update your own gigs'
                });
            }

            const updatedGig = await this.prisma.gig.update({
                where: { id },
                data: {
                    status,
                    ...(status === 'COMPLETED' && { completedAt: new Date() })
                }
            });

            // Publish event
            await this.publishEvent('gig_status_updated', {
                gigId: id,
                oldStatus: gig.status,
                newStatus: status,
                gigOwnerId: gig.postedById,
                assignedToId: gig.assignedToId
            });

            res.json({
                success: true,
                message: 'Gig status updated successfully',
                data: updatedGig
            });
        } catch (error) {
            console.error('Error updating gig status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update gig status'
            });
        }
    };

    // ==================== CREW BID MANAGEMENT ====================

    // GET /crew/bids - Get user's bids with filtering and sorting
    getCrewBids = async (req, res) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            const {
                status,
                sortBy = 'recent',
                page = 1,
                limit = 20,
                search
            } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Build where clause
            const where = {
                applicantId: userId
            };

            if (status && status !== 'all') {
                where.status = status;
            }

            if (search) {
                where.OR = [
                    {
                        gig: {
                            title: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    },
                    {
                        gig: {
                            description: {
                                contains: search,
                                mode: 'insensitive'
                            }
                        }
                    }
                ];
            }

            // Build order by clause
            let orderBy = {};
            switch (sortBy) {
                case 'amount':
                    orderBy.quotedPrice = 'desc';
                    break;
                case 'deadline':
                    orderBy.gig = {
                        deadline: 'asc'
                    };
                    break;
                case 'recent':
                default:
                    orderBy.appliedAt = 'desc';
                    break;
            }

            // Get bids with gig details
            const bids = await this.prisma.application.findMany({
                where,
                include: {
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            budgetMin: true,
                            budgetMax: true,
                            budgetType: true,
                            deadline: true,
                            status: true,
                            category: true,
                            skillsRequired: true,
                            location: true,
                            postedById: true,
                            postedByType: true,
                            // applicantType: true
                        }
                    }
                },
                orderBy,
                skip,
                take: parseInt(limit)
            });

            // Get total count
            const total = await this.prisma.application.count({ where });

            // Transform data to match client expectations
            const transformedBids = bids.map(bid => ({
                id: bid.id,
                projectId: bid.gigId,
                projectTitle: bid.gig.title,
                clientName: `Client ${bid.gig.postedById.slice(-4)}`, // Placeholder since we don't have user names
                bidAmount: bid.quotedPrice,
                proposedDuration: bid.estimatedTime,
                message: bid.proposal,
                status: bid.status,
                submittedAt: bid.appliedAt,
                responseAt: bid.respondedAt,
                projectDeadline: bid.gig.deadline,
                projectBudget: {
                    min: bid.gig.budgetMin,
                    max: bid.gig.budgetMax,
                    type: bid.gig.budgetType?.toUpperCase() || 'FIXED'
                },
                attachments: bid.portfolio || [],
                skills: bid.gig.skillsRequired || [],
                location: bid.gig.location,
                category: bid.gig.category,
                projectStatus: bid.gig.status,
                applicantType: bid.applicantType
            }));

            res.json({
                success: true,
                data: {
                    bids: transformedBids,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit)),
                        hasNext: skip + parseInt(limit) < total,
                        hasPrev: parseInt(page) > 1
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching crew bids:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch bids',
                error: {
                    name: error.name,
                    message: error.message
                }
            });
        }
    };

    // GET /crew/bids/stats - Get user's bid statistics
    getCrewBidStats = async (req, res) => {
        try {
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Get all user's bids
            const allBids = await this.prisma.application.findMany({
                where: { applicantId: userId },
                include: {
                    gig: {
                        select: {
                            budgetMin: true,
                            budgetMax: true,
                            budgetType: true
                        }
                    }
                }
            });

            // Calculate statistics
            const totalBids = allBids.length;
            const pendingBids = allBids.filter(bid => bid.status === 'PENDING').length;
            const acceptedBids = allBids.filter(bid => bid.status === 'APPROVED').length;
            const rejectedBids = allBids.filter(bid => bid.status === 'REJECTED').length;

            const successRate = totalBids > 0 ? (acceptedBids / totalBids) * 100 : 0;

            // Calculate total value (only accepted bids)
            const totalValue = allBids
                .filter(bid => bid.status === 'APPROVED')
                .reduce((sum, bid) => sum + (bid.quotedPrice || 0), 0);

            // Calculate average response time (for responded bids)
            const respondedBids = allBids.filter(bid =>
                bid.status !== 'PENDING' && bid.updatedAt && bid.createdAt
            );

            let avgResponseTime = 0;
            if (respondedBids.length > 0) {
                const totalResponseTime = respondedBids.reduce((sum, bid) => {
                    const responseTime = new Date(bid.updatedAt) - new Date(bid.createdAt);
                    return sum + responseTime;
                }, 0);
                avgResponseTime = totalResponseTime / respondedBids.length / (1000 * 60 * 60); // Convert to hours
            }

            res.json({
                success: true,
                data: {
                    totalBids,
                    pendingBids,
                    acceptedBids,
                    rejectedBids,
                    successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
                    avgResponseTime: Math.round(avgResponseTime * 10) / 10, // Round to 1 decimal
                    totalValue
                }
            });
        } catch (error) {
            console.error('Error fetching crew bid stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch bid statistics'
            });
        }
    };

    // PATCH /crew/bids/:id/withdraw - Withdraw a bid
    withdrawCrewBid = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            // Find the bid
            const bid = await this.prisma.application.findUnique({
                where: { id },
                include: {
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            postedById: true
                        }
                    }
                }
            });

            if (!bid) {
                return res.status(404).json({
                    success: false,
                    error: 'Bid not found'
                });
            }

            // Check if user owns this bid
            if (bid.applicantId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only withdraw your own bids'
                });
            }

            // Check if bid can be withdrawn
            if (bid.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    error: 'Only pending bids can be withdrawn'
                });
            }

            // Update bid status
            const updatedBid = await this.prisma.application.update({
                where: { id },
                data: {
                    status: 'WITHDRAWN',
                    updatedAt: new Date()
                }
            });

            // Publish event
            await this.publishEvent('application_withdrawn', {
                applicationId: id,
                gigId: bid.gigId,
                applicantId: userId,
                gigOwnerId: bid.gig.postedById,
                gigTitle: bid.gig.title
            });

            res.json({
                success: true,
                message: 'Bid withdrawn successfully',
                data: {
                    id: updatedBid.id,
                    status: updatedBid.status
                }
            });
        } catch (error) {
            console.error('Error withdrawing bid:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to withdraw bid'
            });
        }
    };

    // GET /crew/bids/:id - Get specific bid details
    getCrewBidDetails = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            const bid = await this.prisma.application.findUnique({
                where: { id },
                include: {
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            budgetMin: true,
                            budgetMax: true,
                            budgetType: true,
                            deadline: true,
                            status: true,
                            category: true,
                            skillsRequired: true,
                            location: true,
                            postedById: true,
                            postedByType: true
                        }
                    }
                }
            });

            if (!bid) {
                return res.status(404).json({
                    success: false,
                    error: 'Bid not found'
                });
            }

            if (bid.applicantId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only view your own bids'
                });
            }

            // Transform to match client expectations
            const transformedBid = {
                id: bid.id,
                projectId: bid.gigId,
                projectTitle: bid.gig.title,
                clientName: `Client ${bid.gig.postedById.slice(-4)}`, // Placeholder
                bidAmount: bid.quotedPrice,
                proposedDuration: bid.estimatedTime,
                message: bid.proposal,
                status: bid.status,
                submittedAt: bid.appliedAt,
                responseAt: bid.respondedAt,
                projectDeadline: bid.gig.deadline,
                projectBudget: {
                    min: bid.gig.budgetMin,
                    max: bid.gig.budgetMax,
                    type: bid.gig.budgetType?.toUpperCase() || 'FIXED'
                },
                attachments: bid.portfolio || [],
                skills: bid.gig.skillsRequired || [],
                location: bid.gig.location
            };

            res.json({
                success: true,
                data: transformedBid
            });
        } catch (error) {
            console.error('Error fetching bid details:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch bid details'
            });
        }
    };

    // PUT /crew/bids/:id - Update a bid
    updateCrewBid = async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.headers['x-user-id'] || req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: 'User ID not found in request'
                });
            }

            const { proposal, quotedPrice, estimatedTime, portfolio } = req.body;

            // Find the bid
            const bid = await this.prisma.application.findUnique({
                where: { id }
            });

            if (!bid) {
                return res.status(404).json({
                    success: false,
                    error: 'Bid not found'
                });
            }

            if (bid.applicantId !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only update your own bids'
                });
            }

            if (bid.status !== 'PENDING') {
                return res.status(400).json({
                    success: false,
                    error: 'Only pending bids can be updated'
                });
            }

            // Update the bid
            const updatedBid = await this.prisma.application.update({
                where: { id },
                data: {
                    proposal,
                    quotedPrice,
                    estimatedTime,
                    portfolio
                }
            });

            res.json({
                success: true,
                message: 'Bid updated successfully',
                data: updatedBid
            });
        } catch (error) {
            console.error('Error updating bid:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update bid'
            });
        }
    };

    // POST /gigs/:gigId/milestones - Create a milestone for a gig
    createMilestone = async (req, res) => {
        try {
            const { gigId } = req.params;
            const { error, value } = GigController.createMilestoneSchema.validate(req.body);

            if (error) {
                return res.status(400).json({
                    success: false,
                    error: `${error.details.map(d => d.message).join(', ')}`
                });
            }

            // Check if gig exists and is assigned to a clan
            const gig = await this.prisma.gig.findUnique({
                where: { id: gigId },
                include: {
                    applications: {
                        where: { status: 'APPROVED' },
                        include: { assignment: true }
                    }
                }
            });

            if (!gig) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }

            if (gig.status !== 'ASSIGNED' || gig.assignedToType !== 'clan') {
                return res.status(400).json({
                    success: false,
                    error: 'Gig must be assigned to a clan to create milestones'
                });
            }

            const assignment = gig.applications[0]?.assignment;
            if (!assignment) {
                return res.status(400).json({
                    success: false,
                    error: 'Gig assignment not found'
                });
            }

            // Create milestone
            const milestone = await this.prisma.gigMilestone.create({
                data: {
                    gigId,
                    assignmentId: assignment.id,
                    title: value.title,
                    description: value.description,
                    dueAt: new Date(value.dueAt),
                    amount: value.amount,
                    deliverables: value.deliverables,
                    status: 'PENDING'
                }
            });

            // Publish event
            await this.publishEvent('gig_milestone_created', {
                gigId,
                milestoneId: milestone.id,
                title: milestone.title,
                amount: milestone.amount,
                clanId: assignment.clanId
            });

            // Notify clan members about the new milestone
            if (assignment.clanId) {
                try {
                    // Get clan members from clan-service
                    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
                    const clanResponse = await fetch(`${BASE_URL}/api/members/${encodeURIComponent(assignment.clanId)}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-internal': 'true',
                            'x-calling-service': 'gig-service'
                        }
                    });

                    if (clanResponse.ok) {
                        const clanData = await clanResponse.json();
                        const members = clanData?.data?.members || [];

                        // Publish individual notification events for each clan member
                        for (const member of members) {
                            await this.publishEvent('clan_milestone_created_member_notification', {
                                gigId,
                                gigTitle: gig.title,
                                milestoneId: milestone.id,
                                milestoneTitle: milestone.title,
                                milestoneAmount: milestone.amount,
                                clanId: assignment.clanId,
                                memberId: member.userId,
                                memberRole: member.role,
                                dueAt: milestone.dueAt,
                                deliverables: milestone.deliverables,
                                createdAt: new Date().toISOString()
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to notify clan members about milestone:', error);
                    // Don't fail the main request if notification fails
                }
            }

            res.status(201).json({
                success: true,
                message: 'Milestone created successfully',
                data: milestone
            });
        } catch (error) {
            console.error('Error creating milestone:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create milestone'
            });
        }
    };

    // POST /gigs/:gigId/milestones/:milestoneId/submit - Submit milestone for approval
    submitMilestone = async (req, res) => {
        try {
            const { gigId, milestoneId } = req.params;
            const { deliverables } = req.body;

            // Check if milestone exists and belongs to the gig
            const milestone = await this.prisma.gigMilestone.findFirst({
                where: {
                    id: milestoneId,
                    gigId,
                    assignment: {
                        clanId: req.headers['x-clan-id'] || req.body.clanId
                    }
                }
            });

            if (!milestone) {
                return res.status(404).json({
                    success: false,
                    error: 'Milestone not found'
                });
            }

            if (milestone.status !== 'IN_PROGRESS') {
                return res.status(400).json({
                    success: false,
                    error: 'Milestone must be in progress to submit'
                });
            }

            // Update milestone status
            const updatedMilestone = await this.prisma.gigMilestone.update({
                where: { id: milestoneId },
                data: {
                    status: 'SUBMITTED',
                    submittedAt: new Date()
                }
            });

            // Publish event
            await this.publishEvent('gig_milestone_submitted', {
                gigId,
                milestoneId,
                title: milestone.title,
                amount: milestone.amount,
                clanId: req.headers['x-clan-id'] || req.body.clanId
            });

            res.json({
                success: true,
                message: 'Milestone submitted successfully',
                data: updatedMilestone
            });
        } catch (error) {
            console.error('Error submitting milestone:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to submit milestone'
            });
        }
    };

    // POST /gigs/:gigId/milestones/:milestoneId/approve - Approve milestone (brand only)
    approveMilestone = async (req, res) => {
        try {
            const { gigId, milestoneId } = req.params;
            const { feedback } = req.body;

            // Check if milestone exists and belongs to the gig
            const milestone = await this.prisma.gigMilestone.findFirst({
                where: {
                    id: milestoneId,
                    gigId
                },
                include: {
                    assignment: {
                        include: {
                            gig: true
                        }
                    }
                }
            });

            if (!milestone) {
                return res.status(404).json({
                    success: false,
                    error: 'Milestone not found'
                });
            }

            // Check if user owns the gig
            if (milestone.assignment.gig.postedById !== req.headers['x-user-id']) {
                return res.status(403).json({
                    success: false,
                    error: 'You can only approve milestones for your own gigs'
                });
            }

            if (milestone.status !== 'SUBMITTED') {
                return res.status(400).json({
                    success: false,
                    error: 'Milestone must be submitted to approve'
                });
            }

            // Update milestone status
            const updatedMilestone = await this.prisma.gigMilestone.update({
                where: { id: milestoneId },
                data: {
                    status: 'APPROVED',
                    approvedAt: new Date(),
                    feedback
                }
            });

            // Publish event for credit service to handle payout
            await this.publishEvent('gig_milestone_approved', {
                gigId,
                milestoneId,
                title: milestone.title,
                amount: milestone.amount,
                clanId: milestone.assignment.clanId,
                payoutSplit: milestone.assignment.payoutSplitSnapshot
            });

            // Notify clan members about the milestone approval
            if (milestone.assignment.clanId) {
                try {
                    // Get clan members from clan-service
                    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
                    const clanResponse = await fetch(`${BASE_URL}/api/members/${encodeURIComponent(milestone.assignment.clanId)}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-internal': 'true',
                            'x-calling-service': 'gig-service'
                        }
                    });

                    if (clanResponse.ok) {
                        const clanData = await clanResponse.json();
                        const members = clanData?.data?.members || [];

                        // Publish individual notification events for each clan member
                        for (const member of members) {
                            await this.publishEvent('clan_milestone_approved_member_notification', {
                                gigId,
                                gigTitle: milestone.assignment.gig.title,
                                milestoneId: milestone.id,
                                milestoneTitle: milestone.title,
                                milestoneAmount: milestone.amount,
                                clanId: milestone.assignment.clanId,
                                memberId: member.userId,
                                memberRole: member.role,
                                approvedAt: milestone.approvedAt,
                                feedback: milestone.feedback,
                                payoutSplit: milestone.assignment.payoutSplitSnapshot,
                                createdAt: new Date().toISOString()
                            });
                        }

                        // Publish general milestone approved event for the clan
                        await this.publishEvent('clan_milestone_approved', {
                            gigId,
                            gigTitle: milestone.assignment.gig.title,
                            milestoneId: milestone.id,
                            milestoneTitle: milestone.title,
                            milestoneAmount: milestone.amount,
                            clanId: milestone.assignment.clanId,
                            memberCount: members.length,
                            approvedAt: milestone.approvedAt,
                            feedback: milestone.feedback,
                            payoutSplit: milestone.assignment.payoutSplitSnapshot,
                            createdAt: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.error('Failed to notify clan members about milestone approval:', error);
                    // Don't fail the main request if notification fails
                }
            }

            res.json({
                success: true,
                message: 'Milestone approved successfully',
                data: updatedMilestone
            });
        } catch (error) {
            console.error('Error approving milestone:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to approve milestone'
            });
        }
    };

    // POST /gigs/:gigId/tasks - Create a task for a gig
    createTask = async (req, res) => {
        try {
            const { gigId } = req.params;
            const { error, value } = GigController.createTaskSchema.validate(req.body);

            if (error) {
                return res.status(400).json({
                    success: false,
                    error: `${error.details.map(d => d.message).join(', ')}`
                });
            }

            // Check if gig exists and is assigned to a clan
            const gig = await this.prisma.gig.findUnique({
                where: { id: gigId },
                include: {
                    applications: {
                        where: { status: 'APPROVED' },
                        include: { assignment: true }
                    }
                }
            });

            if (!gig) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found'
                });
            }

            if (gig.status !== 'ASSIGNED' || gig.assignedToType !== 'clan') {
                return res.status(400).json({
                    success: false,
                    error: 'Gig must be assigned to a clan to create tasks'
                });
            }

            const assignment = gig.applications[0]?.assignment;
            if (!assignment) {
                return res.status(400).json({
                    success: false,
                    error: 'Gig assignment not found'
                });
            }

            // Create task
            const task = await this.prisma.gigTask.create({
                data: {
                    gigId,
                    assignmentId: assignment.id,
                    milestoneId: value.milestoneId || null,
                    title: value.title,
                    description: value.description,
                    assigneeUserId: value.assigneeUserId,
                    estimatedHours: value.estimatedHours,
                    deliverables: value.deliverables,
                    notes: value.notes,
                    status: 'TODO'
                }
            });

            // Publish event
            await this.publishEvent('gig_task_created', {
                gigId,
                taskId: task.id,
                title: task.title,
                assigneeUserId: task.assigneeUserId,
                clanId: assignment.clanId
            });

            // Notify the assigned clan member about the new task
            if (task.assigneeUserId && assignment.clanId) {
                try {
                    // Get clan member details from clan-service
                    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
                    const clanResponse = await fetch(`${BASE_URL}/api/members/${encodeURIComponent(assignment.clanId)}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-internal': 'true',
                            'x-calling-service': 'gig-service'
                        }
                    });

                    if (clanResponse.ok) {
                        const clanData = await clanResponse.json();
                        const members = clanData?.data?.members || [];
                        const assignedMember = members.find(m => m.userId === task.assigneeUserId);

                        if (assignedMember) {
                            // Publish individual notification event for the assigned member
                            await this.publishEvent('clan_task_assigned_member_notification', {
                                gigId,
                                gigTitle: gig.title,
                                taskId: task.id,
                                taskTitle: task.title,
                                taskDescription: task.description,
                                clanId: assignment.clanId,
                                memberId: task.assigneeUserId,
                                memberRole: assignedMember.role,
                                estimatedHours: task.estimatedHours,
                                deliverables: task.deliverables,
                                dueDate: task.dueDate,
                                milestoneId: task.milestoneId,
                                createdAt: new Date().toISOString()
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to notify clan member about task assignment:', error);
                    // Don't fail the main request if notification fails
                }
            }

            res.status(201).json({
                success: true,
                message: 'Task created successfully',
                data: task
            });
        } catch (error) {
            console.error('Error creating task:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create task'
            });
        }
    };

    // PATCH /gigs/:gigId/tasks/:taskId - Update task status
    updateTask = async (req, res) => {
        try {
            const { gigId, taskId } = req.params;
            const { error, value } = GigController.updateTaskSchema.validate(req.body);

            if (error) {
                return res.status(400).json({
                    success: false,
                    error: `${error.details.map(d => d.message).join(', ')}`
                });
            }

            // Check if task exists and belongs to the gig
            const task = await this.prisma.gigTask.findFirst({
                where: {
                    id: taskId,
                    gigId
                }
            });

            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found'
                });
            }

            // Update task
            const updatedTask = await this.prisma.gigTask.update({
                where: { id: taskId },
                data: value
            });

            // Publish event
            await this.publishEvent('gig_task_updated', {
                gigId,
                taskId,
                title: task.title,
                status: updatedTask.status,
                assigneeUserId: task.assigneeUserId
            });

            // Notify clan members about task status change
            if (task.assigneeUserId) {
                try {
                    // Get gig assignment to find clanId
                    const assignment = await this.prisma.gigAssignment.findFirst({
                        where: { gigId }
                    });

                    if (assignment?.clanId) {
                        // Get clan member details from clan-service
                        const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
                        const clanResponse = await fetch(`${BASE_URL}/api/members/${encodeURIComponent(assignment.clanId)}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-internal': 'true',
                                'x-calling-service': 'gig-service'
                            }
                        });

                        if (clanResponse.ok) {
                            const clanData = await clanResponse.json();
                            const members = clanData?.data?.members || [];
                            const assignedMember = members.find(m => m.userId === task.assigneeUserId);

                            if (assignedMember) {
                                // Publish individual notification event for the assigned member
                                await this.publishEvent('clan_task_status_updated_member_notification', {
                                    gigId,
                                    taskId: task.id,
                                    taskTitle: task.title,
                                    oldStatus: task.status,
                                    newStatus: updatedTask.status,
                                    clanId: assignment.clanId,
                                    memberId: task.assigneeUserId,
                                    memberRole: assignedMember.role,
                                    updatedAt: new Date().toISOString()
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to notify clan member about task status update:', error);
                    // Don't fail the main request if notification fails
                }
            }

            res.json({
                success: true,
                message: 'Task updated successfully',
                data: updatedTask
            });
        } catch (error) {
            console.error('Error updating task:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update task'
            });
        }
    };

    // NEW: Get gig assignments by clan
    async getGigAssignmentsByClan(req, res) {
        try {
            const { clanId } = req.params;
            console.log('🔍 Fetching gig assignments for clan:', clanId);

            // Check if clanId is valid
            if (!clanId) {
                return res.status(400).json({
                    success: false,
                    error: 'Clan ID is required'
                });
            }

            // Get Prisma client directly from database service to avoid context issues
            const prisma = databaseService.getClient();
            console.log('✅ Prisma client obtained:', !!prisma);

            // Test database connection first
            try {
                await prisma.$queryRaw`SELECT 1`;
                console.log('✅ Database connection test passed');
            } catch (dbError) {
                console.error('❌ Database connection test failed:', dbError);
                return res.status(500).json({
                    success: false,
                    error: 'Database connection failed',
                    details: dbError.message
                });
            }

            // Check if GigAssignment table exists and has data
            try {
                const tableExists = await prisma.$queryRaw`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'gig_assignments'
                    );
                `;
                console.log('✅ Table exists check:', tableExists);

                if (tableExists[0]?.exists === false) {
                    return res.status(500).json({
                        success: false,
                        error: 'GigAssignment table does not exist',
                        details: 'Database schema may be out of sync'
                    });
                }
            } catch (tableError) {
                console.error('❌ Table existence check failed:', tableError);
            }

            const assignments = await prisma.gigAssignment.findMany({
                where: { clanId },
                include: {
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            budgetMin: true,
                            budgetMax: true,
                            status: true,
                            category: true,
                            createdAt: true
                        }
                    },
                    milestones: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            amount: true,
                            dueAt: true
                        }
                    },
                    tasks: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            assigneeUserId: true,
                            estimatedHours: true,
                            actualHours: true
                        }
                    }
                },
                orderBy: { assignedAt: 'desc' }
            });

            console.log('✅ Found assignments:', assignments.length);

            res.json({
                success: true,
                data: assignments,
                count: assignments.length
            });
        } catch (error) {
            console.error('❌ Error fetching gig assignments by clan:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                code: error.code
            });

            res.status(500).json({
                success: false,
                error: 'Failed to fetch gig assignments',
                details: error.message
            });
        }
    }

    // NEW: Get gigs by clan
    async getGigsByClan(req, res) {
        try {
            const { clanId } = req.params;
            const { page = 1, limit = 20 } = req.query;

            // Get Prisma client directly from database service to avoid context issues
            const prisma = databaseService.getClient();

            // Get gigs that have been assigned to this clan
            const assignments = await prisma.gigAssignment.findMany({
                where: { clanId },
                include: {
                    gig: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            budgetMin: true,
                            budgetMax: true,
                            status: true,
                            category: true,
                            createdAt: true,
                            deadline: true,
                            urgency: true,
                            skillsRequired: true
                        }
                    }
                },
                orderBy: { assignedAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit)
            });

            // Get total count for pagination
            const total = await prisma.gigAssignment.count({
                where: { clanId }
            });

            res.json({
                success: true,
                data: assignments.map(assignment => ({
                    ...assignment.gig,
                    assignmentId: assignment.id,
                    assignedAt: assignment.assignedAt,
                    status: assignment.status
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('Error fetching gigs by clan:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch gigs by clan'
            });
        }
    }

    // NEW: Get milestones for a specific gig
    async getGigMilestones(req, res) {
        try {
            const { gigId } = req.params;
            console.log('🔍 Fetching milestones for gig:', gigId);

            // Get Prisma client directly from database service to avoid context issues
            const prisma = databaseService.getClient();

            const milestones = await prisma.gigMilestone.findMany({
                where: { gigId },
                include: {
                    tasks: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            assigneeUserId: true,
                            estimatedHours: true,
                            actualHours: true,
                            deliverables: true,
                            notes: true,
                            createdAt: true,
                            updatedAt: true
                        }
                    }
                },
                orderBy: { dueAt: 'asc' }
            });

            console.log('✅ Found milestones:', milestones.length);

            res.json({
                success: true,
                data: milestones,
                count: milestones.length
            });
        } catch (error) {
            console.error('❌ Error fetching gig milestones:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch gig milestones',
                details: error.message
            });
        }
    }

    // NEW: Get tasks for a specific gig
    async getGigTasks(req, res) {
        try {
            const { gigId } = req.params;
            console.log('🔍 Fetching tasks for gig:', gigId);

            // Get Prisma client directly from database service to avoid context issues
            const prisma = databaseService.getClient();

            const tasks = await prisma.gigTask.findMany({
                where: { gigId },
                include: {
                    milestone: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            dueAt: true,
                            amount: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            console.log('✅ Found tasks:', tasks.length);

            res.json({
                success: true,
                data: tasks,
                count: tasks.length
            });
        } catch (error) {
            console.error('❌ Error fetching gig tasks:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch gig tasks',
                details: error.message
            });
        }
    }
}

module.exports = new GigController();