(async()=>{
const form=document.getElementById('applicationForm'),status=document.getElementById('applicationStatus');
const {user}=await EtchSupabase.getCurrentUser();
if(!user){form.hidden=true;status.innerHTML='Please <a href="/user/auth/signin.html">sign in</a> to apply.';return;}
const db=EtchSupabase.getClient();
async function load(){const {data,error}=await db.from('founding_applications').select('status,created_at,decision_reason').eq('user_id',user.id).maybeSingle();if(error){status.textContent=error.message;return;}if(data){form.hidden=true;status.textContent='Application status: '+data.status+(data.decision_reason?' — '+data.decision_reason:'');}}
form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;const fields=Object.fromEntries(new FormData(form));
try{if(!/^https?:\/\//i.test(fields.portfolio_url))throw new Error('Use an HTTPS portfolio URL.');const {error}=await db.from('founding_applications').insert({...fields,email:user.email,user_id:user.id});if(error)throw error;status.textContent='Application submitted.';await load();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
await load();
})();
