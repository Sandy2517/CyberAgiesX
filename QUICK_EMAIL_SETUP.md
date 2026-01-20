# Quick Email Setup Guide

## Why emails aren't being sent

The email service requires configuration. Currently, the system is in test mode and OTPs are only logged to the server console.

## Quick Setup - Gmail (Recommended)

### Step 1: Enable 2-Step Verification
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification" if not already enabled

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Enter "CyberAgiesX" as the name
4. Click "Generate"
5. Copy the 16-character password (no spaces)

### Step 3: Create .env file
Create `backend/.env` file with:

```env
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
```

Replace:
- `your_email@gmail.com` with your actual Gmail address
- `your_16_char_app_password` with the password you copied

### Step 4: Restart Server
Restart your Node.js server for changes to take effect.

## Verify Setup

After restarting, when you request an OTP, you should see:
```
✅ Email service initialized with Gmail
✅ OTP email sent to your_email@gmail.com
```

Instead of just:
```
🔐 OTP generated for your_email@gmail.com: 123456
```

## Alternative: Check Console for OTP

Until email is configured, OTPs are always logged to the server console. Look for:
```
🔐 OTP generated for your_email@gmail.com: 123456 (valid for 5 minutes)
```

This appears in the terminal where you ran `node server.js`

## Troubleshooting

### "Less secure app access" error
- Use App Password instead of regular password
- Make sure 2-Step Verification is enabled

### "Invalid credentials" error
- Double-check the app password (should be 16 characters, no spaces)
- Regenerate the app password if needed

### Still not working?
- Check server console for error messages
- Verify .env file is in the `backend` folder
- Make sure you restarted the server after creating .env

