# ETCH platform review

Historical findings before the consistency patch. See [implemented fixes and remaining work](CONSISTENCY_FIXES.md) for current status.

Reviewed 11 September 2026. This is a source review of the local repository, including public pages, creator pages, admin pages, shared scripts, SQL schema, newsletter function, and Apache routing. Application behavior was not changed.

The deployed database, storage policies, server configuration, and email provider were not inspected. Database findings describe the checked-in schema and must be compared with deployed policies. No emails, database mutations, or authenticated production requests were made. Syntax checks are not browser or integration tests.

## Architecture and current implementation

ETCH is a static, multi-page creative marketplace with three areas:

| Area | Entry points | Implementation |
| --- | --- | --- |
| Public marketplace | `index.html`, `products.html`, `search.html`, `product-detail.html` | Supabase listing queries and inline card rendering; shared navigation and theme behavior |
| Editorial | `masterclass.html`, `article.html` | Dedicated listing/detail scripts querying articles, authors, and categories |
| Creator workspace | `user/*.html`, `user/auth/*.html` | Supabase authentication, profile/avatar updates, listing creation, and partial dashboard data; several presentation-only features remain |
| Administration | `admin/*.html` | Article, author, category, media, newsletter, and dashboard functionality; separate browser-storage admin guard |
| Backend | `script/supabase.js`, `docs/supabase-schema.sql`, `supabase/functions/send-newsletter/index.ts` | Shared API wrapper, database schema/policies, and Resend email function |

Public and creator components are embedded in `script/script.js`; admin components are embedded in `admin/script/admin.js`. Separate `component/`, `user/component/`, and `admin/component/` HTML files also exist, but are not the source used by those injectors. Editing a component file can therefore have no effect on the rendered page.

Styling combines shared CSS, repeated page-level Tailwind configuration, browser-loaded Tailwind, and inline styles. There is no package manifest, dependency lockfile, automated test suite, or build pipeline in the repository.

## Priority 0: authorization and content safety

### Newsletter endpoint has no caller authorization

Evidence: `supabase/config.toml:3` sets `verify_jwt = false`. The function processes POST bodies without validating a user or checking an admin role. The browser supplies the complete recipient list, subject, and HTML body.

If deployed as checked in, anyone who can reach the endpoint can request emails using the configured sender. Move authorization and recipient selection into the function; require a validated admin identity. Add bounded batches, request validation, and campaign identifiers to prevent accidental duplicate sends.

### Database policies do not implement the admin/creator boundary

Evidence: `docs/supabase-schema.sql:135–230`, `323–383`, and `433–465`.

Any authenticated account can mutate editorial content and site settings, read and change newsletter subscriptions, and update/delete storage objects under the broad update/delete policies. Those storage policies do not actually test ownership despite their names. Article SELECT policies also expose drafts to every signed-in account.

The profile self-update policy at line 53 does not protect the `role` column from changes. Before using profile roles for authorization, make privileged role assignment server-controlled. Restrict editorial/settings/subscriber operations to admins, media mutations to owners or admins, and public reads to deliberately public data.

### Admin guard trusts editable browser state

Evidence: `admin/script/admin.js:11`, `262`, and `273`.

The login form does authenticate through Supabase, but subsequent route protection only checks a locally stored email and `signedInAt`. It does not validate a current Supabase session or role. Admin sign-out clears the local marker without signing out of Supabase.

Use one shared authentication lifecycle, validate current user privileges, and call Supabase sign-out. Browser route guards should complement database and function authorization.

### Database values are interpolated into executable HTML contexts

Evidence: `script/masterclass-article.js:113–136`, `products.html:499`, and `user/script/user.js:246–286`.

Article image URLs and marketplace/profile data are inserted with `innerHTML`. The article helper escapes text using a temporary element but does not escape quotation marks for HTML attributes. A title containing quotes can break the generated `alt` attribute. Article body sanitization also falls back to rendering raw HTML if DOMPurify fails to load.

Use DOM creation, `textContent`, and validated URL property assignments for cards and images. Require sanitization for rich content and fail safely when unavailable. Apply the same rendering rules across admin and public pages.

## Priority 1: broken or misleading flows

### Listing submission handlers conflict

Evidence: `user/upload.html:253`, `617`; `script/script.js:680`; `user/script/user.js:451`.

The form has three submission handlers. The live handler waits for `getCurrentUser()` before constructing `FormData`. During that wait, the delegated shared handler synchronously resets the form. The live handler can then read blank/default values and no selected file. The page's inline handler independently displays success and schedules another reset.

Give the form one owner. Capture and validate input before awaiting network work, disable repeat submission while pending, and show success/reset only after confirmed persistence. Display API errors in the form.

The upload screen simulates multi-file progress, while the real handler uploads only `files[0]` as a cover image. Define and implement the actual deliverable upload model before presenting multi-file completion.

### Newsletter subscription and sending have contract mismatches

Evidence: `script/supabase.js:841–868`, `892–957`; SQL subscriber policies at line 323.

Anonymous subscription uses `upsert(...).select().single()`, but the schema permits anonymous INSERT without SELECT or UPDATE. The returning operation and duplicate-email update path are incompatible with those policies. Fix the endpoint/query contract without exposing subscriber records publicly.

Sending treats every HTTP 200 response as `sent: true`, while the function returns HTTP 200 even for partial or complete delivery failure. Interpret the function's `success`, `sent`, and `failed` fields and preserve accurate retry information. The current unrestricted `Promise.all` over recipients also needs bounded concurrency.

### Public draft listing exposure

Evidence: `docs/supabase-schema.sql:281–284`; `script/supabase.js:679–714`.

The listing SELECT policy allows everyone to read all statuses. Detail queries do not filter status. Public listing/search filters alone cannot protect draft or review records. Enforce published-only public reads in RLS, with explicit owner/admin exceptions.

### Listing links confuse slugs and IDs

Evidence: `products.html:493–500`; `product-detail.html:277–291`.

Cards choose `listing.slug || listing.id` but always put the value in `?id=`. The detail page queries the UUID column for `id`, so records with a slug produce the wrong query. Use `?slug=` for slugs and `?id=` for IDs through one shared URL helper. Add slug uniqueness rules if slug-based lookup is retained.

### Editorial navigation, previews, and metadata disagree

Evidence: `admin/admin_masterclass.html:530`, `script/masterclass.js:181`, `admin/create_article.html:765`, and `script/masterclass-article.js`.

- Admin preview resolves to `/admin/article.html`, which does not exist; the public page is `/article.html`.
- The public detail script intentionally rejects unpublished articles, so fixing the preview link alone will not provide authenticated draft preview.
- Editorial category pills navigate to marketplace search, which searches listings rather than articles.
- The editor generates `https://etchbyomimi.com/masterclass/article/<slug>` canonical URLs, while the implemented article route uses a query parameter. The checked-in Apache rules do not map those nested paths.
- Saved SEO title, description, keywords, and canonical fields are not applied by the article detail script. Author bio, role, and photo are also replaced with generic presentation.
- Scheduled status and dates are saved, but no scheduling worker or publishing job is present in this repository.

Define the article URL and publishing contract, then align creation, links, previews, metadata, and scheduling around it.

### Clean URL routing conflicts with page detection

Evidence: `.htaccess` redirects explicit `.html` requests to extensionless URLs. `user/script/user.js:314` and subsequent branches compare the last path segment to names such as `dashboard.html` and `analytics.html`.

On Apache with these rules enabled, page-specific dashboard updates will not match the extensionless pathname. Normalize route names centrally or identify the page using a stable HTML data attribute. Audit active-navigation matching against the same route convention.

### Contact and workspace controls include simulated behavior

Evidence: `contact.html:462` shows success and clears input without submitting to a backend. Creator messages/licensing/earnings include UI interactions without a corresponding transaction, messaging, or licensing data layer in the checked-in schema.

Make completion messages reflect saved outcomes. Treat financial metrics as unavailable until backed by transaction records. `user/script/user.js:304` computes a revenue-like value from listing prices, while later ID-based updates overwrite earnings with zero. Review status is also counted as active/published at line 298.

## Priority 2: performance and maintainability

1. **Remove unnecessary request waterfalls.** `script/masterclass.js:203–213` serializes three independent queries. `products.html:460` awaits six category counts before rendering fetched cards. Fetch independently where appropriate and render primary content before supplementary counts.
2. **Select only fields needed by each screen.** Article listing queries fetch full article bodies and full related records. Listing queries fetch every creator profile column. Introduce summary queries and separate detail queries.
3. **Implement pagination and actual totals.** Search is capped at 24 rows, creator summaries at 50, and admin dashboard requests at 1,000. Returned array length is repeatedly displayed as a total. Add pagination, count queries, and database aggregates so totals do not depend on loaded pages.
4. **Reuse authentication and profile results.** The auth guard already provides `ETCH_USER`, `ETCH_PROFILE`, and `etch:auth:ready`; the user script immediately repeats user/profile requests. Use one initialization promise/state source.
5. **Consolidate component ownership.** Pick one source for navigation/topbars/footers and remove obsolete copies after checking references. Extract page-specific scripts from large HTML files incrementally.
6. **Centralize design tokens and configuration.** Repeated Supabase config, Tailwind config, and brand values make updates easy to apply inconsistently. The public anon key is expected to be browser-visible; access security belongs in policies. Provider secrets must remain server-side.
7. **Make dependencies reproducible.** Several pages load Lucide twice; libraries use floating `@latest`/major-version URLs. Establish pinned dependencies and compile the existing Tailwind classes into a static stylesheet. Preserve generated/dynamic class names deliberately.
8. **Standardize error states.** Article detail maps network errors to “Article not found.” Masterclass loaders ignore wrapper `{ error }` values and show empty states. Distinguish loading, empty, missing, denied, and retryable failure.
9. **Fix search boundary handling.** `searchListings` interpolates user text into a PostgREST filter expression. Handle filter-special characters safely. Price checks use truthiness, so a maximum price of zero is ignored.
10. **Use stable DOM hooks.** Dashboard values are addressed both by positional selectors and explicit IDs, producing conflicting updates. Use one semantic hook per metric and one metric definition.

## Schema and documentation drift

The listing queries embed `creator:profiles(*)`, but the checked-in listing foreign key points to `auth.users`, not `public.profiles`. No direct listing-to-profile relationship is declared. Verify the deployed relationship: the schema as written does not establish the relationship those queries expect.

`PROJECT_SUMMARY.md` describes obsolete paths (`scripts/`, `styles/`, root auth pages), says authentication is not implemented, and references missing files. Newsletter setup material also contains parallel function/config examples. Update documentation around the actual sources and use versioned migrations for future schema changes; `CREATE TABLE IF NOT EXISTS` does not evolve existing table definitions.

## Verification performed

- Node syntax checks passed for 113 standalone JavaScript files and inline script blocks, including documentation JavaScript.
- Static HTML inspection found no duplicate IDs within the inspected documents.
- Static local-reference checks found 20 missing references. Five are in `admin/index.html`; the remainder are in separate admin/user sidebar component files. Some component files are obsolete rather than active runtime templates.
- Generated JavaScript URLs were reviewed separately; the admin article preview issue is not included in that count.
- Source tracing confirmed the upload handler reset sequence, article rendering behavior, auth/storage trust boundaries, newsletter response mismatch, and routing discrepancies.
- No browser rendering, authenticated end-to-end flows, live policy checks, email sends, or performance measurements were performed.

## Suggested update sequence

1. Fix authorization boundaries and unsafe rendering; verify with anonymous, creator, and admin accounts in a test environment.
2. Repair upload submission, newsletter contracts, listing/detail URLs, and clean URL detection. Check success and failure paths with controlled API responses.
3. Complete the editorial workflow: category filtering, draft preview, editing requirements, metadata, and scheduled publishing.
4. Introduce shared component/config ownership, summary queries, pagination, and request concurrency while preserving the current design.
5. Define which creator commerce features are next, then add their persistent data models before wiring completion UI.

These changes can be staged within the current multi-page architecture. A framework migration is not a prerequisite for the fixes above.
