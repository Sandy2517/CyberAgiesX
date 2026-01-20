# CyberAgiesX Production Setup Guide

This guide covers setting up CyberAgiesX with real integrations (Twilio, Gmail) and database storage.

## Prerequisites

- Docker and Docker Compose (for local development)
- Node.js 14+ and npm
- PostgreSQL (via Docker or installed)
- MinIO or AWS S3 (via Docker or configured)

## Quick Start with Docker

1. **Start infrastructure services:**
```bash
docker-compose up -d postgres minio
```

2. **Run database migrations:**
```bash
# Connect to Postgres and run migration
psql postgresql://postgres:password@localhost:5432/cyberagiesx < backend/migrations/001_create_events_table.sql

# Or use Docker:
docker exec -i cyberagiesx_postgres psql -U postgres -d cyberagiesx < backend/migrations/001_create_events_table.sql
```

3. **Configure environment:**
```bash
cd backend
cp env.example .env
# Edit .env with your settings
```

4. **Install dependencies:**
```bash
npm install
```

5. **Start the server:**
```bash
npm start
```

## Environment Configuration

### Database (Required)
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/cyberagiesx
```

### Object Storage (Required)
For MinIO (local):
```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=cyberagiesx
USE_S3=false
```

For AWS S3:
```env
USE_S3=true
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Twilio Integration (Optional)
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WEBHOOK_SECRET=your_webhook_secret
```

### Gmail Integration (Optional)
```env
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
```

### Feature Flags
```env
DEMO_MODE=false
ENABLE_WEBHOOKS=true
```

## Testing Twilio Webhook

1. **Test webhook endpoint:**
```bash
chmod +x dev/test_twilio_flow.sh
./dev/test_twilio_flow.sh
```

2. **Or manually:**
```bash
curl -X POST http://localhost:3000/api/v1/webhooks/twilio/call \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d @dev/sample/twilio_payload.json
```

3. **Verify event was created:**
```bash
curl http://localhost:3000/api/v1/events?limit=1 | jq
```

## Setting Up Twilio Webhook

1. **In Twilio Console:**
   - Go to Phone Numbers → Manage → Active Numbers
   - Select your number
   - Set Voice webhook URL: `https://your-domain.com/api/v1/webhooks/twilio/call`
   - Set HTTP method: POST

2. **Configure webhook secret:**
   - Generate a secret: `openssl rand -hex 32`
   - Add to `.env`: `TWILIO_WEBHOOK_SECRET=your_secret`
   - In Twilio, verify signature is enabled (default)

## Setting Up Gmail Integration

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### Step 2: Create OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: "Web application"
4. Authorized redirect URIs:
   - `http://localhost:3000/api/v1/gmail/oauth/callback` (development)
   - `https://your-domain.com/api/v1/gmail/oauth/callback` (production)
5. Copy the Client ID and Client Secret

### Step 3: Configure Environment Variables

```env
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/v1/gmail/oauth/callback
```

### Step 4: Get Refresh Token

1. **Method 1: Using the API endpoint (recommended)**
   ```bash
   # Get authorization URL
   curl http://localhost:3000/api/v1/gmail/auth
   # Visit the URL in your browser
   # After authorization, you'll be redirected with a code
   # The callback endpoint will show you the refresh token
   ```

2. **Method 2: Using OAuth2 Playground**
   - Go to [OAuth2 Playground](https://developers.google.com/oauthplayground/)
   - Click gear icon > Use your own OAuth credentials
   - Enter Client ID and Client Secret
   - Select "Gmail API v1" > "Read mailbox"
   - Click "Authorize APIs" then "Exchange authorization code for tokens"
   - Copy the refresh token

3. **Add refresh token to .env:**
   ```env
   GMAIL_REFRESH_TOKEN=your_refresh_token_here
   ```

### Step 5: Start Polling

**Option A: Background Poller (recommended)**
```bash
# In a separate terminal
npm run gmail:poll
```

**Option B: Manual Poll**
```bash
curl -X POST http://localhost:3000/api/v1/gmail/poll \
  -H "Content-Type: application/json" \
  -d '{"maxResults": 10, "query": "is:unread"}'
```

**Option C: Set up Push Notifications (advanced)**
1. Create Google Cloud Pub/Sub topic
2. Configure webhook endpoint in Pub/Sub subscription
3. Set `GMAIL_PUBSUB_TOPIC` in `.env`
4. Call `POST /api/v1/gmail/watch` to start watching

### Gmail Poller Configuration

Add to `.env`:
```env
# Gmail polling options
GMAIL_POLL_INTERVAL=60000  # Poll every 60 seconds (milliseconds)
GMAIL_QUERY=is:unread      # Gmail search query
GMAIL_MAX_RESULTS=10       # Max messages per poll
```

### What Gets Processed

For each Gmail message:
- ✅ Message metadata (sender, recipients, subject, date)
- ✅ Body preview (first 500 characters)
- ✅ Attachments (downloaded and stored in MinIO/S3)
- ✅ Anonymization of email addresses
- ✅ Trust score calculation
- ✅ Full provenance (raw Gmail payload) stored in database

### Testing Gmail Integration

1. **Test authorization:**
   ```bash
   curl http://localhost:3000/api/v1/gmail/auth
   ```

2. **Test polling:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/gmail/poll
   ```

3. **Verify events created:**
   ```bash
   curl http://localhost:3000/api/v1/events?event_type=email
   ```

## API Endpoints

### Events API
- `GET /api/v1/events` - List events (query: `limit`, `since`, `tenant_id`, `event_type`)
- `GET /api/v1/events/:id` - Get single event
- `POST /api/v1/events/:id/action` - Record analyst action

### Webhooks
- `POST /api/v1/webhooks/twilio/call` - Twilio call webhook
- `POST /api/v1/webhooks/gmail/push` - Gmail push notification (Pub/Sub)

### Gmail Integration
- `GET /api/v1/gmail/auth` - Get OAuth2 authorization URL
- `GET /api/v1/gmail/oauth/callback` - OAuth2 callback handler
- `POST /api/v1/gmail/poll` - Manually trigger message polling
- `POST /api/v1/gmail/watch` - Set up push notifications

### Object Storage
- `GET /api/v1/object/:key?presign=true` - Get presigned URL for object

## Database Schema

See `backend/migrations/001_create_events_table.sql` for the events table schema.

Key fields:
- `source`: Provider (twilio, gmail, zoom)
- `source_id`: Provider's unique ID
- `provenance`: JSONB with raw provider payload
- `actions`: JSONB array of analyst actions
- `trust_score`: Computed trust score (0-100)

## Development vs Production

### Development (DEMO_MODE=true)
- Allows loading fixture data
- More verbose logging
- Relaxed validation

### Production (DEMO_MODE=false)
- No fixture data
- Production logging
- Strict validation
- Webhook signature verification required

## Troubleshooting

### Database Connection Failed
```bash
# Check if Postgres is running
docker ps | grep postgres

# Test connection
psql postgresql://postgres:password@localhost:5432/cyberagiesx
```

### MinIO Connection Failed
```bash
# Check if MinIO is running
docker ps | grep minio

# Access MinIO console
open http://localhost:9001
# Login: minioadmin / minioadmin
```

### Webhook Not Receiving Events
- Check `ENABLE_WEBHOOKS=true` in `.env`
- Verify webhook URL is accessible
- Check server logs for errors
- Verify webhook signature (production)

## Next Steps

1. Set up production database (managed PostgreSQL)
2. Configure production object storage (S3)
3. Set up webhook endpoints with SSL
4. Configure monitoring and alerting
5. Set up Gmail OAuth2 flow for automatic polling

