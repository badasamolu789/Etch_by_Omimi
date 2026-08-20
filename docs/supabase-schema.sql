-- ============================================
-- ETCH by OMIMI - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. PROFILES TABLE (extends auth.users)
-- This stores creator profile information
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    role TEXT DEFAULT 'creator' CHECK (role IN ('creator', 'admin')),
    creator_type TEXT CHECK (creator_type IN ('screenwriter', 'storyboard_artist', 'musician', 'designer', 'motion_artist', 'copywriter', 'multi_creative')),
    storefront_ready BOOLEAN DEFAULT false,
    studio_health_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, username)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read any profile (for marketplace browsing)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 4. PASSWORD RESET TOKENS TABLE (for tracking)
CREATE TABLE IF NOT EXISTS public.password_resets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- 5. SESSIONS LOG (for analytics)
CREATE TABLE IF NOT EXISTS public.auth_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sign_in_provider TEXT DEFAULT 'email',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

-- 6. HELPER FUNCTION: UPDATE TIMESTAMP
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_creator_type ON public.profiles(creator_type);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON public.password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON public.password_resets(token);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON public.auth_sessions(user_id);

-- ============================================
-- MASTERCLASS TABLES
-- ============================================

-- 8. MASTERCLASS AUTHORS TABLE
CREATE TABLE IF NOT EXISTS public.masterclass_authors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    role TEXT,
    bio TEXT,
    avatar_url TEXT,
    website TEXT,
    twitter TEXT,
    instagram TEXT,
    linkedin TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.masterclass_authors ENABLE ROW LEVEL SECURITY;

-- Anyone can read active authors
DROP POLICY IF EXISTS "Authors are viewable by everyone" ON public.masterclass_authors;
CREATE POLICY "Authors are viewable by everyone"
    ON public.masterclass_authors FOR SELECT
    USING (true);

-- Only authenticated users can insert/update/delete authors
DROP POLICY IF EXISTS "Authenticated users can insert authors" ON public.masterclass_authors;
CREATE POLICY "Authenticated users can insert authors"
    ON public.masterclass_authors FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update authors" ON public.masterclass_authors;
CREATE POLICY "Authenticated users can update authors"
    ON public.masterclass_authors FOR UPDATE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete authors" ON public.masterclass_authors;
CREATE POLICY "Authenticated users can delete authors"
    ON public.masterclass_authors FOR DELETE
    USING (auth.role() = 'authenticated');

-- 9. MASTERCLASS CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.masterclass_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.masterclass_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read active categories
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.masterclass_categories;
CREATE POLICY "Categories are viewable by everyone"
    ON public.masterclass_categories FOR SELECT
    USING (true);

-- Only authenticated users can insert/update/delete categories
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.masterclass_categories;
CREATE POLICY "Authenticated users can insert categories"
    ON public.masterclass_categories FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.masterclass_categories;
CREATE POLICY "Authenticated users can update categories"
    ON public.masterclass_categories FOR UPDATE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.masterclass_categories;
CREATE POLICY "Authenticated users can delete categories"
    ON public.masterclass_categories FOR DELETE
    USING (auth.role() = 'authenticated');

-- 10. MASTERCLASS ARTICLES TABLE
CREATE TABLE IF NOT EXISTS public.masterclass_articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,
    category_id UUID REFERENCES public.masterclass_categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES public.masterclass_authors(id) ON DELETE SET NULL,
    reading_time INTEGER DEFAULT 5,
    is_featured BOOLEAN DEFAULT false,
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT,
    canonical_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.masterclass_articles ENABLE ROW LEVEL SECURITY;

-- Anyone can read published articles
DROP POLICY IF EXISTS "Published articles are viewable by everyone" ON public.masterclass_articles;
CREATE POLICY "Published articles are viewable by everyone"
    ON public.masterclass_articles FOR SELECT
    USING (status = 'published' OR auth.role() = 'authenticated');

-- Only authenticated users can insert/update/delete articles
DROP POLICY IF EXISTS "Authenticated users can insert articles" ON public.masterclass_articles;
CREATE POLICY "Authenticated users can insert articles"
    ON public.masterclass_articles FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update articles" ON public.masterclass_articles;
CREATE POLICY "Authenticated users can update articles"
    ON public.masterclass_articles FOR UPDATE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete articles" ON public.masterclass_articles;
CREATE POLICY "Authenticated users can delete articles"
    ON public.masterclass_articles FOR DELETE
    USING (auth.role() = 'authenticated');

-- 11. MASTERCLASS INDEXES
CREATE INDEX IF NOT EXISTS idx_masterclass_articles_slug ON public.masterclass_articles(slug);
CREATE INDEX IF NOT EXISTS idx_masterclass_articles_status ON public.masterclass_articles(status);
CREATE INDEX IF NOT EXISTS idx_masterclass_articles_category ON public.masterclass_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_masterclass_articles_author ON public.masterclass_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_masterclass_articles_featured ON public.masterclass_articles(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_masterclass_articles_published ON public.masterclass_articles(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_masterclass_categories_slug ON public.masterclass_categories(slug);
CREATE INDEX IF NOT EXISTS idx_masterclass_authors_slug ON public.masterclass_authors(slug);

-- 12. MASTERCLASS TRIGGERS
DROP TRIGGER IF EXISTS update_masterclass_articles_updated_at ON public.masterclass_articles;
CREATE TRIGGER update_masterclass_articles_updated_at
    BEFORE UPDATE ON public.masterclass_articles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_masterclass_categories_updated_at ON public.masterclass_categories;
CREATE TRIGGER update_masterclass_categories_updated_at
    BEFORE UPDATE ON public.masterclass_categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_masterclass_authors_updated_at ON public.masterclass_authors;
CREATE TRIGGER update_masterclass_authors_updated_at
    BEFORE UPDATE ON public.masterclass_authors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- CREATOR LISTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT,
    category TEXT,
    price NUMERIC DEFAULT 0,
    description TEXT,
    cover_url TEXT,
    preview_url TEXT,
    rights_summary TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    is_featured BOOLEAN DEFAULT false,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;
CREATE POLICY "Listings are viewable by everyone"
    ON public.listings FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own listings" ON public.listings;
CREATE POLICY "Users can insert their own listings"
    ON public.listings FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can update their own listings" ON public.listings;
CREATE POLICY "Users can update their own listings"
    ON public.listings FOR UPDATE
    USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can delete their own listings" ON public.listings;
CREATE POLICY "Users can delete their own listings"
    ON public.listings FOR DELETE
    USING (auth.uid() = creator_id);

DROP TRIGGER IF EXISTS update_listings_updated_at ON public.listings;
CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON public.listings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_listings_creator_id ON public.listings(creator_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);

-- 13. NEWSLETTER SUBSCRIBERS TABLE
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    is_active BOOLEAN DEFAULT true,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Newsletter emails are viewable by authenticated users" ON public.newsletter_subscribers;
CREATE POLICY "Newsletter emails are viewable by authenticated users"
    ON public.newsletter_subscribers FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can subscribe to the newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to the newsletter"
    ON public.newsletter_subscribers FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update newsletter subscriptions" ON public.newsletter_subscribers;
CREATE POLICY "Authenticated users can update newsletter subscriptions"
    ON public.newsletter_subscribers FOR UPDATE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete newsletter subscriptions" ON public.newsletter_subscribers;
CREATE POLICY "Authenticated users can delete newsletter subscriptions"
    ON public.newsletter_subscribers FOR DELETE
    USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active ON public.newsletter_subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);

DROP TRIGGER IF EXISTS update_newsletter_subscribers_updated_at ON public.newsletter_subscribers;
CREATE TRIGGER update_newsletter_subscribers_updated_at
    BEFORE UPDATE ON public.newsletter_subscribers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SITE SETTINGS TABLE (Contact Info & Social Links)
-- ============================================
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_email TEXT,
    contact_phone TEXT,
    contact_location TEXT,
    contact_hours TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings (public contact info)
DROP POLICY IF EXISTS "Site settings are viewable by everyone" ON public.site_settings;
CREATE POLICY "Site settings are viewable by everyone"
    ON public.site_settings FOR SELECT
    USING (true);

-- Only authenticated users can update site settings
DROP POLICY IF EXISTS "Authenticated users can update site settings" ON public.site_settings;
CREATE POLICY "Authenticated users can update site settings"
    ON public.site_settings FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Only authenticated users can insert site settings
DROP POLICY IF EXISTS "Authenticated users can insert site settings" ON public.site_settings;
CREATE POLICY "Authenticated users can insert site settings"
    ON public.site_settings FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default site settings row
INSERT INTO public.site_settings (id, contact_email, contact_phone, contact_location, contact_hours, social_links)
VALUES (
    gen_random_uuid(),
    'hello@etch.omimi.com',
    '+1 (234) 567-890',
    'Lagos, Nigeria',
    'Mon-Fri, 9 AM - 6 PM WAT',
    '{"twitter": "", "facebook": "", "instagram": "", "linkedin": ""}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE BUCKETS FOR AVATARS, LISTING MEDIA, AND MASTERCLASS MEDIA
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-media', 'listing-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('masterclass-media', 'masterclass-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar files are publicly viewable" ON storage.objects;
CREATE POLICY "Avatar files are publicly viewable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Listing media files are publicly viewable" ON storage.objects;
CREATE POLICY "Listing media files are publicly viewable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'listing-media');

DROP POLICY IF EXISTS "Masterclass media files are publicly viewable" ON storage.objects;
CREATE POLICY "Masterclass media files are publicly viewable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'masterclass-media');

DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Authenticated users can upload listing media" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'listing-media'
        AND auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Authenticated users can upload masterclass media" ON storage.objects;
CREATE POLICY "Authenticated users can upload masterclass media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'masterclass-media'
        AND auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Authenticated users can update their own media" ON storage.objects;
CREATE POLICY "Authenticated users can update their own media"
    ON storage.objects FOR UPDATE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete their own media" ON storage.objects;
CREATE POLICY "Authenticated users can delete their own media"
    ON storage.objects FOR DELETE
    USING (auth.role() = 'authenticated');