/**
 * Events API routes
 * GET /api/v1/events - List events with pagination
 * POST /api/v1/events/:id/action - Record analyst action
 */

const express = require('express');
const router = express.Router();
const { query } = require('../utils/database');
const { getPresignedUrl } = require('../utils/storage');

/**
 * GET /api/v1/events
 * Query parameters:
 * - limit: number (default 25)
 * - since: ISO timestamp
 * - tenant_id: string (default 'default')
 * - event_type: 'email' | 'call' | 'video' | 'scan' | 'chat'
 */
router.get('/events', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '25');
        const since = req.query.since || null;
        const tenantId = req.query.tenant_id || 'default';
        const eventType = req.query.event_type || null;
        
        // Check if database is available
        try {
            let queryText = `
                SELECT * FROM events 
                WHERE tenant_id = $1
            `;
            const params = [tenantId];
            let paramIndex = 2;
            
            if (since) {
                queryText += ` AND created_at >= $${paramIndex}`;
                params.push(since);
                paramIndex++;
            }
            
            if (eventType) {
                queryText += ` AND event_type = $${paramIndex}`;
                params.push(eventType);
                paramIndex++;
            }
            
            queryText += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
            params.push(limit);
            
            const result = await query(queryText, params);
            
            // Don't expose raw S3/MinIO URLs, return keys only
            const events = result.rows.map(event => ({
                ...event,
                // Ensure provenance and actions are properly formatted
                provenance: event.provenance || {},
                actions: event.actions || [],
            }));
            
            return res.json({
                events,
                total: result.rowCount,
                limit,
                since: since || null
            });
        } catch (dbError) {
            // Database not available - return empty array
            console.warn('Database not available, returning empty events list:', dbError.message);
            return res.json({
                events: [],
                total: 0,
                limit,
                since: since || null,
                message: 'Database not configured - events will not persist'
            });
        }
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events', details: error.message });
    }
});

/**
 * GET /api/v1/events/:id
 * Get single event by ID
 */
router.get('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM events WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: 'Failed to fetch event', details: error.message });
    }
});

/**
 * POST /api/v1/events/:id/action
 * Record analyst action on event
 * Body: { action: string, actor?: string }
 */
router.post('/events/:id/action', async (req, res) => {
    try {
        const { id } = req.params;
        const { action, actor } = req.body;
        
        if (!action) {
            return res.status(400).json({ error: 'Action is required' });
        }
        
        // Get current actions array
        const eventResult = await query('SELECT actions FROM events WHERE id = $1', [id]);
        
        if (eventResult.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const currentActions = eventResult.rows[0].actions || [];
        const newAction = {
            actor: actor || 'system',
            action: action, // 'requested_verification', 'close', 'escalate', 'block'
            at: new Date().toISOString()
        };
        
        // Append new action
        const updatedActions = [...currentActions, newAction];
        
        // Update event
        await query(
            'UPDATE events SET actions = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify(updatedActions), id]
        );
        
        res.json({
            success: true,
            action: newAction,
            message: 'Action recorded'
        });
    } catch (error) {
        console.error('Error recording action:', error);
        res.status(500).json({ error: 'Failed to record action', details: error.message });
    }
});

/**
 * GET /api/v1/object/:key
 * Get presigned URL for object access
 * Query: ?presign=true
 */
router.get('/object/:key(*)', async (req, res) => {
    try {
        const { key } = req.params;
        const presign = req.query.presign === 'true';
        
        if (!presign) {
            return res.status(400).json({ error: 'presign=true parameter required' });
        }
        
        const signedUrl = await getPresignedUrl(key, 3600); // 1 hour expiry
        
        res.json({
            url: signedUrl,
            expires_in: 3600
        });
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        res.status(500).json({ error: 'Failed to generate URL', details: error.message });
    }
});

module.exports = router;

