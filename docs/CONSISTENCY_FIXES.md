# Consistency repair

This change repairs the source issues identified in `PLATFORM_REVIEW.md`. It is not a production deployment.

## Changes

- Corrected creator session validation, shared the guard's authentication result with dashboard loading, and connected creator/admin sign-out to Supabase.
- Replaced browser-storage admin authorization with a verified Auth user and server-controlled profile role.
- Added database policies restricting editorial/settings/subscriber operations to admins, protecting profile role changes, limiting media mutations to owners/admins, and hiding unpublished listings from visitors.
- Declared the listing-to-profile relationship used by embedded queries and enforced unique nonempty listing slugs.
- Replaced conflicting upload handlers with one save lifecycle, input snapshots, validation, repeat-submit protection, visible failures, and unused-upload cleanup. The current form uploads one cover image; preview/deliverable links remain separate.
- Connected contact submissions to a contacts table and newsletter subscriptions to a non-disclosing RPC. Duplicate subscriptions do not reactivate paused addresses.
- Secured newsletter sending with user-token validation, an admin check, server-selected recipients, paginated recipient reads, bounded provider batches, campaign IDs, and accurate partial-failure reporting. A failed/uncertain campaign requires delivery-log review rather than an automatic resend.
- Fixed listing slug/ID links, editorial category links, admin previews, article metadata/author details, legacy generated canonical URLs, and extensionless page detection. Draft preview requires an admin and uses `noindex`.
- Added a scheduled-publishing migration using pg_cron. Scheduled submissions must include a future date.
- Escaped database text/attributes in public cards and editorial/admin rendering, validated URL schemes, and made article HTML sanitization fail closed. DOMPurify 3.4.15 is vendored locally with its license rather than relying on the old CDN version.
- Added actual marketplace/search pagination, total counts, category/price filters, sorting, and concurrent supplementary category counts. Removed unsupported license filtering until a license data model exists.
- Replaced capped creator metric calculations with a database aggregate. Review listings are not counted as published; commerce metrics without a transaction source display an unavailable value.
- Made the six component HTML files the source of truth; `script/components.js` is generated. Component links are root-relative and component initialization remains compatible with page scripts.
- Removed duplicate library loads and redundant page-level Supabase configuration. Public connection defaults remain in `script/supabase.js`; `window.__ETCH_SUPABASE__` still supports an override.
- Added pinned test tooling, source checks, and regression tests. Existing page styling remains in place.

## Deployment order

1. Inspect the deployed database policies and admin profiles. These migrations replace the broad policies present in the repository; additional policies created outside this repository must also be reviewed because permissive policies combine with OR.
2. Confirm the intended administrator has `profiles.role = 'admin'`. The previous UI used `etchadmin@gmail.com`; no user is automatically promoted by this migration. From trusted SQL administration, verify that account and assign its role if needed. Audit existing admin roles because the previous self-update policy did not protect the role column.
3. Check duplicate nonempty listing slugs before migration. Resolve duplicates deliberately; the migration's unique index will stop rather than discard or rename data. Existing listings whose creators lack profiles are retained, but will need profile backfills for creator details.
4. Apply `supabase/migrations/202609110001_platform_consistency.sql` once, then `202609110002_scheduled_articles.sql`. The first migration is transactional. The second requires pg_cron on the Supabase project. New projects first need `docs/supabase-schema.sql`, followed by these migrations; never expose the base schema alone.
5. Set Edge Function secrets `RESEND_API_KEY` and optionally `NEWSLETTER_FROM` with a verified sender. The runtime supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; do not place service-role/provider secrets in static JavaScript.
6. Deploy the `send-newsletter` function including `handler.mjs`, using the checked-in `verify_jwt = true` configuration. Deploy the static files from the same change. Frontend contact, subscription, aggregate, and admin behavior depend on the migration.
7. Check live flows with anonymous, creator, and admin accounts. Inspect `cron.job` / `cron.job_run_details` for the publishing job. Test email delivery with a controlled subscriber set before normal use.

The migrations and function have not been applied to the live project. No production emails were sent.

## Development and verification

```sh
npm ci
npm run build:components
npm run check
npm test
npm run test:database
npm run test:browser
```

`test:browser` uses the installed Google Chrome on macOS by default. Set `ETCH_CHROME` to another Chrome/Chromium executable when needed. It starts a local HTTP server and mocks external services, so it tests browser behavior without calling the live database or email provider. It does not measure production performance or validate CDN styling.

`test:database` uses PGlite, creates a small Supabase-compatible auth/storage fixture, applies the base schema and security migration, and exercises anonymous/creator/admin access. The pg_cron scheduler itself needs a live Supabase verification; its publishing UPDATE can be checked independently.

After editing `component/*.html`, `user/component/*.html`, or `admin/component/*.html`, run `npm run build:components`. The source check fails if the generated bundle is stale.

## Separate future work

Messaging, payment/earnings transactions, licensing, full deliverable storage, and an article editing workflow are feature work rather than existing complete services. Their interfaces still need product decisions and persistent models. Compiling the existing Tailwind configuration, consolidating design tokens, expanding pagination across all admin tables, and server-rendering SEO metadata are further optimizations, not prerequisites for this consistency patch.

Large newsletter audiences eventually need a background campaign worker rather than a single function request. Current campaigns use bounded batches and record progress; a timeout or uncertain provider response is not reported as success.

Implementation references: [Supabase function authentication](https://supabase.com/docs/guides/functions/auth), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [storage access control](https://supabase.com/docs/guides/storage/security/access-control), [Resend batches](https://resend.com/docs/api-reference/emails/send-batch-emails), and [idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).
