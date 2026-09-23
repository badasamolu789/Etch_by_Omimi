# Article links, admin modals, and social previews

The frontend changes are ready locally. Social previews additionally require the server-side service below. No SQL migrations or new Supabase secrets are needed for these changes.

## Upload the frontend fixes

Upload the updated `index.html`, `script/core.js`, `script/masterclass.js`, and the updated `admin/` folder. The admin folder includes the new `script/dialogs.js` and `style/dialogs.css`; upload both with the HTML files. Clear any hosting/CDN cache and reload the pages.

Homepage, masterclass, and admin preview links now use `/article?slug=...`. Admin edit links also avoid the `.html` redirect so their IDs survive. The VPS must continue serving extensionless routes. Admin dialogs use an accessible `<dialog>` with styled content, keyboard dismissal, focus restoration, and explicit cancellation of destructive actions.

## Why the server is needed

Social crawlers need the content's Open Graph tags in the initial HTML. JavaScript that updates metadata after the page loads is insufficient for crawlers that do not run that JavaScript. See the [Open Graph protocol](https://ogp.me/).

`server/share-pages.mjs` reads published article/listing summaries through the public Supabase anon key and inserts the title, description, canonical URL, Open Graph, and Twitter card tags into the existing HTML template. It returns the same metadata to humans and crawlers. It uses the article's SEO title/description (falling back to title/excerpt) and featured image; products use their title/description/cover. Missing images fall back to the logo. Images must be publicly fetchable.

Drafts and missing content receive no public share metadata. Staff preview URLs return generic noindex metadata, with the existing browser authentication still handling the private article. No service-role key is used. The service listens only on localhost, and Nginx proxies the two content routes.

## VPS installation (Linux + Nginx + systemd)

The examples assume the project is at `/var/www/etchbyomimi`, Node.js is installed at `/usr/bin/node`, and `www-data` can read the project files. Replace these values with your actual paths/service user. Use a system installation of Node.js 22 or later. This deployment does not require additional npm packages for the sharing service.

1. Upload `server/share-pages.mjs` alongside the website. Keep `article.html` and `product-detail.html` in the parent project directory; the service reads those templates. Also upload the files in `deploy/` for use in the following steps.

2. On the VPS, create `/etc/etch-sharing.env` using your editor:

   ```sh
   sudo nano /etc/etch-sharing.env
   ```

   Contents (replace the public key):

   ```dotenv
   ETCH_SITE_URL=https://etchbyomimi.com
   SUPABASE_URL=https://cyoddvehzrmhubmislbb.supabase.co
   SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
   ETCH_SHARE_PORT=3100
   ```

   Keep this environment file outside the public document root. Use the existing project's public anon key, never its service-role key.

3. Copy the example service definition, then edit its paths/user if needed:

   ```sh
   cd /var/www/etchbyomimi
   sudo cp deploy/etch-sharing.service.example /etc/systemd/system/etch-sharing.service
   sudo nano /etc/systemd/system/etch-sharing.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now etch-sharing
   sudo systemctl status etch-sharing --no-pager
   ```

4. Test the local service with an actual published article slug:

   ```sh
   curl -sS 'http://127.0.0.1:3100/article?slug=YOUR_PUBLISHED_SLUG'
   ```

   The returned HTML must contain that article's `og:title`, `og:description`, and absolute `og:image` URL near the start of `<head>`. A missing/unknown slug returns 404; an upstream/configuration error returns 503.

5. Back up the active Nginx site configuration. Merge the locations from `deploy/nginx-sharing.conf.example` into the existing **HTTPS server block** for your domain. Replace existing matching locations rather than duplicating them. Preserve TLS and the existing static-file configuration.

   Important: a server-level rewrite runs before location selection. Remove or correct the old `.html` redirect that strips query strings; simply adding a location below it will not repair that rule. All legacy redirects must preserve `$is_args$args`. The example uses a temporary 302 until the configuration is verified, avoiding another cached incorrect 301.

   Validate before reloading:

   ```sh
   sudo nginx -t
   sudo systemctl reload nginx
   ```

   Run the reload only if validation succeeds. [Nginx proxy reference](https://nginx.org/en/docs/http/ngx_http_proxy_module.html) and [rewrite execution order](https://nginx.org/en/docs/http/ngx_http_rewrite_module.html).

6. Verify through the public domain:

   ```sh
   curl -I 'https://etchbyomimi.com/article.html?slug=YOUR_PUBLISHED_SLUG'
   curl -sS 'https://etchbyomimi.com/article?slug=YOUR_PUBLISHED_SLUG'
   curl -sS 'https://etchbyomimi.com/product-detail?slug=YOUR_PUBLISHED_LISTING_SLUG'
   ```

   The legacy redirect must retain the slug. Both clean URLs must return content-specific metadata in the raw HTML. Check the image URL independently and test a real link in the target sharing app. Apps may cache older cards; use the platform's rescrape/debugging facility where available. Each platform controls whether and how it displays a card.

7. On future frontend deployments, update both templates with the frontend. Restart the service after changing its `.mjs` code or environment:

   ```sh
   sudo systemctl restart etch-sharing
   ```

   For diagnostics:

   ```sh
   sudo journalctl -u etch-sharing -n 50 --no-pager
   ```

If the service needs to be rolled back, restore the previous two Nginx content locations, validate, and reload. The original static article/product pages will still work in browsers, but content-specific crawler metadata will be unavailable until the service is restored.

## Verification

- `npm test`: includes raw-HTML article/product metadata, escaping, canonical tags, private/missing content, upstream failure, and homepage/masterclass link regression tests.
- `npm run test:browser`: tests modal confirm/cancel/input as well as existing admin workflows.
- `npm run check`: validates JavaScript syntax and file references.

The production VPS configuration has not been accessed or changed by this work. The example is an integration guide, not a claim that the service is already live.
