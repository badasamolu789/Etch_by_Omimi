import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createHandler as previewHandler} from '../supabase/functions/article-preview/handler.mjs';
import {createHandler as acceptanceHandler} from '../supabase/functions/send-acceptance/handler.mjs';
import {sitemap} from '../tools/build-sitemap.mjs';
const user='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',article='33333333-3333-4333-8333-333333333333';
const request=body=>new Request('https://local/function',{method:'POST',headers:{Authorization:'Bearer token'},body:JSON.stringify(body)});
function previews(role='editor'){
 let link,clock=Date.now();
 const handler=previewHandler({cryptoImpl:webcrypto,now:()=>clock,env:key=>({SUPABASE_URL:'https://db',SUPABASE_SERVICE_ROLE_KEY:'service',ARTICLE_PREVIEW_SECRET:'a-secret-with-at-least-thirty-two-characters'}[key]),fetchImpl:async(url,options={})=>{
  if(url.includes('/auth/'))return Response.json({id:user});
  if(url.includes('/profiles?'))return Response.json([{role}]);
  if(url.endsWith('/article_preview_links')){link={id,...JSON.parse(options.body)};return Response.json([link]);}
  if(url.includes('/article_preview_links?')){if(options.method==='PATCH')link.revoked=true;return Response.json(link?[link]:[]);}
  if(url.includes('/masterclass_articles?'))return Response.json([{id:article,title:'Draft',status:'draft'}]);
  throw new Error('Unexpected fetch '+url);
 }});
 return {handler,advance:()=>{clock+=49*3600000;}};
}
test('signed previews validate signature, expiry and revocation',async()=>{
 const {handler,advance}=previews();
 const created=await handler(request({action:'create',articleId:article,hours:48}));assert.equal(created.status,200);const {token}=await created.json();
 const read=await handler(request({action:'read',token}));assert.equal((await read.json()).article.title,'Draft');
 assert.equal((await handler(request({action:'read',token:token.replace(/^./,token[0]==='a'?'b':'a')}))).status,403);
 assert.equal((await handler(request({action:'revoke',id}))).status,200);
 assert.equal((await handler(request({action:'read',token}))).status,410);
 advance();assert.equal((await handler(request({action:'read',token}))).status,410);
});
test('reviewers and creators cannot issue draft preview links',async()=>{
 for(const role of ['creator','reviewer'])assert.equal((await previews(role).handler(request({action:'create',articleId:article}))).status,403);
});
function acceptance({role='admin',status='accepted',providerFails=false}={}){
 let claimed=false,calls=0;const records=[];
 const handler=acceptanceHandler({env:key=>({SUPABASE_URL:'https://db',SUPABASE_SERVICE_ROLE_KEY:'service',RESEND_API_KEY:'provider',ACCEPTANCE_FROM:'ETCH <mail@example.test>'}[key]),fetchImpl:async(url,options={})=>{
  if(url.includes('/auth/'))return Response.json({id:user});
  if(url.includes('/profiles?'))return Response.json([{role}]);
  if(url.includes('/founding_applications?'))return Response.json([{id,email:'approved@example.test',full_name:'Writer',status}]);
  if(url.endsWith('/acceptance_deliveries')){if(claimed)return Response.json({},{status:409});claimed=true;return Response.json([{id}]);}
  if(url.includes('/acceptance_deliveries?')){records.push(JSON.parse(options.body));return Response.json([]);}
  if(url==='https://api.resend.com/emails'){calls++;assert.deepEqual(JSON.parse(options.body).to,['approved@example.test']);return providerFails?Response.json({error:'failed'},{status:500}):Response.json({id:'provider-id'});}
  throw new Error('Unexpected fetch '+url);
 }});
 return {handler,calls:()=>calls,records};
}
test('acceptance emails use saved recipients and prevent duplicate sending',async()=>{
 const service=acceptance();assert.equal((await service.handler(request({applicationId:id,to:'injected@example.test'}))).status,200);
 assert.equal((await service.handler(request({applicationId:id}))).status,409);assert.equal(service.calls(),1);assert.equal(service.records[0].status,'sent');
});
test('acceptance emails reject unaccepted applications and unauthorized callers',async()=>{
 for(const options of [{role:'creator'},{role:'editor'},{status:'submitted'}]){const service=acceptance(options);assert.ok((await service.handler(request({applicationId:id}))).status>=400);assert.equal(service.calls(),0);}
});
test('uncertain acceptance delivery is recorded and cannot be blindly retried',async()=>{
 const service=acceptance({providerFails:true});assert.equal((await service.handler(request({applicationId:id}))).status,502);assert.equal(service.records[0].status,'uncertain');assert.equal((await service.handler(request({applicationId:id}))).status,409);assert.equal(service.calls(),1);
});
test('sitemap excludes drafts and escapes query parameters',()=>{
 const xml=sitemap({origin:'https://example.test',articles:[{slug:'draft',status:'draft'},{slug:'a&b',status:'published'}],listings:[{id,slug:'script',status:'published'}]});
 assert.ok(!xml.includes('draft'));assert.ok(!xml.includes('/admin'));assert.ok(!xml.includes('preview'));assert.ok(xml.includes('slug=a%26b'));assert.ok(xml.includes('/product-detail?slug=script'));
});
