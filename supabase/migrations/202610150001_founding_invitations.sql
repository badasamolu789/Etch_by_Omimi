BEGIN;
CREATE TABLE public.founding_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL UNIQUE CHECK(email=lower(trim(email)) AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 token_hash text NOT NULL,
 expires_at timestamptz NOT NULL,
 revoked boolean NOT NULL DEFAULT false,
 claimed_by uuid REFERENCES public.profiles(id),
 created_by uuid NOT NULL REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.founding_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.founding_invitations FROM anon,authenticated;
GRANT SELECT ON public.founding_invitations TO authenticated;
CREATE POLICY founding_invitation_staff_read ON public.founding_invitations FOR SELECT TO authenticated
 USING(public.has_permission('applications'));
CREATE TRIGGER audit_founding_invitations AFTER INSERT OR UPDATE OR DELETE ON public.founding_invitations
 FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();

CREATE FUNCTION public.create_founding_invitation(invited_email text,valid_days integer DEFAULT 14) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE token text; invitation public.founding_invitations; normalized text:=lower(trim(invited_email));
BEGIN
 IF NOT public.has_permission('applications') THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501'; END IF;
 IF normalized IS NULL OR length(normalized)>254 OR normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR valid_days IS NULL OR valid_days NOT BETWEEN 1 AND 90 THEN RAISE EXCEPTION 'Valid email and expiry of 1–90 days required'; END IF;
 token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 INSERT INTO public.founding_invitations(email,token_hash,expires_at,created_by)
 VALUES(normalized,encode(sha256(convert_to(token,'UTF8')),'hex'),now()+make_interval(days=>valid_days),auth.uid())
 ON CONFLICT(email) DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at,revoked=false,claimed_by=NULL,created_by=auth.uid(),created_at=now()
 RETURNING * INTO invitation;
 RETURN jsonb_build_object('id',invitation.id,'email',invitation.email,'expires_at',invitation.expires_at,'token',token);
END; $$;

CREATE FUNCTION public.revoke_founding_invitation(invitation_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.has_permission('applications') THEN RAISE EXCEPTION 'Permission denied' USING ERRCODE='42501'; END IF;
 UPDATE public.founding_invitations SET revoked=true WHERE id=invitation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found'; END IF;
END; $$;

CREATE FUNCTION public.redeem_founding_invitation(invitation_token text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE invited public.founding_invitations; account_email text;
BEGIN
 IF auth.uid() IS NULL OR invitation_token IS NULL OR length(invitation_token)<>64 THEN RETURN false; END IF;
 SELECT lower(trim(email)) INTO account_email FROM auth.users WHERE id=auth.uid();
 SELECT * INTO invited FROM public.founding_invitations WHERE token_hash=encode(sha256(convert_to(invitation_token,'UTF8')),'hex') FOR UPDATE;
 IF NOT FOUND OR invited.revoked OR invited.expires_at<=now() OR invited.email IS DISTINCT FROM account_email OR (invited.claimed_by IS NOT NULL AND invited.claimed_by<>auth.uid()) THEN RETURN false; END IF;
 UPDATE public.founding_invitations SET claimed_by=auth.uid() WHERE id=invited.id;
 RETURN true;
END; $$;

CREATE FUNCTION public.can_submit_founding_application(application_email text DEFAULT NULL) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.founding_invitations i JOIN auth.users u ON u.id=auth.uid()
 WHERE i.claimed_by=auth.uid() AND i.email=lower(trim(u.email)) AND NOT i.revoked AND i.expires_at>now()
 AND (application_email IS NULL OR lower(trim(application_email))=lower(trim(u.email))));
$$;
REVOKE ALL ON FUNCTION public.create_founding_invitation(text,integer),public.revoke_founding_invitation(uuid),public.redeem_founding_invitation(text),public.can_submit_founding_application(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_founding_invitation(text,integer),public.revoke_founding_invitation(uuid),public.redeem_founding_invitation(text),public.can_submit_founding_application(text) TO authenticated;
DROP POLICY founding_submit ON public.founding_applications;
CREATE POLICY founding_submit ON public.founding_applications FOR INSERT TO authenticated WITH CHECK(
 user_id=auth.uid() AND public.can_submit_founding_application(email) AND status='submitted' AND score IS NULL
 AND decision_reason IS NULL AND decided_by IS NULL AND decided_at IS NULL
);
COMMIT;
