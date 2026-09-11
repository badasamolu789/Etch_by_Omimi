BEGIN;

CREATE TABLE IF NOT EXISTS public.homepage_partners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
    label text,
    url text,
    logo_url text,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_partners ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.homepage_partners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.homepage_partners TO authenticated;

DROP POLICY IF EXISTS homepage_partners_read ON public.homepage_partners;
DROP POLICY IF EXISTS homepage_partners_insert ON public.homepage_partners;
DROP POLICY IF EXISTS homepage_partners_update ON public.homepage_partners;
DROP POLICY IF EXISTS homepage_partners_delete ON public.homepage_partners;

CREATE POLICY homepage_partners_read ON public.homepage_partners
FOR SELECT TO anon, authenticated USING (status = 'published' OR (SELECT public.is_admin()));
CREATE POLICY homepage_partners_insert ON public.homepage_partners
FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY homepage_partners_update ON public.homepage_partners
FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY homepage_partners_delete ON public.homepage_partners
FOR DELETE TO authenticated USING ((SELECT public.is_admin()));

CREATE INDEX IF NOT EXISTS homepage_partners_public_order
ON public.homepage_partners (status, display_order, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_homepage_partners_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_homepage_partners_updated_at ON public.homepage_partners;
CREATE TRIGGER touch_homepage_partners_updated_at
BEFORE UPDATE ON public.homepage_partners
FOR EACH ROW EXECUTE FUNCTION public.touch_homepage_partners_updated_at();

COMMIT;
