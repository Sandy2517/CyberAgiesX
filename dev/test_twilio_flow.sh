#!/bin/bash
# Test script for Twilio webhook flow
# Tests: POST webhook -> event inserted -> GET /api/v1/events returns event

set -e

API_BASE="${API_BASE:-http://localhost:3000}"
TWILIO_PAYLOAD="${TWILIO_PAYLOAD:-dev/sample/twilio_payload.json}"

echo "🧪 Testing Twilio webhook flow..."
echo ""

# Step 1: Post webhook
echo "📤 Step 1: POST /api/v1/webhooks/twilio/call"
RESPONSE=$(curl -s -X POST "$API_BASE/api/v1/webhooks/twilio/call" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d @- < <(cat "$TWILIO_PAYLOAD" | jq -r 'to_entries | .[] | "\(.key)=\(.value)"'))

echo "Response: $RESPONSE"
EVENT_ID=$(echo "$RESPONSE" | jq -r '.event_id // empty')

if [ -z "$EVENT_ID" ]; then
    echo "❌ Failed: No event_id in response"
    exit 1
fi

echo "✅ Event created: $EVENT_ID"
echo ""

# Step 2: Wait a moment for DB to process
echo "⏳ Waiting 2 seconds..."
sleep 2

# Step 3: Query events
echo "📥 Step 2: GET /api/v1/events"
EVENTS_RESPONSE=$(curl -s "$API_BASE/api/v1/events?limit=1")

echo "Response:"
echo "$EVENTS_RESPONSE" | jq '.'

FOUND_ID=$(echo "$EVENTS_RESPONSE" | jq -r ".events[0].id // empty")

if [ "$FOUND_ID" != "$EVENT_ID" ]; then
    echo "❌ Failed: Event not found in events list"
    echo "   Expected: $EVENT_ID"
    echo "   Found: $FOUND_ID"
    exit 1
fi

# Verify provenance exists
PROVENANCE=$(echo "$EVENTS_RESPONSE" | jq -r '.events[0].provenance // {}')
if [ "$PROVENANCE" = "{}" ]; then
    echo "❌ Failed: Provenance not stored"
    exit 1
fi

echo ""
echo "✅ SUCCESS: Event flow working correctly!"
echo "   - Webhook accepted"
echo "   - Event inserted with ID: $EVENT_ID"
echo "   - Event retrievable via GET /api/v1/events"
echo "   - Provenance stored: $(echo "$PROVENANCE" | jq 'keys | length') keys"

