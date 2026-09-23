import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createShareHandler} from '../server/share-pages.mjs';
const template='<!doctype html><html><head><title>Old</title><meta name="description" content="Old"><meta property="og:title" content="Old"></head><body>Page</body></html>';
function setup(record,options={}){
 const calls=[];
 const handler=createShareHandler({origin:'https://etchbyomimi.com',supabaseUrl:'https://db.example',anonKey:'public-anon',readTemplate:async()=>template,fetchImpl:async(url,init)=>{calls.push({url,init});return Response.json(record?[record]:[],{status:options.status||200});}});
 return {handler,calls};
}
test('article sharing metadata exists in raw HTML, with escaped title and absolute image',async()=>{
 const {handler,calls}=setup({slug:'story',status:'published',title:'A "great" & true story',excerpt:'Description of the story',featured_image:'/assets/story.jpg'});
 const response=await handler(new Request('https://etchbyomimi.com/article?slug=story'));const html=await response.text();
 assert.equal(response.status,200);assert.match(html,/property="og:title" content="A &quot;great&quot; &amp; true story"/);
 assert.match(html,/property="og:image" content="https:\/\/etchbyomimi.com\/assets\/story.jpg"/);
 assert.match(html,/name="twitter:card" content="summary_large_image"/);
 assert.match(html,/property="og:description" content="Description of the story"/);
 assert.equal((html.match(/<title>/g)||[]).length,1);assert.equal((html.match(/property="og:title"/g)||[]).length,1);
 assert.equal(new URL(calls[0].url).searchParams.get('status'),'eq.published');
 assert.equal(calls[0].init.headers.Authorization,'Bearer public-anon');
});
test('product links receive their own image, title and description',async()=>{
 const {handler}=setup({id:'11111111-1111-4111-8111-111111111111',slug:'script',status:'published',title:'Film script',description:'A mystery screenplay',cover_url:'https://images.example/script.jpg'});
 const response=await handler(new Request('https://etchbyomimi.com/product-detail?slug=script'));const html=await response.text();
 assert.match(html,/Film script/);assert.match(html,/A mystery screenplay/);assert.match(html,/https:\/\/images.example\/script.jpg/);
});
test('drafts, unknown articles, and identifier-free requests do not expose share metadata',async()=>{
 for(const record of [null,{slug:'draft',title:'Secret draft',status:'draft'}]){
  const {handler}=setup(record);const response=await handler(new Request('https://etchbyomimi.com/article?slug=draft'));
  assert.equal(response.status,404);const html=await response.text();assert.ok(!html.includes('Secret draft'));assert.ok(!html.includes('og:title'));assert.match(html,/noindex/);
 }
 const {handler,calls}=setup(null);assert.equal((await handler(new Request('https://etchbyomimi.com/article'))).status,404);assert.equal(calls.length,0);
});
test('staff preview returns noindex generic HTML without any database lookup',async()=>{
 const {handler,calls}=setup({title:'Secret',status:'draft'});const response=await handler(new Request('https://etchbyomimi.com/article?slug=draft&preview=1'));
 assert.equal(response.status,200);assert.equal(calls.length,0);assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(!(await response.text()).includes('Secret'));
});
test('upstream failure is a retryable 503 and no private metadata is cached',async()=>{
 const {handler}=setup(null,{status:500});const response=await handler(new Request('https://etchbyomimi.com/article?slug=story'));
 assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('homepage and masterclass use the shared article link helper',()=>{
 for(const path of ['index.html','script/masterclass.js']){const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');assert.ok(!source.includes('article.html?'));assert.ok(source.includes('EtchUI.articleUrl(article.slug)'));}
});
