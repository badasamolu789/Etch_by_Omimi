/* Public storefront: published profile and published listings only. */
(async()=>{
'use strict';
const $=id=>document.getElementById(id),db=EtchSupabase.getClient();let offset=0,profile;
function text(tag,value){return Object.assign(document.createElement(tag),{textContent:value??''});}
async function loadListings(){
 $('creatorListings').textContent='Loading listings…';$('creatorPager').replaceChildren();
 try{
  const {data,error,count}=await db.from('listings').select('id,slug,title,description,cover_url,price,category',{count:'exact'}).eq('creator_id',profile.id).eq('status','published').order('created_at',{ascending:false}).order('id').range(offset,offset+23);
  if(error)throw error;$('creatorListings').replaceChildren();if(!data?.length)$('creatorListings').textContent='No published listings yet.';
  for(const record of data||[]){const card=document.createElement('article');card.className='creator-card';if(record.cover_url&&EtchUI.safeUrl(record.cover_url)){const img=document.createElement('img');img.src=EtchUI.safeUrl(record.cover_url);img.alt=record.title;img.loading='lazy';card.append(img);}const a=text('a',record.title);a.href=EtchUI.listingUrl(record);card.append(text('h2',record.title),text('p',record.description),text('p','Asking price: $'+Number(record.price||0).toLocaleString()),a);$('creatorListings').append(card);}
  $('creatorPager').append(text('span',(count??0)+' published listings'));
  for(const [label,enabled,delta] of [['Previous',offset>0,-24],['Next',offset+24<count,24]]){const button=text('button',label);button.type='button';button.disabled=!enabled;button.onclick=async()=>{button.disabled=true;offset=Math.max(0,offset+delta);await loadListings();};$('creatorPager').append(button);}
 }catch(error){$('creatorListings').textContent='Unable to load listings: '+error.message;const retry=text('button','Retry');retry.onclick=loadListings;$('creatorPager').append(retry);}
}
try{
 const params=new URLSearchParams(location.search),id=params.get('id'),username=params.get('username');if(!id&&!username)throw new Error('No creator selected.');
 let query=db.from('profiles').select('id,full_name,username,bio,avatar_url,website,location,storefront_ready').eq('storefront_ready',true);query=id?query.eq('id',id):query.eq('username',username);
 const {data,error}=await query.maybeSingle();if(error)throw error;if(!data)throw new Error('This storefront is private or unavailable.');profile=data;
 $('creatorName').textContent=profile.full_name||profile.username||'Creator';$('creatorBio').textContent=profile.bio||'';$('creatorLocation').textContent=profile.location||'';document.title=$('creatorName').textContent+' | ETCH';
 if(profile.avatar_url&&EtchUI.safeUrl(profile.avatar_url)){const img=document.createElement('img');img.src=EtchUI.safeUrl(profile.avatar_url);img.alt='Creator profile photo';$('creatorPhoto').append(img);}
 if(profile.website&&EtchUI.safeUrl(profile.website)){const a=text('a','Creator website');a.href=EtchUI.safeUrl(profile.website);a.rel='noopener noreferrer';a.target='_blank';$('creatorLinks').append(a);}
 $('creatorMessage').textContent='';await loadListings();
}catch(error){$('creatorMessage').textContent=error.message;$('creatorListings').replaceChildren();}
})();
