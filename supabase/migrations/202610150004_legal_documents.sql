BEGIN;
CREATE TABLE public.legal_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),document_key text NOT NULL CHECK(document_key IN('terms','privacy')),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 3 AND 200),
 body text NOT NULL CHECK(length(trim(body)) BETWEEN 20 AND 100000),
 status text NOT NULL CHECK(status IN('draft','published','archived')),
 created_by uuid NOT NULL REFERENCES public.profiles(id),created_at timestamptz NOT NULL DEFAULT now(),published_at timestamptz
);
CREATE UNIQUE INDEX current_published_legal_document ON public.legal_documents(document_key) WHERE status='published';
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legal_documents FROM anon,authenticated;
GRANT SELECT ON public.legal_documents TO anon,authenticated;
CREATE POLICY legal_document_reads ON public.legal_documents FOR SELECT TO anon,authenticated USING(status='published' OR public.is_admin());
CREATE TRIGGER audit_legal_documents AFTER INSERT OR UPDATE OR DELETE ON public.legal_documents FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TABLE public.legal_acceptances (
 user_id uuid NOT NULL REFERENCES public.profiles(id),document_id uuid NOT NULL REFERENCES public.legal_documents(id),
 accepted_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,document_id)
);
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legal_acceptances FROM anon,authenticated;
GRANT SELECT ON public.legal_acceptances TO authenticated;
CREATE POLICY own_legal_acceptance ON public.legal_acceptances FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());
CREATE FUNCTION public.save_legal_document(doc_key text,doc_title text,doc_body text,publish_document boolean,expected_latest uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE newest uuid;version_id uuid;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin permission required'; END IF;
 IF doc_key NOT IN('terms','privacy') THEN RAISE EXCEPTION 'Unknown document'; END IF;
 -- Serialize per document to avoid publishing stale edits.
 PERFORM pg_advisory_xact_lock(hashtext('etch_legal_'||doc_key));
 SELECT id INTO newest FROM public.legal_documents WHERE document_key=doc_key ORDER BY created_at DESC,id DESC LIMIT 1;
 IF newest IS DISTINCT FROM expected_latest THEN RAISE EXCEPTION 'Document changed elsewhere. Reload before saving'; END IF;
 IF publish_document THEN UPDATE public.legal_documents SET status='archived' WHERE document_key=doc_key AND status='published'; END IF;
 INSERT INTO public.legal_documents(document_key,title,body,status,created_by,published_at)
 VALUES(doc_key,trim(doc_title),trim(doc_body),CASE WHEN publish_document THEN 'published' ELSE 'draft' END,auth.uid(),CASE WHEN publish_document THEN now() END)
 RETURNING id INTO version_id;
 RETURN version_id;
END; $$;
CREATE FUNCTION public.accept_legal_documents(document_ids uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to record consent'; END IF;
 IF cardinality(document_ids)<>2 OR (SELECT count(DISTINCT document_key) FROM public.legal_documents WHERE id=ANY(document_ids) AND status='published')<>2 THEN RAISE EXCEPTION 'Legal documents changed. Review the current versions before continuing'; END IF;
 INSERT INTO public.legal_acceptances(user_id,document_id) SELECT auth.uid(),unnest(document_ids) ON CONFLICT DO NOTHING;
END; $$;
REVOKE ALL ON FUNCTION public.save_legal_document(text,text,text,boolean,uuid),public.accept_legal_documents(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_legal_document(text,text,text,boolean,uuid),public.accept_legal_documents(uuid[]) TO authenticated;
COMMIT;
