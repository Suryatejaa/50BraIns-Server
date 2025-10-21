const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const rabbitmqService = require('./rabbitmqService');

class GigEventConsumer {
    constructor() {
        this.prisma = new PrismaClient();
        this.services = {
            credit: process.env.CREDIT_SERVICE_URL || 'http://localhost:4005',
            workHistory: process.env.WORK_HISTORY_SERVICE_URL || 'http://localhost:4006',
            user: process.env.USER_SERVICE_URL || 'http://localhost:4002'
        };
    }

    async handleMessage(eventData) {
        try {
            console.log('🎯 [Gig Service] Processing gig event:', eventData);

            // Handle different event types based on routing key or eventType
            const eventType = eventData.eventType || eventData.routingKey;

            switch (eventType) {
                case 'work_submitted':
                case 'gig.delivered':
                    await this.handleWorkSubmitted(eventData);
                    break;
                case 'submission_reviewed':
                case 'gig.event':
                    if (eventData.eventType === 'submission_reviewed') {
                        await this.handleSubmissionReviewed(eventData);
                    }
                    break;
                case 'gig_completed':
                case 'gig.completed':
                    await this.handleGigCompleted(eventData);
                    break;
                default:
                    console.log(`⚠️ [Gig Service] Event not relevant for gig service: ${eventType}`);
            }
        } catch (error) {
            console.error('❌ [Gig Service] Error handling gig event:', error);
            throw error; // Re-throw to trigger message nack
        }
    }

    async handleWorkSubmitted(eventData) {
        try {
            // Handle both direct work_submitted events and gig.delivered events
            const gigId = eventData.gigId;
            const submittedById = eventData.submittedById || eventData.userId;
            const gigOwnerId = eventData.gigOwnerId || eventData.clientId;
            const submissionTitle = eventData.submissionTitle || eventData.deliveryData?.submissionTitle;

            console.log(`📝 [Gig Service] Work submitted for gig ${gigId} by user ${submittedById}`);

            // Send notification to gig owner about submission
            await this.notifyGigOwner(gigId, gigOwnerId, submittedById, submissionTitle);

            console.log(`✅ [Gig Service] Work submission processed for gig ${gigId}`);

        } catch (error) {
            console.error('❌ [Gig Service] Error handling work submission:', error);
            throw error;
        }
    }

    async handleSubmissionReviewed(eventData) {
        try {
            // Handle both direct submission_reviewed events and gig.event with submission_reviewed
            const reviewData = eventData.eventType === 'submission_reviewed' ? eventData : eventData.data;

            const { gigId, submissionId, reviewStatus, submittedById, gigOwnerId, rating, gigCompleted } = reviewData;

            console.log(`🔍 [Gig Service] Submission ${submissionId} reviewed with status: ${reviewStatus}`);

            if (reviewStatus === 'APPROVED' && gigCompleted) {
                // Gig is completed - trigger reward system
                await this.handleGigCompleted({
                    gigId,
                    submissionId,
                    submittedById,
                    gigOwnerId,
                    rating
                });
            } else if (reviewStatus === 'REVISION') {
                // Send revision request notification
                await this.notifyRevisionRequest(gigId, submittedById, gigOwnerId);
            } else if (reviewStatus === 'REJECTED') {
                // Handle rejection
                await this.handleSubmissionRejection(gigId, submittedById, gigOwnerId);
            }

            console.log(`✅ [Gig Service] Submission review processed for gig ${gigId}`);

        } catch (error) {
            console.error('❌ [Gig Service] Error handling submission review:', error);
            throw error;
        }
    }

    async handleGigCompleted(eventData) {
        try {
            // Handle both direct gig_completed events and gig.completed events
            const completionData = eventData.eventType === 'gig_completed' ? eventData : eventData;

            const { gigId, submissionId, submittedById, gigOwnerId, rating } = completionData;
            const userId = submittedById || completionData.userId;
            const clientId = gigOwnerId || completionData.clientId;

            console.log(`🎉 [Gig Service] Gig ${gigId} completed! Processing rewards...`);

            // Get gig details for reward calculation
            const gig = await this.prisma.gig.findUnique({
                where: { id: gigId },
                include: {
                    submission: {
                        where: { id: submissionId }
                    }
                }
            });

            if (!gig) {
                throw new Error(`Gig ${gigId} not found`);
            }

            // Calculate credit reward based on gig budget and rating
            const creditReward = await this.calculateCreditReward(gig, rating);

            // Award credits to the worker
            const creditResult = await this.awardCredits(userId, creditReward, {
                gigId,
                gigTitle: gig.title,
                submissionId,
                type: 'gig_completion'
            });

            if (!creditResult.success) {
                console.error('❌ [Gig Service] Failed to award credits:', creditResult.error);
            }

            // Create work history record
            const workHistoryResult = await this.createWorkHistoryRecord(gig, userId, clientId, rating);

            if (!workHistoryResult.success) {
                console.error('❌ [Gig Service] Failed to create work history:', workHistoryResult.error);
            }

            // Update gig with completion metadata
            await this.prisma.gig.update({
                where: { id: gigId },
                data: {
                    completedAt: new Date(),
                    creditReward,
                    workHistoryId: workHistoryResult.data?.id
                }
            });

            // Publish gig completion event
            await this.publishEvent('gig_completed', {
                gigId,
                submissionId,
                submittedById: userId,
                gigOwnerId: clientId,
                creditReward,
                rating,
                completedAt: new Date().toISOString()
            });

            console.log(`✅ [Gig Service] Gig ${gigId} completion processed successfully`);

        } catch (error) {
            console.error('❌ [Gig Service] Error handling gig completion:', error);
            throw error;
        }
    }

    async calculateCreditReward(gig, rating) {
        try {
            // Base reward calculation
            let baseReward = 0;

            if (gig.budgetMin && gig.budgetMax) {
                // Calculate average budget
                const avgBudget = (gig.budgetMin + gig.budgetMax) / 2;
                // Base reward is 10% of budget, minimum 5 credits
                baseReward = Math.max(5, Math.floor(avgBudget * 0.1));
            } else {
                // Default reward for gigs without budget
                baseReward = 10;
            }

            // Rating bonus (1-5 stars)
            let ratingBonus = 0;
            if (rating && rating >= 4) {
                ratingBonus = Math.floor(baseReward * 0.2); // 20% bonus for 4+ stars
            } else if (rating && rating >= 3) {
                ratingBonus = Math.floor(baseReward * 0.1); // 10% bonus for 3+ stars
            }

            // Complexity bonus based on skills required
            let complexityBonus = 0;
            if (gig.requiredSkills && gig.requiredSkills.length > 0) {
                complexityBonus = Math.min(5, gig.requiredSkills.length * 2); // 2 credits per skill, max 5
            }

            const totalReward = baseReward + ratingBonus + complexityBonus;

            console.log(`💰 [Gig Service] Credit reward calculated: base=${baseReward}, rating=${ratingBonus}, complexity=${complexityBonus}, total=${totalReward}`);

            return totalReward;

        } catch (error) {
            console.error('❌ [Gig Service] Error calculating credit reward:', error);
            return 10; // Default fallback
        }
    }

    async awardCredits(userId, amount, metadata) {
        try {
            console.log(`💳 [Gig Service] Awarding ${amount} credits to user ${userId}`);

            const response = await axios.post(
                `${this.services.credit}/credits/award`,
                {
                    userId,
                    amount,
                    type: 'GIG_COMPLETION',
                    description: `Gig completion reward: ${metadata.gigTitle}`,
                    metadata: {
                        gigId: metadata.gigId,
                        submissionId: metadata.submissionId,
                        rewardType: metadata.type
                    }
                },
                {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-service': 'gig-service'
                    }
                }
            );

            if (response.data.success) {
                console.log(`✅ [Gig Service] Successfully awarded ${amount} credits to user ${userId}`);
                return { success: true, data: response.data.data };
            } else {
                throw new Error(response.data.error || 'Failed to award credits');
            }

        } catch (error) {
            console.error('❌ [Gig Service] Error awarding credits:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    async createWorkHistoryRecord(gig, workerId, clientId, rating) {
        try {
            console.log(`📚 [Gig Service] Creating work history record for gig ${gig.id}`);

            // Get submission data to include deliverables
            const submission = await this.prisma.submission.findFirst({
                where: { gigId: gig.id },
                orderBy: { submittedAt: 'desc' }
            });

            // Parse deliverables from JSON strings
            const parsedDeliverables = submission?.deliverables?.map(deliverableString => {
                try {
                    return JSON.parse(deliverableString);
                } catch (error) {
                    console.warn('Failed to parse deliverable:', deliverableString);
                    return { type: 'other', description: 'Parsed deliverable' };
                }
            }) || [];

            const workData = {
                userId: workerId,
                gigId: gig.id,
                clientId: clientId,
                title: gig.title,
                description: gig.description,
                category: gig.category || 'General', // Default category if none
                skills: gig.requiredSkills || [],
                completedAt: new Date(),
                deliveryTime: this.calculateDeliveryTime(gig.createdAt, gig.completedAt),
                budgetRange: gig.budgetMin && gig.budgetMax ? `${gig.budgetMin}-${gig.budgetMax}` : 'Not specified',
                actualBudget: gig.actualBudget || null,
                clientRating: rating || null,
                clientFeedback: null, // Could be added to submission review
                onTimeDelivery: this.isOnTimeDelivery(gig.deadline, gig.completedAt),
                withinBudget: true, // Assuming completed gigs are within budget
                // Convert parsed deliverables to portfolio items
                portfolioItems: parsedDeliverables.map(deliverable => ({
                    type: deliverable.type || 'other',
                    platform: deliverable.platform || null,
                    content: deliverable.content || null,
                    url: deliverable.url || null,
                    file: deliverable.file || null,
                    description: deliverable.description || deliverable.content || 'Work deliverable'
                }))
            };

            const response = await axios.post(
                `${this.services.workHistory}/work-records`,
                workData,
                {
                    timeout: 30000,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-service': 'gig-service'
                    }
                }
            );

            if (response.data.success) {
                console.log(`✅ [Gig Service] Work history record created: ${response.data.data.id}`);
                return { success: true, data: response.data.data };
            } else {
                throw new Error(response.data.error || 'Failed to create work history record');
            }

        } catch (error) {
            console.error('❌ [Gig Service] Error creating work history record:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    calculateDeliveryTime(createdAt, completedAt) {
        if (!createdAt || !completedAt) return null;

        const start = new Date(createdAt);
        const end = new Date(completedAt);
        const diffMs = end - start;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 24) {
            return `${diffHours} hours`;
        } else {
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays} days`;
        }
    }

    isOnTimeDelivery(deadline, completedAt) {
        if (!deadline || !completedAt) return true;

        const deadlineDate = new Date(deadline);
        const completedDate = new Date(completedAt);

        return completedDate <= deadlineDate;
    }

    async notifyGigOwner(gigId, ownerId, workerId, submissionTitle) {
        try {
            // This would integrate with notification service
            console.log(`📢 [Gig Service] Notifying gig owner ${ownerId} about submission from ${workerId}`);
        } catch (error) {
            console.error('❌ [Gig Service] Error notifying gig owner:', error);
        }
    }

    async notifyRevisionRequest(gigId, workerId, ownerId) {
        try {
            console.log(`📝 [Gig Service] Notifying worker ${workerId} about revision request for gig ${gigId}`);
        } catch (error) {
            console.error('❌ [Gig Service] Error notifying revision request:', error);
        }
    }

    async handleSubmissionRejection(gigId, workerId, ownerId) {
        try {
            console.log(`❌ [Gig Service] Handling rejection for gig ${gigId} by worker ${workerId}`);

            // Reset gig status to allow new submissions
            await this.prisma.gig.update({
                where: { id: gigId },
                data: {
                    status: 'ASSIGNED',
                    assignedToId: null,
                    assignedToType: null
                }
            });
        } catch (error) {
            console.error('❌ [Gig Service] Error handling submission rejection:', error);
        }
    }

    async publishEvent(eventType, eventData) {
        try {
            // Use the existing RabbitMQ service to publish events
            if (rabbitmqService.isConnected) {
                await rabbitmqService.publishGigEvent(eventType, eventData);
                console.log(`📡 [Gig Service] Published event: ${eventType}`, eventData);
            }
        } catch (error) {
            console.error('❌ [Gig Service] Error publishing event:', error);
        }
    }

    async cleanup() {
        try {
            await this.prisma.$disconnect();
        } catch (error) {
            console.error('❌ [Gig Service] Error during cleanup:', error);
        }
    }
}

module.exports = GigEventConsumer;
