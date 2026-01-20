const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../prototypes')));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'operational', 
        timestamp: Date.now(),
        version: '1.0.0',
        uptime: process.uptime()
    });
});

// Simple text analysis
app.post('/api/analyze/text', (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        
        // Simple pattern-based analysis
        const analysis = analyzeTextSimple(text);
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ error: 'Analysis failed' });
    }
});

// Simple URL analysis
app.post('/api/analyze/url', (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Simple URL analysis
        const analysis = analyzeURLSimple(url);
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ error: 'URL analysis failed' });
    }
});

// Simple text analysis function
function analyzeTextSimple(text) {
    const threats = [];
    let totalScore = 0;
    
    const suspiciousPatterns = [
        { pattern: /urgent.{0,20}action.{0,20}required/gi, threat: 'Urgency manipulation detected', score: 40 },
        { pattern: /verify.{0,20}account/gi, threat: 'Account verification scam', score: 35 },
        { pattern: /click.{0,20}here.{0,20}immediately/gi, threat: 'Suspicious call-to-action', score: 30 },
        { pattern: /suspended.{0,20}account/gi, threat: 'Account suspension threat', score: 45 },
        { pattern: /congratulations.{0,20}winner/gi, threat: 'Fake lottery/prize scam', score: 50 },
        { pattern: /bitcoin|cryptocurrency|investment.{0,20}opportunity/gi, threat: 'Cryptocurrency scam', score: 35 },
        { pattern: /password.{0,20}expired/gi, threat: 'Password expiration scam', score: 30 },
        { pattern: /bank.{0,20}account.{0,20}locked/gi, threat: 'Banking scam', score: 40 },
        { pattern: /<script|javascript:|eval\(|document\.write/gi, threat: 'Malicious script detected', score: 80 },
        { pattern: /base64|eval|unescape|fromcharcode/gi, threat: 'Code obfuscation detected', score: 70 }
    ];
    
    suspiciousPatterns.forEach(item => {
        const matches = text.match(item.pattern);
        if (matches) {
            threats.push({
                threat: item.threat,
                severity: item.score > 40 ? 'high' : item.score > 20 ? 'medium' : 'low',
                score: item.score,
                matches: matches.length
            });
            totalScore += item.score * matches.length;
        }
    });
    
    // Sentiment analysis (simple)
    const positiveWords = ['good', 'great', 'excellent', 'safe', 'secure', 'trusted'];
    const negativeWords = ['urgent', 'immediate', 'suspended', 'locked', 'expired', 'verify'];
    
    let sentimentScore = 0;
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
        if (positiveWords.includes(word)) sentimentScore += 1;
        if (negativeWords.includes(word)) sentimentScore -= 2;
    });
    
    const threatScore = Math.min(100, totalScore);
    const riskLevel = threatScore > 60 ? 'high' : threatScore > 30 ? 'medium' : 'low';
    
    return {
        threatScore,
        riskLevel,
        detectedThreats: threats,
        sentimentAnalysis: {
            score: sentimentScore,
            comparative: sentimentScore / words.length,
            positive: positiveWords.filter(word => text.toLowerCase().includes(word)),
            negative: negativeWords.filter(word => text.toLowerCase().includes(word))
        },
        explanations: [
            `Detected ${threats.length} suspicious patterns`,
            `Overall threat score: ${threatScore}/100`,
            `Sentiment analysis: ${sentimentScore > 0 ? 'positive' : sentimentScore < 0 ? 'negative' : 'neutral'}`
        ],
        recommendations: generateRecommendations(threatScore, riskLevel)
    };
}

// Simple URL analysis function
function analyzeURLSimple(url) {
    const threats = [];
    let totalScore = 0;
    
    const urlPatterns = [
        { pattern: /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/, threat: 'IP address instead of domain', score: 30 },
        { pattern: /\.tk$|\.ml$|\.ga$|\.cf$/i, threat: 'Free domain service', score: 25 },
        { pattern: /paypa1|faceb00k|goog1e|micr0soft|amazom|twiter|linkedln|netf1ix|app1e/i, threat: 'Typosquatting detected', score: 50 },
        { pattern: /bit\.ly|tinyurl|short\.link|t\.co/i, threat: 'URL shortener detected', score: 15 },
        { pattern: /[a-z]+-[a-z]+-[a-z]+\.[a-z]{2,}/i, threat: 'Suspicious hyphenated domain', score: 20 },
        { pattern: /[0-9]{10,}/, threat: 'Suspicious numeric domain', score: 25 }
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
    
    const anomalyScore = Math.min(100, totalScore);
    const riskLevel = anomalyScore > 50 ? 'high' : anomalyScore > 25 ? 'medium' : 'low';
    
    return {
        anomalyScore,
        riskLevel,
        detectedThreats: threats,
        domain: url.split('/')[2] || 'Unknown',
        protocol: url.split('://')[0] || 'Unknown',
        explanations: [
            `Detected ${threats.length} suspicious URL patterns`,
            `Overall anomaly score: ${anomalyScore}/100`,
            `Domain: ${url.split('/')[2] || 'Unknown'}`
        ],
        recommendations: generateRecommendations(anomalyScore, riskLevel)
    };
}

// Generate recommendations based on score
function generateRecommendations(score, riskLevel) {
    const recommendations = [];
    
    if (riskLevel === 'high' || score > 60) {
        recommendations.push({
            action: 'BLOCK',
            priority: 'high',
            message: 'High risk detected. Do not proceed.',
            steps: [
                'Do not click any links or download attachments',
                'Report this to your security team immediately',
                'Run a full system scan'
            ]
        });
    } else if (riskLevel === 'medium' || score > 30) {
        recommendations.push({
            action: 'VERIFY',
            priority: 'medium',
            message: 'Medium risk detected. Verify before proceeding.',
            steps: [
                'Contact sender through alternative channel',
                'Check official website for similar communications',
                'Look for security indicators (HTTPS, verified sender)'
            ]
        });
    } else {
        recommendations.push({
            action: 'PROCEED',
            priority: 'low',
            message: 'Low risk detected. Content appears safe.',
            steps: [
                'Continue normal operation',
                'Maintain security awareness',
                'Report any suspicious behavior'
            ]
        });
    }
    
    return recommendations;
}

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 CyberAgiesX Simple Server running on port ${PORT}`);
    console.log(`🌐 Access the platform at: http://localhost:${PORT}`);
    console.log(`📡 API endpoints available at: http://localhost:${PORT}/api/`);
});

module.exports = app;
