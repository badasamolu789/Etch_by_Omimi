/* Shared queues: all reads and decisions remain subject to database authorization. */
(() => {
'use strict';
const page=document.body.dataset.workspace;
const config={
 contacts:{table:'contacts',search:'subject',columns:['created_at','name','email','subject','message'],statuses:[]},
 users:{table:'profiles',search:'full_name',columns:['full_name','username','account_type','role'],statuses:[]},
 verification:{table:'verification_requests',columns:['user_id','evidence','status','decision_reason','created_at'],statuses:['pending','approved','declined']},
 listings:{table:'listings',search:'title',columns:['title','creator_id','category','price','status','is_featured','moderation_reason'],statuses:['draft','review','published','archived']},
 reports:{table:'content_reports',columns:['content_type','content_id','reason','status','decision_reason','created_at'],statuses:['pending','dismissed','removed']},
 audit:{table:'admin_audit_log',search:'entity',columns:['created_at','actor_id','actor_role','action','entity','entity_id'],statuses:[]},
 applications:{table:'founding_applications',search:'full_name',columns:['full_name','email','portfolio_url','statement','status','score','created_at'],statuses:['submitted','reviewing','accepted','declined']}
}[page];
let offset=0, request=0;
const size=25, $=id=>document.getElementById(id), escape=EtchUI.escapeHtml;
const message=text=>{$('queueMessage').textContent=text;};
async function save(operation){
 try { const {error}=await operation; if(error) throw error; message('Saved.'); await load(); if(page==='applications')$('applicationReview')?.remove(); }
 catch(error){message(error.message || 'Unable to save. Please retry.');}
}
function button(label,action){const el=document.createElement('button');el.type='button';el.className='admin-action'+(/reject|remove|declin/i.test(label)?' admin-action-danger':/save|approve|accept|review application/i.test(label)?' admin-action-primary':'');el.textContent=label;el.onclick=async()=>{el.disabled=true;try{await action();}catch(error){message(error.message||'Unable to complete action. Please retry.');}finally{el.disabled=false;}};return el;}
function askReason(){return EtchDialog.open({title:'Record your decision',message:'Add a reason for this decision. It will be saved with the review.',input:true,multiline:true,label:'Decision reason',minLength:3,maxLength:2000,confirmText:'Confirm decision'});}
function details(row){const el=document.createElement('details');const summary=document.createElement('summary');summary.textContent='View record';summary.className='admin-action';const pre=document.createElement('pre');pre.style.whiteSpace='pre-wrap';pre.textContent=JSON.stringify(row,null,2);el.append(summary,pre);return el;}
function actions(row){
 const el=document.createElement('div'),db=EtchSupabase.getClient();
 el.append(details(row));
 if(page==='listings' && row.preview_url){const link=document.createElement('a');link.href=EtchUI.safeUrl(row.preview_url);link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open writing sample';link.className='admin-action';el.append(link);}
 if(page==='reports'){
  const reason=document.createElement('p');reason.textContent='Report: '+row.reason;reason.style.whiteSpace='pre-wrap';el.append(reason);
  const target=document.createElement('div');
  el.append(button('View reported content',async()=>{
   target.replaceChildren();
   const table=row.content_type==='article'?'masterclass_articles':'listings';
   const {data,error}=await db.from(table).select('id,title,slug,status').eq('id',row.content_id).maybeSingle();
   if(error)throw error;
   if(!data){target.textContent='Content is unavailable or your role cannot access it.';return;}
   const title=document.createElement('p');title.textContent=data.title+' — '+data.status;target.append(title);
   if(data.status==='published'){const link=document.createElement('a');link.href=row.content_type==='article'?EtchUI.articleUrl(data.slug):EtchUI.listingUrl(data);link.textContent='Open reported content';link.target='_blank';link.rel='noopener noreferrer';link.className='admin-action';target.append(link);}
  }),target);
 }
 if(page==='applications' && row.portfolio_url){const link=document.createElement('a');link.href=EtchUI.safeUrl(row.portfolio_url);link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open portfolio';link.className='admin-action';el.append(link);}
 const reason=()=>askReason();
 if(page==='users') {
  const select=document.createElement('select');select.setAttribute('aria-label','Account type');for(const type of ['writer','producer'])select.add(new Option(type,type));select.value=row.account_type||'writer';
  el.append(select,button('Save account type',()=>save(db.rpc('set_account_type',{target_user:row.id,new_type:select.value}))));
 }
 if(page==='users' && window.ETCH_PERMISSIONS.includes('roles')) {
  const select=document.createElement('select');for(const role of ['creator','editor','reviewer','admin','super_admin'])select.add(new Option(role,role));select.value=row.role;
  el.append(select,button('Save role',()=>save(db.rpc('set_staff_role',{target_user:row.id,new_role:select.value}))));
 }
 if(page==='verification' && row.status==='pending') for(const status of ['approved','declined'])el.append(button(status,async()=>{const explanation=await reason();if(!explanation?.trim())return;return save(db.rpc('decide_verification',{request_id:row.id,decision:status,explanation}));}));
 if(page==='listings') {
  for(const [label,status] of [['Approve','published'],['Reject / remove','archived']])el.append(button(label,async()=>{const explanation=await reason();if(!explanation?.trim())return;return save(db.rpc('moderate_listing',{listing_id:row.id,decision:status,explanation}));}));
  if(row.status==='published') el.append(button(row.is_featured?'Unfeature':'Feature',()=>save(db.from('listings').update({is_featured:!row.is_featured}).eq('id',row.id))));
 }
 if(page==='reports' && row.status==='pending') for(const decision of ['dismissed','removed'])el.append(button(decision,async()=>{const explanation=await reason();if(!explanation?.trim())return;return save(db.rpc('resolve_content_report',{report_id:row.id,decision,explanation}));}));
 if(page==='applications') el.append(button('Review application',()=>reviewApplication(row)));
 return el;
}
async function load(){
 if(!config)return;
 const current=++request;message('Loading…');
 let query=EtchSupabase.getClient().from(config.table).select('*',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+size-1);
 if(config.search && $('queueSearch').value.trim())query=query.ilike(config.search,'%'+$('queueSearch').value.trim()+'%');
 if($('queueStatus').value)query=query.eq('status',$('queueStatus').value);
 const {data,error,count}=await Promise.resolve(query).catch(error=>({data:[],error,count:null}));
 if(current!==request)return;
 $('queueContent').replaceChildren();
 if(error){$('queueCount').textContent='Records unavailable';$('queuePrevious').disabled=true;$('queueNext').disabled=true;message('Unable to load records: '+error.message);$('queueContent').append(button('Retry loading',load));return;}
 message(data.length?'':'No matching records.');
 const table=document.createElement('table');table.className='w-full text-sm';
 table.innerHTML='<thead><tr>'+[...config.columns,'Actions'].map(name=>'<th class="p-3 text-left">'+escape(name.replaceAll('_',' '))+'</th>').join('')+'</tr></thead>';
 const body=document.createElement('tbody');
 for(const row of data){const tr=document.createElement('tr');tr.className='border-b';for(const key of config.columns){const td=document.createElement('td');td.className='p-3';const value=String(row[key]??'—');td.textContent=value.length>140?value.slice(0,140)+'…':value;td.title=value;tr.append(td);}const td=document.createElement('td');td.append(actions(row));tr.append(td);body.append(tr);}
 table.append(body);$('queueContent').append(table);
 $('queueCount').textContent=`${count} records · Page ${offset/size+1}`;
 $('queuePrevious').disabled=offset===0;$('queueNext').disabled=offset+size>=count;
}
async function reviewApplication(row){
 let panel=$('applicationReview');if(!panel){panel=document.createElement('section');panel.id='applicationReview';$('queueExtras').append(panel);}panel.replaceChildren();
 const heading=document.createElement('h2');heading.textContent='Review: '+row.full_name;panel.append(heading);
 for(const [label,value] of [['Email',row.email],['Writing sample',row.portfolio_url],['Application',row.statement],['Status',row.status],['Decision reason',row.decision_reason]]){const text=document.createElement('p');text.style.whiteSpace='pre-wrap';text.textContent=label+': '+(value||'—');panel.append(text);}
 const db=EtchSupabase.getClient();
 if(!['accepted','declined'].includes(row.status))for(const decision of ['accepted','declined'])panel.append(button(decision,async()=>{const explanation=await askReason();if(!explanation?.trim())return;return save(db.rpc('decide_founding_application',{application_id:row.id,decision,explanation}));}));
 const {data:rubric,error}=await db.from('founding_rubrics').select('*').eq('active',true).maybeSingle();
 if(error||!rubric){panel.append(Object.assign(document.createElement('p'),{textContent:error?'Unable to load scoring rubric: '+error.message:'An Admin must configure an active scoring rubric before scoring or accepting applications. Applications can still be read and declined.'}));}
 if(rubric && !error && !['accepted','declined'].includes(row.status)){
 const form=document.createElement('form');form.className='p-4 border rounded';
 const inputs={};
 for(const criterion of rubric.criteria){const label=document.createElement('label');label.className='block my-2';label.textContent=`${criterion.name} (${criterion.weight}%) — score 0–100 `;const input=document.createElement('input');input.type='number';input.min=0;input.max=100;input.required=true;input.className='border p-2';inputs[criterion.key]=input;label.append(input);form.append(label);}
 const notes=document.createElement('textarea');notes.placeholder='Reviewer notes';notes.required=true;notes.className='block border p-2 w-full';form.append(notes);
 const submit=document.createElement('button');submit.textContent='Save weighted review';submit.className='admin-action admin-action-primary';form.append(submit);
 form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;const scores=Object.fromEntries(Object.entries(inputs).map(([key,input])=>[key,Number(input.value)]));await save(db.rpc('score_founding_application',{application_id:row.id,rubric_id:rubric.id,scores,notes:notes.value}));submit.disabled=false;};panel.append(form);
 }

 const {data:deliveries,error:deliveryError}=await db.from('acceptance_deliveries').select('status,provider_id,created_at,sent_at').eq('application_id',row.id);
 if(deliveryError)panel.append(Object.assign(document.createElement('p'),{textContent:'Unable to load email history: '+deliveryError.message}));
 for(const delivery of deliveries||[])panel.append(details(delivery));
 const {data:reviews,error:reviewError}=await db.from('founding_reviews').select('*').eq('application_id',row.id);if(reviewError)panel.append(Object.assign(document.createElement('p'),{textContent:'Unable to load reviews: '+reviewError.message}));for(const review of reviews||[])panel.append(details(review));
 if(row.status==='accepted')panel.append(button('Send acceptance email',async()=>{message('Sending…');const {data,error}=await db.functions.invoke('send-acceptance',{body:{applicationId:row.id}});message(error?.message || data?.error || 'Acceptance email sent.');}));
}
async function initialize(){
 if(page==='analytics'){await loadAnalytics();return;}
 if(!config)return;
 $('queueSearch').disabled=!config.search;
 for(const status of config.statuses)$('queueStatus').add(new Option(status,status));
 $('queueStatus').disabled=!config.statuses.length;
 $('queueFilters').onsubmit=event=>{event.preventDefault();offset=0;load();};
 $('queuePrevious').onclick=()=>{offset=Math.max(0,offset-size);load();};$('queueNext').onclick=()=>{offset+=size;load();};
 if(page==='applications')$('queueExtras').append(button('Manage invitations',manageInvitations));
 if(page==='applications' && ['admin','super_admin'].includes(window.ETCH_ADMIN.profile.role)){
  $('queueExtras').append(button('Configure scoring rubric',configureRubric));
 }
 await load();
}
async function manageInvitations(){
 let section=$('foundingInvitations');if(section){section.remove();return;}
 section=document.createElement('section');section.id='foundingInvitations';section.className='p-4 border rounded my-4';$('queueExtras').append(section);
 const heading=document.createElement('h2');heading.textContent='Approved emails & personal invitations';section.append(heading);
 const explanation=document.createElement('p');explanation.textContent='Approve an email and generate its personal application link. Creating another link for the same email invalidates the old one. Share the link privately with that writer; no email is sent automatically.';section.append(explanation);
 const form=document.createElement('form');
 const email=document.createElement('input');email.type='email';email.required=true;email.maxLength=254;email.placeholder='Writer email';email.setAttribute('aria-label','Invited email');email.className='border p-2 m-2';
 const days=document.createElement('input');days.type='number';days.min=1;days.max=90;days.value='14';days.required=true;days.setAttribute('aria-label','Invitation validity in days');days.className='border p-2 m-2';
 const submit=document.createElement('button');submit.type='submit';submit.textContent='Generate invitation link';submit.className='admin-action admin-action-primary';form.append(email,days,submit);section.append(form);
 const status=document.createElement('p');status.setAttribute('role','status');section.append(status);
 const output=document.createElement('div');section.append(output);
 const list=document.createElement('div');section.append(list);
 const controls=document.createElement('div');section.append(controls);let offset=0;
 const db=EtchSupabase.getClient();
 async function loadInvitations(){
  list.textContent='Loading invitations…';controls.replaceChildren();
  try{
   const {data,error,count}=await db.from('founding_invitations').select('id,email,expires_at,revoked,claimed_by',{count:'exact'}).order('created_at',{ascending:false}).order('id').range(offset,offset+24);
   if(error)throw error;list.replaceChildren();
   if(!data.length)list.textContent='No invitations on this page.';
   for(const invitation of data){const row=document.createElement('p');row.textContent=invitation.email+' — '+(invitation.revoked?'Revoked':new Date(invitation.expires_at)<=new Date()?'Expired':invitation.claimed_by?'Opened by invited writer':'Awaiting writer')+' — expires '+new Date(invitation.expires_at).toLocaleString();
    if(!invitation.revoked)row.append(button('Revoke invitation',async()=>{const {error}=await db.rpc('revoke_founding_invitation',{invitation_id:invitation.id});if(error)throw error;output.replaceChildren();await loadInvitations();}));list.append(row);}
   if(offset>0)controls.append(button('Previous invitations',async()=>{offset=Math.max(0,offset-25);await loadInvitations();}));
   if(offset+25<count)controls.append(button('Next invitations',async()=>{offset+=25;await loadInvitations();}));
  }catch(error){list.textContent='Unable to load invitations: '+error.message;controls.append(button('Retry invitations',loadInvitations));}
 }
 form.onsubmit=async event=>{event.preventDefault();if(submit.disabled||!form.reportValidity())return;submit.disabled=true;output.replaceChildren();status.textContent='Generating invitation…';
  try{
   const {data,error}=await db.rpc('create_founding_invitation',{invited_email:email.value.trim(),valid_days:Number(days.value)});if(error)throw error;
   if(!data?.token)throw new Error('Invitation link was not returned');
   const url=new URL('/founding-voices',location.origin);url.hash=new URLSearchParams({invite:data.token}).toString();
   const link=document.createElement('input');link.type='text';link.readOnly=true;link.value=url.href;link.setAttribute('aria-label','Personal invitation link');link.className='border p-2 w-full';output.append(link);
   output.append(button('Copy invitation link',async()=>{try{await navigator.clipboard.writeText(link.value);status.textContent='Invitation link copied.';}catch{link.focus();link.select();status.textContent='Select and copy the invitation link above.';}}));
   status.textContent='Approved '+data.email+'. Share this link now; it is shown only here. Expires '+new Date(data.expires_at).toLocaleString();offset=0;await loadInvitations();
  }catch(error){status.textContent='Unable to create invitation: '+error.message;}finally{submit.disabled=false;}
 };
 await loadInvitations();
}
async function configureRubric(){
 const dialog=document.createElement('dialog');dialog.className='etch-dialog';
 dialog.innerHTML='<form><h2 class="text-2xl mb-3">Scoring criteria</h2><p>Weights must total 100%. Saving creates a new rubric. Existing reviews retain their original rubric; acceptance requires a review under the active rubric.</p><div id="rubricRows"></div><button type="button" id="addCriterion" class="border p-2 my-3">Add criterion</button><p id="rubricError" role="alert"></p><button class="border p-2">Save rubric</button><button type="button" id="cancelRubric" class="border p-2 ml-3">Cancel</button></form>';
 const rows=dialog.querySelector('#rubricRows');
 const add=(criterion={})=>{
  const row=document.createElement('div');row.className='flex gap-2 my-3';
  const name=document.createElement('input');name.placeholder='Criterion name';name.setAttribute('aria-label','Criterion name');name.required=true;name.maxLength=120;name.value=criterion.name||'';name.className='border p-2 flex-1';
  const weight=document.createElement('input');weight.type='number';weight.min='0.01';weight.max='100';weight.step='0.01';weight.required=true;weight.setAttribute('aria-label','Weight percentage');weight.value=criterion.weight||'';weight.className='border p-2 w-24';
  const remove=button('Remove',()=>row.remove());remove.type='button';row.append(name,weight,remove);rows.append(row);
 };
 const {data}=await EtchSupabase.getClient().from('founding_rubrics').select('criteria').eq('active',true).maybeSingle();
 for(const criterion of data?.criteria||[{}])add(criterion);
 dialog.querySelector('#addCriterion').onclick=()=>add();dialog.querySelector('#cancelRubric').onclick=()=>{dialog.close();dialog.remove();};dialog.oncancel=()=>dialog.remove();
 dialog.querySelector('form').onsubmit=async event=>{
  event.preventDefault();const criteria=[...rows.children].map((row,index)=>({key:'criterion_'+index,name:row.children[0].value.trim(),weight:Number(row.children[1].value)}));
  const submit=dialog.querySelector('button:not([type])');submit.disabled=true;
  const {error}=await EtchSupabase.getClient().rpc('configure_founding_rubric',{criteria});
  if(error){dialog.querySelector('#rubricError').textContent=error.message;submit.disabled=false;}else{dialog.close();dialog.remove();message('Scoring rubric saved.');}
 };
 document.body.append(dialog);dialog.showModal();
}
async function loadAnalytics(){
 $('queueFilters').hidden=true;$('queuePrevious').hidden=true;$('queueNext').hidden=true;
 const {data,error}=await EtchSupabase.getClient().rpc('analytics_summary');
 if(error){message(error.message);return;}
 message('Last 30 days. Session time measures active browser time. Automated traffic and blocked tracking can affect these counts.');
 const cards=document.createElement('div');cards.className='grid md:grid-cols-3 gap-4 my-6';
 for(const [label,value] of [['Page views',data.page_views],['Sessions',data.sessions],['Average active session',data.average_active_session_seconds+' seconds']]){
  const card=document.createElement('div');card.className='border rounded-2xl p-6';const title=document.createElement('h2');title.textContent=label;const number=document.createElement('p');number.className='text-3xl mt-2';number.textContent=value;card.append(title,number);cards.append(card);
 }
 $('queueContent').append(cards);
 for(const [label,records,columns] of [['Top pages',data.pages,['path','views']],['Campaign attribution',data.utm_breakdown,['utm_source','utm_medium','utm_campaign','views','sessions']]]){
  const title=document.createElement('h2');title.textContent=label;title.className='text-xl my-4';$('queueContent').append(title);
  const table=document.createElement('table');table.className='w-full text-sm';table.innerHTML='<thead><tr>'+columns.map(c=>'<th class="p-3 text-left">'+escape(c.replaceAll('utm_','').replaceAll('_',' '))+'</th>').join('')+'</tr></thead>';
  for(const record of records||[]){const tr=document.createElement('tr');tr.className='border-b';for(const column of columns){const td=document.createElement('td');td.className='p-3';td.textContent=record[column]||'Direct / unspecified';tr.append(td);}table.append(tr);}
  $('queueContent').append(table);
 }
}
document.addEventListener('admin:components-ready',()=>initialize().catch(error=>message(error.message)),{once:true});
})();
