# 🚀 CyberAgiesX Quick Start Guide

## Simplest Way to Get Started (Without External APIs)

You can run and test CyberAgiesX immediately without setting up Gmail or Twilio:

### 1. Start the Server (No Database Needed Initially)

```bash
cd backend
npm install  # Install dependencies
npm start    # Start server
```

The server will run even without database/storage configured - it will use in-memory storage for threats.

### 2. Open the Platform

Visit: `http://localhost:3000/neuroshield_platform.html`

### 3. Test Basic Features

- ✅ All UI features work
- ✅ Threat simulator generates random threats
- ✅ Real-time updates via WebSocket
- ✅ All buttons are functional

**Note:** Without database, events won't persist, but the platform is fully functional for demo/testing.

---

## Full Production Setup (Optional - When You're Ready)

Only do this when you want to store real data from Twilio/Gmail.

### Option A: Quick Docker Setup

```bash
# 1. Start PostgreSQL and MinIO
docker-compose up -d postgres minio

# 2. Run database migration
docker exec -i cyberagiesx_postgres psql -U postgres -d cyberagiesx < backend/migrations/001_create_events_table.sql

# 3. Configure .env
cd backend
cp env.example .env
# Edit .env - at minimum, set:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/cyberagiesx

# 4. Restart server
npm start
```

### Option B: Skip Database (Use In-Memory)

Just run:
```bash
cd backend
npm install
npm start
```

The platform works without database - threats are generated in-memory.

---

## Testing Gmail Integration (Optional)

**You only need this if you want real Gmail integration.**

### Simplest Method: Use OAuth2 Playground

1. **Go to**: https://developers.google.com/oauthplayground/

2. **Configure**:
   - Click the gear icon (⚙️) at top right
   - Check "Use your own OAuth credentials"
   - Enter your Client ID and Secret (from Google Cloud Console)

3. **Select Scopes**:
   - In left panel, find "Gmail API v1"
   - Select: `https://mail.google.com/` > "Read mailbox"

4. **Authorize**:
   - Click "Authorize APIs"
   - Log in with your Google account
   - Click "Exchange authorization code for tokens"
   - Copy the **Refresh token**

5. **Add to `.env`**:
   ```env
   GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=your_secret
   GMAIL_REFRESH_TOKEN=paste_refresh_token_here
   ```

6. **Test**:
   ```bash
   # Manual poll
   curl -X POST http://localhost:3000/api/v1/gmail/poll
   ```

---

## Testing Twilio Integration (Optional)

**You only need this if you want real Twilio calls.**

### Quick Test Without Real Twilio

```bash
# Use the test script with sample payload
curl -X POST http://localhost:3000/api/v1/webhooks/twilio/call \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=CA123&From=%2B15551234567&To=%2B15559876543&CallStatus=completed&Timestamp=2025-10-29T10:41:23Z"
```

This will insert a test event even without real Twilio.

---

## What Works Without Setup

✅ **All UI features** - Every button and section
✅ **Threat simulation** - Auto-generates threats every 15 seconds  
✅ **Real-time updates** - WebSocket updates for metrics
✅ **Settings management** - Save/load settings
✅ **OTP authentication** - Login system
✅ **Alert management** - Investigate, block, resolve threats
✅ **Live monitoring** - Shows simulated communications
✅ **Security scanner** - Text/URL analysis (uses local analysis)

❌ **Won't work without setup:**
- Persistent event storage (needs PostgreSQL)
- Real Gmail messages (needs OAuth credentials)
- Real Twilio calls (needs Twilio account)
- External threat APIs (needs API keys)

---

## Recommended Approach

### For Testing/Demo:
1. Just run `npm start` - everything works!
2. Test all UI features
3. Generate threats with the button
4. Explore the interface

### For Production:
1. Set up Docker services (PostgreSQL + MinIO)
2. Run migrations
3. Configure `.env` with database
4. Optionally add Gmail/Twilio credentials

---

## Troubleshooting

### "Cannot find module" errors
```bash
cd backend
npm install
```

### Server won't start
- Check if port 3000 is in use: `netstat -ano | findstr :3000`
- Use different port: `PORT=3001 npm start`

### Want to test without any setup?
Just run `npm start` and open the browser - it works!

---

## Next Steps

1. **Try it now**: `npm start` → Open browser → Explore!
2. **When ready for real data**: Follow setup guides
3. **For GitHub**: Everything is ready - just commit and push!

The platform is designed to work immediately, with optional enhancements available when you need them.

