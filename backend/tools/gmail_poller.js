#!/usr/bin/env node
/**
 * Gmail Poller - Background worker to poll Gmail for new messages
 * Run: node backend/tools/gmail_poller.js
 * Or: npm run gmail:poll
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const gmailUtils = require('../utils/gmail');

const POLL_INTERVAL = parseInt(process.env.GMAIL_POLL_INTERVAL || '60000'); // Default: 1 minute

async function pollOnce() {
    try {
        console.log(`[${new Date().toISOString()}] Starting Gmail poll...`);
        const messages = await gmailUtils.pollGmailMessages({
            query: process.env.GMAIL_QUERY || 'is:unread',
            maxResults: parseInt(process.env.GMAIL_MAX_RESULTS || '10')
        });
        
        if (messages.length > 0) {
            console.log(`✅ Processed ${messages.length} new message(s)`);
        } else {
            console.log('ℹ️  No new messages');
        }
    } catch (error) {
        console.error('❌ Polling error:', error.message);
    }
}

async function startPolling() {
    console.log('🚀 Gmail poller started');
    console.log(`   Poll interval: ${POLL_INTERVAL / 1000}s`);
    console.log(`   Query: ${process.env.GMAIL_QUERY || 'is:unread'}`);
    console.log('');
    
    // Initial poll
    await pollOnce();
    
    // Poll periodically
    setInterval(pollOnce, POLL_INTERVAL);
}

// Run if executed directly
if (require.main === module) {
    startPolling().catch(error => {
        console.error('Failed to start Gmail poller:', error);
        process.exit(1);
    });
}

module.exports = { pollOnce, startPolling };

