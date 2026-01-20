# ✅ Email Setup - Almost Done!

I've created the `.env` file for you. Now you just need to add your Gmail App Password.

## 📍 Where is the .env file?

The file should be at: `backend\.env`

## 🔑 What You Need To Do Now:

### Step 1: Get Your Gmail App Password

1. Open this link: **https://myaccount.google.com/apppasswords**
2. If you see "App passwords isn't available", first enable **2-Step Verification**
3. Then create App Password:
   - App: Select **Mail**
   - Device: Select **Other (Custom name)**
   - Type: **CyberAgiesX**
   - Click **Generate**
4. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

### Step 2: Edit the .env File

1. Open the file: `backend\.env` (you can double-click it in File Explorer)
2. Find this line:
   ```
   GMAIL_APP_PASSWORD=REPLACE_WITH_YOUR_APP_PASSWORD
   ```
3. Replace `REPLACE_WITH_YOUR_APP_PASSWORD` with your actual App Password
   - **Important:** Remove all spaces! If Google shows `abcd efgh`, use `abcdefgh`
4. Save the file (Ctrl+S)

### Step 3: Restart Your Server

1. Stop the server (press **Ctrl+C** in the terminal where it's running)
2. Start it again:
   ```powershell
   cd backend
   node server.js
   ```
3. You should see: `✅ Email service initialized with Gmail`

### Step 4: Test It!

1. Go to: http://localhost:3000/prototypes/neuroshield_platform.html
2. Enter your email: `reshmasandhiya517@gmail.com`
3. Click "Send OTP to Email"
4. **Check your Gmail inbox!** 🎉

---

## 🆘 If You Still Don't Get Emails:

**Check these:**
- Did you remove spaces from the App Password? (very important!)
- Did you save the .env file after editing?
- Did you restart the server after saving?
- Check your spam/junk folder
- Check server console for error messages

**Still need help?** The OTP code is always shown in the server console as a backup!

