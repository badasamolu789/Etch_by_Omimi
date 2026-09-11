# Newsletter setup

The canonical implementation is `supabase/functions/send-newsletter/index.ts` with `handler.mjs`. Delivery uses Resend from the server. The browser sends a signed-in user's JWT, subject, message, and campaign ID; it never chooses recipients or receives a provider secret.

Follow the ordered database/function deployment steps in [CONSISTENCY_FIXES.md](CONSISTENCY_FIXES.md). Set `RESEND_API_KEY` and optionally `NEWSLETTER_FROM` as Edge Function secrets, and retain `verify_jwt = true`.

Subscriptions call the `subscribe_to_newsletter` database RPC. Sending requires an admin profile. Delivery progress is recorded in `newsletter_campaigns`; inspect campaign/provider logs before resending failed or uncertain campaigns.

This repository's presence does not verify that the function or migrations are deployed. No email campaign is sent by the test suite.
