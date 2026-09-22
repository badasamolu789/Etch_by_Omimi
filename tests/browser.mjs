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
            window.__saved=[];window.__dbCalls=[];
            window.EtchSupabase={
                getClient:()=>({rpc:async()=>({data:null,error:null}),from:table=>{const q=new Proxy({then:resolve=>Promise.resolve({data:[],error:null,count:0}).then(resolve)},{get:(target,key)=>key in target?target[key]:(...args)=>{window.__dbCalls.push({table,method:key,args});return q;}});return q;}}),
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
                getArticleBySlug:async()=>({data:{id:'article-id',slug:'article',title:'Title \\" onerror=\\"window.INJECTED=1',content:'<img src=x onerror=window.INJECTED=1>',status:'published',seo_title:'SEO title',seo_description:'SEO description',author:{name:'Author',bio:'Real biography',role:'Writer'}}}),
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
    await page.goto(base+'/user/listings');
    await page.waitForFunction(()=>document.querySelector('main').textContent.includes('No matching listings.'));
    await page.goto(base+'/article?slug=article');
    await page.getByRole('button',{name:'Report this content'}).waitFor();
    page.once('dialog',dialog=>dialog.accept('A report with sufficient detail'));
    await page.getByRole('button',{name:'Report this content'}).click();
    await page.waitForFunction(()=>window.__dbCalls.some(call=>call.table==='content_reports'&&call.method==='insert'));
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
    // Admin UI fixtures exercise real page scripts while keeping all service calls local.
    await page.route('https://cdn.ckeditor.com/**',route=>route.fulfill({contentType:'application/javascript',body:`window.ClassicEditor={create:async el=>({getData:()=>el.value,setData:value=>{el.value=value;}})};`}));
    await page.route('**/script/supabase.js',route=>route.fulfill({contentType:'application/javascript',body:`
      window.__updates=[];window.__queries=[];window.__rpcs=[];
      const article={id:'article-id',slug:'existing',title:'Existing title',content:'Existing body',status:'draft',published_at:null,featured_image:'/assets/logo.png',category_id:'category-id',author_id:'author-id',reading_time:5,seo_title:'Search title',seo_description:'Search description',author:{id:'author-id',name:'Author'},category:{id:'category-id',name:'Category'}};
      const tables={masterclass_articles:[article],article_preview_links:[],masterclass_authors:[{id:'author-id',name:'Author',slug:'author',status:null}],profiles:[{id:'creator-id',full_name:'Writer',username:'writer',role:'creator',account_type:'writer'}],verification_requests:[{id:'verification-id',user_id:'creator-id',evidence:'https://portfolio.example',status:'pending'}],listings:[{id:'listing-id',title:'Review script',status:'review'}],content_reports:[{id:'report-id',content_type:'listing',content_id:'listing-id',reason:'Policy violation',status:'pending'}],founding_applications:[{id:'application-id',full_name:'Applicant',email:'applicant@example.test',portfolio_url:'https://example.test',statement:'Application statement',status:'submitted'}],founding_rubrics:[{id:'rubric-id',active:true,criteria:[{key:'writing',name:'Writing',weight:100}]}],founding_reviews:[],acceptance_deliveries:[],admin_audit_log:[{id:1,action:'UPDATE',entity:'listings',actor_role:'reviewer'}],newsletter_subscribers:[{id:'subscriber-id',email:'subscriber@example.test',name:'Name',subscribed_at:'2026-09-01'}]};
      if(location.pathname.includes('founding-voices'))tables.founding_applications=[];
      function query(table){let one=false;const q=new Proxy({then:resolve=>Promise.resolve({data:one?(tables[table]||[])[0]||null:tables[table]||[],count:(tables[table]||[]).length,error:null}).then(resolve)},{get:(target,key)=>key in target?target[key]:(...args)=>{if(['single','maybeSingle'].includes(key))one=true;window.__queries.push({table,method:key,args});return q;}});return q;}
      const client={from:query,rpc:async(name,args)=>{window.__rpcs.push({name,args});return {data:name==='analytics_summary'?{page_views:10,sessions:4,average_active_session_seconds:30,pages:[{path:'/about',views:10}],utm_breakdown:[{utm_source:'newsletter',utm_medium:'email',utm_campaign:'launch',views:10,sessions:4}]}:null,error:null};},functions:{invoke:async()=>({data:{sent:true},error:null})}};
      window.EtchSupabase={getClient:()=>client,requireAdmin:async()=>({authenticated:true,user:{id:'staff',email:'staff@example.test'},profile:{full_name:'Staff',role:'super_admin'}}),getCurrentUser:async()=>({user:{id:'staff',email:'applicant@example.test'}}),getProfile:async()=>({profile:{full_name:'Staff'}}),getSiteSettings:async()=>({data:{}}),getCategories:async()=>({data:[{id:'category-id',name:'Category'}]}),getAuthors:async()=>({data:tables.masterclass_authors}),getArticles:async options=>{window.__articleOptions=options;return {data:[article],count:1};},updateArticle:async(id,payload)=>{window.__updates.push({id,payload});if(window.__failUpdate)return {error:new Error('Update failed')};Object.assign(article,payload);return {data:article};},createArticle:async()=>{throw new Error('Edit must not create')},getNewsletterSubscribers:async()=>({data:tables.newsletter_subscribers})};
    `}));
    await page.goto(base+'/admin/create_article?id=article-id');
    await page.waitForFunction(()=>document.getElementById('articleTitle').value==='Existing title'&&!document.getElementById('saveBtn').disabled);
    assert.equal(await page.locator('#articleContent').inputValue(),'Existing body');
    await page.locator('#articleTitle').fill('Updated title');
    await page.locator('#seoTitle').fill('Updated SEO title');
    assert.match(await page.locator('[aria-label="Search engine preview"]').textContent(),/Updated SEO title/);
    await page.locator('#articleStatus').selectOption('scheduled');
    await page.locator('#publishDate').fill('2099-01-01T10:30');
    await page.locator('#saveBtn').click();
    await page.waitForFunction(()=>window.__updates.length===1);
    assert.equal(await page.evaluate(()=>window.__updates[0].id),'article-id');
    assert.equal(await page.evaluate(()=>window.__updates[0].payload.featured_image),'/assets/logo.png');
    assert.equal(await page.evaluate(()=>window.__updates[0].payload.status),'scheduled');
    assert.equal(await page.locator('#articleTitle').inputValue(),'Updated title');
    await page.locator('#saveDraftBtn').click();
    await page.waitForFunction(()=>window.__updates.length===2);
    assert.equal(await page.evaluate(()=>window.__updates[1].payload.published_at),null);
    await page.goto(base+'/admin/admin_masterclass');
    await page.waitForSelector('#articlesTableBody a[href*="create_article"]');
    await page.locator('#articleSearch').fill('Updated');
    await page.waitForFunction(()=>window.__articleOptions?.search==='Updated');
    await page.locator('#articleStatusFilter').selectOption('scheduled');
    await page.waitForFunction(()=>window.__articleOptions?.status==='scheduled');
    await page.goto(base+'/admin/author');
    await page.waitForFunction(()=>document.getElementById('authorsTotalStat').textContent==='1');
    assert.match(await page.locator('#authorsTableBody').textContent(),/Author/);
    await page.goto(base+'/admin/listings');
    await page.getByRole('button',{name:'Approve',exact:true}).click();
    await page.locator('dialog textarea').fill('Reviewed and approved');
    await page.getByRole('button',{name:'Confirm decision',exact:true}).click();
    await page.waitForFunction(()=>window.__rpcs.some(call=>call.name==='moderate_listing'));
    await page.goto(base+'/admin/applications');
    await page.getByRole('button',{name:'Review application',exact:true}).click();
    await page.locator('#queueExtras input[type="number"]').fill('85');
    await page.locator('#queueExtras textarea').fill('Strong writing');
    await page.getByRole('button',{name:'Save weighted review',exact:true}).click();
    await page.waitForFunction(()=>window.__rpcs.some(call=>call.name==='score_founding_application'));
    await page.goto(base+'/founding-voices');
    await page.locator('[name="full_name"]').fill('Applicant');
    await page.locator('[name="portfolio_url"]').fill('https://example.test/writing');
    await page.locator('[name="statement"]').fill('I have written feature scripts and would like to contribute to this creative community.');
    await page.getByRole('button',{name:'Submit application'}).click();
    await page.waitForFunction(()=>window.__queries.some(call=>call.table==='founding_applications'&&call.method==='insert'));
    await page.goto(base+'/admin/users');
    await page.getByRole('button',{name:'Save role',exact:true}).click();
    await page.waitForFunction(()=>window.__rpcs.some(call=>call.name==='set_staff_role'));
    await page.goto(base+'/admin/verification');
    await page.getByRole('button',{name:'approved',exact:true}).click();
    await page.locator('dialog textarea').fill('Portfolio verified');
    await page.getByRole('button',{name:'Confirm decision',exact:true}).click();
    await page.waitForFunction(()=>window.__rpcs.some(call=>call.name==='decide_verification'));
    await page.goto(base+'/admin/reports');
    await page.getByRole('button',{name:'removed',exact:true}).click();
    await page.locator('dialog textarea').fill('Confirmed violation');
    await page.getByRole('button',{name:'Confirm decision',exact:true}).click();
    await page.waitForFunction(()=>window.__rpcs.some(call=>call.name==='resolve_content_report'));
    await page.goto(base+'/admin/analytics');
    await page.waitForSelector('#queueContent table');
    assert.match(await page.locator('#queueContent').textContent(),/newsletter/);
    await page.goto(base+'/admin/audit');
    await page.waitForSelector('#queueContent table');
    assert.match(await page.locator('#queueContent').textContent(),/reviewer/);
    await page.goto(base+'/admin/newsletter');
    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'Export active subscribers for Mailchimp'}).click();
    const download=await downloadPromise;assert.match(download.suggestedFilename(),/etch-mailchimp/);
    assert.deepEqual(errors,[]);
    console.log('Admin browser checks passed: article edit/schedule/draft, image preservation, SEO preview, search/filter, nullable author status, moderation, scoring, role and verification decisions, reports, analytics, audit, CSV download.');

} finally {
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
}
