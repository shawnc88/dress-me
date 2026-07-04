# Couture Nightfall — Art Direction Bible

The design language for the Be With Me redesign. Every screen must feel like it belongs to
the same world. **Freestyle boldly, but inside this language.** Award-winning, editorial,
intimate, expensive. Vogue-cover-meets-livestream. Never generic, never "startup default."

## The feeling
Fashion (editorial couture: Playfair, rose-gold, gallery whitespace, restraint) fused with
intimate live performance (hot-pink energy, glass, real 3D depth + bloom, gift bursts). Dark,
cinematic, glossy. A private VIP room, not a public feed.

## Palette (tokens already defined — USE THESE, never invent hex)
- Ink canvas: `ink-950 #050506` / `ink-900 #0a0a0c` / `ink-800` / charcoal. Base is near-black.
- Energy accent (live, likes, CTAs): `brand-500 #FF4FA3` (hot pink) scale `brand-50..950`.
- Couture accent (creator names, tiers, hairlines, "premium"): `rose-gold #F3B6A0` / `gold-100..600`.
- Depth accent: `violet-deep #7C5CFF`. Live status: `live #FF3040`.
- Rule of restraint: ink dominates (~80%), pink for energy, rose-gold for luxury, violet for depth.
  Gold = premium/couture signal; pink = live/action signal. Don't muddy them.

## Type
- Display/editorial: `.editorial` (Playfair Display italic, tight tracking) — hero lines, creator
  names, tier names, big numbers. Use `.text-couture-gold` for the accent word (animated gold shimmer).
- UI/body: Inter (`font-sans`) — everything functional. Labels `text-white/70`, muted `text-white/40-55`.
- Big editorial moments should be BIG (text-5xl → text-7xl) with `leading-[1.02]`.

## Component classes (globals.css — reuse, don't reinvent)
`.nightfall-canvas` (layered ink+accent radial bg), `.glass-couture` (deep glass card, gold hairline
inset, rounded-4xl), `.gold-hairline` (rose-gold gradient border), `.btn-couture` (pink→violet CTA
w/ sheen sweep), `.btn-couture-ghost` (glass + gold hairline), `.input-couture` (dark glass input,
gold focus), `.grain` (film-grain overlay via ::before — put on full-bleed containers), `.editorial`,
`.text-couture-gold`, `.gradient-premium`, `.text-gradient`, `.text-gradient-gold`.
Shadows: `shadow-couture`, `shadow-lift`, `shadow-gold`/`gold-sm`, `shadow-glow`, `shadow-glow-violet`.
Motion: `animate-aurora`, `animate-sheen`, `animate-rise`, `animate-blur-in`, `animate-gold-shimmer`,
`animate-glow-breathe`, `animate-float`. Radius `rounded-4xl`(24) / `rounded-5xl`(28).

## 3D kit (reusable — prefer these over ad-hoc canvases)
- `AuroraBackdrop` (`@/components/ui/AuroraBackdrop`): full-bleed r3f silk/aurora shader backdrop,
  single draw call + one bloom pass, SSR-safe, WebGL-probe + reduced-motion CSS fallback.
  Props: `variant='auto'|'3d'|'css'`, `intensity='subtle'|'full'`, `className`. It is `absolute
  inset-0 -z-10 pointer-events-none`. Use as a surface BACKGROUND (put content in glass above it).
- The shared couture 3D kit lives in `@/components/3d/couture/` (FloatingGem, TiltCard, etc.) — use
  its accents for headers, empty states, tier cards, hero moments. Read that folder's index before building.

## 3D EVERYWHERE — the rule (this is the whole point)
Every non-video surface should carry real 3D atmosphere or a 3D accent. Auth already does (AuroraBackdrop).
Apply it to: profile header, tier/paywall cards, streams browse, search, dashboard, empty & loading states,
onboarding, become-creator. Use `AuroraBackdrop intensity="subtle"` as the ambient background + a hero 3D
accent (floating gem/orb, tilt-reactive card) where it elevates.

## GUARDRAILS (non-negotiable — this is a LIVE production app)
1. **Never a second WebGL canvas behind full-screen live video.** On feed cards, `/reels`, `/stream/[id]`,
   `/suite/*` the video is the star — 3D goes into the couture CHROME (overlays, gift bursts already exist,
   badges, action rail, gradients), NOT a competing background canvas. Loading/empty states on those routes MAY use 3D.
2. **One 3D scene mounted per view.** Lazy-load with `next/dynamic({ ssr:false })` where possible so the
   three.js bundle (~265kB) only loads when shown. Cap DPR, no heavy per-frame work.
3. **Reduced-motion honored.** All 3D must fall back to static/CSS when `prefers-reduced-motion`. AuroraBackdrop
   already does; any new r3f must too (`useReducedMotion` / matchMedia).
4. **Mobile/iOS Capacitor safe:** keep `safe-area-*` insets, touch targets ≥44px, `no-select` on chrome,
   `pointer-events-none` on decorative layers so they never eat taps. Max content width `max-w-[630px]` on
   phone-first surfaces.
5. **DO NOT TOUCH LOGIC.** Preserve every fetch/URL/payload, Socket.IO event, Mux/LiveKit wiring, IAP/Stripe
   paywall flow, auth/localStorage, feed engagement tracking (`/api/feed/event`), snap-scroll/intersection
   logic, and the existing gift 3D system (`src/components/3d/GiftScene.tsx` etc. — leave it, it's already good).
   Visual + motion layer ONLY. If a change would alter behavior, don't.
6. **Performance budget:** feed must stay smooth while scrolling video. Prefer CSS/framer-motion for
   micro-interactions; reserve WebGL for hero/ambient moments.

## Motion principles
Cinematic, not bouncy. Slow reveals (`animate-rise`/`blur-in`, staggered). Sheen sweeps on premium CTAs.
Springs for interactive feedback (framer-motion, `whileTap`). Everything calm and expensive; nothing frantic.
