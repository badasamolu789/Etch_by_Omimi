(async()=>{
const auth=await window.ETCH_AUTH_READY;if(!auth?.authenticated)return;
const client=EtchSupabase.getClient(),section=document.createElement('section');section.className='p-6 border rounded-2xl m-6';
section.innerHTML='<h2 class="text-2xl">Account & verification</h2><label>Account type <select id="accountType"><option value="writer">Writer</option><option value="producer">Producer</option></select></label><button id="saveAccountType" class="border p-2 m-2">Save account type</button><form id="verificationForm"><label>Public portfolio links and supporting information<textarea name="evidence" minlength="10" maxlength="5000" required class="block border p-3 w-full" rows="4"></textarea></label><button class="border p-3 my-3">Request verification</button></form><p id="verificationStatus" role="status"></p>';
document.querySelector('main').append(section);
const status=section.querySelector('#verificationStatus'),type=section.querySelector('#accountType');type.value=auth.profile.account_type||'writer';
section.querySelector('#saveAccountType').onclick=async()=>{const {error}=await client.from('profiles').update({account_type:type.value}).eq('id',auth.user.id);status.textContent=error?.message||'Account type saved.';};
const form=section.querySelector('form');
async function load(){const {data,error}=await client.from('verification_requests').select('status,decision_reason,created_at').eq('user_id',auth.user.id).order('created_at',{ascending:false}).limit(1);if(error){status.textContent=error.message;return;}if(data.length){status.textContent='Verification: '+data[0].status+(data[0].decision_reason?' — '+data[0].decision_reason:'');form.hidden=['pending','approved'].includes(data[0].status);}}
form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;try{const {error}=await client.from('verification_requests').insert({user_id:auth.user.id,evidence:new FormData(form).get('evidence')});if(error)throw error;await load();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};await load();
})();
