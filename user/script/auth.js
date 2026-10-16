/* One owner for each authentication form. Provider errors never imply success. */
(async () => {
'use strict';
window.lucide?.createIcons?.();
const page=EtchUI.pageName(),form=document.querySelector('form');
const button=form?.querySelector('button[type="submit"]');
const client=EtchSupabase.getClient();
function storageGet(storage,key){try{return (storage==='session'?window.sessionStorage:window.localStorage).getItem(key);}catch{return null;}}
function storageSet(key,value){try{sessionStorage.setItem(key,value);}catch{/* Metadata and URL parameters also preserve verification context. */}}
function storageRemove(storage,key){try{(storage==='session'?window.sessionStorage:window.localStorage).removeItem(key);}catch{}}
let pending=false,legalVersions=[];
function status(message,success=false){
 let el=document.getElementById('authStatus');
 if(!el){el=document.createElement('p');el.id='authStatus';el.setAttribute('role','status');el.className='p-3 rounded-xl my-3';(form||document.querySelector('main')||document.body).prepend(el);}
 el.textContent=message;el.style.color=success?'#3D6B4F':'#B25555';
}
function showPassword(input){input.type=input.type==='password'?'text':'password';}
document.querySelectorAll('#togglePassword,[data-toggle-password]').forEach(toggle=>{toggle.onclick=()=>{const input=toggle.closest('.relative')?.querySelector('input');if(input){showPassword(input);toggle.setAttribute('aria-label',input.type==='password'?'Show password':'Hide password');toggle.setAttribute('aria-pressed',String(input.type==='text'));}};});
if(!client){status('Unable to connect. Reload to retry.');if(button)button.disabled=true;return;}
async function finish(session){
 let saved=null;
 try{saved=JSON.parse(storageGet('session','etch_legal_versions')||'null');}catch{}
 const matchesAccount=Boolean(saved&&typeof saved.email==='string'&&Array.isArray(saved.ids)&&saved.ids.length===2&&session?.user?.email&&saved.email===session.user.email.toLowerCase());
 const versions=matchesAccount?saved.ids:session?.user?.user_metadata?.legal_versions;
 if(Array.isArray(versions)&&versions.length){
  const published=await client.from('legal_documents').select('id,document_key').eq('status','published');
  if(published.error||!['terms','privacy'].every(key=>published.data?.some(row=>row.document_key===key))){location.assign('/user/legal-review');return;}
  const current=published.data.map(row=>row.id);
  const receipts=await client.from('legal_acceptances').select('document_id').eq('user_id',session?.user?.id).in('document_id',current);
  if(receipts.error){location.assign('/user/legal-review');return;}
  if(!current.every(id=>receipts.data?.some(row=>row.document_id===id))){
   const {error}=await client.rpc('accept_legal_documents',{document_ids:versions});
   if(error){location.assign('/user/legal-review');return;}
  }
  if(matchesAccount)storageRemove('session','etch_legal_versions');
 }
 location.assign(EtchUI.consumeAuthRedirect());
}
if(page==='signup'){
 // Signup stays open before publication. Only request consent to actual published versions.
 const consent=document.getElementById('signupConsent'),checkbox=consent?.querySelector('input');
 button.disabled=true;
 try{
  const {data,error}=await client.from('legal_documents').select('id,document_key').eq('status','published');
  if(!error&&['terms','privacy'].every(key=>data?.some(record=>record.document_key===key))){
   legalVersions=data.filter(record=>['terms','privacy'].includes(record.document_key)).map(record=>record.id);
   if(consent)consent.hidden=false;if(checkbox){checkbox.disabled=false;checkbox.required=true;}
   const footer=document.getElementById('signupLegalFooter');if(footer)footer.hidden=false;
  }
 }catch{/* Document availability does not prevent creating an account. */}
 button.disabled=false;
}
const emailInput=form?.querySelector('[name="email"]');
let email=new URLSearchParams(location.search).get('email')||storageGet('session','etch_pending_email')||storageGet('local','etch_pending_email')||'';
const otp=[...document.querySelectorAll('[data-otp-input]')];
if(page==='verify-otp'){
 document.getElementById('emailDisplay').textContent=email||'Email address missing';
 if(!email){status('Open the verification link from signup or return to sign up.');button.disabled=true;}
 otp.forEach((input,index)=>{
  input.inputMode='numeric';input.autocomplete=index===0?'one-time-code':'off';
  input.oninput=()=>{input.value=input.value.replace(/\D/g,'').slice(-1);if(input.value&&index<otp.length-1)otp[index+1].focus();};
  input.onkeydown=event=>{if(event.key==='Backspace'&&!input.value&&index)otp[index-1].focus();};
  input.onpaste=event=>{event.preventDefault();const digits=event.clipboardData.getData('text').replace(/\D/g,'');if(digits.length!==otp.length)return;otp.forEach((el,i)=>el.value=digits[i]);otp.at(-1).focus();};
 });
 const resend=document.getElementById('resendBtn');
 resend.onclick=async()=>{
  if(resend.disabled||!email)return;resend.disabled=true;
  try{const {error}=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:location.origin+'/user/auth/callback'}});if(error)throw error;status('Verification email sent. Check your inbox and spam folder.',true);setTimeout(()=>resend.disabled=false,60000);}
  catch(error){status(error.message||'Unable to resend. Please retry.');resend.disabled=false;}
 };
}
if(page==='callback'){
 try{
  const params=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.slice(1));
  if(params.get('error')||hash.get('error'))throw new Error(params.get('error_description')||hash.get('error_description')||'The confirmation link is invalid or expired.');
  const {session,error}=await EtchSupabase.getSession();if(error)throw error;if(!session)throw new Error('No confirmed session found. Request a new confirmation email or sign in.');
  storageRemove('session','etch_pending_email');storageRemove('local','etch_pending_email');
  await finish(session);
 }catch(error){status(error.message);}
 return;
}
const passwordRules=[
 {id:'length',label:'At least 8 characters',test:value=>Array.from(value).length>=8},
 {id:'lower',label:'One lowercase letter (a–z)',test:value=>/[a-z]/.test(value)},
 {id:'upper',label:'One uppercase letter (A–Z)',test:value=>/[A-Z]/.test(value)},
 {id:'number',label:'One number (0–9)',test:value=>/[0-9]/.test(value)},
 {id:'symbol',label:'One symbol (e.g. ! @ # $)',test:value=>/[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,.\/`~]/.test(value)}
];
function passwordError(value){return passwordRules.every(rule=>rule.test(value))?'':'Use at least 8 characters, including a lowercase letter, an uppercase letter, a number, and a symbol.';}
let validatePassword=()=>{};
if(page==='signup'||page==='reset-password'){
 const password=form.querySelector('[name="password"]'),confirm=form.querySelector('[name="confirm_password"]');
 form.noValidate=true;
 const panel=document.getElementById('passwordRequirements');
 panel.innerHTML='<p class="password-checklist-title">Your password needs:</p><ul class="password-checklist">'+passwordRules.map(rule=>'<li data-password-rule="'+rule.id+'"><span class="password-check-icon" aria-hidden="true">○</span><span>'+rule.label+'</span><span class="password-rule-state sr-only"> — not met</span></li>').join('')+'</ul><p id="passwordProgress" class="password-progress" aria-live="polite"></p>';
 const match=document.getElementById('passwordMatch');
 password.setAttribute('aria-describedby','passwordRequirements');confirm.setAttribute('aria-describedby','passwordMatch');
 password.autocomplete='new-password';confirm.autocomplete='new-password';
 password.setAttribute('aria-label','Password');confirm.setAttribute('aria-label','Confirm password');
 validatePassword=()=>{
  let count=0;
  for(const rule of passwordRules){const met=rule.test(password.value);if(met)count++;const row=panel.querySelector('[data-password-rule="'+rule.id+'"]');row.dataset.met=String(met);row.querySelector('.password-check-icon').textContent=met?'✓':'○';row.querySelector('.password-rule-state').textContent=met?' — met':' — not met';}
  document.getElementById('passwordProgress').textContent=password.value?(count===passwordRules.length?'All password requirements met.':count+' of '+passwordRules.length+' requirements met.') : '';
  password.setCustomValidity(password.value?passwordError(password.value):'');
  confirm.setCustomValidity(confirm.value&&confirm.value!==password.value?'Passwords do not match.':'');
  match.hidden=!confirm.value;match.textContent=confirm.value?(confirm.value===password.value?'✓ Passwords match':'Passwords do not match.') : '';match.dataset.met=String(Boolean(confirm.value&&confirm.value===password.value));
  if(page==='signup'){const name=form.querySelector('[name="name"]');name.setCustomValidity(name.value&&!name.value.trim()?'Enter your name.':'');}
 };
 for(const input of form.querySelectorAll('input')){input.addEventListener('input',validatePassword);input.addEventListener('change',validatePassword);}
 form.addEventListener('reset',()=>setTimeout(validatePassword,0));validatePassword();
}
if(page==='reset-password'){
 button.disabled=true;
 try{const {session,error}=await EtchSupabase.getSession();if(error||!session)throw error||new Error('This reset link is invalid or expired. Request another reset email.');button.disabled=false;}
 catch(error){status(error.message);return;}
}
form?.addEventListener('submit',async event=>{
 event.preventDefault();validatePassword();if(pending||!form.reportValidity())return;
 pending=true;button.disabled=true;status('Please wait…',true);
 try{
  const fields=Object.fromEntries(new FormData(form));
  if(page==='signup'){
   if(!fields.name?.trim())throw new Error('Enter your name.');
   if(fields.password!==fields.confirm_password)throw new Error('Passwords do not match.');
   if(passwordError(fields.password))throw new Error(passwordError(fields.password));
   if(!['writer','producer'].includes(fields.account_type))throw new Error('Choose a valid account type.');
   const {data,error}=await EtchSupabase.signUp(fields.email.trim(),fields.password,fields.name.trim(),fields.account_type,legalVersions);if(error)throw error;
   storageSet('etch_legal_versions',JSON.stringify({email:fields.email.trim().toLowerCase(),ids:legalVersions}));
   if(data?.session){await finish(data.session);return;}
   email=fields.email.trim();storageSet('etch_pending_email',email);
   location.assign('/user/auth/verify-otp?'+new URLSearchParams({email}));return;
  }
  if(page==='signin'){
   const {data,error}=await EtchSupabase.signIn(fields.email.trim(),fields.password);if(error)throw error;
   if(!data?.session)throw new Error('Sign-in did not create a session. Please retry.');
   await finish(data.session);return;
  }
  if(page==='verify-otp'){
   const token=otp.map(el=>el.value).join('');if(!/^\d{6}$/.test(token))throw new Error('Enter the complete six-digit code.');
   const {data,error}=await client.auth.verifyOtp({email,token,type:'signup'});if(error)throw error;
   if(!data?.session)throw new Error('Email verification did not create a session. Please sign in.');
   storageRemove('session','etch_pending_email');storageRemove('local','etch_pending_email');await finish(data.session);return;
  }
  if(page==='forgot-password'){
   const {error}=await EtchSupabase.resetPassword(fields.email.trim());if(error)throw error;
   status('If an account exists for this address, a password reset email will arrive shortly. Check your spam folder too.',true);return;
  }
  if(page==='reset-password'){
   const password=document.getElementById('newPassword').value,confirm=document.getElementById('confirmPassword').value;
   if(passwordError(password))throw new Error(passwordError(password));if(password!==confirm)throw new Error('Passwords do not match.');
   const {error}=await EtchSupabase.updatePassword(password);if(error)throw error;
   form.reset();status('Password updated. You can return to your studio.',true);
   const link=document.createElement('a');link.href='/user/dashboard';link.textContent='Open your studio';link.className='block p-3 text-olive';form.append(link);
  }
 }catch(error){status(error.code==='weak_password'?'Please choose a different password. Use all the listed requirements and avoid common or previously exposed passwords.':error.message||'Unable to complete this request. Your inputs have been kept.');}
 finally{pending=false;button.disabled=false;}
});
const resendLink=document.getElementById('resendLink');if(resendLink)resendLink.onclick=()=>form.requestSubmit();
})();
