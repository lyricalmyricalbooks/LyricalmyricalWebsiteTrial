# Artsy Website for Publisher

This is a code bundle for Artsy Website for Publisher.
The original project is available at https://www.figma.com/design/NzVBBNBNBtFNCYIT9PgF6l/Artsy-Website-for-Publisher.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the frontend:
   ```bash
   npm run dev
   ```
3. Start the backend (in another terminal):
   ```bash
   npm run dev:backend
   ```

If you want to run both together:

```bash
npm run dev:all
```

## Backend API + Admin (publisher)

A password-protected backend is available at `http://localhost:4000` by default.

### Setup

1. Copy backend environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Set a secure `ADMIN_PASSWORD` (and optionally `BACKEND_PORT`).
3. Start backend:
   ```bash
   npm run dev:backend
   ```

### Admin UI

- Open `http://localhost:4000/admin`.
- Login with the password from `ADMIN_PASSWORD`.
- From this admin UI you can:
  - Add/edit shipping profiles.
  - Add authors.
  - Add books and assign shipping profiles/authors.
  - Add up to 10 photos per book.
  - Update website settings (featured books, announcements, SEO defaults).
  - View quick dashboard counts and audit log activity.

### Authentication

- `POST /api/auth/login` with `{ "password": "..." }`
- Use returned bearer token in `Authorization: Bearer <token>` header.

### Core API features

- **Books CRUD** with publisher fields (ISBN, SKU, pub date, format, inventory, pricing, SEO, featured flag, draft/published status).
- **Shipping profiles CRUD** and assignment of one profile per book.
- **Photo management** (URL-based) with per-book maximum of **10 photos**.
- **Author management** for linking books to author profiles.
- **Website settings** for homepage featured books, bestseller curation, announcements, and default SEO.
- **Dashboard stats** for quick editorial/commercial overview.
- **Audit log** of admin actions (book/shipping/author/settings changes).

### File storage

- Book photos are stored as URLs in `backend/data/store.json` (works with CDN/S3/media library links).
- Data is persisted in `backend/data/store.json`.
- `backend/.env` is loaded automatically by `backend/server.js`.

## Production build

Create an optimized build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deploy to GitHub Pages

This repo now includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.

### One-time repository setup

1. Push this repository to GitHub.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

### How deployment works

- Every push to `main` triggers the workflow.
- The workflow installs dependencies, builds with Vite, uploads `dist/`, and deploys to GitHub Pages.
- You can also run it manually from **Actions → Deploy to GitHub Pages → Run workflow**.

> Note: GitHub Pages only hosts the frontend static site. The backend (`backend/server.js`) must be deployed on a Node host (Render/Railway/Fly.io/VM) and pointed to by your frontend.

## Going live checklist (e-commerce)

The payment/fulfillment backend runs on Firebase. Before taking real orders:

1. **Secrets (Firebase → Functions → Secrets)** — set real values for:
   - `STRIPE_SECRET_KEY` (live key, `sk_live_...`)
   - `STRIPE_WEBHOOK_SECRET` (from the Stripe webhook endpoint pointing at `stripeWebhook`)
   - `RESEND_API_KEY` (transactional email)
   - `SHIPPO_API_TOKEN` (address verification + labels; without it addresses are flagged unverified and label generation refuses to run)
2. **GitHub secret `FIREBASE_SERVICE_ACCOUNT`** — JSON service-account key so the
   `Deploy Firebase` workflow can ship Firestore rules, indexes, Storage rules
   and Cloud Functions automatically. Until it is set, deploy manually with
   `npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage,functions`.
3. **Stripe webhook** — in the Stripe dashboard add an endpoint for
   `checkout.session.completed` pointing to
   `https://us-central1-lyricalmyrical-web-v2.cloudfunctions.net/stripeWebhook`.
   Orders are created `unpaid` and only this webhook marks them paid,
   decrements stock, counts discount redemptions and records revenue.
4. **Policies** — fill in shipping / returns / privacy / terms in Admin →
   Settings before launch (required by Stripe and card networks).
5. **Tax rates** — Admin → Taxes now supports an optional state/province per
   rate (e.g. Canada + Ontario = 13). Add one row per region you must collect
   in; a row with an empty region is the country-wide fallback.
6. **Allowed origins** — if the site moves to a custom domain, add it to
   `ALLOWED_ORIGINS` in `functions/index.js` and to the OAuth redirect URIs in
   `firebase.json`, and set `SITE_BASE=/` when building.
