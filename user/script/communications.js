(async()=>{
'use strict';
const auth=await window.ETCH_AUTH_READY;if(!auth?.authenticated)return;
const db=EtchSupabase.getClient(),page=EtchUI.pageName(),$=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const text=(tag,value)=>Object.assign(document.createElement(tag),{textContent:value??''});
function status(value){$('communicationsStatus').textContent=value;}
function button(label,action){const el=text('button',label);el.type='button';el.onclick=async()=>{if(el.disabled)return;el.disabled=true;try{await action();}catch(error){status(error.message||'Request failed. Retry when ready.');}finally{el.disabled=false;}};return el;}
function pager(target,offset,count,size,load){target.replaceChildren(text('span',count+' records · Page '+(offset/size+1)));for(const [label,enabled,delta]of[['Previous',offset>0,-size],['Next',offset+size<count,size]]){const el=button(label,()=>load(Math.max(0,offset+delta)));el.disabled=!enabled;target.append(el);}}
try{
 const listingId=params.get('listing');let listing=null;
 if(listingId){
  const {data,error}=await db.from('listings').select('id,title,creator_id,status').eq('id',listingId).eq('status','published').maybeSingle();if(error)throw error;
  if(!data)status('This listing is unavailable. Existing conversations and enquiries are shown below.');
  else if(data.creator_id===auth.user.id)status('This is your listing. You can respond to incoming conversations and enquiries below.');
  else listing=data;
 }
 if(page==='messages'){
  let selected=null,threadOffset=0,messageOffset=0,threadRequest=0,messageRequest=0;
  async function loadThreads(offset=threadOffset){
   threadOffset=offset;const request=++threadRequest;
   const {data,error,count}=await db.from('creator_conversations').select('id,listing_id,buyer_id,creator_id,updated_at,listing:listings(title),buyer:profiles!buyer_id(full_name,username),creator:profiles!creator_id(full_name,username)',{count:'exact'}).order('updated_at',{ascending:false}).order('id').range(offset,offset+24);if(request!==threadRequest)return;if(error)throw error;
   $('conversationList').replaceChildren();if(!data?.length)$('conversationList').textContent='No conversations yet.';
   for(const item of data||[]){const other=item.buyer_id===auth.user.id?item.creator:item.buyer;const label=(item.listing?.title||'Listing conversation')+' — '+(other?.full_name||other?.username||'Participant')+' — '+new Date(item.updated_at).toLocaleString();$('conversationList').append(button(label,()=>openThread(item)));}
   pager($('conversationPager'),offset,count??0,25,loadThreads);
  }
  async function loadMessages(offset=messageOffset){
   messageOffset=offset;const request=++messageRequest;
   const {data,error,count}=await db.from('creator_messages').select('id,conversation_id,sender_id,body,created_at',{count:'exact'}).eq('conversation_id',selected.id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+49);if(request!==messageRequest)return;if(error)throw error;
   $('messageList').replaceChildren();if(!data?.length)$('messageList').textContent='No saved messages yet.';
   for(const item of [...(data||[])].reverse()){const card=document.createElement('article');card.className='creator-card';card.append(text('strong',item.sender_id===auth.user.id?'You':'Other participant'),text('small',' · '+new Date(item.created_at).toLocaleString()));const body=text('p',item.body);body.style.whiteSpace='pre-wrap';card.append(body);$('messageList').append(card);}
   pager($('messagePager'),offset,count??0,50,loadMessages);
  }
  async function openThread(thread){if($('replyForm').querySelector('button').disabled){status('Wait for the current reply to finish before switching conversations.');return;}selected=thread;messageOffset=0;$('conversationPanel').hidden=false;$('conversationTitle').textContent=thread.listing?.title||'Listing conversation';await loadMessages();}
  if(listing){$('newConversation').hidden=false;$('conversationListing').textContent='Message about '+listing.title;}
  let opening=null;
  $('startConversation').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,submit=form.querySelector('button');if(!listing||submit.disabled||!form.reportValidity())return;submit.disabled=true;
   try{const body=form.elements.namedItem('body').value.trim();if(!opening||opening.body!==body)opening={id:crypto.randomUUID(),body};const {data,error}=await db.rpc('start_creator_conversation',{target_listing:listing.id,opening_message:body,message_id:opening.id});if(error)throw error;opening=null;form.reset();status('Message saved.');await loadThreads(0);await openThread({id:data,listing:{title:listing.title}});}
   catch(error){status('Unable to send: '+error.message+'. Your message has been kept.');}finally{submit.disabled=false;}
  };
  let outgoing=null;
  $('replyForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,submit=form.querySelector('button');if(!selected||submit.disabled||!form.reportValidity())return;submit.disabled=true;
   try{
    const body=form.elements.namedItem('body').value.trim(),conversation=selected.id;if(!outgoing||outgoing.body!==body||outgoing.conversation_id!==conversation)outgoing={id:crypto.randomUUID(),conversation_id:conversation,sender_id:auth.user.id,body};
    const {error}=await db.from('creator_messages').insert(outgoing);if(error){if(error.code!=='23505')throw error;const check=await db.from('creator_messages').select('id,body,sender_id,conversation_id').eq('id',outgoing.id).maybeSingle();if(check.error||!check.data||check.data.body!==body||check.data.sender_id!==auth.user.id||check.data.conversation_id!==conversation)throw error;}
    outgoing=null;form.reset();status('Reply saved.');await loadMessages(0);await loadThreads();
   }catch(error){status('Unable to send: '+error.message+'. Your message has been kept.');}finally{submit.disabled=false;}
  };
  $('refreshConversations').onclick=async()=>{try{await loadThreads();if(selected)await loadMessages();status('Inbox refreshed.');}catch(error){status('Unable to refresh: '+error.message);}};
  await loadThreads();
 }
 if(page==='licensing'){
  let offset=0,request=0,pendingRequest=null;
  async function load(start=offset){offset=start;const current=++request;
   const {data,error,count}=await db.from('licensing_enquiries').select('id,listing_id,requester_id,creator_id,proposed_use,status,response,created_at,updated_at,listing:listings(title),buyer:profiles!buyer_id(full_name,username),creator:profiles!creator_id(full_name,username)',{count:'exact'}).order('created_at',{ascending:false}).order('id').range(offset,offset+24);if(current!==request)return;if(error)throw error;$('licenseList').replaceChildren();if(!data?.length)$('licenseList').textContent='No licensing enquiries yet.';
   for(const item of data||[]){const card=document.createElement('section');card.className='creator-card';card.append(text('h2',item.listing?.title||'Listing enquiry'),text('p',(item.requester_id===auth.user.id?'Sent':'Received')+' — '+item.status));const use=text('p',item.proposed_use);use.style.whiteSpace='pre-wrap';card.append(use);if(item.response)card.append(text('p','Response: '+item.response));
    if(['requested','reviewing'].includes(item.status)){
     const form=document.createElement('form'),response=document.createElement('textarea');response.required=true;response.minLength=3;response.maxLength=5000;response.rows=3;response.setAttribute('aria-label','Enquiry response');const select=document.createElement('select');select.setAttribute('aria-label','Enquiry decision');for(const decision of item.creator_id===auth.user.id?['reviewing','closed','declined']:['withdrawn'])select.add(new Option(decision,decision));const submit=text('button','Save enquiry decision');submit.type='submit';form.append(response,select,submit);card.append(form);
     form.onsubmit=async event=>{event.preventDefault();if(submit.disabled||!form.reportValidity())return;submit.disabled=true;try{const {error}=await db.rpc('update_licensing_enquiry',{enquiry_id:item.id,new_status:select.value,explanation:response.value,expected_updated_at:item.updated_at});if(error)throw error;status('Enquiry updated. No license or payment was issued.');await load();}catch(error){status(error.message);}finally{submit.disabled=false;}};
    }$('licenseList').append(card);
   }pager($('licensePager'),offset,count??0,25,load);
  }
  if(listing){$('newLicense').hidden=false;$('licenseListing').textContent='Licensing enquiry: '+listing.title;}
  $('licenseRequestForm').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget,submit=form.querySelector('button');if(!listing||submit.disabled||!form.reportValidity())return;submit.disabled=true;
   try{const use=form.elements.namedItem('proposed_use').value.trim();if(!pendingRequest||pendingRequest.use!==use)pendingRequest={id:crypto.randomUUID(),use};const {error}=await db.rpc('request_listing_license',{target_listing:listing.id,intended_use:use,request_id:pendingRequest.id});if(error)throw error;pendingRequest=null;form.reset();status('Enquiry saved. No license or payment has been issued.');await load(0);}catch(error){status(error.code==='23505'?'You already have an open enquiry for this listing.':error.message);}finally{submit.disabled=false;}
  };$('refreshLicensing').onclick=async()=>{try{await load();status('Enquiries refreshed.');}catch(error){status(error.message);}};await load();
 }
}catch(error){status('Unable to load: '+error.message+'. Use Refresh or reload to retry.');}
})();
