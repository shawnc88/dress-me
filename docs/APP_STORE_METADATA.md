# App Store Connect Metadata — Be With Me

Copy/paste-ready text for App Store Connect → App Information + Version 1.0.

Character limits noted next to each field. All under limit.

---

## App Information (set once, mostly permanent)

**Name** (30 chars max)
```
Be With Me
```

**Subtitle** (30 chars max — appears under app name in search)
```
Live fashion shows & shopping
```
*(29 chars)*

**Bundle ID:** `me.bewithmeapp.app` (already set)

**Primary Category:** Lifestyle
**Secondary Category:** Shopping

**Content Rights:** Yes, your app contains, displays, or accesses third-party content (user-generated streams)

**Age Rating:** 17+
- Infrequent/Mild Mature/Suggestive Themes (user-generated content)
- Frequent/Intense Simulated Gambling: No
- Unrestricted Web Access: No

---

## Pricing & Availability

**Price:** Free (subscriptions/IAP handle monetization)
**Availability:** All territories (or restrict if you have geo-specific concerns)

---

## Version 1.0 Information

### Promotional Text (170 chars — editable anytime without resubmit)
```
Live fashion shows from real creators. Try outfits in real time, chat with stylists, and shop the looks you love — all in one app.
```
*(146 chars)*

### Description (4000 chars max)
```
Be With Me is where fashion happens live.

Watch creators go live with daily style sessions, get-ready-with-me streams, and try-on hauls. Drop into the chat, send a gift to react, and shop pieces straight from the stream — all while it's happening.

WHAT YOU CAN DO

• Watch live fashion streams from creators around the world
• Browse short-form Reels for outfit inspo when nothing's live
• Follow your favorite creators and get notified when they go on
• Send threads (our in-app coins) to support creators and unlock reactions
• Subscribe to a creator at Supporter, VIP, or Inner Circle tier for exclusive streams and 1-on-1 sessions
• Shop looks featured during streams without leaving the broadcast
• Save outfits to your closet and share them with friends

FOR CREATORS

Going live takes one tap. Set your tiers, set your price, and start broadcasting. Real-time chat, gift animations, viewer counts, and instant payouts when you hit threshold. We handle the streaming infrastructure (HLS adaptive bitrate, low-latency chat over WebSocket) so you can focus on the show.

WHY IT'S DIFFERENT

Most fashion apps are scrolling feeds. Be With Me is conversations — between you, the creators you love, and the community of people watching alongside you. Every stream is interactive. Every purchase comes with context. Every creator is someone you can actually talk to.

SUBSCRIPTIONS

Subscriptions auto-renew monthly or yearly until canceled. Manage or cancel anytime in Settings → Apple ID → Subscriptions. Payment is charged to your Apple ID at confirmation of purchase. Any unused portion of a free trial is forfeited when you purchase a subscription, if applicable.

THREADS (in-app coins)

Threads are a virtual currency used to send gifts and reactions during streams. Threads are non-refundable and have no cash value.

Terms: https://bewithme.live/terms
Privacy: https://bewithme.live/privacy

Built for people who think outfits should be a conversation, not a thumbnail.
```
*(~1750 chars — well under 4000)*

### Keywords (100 chars max — comma-separated, no spaces after commas)
```
fashion,live,stream,outfit,style,shopping,creator,try-on,haul,ootd,lookbook,wardrobe,closet
```
*(99 chars)*

### What's New in This Version (4000 chars max — for v1.0 it's just launch text)
```
Welcome to Be With Me — the first version. Live fashion streams, creator subscriptions, and in-stream shopping, all in one app.
```

### Support URL
```
https://bewithme.live/support
```

### Marketing URL (optional)
```
https://bewithme.live
```

### Privacy Policy URL
```
https://bewithme.live/privacy
```

---

## App Review Information

### Sign-In Required: YES (app gates content behind login)

**Username:**
```
reviewer@bewithme.live
```

**Password:**
```
[CREATE A REVIEWER ACCOUNT — see action item below]
```

**Action item:** Sign up a real account at https://bewithme.live/auth/signup using `reviewer@bewithme.live` (or similar) with a memorable password, then drop the credentials in here. The account should be on the Inner Circle tier with some threads in the wallet so the reviewer can see paid features.

### Contact Information
- First name / Last name: (yours)
- Phone: (yours, with country code)
- Email: codytrucking247@gmail.com

### Notes for Reviewer (this is what unsticks Guideline 4.2)
```
Be With Me is a live fashion-streaming platform. The app is a hybrid native/web app built with Capacitor — the UI is delivered from https://bewithme.live, and the following native iOS capabilities are integrated:

• Push Notifications (APNs via Capacitor Push)
• In-App Purchase (StoreKit 2 — subscription tiers + consumable threads)
• Camera + Microphone (live broadcast capture)
• Local Network (LiveKit WebRTC peer connections)
• Background Audio (keeps streams audible when app is backgrounded)

The app is NOT a Safari wrapper around a website. The integrations above cannot be delivered through mobile web alone.

TESTING THE APP

1. Sign in with the reviewer account above (already has Inner Circle tier and threads).
2. Tap a live stream on the Home feed to watch a creator broadcasting.
3. Open the gift panel and send a thread reaction — this is consumed-IAP-backed (sandbox).
4. Open a creator profile → Subscribe → select VIP Monthly to test auto-renewable IAP flow.
5. To test broadcasting: tap the center "Go Live" button, grant camera + mic permissions, and start a test stream.

IAP PRODUCTS (configured in App Store Connect — bwm_* generation, IDs match
display names and prices; the original un-prefixed products had mismatched
IDs and were removed from sale after the Guideline 3.0 rejection):
- Subscriptions: bwm_supporter_monthly/yearly ($4.99 / $49.99),
  bwm_vip_monthly/yearly ($19.99 / $199.99),
  bwm_inner_circle_monthly/yearly ($39.99 / $399.99)
- Consumables: bwm_threads_500 ($4.99), bwm_threads_1200 ($9.99),
  bwm_threads_3500 ($24.99), bwm_threads_8000 ($49.99)

PUSH NOTIFICATIONS: registered on app launch after permission grant. Notifications fire when a followed creator goes live.

If the reviewer prefers a TestFlight build instead, we're happy to send one — just let us know.
```

### Attachment (optional)
Skip unless review feedback requests it.

---

## App Privacy (separate questionnaire — answer truthfully)

Data linked to user (you collect via signup/usage):
- Name, Email Address, User ID
- Purchase History
- Photos (uploaded avatar)
- Camera + Microphone (live capture — but if you don't *store* the recordings beyond Mux playback, mark transient)
- Coarse Location (if IP-derived) — optional
- Crash Data + Performance Data (Sentry)
- Product Interaction (analytics on stream views, etc.)

Data NOT collected:
- Health, Fitness, Financial Info (Apple handles payment), Contacts, Browsing History, Search History outside the app, Sensitive Info

Tracking: NO (we removed ATT — we don't share data with third parties for cross-app tracking).

---

## Screenshots Required

App Store Connect requires screenshots for these device classes:
- iPhone 6.7" or 6.9" (latest Pro Max — 1290×2796)
- iPhone 6.5" (older Pro Max — 1284×2778) *optional if 6.7" provided*
- iPad 12.9" — only required if app supports iPad (you can check "iPhone only" to skip)

Minimum 3, max 10 per device. Suggested shots:
1. Home feed with a live stream playing
2. Gift panel open mid-stream (shows interaction)
3. Creator profile with subscription tiers visible
4. Go Live screen with camera preview
5. Reel feed (vertical short-form)

Capture them on a real device once your TestFlight build is up, or use the simulator with the latest build. Add them in App Store Connect → Version 1.0 → Previews and Screenshots.

---

## Submission Checklist

Once Archive is uploaded and the build finishes processing (~10-30 min after upload):

1. [ ] Build appears in App Store Connect → TestFlight tab
2. [ ] Internal TestFlight: install on your device, smoke-test signup/login/go-live/IAP sandbox/push
3. [ ] Create reviewer account on prod, paste credentials above
4. [ ] Upload screenshots to Version 1.0
5. [ ] Fill all text fields above
6. [ ] Complete App Privacy questionnaire
7. [ ] Select the build (the one you just uploaded) under "Build" section of Version 1.0
8. [ ] Save → Submit for Review
9. [ ] Wait ~24-72h for Apple's first response
