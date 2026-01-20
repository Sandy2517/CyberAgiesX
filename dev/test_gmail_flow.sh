#!/bin/bash
# Test script for Gmail integration flow
# Tests: OAuth auth -> Poll messages -> Verify events

set -e

API_BASE="${API_BASE:-http://localhost:3000}"

echo "🧪 Testing Gmail integration flow..."
echo ""

# Step 1: Get authorization URL
echo "📤 Step 1: GET /api/v1/gmail/auth"
AUTH_RESPONSE=$(curl -s "$API_BASE/api/v1/gmail/auth")
AUTH_URL=$(echo "$AUTH_RESPONSE" | jq -r '.authUrl // empty')

if [ -z "$AUTH_URL" ]; then
    echo "❌ Failed: No auth URL in response"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo "✅ Authorization URL obtained"
echo "   Visit this URL to authorize: $AUTH_URL"
echo ""

# Step 2: Check if refresh token is configured
if [ -z "$GMAIL_REFRESH_TOKEN" ]; then
    echo "⚠️  GMAIL_REFRESH_TOKEN not set in environment"
    echo "   After visiting the auth URL and completing OAuth:"
    echo "   1. Copy the refresh token from the callback response"
    echo "   2. Set it in .env: GMAIL_REFRESH_TOKEN=..."
    echo "   3. Restart the server"
    echo ""
    echo "Skipping poll test (requires refresh token)"
    exit 0
fi

# Step 3: Test polling
echo "📥 Step 2: POST /api/v1/gmail/poll"
POLL_RESPONSE=$(curl -s -X POST "$API_BASE/api/v1/gmail/poll" \
  -H "Content-Type: application/json" \
  -d '{"maxResults": 5, "query": "is:unread"}')

echo "Response:"
echo "$POLL_RESPONSE" | jq '.'

SUCCESS=$(echo "$POLL_RESPONSE" | jq -r '.success // false')
PROCESSED=$(echo "$POLL_RESPONSE" | jq -r '.processed // 0')

if [ "$SUCCESS" != "true" ]; then
    echo "❌ Failed: Poll was not successful"
    exit 1
fi

echo "✅ Poll successful. Processed $PROCESSED message(s)"
echo ""

# Step 4: Verify events were created
echo "🔍 Step 3: GET /api/v1/events?event_type=email"
sleep 2  # Wait for DB to process

EVENTS_RESPONSE=$(curl -s "$API_BASE/api/v1/events?event_type=email&limit=5")

EMAIL_EVENTS=$(echo "$EVENTS_RESPONSE" | jq -r '.events // [] | length')

if [ "$EMAIL_EVENTS" -eq 0 ]; then
    echo "⚠️  No email events found in database"
    echo "   This might be normal if there are no unread messages"
else
    echo "✅ Found $EMAIL_EVENTS email event(s) in database"
    
    # Show first event
    FIRST_EVENT=$(echo "$EVENTS_RESPONSE" | jq -r '.events[0]')
    if [ "$FIRST_EVENT" != "null" ]; then
        echo ""
        echo "Sample event:"
        echo "$FIRST_EVENT" | jq '{id, source, event_type, sender, subject, trust_score}'
    fi
fi

echo ""
echo "✅ Gmail integration test complete!"

