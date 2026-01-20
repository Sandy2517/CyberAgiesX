/**
 * Trust score calculation stub
 * In production, this would use ML models and behavioral analysis
 */

/**
 * Compute trust score from signals
 * @param {Object} signals - Analysis signals
 * @returns {number} Trust score (0-100, higher = more trusted)
 */
function computeTrustScore(signals = {}) {
    if (!signals || Object.keys(signals).length === 0) {
        return 50.0; // Default neutral score
    }
    
    let score = 50.0; // Start at neutral
    
    // Stylistic analysis (if available)
    if (signals.stylistic_score !== undefined) {
        // stylistic_score is typically 0-1, convert to -50 to +50 impact
        score += (signals.stylistic_score - 0.5) * 40;
    }
    
    // Behavioral analysis (if available)
    if (signals.behavior_score !== undefined) {
        // behavior_score is typically 0-1, convert to -50 to +50 impact
        score += (signals.behavior_score - 0.5) * 40;
    }
    
    // SPF/DKIM verification
    if (signals.spfPass === true) score += 10;
    if (signals.dkimPass === true) score += 10;
    if (signals.spfPass === false) score -= 15;
    if (signals.dkimPass === false) score -= 15;
    
    // Sender verification
    if (signals.senderVerified === true) score += 5;
    if (signals.senderVerified === false) score -= 20;
    
    // Writing style match
    if (signals.writingStyleMatch !== undefined) {
        const match = signals.writingStyleMatch; // 0-100
        score += (match - 50) * 0.3; // Scale impact
    }
    
    // Video/audio artifacts
    if (signals.videoArtifacts === true) score -= 25;
    if (signals.audioArtifacts === true) score -= 25;
    if (signals.noArtifacts === true) score += 10;
    
    // Behavioral patterns
    if (signals.behavioralPattern === 'normal') score += 5;
    if (signals.behavioralPattern === 'suspicious') score -= 20;
    if (signals.behavioralPattern === 'anomalous') score -= 35;
    
    // Voice clone probability (if high, reduce score)
    if (signals.voiceCloneProbability !== undefined) {
        score -= signals.voiceCloneProbability * 0.5; // 0-100 becomes -50 to 0
    }
    
    // Normalize to 0-100 range
    score = Math.max(0, Math.min(100, score));
    
    return Math.round(score * 10) / 10; // Round to 1 decimal
}

module.exports = {
    computeTrustScore
};

