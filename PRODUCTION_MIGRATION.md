# CyberAgiesX: Migration to Production-Ready System

## Overview

CyberAgiesX has been transformed from a demo/prototype with hardcoded data into a production-ready system that:

- ✅ Stores real events in PostgreSQL
- ✅ Integrates with Twilio and Gmail via webhooks
- ✅ Stores recordings/attachments in MinIO/S3
- ✅ Anonymizes all user data by default
- ✅ Removes all theatrical/hardcoded demo content
- ✅ Shows provenance (raw provider payloads) for audit trails

## What Changed

### Backend

**New Files:**
- `backend/migrations/001_create_events_table.sql` - Database schema
- `backend/routes/events.js` - Events API endpoints
- `backend/routes/webhooks.js` - Webhook handlers (Twilio, Gmail)
- `backend/utils/database.js` - PostgreSQL connection utilities
- `backend/utils/storage.js` - MinIO/S3 object storage utilities
- `backend/utils/anonymize.js` - Data anonymization functions
- `backend/utils/trustScore.js` - Trust score calculation

**Modified Files:**
- `backend/server.js` - Added new routes, database init
- `backend/package.json` - Added dependencies (pg, minio, multer, uuid, AWS SDK)
- `backend/env.example` - Added database, storage, integration config

### Frontend

**Modified Files:**
- `prototypes/neuroshield_platform.html`
  - Removed `generateSafeCommunications()` function
  - Updated `loadLiveCommunications()` to use `/api/v1/events`
  - Added provenance panel in event cards
  - Replaced "John Doe" with anonymized aliases
  - Removed "CEO", "Finance Team" theatrical content
  - Added DEMO_MODE support for fixtures

**New Files:**
- `dev/fixtures/events.json` - Sample fixtures (only loaded in demo mode)

### Infrastructure

- `docker-compose.yml` - PostgreSQL + MinIO setup
- `dev/test_twilio_flow.sh` - Webhook testing script
- `dev/sample/twilio_payload.json` - Sample Twilio webhook payload

## Key Features

### 1. Real Event Storage

Events are stored in PostgreSQL with:
- **Provenance**: Full raw provider payload (JSONB)
- **Anonymization**: All sender/recipient data is anonymized
- **Actions**: JSONB array of analyst actions
- **Trust Score**: Computed trust score (0-100)

### 2. Webhook Integration

**Twilio:**
- Receives call recording webhooks
- Downloads recordings to MinIO/S3
- Inserts event with provenance
- Anonymizes phone numbers

**Gmail:**
- ✅ Full OAuth2 authentication flow
- ✅ Message polling (manual and background worker)
- ✅ Push notifications via Pub/Sub (webhook handler)
- ✅ Attachment download and storage
- ✅ Message metadata extraction

### 3. Anonymization

All personal data is anonymized:
- Emails: `localpart@redacted` or `alias_4hex`
- Phones: `alias_4hex`
- Display format: `"{type}: {sender} → {recipient}"`

### 4. Provenance Tracking

Every event includes:
- Provider (twilio/gmail/zoom)
- Ingestion timestamp
- Raw provider payload (JSON)
- Object keys for recordings/attachments

### 5. Secure Object Access

- Objects stored in MinIO/S3
- Presigned URLs with TTL (1 hour)
- No direct object URLs exposed

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Start Infrastructure

```bash
docker-compose up -d postgres minio
```

### 3. Run Migrations

```bash
docker exec -i cyberagiesx_postgres psql -U postgres -d cyberagiesx < backend/migrations/001_create_events_table.sql
```

### 4. Configure Environment

```bash
cd backend
cp env.example .env
# Edit .env with your settings
```

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `MINIO_*` or `S3_*` - Object storage credentials

**Optional:**
- `TWILIO_*` - For Twilio webhooks
- `GMAIL_*` - For Gmail integration
- `DEMO_MODE=false` - Disable demo mode in production

### 5. Start Server

```bash
npm start
```

## Testing

### Test Twilio Webhook

```bash
chmod +x dev/test_twilio_flow.sh
./dev/test_twilio_flow.sh
```

### Verify Events API

```bash
curl http://localhost:3000/api/v1/events?limit=10
```

## Production Checklist

- [ ] Set `DEMO_MODE=false` in production
- [ ] Set `NODE_ENV=production`
- [ ] Configure production PostgreSQL database
- [ ] Set up AWS S3 or production MinIO
- [ ] Configure Twilio webhook URLs
- [ ] Set up SSL certificates
- [ ] Enable webhook signature verification
- [ ] Set up monitoring and logging
- [ ] Configure backups for PostgreSQL
- [ ] Set up CI/CD pipeline

## Demo Mode

Demo mode is **disabled by default** in production. To enable for testing:

**URL Parameter:**
```
http://localhost:3000/neuroshield_platform.html?demo=true
```

**LocalStorage:**
```javascript
localStorage.setItem('DEMO_MODE', 'true');
```

**Environment Variable:**
```env
DEMO_MODE=true
```

Fixtures are only loaded when:
1. DEMO_MODE is explicitly enabled
2. No real events are available

## Removed Content

The following hardcoded demo content was removed:
- ❌ `generateSafeCommunications()` function
- ❌ "John Doe" user name
- ❌ "CEO to Finance Team" communication titles
- ❌ "Bank transfer" references
- ❌ Theatrical threat descriptions

**Replaced with:**
- ✅ Real API data from `/api/v1/events`
- ✅ Anonymized user aliases (`alias_4hex`)
- ✅ Neutral event titles (`"{type}: {sender} → {recipient}"`)
- ✅ Provider metadata and provenance

## API Reference

### Events API

**GET /api/v1/events**
- Query params: `limit`, `since`, `tenant_id`, `event_type`
- Returns: Paginated list of events in canonical schema

**GET /api/v1/events/:id**
- Returns: Single event with full details

**POST /api/v1/events/:id/action**
- Body: `{ action: string, actor?: string }`
- Records analyst action (requested_verification, close, escalate, block)

**GET /api/v1/object/:key?presign=true**
- Returns: Presigned URL for object access (1 hour TTL)

### Webhooks

**POST /api/v1/webhooks/twilio/call**
- Accepts: Twilio form data (CallSid, From, To, RecordingUrl, etc.)
- Downloads recording, inserts event with provenance

**POST /api/v1/webhooks/gmail/push**
- Accepts: Gmail push notification (skeleton)

## Troubleshooting

### Database Connection Issues

```bash
# Check if Postgres is running
docker ps | grep postgres

# Test connection
psql postgresql://postgres:password@localhost:5432/cyberagiesx
```

### Object Storage Issues

```bash
# Check MinIO
docker ps | grep minio
# Access console: http://localhost:9001
```

### Webhook Not Working

1. Check `ENABLE_WEBHOOKS=true` in `.env`
2. Verify webhook URL is accessible
3. Check server logs for errors
4. Verify signature (production)

## Next Steps

1. **Gmail Integration**: Complete OAuth2 flow and polling
2. **Transcription Worker**: Implement Whisper/cloud transcription
3. **Real-time Streaming**: WebSocket updates for new events
4. **Multi-tenant**: Full tenant isolation
5. **Analytics**: Event analytics and reporting

## Support

For issues or questions, refer to:
- `README_PRODUCTION.md` - Detailed production setup
- `IMPLEMENTATION_STATUS.md` - Implementation status
- `DEPLOYMENT.md` - Deployment instructions

