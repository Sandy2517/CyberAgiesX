const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const os = require('os');
const { exec } = require('child_process');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const AIServices = require('./ai-services');
const BlueSentinelAPI = require('./bluesentinel-api');
const ThreatSimulator = require('./threat-simulator');
const eventsRouter = require('./routes/events');
const webhooksRouter = require('./routes/webhooks');
const gmailRouter = require('./routes/gmail');
const testDataRouter = require('./routes/test-data');
const { initMinio } = require('./utils/storage');
const { sendOTPEmail, verifyEmailConnection } = require('./utils/email');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || (process.env.PORT ? parseInt(process.env.PORT) : 3001);
// In production (when PORT is set), use same port for WebSocket
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

// Initialize AI Services
const aiServices = new AIServices();

// Initialize BlueSentinel SOC AI
const blueSentinelAPI = new BlueSentinelAPI();

// Initialize Threat Simulator
const threatSimulator = new ThreatSimulator();

// Application settings (persistent)
let appSettings = {
    autoBlockThreshold: 30,
    warningThreshold: 60,
    notifications: {
        email: true,
        sms: true,
        dailyReports: false,
        realtimeDashboard: true
    },
    integrations: {
        teams: true,
        outlook: true,
        slack: false,
        zoom: true,
        whatsapp: false
    }
};

// OTP storage (in production, use Redis or database)
const otpStore = new Map();
const userSessions = new Map();

// Rate limiting
const rateLimiter = new RateLimiterMemory({
    keyPrefix: 'cyberagiesx',
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
});

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for development
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Rate limiting middleware
app.use(async (req, res, next) => {
    try {
        await rateLimiter.consume(req.ip);
        next();
    } catch (rejRes) {
        res.status(429).json({ error: 'Too many requests' });
    }
});

// Global threat intelligence database
let threatDatabase = {
    knownThreats: new Set(),
    suspiciousIPs: new Set(),
    phishingDomains: new Set(),
    maliciousHashes: new Set(),
    behavioralPatterns: []
};

// Real-time monitoring data
let systemMetrics = {
    cpu: 0,
    memory: 0,
    network: 0,
    processes: [],
    connections: [],
    lastUpdate: Date.now()
};

// Connected clients for real-time updates
const connectedClients = new Set();

// Initialize WebSocket server for real-time communication
// Initialize WebSocket Server
// In production (when PORT env var is set), attach to Express server
// In development, use separate port
let wss;
let httpServer;

if (process.env.PORT && !process.env.WS_PORT) {
    // Production: attach WebSocket to Express server
    httpServer = require('http').createServer(app);
    wss = new WebSocket.Server({ server: httpServer });
} else {
    // Development: use separate port
    wss = new WebSocket.Server({ port: WS_PORT });
}

wss.on('connection', (ws) => {
    console.log('Client connected to real-time feed');
    connectedClients.add(ws);
    
    // Send initial system state
    ws.send(JSON.stringify({
        type: 'init',
        data: {
            systemMetrics,
            threatCount: threatDatabase.knownThreats.size,
            timestamp: Date.now()
        }
    }));
    
    ws.on('close', () => {
        connectedClients.delete(ws);
        console.log('Client disconnected');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        connectedClients.delete(ws);
    });
});

// Broadcast to all connected clients
function broadcastToClients(data) {
    const message = JSON.stringify(data);
    connectedClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Real system monitoring functions
function getSystemMetrics() {
    return new Promise((resolve) => {
        const metrics = {
            cpu: Math.round(os.loadavg()[0] * 100) / 100,
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem(),
                percentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
            },
            platform: os.platform(),
            hostname: os.hostname(),
            uptime: os.uptime(),
            timestamp: Date.now()
        };
        
        // Get network interfaces
        const networkInterfaces = os.networkInterfaces();
        metrics.network = Object.keys(networkInterfaces).map(name => ({
            name,
            addresses: networkInterfaces[name].filter(addr => !addr.internal)
        }));
        
        resolve(metrics);
    });
}

// Real threat detection functions
function analyzeText(text) {
    const threats = [];
    const suspiciousPatterns = [
        { pattern: /urgent.{0,20}action.{0,20}required/gi, threat: 'Urgency manipulation detected', severity: 'high' },
        { pattern: /verify.{0,20}account/gi, threat: 'Account verification scam', severity: 'medium' },
        { pattern: /click.{0,20}here.{0,20}immediately/gi, threat: 'Suspicious call-to-action', severity: 'medium' },
        { pattern: /suspended.{0,20}account/gi, threat: 'Account suspension threat', severity: 'high' },
        { pattern: /congratulations.{0,20}winner/gi, threat: 'Fake lottery/prize scam', severity: 'high' },
        { pattern: /bitcoin|cryptocurrency|investment.{0,20}opportunity/gi, threat: 'Cryptocurrency scam', severity: 'medium' },
        { pattern: /<script|javascript:|eval\(|document\.write/gi, threat: 'Malicious script detected', severity: 'critical' },
        { pattern: /base64|eval|unescape|fromcharcode/gi, threat: 'Code obfuscation detected', severity: 'high' }
    ];
    
    let totalScore = 0;
    
    suspiciousPatterns.forEach(item => {
        const matches = text.match(item.pattern);
        if (matches) {
            const severityScore = {
                'low': 10,
                'medium': 25,
                'high': 40,
                'critical': 60
            };
            
            threats.push({
                threat: item.threat,
                severity: item.severity,
                matches: matches.length,
                score: severityScore[item.severity] * matches.length
            });
            
            totalScore += severityScore[item.severity] * matches.length;
        }
    });
    
    return {
        threatScore: Math.min(100, totalScore),
        riskLevel: totalScore > 60 ? 'critical' : totalScore > 30 ? 'high' : totalScore > 10 ? 'medium' : 'low',
        threats,
        analysis: {
            wordCount: text.split(/\s+/).length,
            suspiciousWords: threats.length,
            timestamp: Date.now()
        }
    };
}

function analyzeURL(url) {
    const threats = [];
    let totalScore = 0;
    
    const urlPatterns = [
        { pattern: /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/, threat: 'IP address instead of domain', score: 30 },
        { pattern: /\.tk$|\.ml$|\.ga$|\.cf$/i, threat: 'Free domain service', score: 25 },
        { pattern: /paypa1|faceb00k|goog1e|micr0soft|amazom|twiter|linkedln|netf1ix|app1e/i, threat: 'Typosquatting detected', score: 50 },
        { pattern: /bit\.ly|tinyurl|short\.link|t\.co/i, threat: 'URL shortener detected', score: 15 },
        { pattern: /[a-z]+-[a-z]+-[a-z]+\.[a-z]{2,}/i, threat: 'Suspicious hyphenated domain', score: 20 }
    ];
    
    urlPatterns.forEach(item => {
        if (item.pattern.test(url)) {
            threats.push({
                threat: item.threat,
                severity: item.score > 40 ? 'high' : item.score > 20 ? 'medium' : 'low',
                score: item.score
            });
            totalScore += item.score;
        }
    });
    
    // Check HTTPS
    if (!url.startsWith('https://')) {
        threats.push({
            threat: 'Non-HTTPS connection (insecure)',
            severity: 'medium',
            score: 15
        });
        totalScore += 15;
    }
    
    return {
        threatScore: Math.min(100, totalScore),
        riskLevel: totalScore > 50 ? 'critical' : totalScore > 25 ? 'high' : totalScore > 10 ? 'medium' : 'low',
        threats,
        analysis: {
            protocol: url.split('://')[0],
            domain: url.split('/')[2],
            timestamp: Date.now()
        }
    };
}

// Real network monitoring
function monitorNetworkConnections() {
    return new Promise((resolve) => {
        exec('netstat -an', (error, stdout, stderr) => {
            if (error) {
                resolve([]);
                return;
            }
            
            const connections = [];
            const lines = stdout.split('\n');
            
            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 4 && (parts[0] === 'TCP' || parts[0] === 'UDP')) {
                    connections.push({
                        protocol: parts[0],
                        localAddress: parts[1],
                        foreignAddress: parts[2],
                        state: parts[3],
                        timestamp: Date.now()
                    });
                }
            });
            
            resolve(connections);
        });
    });
}

// API Routes

// BlueSentinel SOC AI routes
app.use('/api/soc', blueSentinelAPI.getRouter());

// V1 API routes
app.use('/api/v1', eventsRouter);
app.use('/api/v1/gmail', gmailRouter);
if (process.env.ENABLE_WEBHOOKS !== 'false') {
    app.use('/api/v1/webhooks', webhooksRouter);
}
// Test endpoints (only in dev/demo mode)
if (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production') {
    app.use('/api/v1', testDataRouter);
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'operational', 
        timestamp: Date.now(),
        version: '1.0.0',
        uptime: process.uptime()
    });
});

// Get real system metrics
app.get('/api/system/metrics', async (req, res) => {
    try {
        const metrics = await getSystemMetrics();
        systemMetrics = metrics;
        res.json(metrics);
        
        // Broadcast to real-time clients
        broadcastToClients({
            type: 'system_metrics',
            data: metrics
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get system metrics' });
    }
});

// AI-Powered Text Analysis
app.post('/api/analyze/text', async (req, res) => {
    try {
        const { text, userId } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        
        // Use AI services for comprehensive analysis
        const aiAnalysis = await aiServices.analyzeTextWithAI(text);
        
        // Behavioral analysis if userId provided
        if (userId) {
            const behavioralAnalysis = await aiServices.analyzeBehavioralPatterns(userId, 'text_analysis');
            aiAnalysis.behavioralAnalysis = behavioralAnalysis;
        }
        
        // Store in threat database if significant
        if (aiAnalysis.threatScore > 30) {
            threatDatabase.knownThreats.add(crypto.createHash('sha256').update(text).digest('hex'));
        }
        
        // Generate AI recommendations
        aiAnalysis.recommendations = await aiServices.generateAIRecommendations(aiAnalysis);
        
        // Broadcast threat detection
        broadcastToClients({
            type: 'ai_threat_detected',
            data: {
                type: 'text',
                analysis: aiAnalysis,
                timestamp: Date.now()
            }
        });
        
        res.json(aiAnalysis);
    } catch (error) {
        console.error('AI text analysis error:', error);
        res.status(500).json({ error: 'AI analysis failed' });
    }
});

// AI-Powered URL Analysis
app.post('/api/analyze/url', async (req, res) => {
    try {
        const { url, userId } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Use AI services for comprehensive URL analysis
        const aiAnalysis = await aiServices.analyzeURLWithAI(url);
        
        // Behavioral analysis if userId provided
        if (userId) {
            const behavioralAnalysis = await aiServices.analyzeBehavioralPatterns(userId, 'url_analysis');
            aiAnalysis.behavioralAnalysis = behavioralAnalysis;
        }
        
        // Store suspicious domains
        if (aiAnalysis.anomalyScore > 25) {
            try {
                const domain = new URL(url).hostname;
                threatDatabase.phishingDomains.add(domain);
            } catch (e) {
                // Invalid URL format
            }
        }
        
        // Generate AI recommendations
        aiAnalysis.recommendations = await aiServices.generateAIRecommendations(aiAnalysis);
        
        // Broadcast threat detection
        broadcastToClients({
            type: 'ai_threat_detected',
            data: {
                type: 'url',
                analysis: aiAnalysis,
                url,
                timestamp: Date.now()
            }
        });
        
        res.json(aiAnalysis);
    } catch (error) {
        console.error('AI URL analysis error:', error);
        res.status(500).json({ error: 'AI URL analysis failed' });
    }
});

// Get network connections
app.get('/api/network/connections', async (req, res) => {
    try {
        const connections = await monitorNetworkConnections();
        systemMetrics.connections = connections;
        res.json(connections);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get network connections' });
    }
});

// Get threat intelligence summary
app.get('/api/threats/summary', (req, res) => {
    res.json({
        totalThreats: threatDatabase.knownThreats.size,
        suspiciousIPs: threatDatabase.suspiciousIPs.size,
        phishingDomains: threatDatabase.phishingDomains.size,
        maliciousHashes: threatDatabase.maliciousHashes.size,
        lastUpdate: Date.now()
    });
});

// Real-time consciousness monitoring simulation
app.get('/api/consciousness/status', (req, res) => {
    // Simulate consciousness monitoring with real system metrics
    const consciousness = {
        level: 95 + Math.random() * 5,
        authenticity: 96 + Math.random() * 4,
        memoryIntegrity: 97 + Math.random() * 3,
        quantumCoherence: 93 + Math.random() * 7,
        neuralActivity: systemMetrics.cpu || 0,
        timestamp: Date.now()
    };
    
    res.json(consciousness);
    
    // Broadcast consciousness update
    broadcastToClients({
        type: 'consciousness_update',
        data: consciousness
    });
});

// AI Chatbot for Threat Guidance
app.post('/api/ai/chat', async (req, res) => {
    try {
        const { message, context } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        // Generate AI response for security guidance
        const aiResponse = await aiServices.generateAIRecommendations({
            riskLevel: context?.riskLevel || 'medium',
            threatScore: context?.threatScore || 50
        });
        
        res.json({
            response: aiResponse[0]?.message || 'I can help you with security guidance. Please provide more details.',
            recommendations: aiResponse,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('AI chat error:', error);
        res.status(500).json({ error: 'AI chat failed' });
    }
});

// Behavioral Analysis Endpoint
app.post('/api/behavioral/analyze', async (req, res) => {
    try {
        const { userId, action, metadata } = req.body;
        if (!userId || !action) {
            return res.status(400).json({ error: 'User ID and action are required' });
        }
        
        const behavioralAnalysis = await aiServices.analyzeBehavioralPatterns(userId, action);
        
        res.json({
            userId,
            action,
            analysis: behavioralAnalysis,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Behavioral analysis error:', error);
        res.status(500).json({ error: 'Behavioral analysis failed' });
    }
});

// Comprehensive Threat Analysis
app.post('/api/analyze/comprehensive', async (req, res) => {
    try {
        const { text, url, userId, fileHash } = req.body;
        
        const results = {
            textAnalysis: null,
            urlAnalysis: null,
            behavioralAnalysis: null,
            overallRisk: 'low',
            recommendations: [],
            timestamp: Date.now()
        };
        
        // Analyze text if provided
        if (text) {
            results.textAnalysis = await aiServices.analyzeTextWithAI(text);
        }
        
        // Analyze URL if provided
        if (url) {
            results.urlAnalysis = await aiServices.analyzeURLWithAI(url);
        }
        
        // Behavioral analysis if userId provided
        if (userId) {
            results.behavioralAnalysis = await aiServices.analyzeBehavioralPatterns(userId, 'comprehensive_analysis');
        }
        
        // Determine overall risk
        const scores = [];
        if (results.textAnalysis) scores.push(results.textAnalysis.threatScore);
        if (results.urlAnalysis) scores.push(results.urlAnalysis.anomalyScore);
        if (results.behavioralAnalysis?.isAnomaly) scores.push(80);
        
        const maxScore = Math.max(...scores, 0);
        results.overallRisk = maxScore >= 80 ? 'critical' : maxScore >= 60 ? 'high' : maxScore >= 30 ? 'medium' : 'low';
        
        // Generate comprehensive recommendations
        results.recommendations = await aiServices.generateAIRecommendations({
            riskLevel: results.overallRisk,
            threatScore: maxScore
        });
        
        res.json(results);
    } catch (error) {
        console.error('Comprehensive analysis error:', error);
        res.status(500).json({ error: 'Comprehensive analysis failed' });
    }
});

// Authentication middleware
function authenticateRequest(req, res, next) {
    const authHeader = req.headers.authorization;
    const sessionToken = authHeader?.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : req.headers['x-session-token'] || req.query.token || req.body.token;
    
    if (!sessionToken) {
        return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    
    const session = userSessions.get(sessionToken);
    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    }
    
    if (Date.now() > session.expiresAt) {
        userSessions.delete(sessionToken);
        return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    
    req.user = session;
    req.sessionToken = sessionToken;
    next();
}

// OTP Authentication APIs
app.post('/api/auth/request-otp', async (req, res) => {
    try {
        const { email, phone } = req.body;
        
        // Validate email format
        if (!email && !phone) {
            return res.status(400).json({ error: 'Email or phone number is required' });
        }
        
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        
        const otpData = {
            otp,
            email: email || null,
            phone: phone || null,
            expiresAt,
            attempts: 0
        };
        
        otpStore.set(email || phone, otpData);
        
        // Send OTP via email if email provided
        let emailSent = false;
        let emailPreviewUrl = null;
        if (email) {
            try {
                const emailResult = await sendOTPEmail(email, otp);
                emailSent = true;
                emailPreviewUrl = emailResult?.previewUrl;
                if (emailPreviewUrl) {
                    console.log(`\n✅ OTP sent to ${email}`);
                    console.log(`📧 View email online: ${emailPreviewUrl}\n`);
                }
            } catch (error) {
                console.error('❌ Error sending email:', error.message);
                console.log(`⚠️ Email sending failed. Check email configuration.`);
            }
        }
        
        // ALWAYS log OTP to console (as backup) - MAKE IT EXTRA VISIBLE
        console.log(`\n\n`);
        console.log(`\x1b[103m\x1b[90m${' '.repeat(70)}\x1b[0m`);
        console.log(`\x1b[103m\x1b[90m${' '.repeat(70)}\x1b[0m`);
        console.log(`\x1b[103m\x1b[90m${'🔐'.padStart(35)} OTP CODE GENERATED ${'🔐'.padEnd(33)}\x1b[0m`);
        console.log(`\x1b[103m\x1b[90m${' '.repeat(70)}\x1b[0m`);
        console.log(`\x1b[103m\x1b[90m${' '.repeat(70)}\x1b[0m`);
        console.log(`\x1b[103m\x1b[90m  📧 Email: \x1b[1m\x1b[97m${email || phone}\x1b[0m\x1b[103m\x1b[90m${' '.repeat(70 - 13 - (email || phone).length)}\x1b[0m`);
        console.log(`\x1b[103m\x1b[90m  🔑 OTP Code: \x1b[1m\x1b[97m\x1b[5m${otp}\x1b[0m\x1b[103m\x1b[90m${' '.repeat(70 - 16 - otp.length)}\x1b[0m`);
        console.log(`\x1b[103m\x1b[90m  ⏰ Valid for: 5 minutes${' '.repeat(70 - 25)}\x1b[0m`);
        if (!emailSent && email) {
            console.log(`\x1b[103m\x1b[90m  ⚠️  EMAIL NOT SENT - Use the code above to login${' '.repeat(70 - 52)}\x1b[0m`);
            console.log(`\x1b[103m\x1b[90m  📝 To enable email, add Gmail App Password to .env${' '.repeat(70 - 56)}\x1b[0m`);
        } else if (emailSent) {
            console.log(`\x1b[103m\x1b[90m  ✅ Email sent successfully!${' '.repeat(70 - 31)}\x1b[0m`);
        }
        console.log(`\x1b[103m\x1b[90m${' '.repeat(70)}\x1b[0m`);
        console.log(`\x1b[103m\x1b[90m${' '.repeat(70)}\x1b[0m`);
        console.log(`\n`);
        // Also print a simple, bold version that's impossible to miss
        console.log(`\x1b[1m\x1b[93m═══════════════════════════════════════════════════════════════════════════════\x1b[0m`);
        console.log(`\x1b[1m\x1b[93m  🔐 YOUR OTP CODE IS: \x1b[5m\x1b[96m\x1b[1m${otp}\x1b[0m\x1b[1m\x1b[93m 🔐\x1b[0m`);
        console.log(`\x1b[1m\x1b[93m  📧 For email: ${email || phone}\x1b[0m`);
        console.log(`\x1b[1m\x1b[93m═══════════════════════════════════════════════════════════════════════════════\x1b[0m`);
        console.log(`\n\n`);
        console.log(`${'='.repeat(70)}\n`);
        
        res.json({
            success: true,
            message: email && emailSent ? `OTP sent to ${email}. Please check your inbox.` : 
                    email && !emailSent ? `OTP code logged to server console. Email not configured - check terminal for code.` :
                    'OTP generated successfully',
            expiresIn: 300, // seconds
            emailSent: emailSent,
            previewUrl: emailPreviewUrl
        });
    } catch (error) {
        console.error('Error in request-otp:', error);
        res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }
});

app.post('/api/auth/verify-otp', (req, res) => {
    const { email, phone, otp } = req.body;
    const identifier = email || phone;
    const storedOtp = otpStore.get(identifier);
    
    if (!storedOtp) {
        return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    }
    
    if (Date.now() > storedOtp.expiresAt) {
        otpStore.delete(identifier);
        return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }
    
    if (storedOtp.attempts >= 3) {
        otpStore.delete(identifier);
        return res.status(400).json({ error: 'Too many attempts. Please request a new OTP.' });
    }
    
    storedOtp.attempts++;
    
    if (storedOtp.otp !== otp) {
        if (storedOtp.attempts >= 3) {
            otpStore.delete(identifier);
        }
        return res.status(400).json({ error: 'Invalid OTP. ' + (3 - storedOtp.attempts) + ' attempts remaining.' });
    }
    
    // OTP verified - create session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const userEmail = email || storedOtp.email;
    userSessions.set(sessionToken, {
        email: userEmail || null,
        phone: phone || storedOtp.phone || null,
        authenticatedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });
    
    otpStore.delete(identifier);
    
    res.json({
        success: true,
        message: 'OTP verified successfully',
        sessionToken,
        user: {
            email: userEmail,
            phone: phone || storedOtp.phone
        },
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
    });
});

// Check authentication status
app.get('/api/auth/status', authenticateRequest, (req, res) => {
    res.json({
        success: true,
        authenticated: true,
        user: {
            email: req.user.email,
            phone: req.user.phone,
            authenticatedAt: req.user.authenticatedAt
        }
    });
});

// Logout endpoint
app.post('/api/auth/logout', authenticateRequest, (req, res) => {
    userSessions.delete(req.sessionToken);
    res.json({ success: true, message: 'Logged out successfully' });
});

// Settings Management APIs
app.get('/api/settings', (req, res) => {
    res.json(appSettings);
});

app.post('/api/settings', (req, res) => {
    const { autoBlockThreshold, warningThreshold, notifications, integrations } = req.body;
    
    if (autoBlockThreshold !== undefined) appSettings.autoBlockThreshold = autoBlockThreshold;
    if (warningThreshold !== undefined) appSettings.warningThreshold = warningThreshold;
    if (notifications) appSettings.notifications = { ...appSettings.notifications, ...notifications };
    if (integrations) appSettings.integrations = { ...appSettings.integrations, ...integrations };
    
    // Broadcast settings update
    broadcastToClients({
        type: 'settings_updated',
        data: appSettings
    });
    
    res.json({
        success: true,
        settings: appSettings,
        message: 'Settings updated successfully'
    });
});

// Threat Management APIs
app.get('/api/threats/active', (req, res) => {
    const threats = threatSimulator.getActiveThreats();
    
    // Categorize threats
    const critical = threats.filter(t => t.severity === 'critical');
    const high = threats.filter(t => t.severity === 'high');
    const medium = threats.filter(t => t.severity === 'medium');
    
    res.json({
        total: threats.length,
        critical: critical.length,
        high: high.length,
        medium: medium.length,
        threats: threats.sort((a, b) => b.threatScore - a.threatScore)
    });
});

app.get('/api/threats/:threatId', (req, res) => {
    const { threatId } = req.params;
    const threat = threatSimulator.getThreatDetails(threatId);
    
    if (!threat) {
        return res.status(404).json({ error: 'Threat not found' });
    }
    
    res.json(threat);
});

app.post('/api/threats/:threatId/investigate', (req, res) => {
    const { threatId } = req.params;
    const threat = threatSimulator.getThreatDetails(threatId);
    
    if (!threat) {
        return res.status(404).json({ error: 'Threat not found' });
    }
    
    // Add investigation details
    threat.investigation = {
        startedAt: Date.now(),
        investigator: req.body.investigator || 'System',
        status: 'in_progress',
        notes: []
    };
    
    broadcastToClients({
        type: 'threat_investigation_started',
        data: threat
    });
    
    res.json({
        success: true,
        threat,
        message: 'Investigation started'
    });
});

app.post('/api/threats/:threatId/block', (req, res) => {
    const { threatId } = req.params;
    const threat = threatSimulator.getThreatDetails(threatId);
    
    if (!threat) {
        return res.status(404).json({ error: 'Threat not found' });
    }
    
    threat.blocked = true;
    threat.blockedAt = Date.now();
    threat.blockedBy = req.body.blockedBy || 'System';
    
    // Resolve the threat
    threatSimulator.resolveThreat(threatId, 'blocked');
    
    broadcastToClients({
        type: 'threat_blocked',
        data: threat
    });
    
    res.json({
        success: true,
        threat,
        message: 'Threat blocked successfully'
    });
});

app.post('/api/threats/:threatId/resolve', (req, res) => {
    const { threatId } = req.params;
    const resolution = req.body.resolution || 'resolved';
    
    const threat = threatSimulator.resolveThreat(threatId, resolution);
    
    if (!threat) {
        return res.status(404).json({ error: 'Threat not found' });
    }
    
    threat.resolvedBy = req.body.resolvedBy || 'System';
    
    broadcastToClients({
        type: 'threat_resolved',
        data: threat
    });
    
    res.json({
        success: true,
        threat,
        message: 'Threat resolved successfully'
    });
});

app.post('/api/threats/:threatId/escalate', (req, res) => {
    const { threatId } = req.params;
    const threat = threatSimulator.getThreatDetails(threatId);
    
    if (!threat) {
        return res.status(404).json({ error: 'Threat not found' });
    }
    
    threat.escalated = true;
    threat.escalatedAt = Date.now();
    threat.escalatedTo = req.body.escalatedTo || 'Security Team';
    threat.escalationReason = req.body.reason || 'High severity threat requiring attention';
    
    broadcastToClients({
        type: 'threat_escalated',
        data: threat
    });
    
    res.json({
        success: true,
        threat,
        message: 'Threat escalated successfully'
    });
});

// Generate new threat (for simulation)
app.post('/api/threats/generate', (req, res) => {
    const threat = threatSimulator.generateRandomThreat();
    
    // Check against settings to determine if it should be auto-blocked
    if (threat.threatScore <= appSettings.autoBlockThreshold) {
        threat.autoBlocked = true;
        threat.blockedAt = Date.now();
        threatSimulator.resolveThreat(threat.threatId, 'auto_blocked');
    }
    
    broadcastToClients({
        type: 'new_threat_detected',
        data: threat
    });
    
    res.json({
        success: true,
        threat,
        message: 'New threat generated'
    });
});

// Emergency protocols
app.post('/api/emergency/activate', (req, res) => {
    const { protocol } = req.body;
    
    console.log(`Emergency protocol activated: ${protocol}`);
    
    // Broadcast emergency activation
    broadcastToClients({
        type: 'emergency_activated',
        data: {
            protocol,
            timestamp: Date.now(),
            status: 'active'
        }
    });
    
    res.json({ 
        status: 'activated', 
        protocol, 
        timestamp: Date.now() 
    });
});

// Serve static files - must be after API routes
const prototypesPath = path.join(__dirname, '../prototypes');
app.use(express.static(prototypesPath));
// Also serve prototypes directory at /prototypes path
app.use('/prototypes', express.static(prototypesPath));

// Serve dev directory for fixtures (only in development/demo mode)
if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
    const devPath = path.join(__dirname, '..');
    app.use('/dev', express.static(path.join(devPath, 'dev')));
}

// Demo fixtures endpoint (only when DEMO_MODE=true)
app.get('/api/v1/demo/fixtures', (req, res) => {
    if (process.env.DEMO_MODE !== 'true' && process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Demo fixtures not available in production' });
    }
    
    try {
        const fixturesPath = path.join(__dirname, '../dev/fixtures/events.json');
        const fixtures = require(fixturesPath);
        res.json(fixtures);
    } catch (error) {
        console.error('Error loading fixtures:', error);
        res.status(404).json({ error: 'Fixtures not found' });
    }
});

// Serve HTML files directly from root
app.get('/', (req, res) => {
    res.sendFile(path.join(prototypesPath, 'neuroshield_platform.html'));
});

// Serve any HTML file from prototypes directory
app.get('/:filename', (req, res, next) => {
    const filename = req.params.filename;
    // Only handle .html files and skip API routes
    if (filename.endsWith('.html') && !filename.startsWith('api')) {
        const filePath = path.join(prototypesPath, filename);
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }
    }
    next();
});

// Start real-time monitoring loops
function startMonitoring() {
    // Update system metrics every 5 seconds
    setInterval(async () => {
        try {
            const metrics = await getSystemMetrics();
            systemMetrics = metrics;
            
            broadcastToClients({
                type: 'system_update',
                data: metrics
            });
        } catch (error) {
            console.error('Monitoring error:', error);
        }
    }, 5000);
    
    // Generate random threats periodically (every 15-45 seconds)
    setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance each interval
            const threat = threatSimulator.generateRandomThreat();
            
            // Check against settings to determine if it should be auto-blocked
            if (threat.threatScore <= appSettings.autoBlockThreshold) {
                threat.autoBlocked = true;
                threat.blockedAt = Date.now();
                threatSimulator.resolveThreat(threat.threatId, 'auto_blocked');
            }
            
            // Broadcast to all connected clients
            broadcastToClients({
                type: 'new_threat_detected',
                data: threat
            });
            
            // Send notifications if enabled
            if (appSettings.notifications.realtimeDashboard) {
                console.log(`🚨 New threat detected: ${threat.title} (Score: ${threat.threatScore})`);
            }
        }
    }, 15000);
    
    // Network monitoring every 10 seconds
    setInterval(async () => {
        try {
            const connections = await monitorNetworkConnections();
            systemMetrics.connections = connections;
            
            // Check for suspicious connections
            const suspiciousConnections = connections.filter(conn => {
                // Add your suspicious connection logic here
                return conn.foreignAddress.includes('127.0.0.1') === false && 
                       conn.state === 'ESTABLISHED';
            });
            
            if (suspiciousConnections.length > 0) {
                broadcastToClients({
                    type: 'network_alert',
                    data: {
                        suspicious: suspiciousConnections,
                        timestamp: Date.now()
                    }
                });
            }
        } catch (error) {
            console.error('Network monitoring error:', error);
        }
    }, 10000);
}

// Start the server
if (process.env.PORT && !process.env.WS_PORT) {
    // Production: server already created for WebSocket
    httpServer.listen(PORT, HOST, () => {
        const env = process.env.NODE_ENV || 'development';
        console.log(`🚀 CyberAgiesX Backend Server running on ${HOST}:${PORT} (${env})`);
        console.log(`📡 WebSocket server attached to main server`);
        console.log(`🌐 Access the platform at: http${env === 'production' ? 's' : ''}://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
        console.log(`🔗 API endpoints available at: http${env === 'production' ? 's' : ''}://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api`);
        console.log(`⚡ Real-time updates via WebSocket on same port`);
        console.log(``);
        console.log(`📋 Available APIs:`);
        console.log(`   - GET /api/v1/events - List events`);
        console.log(`   - POST /api/v1/webhooks/twilio/call - Twilio webhook`);
        console.log(`   - POST /api/analyze/text - Analyze text content`);
        console.log(`   - POST /api/analyze/url - Analyze URLs`);
        console.log(`   - GET /api/system/metrics - Get system metrics`);
        console.log(`   - GET /api/threats/summary - Get threat summary`);
        console.log(``);
        
        // Initialize object storage
        if (process.env.ENABLE_WEBHOOKS !== 'false') {
            initMinio();
        }
        
        // Initialize email service
        verifyEmailConnection().then(verified => {
            if (verified) {
                console.log('✅ Email service ready');
            } else {
                console.log('⚠️ Email service not configured. OTP emails will not be sent.');
                console.log('⚠️ Check server console for OTP codes during development.');
            }
        }).catch(err => {
            console.error('Email service initialization error:', err);
        });
        
        startMonitoring();
    });
} else {
    // Development: separate ports
    app.listen(PORT, HOST, () => {
        console.log(`🚀 CyberAgiesX Backend Server running on ${HOST}:${PORT}`);
        console.log(`📡 WebSocket server running on port ${WS_PORT}`);
        console.log(`🌐 Access the platform at: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
        console.log(`🔗 API endpoints available at: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api`);
        console.log(`⚡ Real-time updates via WebSocket: ws://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${WS_PORT}`);
        console.log(``);
        console.log(`📋 Available APIs:`);
        console.log(`   - GET /api/v1/events - List events`);
        console.log(`   - POST /api/v1/webhooks/twilio/call - Twilio webhook`);
        console.log(`   - POST /api/analyze/text - Analyze text content`);
        console.log(`   - POST /api/analyze/url - Analyze URLs`);
        console.log(`   - GET /api/system/metrics - Get system metrics`);
        console.log(`   - GET /api/threats/summary - Get threat summary`);
        console.log(``);
        
        // Initialize object storage
        if (process.env.ENABLE_WEBHOOKS !== 'false') {
            initMinio();
        }
        
        // Initialize email service
        verifyEmailConnection().then(verified => {
            if (verified) {
                console.log('✅ Email service ready');
            } else {
                console.log('⚠️ Email service not configured. OTP emails will not be sent.');
                console.log('⚠️ Check server console for OTP codes during development.');
            }
        }).catch(err => {
            console.error('Email service initialization error:', err);
        });
        
        startMonitoring();
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down CyberAgiesX server...');
    wss.close();
    process.exit(0);
});

module.exports = app;

