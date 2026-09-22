/* Public reporting and first-party aggregate analytics. */
(() => {
'use strict';
window.EtchReport={attach(type,id,container){
 if(!container || container.querySelector('[data-report]'))return;
 const button=document.createElement('button');button.dataset.report='';button.className='border rounded-xl px-4 py-2 my-4';button.textContent='Report this content';
 const status=document.createElement('p');status.setAttribute('role','status');
 button.onclick=async()=>{
  const {user}=await EtchSupabase.getCurrentUser();
  if(!user){status.textContent='Please sign in to report content.';const link=document.createElement('a');link.href='/user/auth/signin.html';link.textContent=' Sign in';status.append(link);return;}
  const reason=prompt('Explain the issue (10–2,000 characters).');if(reason===null)return;
  if(reason.trim().length<10||reason.length>2000){status.textContent='Please enter 10–2,000 characters.';return;}
  button.disabled=true;
  try{const {error}=await EtchSupabase.getClient().from('content_reports').insert({reporter_id:user.id,content_type:type,content_id:id,reason:reason.trim()});
   status.textContent=error ? (error.code==='23505'?'You already have a pending report for this content.':error.message) : 'Report submitted for review.';
  }catch{status.textContent='Unable to submit. Please try again.';}finally{button.disabled=false;}
 };
 container.append(button,status);
}};
function analytics(){
 if(/^\/(admin|user)(\/|$)/.test(location.pathname)||location.pathname.includes('preview')||new URLSearchParams(location.search).has('preview')||navigator.doNotTrack==='1')return;
 const client=window.EtchSupabase?.getClient?.();if(!client)return;
 try{
  const now=Date.now(),params=new URLSearchParams(location.search);
  let session=JSON.parse(sessionStorage.getItem('etch_analytics_session')||'null');
  if(!session||now-session.last>1800000){session={id:crypto.randomUUID(),last:now,utm_source:(params.get('utm_source')||'').slice(0,120),utm_medium:(params.get('utm_medium')||'').slice(0,120),utm_campaign:(params.get('utm_campaign')||'').slice(0,120)};}
  session.last=now;sessionStorage.setItem('etch_analytics_session',JSON.stringify(session));
  const event={event_id:crypto.randomUUID(),session_id:session.id,path:location.pathname,utm_source:session.utm_source,utm_medium:session.utm_medium,utm_campaign:session.utm_campaign,active_seconds:0};
  let last=performance.now(),activity=last,active=0;
  const tick=()=>{const current=performance.now();if(document.visibilityState==='visible' && current-activity<60000)active+=Math.max(0,current-last)/1000;last=current;event.active_seconds=Math.min(14400,Math.floor(active));};
  const send=()=>{tick();client.rpc('record_page_view',event).then(()=>{}).catch(()=>{});};
  for(const name of ['pointerdown','keydown','scroll'])addEventListener(name,()=>{tick();activity=performance.now();session.last=Date.now();sessionStorage.setItem('etch_analytics_session',JSON.stringify(session));},{passive:true});
  setInterval(tick,1000);setInterval(send,15000);
  document.addEventListener('visibilitychange',()=>{send();last=performance.now();});
  addEventListener('pagehide',send);send();
 }catch{/* Storage-disabled browsers can still use the site. */}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',analytics,{once:true});else analytics();
})();
