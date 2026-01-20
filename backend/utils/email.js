/**
 * Email service for sending OTP and notifications
 * Supports multiple email providers (SMTP, Gmail, SendGrid, etc.)
 */

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initialize email transporter
 */
async function initEmailService() {
    // Try to create transporter based on available configuration
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        // Custom SMTP server
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        console.log('✅ Email service initialized with custom SMTP');
        return transporter;
    } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        // Gmail with App Password
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD // App-specific password, not regular password
            }
        });
        console.log('✅ Email service initialized with Gmail');
        return transporter;
    } else if (process.env.SENDGRID_API_KEY) {
        // SendGrid
        transporter = nodemailer.createTransport({
            service: 'SendGrid',
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            }
        });
        console.log('✅ Email service initialized with SendGrid');
        return transporter;
    } else {
        // No email configuration found
        console.log('\n⚠️  WARNING: Email service not configured!');
        console.log('⚠️  OTPs will NOT be sent via email.');
        console.log('⚠️  OTP codes will be logged to console only.');
        console.log('\n📝 To enable email sending:');
        console.log('   1. Create backend/.env file');
        console.log('   2. Add: GMAIL_USER=your_email@gmail.com');
        console.log('   3. Add: GMAIL_APP_PASSWORD=your_16_char_app_password');
        console.log('   4. Restart the server\n');
        return null;
    }
}

/**
 * Send OTP email
 */
async function sendOTPEmail(to, otp) {
    try {
        // Initialize if not already done
        if (!transporter) {
            transporter = await initEmailService();
            
            // If still null (no config), use Ethereal for testing
            if (!transporter && process.env.NODE_ENV === 'development') {
                const testAccount = await nodemailer.createTestAccount();
                transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                });
                console.log('📧 Using Ethereal Email for testing. Check emails at: https://ethereal.email');
            }
        }
        
        if (!transporter) {
            throw new Error('Email service not configured');
        }
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || 'noreply@cyberagiesx.com',
            to: to, // Send to the email address the user entered
            subject: 'Your CyberAgiesX Authentication Code',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #00D9FF, #00FF88); padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                        .header h1 { color: #0F0F23; margin: 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                        .otp-box { background: #0F0F23; color: #00D9FF; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
                        .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #00FF88; }
                        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🛡️ CyberAgiesX</h1>
                        </div>
                        <div class="content">
                            <h2>Your Authentication Code</h2>
                            <p>Hello,</p>
                            <p>You've requested to sign in to CyberAgiesX. Use the following code to complete your authentication:</p>
                            
                            <div class="otp-box">
                                <div class="otp-code">${otp}</div>
                            </div>
                            
                            <div class="warning">
                                <strong>⚠️ Security Notice:</strong><br>
                                This code will expire in 5 minutes.<br>
                                If you didn't request this code, please ignore this email.
                            </div>
                            
                            <p>This is an automated message. Please do not reply to this email.</p>
                        </div>
                        <div class="footer">
                            <p>© 2025 CyberAgiesX - Cognitive Firewall Platform</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                CyberAgiesX Authentication Code
                
                Your authentication code is: ${otp}
                
                This code will expire in 5 minutes.
                If you didn't request this code, please ignore this email.
                
                © 2025 CyberAgiesX
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        
        // In test mode (Ethereal), log the preview URL
        if (info.messageId) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log(`\n📧 Email sent! View it online at:`);
                console.log(`   ${previewUrl}\n`);
            } else {
                console.log(`✅ Email sent successfully to ${to}`);
            }
        } else {
            console.log(`✅ Email sent successfully to ${to}`);
        }
        
        return { success: true, messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) };
    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw error;
    }
}

/**
 * Verify email transporter is ready
 */
async function verifyEmailConnection() {
    if (!transporter) {
        transporter = await initEmailService();
    }
    
    if (transporter) {
        try {
            await transporter.verify();
            return true;
        } catch (error) {
            console.error('❌ Email service verification failed:', error);
            return false;
        }
    }
    
    return false;
}

module.exports = {
    initEmailService,
    sendOTPEmail,
    verifyEmailConnection
};

