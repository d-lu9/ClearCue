# Optional caregiver alert service

ClearCue can pair one caregiver device with one patient's device without a ClearCue account. The caregiver installs the same app, enters a 10-character invite code, consents to notifications, and receives a generic push alert about an hour after a scheduled dose if no taken/late/skipped record has reached this service. An alert means **not recorded**, not proof that a dose was missed. It must not be used for emergency or clinical monitoring.

The app remains local by default. Opting in sends only random dose IDs, times, a time zone, and recorded status/dates to this service. Medication names, prescription details, clinician contacts, and the full adherence report are not uploaded. Pairing codes expire in 10 minutes; the patient can revoke access and delete the remote plan, and the caregiver can leave. The service stops alerting after 24 hours without a successful sync and deletes inactive plans after 30 days. Internet, notification permission, and a standalone iOS/Android build with valid push credentials are required. Expo push acceptance does not guarantee device delivery.

## Deploy on Cloudflare's free tier

These are configuration steps, not automatic actions of the app. Check [Workers](https://developers.cloudflare.com/workers/platform/pricing/) and [D1](https://developers.cloudflare.com/d1/platform/pricing/) limits before deploying; usage beyond free limits may require a paid plan. Run from this directory after signing into a Cloudflare account:

1. `npx wrangler@latest d1 create clearcue-caregiver`
2. Copy `wrangler.example.toml` to `wrangler.toml`, then replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` with the returned database ID. The real config is gitignored.
3. `npx wrangler@latest d1 execute clearcue-caregiver --remote --file=./schema.sql`
4. `npx wrangler@latest deploy`
5. Confirm `https://<your-worker>.workers.dev/health` returns `{"ready":true}`.

The app must be built with the public Worker URL in `EXPO_PUBLIC_CAREGIVER_API_URL`. In `mobile/`, set it for the production EAS environment:

`npx eas-cli@latest env:set --name EXPO_PUBLIC_CAREGIVER_API_URL --value https://<your-worker>.workers.dev --environment production --visibility plaintext`

Then create and submit a new TestFlight build. Keep the URL public; **never** put API secrets in an `EXPO_PUBLIC_` variable. The client uses locally stored bearer credentials for each pairing. To test locally, put the same URL in the ignored `mobile/.env.local` file. Without this URL, the caregiver screen explains that setup is unavailable and does not share data.

## Before relying on it

Test on two real phones in a standalone build: successful and expired pairing codes, denied/revoked notification permission, taken/late/skipped updates, an unrecorded dose, offline patient edits, app restarts, Demo Mode pause, midnight and time-zone changes, and patient revocation. Never use the alert as a substitute for checking in directly. The implementation has automated time-window tests but has **not** been validated on a live Cloudflare deployment or two devices.
