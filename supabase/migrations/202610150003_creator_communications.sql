BEGIN;
CREATE TABLE public.creator_conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
 buyer_id uuid NOT NULL REFERENCES public.profiles(id),creator_id uuid NOT NULL REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(buyer_id<>creator_id),UNIQUE(listing_id,buyer_id)
);
CREATE TABLE public.creator_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id uuid NOT NULL REFERENCES public.creator_conversations(id),
 sender_id uuid NOT NULL REFERENCES public.profiles(id),body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 5000),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX creator_messages_conversation_time ON public.creator_messages(conversation_id,created_at,id);
ALTER TABLE public.creator_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creator_conversations,public.creator_messages FROM anon,authenticated;
GRANT SELECT ON public.creator_conversations,public.creator_messages TO authenticated;
GRANT INSERT(id,conversation_id,sender_id,body) ON public.creator_messages TO authenticated;
CREATE POLICY own_conversations ON public.creator_conversations FOR SELECT TO authenticated USING(auth.uid() IN (buyer_id,creator_id));
CREATE POLICY own_messages ON public.creator_messages FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.creator_conversations c WHERE c.id=conversation_id AND auth.uid() IN(c.buyer_id,c.creator_id)));
CREATE POLICY send_own_messages ON public.creator_messages FOR INSERT TO authenticated WITH CHECK(sender_id=auth.uid() AND EXISTS(SELECT 1 FROM public.creator_conversations c WHERE c.id=conversation_id AND auth.uid() IN(c.buyer_id,c.creator_id)));
CREATE FUNCTION public.touch_creator_conversation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN UPDATE public.creator_conversations SET updated_at=now() WHERE id=NEW.conversation_id;RETURN NEW;END; $$;
CREATE TRIGGER touch_creator_conversation AFTER INSERT ON public.creator_messages FOR EACH ROW EXECUTE FUNCTION public.touch_creator_conversation();
CREATE FUNCTION public.start_creator_conversation(target_listing uuid,opening_message text,message_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.listings; conversation uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to send a message'; END IF;
 IF message_id IS NULL OR length(trim(COALESCE(opening_message,''))) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Write a message of 1–5000 characters'; END IF;
 SELECT * INTO item FROM public.listings WHERE id=target_listing AND status='published';
 IF NOT FOUND OR item.creator_id=auth.uid() THEN RAISE EXCEPTION 'Select another creator’s published listing'; END IF;
 INSERT INTO public.creator_conversations(listing_id,buyer_id,creator_id) VALUES(item.id,auth.uid(),item.creator_id)
 ON CONFLICT(listing_id,buyer_id) DO UPDATE SET listing_id=EXCLUDED.listing_id RETURNING id INTO conversation;
 IF EXISTS(SELECT 1 FROM public.creator_messages WHERE id=message_id AND (conversation_id<>conversation OR sender_id<>auth.uid() OR body<>trim(opening_message))) THEN RAISE EXCEPTION 'Message identifier already used'; END IF;
 INSERT INTO public.creator_messages(id,conversation_id,sender_id,body) VALUES(message_id,conversation,auth.uid(),trim(opening_message)) ON CONFLICT(id) DO NOTHING;
 RETURN conversation;
END; $$;
REVOKE ALL ON FUNCTION public.start_creator_conversation(uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_creator_conversation(uuid,text,uuid) TO authenticated;

CREATE TABLE public.licensing_enquiries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
 requester_id uuid NOT NULL REFERENCES public.profiles(id),creator_id uuid NOT NULL REFERENCES public.profiles(id),
 proposed_use text NOT NULL CHECK(length(trim(proposed_use)) BETWEEN 10 AND 5000),
 status text NOT NULL DEFAULT 'requested' CHECK(status IN('requested','reviewing','closed','declined','withdrawn')),
 response text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),CHECK(requester_id<>creator_id)
);
CREATE UNIQUE INDEX licensing_open_enquiry ON public.licensing_enquiries(listing_id,requester_id) WHERE status IN('requested','reviewing');
ALTER TABLE public.licensing_enquiries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.licensing_enquiries FROM anon,authenticated;
GRANT SELECT ON public.licensing_enquiries TO authenticated;
CREATE POLICY own_licensing_enquiries ON public.licensing_enquiries FOR SELECT TO authenticated USING(auth.uid() IN(requester_id,creator_id));
CREATE FUNCTION public.request_listing_license(target_listing uuid,intended_use text,request_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.listings; existing public.licensing_enquiries;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to request licensing'; END IF;
 IF request_id IS NULL OR length(trim(COALESCE(intended_use,''))) NOT BETWEEN 10 AND 5000 THEN RAISE EXCEPTION 'Describe the intended use in 10–5000 characters'; END IF;
 SELECT * INTO existing FROM public.licensing_enquiries WHERE id=request_id;
 IF FOUND THEN
  IF existing.requester_id=auth.uid() AND existing.listing_id=target_listing AND existing.proposed_use=trim(intended_use) THEN RETURN existing.id; END IF;
  RAISE EXCEPTION 'Request identifier already used';
 END IF;
 SELECT * INTO item FROM public.listings WHERE id=target_listing AND status='published';
 IF NOT FOUND OR item.creator_id=auth.uid() THEN RAISE EXCEPTION 'Select another creator’s published listing'; END IF;
 INSERT INTO public.licensing_enquiries(id,listing_id,requester_id,creator_id,proposed_use) VALUES(request_id,item.id,auth.uid(),item.creator_id,trim(intended_use));
 RETURN request_id;
END; $$;
CREATE FUNCTION public.update_licensing_enquiry(enquiry_id uuid,new_status text,explanation text,expected_updated_at timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE enquiry public.licensing_enquiries;
BEGIN
 SELECT * INTO enquiry FROM public.licensing_enquiries WHERE id=enquiry_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR auth.uid() NOT IN(enquiry.requester_id,enquiry.creator_id) THEN RAISE EXCEPTION 'Enquiry unavailable'; END IF;
 IF enquiry.updated_at IS DISTINCT FROM expected_updated_at THEN RAISE EXCEPTION 'Enquiry changed elsewhere. Refresh and retry'; END IF;
 IF enquiry.status NOT IN('requested','reviewing') THEN RAISE EXCEPTION 'This enquiry is already closed'; END IF;
 IF length(trim(COALESCE(explanation,''))) NOT BETWEEN 3 AND 5000 THEN RAISE EXCEPTION 'Add a response of 3–5000 characters'; END IF;
 IF auth.uid()=enquiry.requester_id THEN
  IF new_status<>'withdrawn' THEN RAISE EXCEPTION 'Only the creator can review this enquiry'; END IF;
 ELSIF new_status NOT IN('reviewing','closed','declined') THEN RAISE EXCEPTION 'Invalid creator decision'; END IF;
 UPDATE public.licensing_enquiries SET status=new_status,response=trim(explanation),updated_at=clock_timestamp() WHERE id=enquiry_id;
END; $$;
REVOKE ALL ON FUNCTION public.request_listing_license(uuid,text,uuid),public.update_licensing_enquiry(uuid,text,text,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_listing_license(uuid,text,uuid),public.update_licensing_enquiry(uuid,text,text,timestamptz) TO authenticated;
COMMIT;
