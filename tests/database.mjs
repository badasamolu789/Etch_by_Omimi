import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.ETCH_PGLITE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users (id uuid PRIMARY KEY, raw_user_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '') $$;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
CREATE TABLE storage.objects (id uuid DEFAULT gen_random_uuid(), bucket_id text, name text, owner_id text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1, '/') $$;
GRANT USAGE ON SCHEMA auth, storage, public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
`);
await db.exec(readFileSync(new URL('../docs/supabase-schema.sql', import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../supabase/migrations/202609110001_platform_consistency.sql', import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../supabase/migrations/202609110003_homepage_partners.sql', import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../supabase/migrations/202609110004_marketplace_categories.sql', import.meta.url),'utf8'));
const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const admin='33333333-3333-4333-8333-333333333333';
await db.exec(`INSERT INTO auth.users (id) VALUES ('${owner}'), ('${other}'), ('${admin}');
UPDATE profiles SET role='admin' WHERE id='${admin}';
INSERT INTO listings (creator_id,title,status,views) VALUES ('${owner}','Draft','draft',3),('${owner}','Published','published',8);
INSERT INTO masterclass_articles(title,slug,content,status) VALUES ('Draft','draft','body','draft'),('Published','published','body','published');
INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES ('avatars','profiles/${owner}/avatar.png','${owner}');`);
async function as(role, id, action) {
    await db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claim.role','${role}',false); SELECT set_config('request.jwt.claim.sub','${id || ''}',false);`);
    try { return await action(); } finally { await db.exec('RESET ROLE;'); }
}
const rows = async sql => (await db.query(sql)).rows;
await as('anon',null,async()=>{
    assert.equal((await rows('SELECT * FROM listings')).length,1);
    assert.equal((await rows('SELECT * FROM masterclass_articles')).length,1);
    await db.query("SELECT subscribe_to_newsletter('USER@EXAMPLE.COM', 'User')");
    await db.query("SELECT subscribe_to_newsletter('user@example.com', 'Other')");
    assert.equal((await rows('SELECT * FROM newsletter_subscribers')).length,0);
    assert.equal((await rows('SELECT * FROM homepage_partners')).length,0);
    assert.deepEqual((await rows('SELECT slug FROM marketplace_categories')).map(row => row.slug), ['script']);
    await assert.rejects(db.exec("INSERT INTO masterclass_articles(title,slug,content) VALUES ('bad','bad','bad')"));
    await db.exec("INSERT INTO contacts(name,email,subject,message) VALUES ('Name','a@b.test','Help','Question')");
    assert.equal((await rows('SELECT * FROM contacts')).length,0);
});
await as('authenticated',owner,async()=>{
    assert.equal((await rows('SELECT * FROM listings')).length,2);
    assert.equal((await rows('SELECT * FROM masterclass_articles')).length,1);
    assert.equal((await rows('SELECT * FROM newsletter_subscribers')).length,0);
    await assert.rejects(db.exec("UPDATE profiles SET role='admin' WHERE id=auth.uid()"));
    await db.exec("UPDATE profiles SET full_name='Creator' WHERE id=auth.uid()");
    await assert.rejects(db.exec("INSERT INTO masterclass_authors(name,slug) VALUES ('Bad','bad')"));
    await assert.rejects(db.exec("INSERT INTO homepage_partners(name,status) VALUES ('Fake Sponsor','published')"));
    await assert.rejects(db.exec("INSERT INTO marketplace_categories(name,slug,status) VALUES ('Music','music','published')"));
    const stats=(await rows('SELECT creator_listing_stats() AS stats'))[0].stats;
    assert.deepEqual(stats,{total:2,published:1,draft:1,views:11});
    await db.exec("UPDATE storage.objects SET name='profiles/"+owner+"/renamed.png' WHERE owner_id=auth.uid()::text");
});
await as('authenticated',other,async()=>{
    assert.equal((await rows('SELECT * FROM listings')).length,1);
    await db.exec("DELETE FROM storage.objects");
    assert.equal((await rows('SELECT * FROM storage.objects')).length,1);
    await assert.rejects(db.exec("INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES ('avatars','profiles/"+owner+"/attack.png',auth.uid()::text)"));
});
await as('authenticated',admin,async()=>{
    assert.equal((await rows('SELECT * FROM masterclass_articles')).length,2);
    assert.equal((await rows('SELECT * FROM newsletter_subscribers')).length,1);
    await db.exec("INSERT INTO masterclass_authors(name,slug) VALUES ('Editorial','editorial')");
    await db.exec("INSERT INTO homepage_partners(name,status,display_order) VALUES ('Real Partner','published',1),('Draft Partner','draft',2)");
    await db.exec("INSERT INTO marketplace_categories(name,slug,status,display_order) VALUES ('Future Category','future-category','draft',20)");
    assert.equal((await rows('SELECT * FROM homepage_partners')).length,2);
    assert.equal((await rows('SELECT * FROM marketplace_categories')).length,2);
    assert.equal((await rows('SELECT * FROM contacts')).length,1);
});
await as('anon',null,async()=>{
    const visiblePartners = await rows('SELECT name FROM homepage_partners ORDER BY display_order');
    assert.deepEqual(visiblePartners.map(row => row.name), ['Real Partner']);
    const visibleCategories = await rows('SELECT slug FROM marketplace_categories ORDER BY display_order');
    assert.deepEqual(visibleCategories.map(row => row.slug), ['script']);
});
await db.exec("INSERT INTO masterclass_articles(title,slug,content,status,published_at) VALUES ('Due','due','body','scheduled',now()-interval '1 minute'),('Future','future','body','scheduled',now()+interval '1 day')");
const scheduledMigration=readFileSync(new URL('../supabase/migrations/202609110002_scheduled_articles.sql', import.meta.url),'utf8');
await db.exec(scheduledMigration.split('$job$')[1]);
assert.equal((await rows("SELECT status FROM masterclass_articles WHERE slug='due'"))[0].status, 'published');
assert.equal((await rows("SELECT status FROM masterclass_articles WHERE slug='future'"))[0].status, 'scheduled');
for (const file of ['202609220001_admin_workflows.sql','202609220002_review_actions.sql','202609220003_previews_analytics.sql','202609220004_operations_status.sql']) {
 try { await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8')); }
 catch(error) { console.error(file, error.message); process.exit(1); }
}
try {
await db.exec("SELECT set_config('request.jwt.claim.role','',false),set_config('request.jwt.claim.sub','',false)");
const editor='44444444-4444-4444-8444-444444444444', reviewer='55555555-5555-4555-8555-555555555555', superAdmin='66666666-6666-4666-8666-666666666666';
await db.exec(`INSERT INTO auth.users(id) VALUES('${editor}'),('${reviewer}'),('${superAdmin}'); UPDATE profiles SET role='editor' WHERE id='${editor}'; UPDATE profiles SET role='reviewer' WHERE id='${reviewer}'; UPDATE profiles SET role='super_admin' WHERE id='${superAdmin}';`);
await as('authenticated',owner,async()=>{
 await assert.rejects(db.exec("UPDATE profiles SET role='super_admin' WHERE id=auth.uid()"));
 await assert.rejects(db.exec(`SELECT set_staff_role('${other}','admin')`));
 await assert.rejects(db.exec("INSERT INTO listings(creator_id,title,status) VALUES(auth.uid(),'Bypass','published')"));
 await assert.rejects(db.exec("UPDATE listings SET is_featured=true WHERE creator_id=auth.uid()"));
 await assert.rejects(db.exec("INSERT INTO admin_audit_log(action,entity) VALUES('fake','profiles')"));
 assert.equal((await rows('SELECT * FROM admin_audit_log')).length,0);
 await db.exec("INSERT INTO verification_requests(user_id,evidence) VALUES(auth.uid(),'https://portfolio.example/writing')");
 await assert.rejects(db.exec("UPDATE verification_requests SET status='approved' WHERE user_id=auth.uid()"));
 await db.exec("INSERT INTO founding_applications(user_id,full_name,email,portfolio_url,statement) VALUES(auth.uid(),'Writer','writer@example.test','https://portfolio.example',repeat('Writing experience. ',10))");
 await assert.rejects(db.exec("UPDATE founding_applications SET status='accepted' WHERE user_id=auth.uid()"));
});
const application=(await rows('SELECT id FROM founding_applications'))[0].id;
const verification=(await rows('SELECT id FROM verification_requests'))[0].id;
await as('authenticated',editor,async()=>{
 await db.exec("INSERT INTO masterclass_articles(title,slug,content,status) VALUES('Editable','editable','Original','draft')");
 await db.exec("UPDATE masterclass_articles SET content='Updated', status='scheduled',published_at=now()+interval '1 day' WHERE slug='editable'");
 await assert.rejects(db.exec("UPDATE masterclass_articles SET published_at=now()-interval '1 day' WHERE slug='editable'"));
 await db.exec("UPDATE masterclass_articles SET status='draft' WHERE slug='editable'");
 assert.equal((await rows("SELECT published_at FROM masterclass_articles WHERE slug='editable'"))[0].published_at,null);
 assert.equal((await rows('SELECT * FROM founding_applications')).length,0);
 await assert.rejects(db.exec(`SELECT decide_verification('${verification}','approved','Checked portfolio')`));
});
await as('authenticated',reviewer,async()=>{
 await assert.rejects(db.exec("INSERT INTO masterclass_articles(title,slug,content) VALUES('Forbidden','forbidden','x')"));
 await db.exec(`SELECT decide_verification('${verification}','approved','Checked portfolio')`);
 await assert.rejects(db.exec(`SELECT decide_verification('${verification}','declined','Stale review')`));
 await assert.rejects(db.exec(`SELECT decide_founding_application('${application}','accepted','Looks good')`));
});
await as('authenticated',admin,async()=>{
 await assert.rejects(db.exec(`SELECT set_staff_role('${other}','reviewer')`));
 await db.exec(`SELECT configure_founding_rubric('[{"key":"writing","name":"Writing","weight":70},{"key":"fit","name":"Fit","weight":30}]')`);
 await assert.rejects(db.exec(`SELECT configure_founding_rubric('[{"key":"writing","name":"Writing","weight":80}]')`));
});
const rubric=(await rows('SELECT id FROM founding_rubrics WHERE active'))[0].id;
await as('authenticated',reviewer,async()=>{
 await assert.rejects(db.exec(`SELECT score_founding_application('${application}','${rubric}','{"writing":101,"fit":100}','Checked')`));
 await db.exec(`SELECT score_founding_application('${application}','${rubric}','{"writing":80,"fit":60}','Strong writing sample')`);
 assert.equal(Number((await rows(`SELECT score FROM founding_applications WHERE id='${application}'`))[0].score),74);
 await db.exec(`SELECT decide_founding_application('${application}','accepted','Meets criteria')`);
 await assert.rejects(db.exec(`SELECT decide_founding_application('${application}','declined','Stale decision')`));
});
await as('authenticated',superAdmin,async()=>{
 await db.exec(`SELECT set_staff_role('${other}','editor')`);
 await assert.rejects(db.exec(`SELECT set_staff_role('${superAdmin}','creator')`));
 await assert.rejects(db.exec("UPDATE profiles SET role='creator' WHERE id=auth.uid()"));
});
const listing=(await rows("SELECT id FROM listings WHERE title='Draft'"))[0].id;
await as('authenticated',reviewer,async()=>{await db.exec(`SELECT moderate_listing('${listing}','published','Reviewed script')`);});
await as('authenticated',owner,async()=>{
 await db.exec(`UPDATE listings SET description='Changed content' WHERE id='${listing}'`);
 assert.equal((await rows(`SELECT status FROM listings WHERE id='${listing}'`))[0].status,'review');
});
await as('authenticated',reviewer,async()=>{await db.exec(`SELECT moderate_listing('${listing}','published','Reviewed revision')`);});
await as('authenticated',owner,async()=>{
 await db.exec(`INSERT INTO content_reports(reporter_id,content_type,content_id,reason) VALUES(auth.uid(),'listing','${listing}','This content violates the policy')`);
});
const report=(await rows('SELECT id FROM content_reports'))[0].id;
await as('authenticated',reviewer,async()=>{await db.exec(`SELECT resolve_content_report('${report}','removed','Confirmed policy violation')`);});
await as('anon',null,async()=>{assert.equal((await rows(`SELECT id FROM listings WHERE id='${listing}'`)).length,0);
 await db.exec("SELECT record_page_view('77777777-7777-4777-8777-777777777777','88888888-8888-4888-8888-888888888888','/about','campaign','email','launch',12)");
 await db.exec("SELECT record_page_view('77777777-7777-4777-8777-777777777777','88888888-8888-4888-8888-888888888888','/about','campaign','email','launch',20)");
 await assert.rejects(db.exec('SELECT analytics_summary()'));
 await assert.rejects(db.exec("SELECT record_page_view(gen_random_uuid(),gen_random_uuid(),'/admin/index')"));
 await assert.rejects(db.exec('SELECT * FROM article_preview_links'));
});
await as('authenticated',admin,async()=>{
 const scheduler=(await rows('SELECT article_scheduler_status() AS value'))[0].value;assert.equal(scheduler.configured,false);
 const stats=(await rows('SELECT analytics_summary() AS value'))[0].value;
 assert.equal(stats.page_views,1);assert.equal(stats.average_active_session_seconds,20);
 const audit=await rows("SELECT * FROM admin_audit_log WHERE entity='content_reports' AND action='UPDATE'");
 assert.equal(audit[0].actor_id,reviewer);assert.equal(audit[0].after_data.status,'removed');
 await assert.rejects(db.exec('DELETE FROM admin_audit_log'));
});
console.log('New staff roles, article scheduling, weighted reviews, moderation, verification, analytics, and audit checks passed.');

} catch(error) {console.error('Workflow test failure:',error.message,error.detail || '');process.exit(1);}
console.log('Database migration and anonymous/creator/admin policy checks passed.');

// Invitations require both an approved email and a personal token; direct inserts cannot bypass them.
await db.exec('ALTER TABLE auth.users ADD COLUMN email text');
await db.exec(readFileSync(new URL('../supabase/migrations/202610150001_founding_invitations.sql',import.meta.url),'utf8'));
const invitationReviewer='55555555-5555-4555-8555-555555555555';
const legacyApplication=(await rows('SELECT id FROM founding_applications LIMIT 1'))[0].id;
const invitedUser='88888888-8888-4888-8888-888888888888';
const wrongUser='99999999-9999-4999-8999-999999999999';
await db.exec(`INSERT INTO auth.users(id,email) VALUES('${invitedUser}','invited@example.test'),('${wrongUser}','other@example.test')`);
let invitation;
await as('authenticated',invitationReviewer,async()=>{
 invitation=(await rows("SELECT create_founding_invitation(' Invited@Example.Test ',14) AS value"))[0].value;
 assert.equal(invitation.email,'invited@example.test');
 assert.equal(invitation.token.length,64);
});
await as('authenticated',wrongUser,async()=>{
 assert.equal((await rows(`SELECT redeem_founding_invitation('${invitation.token}') AS allowed`))[0].allowed,false);
 assert.equal((await rows('SELECT * FROM founding_invitations')).length,0);
 await assert.rejects(db.exec("SELECT create_founding_invitation('other@example.test',14)"));
});
const submission=`INSERT INTO founding_applications(user_id,full_name,email,portfolio_url,statement) VALUES('${invitedUser}','Invited writer','invited@example.test','https://example.test','This is a sufficiently long writing statement for the founding cohort.')`;
await as('authenticated',invitedUser,async()=>{
 assert.equal((await rows('SELECT can_submit_founding_application() AS allowed'))[0].allowed,false);
 await assert.rejects(db.exec(submission));
 assert.equal((await rows("SELECT redeem_founding_invitation('invalid') AS allowed"))[0].allowed,false);
 assert.equal((await rows(`SELECT redeem_founding_invitation('${invitation.token}') AS allowed`))[0].allowed,true);
 assert.equal((await rows("SELECT can_submit_founding_application('spoofed@example.test') AS allowed"))[0].allowed,false);
 assert.equal((await rows('SELECT can_submit_founding_application() AS allowed'))[0].allowed,true);
});
await as('authenticated',invitationReviewer,async()=>{await db.query('SELECT revoke_founding_invitation($1)',[invitation.id]);});
await as('authenticated',invitedUser,async()=>{await assert.rejects(db.exec(submission));});
let replacement;
await as('authenticated',invitationReviewer,async()=>{replacement=(await rows("SELECT create_founding_invitation('invited@example.test',14) AS value"))[0].value;});
await as('authenticated',invitedUser,async()=>{
 assert.equal((await rows(`SELECT redeem_founding_invitation('${invitation.token}') AS allowed`))[0].allowed,false);
 assert.equal((await rows(`SELECT redeem_founding_invitation('${replacement.token}') AS allowed`))[0].allowed,true);
});
await db.query("UPDATE founding_invitations SET expires_at=now()-interval '1 second' WHERE id=$1",[replacement.id]);
await as('authenticated',invitedUser,async()=>{await assert.rejects(db.exec(submission));});
await as('authenticated',invitationReviewer,async()=>{replacement=(await rows("SELECT create_founding_invitation('invited@example.test',14) AS value"))[0].value;});
await as('authenticated',invitedUser,async()=>{
 await db.query('SELECT redeem_founding_invitation($1)',[replacement.token]);
 await db.exec(submission);
 await assert.rejects(db.exec(submission));
});
assert.equal((await rows(`SELECT count(*)::int AS count FROM founding_applications WHERE user_id='${invitedUser}'`))[0].count,1);
assert.equal((await rows(`SELECT count(*)::int AS count FROM founding_applications WHERE id='${legacyApplication}'`))[0].count,1,'existing applications retained');
await as('anon',null,async()=>{await assert.rejects(db.exec('SELECT can_submit_founding_application()'));});
console.log('Invitation email matching, token rotation, expiry, revocation, permissions, and submission enforcement passed.');



// Creator workspace migrations: profile saving, private communications and published legal documents.
for(const file of ['202610150002_creator_workspace.sql','202610150003_creator_communications.sql','202610150004_legal_documents.sql']) {
 try{await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));}
 catch(error){console.error(file,error.message);throw error;}
}
await db.exec("SELECT set_config('request.jwt.claim.role','',false),set_config('request.jwt.claim.sub','',false)");
const producer='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',writer='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',stranger='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
await db.exec(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('${producer}','producer@example.test','{"full_name":"Producer","account_type":"producer","role":"super_admin"}'),('${writer}','writer@example.test','{"full_name":"Writer"}'),('${stranger}','stranger@example.test','{}')`);
assert.equal((await rows(`SELECT role FROM profiles WHERE id='${producer}'`))[0].role,'creator');
assert.equal((await rows(`SELECT account_type FROM profiles WHERE id='${producer}'`))[0].account_type,'producer');
const creatorListing='dddddddd-dddd-4ddd-8ddd-dddddddddddd',privateListing='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
await db.exec(`INSERT INTO listings(id,creator_id,title,status) VALUES('${creatorListing}','${writer}','Public script','published'),('${privateListing}','${writer}','Private script','draft')`);
await as('authenticated',writer,async()=>{
 await db.exec(`UPDATE profiles SET full_name='Updated Writer',bio='Biography',website='https://example.test',location='Lagos',storefront_ready=true WHERE id='${writer}'`);
 await assert.rejects(db.exec(`UPDATE profiles SET website='javascript:alert(1)' WHERE id='${writer}'`));
 await assert.rejects(db.exec(`UPDATE listings SET views=10000 WHERE id='${creatorListing}'`));
});
const viewSession='ffffffff-ffff-4fff-8fff-ffffffffffff';
await as('anon',null,async()=>{
 await db.query('SELECT record_listing_view($1,$2)',[creatorListing,viewSession]);
 await db.query('SELECT record_listing_view($1,$2)',[creatorListing,viewSession]);
 await db.query('SELECT record_listing_view($1,$2)',[privateListing,viewSession]);
 await assert.rejects(db.exec('SELECT * FROM listing_view_events'));
});
assert.equal((await rows(`SELECT status FROM listings WHERE id='${creatorListing}'`))[0].status,'published','view tracking must not trigger moderation');
await as('authenticated',writer,async()=>{
 await db.query('SELECT record_listing_view($1,$2)',[creatorListing,crypto.randomUUID()]);
 const stats=(await rows('SELECT creator_listing_stats() AS data'))[0].data;assert.equal(Number(stats.views),1);assert.equal(Number(stats.total),2);
 assert.equal(Number((await rows(`SELECT views FROM creator_listing_metrics() WHERE id='${creatorListing}'`))[0].views),1);
});
await as('authenticated',stranger,async()=>{assert.equal((await rows('SELECT * FROM creator_listing_metrics()')).length,0);});
let conversation;
const openingId='11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
await as('authenticated',producer,async()=>{
 conversation=(await db.query('SELECT start_creator_conversation($1,$2,$3) AS id',[creatorListing,'Hello, can we discuss this script?',openingId])).rows[0].id;
 assert.equal((await db.query('SELECT start_creator_conversation($1,$2,$3) AS id',[creatorListing,'Hello, can we discuss this script?',openingId])).rows[0].id,conversation);
 assert.equal((await rows('SELECT * FROM creator_messages')).length,1);
 await assert.rejects(db.query('SELECT start_creator_conversation($1,$2,$3)',[privateListing,'Hidden script',crypto.randomUUID()]));
});
await as('authenticated',stranger,async()=>{
 assert.equal((await rows('SELECT * FROM creator_messages')).length,0);assert.equal((await rows('SELECT * FROM creator_conversations')).length,0);
 await assert.rejects(db.exec(`INSERT INTO creator_messages(id,conversation_id,sender_id,body) VALUES(gen_random_uuid(),'${conversation}','${stranger}','Intrusion')`));
});
await as('authenticated',writer,async()=>{
 await db.exec(`INSERT INTO creator_messages(id,conversation_id,sender_id,body) VALUES(gen_random_uuid(),'${conversation}','${writer}','Thanks, happy to discuss')`);
 await assert.rejects(db.exec(`INSERT INTO creator_messages(id,conversation_id,sender_id,body) VALUES(gen_random_uuid(),'${conversation}','${producer}','Impersonation')`));
 await assert.rejects(db.exec("UPDATE creator_messages SET body='Changed'"));
});
let enquiry;const enquiryId='22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
await as('authenticated',producer,async()=>{
 await db.query('SELECT request_listing_license($1,$2,$3)',[creatorListing,'Feature film rights in Nigeria for two years.',enquiryId]);
 await db.query('SELECT request_listing_license($1,$2,$3)',[creatorListing,'Feature film rights in Nigeria for two years.',enquiryId]);
 enquiry=(await rows(`SELECT * FROM licensing_enquiries WHERE id='${enquiryId}'`))[0];
 await assert.rejects(db.query('SELECT update_licensing_enquiry($1,$2,$3,$4)',[enquiryId,'closed','Approved',enquiry.updated_at]));
});
await as('authenticated',stranger,async()=>{assert.equal((await rows('SELECT * FROM licensing_enquiries')).length,0);await assert.rejects(db.query('SELECT update_licensing_enquiry($1,$2,$3,$4)',[enquiryId,'declined','Intrusion',enquiry.updated_at]));});
await as('authenticated',writer,async()=>{await db.query('SELECT update_licensing_enquiry($1,$2,$3,$4)',[enquiryId,'reviewing','Let us discuss the proposed use.',enquiry.updated_at]);await assert.rejects(db.query('SELECT update_licensing_enquiry($1,$2,$3,$4)',[enquiryId,'closed','Stale update',enquiry.updated_at]));});
// Withdraw a published listing without destroying its existing conversation or enquiries.
await as('authenticated',writer,async()=>{await db.exec(`UPDATE listings SET status='draft' WHERE id='${creatorListing}'`);});
assert.equal((await rows(`SELECT status FROM listings WHERE id='${creatorListing}'`))[0].status,'draft');
let terms,privacy;
const saveDoc=async(key,body,publish,expected=null)=>(await db.query('SELECT save_legal_document($1,$2,$3,$4,$5) AS id',[key,key==='terms'?'Terms of Service':'Privacy Policy',body,publish,expected])).rows[0].id;
await as('authenticated',admin,async()=>{
 const draft=await saveDoc('terms','Draft legal text supplied by the platform administrator.',false);
 const richBody='## Terms of Service\n\n**Approved** policy body.\n\n- A responsibility\n- Another responsibility\n\n<h3>HTML section</h3><p>Approved legal content.</p>';
 terms=await saveDoc('terms',richBody,true,draft);
 assert.equal((await rows(`SELECT body FROM legal_documents WHERE id='${terms}'`))[0].body,richBody);
 assert.equal((await rows(`SELECT status FROM legal_documents WHERE id='${draft}'`))[0].status,'draft');
 privacy=await saveDoc('privacy','Published privacy text supplied by the platform administrator.',true);
 await assert.rejects(saveDoc('terms','Stale copy of legal text with a missing version guard.',true,draft));
});
await as('anon',null,async()=>{assert.equal((await rows('SELECT * FROM legal_documents')).length,2);await assert.rejects(db.exec("SELECT save_legal_document('terms','Terms','Unauthorised legal replacement text',true,NULL)"));});
await as('authenticated',producer,async()=>{
 await db.query('SELECT accept_legal_documents($1)',[[terms,privacy]]);await db.query('SELECT accept_legal_documents($1)',[[terms,privacy]]);
 assert.equal((await rows('SELECT * FROM legal_acceptances')).length,2);
 await assert.rejects(db.query('SELECT accept_legal_documents($1)',[[terms,terms]]));
});
await as('authenticated',stranger,async()=>{assert.equal((await rows('SELECT * FROM legal_acceptances')).length,0);});
console.log('Creator profiles, view metrics, conversation privacy/idempotency, licensing roles, legal publication/version guards and consent checks passed.');
await db.close();
