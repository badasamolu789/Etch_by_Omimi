BEGIN;

CREATE TABLE IF NOT EXISTS public.marketplace_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
    slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    description text,
    icon text,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (slug)
);

ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.marketplace_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.marketplace_categories TO authenticated;

DROP POLICY IF EXISTS marketplace_categories_read ON public.marketplace_categories;
DROP POLICY IF EXISTS marketplace_categories_insert ON public.marketplace_categories;
DROP POLICY IF EXISTS marketplace_categories_update ON public.marketplace_categories;
DROP POLICY IF EXISTS marketplace_categories_delete ON public.marketplace_categories;

CREATE POLICY marketplace_categories_read ON public.marketplace_categories
FOR SELECT TO anon, authenticated USING (status = 'published' OR (SELECT public.is_admin()));
CREATE POLICY marketplace_categories_insert ON public.marketplace_categories
FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY marketplace_categories_update ON public.marketplace_categories
FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY marketplace_categories_delete ON public.marketplace_categories
FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

CREATE INDEX IF NOT EXISTS marketplace_categories_public_order
ON public.marketplace_categories (status, display_order, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_marketplace_categories_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_marketplace_categories_updated_at ON public.marketplace_categories;
CREATE TRIGGER touch_marketplace_categories_updated_at
BEFORE UPDATE ON public.marketplace_categories
FOR EACH ROW EXECUTE FUNCTION public.touch_marketplace_categories_updated_at();

INSERT INTO public.marketplace_categories (name, slug, description, icon, status, display_order)
VALUES ('Scripts', 'script', 'Screenplays, pilots, short films, and movie-ready script material.', 'book-open', 'published', 10)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    status = 'published',
    display_order = EXCLUDED.display_order;

COMMIT;
