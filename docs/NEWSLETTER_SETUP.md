# Newsletter Setup Instructions

## Quick Setup Options

### Option 1: Using Resend (Recommended - Free & Easy)

1. **Create a Resend account**: https://resend.com
2. **Get your API key**: https://resend.com/api-keys
3. **Set up in your project**:
   - In `admin/newsletter.html`, update the config:
     ```javascript
     window.__ETCH_NEWSLETTER__ = {
         provider: 'resend',
         endpoint: 'https://api.resend.com/emails/batch',
         apiKey: 'your_resend_api_key',
         fromEmail: 'onboarding@resend.dev', // Use Resend's verified domain
         fromName: 'ETCH Newsletter'
     };
     ```
   - In `index.html`, do the same

### Option 2: Using Supabase Edge Functions (Recommended for Production)

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Initialize Supabase locally**:
   ```bash
   supabase init
   ```

3. **Create the send-newsletter function**:
   ```bash
   supabase functions new send-newsletter
   ```

4. **Copy the function code** from `docs/supabase-send-newsletter-function.ts` to `supabase/functions/send-newsletter/index.ts`

5. **Set environment variables** in your Supabase project:
   - Go to Supabase Dashboard → Edge Functions Secrets
   - Add `RESEND_API_KEY` with your Resend API key

6. **Deploy the function**:
   ```bash
   supabase functions deploy send-newsletter
   ```

7. **Get your function URL** and update the config in HTML files:
   ```javascript
   window.__ETCH_NEWSLETTER__ = {
       endpoint: 'https://your-project.supabase.co/functions/v1/send-newsletter',
       fromName: 'ETCH Newsletter'
   };
   ```

### Option 3: Using SendGrid

1. **Get SendGrid API Key**: https://app.sendgrid.com/settings/api_keys
2. **Create a backend endpoint** that accepts newsletter requests and uses SendGrid
3. **Set the endpoint URL** in your HTML files

### Option 4: Using Mailgun

1. **Get Mailgun credentials** from your Mailgun account
2. **Create a backend endpoint** that handles newsletter sending
3. **Set the endpoint URL** in your HTML files

## Testing the Newsletter

1. **Subscribe to newsletter** on the landing page (index.html)
2. **Go to admin**: `/admin/index.html` → Newsletter tab
3. **Create a campaign**:
   - Subject: "Welcome to ETCH Newsletter"
   - Message: "This is a test email"
   - Click "Send Campaign"

## Troubleshooting

### "Newsletter delivery endpoint is not configured"
- Check that `window.__ETCH_NEWSLETTER__.endpoint` is set in the HTML
- Verify the endpoint URL is correct
- Check browser console for errors

### "CORS errors"
- If using direct Resend API, CORS should be handled by Resend
- If using custom backend, ensure CORS headers are set
- Use Supabase Edge Functions which handle CORS automatically

### Email not received
- Check spam folder
- Verify email address is correct
- Check API key is valid
- Review function logs in Supabase dashboard

## Configuration Files

- `script/newsletter-config.js` - Newsletter configuration helper
- `.env.example` - Environment variables template
- `docs/supabase-send-newsletter-function.ts` - Supabase Edge Function template
