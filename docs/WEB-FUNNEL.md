# Web-First Funnel — Be With Me

Status: PLAN (scoping only; nothing implemented except where marked LIVE).
Companion to `docs/ANDROID-DISTRIBUTION.md` on branch `distribution/no-apple`.

## Why web-first

Money paths, by take-home on a $10 purchase:

| Surface | Rail | We keep |
|---|---|---|
| bewithme.live (web + PWA) | Stripe (2.9% + 30¢) | **~$9.41 (~94-97%)** |
| Sideload APK | Stripe | ~97% |
| iOS App Store build | Apple IAP | $7.00-8.50 (70-85%) |
| Google Play build | Play Billing | ~$8.50 (85%) |

Stripe checkout is **already LIVE on prod web** — `SubscribeTierSheet` and
`BuyCoinsModal` both fall through to Stripe whenever `isIAPAvailable()` is
false, i.e. on every browser. No work needed for the money path itself.

## The funnel

```
TikTok / IG / YT Shorts (creator posts clips)
        │  link in bio
        ▼
bewithme.live/profile/[username]   ← creator's OWN bio link (page exists)
   or bewithme.live                ← app-level bio link
        │  in-app browser (TikTok/IG webview) — Stripe works fine here,
        │  even on iPhones; the App Store is not involved on the web.
        ▼
signup → follow → subscribe / buy threads (Stripe)
        ▼
retention: PWA install prompt (LIVE on this branch) · /android APK · web push (LIVE)
```

Key fact: an iPhone user tapping a TikTok bio link lands in a webview on
bewithme.live and pays with Stripe — full price, no Apple, no app install,
regardless of what happens in App Store review.

## Scoped improvements (not implemented — ranked by conversion impact)

1. **Per-creator OG tags** on `/profile/[username]` and `/stream/[id]` —
   avatar, display name, "LIVE now" state in `og:title`/`og:image`. Bio
   links and DM shares currently unfurl generic; a face + LIVE badge is the
   single cheapest CTR win. (Pages router: `getServerSideProps` head tags.)
2. **`/start` landing for the app-level bio link** — hero, live-now rail
   (reuse the browse query), three CTA cards: Watch live / Get the app
   (→ `/android` + PWA prompt) / Become a creator. Today the bare homepage
   does this job passably; `/start` earns its keep once paid/bio traffic is
   real.
3. **First-touch UTM capture** — store `utm_source/medium/campaign` +
   `document.referrer` in localStorage on first hit, attach to the signup
   payload (one nullable column). Without this we'll never know which
   creator/platform converts. Tiny, do it with #1.
4. **Bio-link = invite code** — `/invite/[code]` already exists; give every
   creator a vanity `bewithme.live/@handle`-style short link that sets their
   invite code then redirects to their profile, so creator-driven signups
   attribute automatically.
5. **"LIVE now" badge in link-in-bio tools** — later: a tiny public
   `GET /api/public/creator-status/[username]` for Linktree-style embeds.

Anti-goals: no interstitial "open in app" nag on web (kills webview
conversion), no third-party link-in-bio dependency (bewithme.live IS the
landing page), no spend on paid acquisition until organic bio-link
conversion is measured via #3.
