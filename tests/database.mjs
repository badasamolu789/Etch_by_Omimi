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
await db.close();
console.log('Database migration and anonymous/creator/admin policy checks passed.');
