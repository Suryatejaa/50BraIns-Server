const { json } = require('stream/consumers');
const databaseService = require('../services/database');
const rabbitmqService = require('../services/rabbitmqService');
const Joi = require('joi');
const { title } = require('process');

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







    // GET /my-drafts - Get user's draft gigs


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

    // Helper methods for updating application work history
    async updateApplicationWorkHistory(applicationId, updates) {
        try {
            return await this.prisma.applicationWorkHistory.upsert({
                where: { applicationId },
                update: {
                    ...updates,
                    lastActivityAt: new Date(),
                    updatedAt: new Date()
                },
                create: {
                    applicationId,
                    ...updates,
                    lastActivityAt: new Date(),
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            console.error('Error updating application work history:', error);
            throw error; // Re-throw to expose issues
        }
    }

    async updateCampaignHistory(gigId, updates) {
        try {
            return await this.prisma.campaignHistory.upsert({
                where: { gigId },
                update: {
                    ...updates,
                    updatedAt: new Date()
                },
                create: {
                    gigId,
                    ...updates,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            console.error('Error updating campaign history:', error);
            throw error; // Re-throw to expose issues
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