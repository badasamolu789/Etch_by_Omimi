# Creator/user journey repair — 15 October 2026

This is a local implementation. No live database migrations, legal publication, production account creation, real messages, or payments were performed. Existing admin fixes and the Founding Voices invitation work are preserved.

## What changed, in journey order

1. **Signup:** writer/producer selection; eight-character minimum with required lowercase, uppercase, number and symbol; live accessible checklist and matching confirmation validation on signup/reset; confirmation-enabled and immediate-session handling; agreement to actual published Terms and Privacy versions when both are available; retained invitation return paths. Pending consent is bound to the signup email, and malformed stored state cannot interrupt sign-in. Removed duplicate page-owned auth code in favor of one shared handler. The signup trigger creates a unique username from the account UUID, ignores privileged role metadata, and accepts only writer/producer account types.
2. **Email verification:** replaced the incorrect signup-with-temporary-password resend with Supabase `auth.resend({type:'signup'})`; added a resend cooldown, clear failures, manual six-digit entry/paste, and duplicate-submit protection. Added `/user/auth/callback` for email confirmation links. Confirmed sign-in/OTP callbacks return to the intended internal page.
3. **Sign-in/recovery:** same-origin return paths, one pending request per form, password visibility controls, and meaningful status messages. Recovery requires a real SDK session; a forged `#type=recovery` fragment cannot enable password reset. Strength/matching indicators are functional. Reset-request responses do not claim that an address is registered.
4. **Shared creator shell:** profile names/photos/account types, active navigation, working catalog search, settings link, refresh control, mobile overlay and Escape behavior. Signing out in another tab clears private content and redirects to sign-in. Removed fake verification, unread counts, and studio-health indicators. Versioned shared assets and regenerated components.
5. **Dashboard:** real catalog totals, published totals and recorded views; recent owned listings with edit/preview links. Removed fabricated conversations, deals, revenues, growth, progress, and activity panels. Earnings explicitly remain unavailable.
6. **Settings:** profile/name/username/bio, public location/website, writer/producer type, and storefront visibility now load and save. Username/API failures retain entered values. Photos validate type/size, use unique upload keys, persist only after successful profile writes, and clean up owned previous files. Verification requests show the saved state/reason and prevent resubmission while pending/approved. Password reset and theme controls work. Email changes and deletion point to support rather than simulating success. Added an admin-only Support Requests inbox for the existing saved contact submissions; full messages are available via View record.
7. **Listings:** owned catalog with pagination, search/status filters, truthful loading/failure/empty states, retry, edit, submit-for-review, return-to-draft, and deletion. Added edit mode to the upload route, ownership filters, conflict guards, existing-category preservation, upload cleanup, and saved-result messages. Editing published work returns it to review; removal stays staff-controlled. Linked conversations/enquiries prevent destructive deletion; return a listing to draft to unpublish it instead.
8. **Storefront:** settings-controlled public visibility, share/copy links, and published catalog. Added `/creator?id=…` (also supports `username`) for public profiles with safe URL/text rendering and pagination. Draft/review listings are excluded.
9. **Analytics:** per-owner aggregate totals and per-listing recorded view counts. Public listing views are deduplicated per listing/tab session and respect Do Not Track. Tracking uses a separate event table so a view cannot put a published listing back into moderation. A creator's own view is excluded. Unique visitors, trends, conversion rates and revenue are explicitly unavailable; this is not billing-grade telemetry.
10. **Messages:** listing-initiated, private two-participant conversations, inbox/message pagination, refresh, replies, safe text rendering, retry without duplicating the opening message, and failed-send input retention. Messages cannot be read by outsiders or sent as another participant. No automatic email, attachments, read receipts or real-time push notifications are claimed.
11. **Licensing:** persisted non-binding enquiries from another creator's published listing; requester withdrawal and creator review/close/decline with a response; duplicate-open and stale-update protection. These records do not issue contracts, transfer rights, collect payment, or represent completed licenses.
12. **Earnings/payments:** Paystack, purchases, payouts and invoices remain deferred at the user's instruction. Removed fake transaction histories and withdrawal controls.
13. **Legal pages:** `/terms` and `/privacy` render admin-published Markdown and sanitized HTML. `/admin/legal` is restricted to Admin/Super Admin and supports drafts, versioned publication, conflict checks and audit records. The editor provides Write/Preview views and dialog confirmations; saved content uses the same typography on the public pages. No legal wording was invented or automatically published. Signup remains available without an unpublished-document warning. Consent controls appear only when both documents are published; no acceptance is recorded for unpublished documents. Confirmation records acceptance of the presented versions. `/user/legal-review` handles documents changing during confirmation. Public/footer/signup links are real.

## New routes

- Public: `/creator`, `/terms`, `/privacy`.
- Authentication: `/user/auth/callback`.
- Creator: `/user/legal-review`; listing editing uses `/user/upload?id=<listing UUID>`.
- Admin: `/admin/legal` (Terms & Privacy) and `/admin/contacts` (saved Support Requests).

## Database changes

Apply after all existing migrations, including `202610150001_founding_invitations.sql`:

1. `202610150002_creator_workspace.sql`: public profile fields, signup profile creation, safe moderation transitions, server-controlled view totals, listing view events and creator metrics.
2. `202610150003_creator_communications.sql`: conversations/messages and licensing enquiries, participant policies, idempotent creation and guarded status changes.
3. `202610150004_legal_documents.sql`: versioned legal publishing, restricted publication RPC and own-user acceptance receipts.

Existing profile/listing/application data is preserved. Existing historical `listings.views` contributes to totals; new events are added separately. Old inflated or fabricated values are not automatically rewritten. No new payment or financial tables were created.

## Deployment sequence

1. Back up and inspect the live schema/policies; confirm it matches the preceding checked-in migrations. Do not blindly rerun old migrations.
2. Apply the new migrations in filename order. Check Supabase's exposed RPC/schema cache after migration.
3. Deploy the admin legal page, updated admin initializer/sidebar/components and legal public pages. Have the administrator enter approved text and publish both Terms and Privacy. Signup is already available; publishing both documents enables the agreement controls.
4. Configure Supabase Auth allowed redirect URLs for the actual production origin plus `/user/auth/callback` and `/user/auth/reset-password`. Keep email-confirmation/SMTP settings consistent with the chosen email template: the default confirmation link uses the callback, while a template containing the six-digit email token supports manual OTP entry. Verify actual email delivery with a controlled account.
5. Deploy the changed public and user HTML, shared scripts/component bundle, user scripts/styles and product-detail actions together. New user pages depend on the new migrations. Clear HTML/CDN caches as needed; changed scripts are versioned.
6. Regenerate the production sitemap with the confirmed origin and public Supabase configuration. The generator now includes Terms and Privacy routes; it does not synthesize historical entries.
7. Live acceptance checks: create writer and producer accounts, follow a confirmation link and OTP path, test password recovery, save profile/photo, submit/approve/edit/unpublish a listing, open public/private storefronts, exchange messages between two controlled users, submit/respond/withdraw a licensing enquiry, and check outsider access is denied. Do not run real payments.

## Verification

- `npm run check`: passed; 128 JavaScript syntax checks, references (including extensionless routes), duplicate IDs and generated components.
- `npm test`: all 44 unit/API tests passed.
- `npm run test:database`: passed; base and new migrations with role boundaries, profile metadata, view-event deduplication, moderation safety, message privacy/idempotency/impersonation, licensing transitions/conflicts, legal publication and consent checks.
- `npm run test:browser`: passed; existing public/creator/admin regression suite.
- `npm run test:creator`: passed; new browser journey suite for signup/consent/OTP/resend, profile save failure/recovery, photos/mobile navigation, verification, listing edit/review and catalog search, public storefront, message retry, licensing withdrawal, legal editor failure retention and expired recovery.

Browser services and email are mocked locally; database assertions use PGlite. Passing local tests does not verify deployed policies, hosting routing, SMTP templates, provider delivery, live legal wording or production data.

### Branded email templates

The complete Supabase authentication/security email collection is in `emails/auth/`, with subjects in `emails/subjects.json`. Open `emails/preview.html` for sample previews and follow `emails/README.md` to install each template in the live dashboard. The existing Founding Voices acceptance function now includes branded HTML and still sends a plain-text alternative; redeploy that function to apply it. The newsletter starter is a draft and requires a working unsubscribe mechanism before marketing use. Creating these files does not update live settings or send mail.

Password rules follow the configured Supabase policy: at least 8 characters, ASCII lowercase/uppercase, digits, and a supported symbol. Spaces do not satisfy the symbol requirement. Leaked-password enforcement remains server-side; the UI displays a retryable message if Supabase rejects a weak/exposed password. See https://supabase.com/docs/guides/auth/password-security.


### Legal editor formatting and save diagnostics

The legal editor supports Markdown (including tables) and semantic HTML, rendered through local Marked and DOMPurify copies. Both admin preview and public pages use `script/legal-content.js` plus `style/legal-content.css`; scripts, event handlers, embedded forms/frames and arbitrary styles are removed. Existing plain text remains readable. Raw source stays in the existing `body` column, so no new format migration is required.

Saving now uses the version ID returned by `save_legal_document` immediately, avoiding a second read that could show a save as failed after a successful write. Publish asks for confirmation in an ETCH dialog. Failed saves retain all source; conflict recovery offers an explicit reload. The footer separates the publish option, public links and right-aligned save button.

The database still requires `202610150004_legal_documents.sql` and its earlier migration dependencies on the actual Supabase project. If the editor reports missing setup, apply that migration before retrying; for a stale PostgREST schema cache, run `NOTIFY pgrst, 'reload schema';` in the project's SQL editor. Do not repeatedly run a non-idempotent migration that has already been applied. Admin/Super Admin permissions are required. Browser mocks cannot verify the configuration of a live project; use the editor's returned error to distinguish setup, permission and version conflicts.

The unsolicited dashboard status paragraph and refresh button have been removed. Failed counts still display `—` rather than misleading zeros.
