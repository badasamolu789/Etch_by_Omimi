/* Shared creator shell and listing form. All persisted actions show backend results. */
(function initialize(){
'use strict';
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initialize,{once:true});return;}
window.lucide?.createIcons?.();
const sidebar=document.querySelector('.user-sidebar'),overlay=document.querySelector('.sidebar-overlay');
function toggle(){sidebar?.classList.toggle('open');overlay?.classList.toggle('open');document.body.classList.toggle('sidebar-open');}
document.querySelector('[data-sidebar-toggle]')?.addEventListener('click',toggle);
overlay?.addEventListener('click',toggle);
document.addEventListener('keydown',event=>{if(event.key==='Escape'){sidebar?.classList.remove('open');overlay?.classList.remove('open');document.body.classList.remove('sidebar-open');}});
const page=EtchUI.pageName();
document.querySelectorAll('.user-sidebar-nav a:not(.sign-out)').forEach(link=>link.classList.toggle('active',EtchUI.pageName(new URL(link.href).pathname)===page));
const heading=document.querySelector('.greeting h1');if(heading)heading.textContent=page==='upload'?'Add or edit listing':page.charAt(0).toUpperCase()+page.slice(1);
const search=document.querySelector('.user-topbar input');if(search)search.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();location.assign('/user/listings?'+new URLSearchParams({q:search.value.trim()}));}});
const refresh=document.querySelector('.user-topbar [aria-label="Quick actions"]');if(refresh){refresh.setAttribute('aria-label','Refresh page');refresh.onclick=()=>location.reload();}
const menu=document.querySelector('.user-topbar .user-btn');if(menu)menu.onclick=()=>location.assign('/user/settings');
const notifications=document.querySelector('.notif-btn');if(notifications){notifications.querySelector('.count')?.remove();notifications.setAttribute('aria-label','Account verification status');notifications.onclick=()=>location.assign('/user/settings#verificationStatus');}
function showError(message){let el=document.getElementById('creatorStatus');if(!el){el=document.createElement('p');el.id='creatorStatus';el.setAttribute('role','status');document.querySelector('main')?.prepend(el);}if(el)el.textContent=message;}
async function loadProfile(){
 try{
  const auth=await window.ETCH_AUTH_READY;if(!auth?.authenticated)return;
  if(!auth.profile){showError('Your profile could not be loaded. Reload to retry.');return;}
  const profile=auth.profile;
  for(const node of document.querySelectorAll('.user-sidebar-profile strong,.user-topbar .user-btn strong,[data-user-name]'))node.textContent=profile.full_name||profile.username||'Creator';
  for(const node of document.querySelectorAll('.user-sidebar-profile .info span,.user-topbar .user-btn .info>span'))node.textContent=profile.account_type==='producer'?'Producer':'Writer';
  for(const avatar of document.querySelectorAll('.user-sidebar .avatar,.user-topbar .avatar')){
   if(profile.avatar_url&&EtchUI.safeUrl(profile.avatar_url)){const image=document.createElement('img');image.src=EtchUI.safeUrl(profile.avatar_url);image.alt='Your profile photo';image.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:inherit';avatar.replaceChildren(image);}
   else avatar.textContent=(profile.full_name||profile.username||'Creator').split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase();
  }
  if(!['dashboard','listings','analytics'].includes(page))return;
  const {data,error}=await EtchSupabase.getCreatorStats();if(error||!data)throw error||new Error('Statistics unavailable');
  const values={dashboardRevenueValue:'—',dashboardListingsValue:data.total,dashboardPublishedValue:data.published,dashboardViewsValue:data.views,listingTotalsValue:data.total,listingPublishedValue:data.published,listingDraftsValue:data.draft,listingViewsValue:data.views,analyticsViewsValue:data.views,analyticsPublishedValue:data.published,analyticsReviewValue:data.review??'—'};
  for(const [id,value] of Object.entries(values))document.getElementById(id)?.replaceChildren(String(value??'—'));
 }catch(error){showError('Unable to load your studio data: '+error.message+'. Reload to retry.');}
}
loadProfile();
    async function initLiveUploadForm() {
        const form = document.querySelector('form[data-listing-form]');
        if (!form || typeof EtchSupabase === 'undefined') return;
        let pending = false, existing = null;
        const editingId = new URLSearchParams(location.search).get('id');
        const auth = await window.ETCH_AUTH_READY;
        if (!auth?.authenticated) return;
        if(await window.ETCH_CATEGORIES_READY===false)return;
        if (editingId) {
            const buttons = [...document.querySelectorAll('form[data-listing-form] button[type="submit"],[data-listing-action]')]; buttons.forEach(button=>button.disabled=true);
            try {
                const {data,error} = await EtchSupabase.getClient().from('listings').select('*').eq('id',editingId).eq('creator_id',auth.user.id).maybeSingle();
                if(error)throw error;if(!data)throw new Error('Listing not found or you do not own it.');
                if(data.status==='archived')throw new Error('Removed listings cannot be edited. Contact ETCH if you need help.');
                existing=data;
                for(const key of ['title','category','price','description','rights_summary','cover_url','preview_url']) {
                    const input=form.elements.namedItem(key);if(input){if(input.tagName==='SELECT'&&data[key]&&![...input.options].some(option=>option.value===data[key]))input.add(new Option(data[key]+' (existing)',data[key]));input.value=data[key]??'';}
                }
                form.elements.namedItem('status').value=data.status==='published'?'review':data.status;
                const heading=document.querySelector('h2');if(heading)heading.textContent='Edit listing';
                document.title='Edit listing | ETCH';
                buttons.forEach(button=>button.disabled=false);
            } catch(error){const el=document.getElementById('formError');el.textContent=error.message;el.classList.remove('hidden');return;}
        }
        document.querySelectorAll('[data-listing-action]').forEach(button=>{button.onclick=()=>{if(pending)return;form.elements.namedItem('status').value=button.dataset.listingAction;form.requestSubmit();};});
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            if (pending || !form.reportValidity()) return;
            // Snapshot before authentication or any other asynchronous operation.
            const formData = new FormData(form);
            const file = form.querySelector('input[type="file"]')?.files[0];
            const buttons = [...document.querySelectorAll('form[data-listing-form] button[type="submit"],[data-listing-action]')];
            const errorEl = document.getElementById('formError');
            const successEl = document.getElementById('formSuccess');
            const selection = document.getElementById('uploadSelection');
            errorEl.classList.add('hidden');
            successEl?.classList.add('hidden');
            pending = true;
            buttons.forEach(button => { button.disabled = true; });
            let uploadedPath = null;
            let saved = false;
            try {
                const payload = Object.fromEntries(['title', 'category', 'status', 'description', 'rights_summary']
                    .map(key => [key, String(formData.get(key) || '').trim()]));
                payload.price = Number(formData.get('price') || 0);
                if (!payload.title || !payload.category || !Number.isFinite(payload.price) || payload.price < 0) {
                    throw new Error('Enter a title, category, and valid price.');
                }
                for (const key of ['cover_url', 'preview_url']) {
                    const raw = String(formData.get(key) || '').trim();
                    payload[key] = EtchUI.safeUrl(raw);
                    if (raw && !payload[key]) throw new Error('Use an HTTP or HTTPS URL.');
                }
                if (file && (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 10 * 1024 * 1024)) {
                    throw new Error('Choose a JPG, PNG, WebP, or GIF cover image under 10 MB.');
                }
                const { user, error } = await EtchSupabase.getCurrentUser();
                if (error || !user) throw new Error('Please sign in again before saving.');
                payload.creator_id = user.id;
                if (file) {
                    selection.textContent = 'Uploading cover image…';
                    const path = 'listings/' + user.id + '/' + crypto.randomUUID() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
                    const result = await EtchSupabase.uploadFile('listing-media', path, file);
                    if (result.error) throw result.error;
                    uploadedPath = path;
                    payload.cover_url = EtchSupabase.getPublicUrl('listing-media', path);
                }
                selection.textContent = 'Saving listing…';
                let result;
                if (editingId) {
                    let query=EtchSupabase.getClient().from('listings').update(payload).eq('id',editingId).eq('creator_id',auth.user.id);
                    if(existing.updated_at)query=query.eq('updated_at',existing.updated_at);
                    result=await query.select().maybeSingle();
                    if(!result.error&&!result.data)throw new Error('This listing changed elsewhere. Reload before editing again; your inputs have been kept.');
                } else result=await EtchSupabase.createListing(payload);
                if (result.error) throw result.error;
                saved = true;
                if(!editingId)form.reset();
                else existing=result.data;
                selection.textContent = '';
                if(successEl){successEl.textContent=editingId?'Listing changes saved. Published edits return to review.':'Listing saved. Drafts are private; review submissions await staff approval.';successEl.classList.remove('hidden');}
            } catch (error) {
                errorEl.textContent = error.message || 'Unable to save. Your inputs have been kept; please try again.';
                errorEl.classList.remove('hidden');
                selection.textContent = '';
            } finally {
                if (uploadedPath && !saved) {
                    const cleanup = await EtchSupabase.removeFile('listing-media', uploadedPath);
                    if (cleanup.error) console.error('Unable to remove unused upload:', cleanup.error);
                }
                pending = false;
                buttons.forEach(button => { button.disabled = false; });
            }
        });
    }

initLiveUploadForm().catch(error=>showError(error.message));
})();
