# iOS Pre-Flight Audit — Be With Me (2026-05-17)

Run before Xcode Archive + TestFlight upload.

`npx cap sync ios` completed cleanly. Three Capacitor plugins synced (keyboard, splash-screen, status-bar). Web asset directory "missing" warning is expected — this is a remote-loaded Capacitor app (`server.url: https://bewithme.live`).

---

## 🚨 MUST FIX before Archive

### 1. Push notifications won't work in production

**File:** `client/ios/App/App/App.entitlements`

```xml
<key>aps-environment</key>
<string>development</string>     <!-- ← will not deliver pushes in TestFlight or App Store -->
```

**Fix:** Change `development` → `production`, OR (preferred) open Xcode → Signing & Capabilities → Push Notifications → toggle off and back on. Xcode will auto-manage the entitlement value per build configuration.

If shipped as `development`, your Capacitor push registration will succeed silently but no devices will receive notifications in production. Discoverable only by post-launch debugging, which is bad timing.

### 2. NSUserTrackingUsageDescription declared but ATT never requested

**File:** `client/ios/App/App/Info.plist:49`

```xml
<key>NSUserTrackingUsageDescription</key>
<string>Be With Me uses this to personalize content recommendations...</string>
```

But: grep of the entire `client/` directory for `AppTracking` / `requestTrackingAuthorization` / `ATTrackingManager` finds **zero hits outside Info.plist**. The app declares it tracks users but never asks for permission.

**Why App Review cares:** Standard Apple review question — "Where in the user flow do you request tracking authorization?" If your answer is "we don't," reviewer will tell you to remove the key.

**Fix:** Remove the `NSUserTrackingUsageDescription` key + string. If you later add a tracking SDK (Meta Pixel, AppsFlyer, etc.) and need ATT, re-add it then.

### 3. Build number conflict risk

**File:** `client/ios/App/App.xcodeproj/project.pbxproj`

Current settings (both Debug + Release):
- `MARKETING_VERSION = 1.0`
- `CURRENT_PROJECT_VERSION = 1`

**If you've ever uploaded build 1 to App Store Connect before** (even for a deleted/rejected attempt), the next archive will fail upload with "Build already exists."

**Fix:** Before Archive, bump `CURRENT_PROJECT_VERSION` to `2` (or higher). Marketing version `1.0` stays unless you want to call it 1.0.1 / 1.1 publicly.

In Xcode: select the App target → General → "Build" field → increment.

---

## ✅ Verified clean

| Item | Status |
|---|---|
| Bundle ID consistent | `me.bewithmeapp.app` in both `capacitor.config.ts` and Xcode `PRODUCT_BUNDLE_IDENTIFIER` |
| App display name | "Be With Me" |
| Server URL | `https://bewithme.live` (remote-loaded; HTTPS-only) |
| App Transport Security | Locked down — `NSAllowsArbitraryLoads: false`, explicit exceptions for `bewithme.live` + `livekit.cloud` only |
| WKAppBoundDomains | Restricts WebView to `bewithme.live` + `www.bewithme.live` — Apple-recommended for Capacitor remote-load apps |
| Usage descriptions | Camera, microphone, photo library, local network all have user-facing strings ✓ |
| Background modes | `audio` — needed for live streams continuing when app backgrounded ✓ |
| Encryption export compliance | `ITSAppUsesNonExemptEncryption = false` — skips encryption review ✓ |
| App icon | Single 1024×1024 PNG with `idiom: universal` — modern Xcode 15+ format, auto-generates all sizes ✓ |
| Orientation | Portrait-only (matches typical creator/social app pattern) ✓ |
| Allow-navigation domains | Stripe Checkout (`checkout.stripe.com`), Apple ID auth (`appleid.apple.com`), LiveKit (`*.livekit.cloud`) all whitelisted in Capacitor config ✓ |
| Capacitor plugins synced | keyboard, splash-screen, status-bar (all v8.x) ✓ |

---

## ℹ️ App Store review note (not a fix, just be ready)

This is a **remote-URL Capacitor app**. Apple's Guideline 4.2 ("Minimum Functionality") sometimes flags apps that are "just a web wrapper." Your app likely passes 4.2 because it integrates:
- Push notifications (Capacitor Push)
- Apple In-App Purchase (native IAP, not Stripe in-app)
- Camera + microphone for live streaming
- Local network for LiveKit WebRTC
- Background audio mode

If 4.2 comes up in review, the response is: "The app provides native iOS functionality (Push, IAP, camera capture, WebRTC) that cannot be delivered via Safari alone. It is not a wrapper but a hybrid app."

---

## ✅ Pre-flight summary — what's required before you Archive

1. **Fix entitlement** — `aps-environment` → `production` (Xcode: toggle Push Notifications capability)
2. **Remove ATT usage description** — delete `NSUserTrackingUsageDescription` from `Info.plist`
3. **Bump build number** — `CURRENT_PROJECT_VERSION` → 2 (only if you've uploaded build 1 before; if first ever, leave at 1)

Estimated time: 5 minutes in Xcode for #1, 1 minute editing Info.plist for #2, 1 minute in Xcode for #3.

After those: Product → Archive → Distribute → App Store Connect → Upload.
