(async()=>{
'use strict';
const auth=await window.ETCH_AUTH_READY;if(!auth?.authenticated)return;
const db=EtchSupabase.getClient(),$=id=>document.getElementById(id),grid=$('catalogGrid');if(!grid)return;
let offset=0,request=0;
$('catalogSearch').value=new URLSearchParams(location.search).get('q')||'';
function button(label,action){const el=document.createElement('button');el.type='button';el.textContent=label;el.onclick=async()=>{if(el.disabled)return;el.disabled=true;try{await action();}catch(error){$('catalogMessage').textContent=error.code==='23503'?'This listing has linked conversations or enquiries. Return it to draft instead of deleting it.':error.message||'Unable to complete action.';}finally{el.disabled=false;}};return el;}
async function load(){
 const current=++request;$('catalogMessage').textContent='Loading listings…';
 try{
  let query=db.from('listings').select('*',{count:'exact'}).eq('creator_id',auth.user.id).order('created_at',{ascending:false}).order('id').range(offset,offset+23);
  if($('catalogSearch').value.trim())query=query.ilike('title','%'+$('catalogSearch').value.trim()+'%');
  if($('catalogStatus').value)query=query.eq('status',$('catalogStatus').value);
  const {data,error,count}=await query;if(current!==request)return;if(error)throw error;grid.replaceChildren();$('catalogPager').replaceChildren();$('catalogMessage').textContent=data.length?'':'No matching listings.';
  for(const listing of data){
   const card=document.createElement('article');card.className='creator-card';const heading=document.createElement('h2');heading.textContent=listing.title;
   const status=document.createElement('p');status.textContent=listing.status==='archived'?'Removed':listing.status;
   const reason=document.createElement('p');reason.textContent=listing.moderation_reason||'';card.append(heading,status,reason);
   const view=document.createElement('a');view.href=EtchUI.listingUrl(listing);view.textContent=listing.status==='published'?'View listing':'Preview listing';card.append(view);
   if(listing.status!=='archived'){
    const edit=document.createElement('a');edit.href='/user/upload?'+new URLSearchParams({id:listing.id});edit.textContent='Edit listing';edit.className='block';card.append(edit);
    if(listing.status==='draft')card.append(button('Submit for review',async()=>{let query=db.from('listings').update({status:'review'}).eq('id',listing.id).eq('creator_id',auth.user.id).eq('status','draft');if(listing.updated_at)query=query.eq('updated_at',listing.updated_at);const {data,error}=await query.select('id').maybeSingle();if(error)throw error;if(!data)throw new Error('Listing changed elsewhere. Refresh and retry.');await load();}));
    if(['published','review'].includes(listing.status))card.append(button('Return to draft',async()=>{const {data,error}=await db.from('listings').update({status:'draft'}).eq('id',listing.id).eq('creator_id',auth.user.id).eq('updated_at',listing.updated_at).select('id').maybeSingle();if(error)throw error;if(!data)throw new Error('Listing changed elsewhere. Refresh and retry.');await load();}));
    card.append(button('Delete listing',async()=>{
     if(!confirm('Permanently delete “'+listing.title+'”? This cannot be undone.'))return;
     let query=db.from('listings').delete().eq('id',listing.id).eq('creator_id',auth.user.id);if(listing.updated_at)query=query.eq('updated_at',listing.updated_at);
     const {data,error}=await query.select('id').maybeSingle();if(error)throw error;if(!data)throw new Error('Listing changed elsewhere. Refresh and retry.');if(offset&&grid.children.length===1)offset=Math.max(0,offset-24);await load();
    }));
   }
   grid.append(card);
  }
  const label=document.createElement('span');label.textContent=count+' listings · Page '+(offset/24+1);$('catalogPager').append(label);
  for(const [name,enabled,delta] of [['Previous',offset>0,-24],['Next',offset+24<count,24]]){const control=button(name,async()=>{offset=Math.max(0,offset+delta);await load();});control.disabled=!enabled;$('catalogPager').append(control);}
 }catch(error){if(current!==request)return;grid.replaceChildren();$('catalogPager').replaceChildren();$('catalogMessage').textContent='Unable to load listings: '+error.message;$('catalogPager').append(button('Retry',load));}
}
$('catalogFilters').onsubmit=event=>{event.preventDefault();offset=0;load();};await load();
})();
