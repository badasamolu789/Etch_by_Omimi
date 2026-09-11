import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNewsletterHandler } from '../supabase/functions/send-newsletter/handler.mjs';
const id = '12345678-1234-4123-8123-123456789abc';
const request = (body = {}, token = 'token') => new Request('https://etch.test/send', {
    method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {},
    body: JSON.stringify({ subject: 'News', message: '<p>News</p>', campaignId: id, ...body }),
});
function setup({ role = 'admin', authStatus = 200, subscribers = 2, failureBatch = -1, duplicate = false } = {}) {
    const calls = []; let batches = 0;
    const handler = createNewsletterHandler({ env: key => ({ SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'service', RESEND_API_KEY: 'provider' })[key], sleep: async () => {}, fetchImpl: async (url, options) => {
        calls.push({ url, options });
        if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'user' }, { status: authStatus });
        if (url.includes('/profiles?')) return Response.json([{ role }]);
        if (url.includes('/newsletter_campaigns')) return new Response(null, { status: options.method === 'POST' ? duplicate ? 409 : 201 : 204 });
        if (url.includes('/newsletter_subscribers')) {
            const offset = Number(new URL(url).searchParams.get('offset'));
            return Response.json(Array.from({ length: Math.max(0, Math.min(500, subscribers - offset)) }, (_, i) => ({ email: `creator${offset + i}@example.com` })));
        }
        if (url === 'https://api.resend.com/emails/batch') {
            if (batches++ === failureBatch) return Response.json({ message: 'Failed' }, { status: 429 });
            return Response.json({ data: JSON.parse(options.body).map((_, i) => ({ id: String(i) })) });
        }
        throw new Error('Unexpected request ' + url);
    } });
    return { handler, calls };
}

test('anonymous and expired sessions cannot send', async () => {
    const anonymous = setup();
    assert.equal((await anonymous.handler(request({}, ''))).status, 401);
    assert.equal(anonymous.calls.length, 0);
    const expired = setup({ authStatus: 401 });
    assert.equal((await expired.handler(request())).status, 401);
    assert.equal(expired.calls.length, 1);
});
test('ordinary authenticated users cannot access recipients or email provider', async () => {
    const { handler, calls } = setup({ role: 'creator' });
    assert.equal((await handler(request())).status, 403);
    assert.equal(calls.length, 2);
});
test('recipient injection is ignored; delivery uses server records', async () => {
    const { handler, calls } = setup();
    const result = await (await handler(request({ recipients: ['attacker@example.com'] }))).json();
    assert.equal(result.success, true);
    assert.equal(result.sent, 2);
    const send = calls.find(call => call.url.includes('resend.com'));
    assert.deepEqual(JSON.parse(send.options.body).map(email => email.to[0]), ['creator0@example.com', 'creator1@example.com']);
    assert.equal(send.options.headers['Idempotency-Key'], id + '/0');
});
test('campaign claim prevents duplicate sending', async () => {
    const { handler, calls } = setup({ duplicate: true });
    assert.equal((await handler(request())).status, 409);
    assert.equal(calls.some(call => call.url.includes('resend.com')), false);
});
test('more than 500 recipients are paginated and delivered in batches of at most 100', async () => {
    const { handler, calls } = setup({ subscribers: 501 });
    const result = await (await handler(request())).json();
    assert.equal(result.sent, 501);
    assert.equal(calls.filter(call => call.url.includes('newsletter_subscribers')).length, 2);
    assert.deepEqual(calls.filter(call => call.url.includes('resend.com')).map(call => JSON.parse(call.options.body).length), [100,100,100,100,100,1]);
});
test('partial delivery returns an error with confirmed count', async () => {
    const { handler, calls } = setup({ subscribers: 120, failureBatch: 1 });
    const response = await handler(request());
    assert.equal(response.status, 502);
    const result = await response.json();
    assert.equal(result.success, false);
    assert.equal(result.sent, 100);
    assert.equal(JSON.parse(calls.at(-1).options.body).status, 'needs_review');
});
test('malformed body is rejected before campaign claim', async () => {
    const { handler, calls } = setup();
    assert.equal((await handler(request({ campaignId: 'bad' }))).status, 400);
    assert.equal(calls.some(call => call.url.includes('newsletter_campaigns')), false);
});
