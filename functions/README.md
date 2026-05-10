# Cloud Functions

Three functions:

| Function | Trigger | Purpose |
|---|---|---|
| `onOrderCreated` | Firestore create on `orders/{id}` | Sends order confirmation email to customer + admin notification |
| `onOrderShipped` | Firestore update on `orders/{id}` (when `fulfillmentStatus` becomes `shipped`) | Sends shipping confirmation with tracking |
| `abandonedCartSweep` | Schedule (every 60 min) | Emails customers whose cart entered checkout but did not complete after 1 hour |

## Setup

```bash
cd functions
npm install

# Configure secret
firebase functions:secrets:set RESEND_API_KEY

# Deploy
firebase deploy --only functions
```

`functions/index.js` uses [Resend](https://resend.com) for delivery. Swap to SendGrid or Postmark if preferred — the helper at the bottom of the file is the only place to change.

Update `FROM` to a verified-domain sender before going live.
