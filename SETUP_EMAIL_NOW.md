# Setup Email to Receive OTPs - Quick Guide

## Step 1: Get Gmail App Password

1. Go to: **https://myaccount.google.com/apppasswords**
2. If you see "App passwords isn't available", enable **2-Step Verification** first
3. Select:
   - App: **Mail**
   - Device: **Other (Custom name)**
   - Name: **CyberAgiesX**
4. Click **Generate**
5. Copy the **16-character password** (it looks like: `abcd efgh ijkl mnop`)

## Step 2: Create .env File

1. Open the `backend` folder
2. Create a new file named: **`.env`** (just `.env`, nothing else)
3. Add these two lines (replace with YOUR actual values):

```
GMAIL_USER=reshmasandhiya517@gmail.com
GMAIL_APP_PASSWORD=your_16_char_password_here
```

**Example:**
```
GMAIL_USER=reshmasandhiya517@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

**Important:** Remove spaces from the app password! If Google gave you `abcd efgh ijkl mnop`, use `abcdefghijklmnop`

## Step 3: Restart Server

1. Stop your server (Ctrl+C in the terminal)
2. Start it again: `cd backend; node server.js`
3. You should see: `✅ Email service initialized with Gmail`

## Step 4: Test

1. Go to the login page
2. Enter your email: `reshmasandhiya517@gmail.com`
3. Click "Send OTP to Email"
4. Check your Gmail inbox (and spam folder)
5. You should receive the OTP email!

## Troubleshooting

**Still not receiving emails?**
- Check spam/junk folder
- Make sure you removed spaces from the app password
- Verify 2-Step Verification is enabled
- Check server console for error messages
- Make sure you restarted the server after creating .env

**Server console shows errors?**
- Verify the .env file is in the `backend` folder
- Make sure there are no quotes around the values
- No spaces before/after the `=` sign
- Restart the server

**Quick Test:** 
Even without email, the OTP is always shown in the server console. Check your terminal where you ran `node server.js` - you'll see the OTP code there.

