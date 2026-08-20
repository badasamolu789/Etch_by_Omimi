/**
 * Newsletter Configuration & Helper
 * 
 * This module handles newsletter endpoint configuration and provides
 * a default implementation using Resend API or custom backend
 */

window.__ETCH_NEWSLETTER__ = window.__ETCH_NEWSLETTER__ || {
    // Configure your email provider endpoint
    // Option 1: Supabase Edge Function (recommended) ✓ ACTIVE
    endpoint: 'https://cyoddvehzrmhubmislbb.supabase.co/functions/v1/send-newsletter',

    // Option 2: Direct Resend API endpoint (for client-side sending)
    // endpoint: 'https://api.resend.com/emails',
    // apiKey: '', // Set your Resend API key

    // Option 3: Custom backend endpoint
    // endpoint: 'https://your-backend.com/api/send-newsletter',

    provider: 'supabase-function', // 'resend', 'sendgrid', 'mailgun', 'supabase-function'
    apiKey: '', // API key if using direct provider (Resend key stored in Supabase)
    fromEmail: 'newsletter@etchbyomimi.com',
    fromName: 'ETCH Newsletter',
};

/**
 * Helper function to send newsletter via configured provider
 * @param {Object} options - Newsletter options
 * @param {string} options.subject - Email subject
 * @param {string} options.message - HTML email body
 * @param {Array<string>} options.recipients - List of recipient emails
 * @param {string} options.fromName - Sender name override
 * @returns {Promise<Object>} - Result object {success, sent, failed, message}
 */
window.sendNewsletterViaProvider = async function (options = {}) {
    const config = window.__ETCH_NEWSLETTER__ || {};

    if (!config.endpoint && !config.apiKey) {
        return {
            success: false,
            error: 'Newsletter provider not configured. Set window.__ETCH_NEWSLETTER__.endpoint or .apiKey'
        };
    }

    const { subject, message, recipients = [], fromName = config.fromName } = options;

    if (!subject || !message || recipients.length === 0) {
        return {
            success: false,
            error: 'Missing required fields: subject, message, recipients'
        };
    }

    try {
        // If using direct Resend API
        if (config.provider === 'resend' && config.apiKey) {
            return await sendViaResendAPI(options, config);
        }

        // If using endpoint (Supabase Function or custom backend)
        if (config.endpoint) {
            return await sendViaEndpoint(options, config);
        }

        throw new Error('No valid newsletter provider configured');
    } catch (error) {
        return {
            success: false,
            error: error.message,
            sent: 0
        };
    }
};

/**
 * Send via Resend API directly
 */
async function sendViaResendAPI(options, config) {
    const { subject, message, recipients, fromName } = options;

    const batch = recipients.map(email => ({
        from: `${fromName} <${config.fromEmail}>`,
        to: email,
        subject,
        html: message
    }));

    const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emails: batch })
    });

    if (!response.ok) {
        throw new Error(`Resend API error: ${response.statusText}`);
    }

    const result = await response.json();
    return {
        success: true,
        sent: recipients.length,
        failed: 0,
        message: `Newsletter sent to ${recipients.length} recipients`,
        data: result
    };
}

/**
 * Send via custom endpoint (Supabase Edge Function or backend)
 */
async function sendViaEndpoint(options, config) {
    const { subject, message, recipients, fromName } = options;

    const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
        },
        body: JSON.stringify({
            subject,
            message,
            fromName,
            recipients
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Newsletter endpoint error: ${errorText || response.statusText}`);
    }

    const result = await response.json();
    return {
        success: true,
        sent: result.sent || recipients.length,
        failed: result.failed || 0,
        message: result.message || `Newsletter sent to ${recipients.length} recipients`,
        data: result
    };
}
