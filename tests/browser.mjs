import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, resolve } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.ETCH_PLAYWRIGHT || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const server = createServer(async (request,response) => {
    try {
        let path=new URL(request.url,'http://localhost').pathname;
        if (path === '/') path='/index.html';
        if (!extname(path)) path+='.html';
        const file=resolve(root,'.'+path);
        if (!file.startsWith(root)) throw new Error('Invalid path');
        response.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[extname(file)] || 'application/octet-stream');
        response.end(await readFile(file));
    } catch { response.writeHead(404);response.end('Not found'); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
let browser;
try {
    browser=await chromium.launch({headless:true, executablePath:process.env.ETCH_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
    const context=await browser.newContext();
    await context.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if (url.origin!==base) {
            if (route.request().resourceType()==='script') return route.fulfill({contentType:'application/javascript',body:'window.tailwind = window.tailwind || {}; window.lucide = {createIcons(){}};'});
            return route.fulfill({body:''});
        }
        if(url.pathname==='/script/supabase.js') return route.fulfill({contentType:'application/javascript',body:`
            window.__saved=[];
            window.EtchSupabase={
                requireAuth:async()=>({authenticated:true,user:{id:'creator'},profile:{full_name:'Creator',role:'creator'}}),
                requireAdmin:async()=>({authenticated:false}),
                getCurrentUser:async()=>{await new Promise(r=>setTimeout(r,40));return {user:{id:'creator'}};},
                getProfile:async()=>({profile:{full_name:'Creator'}}),
                getCreatorStats:async()=>({data:{total:75,published:60,draft:15,views:120}}),
                getSiteSettings:async()=>({data:null}),
                getHomepagePartners:async()=>({data:[],error:null}),
                getMarketplaceCategories:async()=>({data:[{name:'Scripts',slug:'script',icon:'book-open',status:'published'}],error:null}),
                getListings:async options=>(window.__listingOptions=options,{data:[{id:'uuid',slug:'real-slug',title:'A \\" onerror=\\"window.INJECTED=1',price:20,category:'script',creator:{full_name:'Creator'}}],count:75}),
                searchListings:async()=>({data:[],count:0}),
                countRows:async()=>({count:10}),
                uploadFile:async()=>({data:{path:'cover'}}),
                getPublicUrl:()=>'/assets/logo.png',
                removeFile:async()=>({error:null}),
                createListing:async payload=>{if(window.__failSave)return {error:new Error('Save failed')};window.__saved.push(payload);return {data:{id:'saved'}};},
                getArticleBySlug:async()=>({data:{slug:'article',title:'Title \\" onerror=\\"window.INJECTED=1',content:'<img src=x onerror=window.INJECTED=1>',status:'published',seo_title:'SEO title',seo_description:'SEO description',author:{name:'Author',bio:'Real biography',role:'Writer'}}}),
                submitContact:async payload=>{if(window.__failSave)return {error:new Error('Save failed')};window.__saved.push(payload);return {error:null};}
            };
        `});
        return route.continue();
    });
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/');
    await page.waitForSelector('#homepagePartners');
    assert.match(await page.locator('#homepagePartners').textContent(), /No featured partners published yet/);
    assert.equal(await page.locator('#homepagePartners').textContent().then(text => /Spotify|Adobe|Airbnb|Notion|Canon|Asana|Dropbox|Stripe|Netflix/.test(text)), false);
    await page.waitForSelector('#homeCategoryGrid');
    assert.match(await page.locator('#homeCategoryGrid').textContent(), /Scripts/);
    assert.equal(await page.locator('#homeCategoryGrid').textContent().then(text => /Storyboards|Music|Design|Motion|Copy/.test(text)), false);
    await page.goto(base+'/user/upload');
    await page.locator('[name="title"]').fill('Saved title');
    await page.locator('[name="category"]').selectOption('script');
    await page.locator('[name="price"]').fill('50');
    await page.evaluate(()=>document.querySelector('form[data-listing-form]').requestSubmit());
    await page.waitForFunction(()=>window.__saved.length===1);
    assert.equal(await page.evaluate(()=>window.__saved[0].title),'Saved title');
    assert.equal(await page.locator('[name="title"]').inputValue(),'');
    await page.evaluate(()=>window.__failSave=true);
    await page.locator('[name="title"]').fill('Keep this title');
    await page.locator('[name="category"]').selectOption('script');
    await page.evaluate(()=>document.querySelector('form[data-listing-form]').requestSubmit());
    await page.waitForFunction(()=>document.getElementById('formError').textContent==='Save failed');
    assert.equal(await page.locator('[name="title"]').inputValue(),'Keep this title');
    assert.equal(await page.evaluate(()=>window.__saved.length),1);
    await page.goto(base+'/products?page=2&category=script&maxPrice=0&sort=price_asc');
    await page.waitForSelector('#productsGrid a');
    assert.equal(await page.locator('#marketplaceCategoryFilters').textContent().then(text => /Storyboards|Music|Design|Motion|Copy/.test(text)), false);
    assert.equal(await page.locator('#productsGrid a').first().getAttribute('href'),'/product-detail.html?slug=real-slug');
    assert.equal(await page.locator('#pageTotal').textContent(),'75');
    assert.equal(await page.locator('#productsGrid img').getAttribute('onerror'),null);
    assert.match(await page.locator('#pagination').textContent(),/Page 2 of 4/);
    assert.equal(await page.locator('[data-market-sort]').inputValue(), 'price_asc');
    assert.deepEqual(await page.evaluate(() => window.__listingOptions.categories), ['script']);
    assert.equal(await page.evaluate(() => window.__listingOptions.maxPrice), '0');
    await page.goto(base+'/article?slug=article');
    await page.waitForFunction(()=>document.title==='SEO title');
    assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),'SEO description');
    assert.equal(await page.locator('#articleContent img').getAttribute('onerror'), null);
    await page.route('**/script/vendor/purify.min.js', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
    await page.reload();
    await page.waitForFunction(() => document.title === 'SEO title');
    assert.match(await page.locator('#articleContent').textContent(), /could not be loaded safely/);
    assert.equal(await page.evaluate(()=>window.INJECTED),undefined);
    await page.goto(base+'/user/dashboard');
    await page.waitForFunction(()=>document.getElementById('dashboardListingsValue')?.textContent==='75');
    assert.equal(await page.locator('#dashboardPublishedValue').textContent(),'60');
    await page.goto(base+'/user/settings');
    await page.waitForTimeout(100);
    const theme=page.locator('#settingsThemeToggle');
    if(await theme.count()) {
        await theme.evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
        assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('dark')),true);
    }
    await page.goto(base+'/contact');
    await page.locator('[name="name"]').fill('Name');
    await page.locator('[name="email"]').fill('name@example.com');
    await page.locator('[name="subject"]').selectOption('support');
    await page.locator('[name="message"]').fill('Please help');
    await page.locator('#consent').evaluate(el=>el.checked=true);
    await page.evaluate(()=>document.getElementById('contactForm').requestSubmit());
    await page.waitForFunction(()=>window.__saved.length===1);
    assert.equal(await page.evaluate(()=>window.__saved[0].message),'Please help');
    assert.deepEqual(errors,[]);
    console.log('Browser checks passed: homepage partner empty state, upload success/failure, clean routes, pagination, safe rendering, article metadata/fail-closed content, theme, contact persistence.');
} finally {
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
}
