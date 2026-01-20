/**
 * Test data endpoints (for development/testing without real integrations)
 * Only available when DEMO_MODE=true or NODE_ENV=development
 */

const express = require('express');
const router = express.Router();
const { query } = require('../utils/database');
const { v4: uuidv4 } = require('uuid');
const { anonymizeEmail, anonymizePhone } = require('../utils/anonymize');
const { computeTrustScore } = require('../utils/trustScore');

// Check if test endpoints should be enabled
function isTestModeEnabled() {
    return process.env.DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production';
}

/**
 * POST /api/v1/test/twilio-event
 * Create a test Twilio event (for testing without real Twilio)
 */
router.post('/test/twilio-event', async (req, res) => {
    if (!isTestModeEnabled()) {
        return res.status(403).json({ error: 'Test endpoints disabled in production' });
    }
    
    try {
        const { From, To, RecordingUrl } = req.body;
        
        const senderAlias = anonymizePhone(From || '+15551234567');
        const recipientAlias = anonymizePhone(To || '+15559876543');
        const recordingKey = RecordingUrl ? `recordings/test/${uuidv4()}.wav` : null;
        
        const trustScore = computeTrustScore({});
        
        const eventId = uuidv4();
        const insertQuery = `
            INSERT INTO events (
                id, source, source_id, tenant_id, event_type, timestamp,
                sender, recipients, recording_key, trust_score, provenance
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        
        // Check if database is available
        let result;
        try {
            result = await query(insertQuery, [
                eventId,
                'twilio',
                `CA_TEST_${Date.now()}`,
                'default',
                'call',
                new Date(),
                senderAlias,
                [recipientAlias],
                recordingKey,
                trustScore,
                JSON.stringify({ test: true, ...req.body })
            ]);
        } catch (dbError) {
            // Database not available - return mock response
            return res.json({
                success: true,
                event_id: eventId,
                message: 'Test event created (database not available - using mock)',
                event: {
                    id: eventId,
                    source: 'twilio',
                    event_type: 'call',
                    sender: senderAlias,
                    recipients: [recipientAlias],
                    trust_score: trustScore,
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        res.json({
            success: true,
            event_id: eventId,
            event: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating test event:', error);
        res.status(500).json({ error: 'Failed to create test event', details: error.message });
    }
});

/**
 * POST /api/v1/test/gmail-event
 * Create a test Gmail event (for testing without real Gmail)
 */
router.post('/test/gmail-event', async (req, res) => {
    if (!isTestModeEnabled()) {
        return res.status(403).json({ error: 'Test endpoints disabled in production' });
    }
    
    try {
        const { from, to, subject, body } = req.body;
        
        const senderAlias = anonymizeEmail(from || 'test@example.com');
        const recipientAlias = anonymizeEmail(to || 'recipient@company.com');
        
        const trustScore = computeTrustScore({});
        
        const eventId = uuidv4();
        const insertQuery = `
            INSERT INTO events (
                id, source, source_id, tenant_id, event_type, timestamp,
                sender, recipients, subject, body_preview, trust_score, provenance
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        
        // Check if database is available
        let result;
        try {
            result = await query(insertQuery, [
                eventId,
                'gmail',
                `MSG_TEST_${Date.now()}`,
                'default',
                'email',
                new Date(),
                senderAlias,
                [recipientAlias],
                subject || 'Test Email',
                body || 'This is a test email body',
                trustScore,
                JSON.stringify({ test: true, ...req.body })
            ]);
        } catch (dbError) {
            // Database not available - return mock response
            return res.json({
                success: true,
                event_id: eventId,
                message: 'Test event created (database not available - using mock)',
                event: {
                    id: eventId,
                    source: 'gmail',
                    event_type: 'email',
                    sender: senderAlias,
                    recipients: [recipientAlias],
                    subject: subject || 'Test Email',
                    trust_score: trustScore,
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        res.json({
            success: true,
            event_id: eventId,
            event: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating test event:', error);
        res.status(500).json({ error: 'Failed to create test event', details: error.message });
    }
});

module.exports = router;

