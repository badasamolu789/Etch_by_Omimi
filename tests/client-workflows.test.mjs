import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function dom() {
    const elements = new Map();
    const make = () => ({textContent:'',innerHTML:'',hidden:false,disabled:false,children:[],style:{},classList:{add(){},remove(){}},
        replaceChildren(...items){this.children=items;this.textContent=items.join('');},
        append(...items){this.children.push(...items);},prepend(...items){this.children.unshift(...items);},after(){},setAttribute(){},
        querySelector(){return null;},reportValidity(){return true;}});
    const get = id => {if(!elements.has(id))elements.set(id,make());return elements.get(id);};
    return {get,document:{getElementById:get,createElement:make,querySelector:()=>get('main'),addEventListener(){}}};
}
const applicationSource=readFileSync(new URL('../script/founding-application.js',import.meta.url),'utf8');
async function application({readError=null,existing=null,insertError=null,allowed=true,token='',redeemed=true}={}) {
    const {document,get}=dom();
    const form=get('applicationForm'),button=get('submit');form.querySelector=()=>button;
    const inserts=[];
    const client={rpc:async name=>({data:name==='redeem_founding_invitation'?redeemed:allowed,error:null}),from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:existing,error:readError})})}),insert:async payload=>{inserts.push(payload);return {error:insertError};}})};
    const context=vm.createContext({document,location:{pathname:'/founding-voices',search:'',hash:token?'#invite='+token:''},history:{replaceState(){}},URLSearchParams,sessionStorage:{setItem(){}},FormData:class {constructor(){return new Map([['full_name','Writer'],['portfolio_url','https://example.test/sample'],['statement','A writing sample statement.']]);}},EtchSupabase:{getCurrentUser:async()=>({user:{id:'writer-id',email:'writer@example.test'}}),getClient:()=>client}});
    await vm.runInContext(applicationSource,context);
    return {form,button,status:get('applicationStatus'),inserts};
}
test('application read failure blocks submission instead of inviting duplicate applications',async()=>{
    const result=await application({readError:new Error('Permission denied')});
    assert.equal(result.form.hidden,true);
    assert.equal(result.button.disabled,true);
    assert.match(result.status.textContent,/Unable to check.*Permission denied/);
    assert.equal(result.inserts.length,0);
});
test('existing application displays saved decision without reopening form',async()=>{
    const result=await application({existing:{status:'declined',decision_reason:'Cohort full'}});
    assert.equal(result.form.hidden,true);
    assert.match(result.status.textContent,/declined.*Cohort full/);
});
test('successful application stays submitted even without a second read',async()=>{
    const result=await application();
    await result.form.onsubmit({preventDefault(){}});
    assert.equal(result.inserts.length,1);
    assert.equal(result.inserts[0].user_id,'writer-id');
    assert.equal(result.form.hidden,true);
    assert.match(result.status.textContent,/awaiting review/);
});
test('failed application insert preserves form and enables retry',async()=>{
    const result=await application({insertError:new Error('Network unavailable')});
    await result.form.onsubmit({preventDefault(){}});
    assert.equal(result.form.hidden,false);
    assert.equal(result.button.disabled,false);
    assert.match(result.status.textContent,/answers have been kept/);
});

const dashboardHtml=readFileSync(new URL('../admin/index.html',import.meta.url),'utf8');
const dashboardSource=[...dashboardHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].at(-1)[1];
test('dashboard exact counts distinguish failed counts from zero and recover on retry',async()=>{
    const {document,get}=dom();let fail=false;
    const article={title:'Published',status:'published',views:7};
    const client={from:()=>({select:()=>({order:()=>({range:async()=>({data:[article],count:1})})})})};
    const api={getClient:()=>client,countRows:async()=>({count:3,error:fail?new Error('Denied'):null}),getCategories:async()=>({data:[]}),getAuthors:async()=>({data:[]}),getArticles:async()=>({data:[article]})};
    const context=vm.createContext({document,window:{EtchSupabase:api},EtchSupabase:api,EtchUI:{escapeHtml:String},console});
    vm.runInContext(dashboardSource,context);
    await vm.runInContext('loadDashboardStats()',context);
    assert.equal(get('masterclassPublishedArticles').textContent,'3');
    assert.equal(get('masterclassTotalViews').textContent,'7');
    fail=true;await vm.runInContext('loadDashboardStats()',context);
    assert.equal(get('masterclassPublishedArticles').textContent,'—');
    assert.equal(get('masterclassTotalArticles').textContent,'—');
    fail=false;await vm.runInContext('loadDashboardStats()',context);
    assert.equal(get('masterclassPublishedArticles').textContent,'3');
});

test('authors header and totals recover together after a failed request',async()=>{
    const {document,get}=dom();document.querySelector=selector=>get(selector.replace(/^#/,''));
    let fail=false;
    const api={getAuthors:async()=>({data:fail?[]:[{id:'a',name:'Real Author',slug:'real',status:null}],error:fail?new Error('Denied'):null}),getArticles:async()=>({data:[],count:3})};
    const html=readFileSync(new URL('../admin/author.html',import.meta.url),'utf8');
    const source=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].at(-1)[1];
    const context=vm.createContext({document,window:{},EtchSupabase:api,EtchUI:{escapeHtml:String},console:{error(){}}});
    vm.runInContext(source,context);
    await vm.runInContext('loadAuthors()',context);
    assert.match(get('authorsHeaderLabel').textContent,/1 total author/);
    assert.equal(get('authorsTotalStat').textContent,'1');
    fail=true;await vm.runInContext('loadAuthors()',context);
    assert.equal(get('authorsHeaderLabel').textContent,'Authors unavailable');
    assert.equal(get('authorsTotalStat').textContent,'—');
    fail=false;await vm.runInContext('loadAuthors()',context);
    assert.match(get('authorsHeaderLabel').textContent,/1 total author/);
});

test('category refresh obtains fresh values and preserves selection through errors',async()=>{
    const {document,get}=dom();
    class Option {constructor(text,value){this.textContent=text;this.value=value;}}
    for(const id of ['articleCategory','articleAuthor']) {
        const select=get(id);select.value=id==='articleCategory'?'cat':'author';select.options=[];
        Object.defineProperty(select,'selectedOptions',{get:()=>select.options.filter(option=>option.value===select.value)});
        select.replaceChildren=(...options)=>{select.options=options;select.value=options[0]?.value;};
        select.add=option=>select.options.push(option);
        select.options=[new Option('Original',select.value)];
    }
    let fail=false;
    const api={getCategories:async()=>({data:[{id:'cat',name:'New category'}],error:fail?new Error('Network failed'):null}),getAuthors:async()=>({data:[{id:'author',name:'Author'}]})};
    const html=readFileSync(new URL('../admin/create_article.html',import.meta.url),'utf8');
    const source=html.slice(html.indexOf('        let optionsRequest ='),html.indexOf('        // FORM SUBMISSION'));
    const context=vm.createContext({document,Option,EtchSupabase:api});
    vm.runInContext(source,context);
    await vm.runInContext('loadFormOptions(true)',context);
    assert.equal(get('articleCategory').value,'cat');
    assert.equal(get('articleCategory').selectedOptions[0].textContent,'New category');
    fail=true;await assert.rejects(vm.runInContext('loadFormOptions(true)',context),/Network failed/);
    assert.equal(get('articleCategory').value,'cat');
    assert.equal(get('articleCategory').selectedOptions[0].textContent,'New category');
});

test('application review remains readable and loads history without an active rubric',async()=>{
    const {document,get}=dom();const queried=[];
    const client={from:table=>{queried.push(table);const result={data:table==='founding_rubrics'?null:[],error:null};const q=new Proxy({then:resolve=>Promise.resolve(result).then(resolve)},{get:(target,key)=>key in target?target[key]:()=>q});return q;}};
    const source=readFileSync(new URL('../admin/script/workspace.js',import.meta.url),'utf8');
    const functionSource=source.slice(source.indexOf('async function reviewApplication('),source.indexOf('async function initialize('));
    const context=vm.createContext({document,$:get,EtchSupabase:{getClient:()=>client},button:()=>document.createElement('button'),details:()=>document.createElement('details')});
    vm.runInContext(functionSource,context);
    await vm.runInContext("reviewApplication({id:'application',full_name:'Writer',email:'writer@example.test',statement:'Full writing statement',status:'submitted'})",context);
    assert.ok(queried.includes('founding_reviews'));
    assert.ok(queried.includes('acceptance_deliveries'));
    const text=get('applicationReview').children.map(child=>child.textContent).join(' ');
    assert.match(text,/Full writing statement/);
    assert.match(text,/Admin must configure/);
});

test('reports queue retries failed reads and resolves the reported record before linking',async()=>{
    const {document,get}=dom();let ready;let fail=true;
    document.body={dataset:{workspace:'reports'}};
    document.addEventListener=(name,callback)=>{if(name==='admin:components-ready')ready=callback;};
    get('queueStatus').value='';get('queueStatus').add=()=>{};
    const report={id:'report',content_type:'listing',content_id:'listing',reason:'A complete report reason',status:'pending'};
    const client={from:table=>{let one=false;const q=new Proxy({then:resolve=>Promise.resolve({data:one?{id:'listing',title:'Reported script',slug:'reported',status:'published'}:[report],count:1,error:fail?new Error('Read failed'):null}).then(resolve)},{get:(target,key)=>key in target?target[key]:(...args)=>{if(key==='maybeSingle')one=true;return q;}});return q;}};
    const context=vm.createContext({document,window:{},Option:class {},EtchSupabase:{getClient:()=>client},EtchUI:{escapeHtml:String,listingUrl:record=>'/product-detail?slug='+record.slug}});
    vm.runInContext(readFileSync(new URL('../admin/script/workspace.js',import.meta.url),'utf8'),context);
    await ready();
    assert.equal(get('queueCount').textContent,'Records unavailable');
    const retry=get('queueContent').children.find(child=>child.textContent==='Retry loading');
    assert.ok(retry);fail=false;await retry.onclick();
    assert.match(get('queueCount').textContent,/1 records/);
    function find(element,label) {if(element.textContent===label)return element;for(const child of element.children||[]){const match=find(child,label);if(match)return match;}}
    assert.ok(find(get('queueContent'),'Report: A complete report reason'));
    await find(get('queueContent'),'View reported content').onclick();
    const link=find(get('queueContent'),'Open reported content');
    assert.equal(link.href,'/product-detail?slug=reported');
});

test('uninvited writers cannot open the application form',async()=>{
    const result=await application({allowed:false});
    assert.equal(result.form.hidden,true);
    assert.match(result.status.textContent,/by invitation/);
});
test('personal invitation with an email mismatch stays blocked',async()=>{
    const result=await application({token:'a'.repeat(64),redeemed:false});
    assert.equal(result.form.hidden,true);
    assert.match(result.status.textContent,/different email/);
});
test('approved writer with a redeemed invitation can apply',async()=>{
    const result=await application({token:'a'.repeat(64)});
    assert.equal(result.form.hidden,false);
    await result.form.onsubmit({preventDefault(){}});
    assert.equal(result.inserts.length,1);
});
test('sign-in return path preserves invitation fragments and rejects external redirects',()=>{
    let saved='/founding-voices#invite=personal-token';
    const context=vm.createContext({window:{location:{origin:'https://etch.example'}},URL,sessionStorage:{getItem:()=>saved,removeItem:()=>{saved=null;}}});
    vm.runInContext(readFileSync(new URL('../script/core.js',import.meta.url),'utf8'),context);
    assert.equal(vm.runInContext('window.EtchUI.consumeAuthRedirect()',context),'/founding-voices#invite=personal-token');
    assert.equal(saved,null);
    for(const value of ['//outside.example','https://outside.example','/\\outside.example','/user/auth/signin.html']){
        saved=value;assert.equal(vm.runInContext('window.EtchUI.consumeAuthRedirect()',context),'/user/dashboard.html');
    }
});

async function finishAuthentication(saved,session,receipts=[]) {
    const source=readFileSync(new URL('../user/script/auth.js',import.meta.url),'utf8');
    const finishSource=source.slice(source.indexOf('async function finish(session)'),source.indexOf("if(page==='signup')"));
    const calls=[],redirects=[];
    const client={from:table=>{const result={data:table==='legal_documents'?[{id:'terms',document_key:'terms'},{id:'privacy',document_key:'privacy'}]:receipts,error:null};const q=new Proxy({then:resolve=>Promise.resolve(result).then(resolve)},{get:(target,key)=>key in target?target[key]:()=>q});return q;},rpc:async(name,args)=>{calls.push({name,args});return {error:null};}};
    const context=vm.createContext({client,storageGet:()=>saved,storageRemove(){},location:{assign:value=>redirects.push(value)},EtchUI:{consumeAuthRedirect:()=>'/user/dashboard'}});
    vm.runInContext(finishSource,context);context.session=session;await vm.runInContext('finish(session)',context);
    return {calls,redirects};
}
test('malformed pending consent cannot interrupt a successful sign-in',async()=>{
    const result=await finishAuthentication('{broken',{user:{id:'writer',email:'writer@example.test',user_metadata:{}}});
    assert.deepEqual(result.redirects,['/user/dashboard']);assert.equal(result.calls.length,0);
});
test('pending signup consent is not applied to a different signed-in account',async()=>{
    const result=await finishAuthentication(JSON.stringify({email:'first@example.test',ids:['terms','privacy']}),{user:{id:'second',email:'second@example.test',user_metadata:{}}});
    assert.equal(result.calls.length,0);assert.deepEqual(result.redirects,['/user/dashboard']);
});
test('matching signup consent is recorded for its account only',async()=>{
    const result=await finishAuthentication(JSON.stringify({email:'writer@example.test',ids:['terms','privacy']}),{user:{id:'writer',email:'WRITER@example.test',user_metadata:{}}});
    assert.equal(result.calls.length,1);assert.equal(result.calls[0].name,'accept_legal_documents');assert.deepEqual([...result.calls[0].args.document_ids],['terms','privacy']);
});
