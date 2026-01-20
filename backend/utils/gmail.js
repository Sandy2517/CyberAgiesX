/**
 * Gmail API integration utilities
 * Handles OAuth2 authentication and message polling
 */

const { google } = require('googleapis');
const axios = require('axios');
const { anonymizeEmail, anonymizeRecipients, extractOrg } = require('./anonymize');
const { downloadAndUpload, uploadObject } = require('./storage');
const { computeTrustScore } = require('./trustScore');
const { query } = require('./database');
const { v4: uuidv4 } = require('uuid');

let oauth2Client = null;
let gmailClient = null;

/**
 * Initialize Gmail OAuth2 client
 */
function initGmailClient() {
    if (gmailClient) return gmailClient;
    
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
        console.warn('⚠️ Gmail credentials not configured. Gmail integration disabled.');
        return null;
    }
    
    oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/v1/gmail/oauth/callback'
    );
    
    // Set refresh token if available
    if (process.env.GMAIL_REFRESH_TOKEN) {
        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });
    }
    
    gmailClient = google.gmail({ version: 'v1', auth: oauth2Client });
    console.log('✅ Gmail client initialized');
    
    return gmailClient;
}

/**
 * Get OAuth2 authorization URL
 */
function getAuthUrl() {
    const client = initGmailClient();
    if (!client) {
        throw new Error('Gmail client not initialized');
    }
    
    const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.metadata'
    ];
    
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent' // Force consent screen to get refresh token
    });
}

/**
 * Exchange authorization code for tokens
 */
async function getTokensFromCode(code) {
    const client = initGmailClient();
    if (!client) {
        throw new Error('Gmail client not initialized');
    }
    
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    return tokens;
}

/**
 * Refresh access token
 */
async function refreshAccessToken() {
    if (!oauth2Client) {
        initGmailClient();
    }
    
    if (!oauth2Client.credentials.refresh_token) {
        throw new Error('No refresh token available');
    }
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    
    return credentials.access_token;
}

/**
 * Poll Gmail for new messages
 * @param {Object} options - Polling options
 * @param {string} options.query - Gmail search query (default: 'is:unread')
 * @param {number} options.maxResults - Maximum messages to fetch (default: 10)
 * @param {Date} options.since - Only fetch messages after this date
 */
async function pollGmailMessages(options = {}) {
    const client = initGmailClient();
    if (!client) {
        throw new Error('Gmail client not configured');
    }
    
    try {
        // Refresh token if needed
        await refreshAccessToken();
    } catch (error) {
        console.error('Failed to refresh Gmail token:', error);
        throw error;
    }
    
    const queryStr = options.query || 'is:unread';
    const maxResults = options.maxResults || 10;
    
    // Get message list
    const listResponse = await client.users.messages.list({
        userId: 'me',
        q: queryStr,
        maxResults: maxResults,
        includeSpamTrash: false
    });
    
    const messages = listResponse.data.messages || [];
    console.log(`📧 Found ${messages.length} Gmail messages`);
    
    const processedMessages = [];
    
    for (const message of messages) {
        try {
            const processed = await processGmailMessage(message.id);
            if (processed) {
                processedMessages.push(processed);
            }
        } catch (error) {
            console.error(`Error processing message ${message.id}:`, error);
        }
    }
    
    return processedMessages;
}

/**
 * Process a single Gmail message
 */
async function processGmailMessage(messageId) {
    const client = initGmailClient();
    if (!client) {
        throw new Error('Gmail client not configured');
    }
    
    // Check if message already processed
    const existing = await query(
        'SELECT id FROM events WHERE source = $1 AND source_id = $2',
        ['gmail', messageId]
    );
    
    if (existing.rows.length > 0) {
        console.log(`Message ${messageId} already processed`);
        return null;
    }
    
    // Get full message
    const messageResponse = await client.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
    });
    
    const message = messageResponse.data;
    const headers = message.payload.headers;
    
    // Extract headers
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    
    const from = getHeader('From');
    const to = getHeader('To');
    const cc = getHeader('Cc');
    const subject = getHeader('Subject');
    const date = getHeader('Date');
    
    // Parse recipients
    const recipients = [to, cc].filter(Boolean).join(',').split(',').map(r => r.trim()).filter(Boolean);
    
    // Anonymize sender and recipients
    const senderAlias = anonymizeEmail(from);
    const recipientAliases = anonymizeRecipients(recipients);
    
    // Extract body preview
    let bodyPreview = message.snippet || ''; // Use Gmail snippet if available
    
    // Try to get full body from parts
    function extractBodyFromParts(parts) {
        if (!parts) return '';
        
        for (const part of parts) {
            // Prefer plain text
            if (part.mimeType === 'text/plain' && part.body?.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
        }
        
        // Fallback to HTML if no plain text
        for (const part of parts) {
            if (part.mimeType === 'text/html' && part.body?.data) {
                const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
                // Strip HTML tags for preview
                return html.replace(/<[^>]*>/g, '').substring(0, 500);
            }
        }
        
        // Recursively check multipart
        for (const part of parts) {
            if (part.parts) {
                const nested = extractBodyFromParts(part.parts);
                if (nested) return nested;
            }
        }
        
        return '';
    }
    
    if (!bodyPreview && message.payload.parts) {
        bodyPreview = extractBodyFromParts(message.payload.parts).substring(0, 500);
    } else if (message.payload.body?.data && !bodyPreview) {
        bodyPreview = Buffer.from(message.payload.body.data, 'base64').toString('utf-8').substring(0, 500);
    }
    
    // Extract attachments (recursively check all parts)
    const attachmentParts = [];
    
    function extractAttachmentsFromParts(parts) {
        if (!parts) return;
        
        for (const part of parts) {
            if (part.filename && part.body?.attachmentId) {
                attachmentParts.push({ part, attachmentId: part.body.attachmentId });
            }
            
            // Recursively check multipart
            if (part.parts) {
                extractAttachmentsFromParts(part.parts);
            }
        }
    }
    
    if (message.payload.parts) {
        extractAttachmentsFromParts(message.payload.parts);
    }
    
    // Download attachments
    const finalAttachmentKeys = [];
    for (const { part, attachmentId } of attachmentParts) {
        try {
            const attachment = await client.users.messages.attachments.get({
                userId: 'me',
                messageId: messageId,
                id: attachmentId
            });
            
            const attachmentData = Buffer.from(attachment.data.data, 'base64');
            const objectKey = `attachments/${new Date().toISOString().split('T')[0]}/${messageId}/${part.filename}`;
            
            await uploadObject(objectKey, attachmentData, part.mimeType || 'application/octet-stream');
            finalAttachmentKeys.push(objectKey);
        } catch (error) {
            console.error(`Error downloading attachment ${part.filename}:`, error);
        }
    }
    
    // Compute trust score
    const trustScore = computeTrustScore({
        spfPass: true, // Would need to check actual headers
        dkimPass: true, // Would need to check actual headers
        senderVerified: false, // Default, would verify against contacts
    });
    
    // Parse timestamp
    const timestamp = message.internalDate ? new Date(parseInt(message.internalDate)) : new Date();
    
    // Create event
    const eventId = uuidv4();
    const provenance = {
        gmail_message_id: messageId,
        thread_id: message.threadId,
        label_ids: message.labelIds || [],
        snippet: message.snippet,
        size_estimate: message.sizeEstimate,
        raw_headers: headers,
        payload: {
            mime_type: message.payload.mimeType,
            parts_count: message.payload.parts?.length || 0
        }
    };
    
    const insertQuery = `
        INSERT INTO events (
            id, source, source_id, tenant_id, event_type, timestamp,
            sender, recipients, subject, body_preview, attachment_keys,
            trust_score, provenance
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
    `;
    
    const result = await query(insertQuery, [
        eventId,
        'gmail',
        messageId,
        'default', // TODO: Extract from tenant context
        'email',
        timestamp,
        senderAlias,
        recipientAliases,
        subject || null,
        bodyPreview || null,
        finalAttachmentKeys,
        trustScore,
        JSON.stringify(provenance)
    ]);
    
    console.log(`✅ Gmail event inserted: ${eventId} (${messageId})`);
    
    return result.rows[0];
}

/**
 * Watch Gmail for changes (push notifications)
 * Note: This requires a verified domain and pub/sub setup
 */
async function watchGmail() {
    const client = initGmailClient();
    if (!client) {
        throw new Error('Gmail client not configured');
    }
    
    if (!process.env.GMAIL_PUBSUB_TOPIC) {
        console.warn('⚠️ GMAIL_PUBSUB_TOPIC not configured. Push notifications disabled.');
        return null;
    }
    
    try {
        await refreshAccessToken();
    } catch (error) {
        console.error('Failed to refresh Gmail token:', error);
        throw error;
    }
    
    const watchResponse = await client.users.watch({
        userId: 'me',
        requestBody: {
            topicName: process.env.GMAIL_PUBSUB_TOPIC,
            labelIds: ['INBOX']
        }
    });
    
    console.log(`✅ Gmail watch established. Expires: ${new Date(watchResponse.data.expiration).toISOString()}`);
    
    return watchResponse.data;
}

module.exports = {
    initGmailClient,
    getAuthUrl,
    getTokensFromCode,
    refreshAccessToken,
    pollGmailMessages,
    processGmailMessage,
    watchGmail
};

