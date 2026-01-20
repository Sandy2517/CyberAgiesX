const OpenAI = require('openai');
const natural = require('natural');
const Sentiment = require('sentiment');
const nlp = require('node-nlp');
const axios = require('axios');
// Optional ML packages - will use fallback if not available
let IsolationForest = null;
try {
    IsolationForest = require('ml-isolation-forest').IsolationForest;
} catch (e) {
    console.warn('ml-isolation-forest not available, using fallback anomaly detection');
}
const winston = require('winston');

// Configure logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'cyberagiesx.log' })
    ]
});

// Initialize AI services
class AIServices {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'demo-key'
        });
        
        this.sentiment = new Sentiment();
        this.nlpManager = new nlp.NlpManager({ languages: ['en'] });
        this.behavioralModel = null;
        this.isolationForest = IsolationForest ? new IsolationForest() : null;
        this.userProfiles = new Map();
        this.threatPatterns = new Map();
        
        this.initializeModels();
    }

    async initializeModels() {
        try {
            // Initialize NLP model
            await this.nlpManager.addLanguage('en');
            await this.nlpManager.addDocument('en', 'urgent action required', 'phishing');
            await this.nlpManager.addDocument('en', 'verify your account', 'phishing');
            await this.nlpManager.addDocument('en', 'click here immediately', 'phishing');
            await this.nlpManager.addDocument('en', 'account suspended', 'phishing');
            await this.nlpManager.addDocument('en', 'congratulations you won', 'scam');
            await this.nlpManager.addDocument('en', 'bitcoin investment opportunity', 'scam');
            await this.nlpManager.addDocument('en', 'normal business email', 'legitimate');
            await this.nlpManager.addDocument('en', 'meeting reminder', 'legitimate');
            await this.nlpManager.addDocument('en', 'project update', 'legitimate');
            
            await this.nlpManager.train();
            await this.nlpManager.save();
            
            logger.info('AI models initialized successfully');
        } catch (error) {
            logger.error('Error initializing AI models:', error);
        }
    }

    // 1. NLP / Text Analysis AI
    async analyzeTextWithAI(text) {
        try {
            const results = {
                openaiAnalysis: null,
                sentimentAnalysis: null,
                nlpClassification: null,
                threatScore: 0,
                riskLevel: 'low',
                explanations: [],
                recommendations: []
            };

            // OpenAI GPT Analysis
            if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'demo-key') {
                try {
                    const completion = await this.openai.chat.completions.create({
                        model: "gpt-3.5-turbo",
                        messages: [{
                            role: "system",
                            content: "You are a cybersecurity expert analyzing text for phishing, scams, and malicious intent. Provide a JSON response with threat_score (0-100), risk_level (low/medium/high/critical), and explanation."
                        }, {
                            role: "user",
                            content: `Analyze this text for security threats: "${text}"`
                        }],
                        max_tokens: 300
                    });

                    const aiResponse = JSON.parse(completion.choices[0].message.content);
                    results.openaiAnalysis = aiResponse;
                    results.threatScore = Math.max(results.threatScore, aiResponse.threat_score || 0);
                } catch (error) {
                    logger.warn('OpenAI API not available, using fallback analysis');
                }
            }

            // Sentiment Analysis
            const sentimentResult = this.sentiment.analyze(text);
            results.sentimentAnalysis = {
                score: sentimentResult.score,
                comparative: sentimentResult.comparative,
                positive: sentimentResult.positive,
                negative: sentimentResult.negative
            };

            // NLP Classification
            const nlpResult = await this.nlpManager.process('en', text);
            results.nlpClassification = {
                intent: nlpResult.intent,
                score: nlpResult.score,
                entities: nlpResult.entities
            };

            // Pattern-based analysis
            const patterns = this.analyzeTextPatterns(text);
            results.patternAnalysis = patterns;
            results.threatScore = Math.max(results.threatScore, patterns.threatScore);

            // Generate explanations and recommendations
            results.explanations = this.generateExplanations(results);
            results.recommendations = this.generateRecommendations(results);

            // Determine final risk level
            results.riskLevel = this.determineRiskLevel(results.threatScore);

            return results;
        } catch (error) {
            logger.error('Error in AI text analysis:', error);
            return { error: 'Analysis failed', threatScore: 0, riskLevel: 'unknown' };
        }
    }

    analyzeTextPatterns(text) {
        const suspiciousPatterns = [
            { pattern: /urgent.{0,20}action.{0,20}required/gi, threat: 'Urgency manipulation', score: 40 },
            { pattern: /verify.{0,20}account/gi, threat: 'Account verification scam', score: 35 },
            { pattern: /click.{0,20}here.{0,20}immediately/gi, threat: 'Suspicious call-to-action', score: 30 },
            { pattern: /suspended.{0,20}account/gi, threat: 'Account suspension threat', score: 45 },
            { pattern: /congratulations.{0,20}winner/gi, threat: 'Fake lottery/prize scam', score: 50 },
            { pattern: /bitcoin|cryptocurrency|investment.{0,20}opportunity/gi, threat: 'Cryptocurrency scam', score: 35 },
            { pattern: /<script|javascript:|eval\(|document\.write/gi, threat: 'Malicious script', score: 80 },
            { pattern: /base64|eval|unescape|fromcharcode/gi, threat: 'Code obfuscation', score: 70 },
            { pattern: /password.{0,20}expired/gi, threat: 'Password expiration scam', score: 30 },
            { pattern: /bank.{0,20}account.{0,20}locked/gi, threat: 'Banking scam', score: 40 }
        ];

        let totalScore = 0;
        const detectedThreats = [];

        suspiciousPatterns.forEach(item => {
            const matches = text.match(item.pattern);
            if (matches) {
                detectedThreats.push({
                    threat: item.threat,
                    score: item.score,
                    matches: matches.length
                });
                totalScore += item.score * matches.length;
            }
        });

        return {
            threatScore: Math.min(100, totalScore),
            detectedThreats,
            wordCount: text.split(/\s+/).length,
            suspiciousWords: detectedThreats.length
        };
    }

    // 2. Threat Detection AI
    async analyzeURLWithAI(url) {
        try {
            const results = {
                virustotalAnalysis: null,
                googleSafeBrowsing: null,
                anomalyScore: 0,
                riskLevel: 'low',
                explanations: [],
                recommendations: []
            };

            // VirusTotal API Analysis
            if (process.env.VIRUSTOTAL_API_KEY) {
                try {
                    const vtResponse = await axios.get(`https://www.virustotal.com/vtapi/v2/url/report`, {
                        params: {
                            apikey: process.env.VIRUSTOTAL_API_KEY,
                            resource: url
                        },
                        timeout: 10000
                    });
                    if (vtResponse.data && vtResponse.data.response_code === 1) {
                        results.virustotalAnalysis = vtResponse.data;
                        const positives = vtResponse.data.positives || 0;
                        const total = vtResponse.data.total || 1;
                        results.anomalyScore = Math.max(results.anomalyScore, (positives / total) * 100);
                    }
                } catch (error) {
                    logger.warn('VirusTotal API not available:', error.message);
                }
            }

            // URLScan.io API Analysis
            if (process.env.URLSCAN_API_KEY) {
                try {
                    // First submit URL for scanning
                    const submitResponse = await axios.post('https://urlscan.io/api/v1/scan/', {
                        url: url,
                        public: 'on'
                    }, {
                        headers: {
                            'API-Key': process.env.URLSCAN_API_KEY,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });
                    
                    if (submitResponse.data && submitResponse.data.uuid) {
                        // Wait a moment then get results
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        const resultResponse = await axios.get(`https://urlscan.io/api/v1/result/${submitResponse.data.uuid}`, {
                            headers: {
                                'API-Key': process.env.URLSCAN_API_KEY
                            },
                            timeout: 10000
                        });
                        
                        if (resultResponse.data) {
                            results.urlscanAnalysis = {
                                verdicts: resultResponse.data.verdicts,
                                stats: resultResponse.data.stats,
                                task: resultResponse.data.task
                            };
                            if (resultResponse.data.verdicts && resultResponse.data.verdicts.malicious) {
                                results.anomalyScore = Math.max(results.anomalyScore, 85);
                            }
                        }
                    }
                } catch (error) {
                    logger.warn('URLScan.io API not available:', error.message);
                }
            }

            // AbuseIPDB API Analysis (if URL is an IP)
            if (process.env.ABUSEIPDB_API_KEY) {
                try {
                    const urlObj = new URL(url);
                    const hostname = urlObj.hostname;
                    // Check if hostname is an IP address
                    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
                    if (ipPattern.test(hostname)) {
                        const ipResponse = await axios.get('https://api.abuseipdb.com/api/v2/check', {
                            params: {
                                ipAddress: hostname,
                                maxAgeInDays: 90,
                                verbose: ''
                            },
                            headers: {
                                'Key': process.env.ABUSEIPDB_API_KEY,
                                'Accept': 'application/json'
                            },
                            timeout: 10000
                        });
                        
                        if (ipResponse.data && ipResponse.data.data) {
                            results.abuseipdbAnalysis = ipResponse.data.data;
                            if (ipResponse.data.data.abuseConfidenceScore > 50) {
                                results.anomalyScore = Math.max(results.anomalyScore, ipResponse.data.data.abuseConfidenceScore);
                            }
                        }
                    }
                } catch (error) {
                    logger.warn('AbuseIPDB API not available:', error.message);
                }
            }

            // Google Safe Browsing API
            if (process.env.GOOGLE_SAFE_BROWSING_API_KEY) {
                try {
                    const gsbResponse = await axios.post(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_SAFE_BROWSING_API_KEY}`, {
                        client: { clientId: "cyberagiesx", clientVersion: "1.0.0" },
                        threatInfo: {
                            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
                            platformTypes: ["ANY_PLATFORM"],
                            threatEntryTypes: ["URL"],
                            threatEntries: [{ url: url }]
                        }
                    });
                    results.googleSafeBrowsing = gsbResponse.data;
                } catch (error) {
                    logger.warn('Google Safe Browsing API not available');
                }
            }

            // Pattern-based URL analysis
            const urlPatterns = this.analyzeURLPatterns(url);
            results.urlPatterns = urlPatterns;
            results.anomalyScore = urlPatterns.threatScore;

            // Generate explanations and recommendations
            results.explanations = this.generateURLExplanations(results);
            results.recommendations = this.generateURLRecommendations(results);

            results.riskLevel = this.determineRiskLevel(results.anomalyScore);

            return results;
        } catch (error) {
            logger.error('Error in AI URL analysis:', error);
            return { error: 'URL analysis failed', anomalyScore: 0, riskLevel: 'unknown' };
        }
    }

    analyzeURLPatterns(url) {
        const urlThreats = [];
        let totalScore = 0;

        const patterns = [
            { pattern: /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/, threat: 'IP address instead of domain', score: 30 },
            { pattern: /\.tk$|\.ml$|\.ga$|\.cf$/i, threat: 'Free domain service', score: 25 },
            { pattern: /paypa1|faceb00k|goog1e|micr0soft|amazom|twiter|linkedln|netf1ix|app1e/i, threat: 'Typosquatting', score: 50 },
            { pattern: /bit\.ly|tinyurl|short\.link|t\.co/i, threat: 'URL shortener', score: 15 },
            { pattern: /[a-z]+-[a-z]+-[a-z]+\.[a-z]{2,}/i, threat: 'Suspicious hyphenated domain', score: 20 },
            { pattern: /[0-9]{10,}/, threat: 'Suspicious numeric domain', score: 25 }
        ];

        patterns.forEach(item => {
            if (item.pattern.test(url)) {
                urlThreats.push({
                    threat: item.threat,
                    score: item.score
                });
                totalScore += item.score;
            }
        });

        // Check HTTPS
        if (!url.startsWith('https://')) {
            urlThreats.push({
                threat: 'Non-HTTPS connection',
                score: 15
            });
            totalScore += 15;
        }

        return {
            threatScore: Math.min(100, totalScore),
            detectedThreats: urlThreats,
            domain: url.split('/')[2],
            protocol: url.split('://')[0]
        };
    }

    // 3. Behavioral AI / Cognitive Models
    async analyzeBehavioralPatterns(userId, action) {
        try {
            if (!this.userProfiles.has(userId)) {
                this.userProfiles.set(userId, {
                    loginTimes: [],
                    browsingPatterns: [],
                    fileAccess: [],
                    communicationStyle: [],
                    riskTolerance: 0.5,
                    anomalyCount: 0
                });
            }

            const profile = this.userProfiles.get(userId);
            const currentTime = new Date();
            
            // Update behavioral patterns
            profile.loginTimes.push(currentTime.getHours());
            profile.browsingPatterns.push(action);
            
            // Detect anomalies using Isolation Forest or fallback method
            const features = this.extractBehavioralFeatures(profile);
            let anomalyScore = 0;
            
            if (this.isolationForest) {
                try {
                    anomalyScore = this.isolationForest.predict(features);
                } catch (e) {
                    // Fallback to simple threshold-based detection
                    anomalyScore = this.calculateAnomalyScoreFallback(profile);
                }
            } else {
                // Fallback to simple threshold-based detection
                anomalyScore = this.calculateAnomalyScoreFallback(profile);
            }
            
            if (anomalyScore < -0.5) {
                profile.anomalyCount++;
                return {
                    isAnomaly: true,
                    anomalyScore,
                    explanation: 'Unusual behavioral pattern detected',
                    recommendations: ['Verify identity', 'Review recent activities']
                };
            }

            return {
                isAnomaly: false,
                anomalyScore,
                explanation: 'Normal behavioral pattern',
                recommendations: []
            };
        } catch (error) {
            logger.error('Error in behavioral analysis:', error);
            return { error: 'Behavioral analysis failed' };
        }
    }

    calculateAnomalyScoreFallback(profile) {
        // Simple fallback anomaly detection
        let score = 0;
        
        // Check for unusual login times
        const recentLogins = profile.loginTimes.slice(-10);
        if (recentLogins.length > 0) {
            const avgHour = recentLogins.reduce((a, b) => a + b, 0) / recentLogins.length;
            const currentHour = new Date().getHours();
            const hourDeviation = Math.abs(currentHour - avgHour);
            if (hourDeviation > 6) score -= 0.3; // Unusual time
        }
        
        // Check for unusual patterns
        if (profile.anomalyCount > 5) score -= 0.5;
        
        return score;
    }

    extractBehavioralFeatures(profile) {
        const now = new Date();
        const currentHour = now.getHours();
        
        // Calculate time-based features
        const avgLoginTime = profile.loginTimes.reduce((a, b) => a + b, 0) / profile.loginTimes.length;
        const timeDeviation = Math.abs(currentHour - avgLoginTime);
        
        // Calculate pattern consistency
        const uniquePatterns = new Set(profile.browsingPatterns).size;
        const patternConsistency = 1 - (uniquePatterns / profile.browsingPatterns.length);
        
        return [
            currentHour,
            timeDeviation,
            patternConsistency,
            profile.riskTolerance,
            profile.anomalyCount
        ];
    }

    // 4. AI Chatbot / Recommendation System
    async generateAIRecommendations(threatAnalysis) {
        try {
            const recommendations = [];
            
            if (threatAnalysis.riskLevel === 'critical') {
                recommendations.push({
                    action: 'BLOCK',
                    priority: 'high',
                    message: 'This content poses a critical security risk. Do not proceed.',
                    steps: ['Close the application', 'Report to security team', 'Run full system scan']
                });
            } else if (threatAnalysis.riskLevel === 'high') {
                recommendations.push({
                    action: 'VERIFY',
                    priority: 'high',
                    message: 'High risk detected. Verify the source before proceeding.',
                    steps: ['Contact sender through alternative channel', 'Check official website', 'Look for security indicators']
                });
            } else if (threatAnalysis.riskLevel === 'medium') {
                recommendations.push({
                    action: 'CAUTION',
                    priority: 'medium',
                    message: 'Medium risk detected. Proceed with caution.',
                    steps: ['Review content carefully', 'Check sender reputation', 'Enable additional security measures']
                });
            } else {
                recommendations.push({
                    action: 'PROCEED',
                    priority: 'low',
                    message: 'Low risk detected. Content appears safe.',
                    steps: ['Continue normal operation', 'Maintain security awareness']
                });
            }

            return recommendations;
        } catch (error) {
            logger.error('Error generating AI recommendations:', error);
            return [{ action: 'UNKNOWN', priority: 'medium', message: 'Unable to generate recommendations' }];
        }
    }

    // Helper methods
    generateExplanations(analysis) {
        const explanations = [];
        
        if (analysis.openaiAnalysis) {
            explanations.push(`AI Analysis: ${analysis.openaiAnalysis.explanation}`);
        }
        
        if (analysis.sentimentAnalysis.comparative < -0.5) {
            explanations.push('Negative sentiment detected, which may indicate manipulation');
        }
        
        if (analysis.patternAnalysis.detectedThreats.length > 0) {
            explanations.push(`Detected ${analysis.patternAnalysis.detectedThreats.length} suspicious patterns`);
        }
        
        return explanations;
    }

    generateRecommendations(analysis) {
        const recommendations = [];
        
        if (analysis.threatScore > 70) {
            recommendations.push('Do not click any links or download attachments');
            recommendations.push('Report this to your security team immediately');
        } else if (analysis.threatScore > 40) {
            recommendations.push('Verify the sender through alternative communication');
            recommendations.push('Check the official website for similar communications');
        } else {
            recommendations.push('Proceed with normal caution');
        }
        
        return recommendations;
    }

    generateURLExplanations(analysis) {
        const explanations = [];
        
        if (analysis.virustotalAnalysis && analysis.virustotalAnalysis.positives > 0) {
            explanations.push(`VirusTotal detected ${analysis.virustotalAnalysis.positives} security vendors flagged this URL`);
        }
        
        if (analysis.googleSafeBrowsing && analysis.googleSafeBrowsing.matches) {
            explanations.push('Google Safe Browsing flagged this URL as potentially dangerous');
        }
        
        if (analysis.urlPatterns.detectedThreats.length > 0) {
            explanations.push(`Detected ${analysis.urlPatterns.detectedThreats.length} suspicious URL patterns`);
        }
        
        return explanations;
    }

    generateURLRecommendations(analysis) {
        const recommendations = [];
        
        if (analysis.anomalyScore > 70) {
            recommendations.push('Do not visit this URL');
            recommendations.push('Report to security team');
        } else if (analysis.anomalyScore > 40) {
            recommendations.push('Use a virtual machine or sandbox to visit');
            recommendations.push('Enable additional browser security');
        } else {
            recommendations.push('Proceed with normal caution');
        }
        
        return recommendations;
    }

    determineRiskLevel(score) {
        if (score >= 80) return 'critical';
        if (score >= 60) return 'high';
        if (score >= 30) return 'medium';
        return 'low';
    }
}

module.exports = AIServices;
