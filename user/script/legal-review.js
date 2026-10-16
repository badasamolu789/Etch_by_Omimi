(async()=>{
'use strict';
const auth=await window.ETCH_AUTH_READY;if(!auth?.authenticated)return;
const form=document.getElementById('consentForm'),status=document.getElementById('consentStatus'),db=EtchSupabase.getClient();
try{const {data,error}=await db.from('legal_documents').select('id,document_key,title').eq('status','published');if(error)throw error;if(!['terms','privacy'].every(key=>data?.some(row=>row.document_key===key)))throw new Error('ETCH has not yet published both documents. Please contact the team.');const versions=data.map(row=>row.id);status.textContent='Review the linked documents, then confirm your agreement.';form.hidden=false;form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button');if(button.disabled||!form.reportValidity())return;button.disabled=true;try{const {error}=await db.rpc('accept_legal_documents',{document_ids:versions});if(error)throw error;try{sessionStorage.removeItem('etch_legal_versions');}catch{}location.assign(EtchUI.consumeAuthRedirect());}catch(error){status.textContent=error.message+'. Reload to review the latest documents.';button.disabled=false;}};}catch(error){status.textContent=error.message;}
})();
