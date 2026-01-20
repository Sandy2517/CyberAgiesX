const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Realistic Threat Simulation Engine with Detailed Evidence
class ThreatSimulator {
    constructor() {
        this.activeThreats = new Map();
        this.threatHistory = [];
        this.userProfiles = new Map();
        this.networkActivity = [];
        this.behavioralPatterns = new Map();
        this.initializeThreatTemplates();
    }

    initializeThreatTemplates() {
        this.threatTemplates = [
            {
                type: 'deepfake_video',
                probability: 0.15,
                generate: () => this.generateDeepfakeThreat()
            },
            {
                type: 'voice_clone',
                probability: 0.20,
                generate: () => this.generateVoiceCloneThreat()
            },
            {
                type: 'phishing_email',
                probability: 0.30,
                generate: () => this.generatePhishingThreat()
            },
            {
                type: 'behavioral_anomaly',
                probability: 0.25,
                generate: () => this.generateBehavioralThreat()
            },
            {
                type: 'network_intrusion',
                probability: 0.10,
                generate: () => this.generateNetworkThreat()
            }
        ];
    }

    // Generate realistic deepfake video threat with detailed evidence
    generateDeepfakeThreat() {
        const timestamp = Date.now();
        const threatId = crypto.randomBytes(16).toString('hex');
        
        const videoAnalysis = {
            temporalArtifacts: {
                detected: true,
                frameInconsistencies: Math.floor(Math.random() * 15) + 5,
                blinkRate: (Math.random() * 0.2 + 0.4).toFixed(2),
                lipSyncDeviation: (Math.random() * 40 + 10).toFixed(2) + 'ms',
                shadowInconsistencies: true,
                reflectionAnomalies: Math.floor(Math.random() * 3) + 1
            },
            voiceAnalysis: {
                frequencyPattern: this.generateFrequencyData(),
                formantShift: (Math.random() * 150 + 50).toFixed(2) + 'Hz',
                backgroundNoise: (Math.random() * 30 + 10).toFixed(2) + 'dB',
                speechRate: (Math.random() * 0.3 + 0.85).toFixed(2) + 'x'
            },
            networkMetadata: {
                sourceIP: this.generateIP(),
                destinationIP: this.generateIP(),
                packetCount: Math.floor(Math.random() * 5000) + 2000,
                dataTransferred: (Math.random() * 50 + 10).toFixed(2) + ' MB',
                connectionLatency: (Math.random() * 200 + 50).toFixed(2) + 'ms',
                tcpFlags: ['SYN', 'ACK', 'PSH'],
                protocol: 'RTP/RTCP'
            },
            behavioralFlags: {
                unusualRequest: true,
                requestType: 'wire_transfer',
                amount: '$' + (Math.random() * 500000 + 50000).toFixed(2),
                urgencyIndicator: 95,
                timeOfDayAnomaly: Math.random() > 0.7
            }
        };

        const evidence = {
            threatId,
            timestamp,
            type: 'deepfake_video',
            severity: 'critical',
            title: 'Deepfake Video Call Detected - CEO Impersonation Attempt',
            description: 'AI-generated video call attempting to impersonate CEO for wire transfer authorization',
            threatScore: Math.floor(Math.random() * 30) + 70, // 70-100
            detailedEvidence: videoAnalysis,
            networkPackets: this.generatePacketCapture(videoAnalysis.networkMetadata),
            systemLogs: this.generateSystemLogs('deepfake_detection', threatId),
            userProfile: {
                claimedIdentity: 'CEO',
                actualConfidence: (Math.random() * 20 + 75).toFixed(1) + '%',
                previousInteractions: Math.floor(Math.random() * 5),
                lastVerifiedContact: new Date(timestamp - 86400000 * Math.floor(Math.random() * 7 + 1)).toISOString()
            },
            recommendedAction: 'block',
            forensicHash: crypto.createHash('sha256').update(JSON.stringify(videoAnalysis)).digest('hex')
        };

        return evidence;
    }

    // Generate voice clone threat with detailed evidence
    generateVoiceCloneThreat() {
        const timestamp = Date.now();
        const threatId = crypto.randomBytes(16).toString('hex');
        
        const voiceAnalysis = {
            spectralAnalysis: {
                mfccVectors: this.generateMFCCData(),
                pitchDeviation: (Math.random() * 40 + 15).toFixed(2) + 'Hz',
                formantFrequencies: {
                    F1: (Math.random() * 200 + 500).toFixed(0) + 'Hz',
                    F2: (Math.random() * 500 + 1500).toFixed(0) + 'Hz',
                    F3: (Math.random() * 300 + 2500).toFixed(0) + 'Hz'
                },
                harmonicRatio: (Math.random() * 0.3 + 0.6).toFixed(3)
            },
            temporalAnalysis: {
                speechRate: (Math.random() * 0.25 + 0.9).toFixed(2) + 'x normal',
                pausePatterns: {
                    unusual: true,
                    avgPauseDuration: (Math.random() * 100 + 200).toFixed(0) + 'ms',
                    pauseCount: Math.floor(Math.random() * 10) + 3
                },
                phonemeDuration: {
                    average: (Math.random() * 50 + 100).toFixed(0) + 'ms',
                    deviation: (Math.random() * 20 + 10).toFixed(0) + 'ms'
                }
            },
            neuralVoiceprint: {
                similarity: (Math.random() * 20 + 75).toFixed(1) + '%',
                authenticity: (Math.random() * 25 + 60).toFixed(1) + '%',
                cloneProbability: (Math.random() * 30 + 70).toFixed(1) + '%'
            },
            callMetadata: {
                callerID: this.generatePhoneNumber(),
                sourceIP: this.generateIP(),
                carrier: ['Verizon', 'AT&T', 'T-Mobile', 'Unknown'][Math.floor(Math.random() * 4)],
                callDuration: (Math.random() * 120 + 30).toFixed(0) + ' seconds',
                codec: ['G.711', 'G.729', 'Opus'][Math.floor(Math.random() * 3)],
                jitter: (Math.random() * 20 + 5).toFixed(2) + 'ms',
                packetLoss: (Math.random() * 2).toFixed(2) + '%'
            }
        };

        const evidence = {
            threatId,
            timestamp,
            type: 'voice_clone',
            severity: 'high',
            title: 'Voice Clone Detected - Suspicious Phone Call',
            description: 'AI-generated voice attempting to impersonate executive for financial transaction',
            threatScore: Math.floor(Math.random() * 25) + 65, // 65-90
            detailedEvidence: voiceAnalysis,
            networkPackets: this.generatePacketCapture(voiceAnalysis.callMetadata),
            systemLogs: this.generateSystemLogs('voice_clone_detection', threatId),
            userProfile: {
                claimedIdentity: ['CFO', 'VP Finance', 'Accounting Director'][Math.floor(Math.random() * 3)],
                voiceMatchConfidence: (Math.random() * 25 + 70).toFixed(1) + '%',
                lastVerifiedVoice: new Date(timestamp - 86400000 * Math.floor(Math.random() * 5 + 1)).toISOString()
            },
            recommendedAction: 'verify',
            forensicHash: crypto.createHash('sha256').update(JSON.stringify(voiceAnalysis)).digest('hex')
        };

        return evidence;
    }

    // Generate phishing email threat with detailed evidence
    generatePhishingThreat() {
        const timestamp = Date.now();
        const threatId = crypto.randomBytes(16).toString('hex');
        
        const emailAnalysis = {
            senderAnalysis: {
                emailAddress: this.generateEmail(),
                displayName: this.generateDisplayName(),
                domainAge: Math.floor(Math.random() * 90 + 10) + ' days',
                spfRecord: Math.random() > 0.5 ? 'FAIL' : 'SOFTFAIL',
                dkimSignature: Math.random() > 0.4,
                dmarcPolicy: Math.random() > 0.6 ? 'none' : 'quarantine'
            },
            contentAnalysis: {
                urgencyScore: Math.floor(Math.random() * 40 + 60),
                suspiciousKeywords: Math.floor(Math.random() * 8 + 3),
                linkCount: Math.floor(Math.random() * 5 + 1),
                attachmentCount: Math.random() > 0.7 ? 1 : 0,
                languageScore: (Math.random() * 30 + 70).toFixed(1),
                grammaticalErrors: Math.floor(Math.random() * 5)
            },
            linkAnalysis: this.generateLinkAnalysis(),
            headers: this.generateEmailHeaders()
        };

        const evidence = {
            threatId,
            timestamp,
            type: 'phishing_email',
            severity: 'medium',
            title: 'Phishing Email Detected - Suspicious Communication',
            description: 'Email contains phishing indicators and suspicious links',
            threatScore: Math.floor(Math.random() * 35) + 45, // 45-80
            detailedEvidence: emailAnalysis,
            networkPackets: this.generatePacketCapture({ protocol: 'SMTP' }),
            systemLogs: this.generateSystemLogs('phishing_detection', threatId),
            recommendedAction: 'warn',
            forensicHash: crypto.createHash('sha256').update(JSON.stringify(emailAnalysis)).digest('hex')
        };

        return evidence;
    }

    // Helper methods to generate realistic data
    generateIP() {
        return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }

    generatePhoneNumber() {
        return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
    }

    generateEmail() {
        const domains = ['suspicious-domain.net', 'phishing-site.com', 'fake-corp.org', 'malicious-email.co'];
        const names = ['support', 'security', 'accounting', 'hr', 'admin'];
        return `${names[Math.floor(Math.random() * names.length)]}@${domains[Math.floor(Math.random() * domains.length)]}`;
    }

    generateDisplayName() {
        const names = ['Security Team', 'HR Department', 'Accounting', 'IT Support', 'Administrator'];
        return names[Math.floor(Math.random() * names.length)];
    }

    generateFrequencyData() {
        return {
            fundamental: (Math.random() * 100 + 100).toFixed(2) + 'Hz',
            harmonics: Array.from({ length: 5 }, () => (Math.random() * 200 + 200).toFixed(2) + 'Hz'),
            spectralCentroid: (Math.random() * 2000 + 2000).toFixed(2) + 'Hz'
        };
    }

    generateMFCCData() {
        return Array.from({ length: 13 }, () => (Math.random() * 2 - 1).toFixed(3));
    }

    generatePacketCapture(metadata) {
        const packets = [];
        const packetCount = Math.floor(Math.random() * 100 + 50);
        
        for (let i = 0; i < packetCount; i++) {
            packets.push({
                timestamp: new Date(Date.now() - (packetCount - i) * 10).toISOString(),
                srcIP: metadata.sourceIP || this.generateIP(),
                dstIP: metadata.destinationIP || this.generateIP(),
                protocol: metadata.protocol || 'TCP',
                size: Math.floor(Math.random() * 1500 + 64),
                flags: metadata.tcpFlags || ['SYN', 'ACK'],
                sequence: Math.floor(Math.random() * 1000000),
                payload: crypto.randomBytes(8).toString('hex')
            });
        }
        
        return {
            captureTime: new Date().toISOString(),
            totalPackets: packetCount,
            packets: packets.slice(0, 20), // Return first 20 for display
            fullCaptureHash: crypto.createHash('sha256').update(JSON.stringify(packets)).digest('hex')
        };
    }

    generateSystemLogs(eventType, threatId) {
        const logs = [];
        const logCount = Math.floor(Math.random() * 10 + 5);
        
        const logTypes = {
            deepfake_detection: [
                'Video frame analysis started',
                'Temporal artifact detected in frame sequence',
                'Lip-sync deviation calculated: {value}',
                'Voice-video synchronization check failed',
                'Behavioral pattern analysis triggered',
                'Threat score calculated: {score}'
            ],
            voice_clone_detection: [
                'Audio stream received and buffered',
                'Voiceprint extraction started',
                'Spectral analysis completed',
                'Neural voiceprint comparison initiated',
                'Clone probability threshold exceeded',
                'Alert triggered - voice authentication failed'
            ],
            phishing_detection: [
                'Email received and queued for analysis',
                'SPF record verification: {result}',
                'DKIM signature check: {result}',
                'Content analysis engine started',
                'Suspicious link detected: {url}',
                'Threat classification: phishing'
            ]
        };

        const templates = logTypes[eventType] || logTypes['phishing_detection'];
        
        for (let i = 0; i < logCount; i++) {
            let message = templates[Math.floor(Math.random() * templates.length)];
            message = message.replace('{value}', (Math.random() * 50 + 10).toFixed(2));
            message = message.replace('{score}', Math.floor(Math.random() * 30 + 70));
            message = message.replace('{result}', Math.random() > 0.5 ? 'PASS' : 'FAIL');
            message = message.replace('{url}', 'http://' + this.generateIP() + '/phish');
            
            logs.push({
                timestamp: new Date(Date.now() - (logCount - i) * 1000).toISOString(),
                level: ['INFO', 'WARN', 'ERROR'][Math.floor(Math.random() * 3)],
                component: 'ThreatDetection',
                message,
                threatId,
                sessionId: crypto.randomBytes(8).toString('hex')
            });
        }
        
        return logs;
    }

    generateLinkAnalysis() {
        const links = [];
        const linkCount = Math.floor(Math.random() * 3 + 1);
        
        for (let i = 0; i < linkCount; i++) {
            links.push({
                url: 'http://' + this.generateIP() + '/suspicious',
                shortener: Math.random() > 0.6,
                domainAge: Math.floor(Math.random() * 30) + ' days',
                reputation: (Math.random() * 40 + 30).toFixed(1) + '%',
                sslCertificate: Math.random() > 0.4,
                suspicious: true
            });
        }
        
        return links;
    }

    generateEmailHeaders() {
        return {
            'Received': `from ${this.generateIP()} (${this.generateIP()}) by mail.server.com`,
            'Message-ID': `<${crypto.randomBytes(8).toString('hex')}@suspicious-domain.com>`,
            'Return-Path': this.generateEmail(),
            'X-Originating-IP': this.generateIP(),
            'Authentication-Results': 'spf=fail smtp.mailfrom=' + this.generateEmail()
        };
    }

    generateBehavioralThreat() {
        const timestamp = Date.now();
        const threatId = crypto.randomBytes(16).toString('hex');
        
        return {
            threatId,
            timestamp,
            type: 'behavioral_anomaly',
            severity: 'medium',
            title: 'Behavioral Anomaly Detected - Unusual Activity Pattern',
            description: 'User behavior deviates significantly from established baseline',
            threatScore: Math.floor(Math.random() * 30) + 50,
            detailedEvidence: {
                baselineDeviation: (Math.random() * 40 + 60).toFixed(1) + '%',
                unusualActions: Math.floor(Math.random() * 5 + 2),
                timePatternAnomaly: true,
                locationAnomaly: Math.random() > 0.6,
                deviceFingerprint: crypto.randomBytes(8).toString('hex')
            },
            recommendedAction: 'monitor',
            forensicHash: crypto.createHash('sha256').update(timestamp.toString()).digest('hex')
        };
    }

    generateNetworkThreat() {
        const timestamp = Date.now();
        const threatId = crypto.randomBytes(16).toString('hex');
        
        return {
            threatId,
            timestamp,
            type: 'network_intrusion',
            severity: 'high',
            title: 'Network Intrusion Attempt Detected',
            description: 'Suspicious network activity detected from external source',
            threatScore: Math.floor(Math.random() * 25) + 70,
            detailedEvidence: {
                sourceIP: this.generateIP(),
                portScans: Math.floor(Math.random() * 100 + 50),
                failedConnections: Math.floor(Math.random() * 20 + 10),
                protocolAnomalies: Math.floor(Math.random() * 5 + 2)
            },
            networkPackets: this.generatePacketCapture({ protocol: 'TCP' }),
            recommendedAction: 'block',
            forensicHash: crypto.createHash('sha256').update(timestamp.toString()).digest('hex')
        };
    }

    // Generate a new threat based on probability
    generateRandomThreat() {
        const rand = Math.random();
        let cumulative = 0;
        
        for (const template of this.threatTemplates) {
            cumulative += template.probability;
            if (rand <= cumulative) {
                const threat = template.generate();
                this.activeThreats.set(threat.threatId, threat);
                this.threatHistory.push(threat);
                return threat;
            }
        }
        
        // Default fallback
        return this.generatePhishingThreat();
    }

    // Get active threats
    getActiveThreats() {
        return Array.from(this.activeThreats.values());
    }

    // Get threat by ID with full evidence
    getThreatDetails(threatId) {
        return this.activeThreats.get(threatId);
    }

    // Resolve threat
    resolveThreat(threatId, resolution) {
        const threat = this.activeThreats.get(threatId);
        if (threat) {
            threat.resolved = true;
            threat.resolution = resolution;
            threat.resolvedAt = Date.now();
            this.activeThreats.delete(threatId);
            return threat;
        }
        return null;
    }
}

module.exports = ThreatSimulator;

