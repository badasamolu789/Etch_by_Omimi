import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function api(client, fetchImpl = () => { throw new Error('Unexpected network'); }) {
    const context = vm.createContext({ window: {}, supabase: { createClient: () => client }, console, fetch: fetchImpl });
    vm.runInContext(readFileSync(new URL('../script/supabase.js', import.meta.url), 'utf8'), context);
    return context.window.EtchSupabase;
}
function query(result) {
    const calls = [];
    const q = new Proxy({ calls, then: resolve => Promise.resolve(result).then(resolve) }, {
        get(target, key) { return key in target ? target[key] : (...args) => { calls.push([key, ...args]); return q; }; }
    });
    return q;
}

test('creator guard accepts a verified user and admin guard checks the profile role', async () => {
    for (const role of ['creator','editor','reviewer','admin','super_admin']) {
        const client = { auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) }, from: () => query({ data: { role }, error: null }) };
        const helper = api(client);
        assert.equal((await helper.requireAuth()).authenticated, true);
        assert.equal((await helper.requireAdmin()).authenticated, role !== 'creator');
    }
});

test('expired credentials fail closed', async () => {
    const helper = api({ auth: { getUser: async () => ({ data: { user: null }, error: new Error('expired') }) } });
    assert.equal((await helper.requireAuth()).authenticated, false);
});

test('newsletter subscribe uses a non-disclosing RPC, not upsert returning rows', async () => {
    let invocation;
    const helper = api({ rpc: async (...args) => { invocation = args; return { data: null, error: null }; } });
    assert.equal((await helper.subscribeToNewsletter({ email: ' CREATOR@EXAMPLE.COM ' })).error, null);
    assert.equal(invocation[0], 'subscribe_to_newsletter');
    assert.equal(invocation[1].subscriber_email, 'creator@example.com');
});

test('search preserves zero price and quotes PostgREST special characters', async () => {
    const q = query({ data: [], count: 80, error: null });
    const helper = api({ from: () => q });
    const result = await helper.searchListings('a,b)"_%', { maxPrice: 0, limit: 24, offset: 24 });
    assert.equal(result.count, 80);
    assert.ok(q.calls.some(([method, field, value]) => method === 'lte' && field === 'price' && value === 0));
    assert.ok(q.calls.some(([method, start, end]) => method === 'range' && start === 24 && end === 47));
    const filter = q.calls.find(([method]) => method === 'or')[1];
    assert.ok(filter.startsWith('title.ilike."%a,b)\\"'));
});

test('HTTP 200 with failed newsletter delivery is not success', async () => {
    let request;
    const helper = api({ auth: { getSession: async () => ({ data: { session: { access_token: 'user-token' } }, error: null }) } }, async (url, options) => {
        request = options;
        return Response.json({ success: false, sent: 2, message: 'Partial delivery' });
    });
    const result = await helper.sendNewsletterCampaign({ subject: 'Subject', message: 'Body', campaignId: 'id' });
    assert.equal(result.sent, false);
    assert.equal(result.count, 2);
    assert.equal(request.headers.Authorization, 'Bearer user-token');
    assert.equal('recipients' in JSON.parse(request.body), false);
});

test('homepage partners default to ordered reads and can filter published entries', async () => {
    const q = query({ data: [{ name: 'Partner' }], error: null });
    const helper = api({ from: table => {
        assert.equal(table, 'homepage_partners');
        return q;
    } });
    const result = await helper.getHomepagePartners({ status: 'published', limit: 8 });
    assert.equal(result.data.length, 1);
    assert.ok(q.calls.some(([method, field, options]) => method === 'order' && field === 'display_order' && options.ascending === true));
    assert.ok(q.calls.some(([method, field, value]) => method === 'eq' && field === 'status' && value === 'published'));
    assert.ok(q.calls.some(([method, value]) => method === 'limit' && value === 8));
});

test('marketplace categories default to ordered reads and can filter published entries', async () => {
    const q = query({ data: [{ name: 'Scripts', slug: 'script' }], error: null });
    const helper = api({ from: table => {
        assert.equal(table, 'marketplace_categories');
        return q;
    } });
    const result = await helper.getMarketplaceCategories({ status: 'published', limit: 8 });
    assert.deepEqual(result.data.map(category => category.slug), ['script']);
    assert.ok(q.calls.some(([method, field, options]) => method === 'order' && field === 'display_order' && options.ascending === true));
    assert.ok(q.calls.some(([method, field, value]) => method === 'eq' && field === 'status' && value === 'published'));
    assert.ok(q.calls.some(([method, value]) => method === 'limit' && value === 8));
});

test('routing and escaping work on extensionless URLs and attribute payloads', () => {
    const context = vm.createContext({ window: { location: { origin: 'https://etch.test', pathname: '/user/dashboard' } }, URL, URLSearchParams });
    vm.runInContext(readFileSync(new URL('../script/core.js', import.meta.url), 'utf8'), context);
    const ui = context.window.EtchUI;
    assert.equal(ui.pageName(), 'dashboard');
    assert.equal(ui.pageName('/user/dashboard.html'), 'dashboard');
    assert.equal(ui.listingUrl({ id: 'uuid', slug: 'my story' }), '/product-detail?slug=my+story');
    assert.equal(ui.listingUrl({ id: 'uuid' }), '/product-detail?id=uuid');
    assert.equal(ui.articleUrl('my story', true), '/article?slug=my+story&preview=1');
    assert.equal(ui.articleUrl('a&b'), '/article?slug=a%26b');
    assert.equal(ui.safeUrl('javascript:alert(1)'), '');
    assert.equal(ui.escapeHtml('" onerror="x'), '&quot; onerror=&quot;x');
});

 test('article edits use an optimistic timestamp guard',async()=>{
 const q=query({data:{id:'article'},error:null});const helper=api({from:()=>q});
 await helper.updateArticle('article',{title:'New title'},'2026-09-22T00:00:00Z');
 assert.ok(q.calls.some(([method,field,value])=>method==='eq' && field==='updated_at' && value==='2026-09-22T00:00:00Z'));
 });
