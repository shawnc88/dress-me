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

### Phase 5 — iOS App Store submission ⏳ NEXT
- [ ] `cd client && npx cap sync ios` (sync latest web build to native shell)
- [ ] Open in Xcode (`npx cap open ios`)
- [ ] Bump build number in `App/App.xcodeproj` (CURRENT_PROJECT_VERSION)
- [ ] Archive → upload to App Store Connect via Xcode Organizer
- [ ] TestFlight internal testing pass (smoke test signup, login, go-live, IAP sandbox, push notif)
- [ ] App Store Connect → fill in metadata if not done:
  - Support URL: `https://bewithme.live/support`
  - Privacy URL: `https://bewithme.live/privacy`
  - IAP products configured ($24.99 / $44.99 tiers)
- [ ] Submit for App Review
- [ ] Respond to reviewer questions if asked

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
