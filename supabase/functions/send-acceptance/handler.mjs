export function createHandler({env,fetchImpl=fetch}){
 return async request=>{
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Content-Type':'application/json'};
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{headers});
  if(request.method!=='POST')return reply(405,{error:'POST required'});
  const base=env('SUPABASE_URL'),service=env('SUPABASE_SERVICE_ROLE_KEY'),provider=env('RESEND_API_KEY'),sender=env('ACCEPTANCE_FROM');
  if(!base||!service||!provider||!sender)return reply(503,{error:'Acceptance email sender is not configured'});
  const db=(path,options={})=>fetchImpl(base+'/rest/v1/'+path,{...options,headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json',Prefer:'return=representation'}});
  let applicationId,claimed=false;
  try{
   const auth=await fetchImpl(base+'/auth/v1/user',{headers:{apikey:service,Authorization:request.headers.get('Authorization')||''}});
   if(!auth.ok)return reply(401,{error:'Sign in required'});
   const user=await auth.json();
   const profileResult=await db('profiles?select=role&id=eq.'+encodeURIComponent(user.id));
   if(!profileResult.ok)throw new Error('Cannot verify permissions');
   const [profile]=await profileResult.json();
   if(!['reviewer','admin','super_admin'].includes(profile?.role))return reply(403,{error:'Application review permission required'});
   const raw=await request.text();if(raw.length>1024)return reply(413,{error:'Request too large'});
   applicationId=JSON.parse(raw).applicationId;
   if(!/^[0-9a-f-]{36}$/i.test(applicationId||''))return reply(400,{error:'Invalid application ID'});
   const result=await db('founding_applications?select=id,email,full_name,status&id=eq.'+applicationId);
   if(!result.ok)throw new Error('Cannot load application');
   const [application]=await result.json();
   if(!application||application.status!=='accepted')return reply(400,{error:'Application must be accepted first'});
   const claim=await db('acceptance_deliveries',{method:'POST',body:JSON.stringify({application_id:applicationId,created_by:user.id})});
   if(claim.status===409)return reply(409,{error:'An acceptance email was already submitted. Check the delivery record before resending.'});
   if(!claim.ok)throw new Error('Cannot record delivery');
   claimed=true;
   const delivery=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+provider,'Content-Type':'application/json','Idempotency-Key':'founding-acceptance/'+applicationId},body:JSON.stringify({from:sender,to:[application.email],subject:'Welcome to ETCH Founding Voices',text:`Hello ${application.full_name},\n\nYour application to ETCH Founding Voices has been accepted. We are pleased to welcome you. Our team will follow up with the next steps.\n\nThe ETCH team`})});
   const sent=await delivery.json();if(!delivery.ok||!sent.id)throw new Error('Email provider did not confirm delivery');
   const saved=await db('acceptance_deliveries?application_id=eq.'+applicationId,{method:'PATCH',body:JSON.stringify({status:'sent',provider_id:sent.id,sent_at:new Date().toISOString()})});
   if(!saved.ok)throw new Error('Email sent but delivery record could not be updated');
   return reply(200,{sent:true});
  }catch(error){
   if(claimed)await db('acceptance_deliveries?application_id=eq.'+applicationId,{method:'PATCH',body:JSON.stringify({status:'uncertain'})}).catch(()=>{});
   return reply(502,{error:claimed?'Delivery is uncertain. Review the delivery record and provider logs before retrying.':error.message||'Email request failed'});
  }
 };
}
