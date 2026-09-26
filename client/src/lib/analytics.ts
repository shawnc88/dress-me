// Lean analytics: first-touch attribution + PostHog capture WITHOUT the SDK
// (no bundle cost on mid-range Android). Inert until NEXT_PUBLIC_POSTHOG_KEY
// is set in Vercel. Exactly six events get tracked — signup,
// onboarding_completed, stream_joined, gift_sent, paywall_viewed,
// purchase_completed. Six you read beat sixty you never open.

const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
const ATTR_KEY = 'bwm_attribution';
const DID_KEY = 'bwm_did';

export interface Attribution {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  invite?: string;   // creator username or code that brought this person in
  landing?: string;
  ts?: string;
}

// First-touch only — never overwritten, so "which creator/platform converts"
// stays answerable. Call once per app mount.
export function captureFirstTouch(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(ATTR_KEY)) return;
    const q = new URLSearchParams(window.location.search);
    const attr: Attribution = {
      source: q.get('utm_source') || undefined,
      medium: q.get('utm_medium') || undefined,
      campaign: q.get('utm_campaign') || undefined,
      referrer: document.referrer || undefined,
      landing: window.location.pathname || undefined,
      ts: new Date().toISOString(),
    };
    // A bare direct hit carries no signal — leave the slot open for one that does.
    if (!attr.source && !attr.medium && !attr.campaign && !attr.referrer) return;
    localStorage.setItem(ATTR_KEY, JSON.stringify(attr));
  } catch {}
}

// Creator bio links (/c/[username]) attribute the signup to that creator.
// First inviter wins.
export function setInviteAttribution(invite: string): void {
  if (typeof window === 'undefined' || !invite) return;
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    const cur: Attribution = raw ? JSON.parse(raw) : {};
    if (cur.invite) return;
    localStorage.setItem(ATTR_KEY, JSON.stringify({
      landing: window.location.pathname,
      ts: new Date().toISOString(),
      ...cur,
      invite: invite.slice(0, 60),
    }));
  } catch {}
}

export function getAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

function distinctId(): string {
  try {
    const user = localStorage.getItem('user');
    const id = user ? JSON.parse(user)?.id : null;
    if (id) return String(id);
    let anon = localStorage.getItem(DID_KEY);
    if (!anon) {
      anon = `anon_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(DID_KEY, anon);
    }
    return anon;
  } catch {
    return 'anon_unknown';
  }
}

export function track(event: string, props: Record<string, unknown> = {}): void {
  if (!PH_KEY || typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify({
      api_key: PH_KEY,
      event,
      distinct_id: distinctId(),
      properties: { ...(getAttribution() || {}), ...props, $current_url: window.location.href },
      timestamp: new Date().toISOString(),
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${PH_HOST}/capture/`, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(`${PH_HOST}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}
