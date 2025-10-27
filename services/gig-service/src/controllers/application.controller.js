const { json } = require('stream/consumers');
const databaseService = require('../services/database');
const rabbitmqService = require('../services/rabbitmqService');
const Joi = require('joi');
const { title } = require('process');
class ApplicationController {
    constructor() {
        this.prisma = databaseService.getClient();
    }

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
    //======================== APPLICATION CONTROLLER =========================
    //=================================================================

    // POST /gigs/:id/apply - Apply to a gig
    applyToGig = async (req, res) => {
        try {
            const { id } = req.params;
            console.log("🎯 [Gig Service] Applying to gig:", { gigId: id, requestBody: req.body });

            const { error, value } = ApplicationController.applyGigSchema.validate(req.body);
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
                    description: true,
                    status: true,
                    postedById: true,
                    gigType: true,
                    category: true,
                    budgetMin: true,
                    budgetMax: true
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

            // Create application work history entry
            const applicationWorkHistory = await this.prisma.applicationWorkHistory.create({
                data: {
                    applicationId: application.id,
                    gigId: id,
                    applicantId: applicantId,
                    gigOwnerId: gig.postedById,
                    gigPrice: gig.budgetMax || gig.budgetMin, // Use max budget or min if max not available
                    quotedPrice: value.quotedPrice,
                    appliedAt: application.appliedAt,
                    applicationStatus: 'PENDING',
                    lastActivityAt: new Date()
                }
            });

            // Create campaign history entry if it doesn't exist for this gig
            let campaignHistory = await this.prisma.campaignHistory.findUnique({
                where: { gigId: id }
            });

            if (!campaignHistory) {
                campaignHistory = await this.prisma.campaignHistory.create({
                    data: {
                        gigId: id,
                        brandId: gig.postedById,
                        campaignTitle: gig.title,
                        campaignDescription: gig.description,
                        campaignType: gig.category || 'GENERAL',
                        budget: gig.budgetMax || gig.budgetMin || 0,
                        gigPrice: gig.budgetMax || gig.budgetMin,
                        status: 'ACTIVE',
                        totalApplications: 1
                    }
                });
            } else {
                // Update application count
                await this.prisma.campaignHistory.update({
                    where: { gigId: id },
                    data: {
                        totalApplications: { increment: 1 },
                        updatedAt: new Date()
                    }
                });
            }

            // Fetch applicant data for notification
            const applicantData = await this.fetchUserData(applicantId);
            const applicantName = applicantData && applicantData.firstName && applicantData.lastName ? `${applicantData.firstName} ${applicantData.lastName}` : applicantData.username;

            // Publish events
            console.log('🚀 [Gig Service] Publishing new_application_received event:', {
                gigId: id,
                gigOwnerId: gig.postedById,
                applicantId: applicantId,
                applicantName: applicantName
            });
            await this.publishEvent('new_application_received', {
                gigId: id,
                gigTitle: gig.title,
                gigOwnerId: gig.postedById,
                recipientId: gig.postedById,
                applicantName: applicantName,
                applicantType: value.applicantType,

            });

            // Publish work history event for application creation
            await rabbitmqService.publishToExchange('gig_events', 'gig.application.created', {
                applicationId: application.id,
                gigId: id,
                applicantId: applicantId,
                applicantType: value.applicantType,
                proposal: value.proposal,
                quotedPrice: value.quotedPrice,
                estimatedTime: value.estimatedTime,
                createdAt: new Date().toISOString(),
                gigData: {
                    title: gig.title,
                    postedById: gig.postedById,
                    gigType: gig.gigType
                }
            });

            console.log('🚀 [Gig Service] Publishing application_confirmed event:', {
                gigId: id,
                applicantId: applicantId,
                gigOwnerId: gig.postedById
            });
            // Send notification to applicant confirming application
            await this.publishEvent('application_confirmed', {
                applicantId: applicantId,
                recipientType: 'applicant',
                gigId: id,
                recipientId: applicantId,
                applicationId: application.id,
                gigOwnerId: gig.postedById, // Add gigOwnerId for backup notification system
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
            const { error, value } = ApplicationController.assignGigSchema.validate(req.body);
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

            // Create or update application work history for assignments
            if (!existingApplication || !inactiveStatuses.includes(existingApplication.status)) {
                // Create new history entry for new assignment
                await this.prisma.applicationWorkHistory.create({
                    data: {
                        applicationId: application.id,
                        gigId: id,
                        applicantId: applicantId,
                        gigOwnerId: gig.postedById,
                        gigPrice: gig.budgetMax || gig.budgetMin,
                        quotedPrice: value.quotedPrice,
                        appliedAt: application.appliedAt || new Date(),
                        applicationStatus: 'PENDING',
                        lastActivityAt: new Date()
                    }
                }).catch(() => { }); // Ignore if exists
            } else {
                // Update existing history entry
                await this.prisma.applicationWorkHistory.update({
                    where: { applicationId: application.id },
                    data: {
                        quotedPrice: value.quotedPrice,
                        applicationStatus: 'PENDING',
                        lastActivityAt: new Date()
                    }
                }).catch(() => { }); // Ignore if not found
            }

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
                recipientId: applicantId,
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

    // POST /gigs/:id/submit - Submit work for a gig (assigned applicant only)
    submitWork = async (req, res) => {
        try {
            const { id } = req.params;

            const { error, value } = ApplicationController.submitWorkSchema.validate(req.body);
            console.log('submitWork validation result:', { error, value });
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

            console.log('submitWork found gig:', gig);
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
            console.log('submitWork found application:', application);
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
                console.log('submitWork updated application status to SUBMITTED for application:', application.id);
                // Update application work history
                await tx.applicationWorkHistory.upsert({
                    where: { applicationId: application.id },
                    update: {
                        workSubmittedAt: new Date(),
                        applicationStatus: 'SUBMITTED',
                        submissionStatus: 'PENDING',
                        lastActivityAt: new Date()
                    },
                    create: {
                        applicationId: application.id,
                        gigId: id,
                        applicantId: application.applicantId,
                        gigOwnerId: gig.postedById,
                        gigPrice: gig.budgetMax || gig.budgetMin,
                        quotedPrice: application.quotedPrice,
                        appliedAt: application.appliedAt,
                        acceptedAt: application.respondedAt,
                        workSubmittedAt: new Date(),
                        applicationStatus: 'SUBMITTED',
                        submissionStatus: 'PENDING',
                        lastActivityAt: new Date()
                    }
                });
                console.log('submitWork created application work history for application:', application.id);

                // Update campaign history
                await tx.campaignHistory.upsert({
                    where: { gigId: id },
                    update: {
                        completedWorks: { increment: 1 },
                        updatedAt: new Date()
                    },
                    create: {
                        gigId: id,
                        brandId: gig.postedById,
                        campaignTitle: gig.title,
                        campaignDescription: gig.description,
                        campaignType: gig.category || 'GENERAL',
                        budget: gig.budgetMax || gig.budgetMin || 0,
                        status: 'ACTIVE',
                        completedWorks: 1,
                        totalApplications: 1
                    }
                });
                console.log('submitWork updated campaign history for gig:', id);
                return submission;
            });

            const submission = result;

            // Note: We don't update gig status here since gig can have multiple applicants
            // Each application and submission has its own independent lifecycle

            // Publish events
            // Publish events with comprehensive error handling
            console.log('publishEvent payloads prepared for submission:')
            try {
                console.log('🚀 [Gig Service] Publishing work_submitted event...');
                await this.publishEvent('work_submitted', {
                    recipientId: gig.postedById,
                    recipientType: 'brand',
                    gigId: id,
                    gigTitle: gig.title,
                    submissionId: submission.id,
                    submittedById: req.user.id,
                    gigOwnerId: gig.postedById,
                    submissionTitle: value.title
                });
                console.log('✅ [Gig Service] work_submitted event published successfully');
            } catch (error) {
                console.error('❌ [Gig Service] Failed to publish work_submitted event:', error);
            }

            try {
                console.log('🚀 [Gig Service] Publishing work_submitted_notification event to brand...');
                await this.publishEvent('work_submitted_notification', {
                    recipientId: gig.postedById,
                    recipientType: 'brand',
                    gigId: id,
                    gigTitle: gig.title,
                    gigOwnerId: gig.postedById,
                    submissionId: submission.id,
                    submittedById: req.user.id,
                    submissionTitle: value.title,
                    message: `Work has been submitted for "${gig.title}" - "${value.title}"`
                });
                console.log('✅ [Gig Service] work_submitted_notification event published successfully to brand:', gig.postedById);
            } catch (error) {
                console.error('❌ [Gig Service] Failed to publish work_submitted_notification event:', error);
                // This is critical - we should still try to send directly if RabbitMQ fails
            }

            try {
                console.log('🚀 [Gig Service] Publishing work_submission_confirmed event to applicant...');
                await this.publishEvent('work_submission_confirmed', {
                    recipientId: req.user.id,
                    recipientType: 'applicant',
                    gigId: id,
                    gigTitle: gig.title,
                    submissionId: submission.id,
                    submissionTitle: value.title,
                    message: `Your work "${value.title}" has been submitted for "${gig.title}"`
                });
                console.log('✅ [Gig Service] work_submission_confirmed event published successfully to applicant:', req.user.id);
            } catch (error) {
                console.error('❌ [Gig Service] Failed to publish work_submission_confirmed event:', error);
            }

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

    reviewSubmission = async (req, res) => {
        try {
            const { id } = req.params;
            const { error, value } = ApplicationController.reviewSubmissionSchema.validate(req.body);
            console.log('reviewSubmission validation result:', { error, value });
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

            console.log('reviewSubmission submission:', submission);
            console.log('reviewSubmission updatedSubmission:', updatedSubmission);

            // Update application status based on review (don't change gig status)
            if (submission.applicationId) {
                await this.prisma.$transaction(async (tx) => {
                    if (value.status === 'APPROVED') {
                        // Update application status to CLOSED when submission is approved
                        await tx.application.update({
                            where: { id: submission.applicationId },
                            data: { status: 'CLOSED' }
                        });
                        console.log('reviewSubmission application closed for applicationId:', submission.applicationId);
                        // Update application work history for approval
                        await tx.applicationWorkHistory.upsert({
                            where: { applicationId: submission.applicationId },
                            update: {
                                workReviewedAt: new Date(),
                                applicationStatus: 'CLOSED',
                                submissionStatus: 'APPROVED',
                                completedAt: new Date(),
                                paymentStatus: 'PROCESSING',
                                lastActivityAt: new Date()
                            },
                            create: {
                                applicationId: submission.applicationId,
                                gigId: submission.gigId,
                                applicantId: submission.submittedById,
                                gigOwnerId: submission.gig.postedById,
                                gigPrice: submission.gig.budgetMax || submission.gig.budgetMin,
                                quotedPrice: submission.application?.quotedPrice,
                                appliedAt: submission.application?.appliedAt || new Date(),
                                workSubmittedAt: submission.submittedAt,
                                workReviewedAt: new Date(),
                                applicationStatus: 'CLOSED',
                                submissionStatus: 'APPROVED',
                                completedAt: new Date(),
                                paymentStatus: 'PROCESSING',
                                lastActivityAt: new Date()
                            }
                        });

                    } else if (value.status === 'REVISION') {
                        // Revert application status back to APPROVED for revision
                        await tx.application.update({
                            where: { id: submission.applicationId },
                            data: { status: 'APPROVED' }
                        });

                        // Update work history for revision
                        await tx.applicationWorkHistory.upsert({
                            where: { applicationId: submission.applicationId },
                            update: {
                                workReviewedAt: new Date(),
                                submissionStatus: 'REVISION',
                                revisionCount: { increment: 1 },
                                lastActivityAt: new Date()
                            },
                            create: {
                                applicationId: submission.applicationId,
                                gigId: submission.gigId,
                                applicantId: submission.submittedById,
                                gigOwnerId: submission.gig.postedById,
                                gigPrice: submission.gig.budgetMax || submission.gig.budgetMin,
                                quotedPrice: submission.application?.quotedPrice,
                                appliedAt: submission.application?.appliedAt || new Date(),
                                workSubmittedAt: submission.submittedAt,
                                workReviewedAt: new Date(),
                                submissionStatus: 'REVISION',
                                revisionCount: 1,
                                lastActivityAt: new Date(),
                                applicationStatus: 'APPROVED' // Since application is reverted
                            }
                        });

                    } else if (value.status === 'REJECTED') {
                        await tx.application.update({
                            where: { id: submission.applicationId },
                            data: { status: 'APPROVED' } // Allow re-submission
                        });

                        // Update work history for rejection
                        await tx.applicationWorkHistory.upsert({
                            where: { applicationId: submission.applicationId },
                            update: {
                                workReviewedAt: new Date(),
                                submissionStatus: 'REJECTED',
                                lastActivityAt: new Date()
                            },
                            create: {
                                applicationId: submission.applicationId,
                                gigId: submission.gigId,
                                applicantId: submission.submittedById,
                                gigOwnerId: submission.gig.postedById,
                                gigPrice: submission.gig.budgetMax || submission.gig.budgetMin,
                                quotedPrice: submission.application?.quotedPrice,
                                appliedAt: submission.application?.appliedAt || new Date(),
                                workSubmittedAt: submission.submittedAt,
                                workReviewedAt: new Date(),
                                submissionStatus: 'REJECTED',
                                lastActivityAt: new Date(),
                                applicationStatus: 'APPROVED' // Since application is reverted
                            }
                        });
                    }
                });
            }
            console.log('reviewSubmission updated application status based on submission review');
            // Publish events
            await this.publishEvent('submission_reviewed', {
                gigId: submission.gigId,
                submissionId: id,
                applicantId: submission.submittedById,
                recipientId: submission.submittedById,
                status: value.status,
                feedback: value.feedback || null,
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
                // await rabbitmqService.publishGigEvent('gig.completed', {
                //     gigId: submission.gigId,
                //     userId: submission.submittedById,
                //     clientId: submission.gig.postedById,
                //     gigData: {
                //         title: submission.gig.title,
                //         description: submission.gig.description,
                //         category: submission.gig.category,
                //         skills: submission.gig.skillsRequired || [],
                //         budgetRange: submission.gig.budgetMin && submission.gig.budgetMax
                //             ? `${submission.gig.budgetMin}-${submission.gig.budgetMax}`
                //             : '0-100'
                //     },
                //     completionData: {
                //         completedAt: new Date().toISOString(),
                //         actualAmount: submission.application?.quotedPrice || submission.gig.budgetMax || 0,
                //         rating: value.rating,
                //         feedback: value.feedback,
                //         withinBudget: true
                //     },
                //     deliveryData: {
                //         deliveryTime: this.calculateDeliveryTime(submission.gig),
                //         onTime: this.calculateOnTimeDelivery(submission.gig),
                //         portfolioItems: submission.deliverables?.map(item => ({
                //             title: item.description || submission.title,
                //             description: item.description || '',
                //             type: item.type || 'other',
                //             url: item.url || null,
                //             thumbnailUrl: null,
                //             fileSize: null,
                //             format: item.type || 'unknown',
                //             isPublic: true
                //         })) || []
                //     }
                // });

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
                recipientId: userId,
                applicantId: userId,
                gigOwnerId: application.gig.postedById
            });

            // Send notification to brand about withdrawal
            await this.publishEvent('application_withdrawn_notification', {
                recipientId: application.gig.postedById,
                recipientType: 'brand',
                gigId: application.gigId,
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

                console.log('approveApplication updated application:', updatedApplication);

                // Update application work history
                await tx.applicationWorkHistory.upsert({
                    where: { applicationId: id },
                    update: {
                        acceptedAt: new Date(),
                        applicationStatus: 'APPROVED',
                        paymentAmount: application.quotedPrice || application.gig.budgetMax || application.gig.budgetMin,
                        paymentStatus: 'PENDING',
                        lastActivityAt: new Date()
                    },
                    create: {
                        applicationId: id,
                        gigId: application.gigId,
                        applicantId: application.applicantId,
                        gigOwnerId: application.gig.postedById,
                        gigPrice: application.gig.budgetMax || application.gig.budgetMin,
                        quotedPrice: application.quotedPrice,
                        appliedAt: application.appliedAt,
                        acceptedAt: new Date(),
                        applicationStatus: 'APPROVED',
                        paymentAmount: application.quotedPrice || application.gig.budgetMax || application.gig.budgetMin,
                        paymentStatus: 'PENDING',
                        lastActivityAt: new Date()
                    }
                });

                console.log('approveApplication updated application work history for application:', id);

                // Update campaign history
                await tx.campaignHistory.upsert({
                    where: { gigId: application.gigId },
                    update: {
                        acceptedApplications: { increment: 1 },
                        gigPrice: application.quotedPrice || application.gig.budgetMax || application.gig.budgetMin,
                        updatedAt: new Date()
                    },
                    create: {
                        gigId: application.gigId,
                        brandId: application.gig.postedById,
                        campaignTitle: application.gig.title,
                        campaignDescription: application.gig.description,
                        campaignType: application.gig.category || 'GENERAL',
                        budget: application.gig.budgetMax || application.gig.budgetMin || 0,
                        status: 'ACTIVE',
                        acceptedApplications: 1,
                        gigPrice: application.quotedPrice || application.gig.budgetMax || application.gig.budgetMin,
                        totalApplications: 1
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
                recipientId: application.gig.postedById,
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

            console.log('✅ [Gig Service] Application approved notification sent for application:', id);

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

            // Publish work history event for application acceptance
            try {
                await rabbitmqService.publishToExchange('gig_events', 'gig.application.accepted', {
                    applicationId: id,
                    gigId: application.gigId,
                    applicantId: application.applicantId,
                    clientId: application.gig.postedById,
                    acceptedAt: new Date().toISOString(),
                    quotedPrice: application.quotedPrice,
                    gigData: {
                        title: application.gig.title,
                        postedById: application.gig.postedById,
                        gigType: application.gig.gigType
                    }
                });
                console.log('✅ [Gig Service] Work history event published for application acceptance:', id);
            } catch (workHistoryError) {
                console.error('❌ [Gig Service] Failed to publish work history event for application acceptance:', workHistoryError);
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

            // Update application work history for rejection
            await this.prisma.applicationWorkHistory.upsert({
                where: { applicationId: id
                },
                update: {
                    rejectedAt: new Date(),
                    applicationStatus: 'REJECTED',
                    lastActivityAt: new Date()
                },
                create: {
                    applicationId: id,
                    gigId: application.gigId,
                    applicantId: application.applicantId,
                    gigOwnerId: application.gig.postedById,
                    gigPrice: application.gig.budgetMax || application.gig.budgetMin,
                    quotedPrice: application.quotedPrice,
                    appliedAt: application.appliedAt,
                    rejectedAt: new Date(),
                    applicationStatus: 'REJECTED',
                    lastActivityAt: new Date()
                }
            });



            // Publish event
            await this.publishEvent('application_rejected', {
                gigId: application.gigId,
                gigTitle: application.gig.title,
                recipientId: application.gig.postedById,
                applicationId: id,
                applicantId: application.applicantId,
                reason: reason,
                gigOwnerId: application.gig.postedById
            });

            // Publish work history event for application rejection
            // try {
            //     await rabbitmqService.publishToExchange('gig_events', 'gig.application.rejected', {
            //         applicationId: id,
            //         gigId: application.gigId,
            //         applicantId: application.applicantId,
            //         clientId: application.gig.postedById,
            //         rejectedAt: new Date().toISOString(),
            //         reason: reason,
            //         gigData: {
            //             title: application.gig.title,
            //             postedById: application.gig.postedById,
            //             gigType: application.gig.gigType
            //         }
            //     });
            //     console.log('✅ [Gig Service] Work history event published for application rejection:', id);
            // } catch (workHistoryError) {
            //     console.error('❌ [Gig Service] Failed to publish work history event for application rejection:', workHistoryError);
            // }

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
            const { error, value } = ApplicationController.acceptInvitationSchema.validate(req.body);
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

                // Update application work history for invitation acceptance
                await tx.applicationWorkHistory.upsert({
                    where: { applicationId: actualApplicationId },
                    update: {
                        acceptedAt: new Date(),
                        applicationStatus: 'APPROVED',
                        paymentAmount: targetApplication.quotedPrice || targetApplication.gig.budgetMax || targetApplication.gig.budgetMin,
                        paymentStatus: 'PENDING',
                        lastActivityAt: new Date()
                    },
                    create: {
                        applicationId: actualApplicationId,
                        gigId: targetApplication.gigId,
                        applicantId: targetApplication.applicantId,
                        gigOwnerId: targetApplication.gig.postedById,
                        gigPrice: targetApplication.gig.budgetMax || targetApplication.gig.budgetMin,
                        quotedPrice: targetApplication.quotedPrice,
                        appliedAt: targetApplication.appliedAt,
                        acceptedAt: new Date(),
                        applicationStatus: 'APPROVED',
                        paymentAmount: targetApplication.quotedPrice || targetApplication.gig.budgetMax || targetApplication.gig.budgetMin,
                        paymentStatus: 'PENDING',
                        lastActivityAt: new Date()
                    }
                });

                // Update campaign history
                await tx.campaignHistory.upsert({
                    where: { gigId: targetApplication.gigId },
                    update: {
                        acceptedApplications: { increment: 1 },
                        gigPrice: targetApplication.quotedPrice || targetApplication.gig.budgetMax || targetApplication.gig.budgetMin,
                        updatedAt: new Date()
                    },
                    create: {
                        gigId: targetApplication.gigId,
                        brandId: targetApplication.gig.postedById,
                        campaignTitle: targetApplication.gig.title,
                        campaignDescription: targetApplication.gig.description,
                        campaignType: targetApplication.gig.category || 'GENERAL',
                        budget: targetApplication.gig.budgetMax || targetApplication.gig.budgetMin || 0,
                        status: 'ACTIVE',
                        acceptedApplications: 1,
                        gigPrice: targetApplication.quotedPrice || targetApplication.gig.budgetMax || targetApplication.gig.budgetMin,
                        totalApplications: 1
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
                recipientId: targetApplication.gig.postedById,
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
            res.json({
                success: true,
                message: 'Gig invitation accepted',
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
                recipientId: application.gig.postedById,
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

            const { error, value } = ApplicationController.applyGigSchema.validate(req.body);
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
}
module.exports = new ApplicationController();