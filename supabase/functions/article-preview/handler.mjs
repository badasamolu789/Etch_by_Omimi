const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encode=value=>btoa(String.fromCharCode(...value)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decode=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export function createHandler({env,fetchImpl=fetch,cryptoImpl=crypto,now=()=>Date.now()}){
 return async request=>{
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{headers});
  if(request.method!=='POST')return reply(405,{error:'POST required'});
  try{
   const raw=await request.text();if(raw.length>4096)return reply(413,{error:'Request too large'});
   const body=JSON.parse(raw),secret=env('ARTICLE_PREVIEW_SECRET'),base=env('SUPABASE_URL'),service=env('SUPABASE_SERVICE_ROLE_KEY');
   if(!secret||secret.length<32||!base||!service)return reply(503,{error:'Preview service is not configured'});
   const db=async(path,options={})=>{const result=await fetchImpl(base+'/rest/v1/'+path,{...options,headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json',Prefer:'return=representation'}});if(!result.ok)throw new Error('Preview database request failed');return result.status===204?null:result.json();};
   const key=await cryptoImpl.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
   if(body.action==='read'){
    if(typeof body.token!=='string'||body.token.length>1000)return reply(400,{error:'Invalid preview link'});
    const parts=body.token.split('.');if(parts.length!==2)return reply(400,{error:'Invalid preview link'});
    const [payload,signature]=parts;
    if(!await cryptoImpl.subtle.verify('HMAC',key,decode(signature),new TextEncoder().encode(payload)))return reply(403,{error:'Invalid preview link'});
    const claims=JSON.parse(new TextDecoder().decode(decode(payload)));
    if(!uuid.test(claims.id)||!Number.isFinite(claims.exp)||claims.exp<=now())return reply(410,{error:'Preview expired'});
    const [link]=await db('article_preview_links?select=*&id=eq.'+claims.id);
    if(!link||link.revoked||new Date(link.expires_at).getTime()<=now())return reply(410,{error:'Preview expired or revoked'});
    const [article]=await db('masterclass_articles?select=*,category:masterclass_categories(*),author:masterclass_authors(*)&id=eq.'+link.article_id);
    if(!article||article.status==='archived')return reply(404,{error:'Article unavailable'});
    return reply(200,{article});
   }
   const authorization=request.headers.get('Authorization')||'';
   const response=await fetchImpl(base+'/auth/v1/user',{headers:{apikey:service,Authorization:authorization}});
   if(!response.ok)return reply(401,{error:'Sign in required'});
   const user=await response.json();if(!uuid.test(user.id))return reply(401,{error:'Invalid user'});
   const [profile]=await db('profiles?select=role&id=eq.'+user.id);
   if(!['editor','admin','super_admin'].includes(profile?.role))return reply(403,{error:'Editorial permission required'});
   if(body.action==='revoke'){
    if(!uuid.test(body.id))return reply(400,{error:'Invalid preview ID'});
    await db('article_preview_links?id=eq.'+body.id,{method:'PATCH',body:JSON.stringify({revoked:true,updated_by:user.id})});return reply(200,{revoked:true});
   }
   if(body.action!=='create'||!uuid.test(body.articleId))return reply(400,{error:'Invalid article'});
   const hours=Number(body.hours??48);if(!Number.isFinite(hours)||hours<1||hours>168)return reply(400,{error:'Choose 1–168 hours'});
   const expires_at=new Date(now()+hours*3600000).toISOString();
   const [link]=await db('article_preview_links',{method:'POST',body:JSON.stringify({article_id:body.articleId,created_by:user.id,updated_by:user.id,expires_at})});
   const payload=encode(new TextEncoder().encode(JSON.stringify({id:link.id,exp:new Date(expires_at).getTime()})));
   const signature=encode(new Uint8Array(await cryptoImpl.subtle.sign('HMAC',key,new TextEncoder().encode(payload))));
   return reply(200,{id:link.id,token:payload+'.'+signature,expires_at});
  }catch{return reply(400,{error:'Unable to process preview request'});}
 };
}
