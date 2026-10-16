(()=>{
'use strict';
async function initialize(){
 const $=id=>document.getElementById(id),form=$('legalEditor'),button=$('legalSave'),db=EtchSupabase.getClient();
 form.noValidate=true;
 let latest=null,loaded=false,request=0,activeKey=$('legalKey').value,baseline='',busy=false;
 const snapshot=()=>JSON.stringify([$('legalTitle').value,$('legalText').value]);
 function status(message,state=''){$('legalEditorStatus').textContent=message;$('legalEditorStatus').dataset.state=state;}
 function lock(value){busy=value;for(const id of ['legalKey','legalTitle','legalText','legalPublish'])$(id).disabled=value;button.disabled=value||!loaded;}
 function label(){button.textContent=$('legalPublish').checked?'Publish version':'Save draft';}
 function preview(){try{EtchLegalContent.render($('legalPreview'),$('legalText').value||'*Your formatted page preview will appear here.*');}catch(error){$('legalPreview').textContent=error.message;}}
 function tab(show){$('legalSource').hidden=show;$('legalPreview').hidden=!show;$('legalEditTab').setAttribute('aria-pressed',String(!show));$('legalPreviewTab').setAttribute('aria-pressed',String(show));if(show)preview();}
 function explain(error){
  if(['PGRST202','PGRST205','42P01','42883'].includes(error.code))return 'The legal publishing database setup is missing or its API schema is outdated. Apply supabase/migrations/202610150004_legal_documents.sql to this Supabase project, then reload the API schema and this editor.';
  if(error.code==='42501')return 'Your account does not have permission to publish legal pages. Sign in with an Admin or Super Admin account.';
  return error.message||'The server did not complete the request. Please retry.';
 }
 async function load(){
  const current=++request;loaded=false;lock(true);status('Loading document…');$('legalRetry').hidden=true;
  try{
   const {data,error}=await db.from('legal_documents').select('id,title,body,status,created_at').eq('document_key',activeKey).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle();
   if(current!==request)return;if(error)throw error;
   latest=data?.id||null;$('legalTitle').value=data?.title||(activeKey==='terms'?'Terms of Service':'Privacy Policy');$('legalText').value=data?.body||'';$('legalPublish').checked=false;baseline=snapshot();label();preview();
   status(data?'Latest saved version: '+data.status+'.':'No saved version yet. Add your approved content below.');loaded=true;
  }catch(error){if(current!==request)return;status(explain(error),'error');$('legalRetry').hidden=false;}
  finally{if(current===request)lock(false);}
 }
 $('legalEditTab').onclick=()=>tab(false);$('legalPreviewTab').onclick=()=>tab(true);
 $('legalText').oninput=()=>{if(!$('legalPreview').hidden)preview();};
 $('legalPublish').onchange=label;
 $('legalKey').onchange=async()=>{
  const next=$('legalKey').value;$('legalKey').value=activeKey;
  if(busy)return;
  lock(true);
  if(loaded&&snapshot()!==baseline&&!await EtchDialog.confirm('Switch documents and discard your unsaved changes?')){lock(false);return;}
  activeKey=next;$('legalKey').value=next;tab(false);await load();
 };
 $('legalRetry').onclick=async()=>{if(busy)return;if(loaded&&snapshot()!==baseline&&!await EtchDialog.confirm('Reload the latest saved version and discard your unsaved changes?'))return;await load();};
 form.onsubmit=async event=>{
  event.preventDefault();if(busy||!loaded)return;
  const title=$('legalTitle').value.trim(),body=$('legalText').value.trim();
  $('legalTitle').setCustomValidity(title.length<3?'Enter a title of at least 3 characters.':'');$('legalText').setCustomValidity(body.length<20?'Add at least 20 characters of document content.':'');
  if(!form.checkValidity()){tab(false);form.reportValidity();return;}
  const publish=$('legalPublish').checked;
  // Lock before waiting for the dialog: double clicks cannot queue duplicate writes.
  lock(true);
  try{
   if(publish&&!await EtchDialog.confirm('Publish this '+(activeKey==='terms'?'Terms of Service':'Privacy Policy')+' version? It will replace the document visitors currently see.'))return;
   status(publish?'Publishing version…':'Saving draft…');
   const {data,error}=await db.rpc('save_legal_document',{doc_key:activeKey,doc_title:title,doc_body:body,publish_document:publish,expected_latest:latest});
   if(error)throw error;
   // Use the returned ID instead of a second load that could report failure after a successful write.
   if(typeof data!=='string'||!data){loaded=false;status('The save completed, but its version ID could not be read. Reload the latest version before saving again.');$('legalRetry').hidden=false;return;}
   latest=data;$('legalTitle').value=title;$('legalText').value=body;baseline=snapshot();$('legalPublish').checked=false;label();preview();$('legalRetry').hidden=true;
   status(publish?'Version saved and published. The public page is updated.':'Version saved as a draft. The public page has not changed.','success');
  }catch(error){const message=explain(error);status('Unable to save: '+message+' Your text has been kept.','error');$('legalRetry').hidden=false;await EtchDialog.alert(message+' Your text has been kept in the editor.');}
  finally{lock(false);}
 };
 for(const id of ['legalTitle','legalText'])$(id).addEventListener('input',()=>$(id).setCustomValidity(''));
 await load();
}
if(window.ETCH_ADMIN_COMPONENTS_READY)initialize();else document.addEventListener('admin:components-ready',initialize,{once:true});
})();
