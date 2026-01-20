/**
 * Gmail integration routes
 * GET /api/v1/gmail/auth - Get OAuth2 authorization URL
 * GET /api/v1/gmail/oauth/callback - OAuth2 callback handler
 * POST /api/v1/gmail/poll - Manually trigger message polling
 * POST /api/v1/gmail/watch - Set up push notifications
 */

const express = require('express');
const router = express.Router();
const gmailUtils = require('../utils/gmail');

/**
 * GET /api/v1/gmail/auth
 * Get OAuth2 authorization URL
 */
router.get('/auth', (req, res) => {
    try {
        const authUrl = gmailUtils.getAuthUrl();
        res.json({
            authUrl,
            message: 'Visit this URL to authorize Gmail access'
        });
    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({ error: 'Failed to generate auth URL', details: error.message });
    }
});

/**
 * GET /api/v1/gmail/oauth/callback
 * Handle OAuth2 callback
 */
router.get('/oauth/callback', async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!code) {
            return res.status(400).json({ error: 'Authorization code required' });
        }
        
        const tokens = await gmailUtils.getTokensFromCode(code);
        
        // Store refresh token in environment (in production, store securely in database)
        console.log('🔑 Gmail tokens obtained. Refresh token:', tokens.refresh_token ? 'Present' : 'Not provided');
        console.log('⚠️  IMPORTANT: Add GMAIL_REFRESH_TOKEN to your .env file:');
        console.log(`   GMAIL_REFRESH_TOKEN=${tokens.refresh_token || 'NOT_PROVIDED'}`);
        
        res.json({
            success: true,
            message: 'Gmail authorization successful',
            hasRefreshToken: !!tokens.refresh_token,
            instructions: tokens.refresh_token 
                ? 'Add GMAIL_REFRESH_TOKEN to your .env file and restart the server'
                : 'Re-authorize with prompt=consent to get refresh token'
        });
    } catch (error) {
        console.error('Error handling OAuth callback:', error);
        res.status(500).json({ error: 'OAuth callback failed', details: error.message });
    }
});

/**
 * POST /api/v1/gmail/poll
 * Manually trigger Gmail message polling
 * Body: { query?: string, maxResults?: number }
 */
router.post('/poll', async (req, res) => {
    try {
        const { query, maxResults, since } = req.body;
        
        const messages = await gmailUtils.pollGmailMessages({
            query,
            maxResults: maxResults || 10,
            since: since ? new Date(since) : undefined
        });
        
        res.json({
            success: true,
            processed: messages.length,
            messages: messages.map(m => ({
                id: m.id,
                source_id: m.source_id,
                subject: m.subject,
                timestamp: m.timestamp
            }))
        });
    } catch (error) {
        console.error('Error polling Gmail:', error);
        res.status(500).json({ error: 'Gmail polling failed', details: error.message });
    }
});

/**
 * POST /api/v1/gmail/watch
 * Set up Gmail push notifications (requires Pub/Sub topic)
 */
router.post('/watch', async (req, res) => {
    try {
        if (!process.env.GMAIL_PUBSUB_TOPIC) {
            return res.status(400).json({ 
                error: 'GMAIL_PUBSUB_TOPIC not configured',
                instructions: 'Set up Google Cloud Pub/Sub topic and configure GMAIL_PUBSUB_TOPIC in .env'
            });
        }
        
        const watchResult = await gmailUtils.watchGmail();
        
        res.json({
            success: true,
            watch: watchResult,
            expires_at: new Date(watchResult.expiration).toISOString(),
            message: 'Gmail watch established. Push notifications will be sent to /api/v1/webhooks/gmail/push'
        });
    } catch (error) {
        console.error('Error setting up Gmail watch:', error);
        res.status(500).json({ error: 'Failed to set up Gmail watch', details: error.message });
    }
});

module.exports = router;

