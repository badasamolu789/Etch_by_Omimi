(async()=>{
'use strict';
try{const {data,error}=await EtchSupabase.getClient().from('legal_documents').select('id,title,body,published_at').eq('document_key',document.body.dataset.document).eq('status','published').maybeSingle();if(error)throw error;if(!data){document.getElementById('legalStatus').textContent='This document has not been published by ETCH yet.';return;}document.getElementById('legalTitle').textContent=data.title;document.title=data.title+' | ETCH';EtchLegalContent.render(document.getElementById('legalBody'),data.body);document.getElementById('legalStatus').textContent='Published '+new Date(data.published_at).toLocaleDateString();}catch(error){document.getElementById('legalStatus').textContent='Unable to load this document. Reload to retry.';}
})();
