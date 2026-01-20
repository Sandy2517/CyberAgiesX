# Create .env File Manually

Since I can't create the `.env` file directly, here's exactly what to do:

## Step 1: Get Gmail App Password

1. Go to: **https://myaccount.google.com/apppasswords**
2. Enable **2-Step Verification** if not already enabled
3. Create App Password:
   - Select **Mail**
   - Select **Other (Custom name)**
   - Type: **CyberAgiesX**
   - Click **Generate**
4. Copy the **16-character password** (remove spaces!)

## Step 2: Create .env File

1. Open the `backend` folder in your file explorer
2. Right-click → New → Text Document
3. Name it exactly: `.env` (including the dot at the start)
4. If Windows warns about the file extension, click Yes
5. Open the file with Notepad or any text editor
6. Add these lines (replace with YOUR values):

```
GMAIL_USER=reshmasandhiya517@gmail.com
GMAIL_APP_PASSWORD=your_16_char_password_here_no_spaces
PORT=3000
WS_PORT=3001
NODE_ENV=development
```

**Example (replace with your actual App Password):**
```
GMAIL_USER=reshmasandhiya517@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
PORT=3000
WS_PORT=3001
NODE_ENV=development
```

## Step 3: Save and Restart

1. Save the file (Ctrl+S)
2. Stop your server (Ctrl+C in terminal)
3. Restart: `cd backend; node server.js`
4. Look for: `✅ Email service initialized with Gmail`

## Quick Setup Script

Or run this in PowerShell from the backend folder:
```powershell
.\setup-email.ps1
```

This will prompt you for your email and app password and create the .env file automatically.

