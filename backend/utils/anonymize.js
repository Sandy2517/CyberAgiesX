/**
 * Anonymization utilities for CyberAgiesX
 * Converts real emails/phones to anonymized display strings
 */

const crypto = require('crypto');

/**
 * Generate a deterministic 4-hex alias from a string
 */
function generateAlias(input) {
    if (!input) return 'alias_0000';
    const hash = crypto.createHash('sha256').update(input.toLowerCase()).digest('hex');
    return `alias_${hash.substring(0, 4)}`;
}

/**
 * Anonymize an email address
 * @param {string} email - Original email
 * @param {string} displayName - Optional display name
 * @param {string} org - Optional organization name
 * @returns {string} Anonymized display string
 */
function anonymizeEmail(email, displayName = null, org = null) {
    if (!email) return 'redacted@redacted';
    
    // If display name is provided and org, use: "displayName (org)"
    if (displayName && org) {
        return `${displayName} (${org})`;
    }
    
    // Extract local part before @
    const localPart = email.split('@')[0] || 'user';
    
    // If we have display name, use it
    if (displayName) {
        return displayName;
    }
    
    // Otherwise use localpart@redacted
    return `${localPart}@redacted`;
}

/**
 * Anonymize a phone number
 * @param {string} phone - Original phone number
 * @param {string} displayName - Optional display name
 * @returns {string} Anonymized display string
 */
function anonymizePhone(phone, displayName = null) {
    if (!phone) return 'redacted';
    
    // If display name provided, use it
    if (displayName) {
        return displayName;
    }
    
    // Use alias format
    return generateAlias(phone);
}

/**
 * Anonymize recipient list (for groups or multiple recipients)
 * @param {string[]} recipients - Array of recipient strings
 * @returns {string[]} Array of anonymized recipient strings
 */
function anonymizeRecipients(recipients) {
    if (!Array.isArray(recipients)) return [];
    
    return recipients.map(recip => {
        if (recip.includes('@')) {
            return anonymizeEmail(recip);
        } else if (recip.match(/^\+?[\d\s-]+$/)) {
            return anonymizePhone(recip);
        } else {
            // Already a group name or display name
            return recip;
        }
    });
}

/**
 * Extract organization from email domain
 * @param {string} email - Email address
 * @returns {string|null} Organization name or null
 */
function extractOrg(email) {
    if (!email || !email.includes('@')) return null;
    const domain = email.split('@')[1];
    
    // Remove common TLDs and return domain part
    return domain.split('.')[0] || null;
}

module.exports = {
    generateAlias,
    anonymizeEmail,
    anonymizePhone,
    anonymizeRecipients,
    extractOrg
};

