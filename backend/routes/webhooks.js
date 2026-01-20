/**
 * Webhook endpoints for integrations
 * POST /api/v1/webhooks/twilio/call - Twilio call recording webhook
 * POST /api/v1/webhooks/gmail/push - Gmail push notification
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../utils/database');
const { downloadAndUpload, uploadObject } = require('../utils/storage');
const { anonymizeEmail, anonymizePhone, anonymizeRecipients, extractOrg } = require('../utils/anonymize');
const { computeTrustScore } = require('../utils/trustScore');
const crypto = require('crypto');

// Lazy load Gmail utils (only if needed)
let gmailUtils;
function getGmailUtils() {
    if (!gmailUtils) {
        try {
            gmailUtils = require('../utils/gmail');
        } catch (error) {
            console.error('Gmail utils not available:', error);
        }
    }
    return gmailUtils;
}

const upload = multer();

/**
 * Verify Twilio webhook signature
 * @param {string} url - Full webhook URL
 * @param {Object} params - POST parameters
 * @param {string} signature - X-Twilio-Signature header
 * @returns {boolean}
 */
function verifyTwilioSignature(url, params, signature) {
    if (!process.env.TWILIO_WEBHOOK_SECRET || !signature) {
        console.warn('Twilio webhook secret not configured, skipping signature verification');
        return true; // In development, allow without verification
    }
    
    // Create signature string
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}${params[key]}`)
        .join('');
    const signatureString = url + sortedParams;
    
    // Compute HMAC
    const hmac = crypto.createHmac('sha1', process.env.TWILIO_WEBHOOK_SECRET);
    hmac.update(signatureString);
    const computedSignature = hmac.digest('base64');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
    );
}

/**
 * POST /api/v1/webhooks/twilio/call
 * Handle Twilio call recording webhook
 */
router.post('/twilio/call', upload.none(), async (req, res) => {
    try {
        // Verify signature (in production, always verify)
        const signature = req.headers['x-twilio-signature'];
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        
        if (!verifyTwilioSignature(fullUrl, req.body, signature)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        const {
            CallSid,
            From,
            To,
            CallStatus,
            RecordingUrl,
            RecordingSid,
            RecordingDuration,
            Timestamp
        } = req.body;
        
        // Anonymize sender and recipient
        const senderAlias = anonymizePhone(From);
        const recipientAlias = anonymizePhone(To);
        
        // Generate object key for recording
        const recordingKey = RecordingUrl ? `recordings/${new Date().toISOString().split('T')[0]}/${CallSid}.wav` : null;
        
        // Download recording if URL provided
        if (RecordingUrl && recordingKey) {
            try {
                await downloadAndUpload(RecordingUrl, recordingKey);
            } catch (error) {
                console.error('Error downloading recording:', error);
                // Continue even if download fails
            }
        }
        
        // Compute trust score (stub - would use actual analysis)
        const trustScore = computeTrustScore({
            // In production, analyze recording here
        });
        
        // Insert event into database
        const eventId = uuidv4();
        const insertQuery = `
            INSERT INTO events (
                id, source, source_id, tenant_id, event_type, timestamp,
                sender, recipients, recording_key, trust_score, provenance
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        
        const result = await query(insertQuery, [
            eventId,
            'twilio',
            CallSid,
            'default', // TODO: Extract from tenant context
            'call',
            Timestamp ? new Date(Timestamp) : new Date(),
            senderAlias,
            [recipientAlias],
            recordingKey,
            trustScore,
            JSON.stringify(req.body) // Store raw Twilio payload
        ]);
        
        console.log(`✅ Twilio event inserted: ${eventId}`);
        
        // Return 200 to Twilio
        res.status(200).json({ success: true, event_id: eventId });
    } catch (error) {
        console.error('Error processing Twilio webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed', details: error.message });
    }
});

/**
 * POST /api/v1/webhooks/gmail/push
 * Handle Gmail push notification (Pub/Sub webhook)
 * This endpoint receives notifications from Google Pub/Sub when Gmail messages arrive
 */
router.post('/gmail/push', express.json(), async (req, res) => {
    try {
        const gmailUtils = getGmailUtils();
        if (!gmailUtils) {
            return res.status(503).json({ error: 'Gmail integration not configured' });
        }
        
        // Gmail sends notifications via Pub/Sub
        // The payload contains base64-encoded message data
        const message = req.body.message;
        
        if (!message) {
            return res.status(400).json({ error: 'Invalid Pub/Sub message format' });
        }
        
        // Decode the data
        const data = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'));
        
        // Gmail push notification contains emailAddress and historyId
        if (data.emailAddress && data.historyId) {
            console.log(`📧 Gmail push notification: historyId=${data.historyId} for ${data.emailAddress}`);
            
            // Poll for new messages since this historyId
            // Note: In production, you'd use the history API to get only new messages
            const messages = await gmailUtils.pollGmailMessages({
                query: `after:${data.historyId}`,
                maxResults: 50
            });
            
            res.status(200).json({ 
                success: true,
                processed: messages.length,
                historyId: data.historyId
            });
        } else {
            // Fallback: process message ID if provided directly
            const { messageId } = req.body;
            if (messageId) {
                const processed = await gmailUtils.processGmailMessage(messageId);
                res.status(200).json({ 
                    success: true, 
                    event_id: processed?.id 
                });
            } else {
                res.status(400).json({ error: 'Invalid notification format' });
            }
        }
    } catch (error) {
        console.error('Error processing Gmail webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed', details: error.message });
    }
});

module.exports = router;

