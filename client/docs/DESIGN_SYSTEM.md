# Be With Me — Universal Live Design System

Supersedes the earlier fashion-leaning "Couture Nightfall" framing.
**Be With Me is a UNIVERSAL creator live-entertainment platform** — gaming, music,
talk/IRL, ASMR, cooking, fitness, comedy, art, *any* creator. Think Bigo Live / Tango /
YouNow energy: dark, premium, but **colorful, vibrant, celebratory, fun** — NOT elegant
fashion editorial. Every screen should feel like it belongs to a live party for all creators.

## Voice
Energetic, warm, inclusive, confident, creator-neutral. Short and punchy. NOT couture/editorial.
- BAN these fashion words + vibes: "couture", "runway", "atelier", "front-row fashion", "the show",
  "curtain", "the stage is dark", Vogue references, and heavy Playfair-italic editorial headers.
- Universal copy instead: "Go live", "Your people are here", "Live now", "Send love", "Level up",
  "Join the party", "The room is buzzing", "Creators, live", "Be with them, right now".

## Type
- Primary display = **bold Inter** (font-sans, tight tracking, heavy weight) — confident, universal, modern.
- Playfair (`.editorial`) is now a RARE accent only (a single hero word at most), not the default voice.
  Prefer bold sans headlines. If a screen currently uses `.editorial` everywhere, dial it back.

## Color — VIBRANT, multi-color (this is the point; the app was too two-tone)
Dark ink base stays (`ink-950 #050506` / `ink-900`). On top, use the **full neon spectrum** — don't
default everything to pink+gold. Assign by context so the app feels colorful and alive:
- `brand-500 #FF4FA3` (pink) — primary energy, love, live, likes.
- `accent.blue #2E9BFF` / `accent.cyan #22E0D6` — cool / gaming / tech / fresh.
- `accent.green #3DE07A` — money / go / success / earnings.
- `accent.violet #7C5CFF` — premium / VIP.
- `accent.amber #FFB020` / `accent.yellow` — reward / spotlight / top-tier.
- `accent.orange #FF7A2F` / `accent.magenta #F038FF` — hype / fire / trending.
- `live #FF3040` — LIVE / urgent.
Rose-gold is DEMOTED from "the luxury signal" to just one warm accent — stop making everything gold.
Neon glows: `shadow-glow`, `shadow-glow-cyan/blue/green/amber/orange/magenta/violet`.
Hero/celebration moments: `.gradient-celebration` / `.text-celebration` (animated multicolor) /
`.celebration-canvas` (colorful radial bg) / `.neon-hairline` (multicolor border).

## 3D — event-driven, NOT ambient (Bigo model)
- 3D belongs to LIVE MOMENTS: gifts + entrances via the Live Effects Engine
  (`src/components/live-effects/LiveEffectsEngine.tsx`), plus the existing gift scene.
- **REMOVE generic ambient 3D from content pages** — the `FloatingGem` icosahedron and
  `AuroraBackdrop`/`AtmosphereSection` used as page BACKDROPS read as generic. Replace those
  backdrops with the CSS `.celebration-canvas` (colorful, cheap, universal) or `.nightfall-canvas`.
  Keep the auth screens' animated backdrop but make it colorful (celebration), not "couture aurora".
- Net: pages get color + energy from CSS + content; the WebGL wow is reserved for live gift/entrance spectacle.

## Reuse (unchanged foundation)
Dark base, glass, the perf work (lazy 3D), safe-areas, reduced-motion, tap targets ≥44px, the 3D kit
plumbing, and the Live Effects Engine all stay. This is a VOICE + COLOR + de-ambient-3D re-skin,
NOT a structural rewrite. PRESERVE ALL LOGIC (fetches, sockets, IAP/Stripe, tracking, routing).

## Guardrails (unchanged)
iOS/Capacitor safe, reduced-motion honored, ≥44px targets, decorative layers `pointer-events-none`,
never a WebGL canvas behind full-screen live video. Do not touch data/behavior — visual + copy only.
