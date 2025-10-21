const databaseService = require('../services/database');
const paymentService = require('../services/payment');
const externalService = require('../services/external');
const rabbitmqService = require('../utils/rabbitmq');
const Joi = require('joi');

class CreditController {
    constructor() {
        this.prisma = databaseService.getClient();
    }

    // Validation schemas
    static purchaseSchema = Joi.object({
        packageId: Joi.string().optional(),
        credits: Joi.number().integer().min(1).max(1000).required(),
        amount: Joi.number().min(1).max(50000).required(),
        paymentGateway: Joi.string().valid('razorpay', 'stripe').default('razorpay')
    });

    static boostProfileSchema = Joi.object({
        duration: Joi.number().integer().min(1).max(168).default(48) // Max 7 days
    });

    static boostGigSchema = Joi.object({
        gigId: Joi.string().required(),
        duration: Joi.number().integer().min(1).max(72).default(24) // Max 3 days
    });

    static boostClanSchema = Joi.object({
        clanId: Joi.string().required(),
        duration: Joi.number().integer().min(1).max(168).default(48) // Max 7 days
    });

    static contributeSchema = Joi.object({
        clanId: Joi.string().required(),
        amount: Joi.number().integer().min(1).max(100).required()
    });

    // Get or create user wallet
    async getOrCreateWallet(userId, ownerType = 'user') {
        let wallet = await this.prisma.creditWallet.findUnique({
            where: { ownerId: userId }
        });

        if (!wallet) {
            wallet = await this.prisma.creditWallet.create({
                data: {
                    ownerId: userId,
                    ownerType,
                    balance: 0
                }
            });
        }

        return wallet;
    }

    // Purchase Credits
    async purchaseCredits(req, res) {
        try {
            const { error, value } = CreditController.purchaseSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.details[0].message
                });
            }

            const { packageId, credits, amount, paymentGateway } = value;
            const userId = req.user.id;

            // Create payment order based on gateway
            let paymentResult;

            if (paymentGateway === 'razorpay') {
                paymentResult = await paymentService.createRazorpayOrder(amount, credits, userId, packageId);
            } else if (paymentGateway === 'stripe') {
                paymentResult = await paymentService.createStripePaymentIntent(amount, credits, userId, packageId);
            }

            if (!paymentResult.success) {
                return res.status(500).json({
                    success: false,
                    error: 'Payment gateway error',
                    details: paymentResult.error
                });
            }

            // Create payment record
            const paymentRecord = await this.prisma.paymentRecord.create({
                data: {
                    userId,
                    packageId,
                    amount,
                    credits,
                    paymentGateway,
                    gatewayOrderId: paymentResult.orderId || paymentResult.paymentIntentId,
                    status: 'PENDING',
                    paymentData: paymentResult
                }
            });

            res.json({
                success: true,
                message: 'Payment order created successfully',
                data: {
                    paymentId: paymentRecord.id,
                    gateway: paymentGateway,
                    ...paymentResult
                }
            });

        } catch (error) {
            console.error('Purchase credits error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create payment order',
                details: error.message
            });
        }
    }

    // Confirm Payment (webhook/callback)
    async confirmPayment(req, res) {
        try {
            const { paymentId, gatewayPaymentId, signature, status } = req.body;

            const paymentRecord = await this.prisma.paymentRecord.findUnique({
                where: { id: paymentId }
            });

            if (!paymentRecord) {
                return res.status(404).json({
                    success: false,
                    error: 'Payment record not found'
                });
            }

            let paymentVerified = false;

            // Verify payment based on gateway
            if (paymentRecord.paymentGateway === 'razorpay') {
                paymentVerified = await paymentService.verifyRazorpayPayment(
                    gatewayPaymentId,
                    paymentRecord.gatewayOrderId,
                    signature
                );
            } else if (paymentRecord.paymentGateway === 'stripe') {
                const verificationResult = await paymentService.verifyStripePayment(gatewayPaymentId);
                paymentVerified = verificationResult.success && verificationResult.status === 'succeeded';
            }

            if (!paymentVerified) {
                await this.prisma.paymentRecord.update({
                    where: { id: paymentId },
                    data: { status: 'FAILED' }
                });

                return res.status(400).json({
                    success: false,
                    error: 'Payment verification failed'
                });
            }

            // Use transaction to ensure consistency
            const result = await this.prisma.$transaction(async (tx) => {
                // Update payment record
                const updatedPayment = await tx.paymentRecord.update({
                    where: { id: paymentId },
                    data: {
                        status: 'COMPLETED',
                        gatewayPaymentId
                    }
                });

                // Get or create wallet
                const wallet = await this.getOrCreateWallet(paymentRecord.userId);

                // Create credit transaction
                const transaction = await tx.creditTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'PURCHASE',
                        amount: paymentRecord.credits,
                        balanceBefore: wallet.balance,
                        balanceAfter: wallet.balance + paymentRecord.credits,
                        relatedId: paymentRecord.id,
                        relatedType: 'payment',
                        description: `Purchased ${paymentRecord.credits} credits for ₹${paymentRecord.amount}`,
                        metadata: { paymentGateway: paymentRecord.paymentGateway }
                    }
                });

                // Update wallet balance
                const updatedWallet = await tx.creditWallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance: wallet.balance + paymentRecord.credits,
                        totalEarned: wallet.totalEarned + paymentRecord.credits
                    }
                });

                return { updatedPayment, transaction, updatedWallet };
            });

            res.json({
                success: true,
                message: 'Payment confirmed and credits added successfully',
                data: {
                    credits: paymentRecord.credits,
                    newBalance: result.updatedWallet.balance,
                    transactionId: result.transaction.id
                }
            });

        } catch (error) {
            console.error('Confirm payment error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to confirm payment',
                details: error.message
            });
        }
    }

    // Boost User Profile
    async boostProfile(req, res) {
        try {
            const { error, value } = CreditController.boostProfileSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.details[0].message
                });
            }

            const { duration } = value;
            const userId = req.user.id;
            const creditsCost = parseInt(process.env.PROFILE_BOOST_COST, 10) || 5;

            // Check for existing active boost
            const existingBoost = await this.prisma.boostRecord.findFirst({
                where: {
                    targetId: userId,
                    targetType: 'user',
                    boostType: 'PROFILE',
                    isActive: true,
                    endTime: { gt: new Date() }
                }
            });

            if (existingBoost) {
                return res.status(400).json({
                    success: false,
                    error: 'Profile already boosted',
                    details: `Profile boost is active until ${existingBoost.endTime}`
                });
            }

            const wallet = await this.getOrCreateWallet(userId);

            if (wallet.balance < creditsCost) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient credits',
                    details: `Need ${creditsCost} credits, current balance: ${wallet.balance}`
                });
            }

            const endTime = new Date(Date.now() + duration * 60 * 60 * 1000);

            // Use transaction for consistency
            const result = await this.prisma.$transaction(async (tx) => {
                // Create credit transaction
                const transaction = await tx.creditTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'BOOST_PROFILE',
                        amount: -creditsCost,
                        balanceBefore: wallet.balance,
                        balanceAfter: wallet.balance - creditsCost,
                        relatedId: userId,
                        relatedType: 'user',
                        description: `Profile boost for ${duration} hours`,
                        metadata: { duration, targetType: 'user' }
                    }
                });

                // Update wallet balance
                const updatedWallet = await tx.creditWallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance: wallet.balance - creditsCost,
                        totalSpent: wallet.totalSpent + creditsCost
                    }
                });

                // Create boost record
                const boost = await tx.boostRecord.create({
                    data: {
                        walletId: wallet.id,
                        boostType: 'PROFILE',
                        targetId: userId,
                        targetType: 'user',
                        creditsCost,
                        duration,
                        endTime,
                        metadata: { originalDuration: duration }
                    }
                });

                return { transaction, updatedWallet, boost };
            });

            // Apply boost to user service
            const boostResult = await externalService.boostUserProfile(userId, duration);

            if (!boostResult.success) {
                console.warn('External service boost failed:', boostResult.error);
                // Note: We don't rollback the transaction as credits were deducted
            }

            // Publish boost event to RabbitMQ
            try {
                await rabbitmqService.publishBoostEvent({
                    eventType: 'BOOST_APPLIED',
                    boostType: 'PROFILE',
                    targetId: userId,
                    targetType: 'user',
                    boostId: result.boost.id,
                    duration,
                    endTime,
                    creditsSpent: creditsCost,
                    userId,
                    timestamp: new Date().toISOString()
                });
            } catch (mqError) {
                console.error('Failed to publish boost event to RabbitMQ:', mqError);
                // Continue execution even if MQ fails
            }

            res.json({
                success: true,
                message: 'Profile boosted successfully',
                data: {
                    boostId: result.boost.id,
                    creditsSpent: creditsCost,
                    remainingBalance: result.updatedWallet.balance,
                    boostUntil: endTime,
                    externalServiceApplied: boostResult.success
                }
            });

        } catch (error) {
            console.error('Boost profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to boost profile',
                details: error.message
            });
        }
    }

    // Boost Gig
    async boostGig(req, res) {
        try {
            const { error, value } = CreditController.boostGigSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.details[0].message
                });
            }

            const { gigId, duration } = value;
            const userId = req.user.id;
            const creditsCost = parseInt(process.env.GIG_BOOST_COST, 10) || 7;

            // Check if gig exists and user owns it
            const gigResult = await externalService.getGigDetails(gigId);
            if (!gigResult.success) {
                return res.status(404).json({
                    success: false,
                    error: 'Gig not found',
                    details: gigResult.error
                });
            }

            // Verify ownership (this would depend on gig service response structure)
            // For now, we'll trust the user or add additional verification

            // Check for existing active boost
            const existingBoost = await this.prisma.boostRecord.findFirst({
                where: {
                    targetId: gigId,
                    targetType: 'gig',
                    boostType: 'GIG',
                    isActive: true,
                    endTime: { gt: new Date() }
                }
            });

            if (existingBoost) {
                return res.status(400).json({
                    success: false,
                    error: 'Gig already boosted',
                    details: `Gig boost is active until ${existingBoost.endTime}`
                });
            }

            const wallet = await this.getOrCreateWallet(userId);

            if (wallet.balance < creditsCost) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient credits',
                    details: `Need ${creditsCost} credits, current balance: ${wallet.balance}`
                });
            }

            const endTime = new Date(Date.now() + duration * 60 * 60 * 1000);

            // Use transaction for consistency
            const result = await this.prisma.$transaction(async (tx) => {
                // Create credit transaction
                const transaction = await tx.creditTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'BOOST_GIG',
                        amount: -creditsCost,
                        balanceBefore: wallet.balance,
                        balanceAfter: wallet.balance - creditsCost,
                        relatedId: gigId,
                        relatedType: 'gig',
                        description: `Gig boost for ${duration} hours`,
                        metadata: { duration, targetType: 'gig', gigId }
                    }
                });

                // Update wallet balance
                const updatedWallet = await tx.creditWallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance: wallet.balance - creditsCost,
                        totalSpent: wallet.totalSpent + creditsCost
                    }
                });

                // Create boost record
                const boost = await tx.boostRecord.create({
                    data: {
                        walletId: wallet.id,
                        boostType: 'GIG',
                        targetId: gigId,
                        targetType: 'gig',
                        creditsCost,
                        duration,
                        endTime,
                        metadata: { originalDuration: duration, gigId }
                    }
                });

                return { transaction, updatedWallet, boost };
            });

            // Apply boost to gig service
            const boostResult = await externalService.boostGig(gigId, duration);

            if (!boostResult.success) {
                console.warn('External gig service boost failed:', boostResult.error);
            }

            // Publish boost event to RabbitMQ
            try {
                await rabbitmqService.publishBoostEvent({
                    eventType: 'BOOST_APPLIED',
                    boostType: 'GIG',
                    targetId: gigId,
                    targetType: 'gig',
                    boostId: result.boost.id,
                    duration,
                    endTime,
                    creditsSpent: creditsCost,
                    userId,
                    timestamp: new Date().toISOString()
                });
            } catch (mqError) {
                console.error('Failed to publish boost event to RabbitMQ:', mqError);
                // Continue execution even if MQ fails
            }

            res.json({
                success: true,
                message: 'Gig boosted successfully',
                data: {
                    boostId: result.boost.id,
                    gigId,
                    creditsSpent: creditsCost,
                    remainingBalance: result.updatedWallet.balance,
                    boostUntil: endTime,
                    externalServiceApplied: boostResult.success
                }
            });

        } catch (error) {
            console.error('Boost gig error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to boost gig',
                details: error.message
            });
        }
    }

    // Boost Clan
    async boostClan(req, res) {
        try {
            const { error, value } = CreditController.boostClanSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.details[0].message
                });
            }

            const { clanId, duration } = value;
            const userId = req.user.id;
            const creditsCost = parseInt(process.env.CLAN_BOOST_COST, 10) || 40;

            // Check if clan exists
            const clanResult = await externalService.getClanDetails(clanId);
            if (!clanResult.success) {
                return res.status(404).json({
                    success: false,
                    error: 'Clan not found',
                    details: clanResult.error
                });
            }

            // Check for existing active boost
            const existingBoost = await this.prisma.boostRecord.findFirst({
                where: {
                    targetId: clanId,
                    targetType: 'clan',
                    boostType: 'CLAN',
                    isActive: true,
                    endTime: { gt: new Date() }
                }
            });

            if (existingBoost) {
                return res.status(400).json({
                    success: false,
                    error: 'Clan already boosted',
                    details: `Clan boost is active until ${existingBoost.endTime}`
                });
            }

            const wallet = await this.getOrCreateWallet(userId);

            if (wallet.balance < creditsCost) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient credits',
                    details: `Need ${creditsCost} credits, current balance: ${wallet.balance}`
                });
            }

            const endTime = new Date(Date.now() + duration * 60 * 60 * 1000);

            // Use transaction for consistency
            const result = await this.prisma.$transaction(async (tx) => {
                // Create credit transaction
                const transaction = await tx.creditTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'BOOST_CLAN',
                        amount: -creditsCost,
                        balanceBefore: wallet.balance,
                        balanceAfter: wallet.balance - creditsCost,
                        relatedId: clanId,
                        relatedType: 'clan',
                        description: `Clan boost for ${duration} hours`,
                        metadata: { duration, targetType: 'clan', clanId }
                    }
                });

                // Update wallet balance
                const updatedWallet = await tx.creditWallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance: wallet.balance - creditsCost,
                        totalSpent: wallet.totalSpent + creditsCost
                    }
                });

                // Create boost record
                const boost = await tx.boostRecord.create({
                    data: {
                        walletId: wallet.id,
                        boostType: 'CLAN',
                        targetId: clanId,
                        targetType: 'clan',
                        creditsCost,
                        duration,
                        endTime,
                        metadata: { originalDuration: duration, clanId }
                    }
                });

                return { transaction, updatedWallet, boost };
            });

            // Apply boost to clan service
            const boostResult = await externalService.boostClan(clanId, duration);

            if (!boostResult.success) {
                console.warn('External clan service boost failed:', boostResult.error);
            }

            // Publish boost event to RabbitMQ
            try {
                await rabbitmqService.publishBoostEvent({
                    eventType: 'BOOST_APPLIED',
                    boostType: 'CLAN',
                    targetId: clanId,
                    targetType: 'clan',
                    boostId: result.boost.id,
                    duration,
                    endTime,
                    creditsSpent: creditsCost,
                    userId,
                    timestamp: new Date().toISOString()
                });
            } catch (mqError) {
                console.error('Failed to publish boost event to RabbitMQ:', mqError);
                // Continue execution even if MQ fails
            }

            res.json({
                success: true,
                message: 'Clan boosted successfully',
                data: {
                    boostId: result.boost.id,
                    clanId,
                    creditsSpent: creditsCost,
                    remainingBalance: result.updatedWallet.balance,
                    boostUntil: endTime,
                    externalServiceApplied: boostResult.success
                }
            });

        } catch (error) {
            console.error('Boost clan error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to boost clan',
                details: error.message
            });
        }
    }

    // Contribute to Clan Pool
    async contributeToClan(req, res) {
        try {
            const { error, value } = CreditController.contributeSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.details[0].message
                });
            }

            const { clanId, amount } = value;
            const userId = req.user.id;

            // Check if clan exists
            const clanResult = await externalService.getClanDetails(clanId);
            if (!clanResult.success) {
                return res.status(404).json({
                    success: false,
                    error: 'Clan not found',
                    details: clanResult.error
                });
            }

            const wallet = await this.getOrCreateWallet(userId);

            if (wallet.balance < amount) {
                return res.status(400).json({
                    success: false,
                    error: 'Insufficient credits',
                    details: `Need ${amount} credits, current balance: ${wallet.balance}`
                });
            }

            // Use transaction for consistency
            const result = await this.prisma.$transaction(async (tx) => {
                // Get or create clan wallet
                const clanWallet = await this.getOrCreateWallet(clanId, 'clan');

                // Create debit transaction for user
                const userTransaction = await tx.creditTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'CONTRIBUTION',
                        amount: -amount,
                        balanceBefore: wallet.balance,
                        balanceAfter: wallet.balance - amount,
                        relatedId: clanId,
                        relatedType: 'clan',
                        description: `Contributed ${amount} credits to clan`,
                        metadata: { contributionType: 'clan', targetClanId: clanId }
                    }
                });

                // Update user wallet
                const updatedUserWallet = await tx.creditWallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance: wallet.balance - amount,
                        totalSpent: wallet.totalSpent + amount
                    }
                });

                // Create credit transaction for clan
                const clanTransaction = await tx.creditTransaction.create({
                    data: {
                        walletId: clanWallet.id,
                        type: 'CONTRIBUTION',
                        amount: amount,
                        balanceBefore: clanWallet.balance,
                        balanceAfter: clanWallet.balance + amount,
                        relatedId: userId,
                        relatedType: 'user',
                        description: `Contribution from user ${userId}`,
                        metadata: { contributionType: 'received', fromUserId: userId }
                    }
                });

                // Update clan wallet
                const updatedClanWallet = await tx.creditWallet.update({
                    where: { id: clanWallet.id },
                    data: {
                        balance: clanWallet.balance + amount,
                        totalEarned: clanWallet.totalEarned + amount
                    }
                });

                return { userTransaction, clanTransaction, updatedUserWallet, updatedClanWallet };
            });

            res.json({
                success: true,
                message: 'Contribution successful',
                data: {
                    contributedAmount: amount,
                    userRemainingBalance: result.updatedUserWallet.balance,
                    clanNewBalance: result.updatedClanWallet.balance,
                    transactionId: result.userTransaction.id
                }
            });

        } catch (error) {
            console.error('Contribute to clan error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to contribute to clan',
                details: error.message
            });
        }
    }

    // Get User Wallet
    async getWallet(req, res) {
        try {
            const userId = req.user.id;
            const wallet = await this.getOrCreateWallet(userId);

            // Get active boosts
            const activeBoosts = await this.prisma.boostRecord.findMany({
                where: {
                    walletId: wallet.id,
                    isActive: true,
                    endTime: { gt: new Date() }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Get recent transactions
            const recentTransactions = await this.prisma.creditTransaction.findMany({
                where: { walletId: wallet.id },
                orderBy: { createdAt: 'desc' },
                take: 10
            });

            res.json({
                success: true,
                data: {
                    wallet: {
                        id: wallet.id,
                        balance: wallet.balance,
                        totalEarned: wallet.totalEarned,
                        totalSpent: wallet.totalSpent,
                        createdAt: wallet.createdAt,
                        updatedAt: wallet.updatedAt
                    },
                    activeBoosts: activeBoosts.map(boost => ({
                        id: boost.id,
                        type: boost.boostType,
                        targetId: boost.targetId,
                        targetType: boost.targetType,
                        endTime: boost.endTime,
                        creditsSpent: boost.creditsCost
                    })),
                    recentTransactions: recentTransactions.map(tx => ({
                        id: tx.id,
                        type: tx.type,
                        amount: tx.amount,
                        description: tx.description,
                        createdAt: tx.createdAt
                    }))
                }
            });

        } catch (error) {
            console.error('Get wallet error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get wallet information',
                details: error.message
            });
        }
    }

    // Get Transaction History
    async getTransactions(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20, type } = req.query;

            const wallet = await this.getOrCreateWallet(userId);

            const where = { walletId: wallet.id };
            if (type) {
                where.type = type;
            }

            const transactions = await this.prisma.creditTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: parseInt(limit)
            });

            const totalCount = await this.prisma.creditTransaction.count({ where });

            res.json({
                success: true,
                data: {
                    transactions: transactions.map(tx => ({
                        id: tx.id,
                        type: tx.type,
                        amount: tx.amount,
                        balanceBefore: tx.balanceBefore,
                        balanceAfter: tx.balanceAfter,
                        description: tx.description,
                        relatedId: tx.relatedId,
                        relatedType: tx.relatedType,
                        status: tx.status,
                        createdAt: tx.createdAt
                    })),
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: totalCount,
                        pages: Math.ceil(totalCount / limit)
                    }
                }
            });

        } catch (error) {
            console.error('Get transactions error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get transaction history',
                details: error.message
            });
        }
    }

    // Get Credit Packages (Public)
    async getCreditPackages(req, res) {
        try {
            const packages = await this.prisma.creditPackage.findMany({
                where: { isActive: true },
                orderBy: { credits: 'asc' }
            });

            res.json({
                success: true,
                data: packages.map(pkg => ({
                    id: pkg.id,
                    name: pkg.name,
                    credits: pkg.credits,
                    price: pkg.price,
                    discount: pkg.discount,
                    description: pkg.description,
                    pricePerCredit: (pkg.price / pkg.credits).toFixed(2)
                }))
            });

        } catch (error) {
            console.error('Get credit packages error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get credit packages',
                details: error.message
            });
        }
    }

    // Get Boost Pricing (Public)
    async getBoostPricing(req, res) {
        try {
            const pricing = {
                profile: {
                    cost: parseInt(process.env.PROFILE_BOOST_COST, 10) || 5,
                    defaultDuration: parseInt(process.env.DEFAULT_BOOST_DURATION_HOURS, 10) || 48,
                    maxDuration: 168, // 7 days
                    description: "Boost your profile visibility in search results and recommendations"
                },
                gig: {
                    cost: parseInt(process.env.GIG_BOOST_COST, 10) || 7,
                    defaultDuration: 24,
                    maxDuration: 72, // 3 days
                    description: "Push your gig to the top of relevant feeds and search results"
                },
                clan: {
                    cost: parseInt(process.env.CLAN_BOOST_COST, 10) || 40,
                    defaultDuration: parseInt(process.env.DEFAULT_BOOST_DURATION_HOURS, 10) || 48,
                    maxDuration: 168, // 7 days
                    description: "Feature your clan in trending teams and boost member visibility"
                }
            };

            res.json({
                success: true,
                data: pricing
            });

        } catch (error) {
            console.error('Get boost pricing error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get boost pricing',
                details: error.message
            });
        }
    }

    // Admin: Get Statistics
    async getStatistics(req, res) {
        try {
            const [
                totalWallets,
                totalTransactions,
                activeBoosts,
                totalCreditsCirculation,
                totalRevenue
            ] = await Promise.all([
                this.prisma.creditWallet.count(),
                this.prisma.creditTransaction.count(),
                this.prisma.boostRecord.count({ where: { isActive: true, endTime: { gt: new Date() } } }),
                this.prisma.creditWallet.aggregate({ _sum: { balance: true } }),
                this.prisma.paymentRecord.aggregate({
                    _sum: { amount: true },
                    where: { status: 'COMPLETED' }
                })
            ]);

            const transactionsByType = await this.prisma.creditTransaction.groupBy({
                by: ['type'],
                _count: { type: true },
                _sum: { amount: true }
            });

            const boostsByType = await this.prisma.boostRecord.groupBy({
                by: ['boostType'],
                _count: { boostType: true },
                _sum: { creditsCost: true },
                where: { isActive: true, endTime: { gt: new Date() } }
            });

            res.json({
                success: true,
                data: {
                    overview: {
                        totalWallets,
                        totalTransactions,
                        activeBoosts,
                        totalCreditsInCirculation: totalCreditsCirculation._sum.balance || 0,
                        totalRevenue: totalRevenue._sum.amount || 0
                    },
                    transactionsByType: transactionsByType.map(item => ({
                        type: item.type,
                        count: item._count.type,
                        totalAmount: item._sum.amount || 0
                    })),
                    activeBoostsByType: boostsByType.map(item => ({
                        type: item.boostType,
                        count: item._count.boostType,
                        totalCreditsSpent: item._sum.creditsCost || 0
                    })),
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Get statistics error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get statistics',
                details: error.message
            });
        }
    }

    // Award Credits (for gig completion rewards, admin actions, etc.)
    async awardCredits(req, res) {
        try {
            const { error, value } = Joi.object({
                userId: Joi.string().required(),
                amount: Joi.number().integer().min(1).max(1000).required(),
                type: Joi.string().valid('GIG_COMPLETION', 'ADMIN_AWARD', 'REFERRAL_BONUS', 'ACHIEVEMENT', 'OTHER').required(),
                description: Joi.string().max(500).optional(),
                metadata: Joi.object().optional()
            }).validate(req.body);

            if (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: error.details[0].message
                });
            }

            const { userId, amount, type, description, metadata } = value;

            // Get or create user wallet
            const wallet = await this.getOrCreateWallet(userId);

            // Use transaction for consistency
            const result = await this.prisma.$transaction(async (tx) => {
                // Create credit transaction
                const transaction = await tx.creditTransaction.create({
                    data: {
                        walletId: wallet.id,
                        type: type,
                        amount: amount,
                        balanceBefore: wallet.balance,
                        balanceAfter: wallet.balance + amount,
                        relatedId: metadata?.gigId || metadata?.relatedId || null,
                        relatedType: metadata?.relatedType || null,
                        description: description || `Credits awarded for ${type.toLowerCase().replace('_', ' ')}`,
                        metadata: metadata || {},
                        status: 'COMPLETED'
                    }
                });

                // Update wallet balance
                const updatedWallet = await tx.creditWallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance: wallet.balance + amount,
                        totalEarned: wallet.totalEarned + amount
                    }
                });

                return { transaction, updatedWallet };
            });

            // Publish credit awarded event to RabbitMQ
            try {
                await rabbitmqService.publishCreditEvent({
                    eventType: 'CREDITS_AWARDED',
                    userId,
                    amount,
                    type,
                    description,
                    metadata,
                    newBalance: result.updatedWallet.balance,
                    timestamp: new Date().toISOString()
                });
            } catch (mqError) {
                console.error('Failed to publish credit awarded event to RabbitMQ:', mqError);
                // Continue execution even if MQ fails
            }

            res.json({
                success: true,
                message: `${amount} credits awarded successfully`,
                data: {
                    userId,
                    amount,
                    type,
                    newBalance: result.updatedWallet.balance,
                    transactionId: result.transaction.id
                }
            });

        } catch (error) {
            console.error('Award credits error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to award credits',
                details: error.message
            });
        }
    }
}

module.exports = CreditController;
