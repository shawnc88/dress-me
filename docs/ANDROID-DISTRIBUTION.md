# Android Distribution Plan — Be With Me

Status: PLAN (nothing here is implemented yet). Branch: `distribution/no-apple`.
Written 2026-07-19 while the iOS build sits in App Store review — none of this
touches iOS or prod until merged deliberately.

Goal: ship Be With Me to Android with near-$0 cost, in two lanes:

1. **Sideload APK** served from `bewithme.live/android` (page already built) —
   zero gatekeeper, keeps Stripe, live as soon as we build + sign an APK.
2. **Google Play AAB** ($25 one-time developer account) — discoverability +
   trust, but digital goods must move to Play Billing in that build.

---

## 1. Current shell architecture (what we're mirroring)

The iOS app is a **remote-URL Capacitor shell** — a WKWebView pointed at prod:

- `client/capacitor.config.ts` — `appId: 'me.bewithmeapp.app'`,
  `server.url: 'https://bewithme.live'`, `allowNavigation` for
  `checkout.stripe.com`, `appleid.apple.com`, `*.livekit.cloud`.
- `client/ios/` — the Xcode project. Native code is minimal: splash/status
  bar/keyboard plugins + one custom plugin,
  `client/ios/App/App/Plugins/StoreKitPlugin.swift` (IAP bridge).
- The web app itself deploys to Vercel; the shell never bundles web assets.

The Android target mirrors this exactly: same config file, same remote URL,
same "thin shell + custom billing plugin" shape.

## 2. Add the Android Capacitor target

```bash
cd client
npm install @capacitor/android@^8.3.0   # match @capacitor/core 8.3.x
npx cap add android                      # creates client/android/
npx cap sync android
```

Config deltas in `client/capacitor.config.ts` (shared file, additive only —
iOS section untouched):

```ts
android: {
  allowMixedContent: false,
  backgroundColor: '#070707',
  // Match iOS: no bundled web assets, load bewithme.live remotely.
},
```

Also add `'accounts.google.com'` to `allowNavigation` if/when Google Sign-In
lands. `SplashScreen`/`StatusBar`/`Keyboard` plugin config already in the
file is cross-platform and applies as-is (install the matching
`@capacitor/*` Android deps via the same packages — already in package.json).

Icons/splash: generate from
`client/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
(same source used for the PWA icons in `client/public/`) with
`npx @capacitor/assets generate --android`.

Manual checks in `client/android/app/src/main/AndroidManifest.xml`:

- `android:usesCleartextTraffic` stays false (default).
- Permissions: `INTERNET`, `CAMERA`, `RECORD_AUDIO`, `POST_NOTIFICATIONS`
  (LiveKit publishing needs camera/mic at runtime; WebView prompts bridge to
  Android runtime permissions — verify on device).

**Push note (follow-up, not blocking):** the web-push service worker
(`client/public/sw.js`) does not run inside the Android WebView shell —
Android WebView has no Notification/Push API. The Play/sideload shell needs
`@capacitor/push-notifications` + FCM later. The PWA (Chrome) gets web push
for free today.

**Minimum-functionality risk:** Google rejects bare webview wrappers more
rarely than Apple, but the same mitigations apply — native splash, push,
billing plugin, camera/mic bridging all count as native functionality.
(Alternative Play-only route: a TWA via Bubblewrap on top of the PWA — even
thinner, but Play Billing is still required for digital goods via the
Digital Goods API, so Capacitor + one Kotlin plugin is the better fit here.)

## 3. Signing keystore (one-time, NEVER commit)

```bash
keytool -genkeypair -v \
  -keystore bewithme-release.keystore \
  -alias bewithme \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Be With Me, O=1 Stop Resolutions LLC, C=US"
```

- Store the keystore + both passwords in the password manager. Losing it
  bricks sideload updates (users must uninstall/reinstall).
- Keep it OUT of the repo (`client/android/keystore.properties` pattern,
  gitignored; reference from `android/app/build.gradle` `signingConfigs`).
- For Play: enroll in **Play App Signing** (Google holds the app signing
  key; our keystore becomes the upload key — losing it is then recoverable).
- The **sideload APK and the Play build must use the same `applicationId`**
  (`me.bewithmeapp.app`) if we ever want sideload users to migrate to Play
  updates... but they must ALSO be signed with the same key. With Play App
  Signing they won't be. Decision: accept that sideload → Play migration is
  uninstall/reinstall, OR opt out of Play App Signing. Recommend: accept it
  (Play App Signing is worth more).

## 4. Building releases

Version in `client/android/app/build.gradle`: `versionCode` (int, bump every
release) + `versionName` ("1.0.0").

**Sideload APK** (Stripe stays, no Play involvement):

```bash
cd client/android
./gradlew assembleRelease
# → app/build/outputs/apk/release/app-release.apk (signed via signingConfig)
cp app/build/outputs/apk/release/app-release.apk \
   ../public/downloads/bewithme.apk       # served at bewithme.live/downloads/bewithme.apk
```

The `/android` page (client/src/pages/android.tsx) already points at that
path. Committing the APK into `client/public/downloads/` is fine at ~5-15MB
(thin shell, no web assets); if it bloats, move to a Vercel-adjacent bucket
later.

**Play AAB:**

```bash
./gradlew bundleRelease
# → app/build/outputs/bundle/release/app-release.aab → upload in Play Console
```

Play Console checklist ($25 one-time, play.google.com/console):
- Internal testing track first; license testers for Billing test purchases.
- Data safety form (we collect: email, name, photos/videos, purchase
  history; mirror `docs/APP_STORE_METADATA.md` privacy answers).
- Content rating questionnaire — declare UGC + live streaming (requires
  moderation/report/block story; we have ReportSheet + admin reports).
- Target API level: Play requires targeting a recent Android API (34/35 as
  of 2026) — Capacitor 8 templates already comply; don't downgrade.
- App access: supply a demo login for review (reuse the App Store review
  demo account from `docs/APP_STORE_METADATA.md`).

## 5. Play Billing scoping (NOT implemented — map only)

### The StoreKit pattern as it exists today

| Piece | File | What it does |
|---|---|---|
| Native bridge | `client/ios/App/App/Plugins/StoreKitPlugin.swift` | `getProducts` / `purchase(appAccountToken)` / `restorePurchases` / `getActiveSubscriptions` + `Transaction.updates` listener; auto-`finish()`es every transaction; **never exposes the JWS** (`transactionToDict` omits `signedTransactionInfo`) |
| JS service | `client/src/services/iap.ts` | product IDs + tier map, `prepare-iap` handshake (random UUID `appAccountToken` → server mapping), purchase/restore/sync calls |
| JS store | `client/src/store/iapStore.ts` | zustand wrapper: initialize/purchase/restore, tier→product lookup |
| Gating | `client/src/utils/platform.ts` | `shouldUseAppleIAP() === isIOS()`; purchase UIs (`SubscribeTierSheet`, `BuyCoinsModal`) branch IAP vs Stripe on it |
| Server verify | `server/src/services/appleIap.ts` | hand-rolled JWS x5c chain verification pinned to Apple Root CA G3, ES256/ieee-p1363 |
| Consumables | `server/src/routes/threads.ts` `POST /api/threads/apple-iap` | verifies JWS, maps product→coins (`APPLE_THREAD_PRODUCTS`), idempotent via `stripePaymentId = "apple_" + transactionId` |
| Subscriptions | `server/src/routes/fanSubscriptions.ts` | `POST /prepare-iap` (appAccountToken→user/creator/tier mapping, INCOMPLETE sub row), `POST /webhook/apple` (Server Notifications V2: verify JWS → bundleId check → `webhookEventLog` idempotency → tier map → activate sub) |

### StoreKit → Play Billing equivalence map

| StoreKit touchpoint | Play Billing equivalent |
|---|---|
| `StoreKitPlugin.swift` (Capacitor plugin) | New `PlayBillingPlugin.kt` wrapping `com.android.billingclient:billing-ktx` (v7+); registered as `registerPlugin('PlayBilling')` beside the StoreKit proxy in `iap.ts` |
| `Product.products(for:)` | `queryProductDetailsAsync` (`ProductType.SUBS` for tiers, `INAPP` for thread packs) |
| `product.purchase(options: [.appAccountToken(uuid)])` | `launchBillingFlow` with `setObfuscatedAccountId(uuid)` (≤64 chars — our UUID fits). **Keep the `/prepare-iap` handshake identical**; Google echoes the id back via `externalAccountIdentifiers.obfuscatedExternalAccountId` |
| `transaction.finish()` (plugin auto-finishes) | `acknowledgePurchase` (subs) / `consumeAsync` (thread packs). **New failure mode: un-acknowledged purchases auto-refund after 3 days.** Do NOT mirror iOS's finish-before-server-credit; acknowledge only after the server confirms the credit |
| `Transaction.updates` listener | `PurchasesUpdatedListener` + `queryPurchasesAsync` on app resume (Play delivers no updates while app is dead) |
| `AppStore.sync()` + `Transaction.currentEntitlements` (restore) | `queryPurchasesAsync(SUBS)` + `(INAPP)` — no user re-auth prompt needed |
| Client sends JWS / parsed tx; server does x5c crypto (`appleIap.ts`) | Client sends only the **`purchaseToken`**; server calls Play Developer API (`androidpublisher` v3): `purchases.subscriptionsv2.get` / `purchases.products.get` with a **service-account JSON key**. No local crypto — Google's API is the source of truth. New `server/src/services/googlePlay.ts` |
| App Store Server Notifications V2 → `POST /api/fan-subscriptions/webhook/apple` | **Real-Time Developer Notifications** (Cloud Pub/Sub push) → new `POST /api/fan-subscriptions/webhook/google`. RTDN carries only `{purchaseToken, subscriptionNotification.notificationType}` — always follow up with a Developer API fetch. Verify the push via Pub/Sub OIDC token. Idempotency: reuse `webhookEventLog` keyed `google_<messageId>` |
| Idempotency key `stripePaymentId = "apple_" + transactionId` | `"google_" + orderId` (orderId from the Developer API response, not the client) |
| `env.IOS_BUNDLE_ID` bundle check | `ANDROID_PACKAGE_NAME` check (`packageName` in API responses) + new env: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (add to `server/src/config/env.ts` as optional, like `IOS_BUNDLE_ID`) |
| `shouldUseAppleIAP()` | New `shouldUsePlayBilling()`: `isAndroid()` **AND installed from Play** — plugin exposes `getInstallSource()` (`packageManager.getInstallSourceInfo().installingPackageName === 'com.android.vending'`). Sideloaded APK → falls through to the existing Stripe path untouched |

### ⚠️ Product catalog — do NOT copy Apple's IDs

App Store Connect has the **supporter/inner_circle product IDs crossed**
(`supporter_monthly` is priced as the $44.99 Inner Circle tier and vice
versa — see the warning block in `client/src/services/iap.ts`
`PRODUCT_TIER_MAP`; Apple can't rename product IDs so it's frozen there).
Play is a fresh catalog: **create correctly-named IDs**
(`supporter_monthly` = $4.99 Supporter, etc.) and introduce a
**per-platform tier map** (`PLAY_PRODUCT_TIER_MAP` client + server) instead
of reusing the crossed Apple map. Same six subs + four thread packs
(`threads_500/1050/5500/11500` — note their coin values come from
`THREAD_PRODUCT_MAP`/`APPLE_THREAD_PRODUCTS`, which don't match the ID
numbers either; keep the server map authoritative).

### Three biggest lessons from the StoreKit implementation to carry over

1. **The webhook, not the client, must activate entitlements.** The whole
   `/prepare-iap` UUID-handshake exists because the client can die between
   purchase and sync. On Play the same design works unchanged
   (obfuscatedAccountId), and RTDN is the Apple-webhook analogue.
2. **Never trust client-parsed transactions.** The iOS plugin can't expose
   the JWS, forcing the server to accept parsed objects on `/restore` (a
   documented trust compromise) and breaking consumable crediting paths
   that REQUIRE the JWS. Play is strictly better: the `purchaseToken` is
   always available client-side and the server verifies it directly with
   Google — make the Developer API lookup the ONLY trusted path from day 1.
3. **Finish/acknowledge semantics decide whether users get charged without
   credit.** iOS auto-`finish()`es in the plugin before the server credits
   (bugs there caused charged-but-uncredited threads). Play's 3-day
   acknowledge window is the fix-shaped version of this: acknowledge/consume
   ONLY after the server has durably credited, and let Google auto-refund if
   we truly failed.

## 6. What Google requires re: payments

- **Distributed via Play** → all in-app purchases of *digital* goods
  (threads, subscription tiers) MUST use Play Billing. Google's service fee:
  15% on subscriptions and (with the small-business program, <$1M/yr) 15% on
  other digital goods. US user-choice-billing programs exist but only shave
  ~4% and add complexity — ignore for now.
- **Sideloaded APK** (bewithme.live/android) → no Play policies apply;
  Stripe stays, we keep ~97%.
- **Web (incl. PWA)** → Stripe stays.
- Cross-surface rule of thumb: the Play build must not *steer* users to
  external payment (no "cheaper on the web!" buttons inside the Play build),
  but accounts and balances may be shared across surfaces. Threads bought on
  web are spendable in the Play app — that's fine.

## 7. Suggested execution order (when green-lit)

1. `cap add android` + device smoke test of the shell (streams, camera/mic,
   Stripe checkout in the sideload build). ~half a day.
2. Keystore + signed APK → drop into `client/public/downloads/bewithme.apk`,
   flip the `/android` page live. Sideload lane DONE, $0.
3. Play Console account ($25) + internal testing track with the same build
   (Stripe still in — internal testing only, not production review).
4. PlayBillingPlugin.kt + `googlePlay.ts` verify service + `/webhook/google`
   + per-platform product map (the table above). Production Play release
   only after this.
