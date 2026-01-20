# Gmail Integration Setup Guide

Complete guide to setting up Gmail integration for CyberAgiesX.

## Quick Start

1. **Get OAuth credentials from Google Cloud Console**
2. **Configure in `.env`**
3. **Authorize and get refresh token**
4. **Start polling or enable push notifications**

## Detailed Setup

### 1. Google Cloud Console Setup

#### Create Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Note your project ID

#### Enable Gmail API
1. Navigate to "APIs & Services" > "Library"
2. Search for "Gmail API"
3. Click "Enable"

#### Create OAuth2 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External (or Internal for Google Workspace)
   - App name: CyberAgiesX
   - User support email: your email
   - Developer contact: your email
   - Add scopes: `https://www.googleapis.com/auth/gmail.readonly`
4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: CyberAgiesX Gmail Integration
   - Authorized redirect URIs:
     - `http://localhost:3000/api/v1/gmail/oauth/callback` (development)
     - `https://your-domain.com/api/v1/gmail/oauth/callback` (production)
5. Save and copy:
   - **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
   - **Client Secret**

### 2. Configure Environment Variables

Add to `backend/.env`:

```env
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/v1/gmail/oauth/callback

# Optional: Polling configuration
GMAIL_POLL_INTERVAL=60000      # Poll every 60 seconds
GMAIL_QUERY=is:unread          # Gmail search query
GMAIL_MAX_RESULTS=10           # Max messages per poll

# Optional: For push notifications (advanced)
GMAIL_PUBSUB_TOPIC=projects/your-project/topics/gmail-notifications
```

### 3. Get Refresh Token

#### Method 1: Using API Endpoint (Recommended)

1. **Get authorization URL:**
   ```bash
   curl http://localhost:3000/api/v1/gmail/auth
   ```
   
   Response:
   ```json
   {
     "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
     "message": "Visit this URL to authorize Gmail access"
   }
   ```

2. **Visit the URL in your browser**
   - Log in with your Google account
   - Grant permissions
   - You'll be redirected to the callback URL

3. **Extract refresh token from callback:**
   - After authorization, check the callback response
   - Look for: `GMAIL_REFRESH_TOKEN=...`
   - Copy the refresh token

4. **Add to `.env`:**
   ```env
   GMAIL_REFRESH_TOKEN=your_refresh_token_here
   ```

5. **Restart the server**

#### Method 2: Using OAuth2 Playground

1. Go to [OAuth2 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) > "Use your own OAuth credentials"
3. Enter:
   - OAuth Client ID: Your Client ID
   - OAuth Client secret: Your Client Secret
4. In "Step 1", select:
   - `https://mail.google.com/` > "Read mailbox"
5. Click "Authorize APIs"
6. Click "Exchange authorization code for tokens"
7. Copy the **Refresh token**
8. Add to `.env`:
   ```env
   GMAIL_REFRESH_TOKEN=your_refresh_token_here
   ```

### 4. Start Using Gmail Integration

#### Option A: Manual Polling

```bash
curl -X POST http://localhost:3000/api/v1/gmail/poll \
  -H "Content-Type: application/json" \
  -d '{
    "query": "is:unread",
    "maxResults": 10
  }'
```

#### Option B: Background Poller

```bash
# In a separate terminal
npm run gmail:poll
```

The poller will:
- Check for new messages every 60 seconds (configurable)
- Process unread messages
- Insert events into database
- Download attachments

#### Option C: Push Notifications (Advanced)

Requires Google Cloud Pub/Sub setup:

1. **Create Pub/Sub topic:**
   ```bash
   gcloud pubsub topics create gmail-notifications
   ```

2. **Create subscription:**
   ```bash
   gcloud pubsub subscriptions create gmail-webhook \
     --topic=gmail-notifications \
     --push-endpoint=https://your-domain.com/api/v1/webhooks/gmail/push
   ```

3. **Set topic in `.env`:**
   ```env
   GMAIL_PUBSUB_TOPIC=projects/your-project/topics/gmail-notifications
   ```

4. **Start watching:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/gmail/watch
   ```

## Testing

### Test Authorization

```bash
curl http://localhost:3000/api/v1/gmail/auth
```

### Test Polling

```bash
curl -X POST http://localhost:3000/api/v1/gmail/poll
```

### Verify Events Created

```bash
curl http://localhost:3000/api/v1/events?event_type=email
```

### Full Integration Test

```bash
chmod +x dev/test_gmail_flow.sh
./dev/test_gmail_flow.sh
```

## What Gets Processed

For each Gmail message:

1. **Metadata extracted:**
   - From (sender)
   - To, CC (recipients)
   - Subject
   - Date/timestamp
   - Body preview (first 500 chars)

2. **Attachments:**
   - Downloaded from Gmail
   - Stored in MinIO/S3
   - Object keys saved in event

3. **Anonymization:**
   - Sender: `localpart@redacted` or `alias_4hex`
   - Recipients: Anonymized array

4. **Storage:**
   - Event inserted into `events` table
   - Provenance: Full Gmail payload (JSONB)
   - Trust score calculated

## Gmail Query Syntax

You can customize what messages to fetch using Gmail search queries:

```env
# Unread messages
GMAIL_QUERY=is:unread

# Unread from specific sender
GMAIL_QUERY=is:unread from:important@example.com

# Messages from last 24 hours
GMAIL_QUERY=newer_than:1d

# Important and unread
GMAIL_QUERY=is:important is:unread

# With attachments
GMAIL_QUERY=has:attachment is:unread
```

Learn more: [Gmail Search Operators](https://support.google.com/mail/answer/7190)

## Troubleshooting

### "Gmail client not configured"
- Check that `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` are set in `.env`
- Restart the server after adding credentials

### "No refresh token available"
- Make sure you completed OAuth with `prompt=consent`
- Re-authorize using the `/api/v1/gmail/auth` endpoint
- Check that `GMAIL_REFRESH_TOKEN` is in `.env`

### "Failed to refresh Gmail token"
- Refresh token may have expired (rare)
- Re-authorize to get a new refresh token
- Check OAuth credentials are correct

### "Permission denied" errors
- Verify Gmail API is enabled in Google Cloud Console
- Check OAuth consent screen is configured
- Ensure correct scopes are requested

### Messages not appearing
- Check Gmail query in `.env` (`GMAIL_QUERY`)
- Verify messages match the query
- Check server logs for errors
- Verify database connection

## Security Notes

- ✅ Refresh tokens stored in environment variables (secure in production)
- ✅ Access tokens automatically refreshed
- ✅ Webhook signature verification (for Pub/Sub)
- ✅ Messages processed only once (deduplicated by `source_id`)
- ✅ All personal data anonymized before storage

## Production Checklist

- [ ] Use production OAuth credentials (separate from development)
- [ ] Set production redirect URI in Google Cloud Console
- [ ] Configure Pub/Sub for push notifications (optional but recommended)
- [ ] Set up monitoring for polling failures
- [ ] Configure alerts for auth token expiration
- [ ] Use secure storage for refresh tokens (not plain .env in production)
- [ ] Set appropriate Gmail query to avoid processing too many messages

## Next Steps

1. Set up background worker process (PM2, systemd, etc.)
2. Configure Pub/Sub for real-time push notifications
3. Implement message marking (mark as read after processing)
4. Add filtering rules for specific senders/subjects
5. Set up monitoring and alerting

