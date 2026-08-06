# ETCH Project Summary

## 1. Project Overview

ETCH is a static marketing and marketplace prototype for a premium creative commerce platform branded as "Etch by OMIMI." It includes landing pages, search and product discovery flows, contact and auth pages, and admin/user dashboard concepts.

The project is built with:
- Static HTML pages for views
- Shared CSS in `styles/main.css`
- Shared JavaScript in `scripts/main.js`
- A small Supabase helper wrapper in `scripts/supabase.js`

The project is designed as a front-end prototype ready to be connected to a backend such as Supabase.

## 2. Core Purpose

The site is meant to present a polished marketplace for creative intellectual property and services, including:
- scripts
- storyboards
- music or sync-ready songs
- visual and motion design
- copy and briefs

It is positioned as a premium, vetted marketplace with secure licensing, creator dashboards, and admin tooling.

## 3. Key Pages and User Flows

### `index.html`
- Main landing page and marketplace introduction.
- Hero section with brand messaging and marketplace value propositions.
- Category navigation and featured creative listings.
- Client and creator benefit sections.
- Contains a filterable market card section with tabs that show/hide listings by category.
- Includes a mobile navigation menu and account menu UI.

### `products.html`
- Marketplace product listing page.
- Displays a broader set of creative asset cards by category.
- Supports client-side tab filtering via `data-market-tabs` and `data-market-card`.
- Includes empty-state handling for no matching results.

### `search.html`
- Search result page for marketplace assets.
- Reads query parameter `q` from the URL and displays it in search inputs and labels.
- Includes sidebar filter metadata and featured result cards.

### `product-detail.html`
- Detailed listing page for a single creative asset.
- Shows images, pricing, licensing details, creator info, deliverables, and related listings.
- Includes CTA buttons to request access or save the listing.

### `contact.html`
- Contact page with a full inquiry form.
- Includes support details, contact channels, audience selection, and a FAQ section.
- Uses client-side form submission handling for demo feedback.

### `signin.html` and `signup.html`
- Auth pages for signing in and signing up.
- Contain forms with client-side submission feedback but no real authentication yet.
- `signup.html` and `signin.html` both use the shared inline form handling.

### `about.html` and `explore.html`
- Additional branding and marketplace storytelling pages.
- These pages reuse the shared site header and footer pattern.

### `admin/dashboard.html`
- Admin concept page for marketplace operations.
- Contains admin KPI cards, support queue, and operational controls.
- Styled as a dashboard for content review, licensing oversight, and support routing.

### `user/dashboard.html`
- Creator/user dashboard concept page.
- Displays storefront readiness, earnings, active assets, and recent listing summaries.
- Uses a similar dashboard layout to the admin view.

## 4. Shared UI and Styling

### `styles/main.css`
- Defines the design system, fonts, color palette, and layout patterns.
- Uses CSS custom properties for colors, typography, and spacing.
- Provides components for navigation, cards, forms, hero sections, dashboards, and footers.
- Includes hover transitions and subtle shadow effects for interactive elements.
- The overall visual style is premium and clean, with earth-toned accent colors and soft gradients.

### Design patterns in use
- Sticky header with blurred translucent background
- Rounded buttons and pill-style labels
- Responsive mobile menu and account dropdown menu
- Grid layouts for product cards, dashboards, and page sections
- Uniform typography via Google Fonts (`Outfit`)

## 5. Shared JavaScript Behavior

### `scripts/main.js`
This script powers the shared interactive functionality across pages:
- Mobile navigation toggle
- Account dropdown menu for `.nav-avatar` elements
- Newsletter form feedback handling
- Search query propagation from URL to inputs and labels
- Inline form submission feedback for auth-style forms
- Contact form message handling with audience-specific text
- Category filtering for market cards using buttons inside `[data-market-tabs]`
- Auto-scrolling and looping carousel behavior for elements with `[data-auto-scroll]` and `[data-loop-scroll]`

### Behavior details
- Market tabs filter cards by `data-category`, hiding non-matching cards.
- The contact form currently does not submit to a backend; it updates UI text after submit.
- Account avatars create dynamic dropdown menus in the DOM.
- Search page query rendering is implemented using `URLSearchParams`.

## 6. Supabase Integration

### `scripts/supabase.js`
- Provides a minimal client wrapper for Supabase.
- Tries to initialize using global config values:
  - `window.ETCH_SUPABASE_URL`
  - `window.ETCH_SUPABASE_ANON_KEY`
- Requires the Supabase client library to be loaded separately.
- Includes a helper `submitContact()` that inserts contact form values into a `contacts` table.

### Current state
- Supabase integration is scaffolded but not fully connected.
- Most pages still use local demo feedback instead of actual backend requests.
- The project includes a `docs/supabase-plan.md` file with a recommended Supabase schema and integration checklist.

### How to enable real backend
- Create a Supabase project.
- Add `window.ETCH_SUPABASE_URL` and `window.ETCH_SUPABASE_ANON_KEY` to the page.
- Load the Supabase client script on pages that need it.
- Replace demo form behavior with `EtchSupabase.submitContact()` and similar real calls.
- Implement authentication, listing fetch, and dashboard data in JS.

## 7. File and folder structure

- `index.html` — landing page
- `about.html` — about page
- `contact.html` — contact page
- `explore.html` — marketplace exploration page
- `products.html` — product listing page
- `product-detail.html` — single listing details page
- `search.html` — search page
- `signin.html` — sign-in page
- `signup.html` — sign-up page
- `styles/main.css` — shared stylesheet
- `scripts/main.js` — shared interaction script
- `scripts/supabase.js` — Supabase helper module
- `admin/dashboard.html` — admin dashboard concept
- `user/dashboard.html` — creator dashboard concept
- `docs/supabase-plan.md` — backend integration plan
- `assets/logo/` — brand assets
- `img/logo/` — logo images

## 8. Notes and recommendations

- `app.js` exists at project root but is not referenced by any HTML pages. It appears to be a duplicate of `scripts/main.js`.
- The project is currently a front-end prototype and can be deployed as a static site.
- The Supabase plan is the main path to convert this into a working marketplace with real data, auth, and contact persistence.
- To fully realize the product, add backend data fetching for marketplace cards, user profiles, dashboard state, and contact form submissions.

## 9. How to use this project

1. Open the HTML files in a browser for a static preview.
2. To connect backend data, define Supabase config variables and load the Supabase client script.
3. Implement server-backed form submissions and data retrieval in `scripts/main.js` or a new shared module.
4. Use `docs/supabase-plan.md` as the integration checklist.

## 10. Summary

ETCH is a complete front-end experience for a premium creative marketplace. It is not yet a fully functional SaaS product, but it includes polished design, page structure, interactive UI patterns, and a clear Supabase integration path.

The project can be understood as:
- a marketing and discovery shell for creative commerce
- a prototype of buyer and creator workflows
- a concept for admin moderation and support operations
- a Supabase-ready front-end scaffold
