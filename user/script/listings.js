(async()=>{
'use strict';
const auth=await window.ETCH_AUTH_READY;if(!auth?.authenticated)return;
const grid=document.querySelector('.grid.sm\\:grid-cols-2.lg\\:grid-cols-3.xl\\:grid-cols-4');if(!grid)return;
const search=document.querySelector('input[placeholder="Search your catalog..."]');
const pager=document.createElement('div');pager.className='flex items-center gap-4 my-4';
const previous=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');previous.textContent='Previous';next.textContent='Next';previous.className=next.className='border rounded p-2';pager.append(previous,label,next);grid.after(pager);
let offset=0,request=0;
async function load(){
 const current=++request;grid.textContent='Loading listings…';
 let query=EtchSupabase.getClient().from('listings').select('*',{count:'exact'}).eq('creator_id',auth.user.id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+23);
 if(search?.value.trim())query=query.ilike('title','%'+search.value.trim()+'%');
 const {data,error,count}=await query;if(current!==request)return;
 grid.replaceChildren();
 if(error){grid.textContent='Unable to load listings: '+error.message;return;}
 if(!data.length)grid.textContent='No matching listings.';
 for(const listing of data){
  const card=document.createElement('article');card.className='border rounded-2xl p-5 bg-white dark:bg-ink';
  const title=document.createElement('h3');title.textContent=listing.title;title.className='text-xl font-semibold';
  const status=document.createElement('p');status.textContent=listing.status==='archived'?'Rejected / removed':listing.status;
  const reason=document.createElement('p');reason.textContent=listing.moderation_reason||'';
  card.append(title,status,reason);
  if(listing.status!=='archived'){const link=document.createElement('a');link.href=EtchUI.listingUrl(listing);link.textContent=listing.status==='published'?'View listing':'Preview listing';link.className='text-olive underline';card.append(link);}
  grid.append(card);
 }
 label.textContent=`${count} listings · Page ${offset/24+1}`;previous.disabled=offset===0;next.disabled=offset+24>=count;
}
previous.onclick=()=>{offset=Math.max(0,offset-24);load();};next.onclick=()=>{offset+=24;load();};let timer;search?.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{offset=0;load();},300);});await load();
})();
