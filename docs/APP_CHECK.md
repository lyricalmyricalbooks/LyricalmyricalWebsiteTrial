# Firebase App Check (bot protection)

The code is ready; it switches on once the owner adds a reCAPTCHA key. Until then nothing changes.

1. Firebase console → **App Check** → register the web app with **reCAPTCHA v3** (create the site key at google.com/recaptcha/admin; add the GitHub Pages domain).
2. Add the **site key** as a GitHub repository secret/variable `VITE_APP_CHECK_SITE_KEY` and pass it to the build step in `.github/workflows/deploy-pages.yml` (`env: VITE_APP_CHECK_SITE_KEY: ${{ secrets.VITE_APP_CHECK_SITE_KEY }}`).
3. Deploy, watch the App Check **Metrics** tab until almost all requests are "verified", then turn on **Enforce** for Firestore (and Storage).

Do not enforce before the key is live in production: shoppers on an older cached build would be blocked.
Rate limits (order lookup, discount codes, checkout) already work without App Check: `functions/rateLimit.js`.
