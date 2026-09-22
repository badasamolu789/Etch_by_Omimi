# Admin upgrade checklist

Scope: all requested items except Paystack. Items 7 and 9 were initially deferred and subsequently included by the user. This is a local implementation; no production database migration, email send, or live deployment has been performed.

| Original item | Implemented | Local verification | Deployment / operational requirement |
| --- | --- | --- | --- |
| 1. Article editing | Yes — edit links, existing-record loading/updating, retained images, publication dates, optimistic update guard, failed-save input retention | Browser and API checks | Deploy frontend; editing users need editorial permission |
| 2. Draft/scheduled/published | Yes — edit transitions, server validation, existing minute-by-minute pg_cron job, scheduler status and overdue count | Database publishing statement and transition tests; browser scheduling/draft checks | Apply existing scheduler migration; verify actual cron runs in Supabase. Publication occurs on the next minute tick, not at exact-second precision |
| 3. Founding Voices | Yes — signed-in intake, dedicated queue, configurable/versioned weights, reviewer notes, weighted scores, accept/decline, acceptance-email action and delivery records | Database scoring/permissions/decision tests; browser queue; mocked email tests | Configure rubric before accepting; deploy `send-acceptance`, verified sender, provider secret; review default email copy |
| 4. User management | Yes — writer/producer account types, staff roles, user list, verification requests and decisions | Database denial/allowed-action tests; browser decisions | Bootstrap first Super Admin with trusted SQL. No existing account is automatically promoted |
| 5. Listing management | Yes — review, approval, rejection/removal reasons, featured curation; creator edits return published listings to review; creator catalog shows decisions | Database moderation/public visibility checks; browser decisions | Apply policies and deploy creator/public/admin changes together |
| 6. Content flags | Yes — signed-in reporting on article/listing detail pages, queue, dismiss/remove decision, audit history | Database target visibility, reporting/removal tests; browser queue | Reports cover articles and marketplace listings; reporting requires sign-in |
| 7. Authors display | Yes — replace hard-coded total and tolerate missing status; loading failure differs from empty state | Browser fixture with existing author and null status | Compare against live records after deployment; no live DB inspection was performed |
| 8. Signed draft previews | Yes — HMAC-signed, expiring links, per-link revocation, dedicated noindex/no-referrer preview page | Signature tampering, role denial, expiry and revocation unit tests | Deploy `article-preview`; set a random `ARTICLE_PREVIEW_SECRET` of at least 32 characters. Anyone holding a valid link can view that article until expiry/revocation |
| 9. Mailchimp | Yes — CSV export of active subscribers, pagination beyond API row limits, spreadsheet formula neutralization | Browser download | CSV import approach; no automatic Mailchimp sync or account connection. Preserve existing Mailchimp unsubscribes |
| 10. Analytics | Yes — public page views, sessions, active session time, source/medium/campaign breakdown | Database aggregates/idempotent updates; browser dashboard | Data starts after deployment; historical data is not synthesized. DNT respected; no admin/user/private-preview tracking |
| 11. Sitemap + robots | Yes — files and paginated published-content generation tool | Sitemap unit tests and source checks | Checked-in sitemap contains static routes only and uses provisional `https://etchbyomimi.com`. Regenerate with the confirmed origin and public DB configuration, and rerun after publishing or unpublishing content |
| 12. Admin audit | Yes — database-triggered before/after records with actor/time, queue, system publication and service delivery/preview attribution | Database immutability/actor/action assertions; browser queue | Administrative writes are logged; read-only page visits are not. Database owners can administer the log; application users cannot rewrite it |
| 13. Paystack | Excluded at user request | Not applicable | Separate future scope |
| 14. Article search/filter | Yes — title search, author/category/status filters, clear/apply, pagination, exact matching count | Browser query assertions | Search targets article titles; author/category are separate filters |
| 15. SEO preview | Yes — live title/description/canonical preview and character counts; metadata remains editable | Browser live preview check | Search engines can rewrite snippets; social/server-rendered metadata is a separate concern |

## Permission matrix

| Staff role | Permissions |
| --- | --- |
| Editor | Articles, editorial authors/categories, editorial media, private article previews |
| Reviewer | Founding Voices reviews/decisions, verification, listing moderation, content reports |
| Admin | Editorial and review operations, users/account types, site configuration, newsletters/export, analytics, audit |
| Super Admin | Admin permissions plus staff role assignment |

Writer/producer is an account type, separate from staff authorization. Creator is the default non-staff role. Staff cannot change their own role through the application; another Super Admin must do so. Existing admins remain admins.

## Deployment sequence

1. Back up and inspect the live schema/policies. These migrations assume the checked-in base schema and all `20260911*` migrations. Extra live permissive policies must be reconciled; policies combine with OR.
2. Apply `202609220001_admin_workflows.sql`, `202609220002_review_actions.sql`, `202609220003_previews_analytics.sql`, and `202609220004_operations_status.sql` in order. They are new migrations, not modifications to deployed migration history.
3. Assign the intended initial Super Admin through trusted database administration, after verifying the account UUID. Do not run a blanket promotion. Review the new role matrix before assigning staff.
4. Deploy `article-preview` and `send-acceptance` together with their `handler.mjs` files. Existing `send-newsletter` now also recognizes Super Admin.
5. Configure `ARTICLE_PREVIEW_SECRET`, `RESEND_API_KEY`, and `ACCEPTANCE_FROM` as server secrets. The runtime provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Never copy server secrets into public JavaScript.
6. Run `npm run build:components`, then deploy the static frontend. The new queues depend on the new tables/functions.
7. Configure Founding Voices criteria in its admin screen. Weights must total 100%; reviewers score each criterion 0–100. Application score is the mean of reviewers' weighted scores under the current rubric. Acceptance requires at least one review under that rubric; no arbitrary acceptance cutoff is imposed.
8. Verify the `etch-publish-articles` job is active. Schedule a controlled test article and inspect its run status plus public visibility after the next minute tick. Test cancellation/rescheduling as well.
9. Generate the production sitemap:

   ```sh
   ETCH_SITE_URL=https://your-public-domain.example \
   SUPABASE_URL=https://your-project.supabase.co \
   SUPABASE_ANON_KEY=your-public-anon-key \
   npm run build:sitemap
   ```

   Publish both generated files. Run this step after content publication/removal, including scheduled publication; it can be attached to the deployment pipeline or a scheduled build. The generator fails instead of replacing the sitemap when DB reads fail. For more than 50,000 URLs, extend it to a sitemap index before deployment at that scale.
10. Test anonymous, creator, each staff role, preview recipient, and email flows against the deployed environment. Use controlled email recipients for the first acceptance delivery.

## Email and analytics limitations

Acceptance emails are manually dispatched after acceptance. The server selects the saved recipient and claims a unique delivery record before contacting Resend. Repeated submissions are rejected. An uncertain send requires checking provider logs and the delivery record; it is never automatically resent. The default email confirms acceptance and says the team will follow up; no unapproved benefits or payment promises are included.

Analytics stores path, random per-tab session/event IDs, UTM values, and cumulative active seconds. Hidden tabs and idle periods are not continuously counted. Session totals are estimates and can be affected by blocked scripts, lost unload requests, bots, and deliberately fabricated events. It is a basic first-party dashboard, not billing-grade telemetry. Retention and abuse controls can be added when traffic volume warrants them.

## Local checks

- `npm run check`: JavaScript syntax, local references, duplicate IDs, generated components.
- `npm test`: API/authorization helpers, newsletter, preview signatures, acceptance idempotency, sitemap.
- `npm run test:database`: base and new migrations in PGlite; role boundaries, scheduling, moderation, review scoring, verification, analytics and audit.
- `npm run test:browser`: local server and installed Chrome; external services are mocked. Checks both existing public/creator flows and the new admin workflows.

PGlite executes the publisher UPDATE but does not run pg_cron itself. Browser checks do not validate live provider delivery or deployed RLS/CDN behavior.

## Verification results for this change

- Source validation: 131 JavaScript syntax checks, no local-reference or duplicate-ID errors; generated components current.
- Automated unit/API tests: 22 passed.
- Database suite: base/new migrations and permission/workflow assertions passed.
- Browser suite: public/creator and admin checks passed, including application submission, content reporting, and CSV download. Services were mocked; no production messages were sent.
- `git diff --check`: passed.

For Mailchimp import, match the exported Email Address, Full Name, and Subscription Date columns to the intended audience fields; see [Mailchimp's import formatting guide](https://mailchimp.com/help/format-guidelines-for-your-import-file/). The delivery handler uses the provider's [idempotency mechanism](https://resend.com/changelog/idempotency-keys) in addition to the database claim.
