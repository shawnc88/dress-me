# Production Launch — Be With Me

**Status as of 2026-05-17:** Production is live. App Store submission and final domain-migration verification remain.

This doc is the source of truth for "where are we in the launch" — read it first when picking up work.

---

## Live now (verified 2026-05-16)

| Surface  | URL                                  | Host       | State                                    |
|----------|--------------------------------------|------------|------------------------------------------|
| Client   | https://bewithme.live (+ www)        | Vercel     | 200, HSTS, CSP, all sampled routes 200   |
| API      | https://dress-me-api.onrender.com    | Render     | `/health` 200, DB connected, CORS OK     |
| DB       | be-with-me-db                        | Render PG  | Prisma migrations auto-run on deploy     |
| Email    | bewithme.live                        | Resend     | DKIM + SPF set at Hostinger              |
| iOS      | TestFlight / App Store               | Apple      | In Apple review prep                     |

Stack: Next.js + Capacitor (client) · Express + Prisma + Socket.IO (server) · Mux + LiveKit (streaming) · Stripe + Apple IAP (payments) · Sentry (errors).

---

## Done (✅)

- App Store pre-launch security/payments audit (`d4ea237`)
- Privacy/terms/safety docs at App Store review depth (`21a3915`, `ecca4fb`)
- IAP pricing aligned to Apple ($24.99 / $44.99) (`1d62477`)
- `/support` page for App Store Support URL (`968d9b0`)
- iOS Push Notifications + IAP capabilities entitlements (`8ce7dc9`)
- Domain code migration to `bewithme.live` (`e5dcd12`, see `docs/DOMAIN_MIGRATION.md`)
- CI: typecheck (server + client) + unit tests (`cdc9375`) — 19/19 passing on GH Actions

---

## Phases & status

### Phase 1 — Production state verification ✅ DONE
HTTP smoke test confirmed client, API, DNS, headers, CORS all green.

### Phase 2 — Domain migration verification ✅ DONE
DNS, Resend, Render env vars, forgot-password e2e all verified. Only optional cleanup remains.

- [x] Hostinger DNS Zone has Resend MX/TXT/DKIM records — verified via public DNS 2026-05-17: MX `send` → `feedback-smtp.us-east-1.amazonses.com` · SPF TXT `send` → `v=spf1 include:amazonses.com ~all` · DKIM TXT `resend._domainkey` present · DMARC TXT `_dmarc` → `v=DMARC1; p=none;`
- [x] Resend dashboard shows `bewithme.live` as **Verified** (green) — confirmed (emails are flowing in prod)
- [x] Render env vars on `be-with-me-api` — confirmed (forgot-password emails delivered in prod):
  - [x] `CLIENT_URL = https://bewithme.live`
  - [x] `VAPID_SUBJECT = mailto:admin@bewithme.live`
  - [x] `EMAIL_FROM = Be With Me <noreply@bewithme.live>`
  - [x] `RESEND_API_KEY = re_...`
- [x] End-to-end forgot-password test on https://bewithme.live/auth/login — verified months ago, working in prod
- [ ] (Optional, not blocking) Vercel: 301 redirect from `dressmeapp.me` → `https://bewithme.live`

### Phase 3 — CI/test gates ✅ DONE
- Unit tests: 19/19 (`npx vitest run tests/unit`)
- Server tsc: clean
- Client tsc: clean
- Server + client build: clean
- CI workflow now runs all three on every push/PR
- Skipped: lint (no eslint v9 configs in server/client — pre-existing, not blocking launch)
- Skipped: integration tests (need running server + DB)

### Phase 4 — HTTP smoke test ✅ DONE
All 13 sampled client routes 200. API endpoints behave correctly (401/400/200 on expected shapes). Security headers fully set.

Not HTTP-verifiable (needs browser/device — manually walk these on prod):
- Signup → email confirmation (Resend delivery)
- Login → JWT round-trip + session
- Go-live (Mux/LiveKit ingest) + viewer-join realtime notification
- Gift/tip animations and persistence
- IAP sandbox purchase
- Stripe web checkout
- Forgot-password email delivery (covered by Phase 2 last item)
- iOS native flows

### Phase 5 — iOS App Store submission ⏳ IN PROGRESS (paused 2026-05-19 ~18:30)

**Resume here:** Build 3 is "Ready to Submit" in App Store Connect TestFlight tab. Installed and running on iPhone 17 via TestFlight. **BLOCKER FOUND during smoke test:** the iOS app routes thread purchases + creator subscriptions through Stripe instead of Apple IAP, violating App Store Guideline 3.1.1. **Must fix before submission.**

#### 5a. Build + upload ✅ DONE
- [x] `cap sync ios` clean
- [x] Display Name = "Be With Me", iPad removed, Team = SHAWN EDMOND CODY (86CMXZP2MZ)
- [x] App ID `me.bewithmeapp.app` registered with Push + IAP capabilities
- [x] Apple Distribution certificate created
- [x] iPhone 17 registered (UDID `00008150-000C18811161401C`)
- [x] Archive succeeded
- [x] Builds 2 + 3 uploaded → Apple processed → "Ready to Submit"
- [x] Added self as Internal Tester + invited + accepted on iPhone TestFlight app
- [x] Build 3 installed and launches on real iPhone

#### 5b. ✅ ROOT CAUSE FOUND — fix committed, awaiting native rebuild (Build 4)

**Symptom:** On iPhone TestFlight build, tapping **Buy Threads** or **Subscribe to creator** shows "An error occurred with our connection to Stripe." IAP falls through to Stripe → Guideline 3.1.1 rejection risk.

**Root cause (confirmed 2026-05-20 via on-device debug strip):**
The `DebugCapacitor` strip on the TestFlight build reported:
```
core.getPlatform():      web
core.isNativePlatform(): false
window.Capacitor:        PRESENT
bridge.getPlatform():    web      ← native bridge values absent
bridge.isNative:         undefined
bridge.platform prop:    undefined
isIAPAvailable():        false
```
`window.Capacitor` is present but it is only the **web stub** from the bundled `@capacitor/core` — the native iOS bridge never injected. Cause: **`WKAppBoundDomains` in `client/ios/App/App/Info.plist`.** Declaring that key opts the whole app into Apple's App-Bound Domains mode; any `WKWebView` that does not set `limitsNavigationsToAppBoundDomains = true` then loses the ability to run injected `WKUserScript`s — and the Capacitor native bridge *is* a `WKUserScript`. `capacitor.config.ts` never set `limitsNavigationsToAppBoundDomains`, so the bridge silently failed to inject → every native plugin (StoreKit, StatusBar, SplashScreen, Keyboard) was dead, not just IAP.

`WKAppBoundDomains` had been in `Info.plist` since the iOS project's first commit (`129ecaf`) and was never needed.

**Fix applied:** Removed the `WKAppBoundDomains` key + array from `Info.plist`. (Not the opt-in route — `limitsNavigationsToAppBoundDomains: true` would restrict navigation to only `bewithme.live`, breaking Stripe checkout, Apple sign-in, and LiveKit.)

**This requires a native rebuild — Build 4.** Unlike the earlier JS-only fixes that reached the device via Vercel (the app remote-loads `server.url`), `Info.plist` is compiled into the binary. Steps on the Mac:
1. `git pull` (picks up the Info.plist change)
2. `cd client && npx cap sync ios`
3. Xcode → Archive → upload to App Store Connect (bump build number → Build 4)
4. Install Build 4 from TestFlight on the iPhone
5. Confirm the red debug strip now shows `core.getPlatform(): ios`, `bridge.isNative: true`, `isIAPAvailable(): true`
6. Once verified, remove `DebugCapacitor.tsx` + its mount in `_app.tsx`, then re-test Buy Threads / Subscribe (Apple's native sheet must appear, not Stripe)

#### 5c. Remaining work after IAP is fixed
- [ ] Re-verify Buy Threads + Subscribe work end-to-end in sandbox (Apple's native sheet appears, not Stripe)
- [ ] Capture 5 screenshots from TestFlight build (6.5" iPhone, 1242×2688 or 1284×2778). Shots: home feed live stream, gift panel open, creator profile w/ tier prices, go-live camera screen, reel feed
- [ ] Verify reviewer account still works: `reviewer@bewithme.live` / `appreviewer` / `BeWithMe2026!`. Paste into App Store Connect → App Review Information → Sign-In
- [ ] App Store Connect → Distribution tab → attach build 3 to Version 1.0
- [ ] Fill App Store Connect metadata using `docs/APP_STORE_METADATA.md` (all copy is pre-written there)
- [ ] Complete App Privacy questionnaire (cheat-sheet at bottom of metadata doc)
- [ ] Submit for App Review

**Critical references:**
- `docs/APP_STORE_METADATA.md` — all copy-paste-ready App Store text + reviewer notes
- `client/src/services/iap.ts` — IAP detection logic, current fix at lines 50-58 + 105-114
- `client/src/components/payment/BuyCoinsModal.tsx` — thread purchase modal, fallback-to-Stripe path at line ~144
- `client/ios/App/App/Plugins/StoreKitPlugin.swift` — native iOS plugin (verified exists + properly registered)
- Vercel Root Directory must remain `client` — do NOT revert

### Phase 6 — Post-launch monitoring (after App Store approval)
- [ ] Watch Sentry for first 24-48h of errors (`@sentry/node` server, `@sentry/nextjs` client)
- [ ] Watch Render logs for `[email] Password reset` lines + any 5xx spikes
- [ ] Verify Stripe webhooks firing (`STRIPE_WEBHOOK_SECRET` configured)
- [ ] Verify Mux webhooks firing (`MUX_WEBHOOK_SECRET` configured)

---

## Optional cleanup (not blocking launch)

- Rename Render service from `dress-me-api` → `be-with-me-api` (purely cosmetic; URL changes too)
- Set up ESLint v9 flat configs for server + client (lint scripts currently broken)
- Add integration tests to CI (needs Postgres + Redis services in the workflow)
- Update `client/.env.production` `NEXT_PUBLIC_API_URL` if Render service is ever renamed

---

## Key references

- Domain handoff: `docs/DOMAIN_MIGRATION.md`
- Render config: `render.yaml` (server) — Render auto-deploys on push to main
- Vercel: auto-deploys client on push to main
- iOS native: `client/capacitor.config.ts`, `client/ios/App/App/Info.plist`
- CI: `.github/workflows/typecheck.yml` (named "CI" — unit-tests + server tsc + client tsc)
- Test setup: `tests/setup.ts` (sets env defaults so vitest loads server modules)
