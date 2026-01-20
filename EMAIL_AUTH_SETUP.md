# Email OTP Authentication Setup Guide

## Overview

CyberAgiesX now uses email-based OTP (One-Time Password) authentication. When users sign in, they:
1. Enter their email address
2. Receive an OTP code via email
3. Enter the OTP to complete authentication

## Email Configuration

To send real OTP emails, you need to configure an email service. Choose one of the following options:

### Option 1: Gmail App Password (Recommended for Development)

1. Go to your Google Account settings: https://myaccount.google.com/
2. Enable 2-Step Verification if not already enabled
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Generate a new app password for "Mail"
5. Copy the 16-character password

Add to `backend/.env`:
```env
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
```

### Option 2: Custom SMTP Server

For any SMTP server (Gmail, Outlook, custom):

Add to `backend/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@cyberagiesx.com
```

### Option 3: SendGrid

If using SendGrid API:

Add to `backend/.env`:
```env
SENDGRID_API_KEY=your_sendgrid_api_key
```

### Option 4: Test Mode (Development Only)

If no email configuration is provided, the system will use Ethereal Email (test emails). You can view test emails at: https://ethereal.email

**Note:** OTP codes are always logged to the server console for development purposes.

## How It Works

1. **User enters email** → System validates email format
2. **Server generates 6-digit OTP** → OTP expires in 5 minutes
3. **Email sent** → User receives OTP in their inbox
4. **User enters OTP** → System verifies and creates session
5. **Session token stored** → Valid for 24 hours

## Security Features

- OTP expires after 5 minutes
- Maximum 3 verification attempts per OTP
- Session tokens expire after 24 hours
- Session tokens are required for authenticated API calls

## Testing Without Email Configuration

During development, if email is not configured:
1. The OTP will be logged to the server console
2. Check the terminal output for the OTP code
3. The system will show a message indicating test mode

Example console output:
```
🔐 OTP generated for user@example.com: 123456 (valid for 5 minutes)
```

## Production Recommendations

For production environments:
1. Use a dedicated email service (SendGrid, AWS SES, etc.)
2. Configure proper SPF/DKIM records for your domain
3. Set up email monitoring and rate limiting
4. Consider using Redis for OTP storage instead of in-memory Map
5. Implement proper email templates with branding

## Troubleshooting

### Emails not being sent
- Check `.env` file has correct email configuration
- Verify SMTP credentials are correct
- Check server console for error messages
- For Gmail, ensure "Less secure app access" is enabled or use App Password

### OTP not received
- Check spam/junk folder
- Verify email address is correct
- Check server console for OTP code (development mode)
- Ensure email service is properly configured

### Session expired
- Sessions expire after 24 hours
- Simply sign in again with email OTP

