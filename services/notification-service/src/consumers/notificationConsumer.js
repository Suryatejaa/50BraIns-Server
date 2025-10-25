// services/notification-service/src/consumers/notificationConsumer.js
const { prisma } = require('../config/database');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');
const WebSocketService = require('../utils/websocket');
const axios = require('axios');

class NotificationConsumer {
    constructor() {
        this.emailService = emailService;
        this.webSocketService = WebSocketService;
    }

    // === GIG EVENT HANDLERS ===
    async handleGigCreated(eventData) {
        try {
            console.log('🎬 [Notification Service] Handling gig_created event:', eventData);

            const { gigId, gigTitle, postedById, category, budgetMin, budgetMax, roleRequired } = eventData;

            // Notify the gig creator that their gig was created successfully
            await this.createAndSendNotification({
                userId: postedById,
                type: 'GIG',
                category: 'GIG',
                title: '✅ Gig Created Successfully!',
                message: `Your gig "${gigTitle}" has been created and is now live. Start receiving applications from talented creators!`,
                metadata: { gigId, category, budgetRange: `${budgetMin}-${budgetMax}`, roleRequired }
            });

            console.log('✅ [Notification Service] Gig created notification processed successfully');
            logger.notification('Gig created notification sent', { gigId, postedById, gigTitle });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling gig created notification:', error);
            logger.error('Error handling gig created notification:', error);
        }
    }

    async handleGigCompleted(eventData) {
        try {
            const { gigId, userId, clientId, title, payment } = eventData;

            // Notify the gig worker
            await this.createAndSendNotification({
                userId: userId,
                type: 'GIG',
                category: 'GIG',
                title: '🎉 Gig Completed Successfully!',
                message: `Congratulations! You've successfully completed the gig "${title}". Payment of ₹${payment} is being processed.`,
                metadata: { gigId, payment }
            });

            // Send email to gig worker
            if (eventData.userEmail) {
                await this.emailService.sendEmail({
                    to: eventData.userEmail,
                    templateName: 'gig-completed',
                    templateData: {
                        userName: eventData.userName || 'Creator',
                        gigTitle: title,
                        paymentAmount: payment,
                        completionDate: new Date().toLocaleDateString()
                    }
                });
            }

            // Notify the client/brand
            if (clientId) {
                await this.createAndSendNotification({
                    userId: clientId,
                    type: 'GIG',
                    category: 'GIG',
                    title: '✅ Gig Deliverable Received',
                    message: `The gig "${title}" has been completed. Please review the deliverable and provide feedback.`,
                    metadata: { gigId, workerId: userId }
                });
            }

            logger.notification('Gig completed notifications sent', { gigId, userId, clientId });
        } catch (error) {
            logger.error('Error handling gig completed notification:', error);
        }
    }

    async handleGigApplied(eventData) {
        try {
            const { gigId, applicantId, gigOwnerId, gigTitle, applicantName } = eventData;

            // Notify gig owner about new application
            await this.createAndSendNotification({
                userId: gigOwnerId,
                type: 'GIG',
                category: 'GIG',
                title: '📋 New Gig Application!',
                message: `${applicantName} has applied for your gig "${gigTitle}". Review their application now.`,
                metadata: { gigId, applicantId }
            });

            // Send email to gig owner
            if (eventData.ownerEmail) {
                await this.emailService.sendEmail({
                    to: eventData.ownerEmail,
                    templateName: 'gig-applied',
                    templateData: {
                        ownerName: eventData.ownerName || 'Brand',
                        gigTitle: gigTitle,
                        applicantName: applicantName,
                        applicationDate: new Date().toLocaleDateString()
                    }
                });
            }

            logger.notification('Gig application notification sent to owner', { gigId, applicantId, gigOwnerId });
        } catch (error) {
            logger.error('Error handling gig applied notification:', error);
        }
    }

    async handleGigAssigned(eventData) {
        try {
            const { gigId, assignedToId, gigTitle, gigOwnerId } = eventData;

            await this.createAndSendNotification({
                userId: assignedToId,
                type: 'GIG',
                category: 'GIG',
                title: '🎯 You Got the Gig!',
                message: `Congratulations! You've been selected for "${gigTitle}"! Start working on it now!`,
                metadata: { gigId }
            });

            // Send congratulatory email
            if (eventData.userEmail) {
                await this.emailService.sendEmail({
                    to: eventData.userEmail,
                    templateName: 'gig-assigned',
                    templateData: {
                        userName: eventData.userName || 'Creator',
                        gigTitle: gigTitle,
                        startDate: new Date().toLocaleDateString()
                    }
                });
            }

            logger.notification('Gig assigned notification sent', { gigId, assignedToId });
        } catch (error) {
            logger.error('Error handling gig assigned notification:', error);
        }
    }

    async handleGigApplicationAccepted(eventData) {
        try {
            const { gigId, applicationId, applicantId, applicantType, gigOwnerId } = eventData;

            // Notify the applicant that their application was accepted
            await this.createAndSendNotification({
                userId: applicantId,
                type: 'GIG',
                category: 'GIG',
                title: '🎉 Application Accepted!',
                message: `Great news! Your application for gig "${eventData.gigTitle || gigId}" has been accepted. Start working on it now!`,
                metadata: { gigId, applicationId, applicantType, gigOwnerId }
            });

            // If it's a clan application, the individual member notifications are handled separately
            // by the clan-specific event handlers we added earlier

            logger.notification('Gig application accepted notification sent', { gigId, applicationId, applicantId, applicantType });
        } catch (error) {
            logger.error('Error handling gig application accepted notification:', error);
        }
    }

    async handleGigApplicationRejected(eventData) {
        try {
            const { gigId, gigTitle, applicationId, applicantId, applicantType, gigOwnerId, reason } = eventData;

            // Notify the applicant that their application was rejected
            await this.createAndSendNotification({
                userId: applicantId,
                type: 'GIG',
                category: 'GIG',
                title: '❌ Application Not Selected',
                message: `Your application for gig "${gigTitle || gigId}" was not selected at this time.${reason ? ` Reason: ${reason}` : ''}`,
                metadata: { gigId, applicationId, applicantType, gigOwnerId, reason }
            });

            logger.notification('Gig application rejected notification sent', { gigId, applicationId, applicantId, applicantType });
        } catch (error) {
            logger.error('Error handling gig application rejected notification:', error);
        }
    }

    async handleGigUpdated(eventData) {
        try {
            console.log('📝 [Notification Service] Handling gig_updated event:', eventData);
            // For now, just log the event - can add specific notifications if needed
            logger.notification('Gig updated event processed', { gigId: eventData.gigId });
        } catch (error) {
            logger.error('Error handling gig updated notification:', error);
        }
    }

    async handleGigDeleted(eventData) {
        try {
            console.log('🗑️ [Notification Service] Handling gig_deleted event:', eventData);
            // For now, just log the event - can add specific notifications if needed
            logger.notification('Gig deleted event processed', { gigId: eventData.gigId });
        } catch (error) {
            logger.error('Error handling gig deleted notification:', error);
        }
    }

    async handleGigPublished(eventData) {
        try {
            console.log('📢 [Notification Service] Handling gig_published event:', eventData);
            // For now, just log the event - can add specific notifications if needed
            logger.notification('Gig published event processed', { gigId: eventData.gigId });
        } catch (error) {
            logger.error('Error handling gig published notification:', error);
        }
    }

    async handleGigClosed(eventData) {
        try {
            console.log('🔒 [Notification Service] Handling gig_closed event:', eventData);
            // For now, just log the event - can add specific notifications if needed
            logger.notification('Gig closed event processed', { gigId: eventData.gigId });
        } catch (error) {
            logger.error('Error handling gig closed notification:', error);
        }
    }

    async handleGigBoosted(eventData) {
        try {
            console.log('🚀 [Notification Service] Handling gig_boosted event:', eventData);
            // For now, just log the event - can add specific notifications if needed
            logger.notification('Gig boosted event processed', { gigId: eventData.gigId });
        } catch (error) {
            logger.error('Error handling gig boosted notification:', error);
        }
    }

    async handleGigMilestoneCreated(eventData) {
        try {
            console.log('🎯 [Notification Service] Handling gig_milestone_created event:', eventData);
            // For now, just log the event - can add specific notifications if needed
            logger.notification('Gig milestone created event processed', { gigId: eventData.gigId });
        } catch (error) {
            logger.error('Error handling gig milestone created notification:', error);
        }
    }

    async handleGigTaskCreated(eventData) {
        try {
            console.log('📋 [Notification Service] Handling gig_task_created event:', eventData);
            // For now, just log the event - can add specific notifications if needed
            logger.notification('Gig task created event processed', { gigId: eventData.gigId });
        } catch (error) {
            logger.error('Error handling gig task created notification:', error);
        }
    }

    async handleGigTaskUpdated(eventData) {
        try {
            console.log('📝 [Notification Service] Handling gig_task_updated event:', eventData);
            // For now, just log the event - can add specific notifications if needed
            logger.notification('Gig task updated event processed', { gigId: eventData.gigId });
        } catch (error) {
            logger.error('Error handling gig task updated notification:', error);
        }
    }

    // === CLAN EVENT HANDLERS ===
    async handleClanCreated(eventData) {
        try {
            console.log('🏛️ [Notification Service] Handling clan_created event:', eventData);

            const { clanId, clanName, headId, headName, category, location } = eventData;

            // Notify the clan creator that their clan was created successfully
            await this.createAndSendNotification({
                userId: headId,
                type: 'CLAN',
                category: 'CLAN',
                title: '🎉 Clan Created Successfully!',
                message: `Your clan "${clanName}" has been created and is now live. Start inviting members and building your community!`,
                metadata: { clanId, clanName, category, location, eventType: 'clan.created' }
            });

            console.log('✅ [Notification Service] Clan created notification processed successfully');
            logger.notification('Clan created notification sent', { clanId, headId, clanName });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan created notification:', error);
            logger.error('Error handling clan created notification:', error);
        }
    }

    async handleClanJoined(eventData) {
        try {
            console.log('👥 [Notification Service] Handling clan_member_joined event:', eventData);

            const { clanId, clanName, userId, userName, role } = eventData;

            // Notify the new member
            await this.createAndSendNotification({
                userId: userId,
                type: 'CLAN',
                category: 'CLAN',
                title: '🎉 Welcome to the Clan!',
                message: `You've successfully joined "${clanName}" as a ${role.toLowerCase()}. Start collaborating with your clan members!`,
                metadata: { clanId, clanName, role, eventType: 'clan.member.joined' }
            });

            // Notify clan head about new member (if not the same person)
            if (eventData.headId && eventData.headId !== userId) {
                await this.createAndSendNotification({
                    userId: eventData.headId,
                    type: 'ENGAGEMENT',
                    category: 'CLAN',
                    title: '👋 New Clan Member!',
                    message: `${userName} has joined your clan "${clanName}" as a ${role.toLowerCase()}.`,
                    metadata: { clanId, clanName, newMemberId: userId, newMemberName: userName, role, eventType: 'clan.member.joined' }
                });
            }

            console.log('✅ [Notification Service] Clan joined notification processed successfully');
            logger.notification('Clan joined notification sent', { clanId, userId, clanName });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan joined notification:', error);
            logger.error('Error handling clan joined notification:', error);
        }
    }

    async handleClanLeft(eventData) {
        try {
            console.log('👋 [Notification Service] Handling clan_member_left event:', eventData);

            const { clanId, clanName, userId, userName, role } = eventData;

            // Notify clan head about member leaving
            if (eventData.headId) {
                await this.createAndSendNotification({
                    userId: eventData.headId,
                    type: 'ENGAGEMENT',
                    category: 'CLAN',
                    title: '👋 Clan Member Left',
                    message: `${userName} has left your clan "${clanName}".`,
                    metadata: { clanId, clanName, leftMemberId: userId, leftMemberName: userName, role, eventType: 'clan.member.left' }
                });
            }

            console.log('✅ [Notification Service] Clan left notification processed successfully');
            logger.notification('Clan left notification sent', { clanId, userId, clanName });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan left notification:', error);
            logger.error('Error handling clan left notification:', error);
        }
    }

    async handleClanJoinRequest(eventData) {
        try {
            console.log('📝 [Notification Service] Handling clan_join_request event:', eventData);

            const { clanId, clanName, userId, userName, message } = eventData;

            // Notify clan head about join request
            if (eventData.headId) {
                await this.createAndSendNotification({
                    userId: eventData.headId,
                    type: 'ENGAGEMENT',
                    category: 'CLAN',
                    title: '📝 New Join Request',
                    message: `${userName} has requested to join your clan "${clanName}". ${message ? `Message: "${message}"` : ''}`,
                    metadata: { clanId, clanName, requesterId: userId, requesterName: userName, message, eventType: 'clan.join.request' }
                });
            }

            // Notify all clan admins about join request
            if (eventData.adminIds && Array.isArray(eventData.adminIds)) {
                for (const adminId of eventData.adminIds) {
                    if (adminId !== eventData.headId) { // Avoid duplicate notification
                        await this.createAndSendNotification({
                            userId: adminId,
                            type: 'ENGAGEMENT',
                            category: 'CLAN',
                            title: '📝 New Join Request',
                            message: `${userName} has requested to join "${clanName}". ${message ? `Message: "${message}"` : ''}`,
                            metadata: { clanId, clanName, requesterId: userId, requesterName: userName, message, eventType: 'clan.join.request' }
                        });
                    }
                }
            }

            console.log('✅ [Notification Service] Clan join request notification processed successfully');
            logger.notification('Clan join request notification sent', { clanId, userId, clanName });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan join request notification:', error);
            logger.error('Error handling clan join request notification:', error);
        }
    }

    async handleClanJoinRequestApproved(eventData) {
        try {
            console.log('✅ [Notification Service] Handling clan_join_request_approved event:', eventData);

            const { clanId, clanName, userId, userName, approvedBy, approvedByName } = eventData;

            // Notify the approved user
            await this.createAndSendNotification({
                userId: userId,
                type: 'ENGAGEMENT',
                category: 'CLAN',
                title: '🎉 Join Request Approved!',
                message: `Your request to join "${clanName}" has been approved by ${approvedByName}. Welcome to the clan!`,
                metadata: { clanId, clanName, approvedBy, approvedByName, eventType: 'clan.join.request.approved' }
            });

            console.log('✅ [Notification Service] Clan join request approved notification processed successfully');
            logger.notification('Clan join request approved notification sent', { clanId, userId, clanName });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan join request approved notification:', error);
            logger.error('Error handling clan join request approved notification:', error);
        }
    }

    async handleClanJoinRequestRejected(eventData) {
        try {
            console.log('❌ [Notification Service] Handling clan_join_request_rejected event:', eventData);

            const { clanId, clanName, userId, userName, rejectedBy, rejectedByName, reason } = eventData;

            // Notify the rejected user
            await this.createAndSendNotification({
                userId: userId,
                type: 'ENGAGEMENT',
                category: 'CLAN',
                title: 'Join Request Update',
                message: `Your request to join "${clanName}" was not approved at this time. ${reason ? `Reason: ${reason}` : ''}`,
                metadata: { clanId, clanName, rejectedBy, rejectedByName, reason, eventType: 'clan.join.request.rejected' }
            });

            console.log('✅ [Notification Service] Clan join request rejected notification processed successfully');
            logger.notification('Clan join request rejected notification sent', { clanId, userId, clanName });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan join request rejected notification:', error);
            logger.error('Error handling clan join request rejected notification:', error);
        }
    }

    async handleClanMemberRoleUpdated(eventData) {
        try {
            console.log('👑 [Notification Service] Handling clan_member_role_updated event:', eventData);

            const { clanId, clanName, userId, userName, oldRole, newRole, updatedBy, updatedByName } = eventData;

            // Notify the member about role change
            await this.createAndSendNotification({
                userId: userId,
                type: 'ENGAGEMENT',
                category: 'CLAN',
                title: '👑 Role Updated',
                message: `Your role in "${clanName}" has been updated from ${oldRole} to ${newRole} by ${updatedByName}.`,
                metadata: { clanId, clanName, oldRole, newRole, updatedBy, updatedByName, eventType: 'clan.member.role.updated' }
            });

            console.log('✅ [Notification Service] Clan member role updated notification processed successfully');
            logger.notification('Clan member role updated notification sent', { clanId, userId, clanName, oldRole, newRole });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan member role updated notification:', error);
            logger.error('Error handling clan member role updated notification:', error);
        }
    }

    async handleClanMemberRemoved(eventData) {
        try {
            console.log('🚫 [Notification Service] Handling clan_member_removed event:', eventData);

            const { clanId, clanName, userId, userName, removedBy, removedByName, reason } = eventData;

            // Notify the removed member
            await this.createAndSendNotification({
                userId: userId,
                type: 'ENGAGEMENT',
                category: 'CLAN',
                title: 'Clan Membership Ended',
                message: `You have been removed from "${clanName}" by ${removedByName}. ${reason ? `Reason: ${reason}` : ''}`,
                metadata: { clanId, clanName, removedBy, removedByName, reason, eventType: 'clan.member.removed' }
            });

            console.log('✅ [Notification Service] Clan member removed notification processed successfully');
            logger.notification('Clan member removed notification sent', { clanId, userId, clanName });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan member removed notification:', error);
            logger.error('Error handling clan member removed notification:', error);
        }
    }

    async handleClanAdminAdded(eventData) {
        try {
            console.log('👑 [Notification Service] Handling clan_admin_added event:', eventData);

            const { clanId, clanName, userId, userName, addedBy, addedByName } = eventData;

            // Notify the new admin
            await this.createAndSendNotification({
                userId: userId,
                type: 'ENGAGEMENT',
                category: 'CLAN',
                title: '👑 Admin Role Granted',
                message: `You have been promoted to admin in "${clanName}" by ${addedByName}. You now have additional permissions.`,
                metadata: { clanId, clanName, addedBy, addedByName, eventType: 'clan.admin.added' }
            });

            console.log('✅ [Notification Service] Clan admin added notification processed successfully');
            logger.notification('Clan admin added notification sent', { clanId, userId, clanName });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan admin added notification:', error);
            logger.error('Error handling clan admin added notification:', error);
        }
    }

    async handleClanAdminRemoved(eventData) {
        try {
            console.log('👤 [Notification Service] Handling clan_admin_removed event:', eventData);

            const { clanId, clanName, userId, userName, removedBy, removedByName, reason } = eventData;

            // Notify the removed admin
            await this.createAndSendNotification({
                userId: userId,
                type: 'ENGAGEMENT',
                category: 'CLAN',
                title: 'Admin Role Removed',
                message: `Your admin role in "${clanName}" has been removed by ${removedByName}. ${reason ? `Reason: ${reason}` : ''}`,
                metadata: { clanId, clanName, removedBy, removedByName, reason, eventType: 'clan.admin.removed' }
            });

            console.log('✅ [Notification Service] Clan admin removed notification processed successfully');
            logger.notification('Clan admin removed notification sent', { clanId, userId, clanName });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan admin removed notification:', error);
            logger.error('Error handling clan admin removed notification:', error);
        }
    }

    async handleClanOwnershipTransferred(eventData) {
        try {
            console.log('👑 [Notification Service] Handling clan_ownership_transferred event:', eventData);

            const { clanId, clanName, oldOwnerId, oldOwnerName, newOwnerId, newOwnerName } = eventData;

            // Notify the new owner
            await this.createAndSendNotification({
                userId: newOwnerId,
                type: 'ENGAGEMENT',
                category: 'CLAN',
                title: '👑 Clan Ownership Transferred',
                message: `You are now the owner of "${clanName}". You have full control over the clan.`,
                metadata: { clanId, clanName, oldOwnerId, oldOwnerName, eventType: 'clan.ownership.transferred' }
            });

            // Notify the old owner
            await this.createAndSendNotification({
                userId: oldOwnerId,
                type: 'ENGAGEMENT',
                category: 'CLAN',
                title: 'Clan Ownership Transferred',
                message: `Ownership of "${clanName}" has been transferred to ${newOwnerName}.`,
                metadata: { clanId, clanName, newOwnerId, newOwnerName, eventType: 'clan.ownership.transferred' }
            });

            console.log('✅ [Notification Service] Clan ownership transferred notification processed successfully');
            logger.notification('Clan ownership transferred notification sent', { clanId, oldOwnerId, newOwnerId, clanName });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan ownership transferred notification:', error);
            logger.error('Error handling clan ownership transferred notification:', error);
        }
    }

    async handleClanMessageSent(eventData) {
        try {
            console.log('💬 [Notification Service] Handling clan_message_sent event:', eventData);

            const { clanId, clanName, userId, userName, messageType, content, messageId } = eventData;

            // For gig sharing, notify all clan members (except sender)
            if (messageType === 'GIG_SHARE' && eventData.clanMemberIds) {
                for (const memberId of eventData.clanMemberIds) {
                    if (memberId !== userId) {
                        await this.createAndSendNotification({
                            userId: memberId,
                            type: 'ENGAGEMENT',
                            category: 'CLAN',
                            title: '🎯 New Gig Shared in Clan',
                            message: `${userName} shared a new gig opportunity in "${clanName}". Check it out!`,
                            metadata: { clanId, clanName, senderId: userId, senderName: userName, messageType, messageId, eventType: 'clan.message.sent' }
                        });
                    }
                }
            }

            console.log('✅ [Notification Service] Clan message sent notification processed successfully');
            logger.notification('Clan message sent notification sent', { clanId, userId, clanName, messageType });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan message sent notification:', error);
            logger.error('Error handling clan message sent notification:', error);
        }
    }

    async handleClanReputationUpdated(eventData) {
        try {
            console.log('📊 [Notification Service] Handling clan_reputation_updated event:', eventData);

            const { clanId, clanName, oldScore, newScore, changeReason } = eventData;

            // Notify clan head about reputation change
            if (eventData.headId) {
                const changeDirection = newScore > oldScore ? 'increased' : 'decreased';
                const changeAmount = Math.abs(newScore - oldScore);

                await this.createAndSendNotification({
                    userId: eventData.headId,
                    type: 'ENGAGEMENT',
                    category: 'CLAN',
                    title: '📊 Clan Reputation Updated',
                    message: `Your clan "${clanName}" reputation has ${changeDirection} by ${changeAmount} points. ${changeReason ? `Reason: ${changeReason}` : ''}`,
                    metadata: { clanId, clanName, oldScore, newScore, changeDirection, changeAmount, changeReason, eventType: 'clan.reputation.updated' }
                });
            }

            console.log('✅ [Notification Service] Clan reputation updated notification processed successfully');
            logger.notification('Clan reputation updated notification sent', { clanId, oldScore, newScore, clanName });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan reputation updated notification:', error);
            logger.error('Error handling clan reputation updated notification:', error);
        }
    }

    async handleClanUpdated(eventData) {
        try {
            console.log('✏️ [Notification Service] Handling clan_updated event:', eventData);

            const { clanId, clanName, updatedBy, updatedByName, changes } = eventData;

            // Notify all clan members about significant changes
            if (eventData.clanMemberIds && Array.isArray(eventData.clanMemberIds)) {
                for (const memberId of eventData.clanMemberIds) {
                    if (memberId !== updatedBy) { // Don't notify the person who made the change
                        await this.createAndSendNotification({
                            userId: memberId,
                            type: 'ENGAGEMENT',
                            category: 'CLAN',
                            title: '✏️ Clan Updated',
                            message: `${updatedByName} has updated "${clanName}". Check out the changes!`,
                            metadata: { clanId, clanName, updatedBy, updatedByName, changes, eventType: 'clan.updated' }
                        });
                    }
                }
            }

            console.log('✅ [Notification Service] Clan updated notification processed successfully');
            logger.notification('Clan updated notification sent', { clanId, updatedBy, clanName });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan updated notification:', error);
            logger.error('Error handling clan updated notification:', error);
        }
    }

    // === USER EVENT HANDLERS ===
    async handleUserRegistered(eventData) {
        try {
            const { userId, email, username, firstName } = eventData;

            await this.createAndSendNotification({
                userId: userId,
                type: 'SYSTEM',
                category: 'USER',
                title: '🎉 Welcome to 50BraIns!',
                message: `Welcome ${firstName}! Your account has been created successfully. Complete your profile to get started.`,
                metadata: { isWelcome: true }
            });

            // Send welcome email
            await this.emailService.sendEmail({
                to: email,
                templateName: 'welcome',
                templateData: {
                    userName: firstName || username,
                    loginUrl: `${process.env.FRONTEND_URL}/login`,
                    supportEmail: process.env.SUPPORT_EMAIL || 'support@50brains.com'
                }
            });

            logger.notification('User registration notification sent', { userId });
        } catch (error) {
            logger.error('Error handling user registration notification:', error);
        }
    }

    async handlePasswordReset(eventData) {
        try {
            const { userId, email, resetToken, firstName } = eventData;

            await this.createAndSendNotification({
                userId: userId,
                type: 'SYSTEM',
                category: 'USER',
                title: '🔐 Password Reset Requested',
                message: 'A password reset has been requested for your account. Check your email for instructions.',
                metadata: { isPasswordReset: true }
            });

            // Send password reset email
            await this.emailService.sendEmail({
                to: email,
                templateName: 'password-reset',
                templateData: {
                    userName: firstName,
                    resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
                    expiryTime: '1 hour'
                }
            });

            logger.notification('Password reset notification sent', { userId });
        } catch (error) {
            logger.error('Error handling password reset notification:', error);
        }
    }

    async handleUserLogin(eventData) {
        try {
            const { id: userId, email, username, loginAt, loginMethod } = eventData;

            await this.createAndSendNotification({
                userId: userId,
                type: 'SYSTEM',
                category: 'USER',
                title: '🔐 Login Detected',
                message: `New login detected from ${loginMethod} on ${loginAt}.                
                If this was not you, please reset your password immediately to secure your account.
                `,
                metadata: {
                    loginAt: loginAt,
                    loginMethod: loginMethod,
                    isLogin: true
                }
            });

            logger.notification('User login notification sent', { userId });
        } catch (error) {
            logger.error('Error handling user login notification:', error);
        }
    }

    // === CREDIT/BOOST EVENT HANDLERS ===
    async handleBoostEvent(eventData) {
        try {
            const { userId, boostType, targetId, duration, creditsSpent } = eventData;

            await this.createAndSendNotification({
                userId: userId,
                type: 'TRANSACTIONAL',
                category: 'CREDITS',
                title: '⚡ Boost Activated!',
                message: `Your ${boostType.toLowerCase()} boost is now active for ${duration} hours. ${creditsSpent} credits spent.`,
                metadata: { boostType, targetId, duration, creditsSpent }
            });

            logger.notification('Boost event notification sent', { userId, boostType });
        } catch (error) {
            logger.error('Error handling boost event notification:', error);
        }
    }

    async handleCreditEvent(eventData) {
        try {
            const { userId, eventType, amount, newBalance } = eventData;

            let title, message;
            switch (eventType) {
                case 'CREDITS_PURCHASED':
                    title = '💰 Credits Purchased!';
                    message = `${amount} credits have been added to your account. New balance: ${newBalance} credits.`;
                    break;
                case 'CREDITS_SPENT':
                    title = '💸 Credits Spent';
                    message = `${amount} credits have been spent. Remaining balance: ${newBalance} credits.`;
                    break;
                case 'CREDITS_EARNED':
                    title = '🎁 Credits Earned!';
                    message = `You've earned ${amount} credits! New balance: ${newBalance} credits.`;
                    break;
                default:
                    title = '💳 Credit Update';
                    message = `Your credit balance has been updated. Current balance: ${newBalance} credits.`;
            }

            await this.createAndSendNotification({
                userId: userId,
                type: 'CREDIT',
                category: 'CREDITS',
                title: title,
                message: message,
                metadata: { eventType, amount, newBalance }
            });

            logger.notification('Credit event notification sent', { userId, eventType });
        } catch (error) {
            logger.error('Error handling credit event notification:', error);
        }
    }

    // === REPUTATION EVENT HANDLERS ===
    async handleReputationUpdated(eventData) {
        try {
            const { userId, oldTier, newTier, newScore } = eventData;

            if (oldTier !== newTier) {
                await this.createAndSendNotification({
                    userId: userId,
                    type: 'ENGAGEMENT',
                    category: 'REPUTATION',
                    title: '🎖️ Tier Upgrade!',
                    message: `Congratulations! You've been promoted from ${oldTier} to ${newTier} tier! Your new reputation score is ${newScore}.`,
                    metadata: { oldTier, newTier, newScore }
                });

                // Send tier upgrade email
                if (eventData.userEmail) {
                    await this.emailService.sendEmail({
                        to: eventData.userEmail,
                        templateName: 'tier-upgrade',
                        templateData: {
                            userName: eventData.userName || 'Creator',
                            oldTier: oldTier,
                            newTier: newTier,
                            newScore: newScore,
                            upgradeDate: new Date().toLocaleDateString()
                        }
                    });
                }
            }

            logger.notification('Reputation update notification sent', { userId, newTier });
        } catch (error) {
            logger.error('Error handling reputation update notification:', error);
        }
    }

    // === CLAN GIG EVENT HANDLERS ===
    async handleClanGigApprovedMemberNotification(eventData) {
        try {
            const { gigId, gigTitle, clanId, clanName, memberId, memberRole, gigOwnerId, applicationId, milestoneCount, totalAmount, assignedAt } = eventData;

            // Notify individual clan member about gig approval
            await this.createAndSendNotification({
                userId: memberId,
                type: 'ENGAGEMENT',
                category: 'CLAN_GIG',
                title: '🎉 Clan Gig Approved!',
                message: `Your clan's application for "${gigTitle}" has been approved! You'll be working on ${milestoneCount} milestone(s) worth ₹${totalAmount}.`,
                metadata: { gigId, gigTitle, clanId, clanName, memberRole, applicationId, milestoneCount, totalAmount, assignedAt }
            });

            logger.notification('Clan gig approved member notification sent', { gigId, clanId, memberId, gigTitle });
        } catch (error) {
            logger.error('Error handling clan gig approved member notification:', error);
        }
    }

    async handleClanGigApproved(eventData) {
        try {
            const { gigId, gigTitle, clanId, gigOwnerId, applicationId, memberCount, milestoneCount, totalAmount, assignedAt } = eventData;

            // This is a general event for analytics/dashboards
            // Individual member notifications are handled by handleClanGigApprovedMemberNotification
            console.log('🎯 [Notification Service] Clan gig approved event received:', {
                gigId, gigTitle, clanId, memberCount, milestoneCount, totalAmount
            });

            logger.notification('Clan gig approved general event processed', { gigId, clanId, gigTitle });
        } catch (error) {
            logger.error('Error handling clan gig approved event:', error);
        }
    }

    async handleClanMilestoneCreatedMemberNotification(eventData) {
        try {
            const { gigId, gigTitle, milestoneId, milestoneTitle, milestoneAmount, clanId, memberId, memberRole, dueAt, deliverables, createdAt } = eventData;

            // Notify clan member about new milestone
            await this.createAndSendNotification({
                userId: memberId,
                type: 'ENGAGEMENT',
                category: 'CLAN_MILESTONE',
                title: '📅 New Milestone Created',
                message: `A new milestone "${milestoneTitle}" has been created for gig "${gigTitle}". Due: ${new Date(dueAt).toLocaleDateString()}.`,
                metadata: { gigId, gigTitle, milestoneId, milestoneTitle, milestoneAmount, clanId, memberRole, dueAt, deliverables, createdAt }
            });

            logger.notification('Clan milestone created member notification sent', { gigId, milestoneId, memberId, gigTitle });
        } catch (error) {
            logger.error('Error handling clan milestone created member notification:', error);
        }
    }

    async handleClanMilestoneApprovedMemberNotification(eventData) {
        try {
            const { gigId, gigTitle, milestoneId, milestoneTitle, milestoneAmount, clanId, memberId, memberRole, approvedAt, feedback, payoutSplit, createdAt } = eventData;

            // Notify clan member about milestone approval
            await this.createAndSendNotification({
                userId: memberId,
                type: 'ENGAGEMENT',
                category: 'CLAN_MILESTONE',
                title: '✅ Milestone Approved!',
                message: `Milestone "${milestoneTitle}" for gig "${gigTitle}" has been approved! Payment of ₹${milestoneAmount} is being processed.`,
                metadata: { gigId, gigTitle, milestoneId, milestoneTitle, milestoneAmount, clanId, memberRole, approvedAt, feedback, payoutSplit, createdAt }
            });

            logger.notification('Clan milestone approved member notification sent', { gigId, milestoneId, memberId, gigTitle });
        } catch (error) {
            logger.error('Error handling clan milestone approved member notification:', error);
        }
    }

    async handleClanTaskAssignedMemberNotification(eventData) {
        try {
            const { gigId, gigTitle, taskId, taskTitle, taskDescription, clanId, memberId, memberRole, estimatedHours, deliverables, dueDate, milestoneId, createdAt } = eventData;

            // Notify clan member about task assignment
            await this.createAndSendNotification({
                userId: memberId,
                type: 'ENGAGEMENT',
                category: 'CLAN_TASK',
                title: '📝 New Task Assigned',
                message: `You've been assigned task "${taskTitle}" for gig "${gigTitle}". Estimated time: ${estimatedHours} hours.`,
                metadata: { gigId, gigTitle, taskId, taskTitle, taskDescription, clanId, memberRole, estimatedHours, deliverables, dueDate, milestoneId, createdAt }
            });

            logger.notification('Clan task assigned member notification sent', { gigId, taskId, memberId, gigTitle });
        } catch (error) {
            logger.error('Error handling clan task assigned member notification:', error);
        }
    }

    async handleClanTaskStatusUpdatedMemberNotification(eventData) {
        try {
            const { gigId, gigTitle, taskId, taskTitle, oldStatus, newStatus, clanId, memberId, memberRole, updatedAt } = eventData;

            // Notify clan member about task status change
            await this.createAndSendNotification({
                userId: memberId,
                type: 'ENGAGEMENT',
                category: 'CLAN_TASK',
                title: '🔄 Task Status Updated',
                message: `Task "${taskTitle}" for gig "${gigTitle}" status changed from ${oldStatus} to ${newStatus}.`,
                metadata: { gigId, gigTitle, taskId, taskTitle, oldStatus, newStatus, clanId, memberRole, updatedAt }
            });

            logger.notification('Clan task status updated member notification sent', { gigId, taskId, memberId, gigTitle, oldStatus, newStatus });
        } catch (error) {
            logger.error('Error handling clan task status updated member notification:', error);
        }
    }

    // === WORK SUBMISSION EVENT HANDLERS ===
    async handleWorkSubmitted(eventData) {
        try {
            console.log('📋 [Notification Service] Handling work_submitted event:', eventData);

            const { gigId, gigTitle, recipientId, submittedById, submissionTitle } = eventData;

            // Notify brand about work submission
            await this.createAndSendNotification({
                userId: recipientId,
                type: 'ENGAGEMENT',
                category: 'GIG',
                title: '📋 Work Submitted!',
                message: `Work has been submitted for your gig "${gigTitle}" - "${submissionTitle}". Review the submission now.`,
                metadata: { gigId, submittedById, submissionTitle, eventType: 'work.submitted' }
            });

            // This is handled in work history service - just log for now
            console.log('✅ [Notification Service] Work submitted event logged for work history service');
            logger.notification('Work submitted event processed for work history', { gigId, submittedById, submissionId });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling work submitted event:', error);
            logger.error('Error handling work submitted event:', error);
        }
    }

    async handleWorkSubmittedNotification(eventData) {
        try {
            console.log('📨 [Notification Service] Handling work_submitted_notification event:', eventData);

            const { gigId, gigTitle, recipientId, submittedById, submissionTitle } = eventData;

            // Notify brand about work submission
            await this.createAndSendNotification({
                userId: recipientId,
                type: 'ENGAGEMENT',
                category: 'GIG',
                title: '📋 Work Submitted!',
                message: `Work has been submitted for your gig "${gigTitle}" - "${submissionTitle}". Review the submission now.`,
                metadata: { gigId, submittedById, submissionTitle, eventType: 'work.submitted' }
            });

            console.log('✅ [Notification Service] Work submitted notification processed successfully');
            logger.notification('Work submitted notification sent', { gigId, recipientId, submittedById });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling work submitted notification:', error);
            logger.error('Error handling work submitted notification:', error);
        }
    }

    async handleSubmissionReviewed(eventData) {
        try {
            console.log('⭐ [Notification Service] Handling submission_reviewed event:', eventData);

            const { gigId, submissionId, applicantId, status } = eventData;

            // This is handled in reputation/work history services - just log for now
            console.log('✅ [Notification Service] Submission reviewed event logged for other services');
            logger.notification('Submission reviewed event processed', { gigId, submissionId, applicantId, status });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling submission reviewed event:', error);
            logger.error('Error handling submission reviewed event:', error);
        }
    }

    async handleSubmissionReviewedNotification(eventData) {
        try {
            console.log('📨 [Notification Service] Handling submission_reviewed_notification event:', eventData);

            const { gigId, gigTitle, recipientId, reviewStatus, rating, feedback } = eventData;

            // Notify applicant about submission review
            let title, message;
            switch (reviewStatus) {
                case 'APPROVED':
                    title = '🎉 Submission Approved!';
                    message = `Great work! Your submission for "${gigTitle}" has been approved${rating ? ` with ${rating}/5 stars` : ''}.`;
                    break;
                case 'REJECTED':
                    title = '❌ Submission Needs Work';
                    message = `Your submission for "${gigTitle}" needs revision. ${feedback ? `Feedback: ${feedback}` : 'Please check the feedback and resubmit.'}`;
                    break;
                case 'REVISION':
                    title = '🔄 Revision Requested';
                    message = `Please make some changes to your submission for "${gigTitle}". ${feedback ? `Feedback: ${feedback}` : ''}`;
                    break;
                default:
                    title = '📋 Submission Reviewed';
                    message = `Your submission for "${gigTitle}" has been reviewed.`;
            }

            await this.createAndSendNotification({
                userId: recipientId,
                type: 'ENGAGEMENT',
                category: 'GIG',
                title,
                message,
                metadata: { gigId, reviewStatus, rating, feedback, eventType: 'submission.reviewed' }
            });

            console.log('✅ [Notification Service] Submission reviewed notification processed successfully');
            logger.notification('Submission reviewed notification sent', { gigId, recipientId, reviewStatus });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling submission reviewed notification:', error);
            logger.error('Error handling submission reviewed notification:', error);
        }
    }

    async handleApplicationConfirmed(eventData) {
        try {
            console.log('✅ [Notification Service] Handling application_confirmed event:', eventData);

            const { gigId, gigTitle, applicantId, gigOwnerId, applicantName } = eventData;

            // Notify applicant that their application was confirmed
            await this.createAndSendNotification({
                userId: applicantId,
                type: 'ENGAGEMENT',
                category: 'GIG',
                title: '✅ Application Submitted!',
                message: `Your application for "${gigTitle}" has been submitted successfully. We'll notify you when the brand responds.`,
                metadata: { gigId, eventType: 'application.confirmed' }
            });

            // BACKUP NOTIFICATION SYSTEM: Create brand notification if primary notification system failed
            // This acts as a fallback when application_submitted/new_application_received events don't reach notification service
            if (gigOwnerId) {
                try {
                    // Check if brand notification was already created in last 15 seconds to avoid duplicates
                    const fifteenSecondsAgo = new Date(Date.now() - 15000);
                    const existingNotification = await prisma.notification.findFirst({
                        where: {
                            userId: gigOwnerId,
                            metadata: {
                                path: ['gigId'],
                                equals: gigId
                            },
                            title: {
                                contains: 'New Gig Application'
                            },
                            createdAt: {
                                gte: fifteenSecondsAgo
                            }
                        }
                    });

                    if (!existingNotification) {
                        console.log('🚨 [Notification Service] Creating backup brand notification - primary notification may have failed');

                        // Fetch applicant name if not provided
                        let finalApplicantName = applicantName;
                        if (!finalApplicantName && applicantId) {
                            try {
                                const axios = require('axios');
                                const response = await axios.get(`${process.env.GIG_SERVICE_URL}/internal/users/${applicantId}`, {
                                    timeout: 3000,
                                    headers: { 'x-internal': 'true' }
                                });
                                if (response.data?.data) {
                                    const userData = response.data.data;
                                    finalApplicantName = userData.firstName && userData.lastName ?
                                        `${userData.firstName} ${userData.lastName}` :
                                        userData.username || 'A user';
                                }
                            } catch (error) {
                                console.warn('⚠️ [Notification Service] Could not fetch applicant data for backup notification:', error.message);
                                finalApplicantName = 'A user';
                            }
                        }

                        // Create backup brand notification
                        await this.createAndSendNotification({
                            userId: gigOwnerId,
                            type: 'GIG',
                            category: 'GIG',
                            title: '📋 New Gig Application!',
                            message: `${finalApplicantName || 'A user'} has applied for your gig "${gigTitle}". Review their application now.`,
                            metadata: { gigId, applicantId, eventType: 'application.received.backup' }
                        });

                        console.log('✅ [Notification Service] Backup brand notification created successfully');
                        logger.notification('Backup brand notification sent', { gigId, gigOwnerId, applicantId });
                    } else {
                        console.log('ℹ️ [Notification Service] Brand notification already exists, skipping backup creation');
                    }
                } catch (backupError) {
                    console.error('❌ [Notification Service] Error creating backup brand notification:', backupError);
                    logger.error('Error creating backup brand notification:', backupError);
                }
            } else {
                console.log('⚠️ [Notification Service] No gigOwnerId provided, cannot create backup brand notification');
            }

            console.log('✅ [Notification Service] Application confirmed notification processed successfully');
            logger.notification('Application confirmed notification sent', { gigId, applicantId });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling application confirmed notification:', error);
            logger.error('Error handling application confirmed notification:', error);
        }
    }

    async handleNewApplicationReceived(eventData) {
        try {
            const { gigId, applicantId, gigOwnerId, gigTitle, applicantName } = eventData;

            // Notify gig owner about new application
            await this.createAndSendNotification({
                userId: gigOwnerId,
                type: 'GIG',
                category: 'GIG',
                title: '📋 New Gig Application!',
                message: `${applicantName} has applied for your gig "${gigTitle}". Review their application now.`,
                metadata: { gigId, applicantId }
            });

            // Send email to gig owner
            if (eventData.ownerEmail) {
                await this.emailService.sendEmail({
                    to: eventData.ownerEmail,
                    templateName: 'gig-applied',
                    templateData: {
                        ownerName: eventData.ownerName || 'Brand',
                        gigTitle: gigTitle,
                        applicantName: applicantName,
                        applicationDate: new Date().toLocaleDateString()
                    }
                });
            }

            logger.notification('Gig application notification sent to owner', { gigId, applicantId, gigOwnerId });
        } catch (error) {
            logger.error('Error handling gig applied notification:', error);
        }
    }

    async handleApplicationWithdrawn(eventData) {
        try {
            console.log('👋 [Notification Service] Handling application_withdrawn event:', eventData);

            const { gigId, applicantId } = eventData;

            // This is handled in work history service - just log for now
            console.log('✅ [Notification Service] Application withdrawn event logged for work history service');
            logger.notification('Application withdrawn event processed', { gigId, applicantId });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling application withdrawn event:', error);
            logger.error('Error handling application withdrawn event:', error);
        }
    }

    async handleApplicationWithdrawnNotification(eventData) {
        try {
            console.log('📨 [Notification Service] Handling application_withdrawn_notification event:', eventData);

            const { gigId, gigTitle, recipientId, applicantId, applicantName } = eventData;

            // Get final applicant name
            let finalApplicantName = applicantName;
            if (!finalApplicantName && applicantId) {
                try {
                    const axios = require('axios');
                    const response = await axios.get(`${process.env.GIG_SERVICE_URL}/internal/users/${applicantId}`, {
                        timeout: 3000,
                        headers: { 'x-internal': 'true' }
                    });
                    if (response.data?.data) {
                        const userData = response.data.data;
                        finalApplicantName = userData.firstName && userData.lastName ?
                            `${userData.firstName} ${userData.lastName}` :
                            userData.username || 'An applicant';
                    }
                } catch (error) {
                    console.warn('⚠️ [Notification Service] Could not fetch applicant data:', error.message);
                    finalApplicantName = 'An applicant';
                }
            }

            // Notify brand about application withdrawal
            await this.createAndSendNotification({
                userId: recipientId,
                type: 'ENGAGEMENT',
                category: 'GIG',
                title: '👋 Application Withdrawn',
                message: `${finalApplicantName || 'An applicant'} has withdrawn their application for "${gigTitle}".`,
                metadata: { gigId, eventType: 'application.withdrawn' }
            });

            console.log('✅ [Notification Service] Application withdrawn notification processed successfully');
            logger.notification('Application withdrawn notification sent', { gigId, recipientId });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling application withdrawn notification:', error);
            logger.error('Error handling application withdrawn notification:', error);
        }
    }

    async handleApplicationApprovedNotification(eventData) {
        try {
            console.log('🎉 [Notification Service] Handling application_approved_notification event:', eventData);

            const { gigId, gigTitle, recipientId, applicationId } = eventData;

            // Notify applicant that their application was approved
            await this.createAndSendNotification({
                userId: recipientId,
                type: 'ENGAGEMENT',
                category: 'GIG',
                title: '🎉 Application Approved!',
                message: `Great news! Your application for "${gigTitle}" has been approved. You can now start working on it!`,
                metadata: { gigId, applicationId, eventType: 'application.approved' }
            });

            console.log('✅ [Notification Service] Application approved notification processed successfully');
            logger.notification('Application approved notification sent', { gigId, recipientId, applicationId });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling application approved notification:', error);
            logger.error('Error handling application approved notification:', error);
        }
    }

    async handleWorkSubmissionConfirmed(eventData) {
        try {
            console.log('✅ [Notification Service] Handling work_submission_confirmed event:', eventData);

            const { gigId, gigTitle, recipientId, submissionTitle } = eventData;

            // Notify applicant that their work submission was confirmed
            await this.createAndSendNotification({
                userId: recipientId,
                type: 'ENGAGEMENT',
                category: 'GIG',
                title: '✅ Work Submitted Successfully!',
                message: `Your work "${submissionTitle}" for gig "${gigTitle}" has been submitted successfully. The brand will review it soon.`,
                metadata: { gigId, submissionTitle, eventType: 'work.submission.confirmed' }
            });

            console.log('✅ [Notification Service] Work submission confirmed notification processed successfully');
            logger.notification('Work submission confirmed notification sent', { gigId, recipientId });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling work submission confirmed notification:', error);
            logger.error('Error handling work submission confirmed notification:', error);
        }
    }

    // === GIG INVITATION EVENT HANDLERS ===
    async handleGigInvitationSent(eventData) {
        try {
            console.log('📨 [Notification Service] Handling gig_invitation_sent event:', eventData);
            const { gigId, gigTitle, invitedUserId, invitedByOwnerId, applicationId, quotedPrice, message } = eventData;
            logger.notification('Gig invitation sent event processed', { gigId, invitedUserId, invitedByOwnerId });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling gig invitation sent:', error);
            logger.error('Error handling gig invitation sent:', error);
        }
    }

    async handleGigInvitationNotification(eventData) {
        try {
            console.log('📨 [Notification Service] Handling gig_invitation_notification event:', eventData);
            const { gigId, gigTitle, recipientId, invitedByOwnerId, applicationId, message } = eventData;

            // Notify the invited user
            await this.createAndSendNotification({
                userId: recipientId,
                type: 'ENGAGEMENT',
                category: 'GIG',
                title: '📨 Gig Invitation Received!',
                message: message || `You have been invited to work on "${gigTitle}". Please review and respond to the invitation.`,
                metadata: { gigId, gigTitle, applicationId, invitedByOwnerId, isInvitation: true }
            });

            console.log('✅ [Notification Service] Gig invitation notification processed successfully');
            logger.notification('Gig invitation notification sent', { gigId, recipientId, invitedByOwnerId });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling gig invitation notification:', error);
            logger.error('Error handling gig invitation notification:', error);
        }
    }

    async handleGigInvitationAccepted(eventData) {
        try {
            console.log('🎉 [Notification Service] Handling gig_invitation_accepted event:', eventData);
            const { gigId, gigTitle, acceptedByUserId, gigOwnerId, applicationId } = eventData;
            logger.notification('Gig invitation accepted event processed', { gigId, acceptedByUserId, gigOwnerId });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling gig invitation accepted:', error);
            logger.error('Error handling gig invitation accepted:', error);
        }
    }

    async handleGigInvitationAcceptedNotification(eventData) {
        try {
            console.log('🎉 [Notification Service] Handling gig_invitation_accepted_notification event:', eventData);
            const { gigId, gigTitle, recipientId, acceptedByUserId, applicationId, message } = eventData;

            // Notify the gig owner that their invitation was accepted
            await this.createAndSendNotification({
                userId: recipientId,
                type: 'ENGAGEMENT',
                category: 'GIG',
                title: '🎉 Invitation Accepted!',
                message: message || `Your gig invitation for "${gigTitle}" has been accepted! The work can now begin.`,
                metadata: { gigId, gigTitle, applicationId, acceptedByUserId, invitationAccepted: true }
            });

            console.log('✅ [Notification Service] Gig invitation accepted notification processed successfully');
            logger.notification('Gig invitation accepted notification sent', { gigId, recipientId, acceptedByUserId });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling gig invitation accepted notification:', error);
            logger.error('Error handling gig invitation accepted notification:', error);
        }
    }

    async handleGigInvitationRejected(eventData) {
        try {
            console.log('❌ [Notification Service] Handling gig_invitation_rejected event:', eventData);
            const { gigId, gigTitle, rejectedByUserId, gigOwnerId, applicationId, reason } = eventData;
            logger.notification('Gig invitation rejected event processed', { gigId, rejectedByUserId, gigOwnerId, reason });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling gig invitation rejected:', error);
            logger.error('Error handling gig invitation rejected:', error);
        }
    }

    async handleGigInvitationRejectedNotification(eventData) {
        try {
            console.log('❌ [Notification Service] Handling gig_invitation_rejected_notification event:', eventData);
            const { gigId, gigTitle, recipientId, rejectedByUserId, applicationId, reason, message } = eventData;

            // Notify the gig owner that their invitation was rejected
            await this.createAndSendNotification({
                userId: recipientId,
                type: 'ENGAGEMENT',
                category: 'GIG',
                title: '❌ Invitation Declined',
                message: message || `Your gig invitation for "${gigTitle}" has been declined.${reason ? ` Reason: ${reason}` : ''}`,
                metadata: { gigId, gigTitle, applicationId, rejectedByUserId, reason, invitationRejected: true }
            });

            console.log('✅ [Notification Service] Gig invitation rejected notification processed successfully');
            logger.notification('Gig invitation rejected notification sent', { gigId, recipientId, rejectedByUserId });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling gig invitation rejected notification:', error);
            logger.error('Error handling gig invitation rejected notification:', error);
        }
    }

    async handleClanGigInvitationAcceptedMemberNotification(eventData) {
        try {
            console.log('🎉 [Notification Service] Handling clan_gig_invitation_accepted_member_notification event:', eventData);
            const { gigId, gigTitle, clanId, memberId, applicationId } = eventData;

            // Notify clan member about accepted invitation
            await this.createAndSendNotification({
                userId: memberId,
                type: 'ENGAGEMENT',
                category: 'CLAN',
                title: '🎉 Clan Invitation Accepted!',
                message: `Your clan has accepted an invitation for "${gigTitle}". Get ready to collaborate!`,
                metadata: { gigId, gigTitle, clanId, applicationId, clanInvitationAccepted: true }
            });

            console.log('✅ [Notification Service] Clan gig invitation accepted member notification processed successfully');
            logger.notification('Clan gig invitation accepted member notification sent', { gigId, clanId, memberId });
        } catch (error) {
            console.error('❌ [Notification Service] Error handling clan gig invitation accepted member notification:', error);
            logger.error('Error handling clan gig invitation accepted member notification:', error);
        }
    }

    // === HELPER METHODS ===
    async createAndSendNotification(notificationData) {
        try {
            console.log('📝 [Notification Service] Creating notification:', {
                userId: notificationData.userId,
                type: notificationData.type || 'ENGAGEMENT',
                category: notificationData.category,
                title: notificationData.title,
                message: notificationData.message,
                metadata: notificationData.metadata || {}
            });

            // Save to database
            const notification = await prisma.notification.create({
                data: {
                    userId: notificationData.userId,
                    type: notificationData.type || 'SYSTEM',
                    title: notificationData.title,
                    message: notificationData.message,
                    metadata: notificationData.metadata || {},
                    status: 'SENT',
                    priority: notificationData.priority || 1
                }
            });

            console.log('✅ [Notification Service] Successfully created notification:', {
                id: notification.id,
                userId: notification.userId,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                createdAt: notification.createdAt
            });

            // Send real-time notification via WebSocket
            try {
                const wsPayload = {
                    id: notification.id,
                    type: notification.type,
                    status: notification.status,
                    title: notification.title,
                    message: notification.message,
                    metadata: notification.metadata,
                    read: notification.read,
                    priority: notification.priority,
                    createdAt: notification.createdAt
                };

                console.log('📤 [Notification Service] Sending WebSocket notification:', {
                    userId: notificationData.userId,
                    title: wsPayload.title,
                    message: wsPayload.message,
                    type: wsPayload.type
                });

                const sent = this.webSocketService.sendNotification(notificationData.userId, wsPayload);

                if (sent) {
                    console.log('📤 [Notification Service] Real-time notification sent via WebSocket');
                    logger.info(`📤 Real-time notification sent to user: ${notificationData.userId}`);
                } else {
                    console.log('⚠️ [Notification Service] User not connected via WebSocket, notification saved to database only');
                }
            } catch (wsError) {
                console.error('❌ [Notification Service] WebSocket error:', wsError);
                logger.error('WebSocket error:', wsError);
                // Don't fail the notification creation if WebSocket fails
            }

            logger.info(`✅ [Notification Service] Created notification: ${notification.id}`);
            return notification;
        } catch (error) {
            console.error('❌ [Notification Service] Error creating notification:', error);
            logger.error('Error creating notification:', error);
            throw error;
        }
    }
}

module.exports = { NotificationConsumer };