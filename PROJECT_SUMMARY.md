# ETCH by OMIMI

ETCH is a static, multi-page creative marketplace with public discovery pages, a creator workspace, and an editorial/admin workspace. HTML, shared CSS, and vanilla JavaScript connect to Supabase Auth, Postgres, Storage, and an email Edge Function.

## Main code

- Public pages: `index.html`, `explore.html`, `products.html`, `search.html`, `product-detail.html`, `contact.html`.
- Editorial: `masterclass.html`, `article.html`, `script/masterclass.js`, `script/masterclass-article.js`.
- Creator: `user/*.html`, `user/auth/*.html`, `user/script/user.js`, `script/user-auth-guard.js`.
- Admin: `admin/*.html`, `admin/auth/signin.html`, `admin/script/admin.js`.
- Shared behavior: `script/core.js`, `script/script.js`, `script/supabase.js`, `script/error-handler.js`.
- Shared component sources: `component/`, `user/component/`, `admin/component/`. Build `script/components.js` with `npm run build:components` after editing them.
- Styles: `style/style.css`, `user/style/user.css`, `admin/style/admin.css`, plus existing page Tailwind configuration.
- Backend: `docs/supabase-schema.sql` (base schema), `supabase/migrations/` (required follow-up migrations), `supabase/functions/send-newsletter/`.

Serve the project from an HTTP server; do not open pages with `file://`. Apache deployment uses `.htaccess` to map extensionless paths. The site expects to be served at the domain root.

Auth, listing queries/creation, profile photos, editorial creation, contact saving, and newsletter subscriptions/delivery have backend integrations. Messaging, commerce transactions, licensing, and portions of workspace presentation remain incomplete features.

See [consistency fixes and deployment order](docs/CONSISTENCY_FIXES.md) before deploying. The [original source review](docs/PLATFORM_REVIEW.md) records the findings that led to this repair.

Install development tools with `npm ci`. Run `npm run check`, `npm test`, `npm run test:database`, and `npm run test:browser` for the available verification.

The current admin upgrade, role matrix, deployment steps, and checklist are documented in [ADMIN_UPGRADE_CHECKLIST.md](docs/ADMIN_UPGRADE_CHECKLIST.md). Paystack is excluded from this upgrade.
