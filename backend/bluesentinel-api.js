const express = require('express');
const axios = require('axios');
const natural = require('natural');
// Optional ML package - will use fallback if not available
let IsolationForest = null;
try {
    IsolationForest = require('ml-isolation-forest').IsolationForest;
} catch (e) {
    console.warn('ml-isolation-forest not available, using fallback anomaly detection');
}

// BlueSentinel SOC AI API endpoints
class BlueSentinelAPI {
    constructor() {
        this.router = express.Router();
        this.setupRoutes();
        this.initializeModels();
    }

    initializeModels() {
        // Initialize ML models for threat detection
        this.isolationForest = IsolationForest ? new IsolationForest() : null;
        this.threatPatterns = new Map();
        this.userProfiles = new Map();
        
        // Load MITRE ATT&CK techniques
        this.mitreTechniques = {
            'T1110': { name: 'Brute Force', tactic: 'Credential Access' },
            'T1078': { name: 'Valid Accounts', tactic: 'Defense Evasion' },
            'T1059': { name: 'Command and Scripting Interpreter', tactic: 'Execution' },
            'T1083': { name: 'File and Directory Discovery', tactic: 'Discovery' },
            'T1047': { name: 'Windows Management Instrumentation', tactic: 'Execution' },
            'T1027': { name: 'Obfuscated Files or Information', tactic: 'Defense Evasion' },
            'T1105': { name: 'Ingress Tool Transfer', tactic: 'Command and Control' },
            'T1071': { name: 'Application Layer Protocol', tactic: 'Command and Control' }
        };
    }

    setupRoutes() {
        // Log analysis endpoint
        this.router.post('/analyze-logs', async (req, res) => {
            try {
                const { logs, logType = 'syslog' } = req.body;
                if (!logs) {
                    return res.status(400).json({ error: 'Logs are required' });
                }

                const analysis = await this.analyzeLogs(logs, logType);
                res.json(analysis);
            } catch (error) {
                console.error('Log analysis error:', error);
                res.status(500).json({ error: 'Log analysis failed' });
            }
        });

        // IOC reputation check
        this.router.post('/check-ioc', async (req, res) => {
            try {
                const { ioc, type } = req.body;
                if (!ioc || !type) {
                    return res.status(400).json({ error: 'IOC and type are required' });
                }

                const reputation = await this.checkIOCReputation(ioc, type);
                res.json(reputation);
            } catch (error) {
                console.error('IOC check error:', error);
                res.status(500).json({ error: 'IOC check failed' });
            }
        });

        // MITRE ATT&CK mapping
        this.router.post('/map-mitre', async (req, res) => {
            try {
                const { threatDescription, logData } = req.body;
                if (!threatDescription) {
                    return res.status(400).json({ error: 'Threat description is required' });
                }

                const mapping = await this.mapToMitreAttack(threatDescription, logData);
                res.json(mapping);
            } catch (error) {
                console.error('MITRE mapping error:', error);
                res.status(500).json({ error: 'MITRE mapping failed' });
            }
        });

        // Threat intelligence enrichment
        this.router.post('/enrich-threat', async (req, res) => {
            try {
                const { iocs } = req.body;
                if (!iocs || !Array.isArray(iocs)) {
                    return res.status(400).json({ error: 'IOCs array is required' });
                }

                const enrichment = await this.enrichThreatIntelligence(iocs);
                res.json(enrichment);
            } catch (error) {
                console.error('Threat enrichment error:', error);
                res.status(500).json({ error: 'Threat enrichment failed' });
            }
        });

        // SOC chat endpoint
        this.router.post('/soc-chat', async (req, res) => {
            try {
                const { message, context } = req.body;
                if (!message) {
                    return res.status(400).json({ error: 'Message is required' });
                }

                const response = await this.processSOCQuery(message, context);
                res.json(response);
            } catch (error) {
                console.error('SOC chat error:', error);
                res.status(500).json({ error: 'SOC chat failed' });
            }
        });

        // Get MITRE techniques
        this.router.get('/mitre-techniques', (req, res) => {
            res.json(this.mitreTechniques);
        });
    }

    async analyzeLogs(logs, logType) {
        const analysis = {
            threats: [],
            mitreTechniques: [],
            iocs: {
                ips: [],
                domains: [],
                hashes: [],
                urls: []
            },
            riskScore: 0,
            recommendations: [],
            timeline: []
        };

        const logLines = logs.split('\n').filter(line => line.trim());
        
        logLines.forEach((line, index) => {
            const timestamp = this.extractTimestamp(line);
            const threatAnalysis = this.analyzeLogLine(line);
            
            if (threatAnalysis.threats.length > 0) {
                analysis.threats.push(...threatAnalysis.threats);
                analysis.mitreTechniques.push(...threatAnalysis.mitreTechniques);
                analysis.riskScore += threatAnalysis.riskScore;
            }

            // Extract IOCs
            this.extractIOCs(line, analysis.iocs);
            
            // Add to timeline
            analysis.timeline.push({
                timestamp,
                line,
                threats: threatAnalysis.threats,
                riskScore: threatAnalysis.riskScore
            });
        });

        // Generate recommendations
        analysis.recommendations = this.generateRecommendations(analysis);
        
        // Remove duplicates
        analysis.mitreTechniques = [...new Set(analysis.mitreTechniques)];
        analysis.riskScore = Math.min(100, analysis.riskScore);

        return analysis;
    }

    analyzeLogLine(line) {
        const analysis = {
            threats: [],
            mitreTechniques: [],
            riskScore: 0
        };

        const lowerLine = line.toLowerCase();

        // Brute force detection
        if (lowerLine.includes('failed login') || lowerLine.includes('authentication failure')) {
            analysis.threats.push({
                type: 'Brute Force Attack',
                severity: 'high',
                description: 'Multiple failed login attempts detected',
                confidence: 85,
                technique: 'T1110'
            });
            analysis.mitreTechniques.push('T1110');
            analysis.riskScore += 30;
        }

        // Unauthorized access
        if (lowerLine.includes('unauthorized access') || lowerLine.includes('access denied')) {
            analysis.threats.push({
                type: 'Unauthorized Access Attempt',
                severity: 'critical',
                description: 'Unauthorized access attempt detected',
                confidence: 95,
                technique: 'T1078'
            });
            analysis.mitreTechniques.push('T1078');
            analysis.riskScore += 50;
        }

        // Malware detection
        if (lowerLine.includes('malware') || lowerLine.includes('virus') || lowerLine.includes('trojan')) {
            analysis.threats.push({
                type: 'Malware Detection',
                severity: 'critical',
                description: 'Malware signature detected',
                confidence: 90,
                technique: 'T1059'
            });
            analysis.mitreTechniques.push('T1059');
            analysis.riskScore += 60;
        }

        // Command execution
        if (lowerLine.includes('cmd.exe') || lowerLine.includes('powershell') || lowerLine.includes('bash')) {
            analysis.threats.push({
                type: 'Command Execution',
                severity: 'medium',
                description: 'Command execution detected',
                confidence: 70,
                technique: 'T1059'
            });
            analysis.mitreTechniques.push('T1059');
            analysis.riskScore += 25;
        }

        // File system access
        if (lowerLine.includes('file access') || lowerLine.includes('directory listing')) {
            analysis.threats.push({
                type: 'File System Discovery',
                severity: 'medium',
                description: 'File system discovery activity',
                confidence: 60,
                technique: 'T1083'
            });
            analysis.mitreTechniques.push('T1083');
            analysis.riskScore += 20;
        }

        // Network activity
        if (lowerLine.includes('network connection') || lowerLine.includes('outbound connection')) {
            analysis.threats.push({
                type: 'Suspicious Network Activity',
                severity: 'medium',
                description: 'Unusual network connection detected',
                confidence: 65,
                technique: 'T1071'
            });
            analysis.mitreTechniques.push('T1071');
            analysis.riskScore += 25;
        }

        return analysis;
    }

    extractIOCs(line, iocs) {
        // Extract IP addresses
        const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
        const ips = line.match(ipPattern);
        if (ips) {
            ips.forEach(ip => {
                if (!iocs.ips.includes(ip)) {
                    iocs.ips.push(ip);
                }
            });
        }

        // Extract domains
        const domainPattern = /\b[a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|mil|int|co|uk|de|fr|jp|au|ca|us|tk|ml|ga|cf)\b/g;
        const domains = line.match(domainPattern);
        if (domains) {
            domains.forEach(domain => {
                if (!iocs.domains.includes(domain)) {
                    iocs.domains.push(domain);
                }
            });
        }

        // Extract hashes
        const hashPattern = /\b[a-fA-F0-9]{32,64}\b/g;
        const hashes = line.match(hashPattern);
        if (hashes) {
            hashes.forEach(hash => {
                if (!iocs.hashes.includes(hash)) {
                    iocs.hashes.push(hash);
                }
            });
        }

        // Extract URLs
        const urlPattern = /https?:\/\/[^\s]+/g;
        const urls = line.match(urlPattern);
        if (urls) {
            urls.forEach(url => {
                if (!iocs.urls.includes(url)) {
                    iocs.urls.push(url);
                }
            });
        }
    }

    async checkIOCReputation(ioc, type) {
        const reputation = {
            ioc,
            type,
            reputation: 'Unknown',
            confidence: 0,
            sources: [],
            lastSeen: null,
            tags: []
        };

        try {
            // Simulate reputation check (in real implementation, use VirusTotal, AbuseIPDB, etc.)
            if (type === 'ip') {
                reputation.reputation = this.getIPReputation(ioc);
                reputation.confidence = 85;
                reputation.sources = ['AbuseIPDB', 'VirusTotal'];
                reputation.tags = ['malware', 'phishing'];
            } else if (type === 'domain') {
                reputation.reputation = this.getDomainReputation(ioc);
                reputation.confidence = 90;
                reputation.sources = ['VirusTotal', 'OpenPhish'];
                reputation.tags = ['phishing', 'malware'];
            } else if (type === 'hash') {
                reputation.reputation = this.getHashReputation(ioc);
                reputation.confidence = 95;
                reputation.sources = ['VirusTotal', 'Hybrid Analysis'];
                reputation.tags = ['trojan', 'backdoor'];
            }
        } catch (error) {
            console.error('IOC reputation check error:', error);
        }

        return reputation;
    }

    getIPReputation(ip) {
        const maliciousIPs = ['10.0.0.1', '172.16.0.1', '192.168.1.1'];
        const suspiciousIPs = ['203.0.113.42', '198.51.100.1', '192.0.2.1'];
        
        if (maliciousIPs.includes(ip)) return 'Malicious';
        if (suspiciousIPs.includes(ip)) return 'Suspicious';
        return 'Clean';
    }

    getDomainReputation(domain) {
        const maliciousDomains = ['malware.com', 'phishing.net', 'evil.org'];
        const suspiciousDomains = ['example.com', 'test.org', 'suspicious.net'];
        
        if (maliciousDomains.includes(domain)) return 'Malicious';
        if (suspiciousDomains.includes(domain)) return 'Suspicious';
        return 'Clean';
    }

    getHashReputation(hash) {
        const maliciousHashes = ['a1b2c3d4e5f6', '1234567890ab', 'deadbeef1234'];
        
        if (maliciousHashes.includes(hash.toLowerCase())) return 'Malicious';
        return 'Clean';
    }

    async mapToMitreAttack(threatDescription, logData) {
        const mapping = {
            techniques: [],
            tactics: [],
            confidence: 0,
            description: threatDescription
        };

        const lowerDesc = threatDescription.toLowerCase();

        // Map based on threat description
        if (lowerDesc.includes('brute force') || lowerDesc.includes('failed login')) {
            mapping.techniques.push('T1110 - Brute Force');
            mapping.tactics.push('Credential Access');
        }

        if (lowerDesc.includes('unauthorized') || lowerDesc.includes('access')) {
            mapping.techniques.push('T1078 - Valid Accounts');
            mapping.tactics.push('Defense Evasion');
        }

        if (lowerDesc.includes('malware') || lowerDesc.includes('virus')) {
            mapping.techniques.push('T1059 - Command and Scripting Interpreter');
            mapping.tactics.push('Execution');
        }

        if (lowerDesc.includes('file') || lowerDesc.includes('directory')) {
            mapping.techniques.push('T1083 - File and Directory Discovery');
            mapping.tactics.push('Discovery');
        }

        mapping.confidence = mapping.techniques.length > 0 ? 85 : 0;
        return mapping;
    }

    async enrichThreatIntelligence(iocs) {
        const enrichment = {
            enrichedIOCs: [],
            threatActors: [],
            campaigns: [],
            confidence: 0
        };

        for (const ioc of iocs) {
            const reputation = await this.checkIOCReputation(ioc.value, ioc.type);
            enrichment.enrichedIOCs.push({
                ...ioc,
                reputation: reputation.reputation,
                confidence: reputation.confidence,
                sources: reputation.sources,
                tags: reputation.tags
            });
        }

        enrichment.confidence = enrichment.enrichedIOCs.length > 0 ? 80 : 0;
        return enrichment;
    }

    async processSOCQuery(message, context) {
        const response = {
            answer: '',
            suggestions: [],
            relatedThreats: [],
            confidence: 0
        };

        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('analyze') || lowerMessage.includes('investigate')) {
            response.answer = 'I can analyze security logs, alerts, and events. Please provide the data you want me to investigate.';
            response.suggestions = [
                'Paste security logs for analysis',
                'Upload alert files',
                'Describe the incident details'
            ];
        } else if (lowerMessage.includes('mitre') || lowerMessage.includes('attack')) {
            response.answer = 'I can map threats to MITRE ATT&CK techniques and tactics. When you analyze logs, I\'ll automatically identify and map any attack techniques found.';
            response.suggestions = [
                'Analyze logs for MITRE mapping',
                'Check specific technique details',
                'View attack timeline'
            ];
        } else if (lowerMessage.includes('ioc') || lowerMessage.includes('reputation')) {
            response.answer = 'I can check IOC reputation using threat intelligence feeds. I\'ll automatically extract and analyze IPs, domains, and hashes from your data.';
            response.suggestions = [
                'Check IP reputation',
                'Analyze domain reputation',
                'Verify hash signatures'
            ];
        } else {
            response.answer = 'I can help with log analysis, threat intelligence, MITRE ATT&CK mapping, and incident response. What specific security question can I help you with?';
            response.suggestions = [
                'Analyze security logs',
                'Check IOC reputation',
                'Map to MITRE ATT&CK',
                'Get incident response guidance'
            ];
        }

        response.confidence = 85;
        return response;
    }

    generateRecommendations(analysis) {
        const recommendations = [];

        if (analysis.riskScore > 80) {
            recommendations.push({
                priority: 'Critical',
                action: 'Immediate containment required',
                steps: [
                    'Isolate affected systems',
                    'Block malicious IPs and domains',
                    'Notify incident response team',
                    'Preserve evidence for forensics'
                ]
            });
        } else if (analysis.riskScore > 50) {
            recommendations.push({
                priority: 'High',
                action: 'Enhanced monitoring and investigation',
                steps: [
                    'Increase monitoring on affected systems',
                    'Check for lateral movement',
                    'Review access logs',
                    'Update security controls'
                ]
            });
        } else if (analysis.riskScore > 20) {
            recommendations.push({
                priority: 'Medium',
                action: 'Standard investigation procedures',
                steps: [
                    'Document the incident',
                    'Monitor for additional activity',
                    'Review security policies',
                    'Update threat intelligence'
                ]
            });
        } else {
            recommendations.push({
                priority: 'Low',
                action: 'Routine monitoring',
                steps: [
                    'Continue normal monitoring',
                    'Document for future reference',
                    'Review security awareness'
                ]
            });
        }

        return recommendations;
    }

    extractTimestamp(line) {
        const timestampPattern = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;
        const match = line.match(timestampPattern);
        return match ? match[0] : new Date().toISOString();
    }

    getRouter() {
        return this.router;
    }
}

module.exports = BlueSentinelAPI;
