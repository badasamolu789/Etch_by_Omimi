# ETCH email templates

These are local, ready-to-paste designs. Creating these files does not change your live Supabase templates or deploy the acceptance function.

## Install in Supabase

1. Open your project's **Authentication → Email Templates** (some dashboard versions group these under **Notifications**).
2. Open `subjects.json` for the exact subject and dashboard label for each template.
3. Copy the complete contents of the matching `auth/*.html` file into that template's HTML/source editor. Paste its subject separately, then save.
4. Start with **Confirm sign up** and **Reset password**, the active flows in this project. Install the remaining templates for coverage, but they do not add magic-link, phone, MFA, or invitation features to the app.
5. Security notification templates require their corresponding project notification switch to be enabled. Enable relevant alerts such as password/email changes; configure other alerts when those authentication features are in use.

**Do not paste files from `previews/` into Supabase.** Those files contain example values. The `auth/` files preserve Supabase's `{{ .ConfirmationURL }}` and other template variables.

Confirm signup includes both a code for the existing signup verification screen and a confirmation button. Reauthentication uses a code only. Magic link uses a button because the app has no dedicated magic-link OTP entry screen. Email change wording supports confirmation at both old and new addresses. No template claims a fixed expiry; expiry is controlled in Supabase.

The Auth Invite user template is an account invitation, not a Founding Voices application invitation. Its appearance does not implement invite onboarding. Verify the invited-user password/setup path before using this flow.

Keep Site URL `https://etchbyomimi.com` and the approved callback/reset URLs configured as described in `docs/CREATOR_WORKSPACE_FIXES.md`. Do not replace `ConfirmationURL` with a hardcoded callback link: Supabase must verify the token first. Disable provider link tracking for authentication emails so access links are not rewritten.

## Preview the designs

Open `emails/preview.html` in your browser to switch between all authentication/security templates and the acceptance email. The preview uses sample values and does not send email. Open an individual preview in a narrow browser window to review mobile sizing.

Design: ETCH olive and forest green, a warm neutral background, a serif headline, readable code panel and prominent button. The layouts use inline styles and presentation tables, no JavaScript in delivered email, no remote fonts, and no required external images. Text branding stays visible when images are blocked. Rendering varies by mail client; check actual Gmail, Outlook, and mobile delivery before launch.

## Other project email

- **Founding Voices acceptance:** the existing `send-acceptance` Edge Function now includes the matching HTML design alongside its plain-text alternative. Existing recipients, permission checks, and duplicate-send protections stay in place. Deploy `supabase functions deploy send-acceptance` to apply it; existing `RESEND_API_KEY` and verified `ACCEPTANCE_FROM` are still required. Acceptance is sent only through the existing authorized admin action.
- **Newsletter:** `newsletter-starter.html` is a matching editable starting point. Replace the example copy before using it in the admin newsletter HTML editor. Add a working unsubscribe mechanism before sending marketing: the current send function does not automatically append an unsubscribe link. Do not use an authentication template for marketing. This file does not change saved campaigns.
- Messaging/licensing currently use in-app workflows. These templates do not enable new email triggers. Payment emails remain deferred with payments.

The footer links to the real contact, privacy and terms routes. Publish the approved legal documents through the admin before launch. No unconfirmed support email address or delivery-time promise is included.

## Verification and maintenance

Test signup code and confirmation link with separate fresh requests, password reset, and any enabled email-change flow using controlled accounts. Verify the final destination, code expiry behaviour, and rendering. Test security alerts by making the corresponding change on a controlled account. A preview is not evidence of delivery.

Source: `supabase/functions/_shared/email-layout.mjs` and `tools/build-email-templates.mjs`. Regenerate with `node tools/build-email-templates.mjs`; edits to generated HTML will be overwritten. Subjects are in `emails/subjects.json`.

Supabase variables and template types: https://supabase.com/docs/guides/auth/auth-email-templates
