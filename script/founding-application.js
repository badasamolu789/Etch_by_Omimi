(async () => {
'use strict';
const form = document.getElementById('applicationForm');
const status = document.getElementById('applicationStatus');
const button = form.querySelector('button[type="submit"]');
const invitationToken = new URLSearchParams(location.hash.slice(1)).get('invite');
button.disabled = true;
form.hidden = true;
status.textContent = 'Checking your application…';
try {
    const {user, error: authError} = await EtchSupabase.getCurrentUser();
    if (authError) throw authError;
    if (!user) {
        status.replaceChildren();
        const link = document.createElement('a');
        link.className = 'founding-action';
        link.href = '/user/auth/signin.html';
        link.textContent = 'Sign in to apply';
        link.onclick = () => sessionStorage.setItem('etch_redirect_after_login', location.pathname + location.search + location.hash);
        status.append(link);
        return;
    }
    const db = EtchSupabase.getClient();
    const {data, error} = await db.from('founding_applications')
        .select('status,created_at,decision_reason').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    if (data) {
        status.textContent = 'Application status: ' + data.status + (data.decision_reason ? ' — ' + data.decision_reason : '');
        return;
    }
    if (invitationToken) {
        const {data: redeemed, error: redeemError} = await db.rpc('redeem_founding_invitation', {invitation_token: invitationToken});
        if (redeemError) throw redeemError;
        if (!redeemed) {
            status.textContent = 'This invitation is invalid, expired, revoked, or belongs to a different email. Sign in with the invited email or ask the ETCH team for a new link.';
            return;
        }
        history.replaceState(null, '', location.pathname + location.search);
    }
    const {data: allowed, error: accessError} = await db.rpc('can_submit_founding_application');
    if (accessError) throw accessError;
    if (!allowed) {
        status.textContent = 'Founding Voices is by invitation. Open your personal invitation link and sign in with the approved email address to apply.';
        return;
    }
    form.hidden = false;
    button.disabled = false;
    status.textContent = '';
    let pending = false;
    form.onsubmit = async event => {
        event.preventDefault();
        if (pending || !form.reportValidity()) return;
        pending = true;
        button.disabled = true;
        const fields = Object.fromEntries(new FormData(form));
        try {
            if (!/^https?:\/\//i.test(fields.portfolio_url)) throw new Error('Use an HTTP or HTTPS portfolio URL.');
            status.textContent = 'Submitting application…';
            const {error} = await db.from('founding_applications').insert({...fields, email: user.email, user_id: user.id});
            if (error) throw error;
            form.hidden = true;
            status.textContent = 'Application submitted. Your application is awaiting review.';
        } catch (error) {
            status.textContent = error.code === '23505'
                ? 'An application already exists for your account. Reload to view its status.'
                : 'Unable to submit application: ' + error.message + '. Your answers have been kept.';
        } finally {
            pending = false;
            button.disabled = false;
        }
    };
} catch (error) {
    status.textContent = 'Unable to check your application: ' + error.message + '. Reload to retry.';
}
})();
