const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger.utils');

class EmailService {
    constructor() {
        this.transporter = null;
        this.resend = null;
        this.provider = process.env.EMAIL_PROVIDER || 'smtp'; // 'smtp' or 'resend'
        this.isConfigured = false;
        this.templatesPath = path.join(__dirname, '../templates');
        this.initializeEmailService();
    }

    /**
     * Initialize SMTP transporter
     */
    async initializeEmailService() {
        try {
            logger.info(`Initializing email service with provider: ${this.provider}`);

            if (this.provider === 'resend') {
                await this.initializeResend();
            } else {
                await this.initializeSMTP();
            }
        } catch (error) {
            logger.error('Failed to initialize email service:', error);
            this.isConfigured = false;
        }
    }

    /**
     * Initialize Resend service
     */
    async initializeResend() {
        try {
            if (!process.env.RESEND_API_KEY) {
                logger.warn('Resend API key not provided. Email functionality will be disabled.');
                return;
            }

            this.resend = new Resend(process.env.RESEND_API_KEY);

            this.isConfigured = true;
            logger.info('Resend service initialized successfully');
            console.log('✅ Resend service configured');
        } catch (error) {
            logger.error('Failed to initialize Resend service:', error);
            this.isConfigured = false;
        }
    }

    /**
     * Initialize SMTP transporter
     */
    async initializeSMTP() {
        try {
            // SMTP Configuration


            const smtpConfig = {
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                tls: {
                    rejectUnauthorized: false
                }
            };

            // Create transporter
            this.transporter = nodemailer.createTransport(smtpConfig);
            console.log('✅ SMTP transporter created');

            // Verify connection configuration
            if (process.env.SMTP_USER && process.env.SMTP_PASS) {
                await this.transporter.verify();
                this.isConfigured = true;
                logger.info('SMTP transporter initialized successfully');
            } else {
                logger.warn('SMTP credentials not provided. Email functionality will be disabled.');
            }
        } catch (error) {
            logger.error('Failed to initialize SMTP transporter:', error);
            this.isConfigured = false;
        }
    }

    /**
     * Load email template
     * @param {string} templateName - Template file name
     * @param {Object} variables - Variables to replace in template
     * @returns {string} - Processed template
     */
    async loadTemplate(templateName, variables = {}) {
        try {
            const templatePath = path.join(this.templatesPath, `${templateName}.html`);
            let template = await fs.readFile(templatePath, 'utf8');

            // Replace variables in template
            for (const [key, value] of Object.entries(variables)) {
                const regex = new RegExp(`{{${key}}}`, 'g');
                template = template.replace(regex, value || '');
            }

            return template;
        } catch (error) {
            logger.error(`Error loading template ${templateName}:`, error);
            // Return fallback template
            return this.getFallbackTemplate(templateName, variables);
        }
    }

    /**
     * Get fallback template when file loading fails
     * @param {string} templateName - Template name
     * @param {Object} variables - Template variables
     * @returns {string} - Fallback HTML template
     */
    getFallbackTemplate(templateName, variables) {
        const { appName = '50Brains', otp = '', userName = 'User', companyName = '50Brains' } = variables;

        const baseStyle = `
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
                .logo { font-size: 24px; font-weight: bold; color: #007bff; }
                .content { padding: 20px 0; }
                .otp-box { background: #f8f9fa; border: 2px solid #007bff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                .otp-code { font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 4px; }
                .footer { border-top: 1px solid #eee; padding: 20px 0; text-align: center; color: #666; font-size: 12px; }
                .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            </style>
        `;

        switch (templateName) {
            case 'register':
                return `
                    <html><head>${baseStyle}</head><body>
                        <div class="container">
                            <div class="header"><div class="logo">${appName}</div></div>
                            <div class="content">
                                <h2>Welcome to ${appName}!</h2>
                                <p>Hello ${userName},</p>
                                <p>Thank you for joining ${appName}! To complete your registration, please verify your email address using the OTP below:</p>
                                <div class="otp-box">
                                    <div class="otp-code">${otp}</div>
                                    <p>This code expires in 10 minutes</p>
                                </div>
                                <p>If you didn't create an account, please ignore this email.</p>
                            </div>
                            <div class="footer">
                                <p>&copy; 2025 ${companyName}. All rights reserved.</p>
                            </div>
                        </div>
                    </body></html>
                `;

            case 'forgot-password':
                return `
                    <html><head>${baseStyle}</head><body>
                        <div class="container">
                            <div class="header"><div class="logo">${appName}</div></div>
                            <div class="content">
                                <h2>Password Reset Request</h2>
                                <p>Hello ${userName},</p>
                                <p>We received a request to reset your password. Use the OTP below to proceed:</p>
                                <div class="otp-box">
                                    <div class="otp-code">${otp}</div>
                                    <p>This code expires in 10 minutes</p>
                                </div>
                                <p>If you didn't request this reset, please ignore this email or contact support if you have concerns.</p>
                            </div>
                            <div class="footer">
                                <p>&copy; 2025 ${companyName}. All rights reserved.</p>
                            </div>
                        </div>
                    </body></html>
                `;

            case 'password-change':
                return `
                    <html><head>${baseStyle}</head><body>
                        <div class="container">
                            <div class="header"><div class="logo">${appName}</div></div>
                            <div class="content">
                                <h2>Password Change Verification</h2>
                                <p>Hello ${userName},</p>
                                <p>To confirm your password change, please enter the OTP below:</p>
                                <div class="otp-box">
                                    <div class="otp-code">${otp}</div>
                                    <p>This code expires in 10 minutes</p>
                                </div>
                                <p>If you didn't initiate this change, please contact support immediately.</p>
                            </div>
                            <div class="footer">
                                <p>&copy; 2025 ${companyName}. All rights reserved.</p>
                            </div>
                        </div>
                    </body></html>
                `;

            case 'otp-login':
                return `
                    <html><head>${baseStyle}</head><body>
                        <div class="container">
                            <div class="header"><div class="logo">${appName}</div></div>
                            <div class="content">
                                <h2>Login Verification</h2>
                                <p>Hello ${userName},</p>
                                <p>Someone is trying to log into your account. If this is you, use the OTP below:</p>
                                <div class="otp-box">
                                    <div class="otp-code">${otp}</div>
                                    <p>This code expires in 10 minutes</p>
                                </div>
                                <p>If this wasn't you, please change your password immediately and contact support.</p>
                            </div>
                            <div class="footer">
                                <p>&copy; 2025 ${companyName}. All rights reserved.</p>
                            </div>
                        </div>
                    </body></html>
                `;

            case 'email-verification':
                return `
                    <html><head>${baseStyle}</head><body>
                        <div class="container">
                            <div class="header"><div class="logo">${appName}</div></div>
                            <div class="content">
                                <h2>Email Verification</h2>
                                <p>Hello ${userName},</p>
                                <p>Please verify your email address using the OTP below:</p>
                                <div class="otp-box">
                                    <div class="otp-code">${otp}</div>
                                    <p>This code expires in 10 minutes</p>
                                </div>
                                <p>Once verified, you'll have full access to your account.</p>
                            </div>
                            <div class="footer">
                                <p>&copy; 2025 ${companyName}. All rights reserved.</p>
                            </div>
                        </div>
                    </body></html>
                `;

            default:
                return `
                    <html><head>${baseStyle}</head><body>
                        <div class="container">
                            <div class="header"><div class="logo">${appName}</div></div>
                            <div class="content">
                                <h2>Verification Code</h2>
                                <p>Hello ${userName},</p>
                                <p>Your verification code is:</p>
                                <div class="otp-box">
                                    <div class="otp-code">${otp}</div>
                                    <p>This code expires in 10 minutes</p>
                                </div>
                            </div>
                            <div class="footer">
                                <p>&copy; 2025 ${companyName}. All rights reserved.</p>
                            </div>
                        </div>
                    </body></html>
                `;
        }
    }

    /**
     * Send OTP email
     * @param {string} email - Recipient email
     * @param {string} otp - OTP code
     * @param {string} purpose - Email purpose (register, forgot-password, etc.)
     * @param {Object} additionalData - Additional template data
     * @returns {Object} - Send result
     */
    async sendOTPEmail(email, otp, purpose, additionalData = {}) {
        try {
            if (!this.isConfigured) {
                logger.warn('Email service not configured. Skipping email send.');
                return {
                    success: false,
                    message: 'Email service not configured',
                    otp: process.env.NODE_ENV === 'development' ? otp : undefined
                };
            }

            const templateMap = {
                'REGISTER': 'register',
                'FORGOT_PASSWORD': 'forgot-password',
                'CHANGE_PASSWORD': 'password-change',
                'LOGIN': 'otp-login',
                'EMAIL_VERIFICATION': 'email-verification'
            };

            const templateName = templateMap[purpose] || 'email-verification';

            // Prepare template variables
            const templateData = {
                appName: process.env.APP_NAME || '50Brains',
                companyName: process.env.COMPANY_NAME || '50Brains',
                otp,
                userName: additionalData.userName || 'User',
                supportEmail: process.env.SUPPORT_EMAIL || 'support@50brains.com',
                ...additionalData
            };

            // Load and process template
            const htmlContent = await this.loadTemplate(templateName, templateData);

            // Email subject map
            const subjectMap = {
                'REGISTER': `Welcome to ${templateData.appName} - Verify Your Email`,
                'FORGOT_PASSWORD': `${templateData.appName} - Password Reset Code`,
                'CHANGE_PASSWORD': `${templateData.appName} - Password Change Verification`,
                'LOGIN': `${templateData.appName} - Login Verification Code`,
                'EMAIL_VERIFICATION': `${templateData.appName} - Email Verification Code`
            };

            const subject = subjectMap[purpose] || `${templateData.appName} - Verification Code`;
            const textContent = `Your ${templateData.appName} verification code is: ${otp}. This code expires in 10 minutes.`;

            let result;
            if (this.provider === 'resend') {
                const fromEmail = process.env.RESEND_FROM_EMAIL || '50Brains <noreply@mail.50brains.in>';
                result = await this.sendWithResend({
                    to: email,
                    subject,
                    html: htmlContent,
                    text: textContent,
                    from: fromEmail
                });
            } else {
                const fromEmail = process.env.SMTP_FROM || 'noreply@example.com';
                result = await this.sendWithSMTP({
                    from: fromEmail,
                    to: email,
                    subject,
                    html: htmlContent,
                    text: textContent
                });
            }

            logger.info(`OTP email sent successfully via ${this.provider}`, {
                to: email,
                purpose,
                messageId: result.messageId,
                provider: this.provider
            });

            return {
                success: true,
                messageId: result.messageId,
                message: `OTP email sent successfully via ${this.provider}`,
                provider: this.provider
            };

        } catch (error) {
            logger.error('Error sending OTP email:', error);

            // In development, return OTP for testing
            if (process.env.NODE_ENV === 'development') {
                return {
                    success: false,
                    message: `Email sending failed via ${this.provider} (development mode)`,
                    otp,
                    error: error.message,
                    provider: this.provider
                };
            }

            throw error;
        }
    }

    /**
     * Send email via Resend
     * @param {Object} options - Email options
     * @returns {Object} - Send result
     */
    async sendWithResend(options) {
        try {
            const result = await this.resend.emails.send({
                from: options.from,
                to: [options.to],
                subject: options.subject,
                html: options.html,
                text: options.text
            });

            return {
                messageId: result.data?.id || 'resend-success',
                response: result
            };
        } catch (error) {
            logger.error('Resend API error:', error);
            throw error;
        }
    }

    /**
     * Send email via SMTP
     * @param {Object} options - Email options
     * @returns {Object} - Send result
     */
    async sendWithSMTP(options) {
        try {
            const result = await this.transporter.sendMail(options);
            return {
                messageId: result.messageId,
                response: result.response
            };
        } catch (error) {
            logger.error('SMTP error:', error);
            throw error;
        }
    }

    /**
     * Send general email
     * @param {Object} options - Email options
     * @returns {Object} - Send result
     */
    async sendEmail(options) {
        try {
            if (!this.isConfigured) {
                logger.warn('Email service not configured. Skipping email send.');
                return { success: false, message: 'Email service not configured' };
            }

            let result;
            if (this.provider === 'resend') {
                const from = options.from || process.env.RESEND_FROM_EMAIL || '50Brains <noreply@mail.50brains.in>';
                result = await this.sendWithResend({
                    ...options,
                    from
                });
            } else {
                const from = options.from || process.env.SMTP_FROM || 'noreply@example.com';
                const mailOptions = {
                    ...options,
                    from
                };
                result = await this.sendWithSMTP(mailOptions);
            }

            logger.info(`Email sent successfully via ${this.provider}`, {
                to: options.to,
                subject: options.subject,
                messageId: result.messageId,
                provider: this.provider
            });

            return {
                success: true,
                messageId: result.messageId,
                message: `Email sent successfully via ${this.provider}`,
                provider: this.provider
            };

        } catch (error) {
            logger.error('Error sending email:', error);
            throw error;
        }
    }

    /**
     * Test email configuration
     * @returns {Object} - Test result
     */
    async testConfiguration() {
        try {
            if (!this.isConfigured) {
                return {
                    success: false,
                    message: `${this.provider} service not initialized`,
                    provider: this.provider
                };
            }

            if (this.provider === 'resend') {
                // For Resend, we can't easily test without sending an email
                // Just check if the API key is configured
                if (!process.env.RESEND_API_KEY) {
                    return {
                        success: false,
                        message: 'Resend API key not configured',
                        provider: this.provider
                    };
                }
                return {
                    success: true,
                    message: 'Resend service is configured',
                    provider: this.provider
                };
            } else {
                if (!this.transporter) {
                    return {
                        success: false,
                        message: 'SMTP transporter not initialized',
                        provider: this.provider
                    };
                }
                await this.transporter.verify();
                return {
                    success: true,
                    message: 'SMTP configuration is valid',
                    provider: this.provider
                };
            }
        } catch (error) {
            logger.error('Email configuration test failed:', error);
            return {
                success: false,
                message: error.message,
                provider: this.provider
            };
        }
    }

    /**
     * Get email service status
     * @returns {Object} - Service status
     */
    getStatus() {
        const baseStatus = {
            configured: this.isConfigured,
            provider: this.provider
        };

        if (this.provider === 'resend') {
            return {
                ...baseStatus,
                apiKey: process.env.RESEND_API_KEY ? 'configured' : 'missing',
                fromEmail: process.env.RESEND_FROM_EMAIL || 'not_set'
            };
        } else {
            return {
                ...baseStatus,
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: process.env.SMTP_SECURE === 'true',
                user: process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 3) + '***' : null
            };
        }
    }
}

module.exports = new EmailService();