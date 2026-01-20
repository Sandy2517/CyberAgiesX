# 📖 How to Use CyberAgiesX - Step by Step

## The Absolute Simplest Way

### Step 1: Install and Run
```bash
cd backend
npm install
npm start
```

### Step 2: Open Browser
Go to: `http://localhost:3000/neuroshield_platform.html`

### Step 3: Login
1. Select your role (End User, Security Admin, or Forensic Analyst)
2. Click "Authenticate & Enter Platform"
3. That's it!

---

## What You Can Do Right Now

### 1. Explore the Dashboard
- View system metrics (CPU, memory, network)
- See active threats count
- Check trust scores

### 2. Generate Test Threats
- Go to **"Alerts & Incidents"** section
- Click **"🧪 Generate Test Threat"** button
- Threat will appear in the alerts list
- Try the buttons: Investigate, Block, Resolve, Escalate

### 3. Monitor Live Communications
- Go to **"Live Monitoring"** section
- See real-time communication streams
- Click **"🔄 Refresh"** to reload

### 4. Adjust Settings
- Go to **"Settings"** section
- Move sliders for auto-block and warning thresholds
- Toggle notification checkboxes
- Settings save automatically

### 5. Use Security Scanner
- Go to **"Security Scanner"** section (if available)
- Paste text or URL
- Click "Analyze"
- See threat analysis results

---

## Testing Features

### Test Threat Generation
```bash
# Generate a test threat via API
curl -X POST http://localhost:3000/api/threats/generate
```

### Create Test Event (Without Database)
```bash
# Test Twilio event
curl -X POST http://localhost:3000/api/v1/test/twilio-event \
  -H "Content-Type: application/json" \
  -d '{"From": "+15551234567", "To": "+15559876543"}'

# Test Gmail event  
curl -X POST http://localhost:3000/api/v1/test/gmail-event \
  -H "Content-Type: application/json" \
  -d '{"from": "sender@example.com", "to": "recipient@company.com", "subject": "Test"}'
```

Then refresh the platform to see the events!

---

## Adding Real Integrations (When Ready)

### Gmail Integration - Simple Way

1. **Get credentials** (takes 5 minutes):
   - Go to https://console.cloud.google.com/
   - Create project → Enable Gmail API → Create OAuth credentials
   - Copy Client ID and Secret

2. **Get refresh token** (takes 2 minutes):
   - Go to https://developers.google.com/oauthplayground/
   - Use your credentials
   - Select "Gmail API v1" > "Read mailbox"
   - Authorize → Get refresh token

3. **Add to `.env`**:
   ```env
   GMAIL_CLIENT_ID=...
   GMAIL_CLIENT_SECRET=...
   GMAIL_REFRESH_TOKEN=...
   ```

4. **Start polling**:
   ```bash
   npm run gmail:poll
   ```

Done! Gmail messages will appear in the platform.

### Twilio Integration - Simple Way

1. **Create Twilio account** (free trial available)
2. **Get credentials** from Twilio Console
3. **Add to `.env`**:
   ```env
   TWILIO_ACCOUNT_SID=...
   TWILIO_AUTH_TOKEN=...
   ```

4. **Set webhook URL** in Twilio Console:
   - Phone number → Voice webhook: `https://your-domain.com/api/v1/webhooks/twilio/call`

Done! Calls will automatically create events.

---

## Common Questions

### "Do I need to set up Gmail/Twilio?"
**No!** The platform works perfectly without them. Use test endpoints to create sample events.

### "What if I don't have Docker?"
**No problem!** Just run `npm start` - it works without database. Events just won't persist after restart.

### "Can I test without Google Cloud?"
**Yes!** Use the test endpoints:
- `POST /api/v1/test/gmail-event`
- `POST /api/v1/test/twilio-event`

### "Will it work on GitHub/Railway?"
**Yes!** Everything is deployment-ready. Just:
1. Push to GitHub
2. Connect to Railway/Render
3. Add environment variables in their dashboard
4. Deploy!

---

## Need Help?

1. **Server won't start?** → Check `npm install` completed
2. **Port in use?** → Use `PORT=3001 npm start`
3. **Database errors?** → You can ignore them - platform works without DB
4. **Want real data?** → Follow the integration guides when ready

**Remember**: You can always just run `npm start` and it works! 🚀

