const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class EmailService {
    constructor() {
        this.transporter = null;
        this.templates = new Map();
        this.initialized = false;
    }

    async initialize() {
        try {
            logger.email('Initializing email service');

            // Create transporter
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                pool: true,
                maxConnections: 5,
                maxMessages: 10,
                rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR) || 1000
            });

            // Verify transporter
            if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true') {
                await this.transporter.verify();
                logger.email('SMTP connection verified');
            } else {
                logger.email('Email notifications disabled');
            }

            // Load email templates
            await this.loadTemplates();

            this.initialized = true;
            logger.email('Email service initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize email service:', error);

            // Don't throw error, just log it so the service can still start
            this.initialized = false;
        }
    }

    async loadTemplates() {
        try {
            const templatePath = path.join(__dirname, '../mailers/templates');

            // Check if templates directory exists
            try {
                await fs.access(templatePath);
            } catch (error) {
                logger.warn('Templates directory not found, creating it');
                await fs.mkdir(templatePath, { recursive: true });
                await this.createDefaultTemplates(templatePath);
            }

            const templateFiles = await fs.readdir(templatePath);

            for (const file of templateFiles) {
                if (file.endsWith('.hbs') || file.endsWith('.handlebars')) {
                    const templateName = path.basename(file, path.extname(file));
                    const templateContent = await fs.readFile(path.join(templatePath, file), 'utf8');

                    this.templates.set(templateName, handlebars.compile(templateContent));
                    logger.email('Loaded template', { templateName });
                }
            }

            logger.email('All email templates loaded', { count: this.templates.size });

        } catch (error) {
            logger.error('Failed to load email templates:', error);
        }
    }

    async createDefaultTemplates(templatePath) {
        const templates = {
            'gig-applied': {
                subject: '🎯 You Applied for a Gig!',
                content: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4f46e5;">Great news, {{userName}}! 🎯</h2>
                    <p>You've successfully applied for the gig:</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin: 0; color: #1f2937;">{{gigTitle}}</h3>
                        <p style="margin: 10px 0 0 0; color: #6b7280;">{{gigDescription}}</p>
                        <p style="margin: 10px 0 0 0;"><strong>Budget:</strong> {{gigBudget}}</p>
                    </div>
                    <p>The brand will review your application and get back to you soon!</p>
                    <a href="{{gigUrl}}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">View Gig Details</a>
                    <p style="color: #6b7280; font-size: 14px;">Thanks for being part of 50BraIns! 🧠</p>
                </div>`
            },
            'clan-invited': {
                subject: '🏆 You\'re Invited to Join a Clan!',
                content: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #059669;">You've been invited to join {{clanName}}! 🏆</h2>
                    <p>Hello {{userName}},</p>
                    <p>{{inviterName}} has invited you to join their clan on 50BraIns!</p>
                    <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
                        <h3 style="margin: 0; color: #0c4a6e;">{{clanName}}</h3>
                        <p style="margin: 10px 0 0 0; color: #075985;">{{clanDescription}}</p>
                        <p style="margin: 10px 0 0 0;"><strong>Members:</strong> {{memberCount}} | <strong>Rank:</strong> #{{clanRank}}</p>
                    </div>
                    <p>Join forces with other creators and grow together!</p>
                    <a href="{{clanUrl}}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Accept Invitation</a>
                </div>`
            },
            'credits-purchased': {
                subject: '💰 Credits Added to Your Wallet!',
                content: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc2626;">Your credits are ready! 💰</h2>
                    <p>Hi {{userName}},</p>
                    <p>Your credit purchase was successful!</p>
                    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #fecaca;">
                        <h3 style="margin: 0; color: #991b1b;">Transaction Details</h3>
                        <p style="margin: 10px 0;"><strong>Credits Added:</strong> {{creditsAmount}}</p>
                        <p style="margin: 10px 0;"><strong>Total Balance:</strong> {{totalBalance}}</p>
                        <p style="margin: 10px 0;"><strong>Transaction ID:</strong> {{transactionId}}</p>
                    </div>
                    <p>Start boosting your profile or explore premium features!</p>
                    <a href="{{walletUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">View Wallet</a>
                </div>`
            },
            'boost-expiring': {
                subject: '⚡ Your Boost is Expiring Soon!',
                content: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f59e0b;">⚡ Boost Expiring Soon!</h2>
                    <p>Hi {{userName}},</p>
                    <p>Your {{boostType}} boost will expire in {{timeRemaining}}.</p>
                    <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #fed7aa;">
                        <h3 style="margin: 0; color: #92400e;">Boost Details</h3>
                        <p style="margin: 10px 0;"><strong>Type:</strong> {{boostType}}</p>
                        <p style="margin: 10px 0;"><strong>Expires:</strong> {{expiryDate}}</p>
                        <p style="margin: 10px 0;"><strong>Benefits:</strong> {{boostBenefits}}</p>
                    </div>
                    <p>Renew now to keep the momentum going!</p>
                    <a href="{{renewUrl}}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Renew Boost</a>
                </div>`
            },
            'welcome': {
                subject: '🎉 Welcome to 50BraIns!',
                content: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #4f46e5; text-align: center;">Welcome to 50BraIns! 🧠</h1>
                    <p>Hello {{userName}},</p>
                    <p>We're thrilled to have you join our community of creative minds!</p>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #1e293b;">Get Started:</h3>
                        <ul style="color: #475569;">
                            <li>Complete your profile to attract better opportunities</li>
                            <li>Browse and apply for exciting gigs</li>
                            <li>Join or create a clan to collaborate with others</li>
                            <li>Build your reputation through quality work</li>
                        </ul>
                    </div>
                    <a href="{{profileUrl}}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Complete Your Profile</a>
                    <p style="color: #6b7280; font-size: 14px;">Ready to unleash your creative potential? Let's go! 🚀</p>
                </div>`
            }
        };

        for (const [name, template] of Object.entries(templates)) {
            await fs.writeFile(
                path.join(templatePath, `${name}.hbs`),
                template.content
            );
        }

        logger.email('Created default email templates');
    }

    async sendEmail(options) {
        try {
            if (process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'true') {
                logger.email('Email notifications disabled, skipping send');
                return { success: true, skipped: true };
            }

            if (!this.initialized || !this.transporter) {
                throw new Error('Email service not initialized');
            }

            const {
                to,
                subject,
                templateName,
                templateData = {},
                html,
                text,
                priority = 'normal'
            } = options;

            let htmlContent = html;
            let textContent = text;

            // Use template if provided
            if (templateName && this.templates.has(templateName)) {
                const template = this.templates.get(templateName);
                htmlContent = template(templateData);
            }

            const mailOptions = {
                from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
                to,
                subject,
                html: htmlContent,
                text: textContent,
                replyTo: process.env.REPLY_TO_EMAIL,
                headers: {
                    'X-Priority': priority === 'high' ? '1' : priority === 'low' ? '5' : '3',
                    'X-Service': 'notification-service'
                }
            };

            const result = await this.transporter.sendMail(mailOptions);

            logger.email('Email sent successfully', {
                to,
                subject,
                messageId: result.messageId,
                templateName
            });

            return {
                success: true,
                messageId: result.messageId,
                response: result.response
            };

        } catch (error) {
            logger.error('Failed to send email:', error);
            throw error;
        }
    }

    async sendBulkEmails(emailList, options) {
        const results = [];
        const batchSize = parseInt(process.env.NOTIFICATION_BATCH_SIZE) || 10;

        for (let i = 0; i < emailList.length; i += batchSize) {
            const batch = emailList.slice(i, i + batchSize);

            const batchPromises = batch.map(async (emailData) => {
                try {
                    const result = await this.sendEmail({
                        ...options,
                        ...emailData
                    });
                    return { ...emailData, result, success: true };
                } catch (error) {
                    logger.error('Bulk email failed for recipient:', error);
                    return { ...emailData, error: error.message, success: false };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults.map(r => r.value || r.reason));

            // Add delay between batches to respect rate limits
            if (i + batchSize < emailList.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return results;
    }

    async testConnection() {
        try {
            if (!this.initialized || !this.transporter) {
                throw new Error('Email service not initialized');
            }

            await this.transporter.verify();
            return { success: true, message: 'SMTP connection successful' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getAvailableTemplates() {
        return Array.from(this.templates.keys());
    }
}

// Export singleton instance
module.exports = new EmailService();
