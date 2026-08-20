/**
 * QUICK START: Newsletter Email Configuration
 * 
 * This shows how to set up the newsletter email delivery.
 * For full instructions, see /docs/NEWSLETTER_SETUP.md
 */

// ============================================
// OPTION 1: SUPABASE EDGE FUNCTION (Recommended for Production)
// ============================================
// 1. Deploy the Edge Function from docs/supabase-send-newsletter-function.ts
// 2. Get your function URL from Supabase Dashboard
// 3. Add this to admin/newsletter.html and index.html:

window.__ETCH_NEWSLETTER__ = {
    endpoint: 'https://your-project.supabase.co/functions/v1/send-newsletter',
    provider: 'supabase-function',
    fromName: 'ETCH Newsletter'
};


// ============================================
// OPTION 2: RESEND API (Easy Setup, Free Tier)
// ============================================
// 1. Create account at https://resend.com
// 2. Get API key from https://resend.com/api-keys
// 3. Add this to admin/newsletter.html and index.html:

window.__ETCH_NEWSLETTER__ = {
    endpoint: 'https://api.resend.com/emails/batch',
    provider: 'resend',
    apiKey: 'your_resend_api_key_here',
    fromName: 'ETCH Newsletter',
    fromEmail: 'onboarding@resend.dev' // Use Resend's verified domain for testing
};


// ============================================
// OPTION 3: SENDGRID API
// ============================================
// 1. Create account at https://sendgrid.com
// 2. Create an API key
// 3. Set up a custom backend endpoint to handle SendGrid
// 4. Point to your backend:

window.__ETCH_NEWSLETTER__ = {
    endpoint: 'https://your-backend.com/api/send-newsletter',
    provider: 'sendgrid',
    fromName: 'ETCH Newsletter'
};


// ============================================
// TESTING YOUR NEWSLETTER SETUP
// ============================================

// In browser console, test if endpoint is configured:
console.log('Newsletter config:', window.__ETCH_NEWSLETTER__);

// Test sending a newsletter (if you have subscribers):
// 1. First add a subscriber from landing page
// 2. Go to /admin/newsletter.html
// 3. Create a test campaign and click "Send Campaign"


// ============================================
// ERROR MESSAGES & FIXES
// ============================================

// Error: "Newsletter delivery endpoint is not configured"
// Fix: Set window.__ETCH_NEWSLETTER__.endpoint before trying to send

// Error: "CORS error" or blocked request
// Fix: If using Resend, use https://api.resend.com/emails/batch
//      If custom backend, ensure CORS headers are set
//      If Supabase Function, CORS is automatic

// Error: "Newsletter send failed"
// Fix: Check browser console for details
//      Verify API key is correct
//      Check endpoint URL is reachable
