# Firebase Hosting for the storefront

GitHub stays the code home. Firebase Hosting (project `lyricalmyrical-web-v2`) can serve the
built storefront at the domain root; GitHub Pages keeps deploying under
`/LyricalmyricalWebsiteTrial/` and is the rollback path until the new host is verified.

## What is set up

- `firebase.json` › `hosting`: serves `dist/`, rewrites unknown paths to `/index.html` (SPA
  fallback), `cleanUrls` + `trailingSlash: false` so prerendered `books/<slug>/index.html` files
  answer `/books/<slug>` (matching the canonical URLs). Hashed `/assets/**` are cached for a year;
  HTML, sitemap and robots are `no-cache`. The Pages-only `404.html` redirect is not uploaded.
- `.github/workflows/hosting-preview.yml`: every same-repo pull request builds with `SITE_BASE=/`
  and deploys to a 7-day preview channel; the action comments the URL on the PR.
- `.github/workflows/hosting-production.yml`: deploys the live Hosting channel with
  `firebase deploy --only hosting`. "Run workflow" always deploys; pushes to `main` and the
  15-minute published-content check deploy only when the repository variable
  `FIREBASE_HOSTING_LIVE` is `true`.
- Neither workflow deploys rules or Functions; `deploy-firebase.yml` still owns those and runs
  `--only firestore:rules,firestore:indexes,storage,functions`.
- `functions/allowedOrigins.js`: CORS, Stripe/PayPal return URLs accept the Hosting addresses
  (`lyricalmyrical-web-v2.web.app`, `.firebaseapp.com`) and this project's preview channels.
  Payment totals, webhook authority and order logic are unchanged.

Build variables: `SITE_BASE=/` and `SITE_URL` (repository variable `HOSTING_SITE_URL`, default
`https://lyricalmyrical-web-v2.web.app`; set it to the shop domain when it moves).

## Owner setup (needs the Google/Firebase accounts)

1. Service account in the `FIREBASE_SERVICE_ACCOUNT` secret needs **Firebase Hosting Admin**
   (Firebase Admin already includes it) and **API Keys Viewer**; open Hosting once in the
   Firebase console if the default site does not exist yet.
2. Firebase Auth › Settings › Authorized domains: `web.app`/`firebaseapp.com` are there by
   default. Preview channels are not (no wildcards), so admin Google sign-in only works on a
   preview after adding that exact channel host. Add the shop domain before switching.
3. reCAPTCHA Enterprise key (App Check): add `lyricalmyrical-web-v2.web.app`, preview hosts you test
   on, and the shop domain to the key's allowed domains.
4. Deploy Functions (via `deploy-firebase.yml`) so the new allowed origins are live before
   testing checkout on a Hosting URL.
5. Stripe: register the Hosting/shop domain for wallets (Settings › Payments wallet-domain button).
6. Budget alert in Google Cloud Billing for the project.

## Switching the domain (later, owner-approved)

Connect the domain in Firebase console › Hosting › Add custom domain, update DNS, set
`HOSTING_SITE_URL` to it, set `FIREBASE_HOSTING_LIVE=true`, and set the Functions `SITE_URL`
env (email links) to the new address. Keep Pages running until the new host is verified;
roll back with Hosting › Release history or by pointing DNS back.
