# Client review fixes — 15 October 2026

These are local frontend fixes plus a new invitation database migration. They have not been deployed, and authenticated production workflows have not been verified. No production records, roles, or migrations have been changed. Existing migration files were preserved.

1. **Founding Voices:** the public form checks the saved application before enabling submission, distinguishes read failures from a missing application, preserves answers after failed inserts, blocks repeat clicks, and confirms a saved submission without depending on another network request. Sign-in links retain the application return path. The existing admin review panel now displays the complete statement and contact details, loads review/email history even without a rubric, explains rubric failures, and prevents scoring already-decided applications. Successful changes clear the stale review panel. Applications still use `public.founding_applications` and `/admin/applications`.
2. **Authors:** the header starts with a loading state. All counts and labels change together on failure, with a refresh button for recovery. Removed the arbitrary delayed duplicate load, added protection against stale responses, and made the icon CDN optional so its absence cannot stop the data-loading script.
3. **Dashboard:** data loading starts after admin authorization. Article totals, published/draft totals, and pending listing totals use exact count queries. Article views are summed over paginated reads instead of a capped list. Query failures display unavailable values and can be retried. Removed hard-coded 24/12 badges, fabricated trends, progress bars, and uptime figures. Review Listings opens the moderation queue; Content Reports replaces the unsupported Support Tickets shortcut. The update time reflects a successful refresh. Revenue/licensing and unconnected activity remain explicitly unavailable.
4. **Reports:** retained the existing report/dismiss/remove backend workflow. Added full report reasons, on-demand lookup of the reported record and safe public links for published content. Queue load failures clear stale totals, disable pagination, and provide retry; action exceptions are displayed.
5. **Category options:** initial options load after admin authorization. Categories/authors load together and refresh explicitly or when returning to the editor window. Refresh preserves selected values (including existing inactive references) and article text. Failed refreshes retain existing options and explain the failure. A cache-specific production cause was not established.

Changed shared application/queue script URLs have new version parameters to avoid reusing old browser assets.

## Verification

- `npm run check`: passed; 135 JavaScript syntax checks, local references, duplicate IDs, and generated components.
- `npm test`: passed; 41 tests, including thirteen new regression tests for application persistence/failure states, dashboard failure/recovery, authors counts, dropdown preservation, rubric-free review history, and report queue retry/target lookup.
- Browser regression coverage was extended in `tests/browser.mjs` for dashboard counts/failures, authors recovery, and category refresh.
- Dependencies were restored in the existing temporary tool directory. The database suite passed, including the invitation migration and policy tests. The browser suite passed, including the new dashboard, author, category, and invitation-management checks. The invitation sign-in return flow is also covered.

## Live acceptance checks still required

- Deploy the changed frontend files together. Confirm `/admin/applications` and `/admin/reports` resolve on the production host; these routes returned page HTML during the earlier unauthenticated inspection, so the client's earlier 404 was not reproduced.
- Verify the existing admin workflow/review migrations are applied. Follow `ADMIN_UPGRADE_CHECKLIST.md`; do not blindly rerun historical SQL.
- Confirm Maya has Reviewer, Admin, or Super Admin access. Submit one controlled application and verify its appearance, review, decision, and saved status under that account. Do not send acceptance email during routine verification.
- Compare dashboard totals with Masterclass using the same signed-in account, verify real authors, submit/resolve a controlled report, and create a category in another tab before returning to an editor with unsaved content.
- Apply `supabase/migrations/202610150001_founding_invitations.sql` after the existing migrations and deploy the corresponding frontend. This migration intentionally closes new submissions to uninvited accounts; existing applications remain readable and reviewable. No cohort cap or payment promises were introduced.

## Invitation-only intake — combined email approval and personal links

Per the user's selected combination, both the approved email and the personal link are required. In **Admin → Founding Voices → Manage invitations**, enter a writer email and validity in days (14 by default, 1–90 allowed), then generate the link. Copy/share it privately; no email is sent automatically. The link is returned only when generated. Generating another for the same email replaces the previous token and requires redeeming the new link. The list supports expiry/status inspection, pagination, and revocation.

The signed-in writer must match the approved email before the link is redeemed. The database insert policy checks the redeemed invitation, current account email, revocation, and expiry, so direct API calls cannot bypass the form. Stored tokens use SHA-256; plaintext tokens appear only in the generated URL fragment. The fragment is removed from the address bar after redemption. Sign-in and OTP completion preserve same-origin return paths, including invitation fragments, while rejecting external redirects.

The browser suite uncovered a missed-ready-event race. Shared admin code now records a persistent component-ready flag; the dashboard, authors list, and article editor handle both an already-ready admin shell and a later ready event. Changed admin script URLs were versioned so deployment does not retain the old initializer.
