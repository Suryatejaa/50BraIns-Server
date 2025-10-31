const crypto = require('crypto');
const { prisma } = require('../config/database');
const logger = require('./logger.utils');
const { ValidationError, AuthError } = require('./errors.utils');

class OTPService {
    constructor() {
        this.otpLength = 6;
        this.otpExpiry = 10 * 60 * 1000; // 10 minutes in milliseconds
        this.maxAttempts = 3;
        this.cooldownPeriod = 15 * 60 * 1000; // 15 minutes cooldown after max attempts
    }

    /**
     * Generate a secure OTP
     * @param {number} length - Length of OTP (default: 6)
     * @returns {string} - Generated OTP
     */
    generateOTP(length = this.otpLength) {
        const digits = '0123456789';
        let otp = '';

        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, digits.length);
            otp += digits[randomIndex];
        }
        console.log('Latest OTP: ', otp);
        return otp;
    }

    /**
     * Store OTP in database
     * @param {string} email - User email
     * @param {string} otp - Generated OTP
     * @param {string} purpose - Purpose of OTP (REGISTER, LOGIN, FORGOT_PASSWORD, CHANGE_PASSWORD, EMAIL_VERIFICATION)
     * @param {string} userId - Optional user ID for existing users
     * @returns {Object} - OTP record
     */
    async storeOTP(email, otp, purpose, userId = null) {
        try {
            const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
            const expiresAt = new Date(Date.now() + this.otpExpiry);

            console.log('Storing OTP for', email, 'Purpose:', purpose, 'OTP:', otp);

            // Clean up expired OTPs for this email and purpose
            await this.cleanupExpiredOTPs(email, purpose);

            // Check if user has exceeded max attempts
            const recentAttempts = await prisma.oTPRecord.count({
                where: {
                    email: email.toLowerCase(),
                    purpose,
                    createdAt: {
                        gte: new Date(Date.now() - this.cooldownPeriod)
                    }
                }
            });

            if (recentAttempts >= this.maxAttempts) {
                throw new ValidationError(`Too many OTP requests. Please wait ${this.cooldownPeriod / 60000} minutes before requesting again.`);
            }

            // Store new OTP
            const otpRecord = await prisma.oTPRecord.create({
                data: {
                    email: email.toLowerCase(),
                    otpHash: hashedOTP,
                    purpose,
                    expiresAt,
                    userId,
                    attempts: 0,
                    isUsed: false,
                    createdAt: new Date()
                }
            });

            logger.info(`OTP stored for ${email} with purpose ${purpose}`, {
                otpId: otpRecord.id,
                expiresAt,
                userId
            });

            return otpRecord;
        } catch (error) {
            logger.error('Error storing OTP:', error);
            throw error;
        }
    }

    /**
     * Verify OTP
     * @param {string} email - User email
     * @param {string} otp - OTP to verify
     * @param {string} purpose - Purpose of OTP
     * @returns {Object} - Verification result
     */
    async verifyOTP(email, otp, purpose) {
        try {
            const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

            // Find the most recent unused OTP for this email and purpose
            const otpRecord = await prisma.oTPRecord.findFirst({
                where: {
                    email: email.toLowerCase(),
                    purpose,
                    isUsed: false,
                    expiresAt: {
                        gt: new Date()
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (!otpRecord) {
                throw new AuthError('Invalid or expired OTP');
            }

            // Check if max verification attempts exceeded
            if (otpRecord.attempts >= this.maxAttempts) {
                await this.markOTPAsUsed(otpRecord.id);
                throw new AuthError('OTP verification attempts exceeded. Please request a new OTP.');
            }

            // Increment attempt count
            await prisma.oTPRecord.update({
                where: { id: otpRecord.id },
                data: { attempts: otpRecord.attempts + 1 }
            });

            // Verify OTP hash
            if (otpRecord.otpHash !== hashedOTP) {
                throw new AuthError('Invalid OTP');
            }

            // Mark OTP as used
            await this.markOTPAsUsed(otpRecord.id);

            logger.info(`OTP verified successfully for ${email} with purpose ${purpose}`, {
                otpId: otpRecord.id,
                userId: otpRecord.userId
            });

            return {
                success: true,
                userId: otpRecord.userId,
                otpRecord
            };
        } catch (error) {
            logger.error('Error verifying OTP:', error);
            throw error;
        }
    }

    /**
     * Mark OTP as used
     * @param {string} otpId - OTP record ID
     */
    async markOTPAsUsed(otpId) {
        try {
            await prisma.oTPRecord.update({
                where: { id: otpId },
                data: {
                    isUsed: true,
                    usedAt: new Date()
                }
            });
        } catch (error) {
            logger.error('Error marking OTP as used:', error);
            throw error;
        }
    }

    /**
     * Clean up expired OTPs
     * @param {string} email - User email (optional)
     * @param {string} purpose - OTP purpose (optional)
     */
    async cleanupExpiredOTPs(email = null, purpose = null) {
        try {
            const whereClause = {
                OR: [
                    { expiresAt: { lt: new Date() } },
                    { isUsed: true }
                ]
            };

            if (email) {
                whereClause.email = email.toLowerCase();
            }

            if (purpose) {
                whereClause.purpose = purpose;
            }

            const result = await prisma.oTPRecord.deleteMany({
                where: whereClause
            });

            logger.info(`Cleaned up ${result.count} expired/used OTP records`);
            return result.count;
        } catch (error) {
            logger.error('Error cleaning up expired OTPs:', error);
            throw error;
        }
    }

    /**
     * Get OTP statistics for monitoring
     * @param {string} email - User email
     * @returns {Object} - OTP statistics
     */
    async getOTPStats(email) {
        try {
            const stats = await prisma.oTPRecord.groupBy({
                by: ['purpose'],
                where: {
                    email: email.toLowerCase(),
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                    }
                },
                _count: {
                    id: true
                }
            });

            return stats.reduce((acc, stat) => {
                acc[stat.purpose] = stat._count.id;
                return acc;
            }, {});
        } catch (error) {
            logger.error('Error getting OTP stats:', error);
            return {};
        }
    }

    /**
     * Check if user can request new OTP
     * @param {string} email - User email
     * @param {string} purpose - OTP purpose
     * @returns {Object} - Availability status
     */
    async canRequestOTP(email, purpose) {
        try {
            const recentRequests = await prisma.oTPRecord.count({
                where: {
                    email: email.toLowerCase(),
                    purpose,
                    createdAt: {
                        gte: new Date(Date.now() - this.cooldownPeriod)
                    }
                }
            });

            const canRequest = recentRequests < this.maxAttempts;
            const nextRequestTime = canRequest ? null : new Date(Date.now() + this.cooldownPeriod);

            return {
                canRequest,
                remainingAttempts: Math.max(0, this.maxAttempts - recentRequests),
                nextRequestTime,
                cooldownMinutes: this.cooldownPeriod / 60000
            };
        } catch (error) {
            logger.error('Error checking OTP request availability:', error);
            return {
                canRequest: false,
                remainingAttempts: 0,
                nextRequestTime: new Date(Date.now() + this.cooldownPeriod),
                cooldownMinutes: this.cooldownPeriod / 60000
            };
        }
    }

    /**
     * Invalidate all OTPs for a user
     * @param {string} email - User email
     * @param {string} purpose - OTP purpose (optional)
     */
    async invalidateOTPs(email, purpose = null) {
        try {
            const whereClause = {
                email: email.toLowerCase(),
                isUsed: false
            };

            if (purpose) {
                whereClause.purpose = purpose;
            }

            const result = await prisma.oTPRecord.updateMany({
                where: whereClause,
                data: {
                    isUsed: true,
                    usedAt: new Date()
                }
            });

            logger.info(`Invalidated ${result.count} OTP records for ${email}${purpose ? ` with purpose ${purpose}` : ''}`);
            return result.count;
        } catch (error) {
            logger.error('Error invalidating OTPs:', error);
            throw error;
        }
    }

    /**
     * Schedule cleanup job (to be called periodically)
     */
    async scheduledCleanup() {
        try {
            const cleanedCount = await this.cleanupExpiredOTPs();
            logger.info(`Scheduled cleanup completed: ${cleanedCount} records cleaned`);
            return cleanedCount;
        } catch (error) {
            logger.error('Error in scheduled cleanup:', error);
            return 0;
        }
    }
}

module.exports = new OTPService();