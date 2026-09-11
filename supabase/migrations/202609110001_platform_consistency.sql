-- Apply after the existing ETCH schema. Transactional; no records are deleted.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin');
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- Privilege assignment must come from trusted SQL/service-role administration.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF COALESCE(auth.role(), '') IN ('anon', 'authenticated') THEN
        IF TG_OP = 'INSERT' THEN
            NEW.role := 'creator';
        ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Role changes require server administration' USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

DROP POLICY IF EXISTS "Authors are viewable by everyone" ON public.masterclass_authors;
DROP POLICY IF EXISTS "Authenticated users can insert authors" ON public.masterclass_authors;
DROP POLICY IF EXISTS "Authenticated users can update authors" ON public.masterclass_authors;
DROP POLICY IF EXISTS "Authenticated users can delete authors" ON public.masterclass_authors;
ALTER TABLE public.masterclass_authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY masterclass_authors_read ON public.masterclass_authors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY masterclass_authors_insert ON public.masterclass_authors FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY masterclass_authors_update ON public.masterclass_authors FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY masterclass_authors_delete ON public.masterclass_authors FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.masterclass_categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.masterclass_categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.masterclass_categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.masterclass_categories;
ALTER TABLE public.masterclass_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY masterclass_categories_read ON public.masterclass_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY masterclass_categories_insert ON public.masterclass_categories FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY masterclass_categories_update ON public.masterclass_categories FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY masterclass_categories_delete ON public.masterclass_categories FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Published articles are viewable by everyone" ON public.masterclass_articles;
DROP POLICY IF EXISTS "Authenticated users can insert articles" ON public.masterclass_articles;
DROP POLICY IF EXISTS "Authenticated users can update articles" ON public.masterclass_articles;
DROP POLICY IF EXISTS "Authenticated users can delete articles" ON public.masterclass_articles;
ALTER TABLE public.masterclass_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY masterclass_articles_read ON public.masterclass_articles FOR SELECT TO anon, authenticated USING (status = 'published' OR (SELECT public.is_admin()));
CREATE POLICY masterclass_articles_insert ON public.masterclass_articles FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY masterclass_articles_update ON public.masterclass_articles FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY masterclass_articles_delete ON public.masterclass_articles FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Newsletter emails are viewable by authenticated users" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can subscribe to the newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Authenticated users can update newsletter subscriptions" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Authenticated users can delete newsletter subscriptions" ON public.newsletter_subscribers;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY newsletter_subscribers_read ON public.newsletter_subscribers FOR SELECT TO anon, authenticated USING ((SELECT public.is_admin()));
CREATE POLICY newsletter_subscribers_insert ON public.newsletter_subscribers FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY newsletter_subscribers_update ON public.newsletter_subscribers FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY newsletter_subscribers_delete ON public.newsletter_subscribers FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Site settings are viewable by everyone" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated users can update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated users can insert site settings" ON public.site_settings;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_settings_read ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY site_settings_insert ON public.site_settings FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY site_settings_update ON public.site_settings FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY site_settings_delete ON public.site_settings FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Users can insert their own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can delete their own listings" ON public.listings;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_read ON public.listings FOR SELECT TO anon, authenticated
USING (status = 'published' OR creator_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
CREATE POLICY listing_insert ON public.listings FOR INSERT TO authenticated
WITH CHECK (creator_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
CREATE POLICY listing_update ON public.listings FOR UPDATE TO authenticated
USING (creator_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
WITH CHECK (creator_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
CREATE POLICY listing_delete ON public.listings FOR DELETE TO authenticated
USING (creator_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload listing media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload masterclass media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their own media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their own media" ON storage.objects;
CREATE POLICY media_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    (bucket_id IN ('avatars', 'listing-media', 'masterclass-media') AND (SELECT public.is_admin()))
    OR (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'profiles' AND (storage.foldername(name))[2] = (SELECT auth.uid())::text)
    OR (bucket_id = 'listing-media' AND (storage.foldername(name))[1] = 'listings' AND (storage.foldername(name))[2] = (SELECT auth.uid())::text)
);
CREATE POLICY media_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('avatars', 'listing-media', 'masterclass-media') AND (owner_id = (SELECT auth.uid())::text OR (SELECT public.is_admin())))
WITH CHECK (bucket_id IN ('avatars', 'listing-media', 'masterclass-media') AND (owner_id = (SELECT auth.uid())::text OR (SELECT public.is_admin())));
CREATE POLICY media_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('avatars', 'listing-media', 'masterclass-media') AND (owner_id = (SELECT auth.uid())::text OR (SELECT public.is_admin())));

-- Keep the auth.users FK and declare the public relation used by embedded queries.
-- NOT VALID preserves legacy rows without profiles; new writes are checked.
ALTER TABLE public.listings ADD CONSTRAINT listings_creator_profile_fkey
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) NOT VALID;
CREATE UNIQUE INDEX listings_unique_slug ON public.listings (slug) WHERE slug IS NOT NULL AND slug <> '';

-- No subscriber record is returned or exposed by the anonymous subscription API.
-- Duplicate requests do not reactivate a previously paused/unsubscribed address.
CREATE OR REPLACE FUNCTION public.subscribe_to_newsletter(subscriber_email text, subscriber_name text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE normalized_email text := lower(trim(subscriber_email));
BEGIN
    IF normalized_email IS NULL OR length(normalized_email) > 254 OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
        RAISE EXCEPTION 'Invalid email address';
    END IF;
    IF length(COALESCE(subscriber_name, '')) > 200 THEN RAISE EXCEPTION 'Name is too long'; END IF;
    INSERT INTO public.newsletter_subscribers(email, name) VALUES (normalized_email, nullif(trim(subscriber_name), ''))
    ON CONFLICT (email) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.subscribe_to_newsletter(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_to_newsletter(text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.creator_listing_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
    SELECT jsonb_build_object('total', count(*), 'published', count(*) FILTER (WHERE status = 'published'),
        'draft', count(*) FILTER (WHERE status = 'draft'), 'views', COALESCE(sum(views), 0))
    FROM public.listings WHERE creator_id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION public.creator_listing_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.creator_listing_stats() TO authenticated;

CREATE TABLE public.contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
    email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
    subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
    message text NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 10000),
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.contacts TO anon, authenticated;
GRANT SELECT ON public.contacts TO authenticated;
CREATE POLICY contact_insert ON public.contacts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY contact_read ON public.contacts FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

-- Claim IDs atomically before sending; a repeated request cannot resend a campaign.
CREATE TABLE public.newsletter_campaigns (
    id uuid PRIMARY KEY,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    subject text NOT NULL,
    status text NOT NULL DEFAULT 'sending',
    sent integer NOT NULL DEFAULT 0,
    total integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.newsletter_campaigns TO service_role;
GRANT SELECT ON public.newsletter_campaigns TO authenticated;
CREATE POLICY campaign_read ON public.newsletter_campaigns FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

COMMIT;
