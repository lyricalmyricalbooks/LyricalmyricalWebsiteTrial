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

## Backend API (publisher admin)

A new password-protected backend is available at `http://localhost:4000` by default.

### Setup

1. Copy backend environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Set a secure `ADMIN_PASSWORD` and `JWT_SECRET`.
3. Start backend:
   ```bash
   npm run dev:backend
   ```

### Authentication

- `POST /api/auth/login` with `{ "password": "..." }`
- Use returned bearer token in `Authorization: Bearer <token>` header.

### Core features

- **Books CRUD** with publisher fields (ISBN, SKU, pub date, format, inventory, pricing, SEO, featured flag, draft/published status).
- **Shipping profiles CRUD** and assignment of one profile per book.
- **Photo management** (URL-based) with per-book maximum of **10 photos**.
- **Author management** for linking books to author profiles.
- **Website settings** for homepage featured books, bestseller curation, announcements, and default SEO.
- **Dashboard stats** for quick editorial/commercial overview.
- **Audit log** of admin actions (book/shipping/author/settings changes).

### File storage

- Book photos are currently stored as URLs in `backend/data/store.json` (compatible with CDN, S3, or media library links).
- Data is persisted in `backend/data/store.json`.

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
