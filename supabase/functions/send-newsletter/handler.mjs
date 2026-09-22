// Native HTTP keeps this handler testable without Deno or provider SDK globals.
export function createNewsletterHandler({ env, fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    };
    const reply = (status, body) => Response.json(body, { status, headers: cors });
    return async request => {
        if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
        if (request.method !== 'POST') return reply(405, { success: false, error: 'Method not allowed' });
        const authorization = request.headers.get('Authorization') || '';
        if (!/^Bearer \S+$/i.test(authorization)) return reply(401, { success: false, error: 'Sign in required' });
        const base = env('SUPABASE_URL');
        const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
        const resendKey = env('RESEND_API_KEY');
        if (!base || !serviceKey || !resendKey) return reply(503, { success: false, error: 'Newsletter service is not configured' });
        const adminHeaders = { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' };
        let campaignId;
        let claimed = false;
        let sent = 0;
        let total = 0;
        const db = (path, options = {}) => fetchImpl(base + '/rest/v1/' + path, { ...options, headers: adminHeaders });
        const saveResult = status => db('newsletter_campaigns?id=eq.' + campaignId, {
            method: 'PATCH', body: JSON.stringify({ status, sent, total }),
        });
        try {
            const auth = await fetchImpl(base + '/auth/v1/user', { headers: { apikey: serviceKey, Authorization: authorization } });
            if (!auth.ok) return reply(401, { success: false, error: 'Session expired. Sign in again.' });
            const user = await auth.json();
            const profileResponse = await db('profiles?select=role&id=eq.' + encodeURIComponent(user.id));
            if (!profileResponse.ok) throw new Error('Cannot verify administrator');
            const profiles = await profileResponse.json();
            if (!['admin','super_admin'].includes(profiles[0]?.role)) return reply(403, { success: false, error: 'Administrator access required' });
            const raw = await request.text();
            if (raw.length > 110000) return reply(413, { success: false, error: 'Newsletter is too large' });
            let body;
            try { body = JSON.parse(raw); } catch { return reply(400, { success: false, error: 'Invalid JSON' }); }
            if (!body || typeof body.subject !== 'string' || !body.subject.trim() || body.subject.length > 200 ||
                typeof body.message !== 'string' || !body.message.trim() || body.message.length > 100000 ||
                !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.campaignId || '')) {
                return reply(400, { success: false, error: 'A valid campaign ID, subject, and message are required' });
            }
            campaignId = body.campaignId;
            const claim = await db('newsletter_campaigns', { method: 'POST', body: JSON.stringify({ id: campaignId, created_by: user.id, subject: body.subject }) });
            if (claim.status === 409) return reply(409, { success: false, error: 'This campaign was already submitted. Check its delivery status before creating another campaign.' });
            if (!claim.ok) throw new Error('Cannot register campaign');
            claimed = true;
            // Recipient selection is server-side and paginated past API row limits.
            const recipients = [];
            for (let offset = 0; ; offset += 500) {
                const response = await db('newsletter_subscribers?select=email&is_active=eq.true&order=id&limit=500&offset=' + offset);
                if (!response.ok) throw new Error('Cannot load subscribers');
                const rows = await response.json();
                recipients.push(...rows.map(row => row.email));
                if (rows.length < 500) break;
            }
            const unique = [...new Set(recipients)];
            total = unique.length;
            if (!total) {
                await saveResult('empty');
                return reply(400, { success: false, sent: 0, error: 'No active subscribers' });
            }
            // Resend accepts 100 emails per batch; one request at a time.
            for (let offset = 0; offset < unique.length; offset += 100) {
                if (offset) await sleep(600);
                const batch = unique.slice(offset, offset + 100);
                const response = await fetchImpl('https://api.resend.com/emails/batch', {
                    method: 'POST',
                    headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json',
                        'Idempotency-Key': campaignId + '/' + offset },
                    body: JSON.stringify(batch.map(email => ({
                        from: env('NEWSLETTER_FROM') || 'ETCH Newsletter <newsletter@etchbyomimi.com>',
                        to: [email], subject: body.subject.trim(), html: body.message,
                    }))),
                });
                const result = await response.json();
                if (!response.ok || !Array.isArray(result.data) || result.data.length !== batch.length) {
                    throw new Error('Email provider did not confirm the complete batch');
                }
                sent += result.data.length;
                const saved = await saveResult('sending');
                if (!saved.ok) throw new Error('Could not save delivery progress');
            }
            const saved = await saveResult('sent');
            if (!saved.ok) throw new Error('Could not save delivery status');
            return reply(200, { success: true, sent, total, failed: 0 });
        } catch (error) {
            console.error('Newsletter request failed:', error);
            if (claimed) {
                try { await saveResult('needs_review'); } catch { /* Preserve the original failure. */ }
            }
            return reply(502, { success: false, sent, total,
                error: `Delivery stopped. ${sent} emails confirmed sent. Check campaign and provider logs before resending.` });
        }
    };
}
