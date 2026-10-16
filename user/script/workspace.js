/* Creator settings, persisted summaries, and storefront controls. */
(async()=>{
'use strict';
if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
const auth=await window.ETCH_AUTH_READY;if(!auth?.authenticated)return;
const page=EtchUI.pageName(),db=EtchSupabase.getClient(),$=id=>document.getElementById(id);
const text=(tag,value)=>Object.assign(document.createElement(tag),{textContent:value??''});
function message(id,value){if($(id))$(id).textContent=value;}
function link(label,href){const a=text('a',label);a.href=href;return a;}
function photo(target,url){if(!target)return;target.replaceChildren();if(url&&EtchUI.safeUrl(url)){const img=document.createElement('img');img.src=EtchUI.safeUrl(url);img.alt='Profile photo';target.append(img);}else target.textContent=(auth.profile?.full_name||'Creator').slice(0,2).toUpperCase();}
function ownedAvatarPath(url){
 try{const marker='/storage/v1/object/public/avatars/';const pathname=new URL(url,location.origin).pathname;if(!pathname.includes(marker))return null;const path=decodeURIComponent(pathname.split(marker)[1]);return path.startsWith('profiles/'+auth.user.id+'/')&&!path.split('/').includes('..')?path:null;}catch{return null;}
}
async function run(button,operation){if(button.disabled)return;button.disabled=true;try{await operation();}catch(error){message('creatorStatus',error.message||'Unable to complete request.');}finally{button.disabled=false;}}
function listingCard(record){
 const card=document.createElement('article');card.className='creator-card';card.append(text('h3',record.title),text('p',record.status),text('p',record.moderation_reason));
 if(record.status!=='archived')card.append(link('Edit listing','/user/upload?'+new URLSearchParams({id:record.id})));
 card.append(link(record.status==='published'?'View listing':'Preview listing',EtchUI.listingUrl(record)));return card;
}
try{
 if(page==='settings'){
  if(!auth.profile)throw new Error('Your profile could not be loaded. Reload to retry.');
  let profile=auth.profile;
  const form=$('profileForm');
  for(const key of ['full_name','username','bio','account_type','website','location'])form.elements.namedItem(key).value=profile[key]||'';
  form.elements.namedItem('storefront_ready').checked=Boolean(profile.storefront_ready);
  $('accountEmail').value=auth.user.email||'';photo($('profilePhoto'),profile.avatar_url);
  form.onsubmit=event=>{event.preventDefault();if(!form.reportValidity())return;const button=form.querySelector('button[type="submit"]');run(button,async()=>{
   const fields=Object.fromEntries(new FormData(form));
   const payload={full_name:fields.full_name.trim(),username:fields.username.trim(),bio:fields.bio.trim(),account_type:fields.account_type,location:fields.location.trim(),website:fields.website.trim(),storefront_ready:form.elements.namedItem('storefront_ready').checked};
   if(payload.website&&!/^https?:\/\//i.test(payload.website))throw new Error('Use an HTTP or HTTPS website URL.');
   message('profileStatus','Saving…');const {profile:saved,error}=await EtchSupabase.updateProfile(auth.user.id,payload);if(error){message('profileStatus',error.code==='23505'?'That username is already taken. Your changes have been kept.':error.message);return;}
   profile=saved||{...profile,...payload};auth.profile=profile;window.ETCH_PROFILE=profile;
   message('profileStatus','Profile saved.');document.querySelectorAll('.user-sidebar-profile strong,.user-topbar .user-btn strong').forEach(el=>el.textContent=profile.full_name||profile.username);
  });};
  $('settingsThemeToggle').checked=document.documentElement.classList.contains('dark');
  $('settingsThemeToggle').onchange=event=>EtchUI.setTheme(event.target.checked?'dark':'light');
  $('saveAvatar').onclick=()=>run($('saveAvatar'),async()=>{
   const file=$('avatarFile').files[0];if(!file)throw new Error('Choose a profile photo first.');
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Use a JPG, PNG or WebP image up to 5 MB.');
   const path='profiles/'+auth.user.id+'/'+crypto.randomUUID()+'.'+({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type]);
   message('avatarStatus','Uploading photo…');const uploaded=await EtchSupabase.uploadFile('avatars',path,file);if(uploaded.error)throw uploaded.error;
   const url=EtchSupabase.getPublicUrl('avatars',path);const saved=await EtchSupabase.updateProfile(auth.user.id,{avatar_url:url});
   if(saved.error){await EtchSupabase.removeFile('avatars',path);throw saved.error;}
   const previous=ownedAvatarPath(profile.avatar_url);
   profile.avatar_url=url;photo($('profilePhoto'),url);document.querySelectorAll('.user-topbar .avatar,.user-sidebar .avatar').forEach(el=>photo(el,url));$('avatarFile').value='';message('avatarStatus','Profile photo saved.');if(previous){const cleanup=await EtchSupabase.removeFile('avatars',previous);if(cleanup.error)message('avatarStatus','Photo saved, but the previous file could not be removed. Contact ETCH for cleanup.');}
  });
  $('removeAvatar').onclick=()=>run($('removeAvatar'),async()=>{
   const previous=ownedAvatarPath(profile.avatar_url);const {error}=await EtchSupabase.updateProfile(auth.user.id,{avatar_url:null});if(error)throw error;profile.avatar_url=null;photo($('profilePhoto'),null);document.querySelectorAll('.user-topbar .avatar,.user-sidebar .avatar').forEach(el=>photo(el,null));message('avatarStatus','Profile photo removed.');if(previous){const cleanup=await EtchSupabase.removeFile('avatars',previous);if(cleanup.error)message('avatarStatus','Photo removed from your profile, but file deletion failed. Contact ETCH for cleanup.');}
  });
  async function verification(){
   const {data,error}=await db.from('verification_requests').select('status,decision_reason,created_at').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(1);
   if(error){message('verificationStatus','Unable to load verification: '+error.message);$('verificationForm').hidden=true;return;}
   const request=data?.[0];message('verificationStatus',request?'Verification: '+request.status+(request.decision_reason?' — '+request.decision_reason:''):'Not verified. You can submit a verification request.');$('verificationForm').hidden=Boolean(request&&['pending','approved'].includes(request.status));
  }
  $('verificationForm').onsubmit=event=>{event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;run(form.querySelector('button'),async()=>{
   const {error}=await db.from('verification_requests').insert({user_id:auth.user.id,evidence:new FormData(form).get('evidence')});if(error)throw error;form.reset();await verification();
  });};await verification();
 }
 if(['dashboard','storefront','analytics'].includes(page)){
  const target=$(page==='dashboard'?'recentListings':page==='storefront'?'storefrontListings':'listingAnalytics');
  let offset=0,request=0;const pager=document.createElement('div');pager.className='creator-actions';target.after(pager);
  async function load(){
   const current=++request;target.textContent='Loading listings…';let query=db.from('listings').select('id,title,slug,status,views,moderation_reason,cover_url',{count:'exact'}).eq('creator_id',auth.user.id).order('created_at',{ascending:false}).order('id').range(offset,offset+(page==='dashboard'?4:23));
   if(page==='storefront')query=query.eq('status','published');
   const {data,error,count}=await query;if(current!==request)return;if(error)throw error;target.replaceChildren();pager.replaceChildren();
   if(!data?.length)target.textContent='No listings to display.';
   let metrics=null;
   if(page==='analytics'){const result=await db.rpc('creator_listing_metrics');if(result.error)throw result.error;metrics=new Map((result.data||[]).map(row=>[row.id,row.views]));}
   for(const record of data||[]){if(page==='analytics'){const item=text('p',record.title+' — '+(metrics.has(record.id)?metrics.get(record.id):'unavailable')+' recorded views');target.append(item);}else target.append(listingCard(record));}
   if(page!=='dashboard'){
    pager.append(text('span',(count??0)+' listings · Page '+(offset/24+1)));
    for(const [label,enabled,delta] of [['Previous',offset>0,-24],['Next',offset+24<count,24]]){const button=text('button',label);button.type='button';button.disabled=!enabled;button.onclick=()=>run(button,async()=>{offset=Math.max(0,offset+delta);await load();});pager.append(button);}
   }
  }
  await load();
 }
 if(page==='storefront'){
  const p=auth.profile;if(!p)throw new Error('Profile unavailable. Reload to retry.');
  $('storefrontSummary').replaceChildren(text('h2',p.full_name||p.username||'Your storefront'),text('p',p.bio||'Add a biography in Settings.'),text('p',p.storefront_ready?'Your storefront is public.':'Your storefront is private. Publish it in Settings when ready.'));
  if(p.storefront_ready){const url=new URL('/creator',location.origin);url.searchParams.set('id',auth.user.id);$('publicStorefront').href=url.href;$('publicStorefront').hidden=false;$('copyStorefront').hidden=false;$('copyStorefront').onclick=()=>run($('copyStorefront'),async()=>{try{await navigator.clipboard.writeText(url.href);message('storefrontStatus','Storefront link copied.');}catch{message('storefrontStatus','Copy this link: '+url.href);}});}
 }
}catch(error){message('creatorStatus','Unable to load or save: '+error.message+'. Reload to retry.');}
})();
